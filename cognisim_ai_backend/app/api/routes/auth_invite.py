from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.core.dependencies import supabase, get_current_user, UserModel
from app.services.email_service import send_invitation_email
from uuid import uuid4
from datetime import datetime, timedelta, timezone
import os
import logging

logger = logging.getLogger("cognisim_ai")

router = APIRouter(prefix="/api/auth", tags=["Public Auth"]) 


class InviteRequest(BaseModel):
    email: EmailStr
    redirect: str | None = None


class TeamInviteRequest(BaseModel):
    """Team invitation with email notification."""
    email: EmailStr
    team_id: str | None = None
    workspace_id: str | None = None
    role: str | None = None
    send_email: bool = True


class AcceptInviteRequest(BaseModel):
    """Accept an invitation by token."""
    token: str
    team_id: str | None = None
    workspace_id: str | None = None


@router.post("/invite")
def invite_user(req: InviteRequest):
    """Send an invite email (admin) or fall back to magic link.

    - Uses Supabase service role on the backend to access admin APIs.
    - If admin.invite_user_by_email is not available, falls back to sign_in_with_otp.
    """
    redirect_to = req.redirect
    try:
        # Prefer Admin Invite (requires service role)
        admin = getattr(getattr(supabase, 'auth', None), 'admin', None)
        if admin is not None:
            invite_fn = getattr(admin, 'invite_user_by_email', None)
            if callable(invite_fn):
                try:
                    if redirect_to:
                        invite_fn(req.email, options={"redirect_to": redirect_to})
                    else:
                        invite_fn(req.email)
                    return {"message": "Invite sent", "mode": "admin_invite"}
                except Exception as e:
                    logger.warning(f"Admin invite failed, falling back to OTP: {e}")
        # Fallback to OTP magic link
        auth = getattr(supabase, 'auth', None)
        if auth is not None:
            otp_fn = getattr(auth, 'sign_in_with_otp', None)
            if callable(otp_fn):
                if redirect_to:
                    otp_fn({"email": req.email, "options": {"email_redirect_to": redirect_to}})
                else:
                    otp_fn({"email": req.email})
                return {"message": "Magic link sent", "mode": "otp_fallback"}
        raise HTTPException(status_code=500, detail="Auth provider not available")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Invite endpoint failed: {e}")
        raise HTTPException(status_code=500, detail="Invite failed")


@router.post("/invite/team")
def invite_to_team(req: TeamInviteRequest, current_user: UserModel = Depends(get_current_user)):
    """Send a team invitation with custom email notification.
    
    This endpoint creates an invitation record and sends a branded email
    using Gmail SMTP (configured in .env).
    
    Args:
        req: Team invitation request with email and metadata
        current_user: Authenticated user sending the invitation
        
    Returns:
        dict with invitation status and email delivery info
    """
    try:
        # Generate invitation link (customize based on your frontend routing)
        base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        
        invite_token = str(uuid4())
        expires_at = datetime.utcnow() + timedelta(days=7)

        # Store invitation in database (align with invitations schema used elsewhere)
        invitation_data = {
            "id": str(uuid4()),
            "token": invite_token,
            "email": req.email.strip().lower(),
            "invited_by": str(current_user.id),
            "team_id": req.team_id,
            "workspace_id": req.workspace_id,
            "role": (req.role or "viewer"),
            "status": "pending",
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.utcnow().isoformat(),
        }
        
        try:
            supabase.table("invitations").insert(invitation_data).execute()
        except Exception as db_err:
            logger.warning(f"Failed to store invitation in DB: {db_err}")
            # Continue anyway - at minimum send the email
        
        # Build invitation link
        if req.team_id:
            invite_link = f"{base_url}/accept-invite?token={invite_token}&team={req.team_id}"
        elif req.workspace_id:
            invite_link = f"{base_url}/accept-invite?token={invite_token}&workspace={req.workspace_id}"
        else:
            invite_link = f"{base_url}/accept-invite?token={invite_token}"
        
        # Get inviter and workspace names
        inviter_name = current_user.email.split('@')[0].title()  # Fallback
        try:
            profile = supabase.table("user_profiles").select("full_name").eq("id", str(current_user.id)).maybe_single().execute()
            if profile and hasattr(profile, 'data') and profile.data and profile.data.get("full_name"):
                inviter_name = profile.data["full_name"]
        except Exception:
            pass
        
        workspace_name = "a workspace"
        if req.workspace_id:
            try:
                ws = supabase.table("workspaces").select("name").eq("id", req.workspace_id).maybe_single().execute()
                if ws and hasattr(ws, 'data') and ws.data and ws.data.get("name"):
                    workspace_name = ws.data["name"]
            except Exception:
                pass
        
        # Send email if requested
        email_result = None
        if req.send_email:
            try:
                email_result = send_invitation_email(
                    to_email=req.email,
                    invite_link=invite_link,
                    inviter_name=inviter_name,
                    workspace_name=workspace_name
                )
                logger.info(f"Invitation email sent to {req.email}: {email_result}")
            except Exception as email_err:
                logger.error(f"Failed to send invitation email: {email_err}")
                # Don't fail the entire request if email fails
                email_result = {"status": "failed", "error": str(email_err)}
        
        return {
            "message": "Invitation created",
            "token": invite_token,
            "invite_link": invite_link,
            "email_sent": req.send_email,
            "email_result": email_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Team invite endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create invitation: {str(e)}")


@router.post("/accept-invite")
def accept_invitation(req: AcceptInviteRequest, current_user: UserModel = Depends(get_current_user)):
    """Accept a team/workspace invitation.
    
    This endpoint processes invitation acceptance by:
    1. Validating the invitation token
    2. Checking expiration
    3. Adding user to the team/workspace
    4. Marking invitation as accepted
    
    Args:
        req: Invitation acceptance request with token
        current_user: Authenticated user accepting the invitation
        
    Returns:
        dict with acceptance status and team/workspace details
    """
    try:
        token_clean = (req.token or "").strip()
        if not token_clean:
            raise HTTPException(status_code=400, detail="Missing invitation token")

        def _mask_email(e: str) -> str:
            try:
                local, domain = e.split("@", 1)
                if not local:
                    return f"***@{domain}"
                if len(local) <= 2:
                    masked_local = local[0] + "*" * max(1, len(local) - 1)
                else:
                    masked_local = local[0] + "*" * (len(local) - 2) + local[-1]
                return f"{masked_local}@{domain}"
            except Exception:
                return "(hidden)"

        def _mask_token(t: str) -> str:
            if not t:
                return "(empty)"
            if len(t) <= 8:
                return "****"
            return f"{t[:4]}…{t[-4:]}"

        # Fetch invitation by token (preferred) or legacy id == token
        invitation = None
        try:
            invite_res = (
                supabase.table("invitations")
                .select("*")
                .eq("token", token_clean)
                .maybe_single()
                .execute()
            )
            invitation = getattr(invite_res, "data", None)
        except Exception:
            invitation = None

        if not invitation:
            try:
                invite_res_legacy = (
                    supabase.table("invitations")
                    .select("*")
                    .eq("id", token_clean)
                    .maybe_single()
                    .execute()
                )
                invitation = getattr(invite_res_legacy, "data", None)
            except Exception:
                invitation = None

        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")

        # Debug context (masked) for local troubleshooting
        try:
            logger.info(
                "Accept-invite: token=%s status=%s team_id=%s workspace_id=%s invited_email=%s current_email=%s",
                _mask_token(token_clean),
                (invitation.get("status") or "pending"),
                invitation.get("team_id"),
                invitation.get("workspace_id"),
                _mask_email((invitation.get("email") or "").strip().lower()) if invitation.get("email") else None,
                _mask_email(current_user.email.strip().lower()),
            )
        except Exception:
            pass

        status_val = (invitation.get("status") or "pending").lower()
        if status_val in {"expired", "revoked", "canceled"}:
            raise HTTPException(status_code=400, detail="Invitation is no longer valid")
        
        # Check expiration (if present)
        expires_at = invitation.get("expires_at")
        if expires_at:
            try:
                expires_dt = datetime.fromisoformat(str(expires_at).replace('Z', '+00:00'))
                if expires_dt.tzinfo is None:
                    expires_dt = expires_dt.replace(tzinfo=timezone.utc)
                now_utc = datetime.now(timezone.utc)
                if now_utc > expires_dt:
                    # Mark as expired
                    try:
                        supabase.table("invitations").update({"status": "expired"}).eq("id", invitation.get("id")).execute()
                    except Exception:
                        pass
                    raise HTTPException(status_code=400, detail="Invitation has expired")
            except HTTPException:
                raise
            except Exception:
                # If parsing fails, do not block acceptance
                pass

        # Verify invitation was sent to this email
        invited_email = (invitation.get("email") or "").strip().lower()
        if invited_email and current_user.email.strip().lower() != invited_email:
            try:
                logger.warning(
                    "Accept-invite email mismatch: token=%s invited=%s current=%s",
                    _mask_token(token_clean),
                    _mask_email(invited_email),
                    _mask_email(current_user.email.strip().lower()),
                )
            except Exception:
                pass
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "INVITE_EMAIL_MISMATCH",
                    "message": "This invitation was sent to a different email address.",
                    "invited_email_hint": _mask_email(invited_email),
                    "current_email": current_user.email.strip().lower(),
                },
            )
        
        # Add user to team if team_id is present
        team_id = invitation.get("team_id") or req.team_id
        workspace_id = invitation.get("workspace_id") or req.workspace_id
        role = invitation.get("role") or "viewer"

        # If this is a team invite but workspace_id wasn't provided/stored, derive it from the team.
        if team_id and not workspace_id:
            try:
                team_res = (
                    supabase.table("teams")
                    .select("workspace_id")
                    .eq("id", team_id)
                    .maybe_single()
                    .execute()
                )
                team_row = getattr(team_res, "data", None)
                if team_row and team_row.get("workspace_id"):
                    workspace_id = team_row.get("workspace_id")
            except Exception:
                # If lookup fails, proceed with team membership only.
                pass
        
        result = {}
        
        if team_id:
            # Check if already a member
            existing_member = (
                supabase.table("team_members")
                .select("id")
                .eq("team_id", team_id)
                .eq("user_id", str(current_user.id))
                .maybe_single()
                .execute()
            )
            
            if not getattr(existing_member, "data", None):
                # Add to team
                supabase.table("team_members").insert({
                    "id": str(uuid4()),
                    "team_id": team_id,
                    "user_id": str(current_user.id),
                    "role": role,
                    "status": "active"
                }).execute()
                result["team_added"] = True
            else:
                result["team_added"] = False
                result["already_member"] = True
        
        # For team invites, ensure the user is also an active workspace member so the UI
        # can show the team under the correct workspace context.
        if workspace_id:
            # Check if already a workspace member
            existing_ws_member = (
                supabase.table("workspace_members")
                .select("id")
                .eq("workspace_id", workspace_id)
                .eq("user_id", str(current_user.id))
                .maybe_single()
                .execute()
            )
            
            if not getattr(existing_ws_member, "data", None):
                # Prefer activating an existing invitation row (workspace_members.invited_email)
                activated = False
                if invited_email:
                    try:
                        invited_row_res = (
                            supabase.table("workspace_members")
                            .select("id,status,user_id")
                            .eq("workspace_id", workspace_id)
                            .eq("invited_email", invited_email)
                            .maybe_single()
                            .execute()
                        )
                        invited_row = getattr(invited_row_res, "data", None)
                        if invited_row and not invited_row.get("user_id"):
                            supabase.table("workspace_members").update({
                                "user_id": str(current_user.id),
                                "role": role,
                                "status": "active",
                                "joined_at": datetime.utcnow().isoformat(),
                            }).eq("id", invited_row.get("id")).execute()
                            activated = True
                    except Exception:
                        activated = False

                if not activated:
                    # Add to workspace
                    supabase.table("workspace_members").insert({
                        "id": str(uuid4()),
                        "workspace_id": workspace_id,
                        "user_id": str(current_user.id),
                        "invited_email": invited_email or None,
                        "role": role,
                        "status": "active",
                        "joined_at": datetime.utcnow().isoformat(),
                    }).execute()
                result["workspace_added"] = True
            else:
                result["workspace_added"] = False

        # Team-based project sharing: if this was a TEAM invite, ensure the invited team
        # can see the inviter's projects in the workspace (best-effort).
        if team_id and workspace_id:
            try:
                inviter_id = invitation.get("invited_by")
                if inviter_id:
                    # Clamp role to project access roles
                    pr_role = (role or "viewer").lower()
                    if pr_role not in {"viewer", "editor", "admin"}:
                        pr_role = "viewer"
                    proj_res = (
                        supabase.table("projects")
                        .select("id,workspace_id,owner_id")
                        .eq("workspace_id", str(workspace_id))
                        .eq("owner_id", str(inviter_id))
                        .execute()
                    )
                    proj_rows = getattr(proj_res, "data", []) or []
                    for p in proj_rows:
                        pid = p.get("id")
                        if not pid:
                            continue
                        try:
                            supabase.table("project_team_access").upsert({
                                "project_id": str(pid),
                                "team_id": str(team_id),
                                "role": pr_role,
                                "granted_by": str(inviter_id),
                            }).execute()
                        except Exception:
                            # Fallback if schema doesn't include granted_by
                            try:
                                supabase.table("project_team_access").upsert({
                                    "project_id": str(pid),
                                    "team_id": str(team_id),
                                    "role": pr_role,
                                }).execute()
                            except Exception:
                                continue
            except Exception:
                pass
        
        # Mark invitation as accepted (idempotent)
        if status_val != "accepted":
            supabase.table("invitations").update({
                "status": "accepted",
                "accepted_at": datetime.utcnow().isoformat(),
                "accepted_by": str(current_user.id)
            }).eq("id", invitation.get("id")).execute()

        # Emit team member joined event
        try:
            from app.services.events import event_bus, EventType
            event_bus.emit(EventType.TEAM_MEMBER_JOINED, {
                "member_name": current_user.email,
                "member_email": current_user.email,
                "team_id": str(team_id) if team_id else None,
                "team_name": invitation.get("team_name", ""),
                "workspace_id": str(workspace_id) if workspace_id else None,
                "user_id": current_user.id,
                "role": role,
            })
        except Exception:
            pass

        return {
            "message": "Invitation accepted successfully",
            "team_id": team_id,
            "workspace_id": workspace_id,
            "role": role,
            **result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Accept invite failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to accept invitation: {str(e)}")

