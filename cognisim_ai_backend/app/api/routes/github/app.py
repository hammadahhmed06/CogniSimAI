"""app/api/routes/github/app.py

GitHub App integration (enterprise-grade) for GitHub.com:
- Installation URL generation (workspace admin)
- Setup callback to bind installation to workspace
- Secure webhook receiver (HMAC + delivery idempotency)
- Repo discovery (private repos supported via installation token)
- Projects v2 discovery/linking (org + user)

This module intentionally starts with the integration foundation and observability.
Full bidirectional issue/project sync is layered on top via separate services.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.dependencies import get_current_user, UserModel, supabase, limiter
from app.services.github.github_app_auth import get_github_app_auth
from app.services.github.github_clients import GitHubRestClient, GitHubGraphQLClient, OwnerType
from app.services.github.webhook_security import normalize_delivery_id, verify_github_signature_256
from app.services.github.projects_v2_sync import ProjectsV2SyncService

logger = logging.getLogger("cognisim_ai")

router = APIRouter(prefix="/api", tags=["github"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_workspace_member(workspace_id: str, user_id: str) -> bool:
    try:
        res = (
            supabase.table("workspace_members")
            .select("id")
            .eq("workspace_id", workspace_id)
            .eq("user_id", user_id)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        return bool(getattr(res, "data", []) or [])
    except Exception as e:
        logger.warning("Workspace membership check failed: %s", e)
        return False


def _require_workspace_admin(workspace_id: str, user_id: str) -> None:
    try:
        res = (
            supabase.table("workspace_members")
            .select("role,status")
            .eq("workspace_id", workspace_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = getattr(res, "data", []) or []
        if not rows:
            raise HTTPException(status_code=403, detail="Not a member of this workspace")
        row = rows[0]
        if row.get("status") != "active":
            raise HTTPException(status_code=403, detail="Membership inactive")
        if row.get("role") not in ("owner", "admin"):
            raise HTTPException(
                status_code=403,
                detail="Admin/owner access required to manage GitHub integration",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Admin verification failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to verify admin access")


def _get_active_installation_for_workspace(workspace_id: str) -> Optional[Dict[str, Any]]:
    res = (
        supabase.table("github_installations")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("is_active", True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = getattr(res, "data", []) or []
    return rows[0] if rows else None


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class GitHubStatusResponse(BaseModel):
    is_connected: bool
    workspace_id: UUID
    github_installation_id: Optional[int] = None
    account_login: Optional[str] = None
    account_type: Optional[str] = None
    repository_selection: Optional[str] = None
    installed_by: Optional[UUID] = None
    created_at: Optional[datetime] = None


class GitHubInstallUrlResponse(BaseModel):
    install_url: str
    state: str
    expires_at: datetime


class GitHubRepoResponse(BaseModel):
    github_repo_id: int
    full_name: str
    private: bool
    archived: bool = False
    default_branch: Optional[str] = None
    html_url: Optional[str] = None


class GitHubProjectsDiscoverResponse(BaseModel):
    owner_login: str
    owner_type: OwnerType
    projects: List[Dict[str, Any]]


class GitHubProjectLinkRequest(BaseModel):
    owner_login: str
    owner_type: OwnerType
    project_number: int
    project_node_id: str
    title: Optional[str] = None
    url: Optional[str] = None
    internal_project_id: Optional[UUID] = None
    field_mappings: Dict[str, Any] = Field(default_factory=dict)


class GitHubPushIssuesRequest(BaseModel):
    issue_ids: List[UUID] = Field(..., min_length=1)
    github_repo_id: Optional[int] = None
    repo_full_name: Optional[str] = None


class GitHubPushIssuesResult(BaseModel):
    internal_issue_id: UUID
    github_repo_id: int
    github_issue_number: Optional[int] = None
    github_issue_url: Optional[str] = None
    action: Literal["created", "updated", "skipped"]
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get(
    "/workspaces/{workspace_id}/github/status",
    response_model=GitHubStatusResponse,
    summary="Get GitHub integration status",
)
@limiter.limit("10/minute")
async def get_github_status(
    request: Request,
    workspace_id: UUID,
    current_user: UserModel = Depends(get_current_user),
) -> GitHubStatusResponse:
    wid = str(workspace_id)
    uid = str(current_user.id)

    if not _is_workspace_member(wid, uid):
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    installation = _get_active_installation_for_workspace(wid)
    if not installation:
        return GitHubStatusResponse(is_connected=False, workspace_id=workspace_id)

    return GitHubStatusResponse(
        is_connected=True,
        workspace_id=workspace_id,
        github_installation_id=installation.get("github_installation_id"),
        account_login=installation.get("account_login"),
        account_type=installation.get("account_type"),
        repository_selection=installation.get("repository_selection"),
        installed_by=installation.get("installed_by"),
        created_at=installation.get("created_at"),
    )


@router.get(
    "/workspaces/{workspace_id}/github/install-url",
    response_model=GitHubInstallUrlResponse,
    summary="Create GitHub App installation URL",
    description="Workspace admin-only. Generates a one-time state and returns the GitHub App installation URL.",
)
@limiter.limit("5/minute")
async def create_install_url(
    request: Request,
    workspace_id: UUID,
    current_user: UserModel = Depends(get_current_user),
) -> GitHubInstallUrlResponse:
    wid = str(workspace_id)
    uid = str(current_user.id)

    _require_workspace_admin(wid, uid)

    if not settings.GITHUB_APP_SLUG:
        raise HTTPException(status_code=500, detail="GITHUB_APP_SLUG is not configured")

    state = str(uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    try:
        supabase.table("github_install_states").insert(
            {
                "id": state,
                "workspace_id": wid,
                "created_by": uid,
                "expires_at": expires_at.isoformat(),
                "used_at": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()
    except Exception as e:
        logger.error("Failed to create github_install_states row: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create installation state")

    install_url = f"{str(settings.GITHUB_WEB_BASE_URL).rstrip('/')}/apps/{settings.GITHUB_APP_SLUG}/installations/new?state={state}"
    return GitHubInstallUrlResponse(install_url=install_url, state=state, expires_at=expires_at)


@router.get(
    "/github/app/setup/callback",
    summary="GitHub App setup callback",
    description="Setup callback configured in the GitHub App. Uses state to bind the installation to a workspace.",
)
@limiter.limit("30/minute")
async def github_setup_callback(
    request: Request,
    installation_id: int,
    setup_action: Optional[str] = None,
    state: Optional[str] = None,
):
    # This endpoint is reached from GitHub in the browser; do not require auth here.
    if not state:
        raise HTTPException(status_code=400, detail="Missing state")

    # Validate state
    try:
        state_res = (
            supabase.table("github_install_states")
            .select("*")
            .eq("id", state)
            .limit(1)
            .execute()
        )
        rows = getattr(state_res, "data", []) or []
        if not rows:
            raise HTTPException(status_code=400, detail="Invalid state")
        st = rows[0]
        if st.get("used_at"):
            raise HTTPException(status_code=400, detail="State already used")

        exp = st.get("expires_at")
        if exp:
            exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="State expired")

        workspace_id = str(st.get("workspace_id"))
        installed_by = st.get("created_by")

        # Mark state used
        supabase.table("github_install_states").update(
            {"used_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", state).execute()

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to validate GitHub install state: %s", e)
        raise HTTPException(status_code=500, detail="Failed to validate installation state")

    # Fetch installation info and upsert
    auth = get_github_app_auth()
    try:
        info = await auth.get_installation_info(installation_id)
    except Exception as e:
        logger.error("Failed to fetch installation info: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch installation info")

    account = info.get("account") or {}
    account_login = account.get("login")
    account_type = account.get("type")
    repository_selection = info.get("repository_selection")
    permissions = info.get("permissions") or {}
    events = info.get("events") or []

    try:
        supabase.table("github_installations").upsert(
            {
                "workspace_id": workspace_id,
                "github_installation_id": installation_id,
                "account_login": account_login,
                "account_type": account_type,
                "repository_selection": repository_selection,
                "permissions": permissions,
                "events": events,
                "installed_by": installed_by,
                "is_active": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="github_installation_id",
        ).execute()
    except Exception as e:
        logger.error("Failed to upsert github_installations: %s", e)
        raise HTTPException(status_code=500, detail="Failed to store installation")

    # Redirect back to frontend
    base = settings.FRONTEND_URL.rstrip("/")
    # Keep the redirect path stable; frontend can handle query params.
    url = f"{base}/dashboard/integrations?github_installed=1&setup_action={setup_action or ''}"
    return RedirectResponse(url=url, status_code=302)


@router.post(
    "/github/webhooks",
    summary="GitHub webhook receiver",
    description="Public endpoint. Verifies signature, deduplicates deliveries, and stores raw events for async processing.",
)
@limiter.limit("120/minute")
async def github_webhook_receiver(request: Request, background_tasks: BackgroundTasks):
    if not settings.GITHUB_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="GITHUB_WEBHOOK_SECRET is not configured")

    secret = settings.GITHUB_WEBHOOK_SECRET.get_secret_value()
    raw = await request.body()

    sig = request.headers.get("X-Hub-Signature-256")
    delivery_id = normalize_delivery_id(request.headers.get("X-GitHub-Delivery"))
    event_name = (request.headers.get("X-GitHub-Event") or "").strip() or None

    if not verify_github_signature_256(secret=secret, payload=raw, signature_header=sig):
        # Do not leak details.
        raise HTTPException(status_code=401, detail="Invalid signature")

    if not delivery_id:
        raise HTTPException(status_code=400, detail="Missing X-GitHub-Delivery")
    if not event_name:
        raise HTTPException(status_code=400, detail="Missing X-GitHub-Event")

    # Parse JSON payload
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    installation_id = None
    try:
        installation = payload.get("installation") or {}
        raw_installation_id = installation.get("id")
        if raw_installation_id is not None:
            installation_id = int(raw_installation_id)
    except Exception:
        installation_id = None

    action = payload.get("action")

    # Idempotency: insert delivery row with unique constraint on delivery_id
    try:
        supabase.table("github_webhook_deliveries").insert(
            {
                "delivery_id": delivery_id,
                "event": event_name,
                "installation_id": installation_id,
                "signature_valid": True,
                "received_at": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()
    except Exception as e:
        # If duplicate, treat as accepted (idempotent).
        msg = str(e).lower()
        if "duplicate" in msg or "unique" in msg or "already exists" in msg:
            return {"accepted": True, "duplicate": True}
        logger.error("Failed to write github_webhook_deliveries: %s", e)
        raise HTTPException(status_code=500, detail="Failed to record delivery")

    try:
        supabase.table("github_webhook_events").insert(
            {
                "delivery_id": delivery_id,
                "event": event_name,
                "action": action,
                "installation_id": installation_id,
                "payload": payload,
                "processed": False,
                "received_at": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()
    except Exception as e:
        logger.error("Failed to write github_webhook_events: %s", e)
        raise HTTPException(status_code=500, detail="Failed to record event")

    # Offload event processing to a background task so the webhook returns immediately.
    # FastAPI BackgroundTasks natively handles async functions — no sync wrapper needed.
    if event_name == "issues" and installation_id is not None:
        background_tasks.add_task(
            _process_issues_webhook_event,
            installation_id=int(installation_id),
            payload=payload,
        )

    if event_name == "projects_v2_item" and installation_id is not None:
        background_tasks.add_task(
            _process_projects_v2_item_webhook_event,
            installation_id=int(installation_id),
            payload=payload,
        )

    return {"accepted": True}


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        v = value.strip()
        if v.endswith("Z"):
            v = v[:-1] + "+00:00"
        dt = datetime.fromisoformat(v)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _local_status_from_github_state(state: Optional[str]) -> str:
    # Keep it simple and predictable. Teams can customize later via preferences.
    return "done" if (state or "").lower() == "closed" else "todo"


def _github_state_from_local_status(status_value: Optional[str]) -> Literal["open", "closed"]:
    if (status_value or "").lower() in ("done", "closed", "resolved"):
        return "closed"
    return "open"


async def _process_issues_webhook_event(*, installation_id: int, payload: Dict[str, Any]) -> None:
    issue = payload.get("issue") or {}
    repo = payload.get("repository") or {}

    raw_repo_id = repo.get("id")
    raw_number = issue.get("number")
    if raw_repo_id is None or raw_number is None:
        return

    github_repo_id = int(raw_repo_id)
    github_issue_number = int(raw_number)

    github_title = issue.get("title")
    github_body = issue.get("body")
    github_state = issue.get("state")
    github_updated_at = _parse_dt(issue.get("updated_at"))

    # Find mapping
    mapping_res = (
        supabase.table("github_issue_mappings")
        .select("*")
        .eq("github_repo_id", github_repo_id)
        .eq("github_issue_number", github_issue_number)
        .limit(1)
        .execute()
    )
    mappings = getattr(mapping_res, "data", []) or []
    if not mappings:
        return

    mapping = mappings[0]
    internal_issue_id = mapping.get("internal_issue_id")
    workspace_id = mapping.get("workspace_id")

    if not internal_issue_id or not workspace_id:
        return

    # Fetch local issue for conflict detection
    local_res = (
        supabase.table("issues")
        .select("id,title,description,status,updated_at,workspace_id")
        .eq("id", str(internal_issue_id))
        .maybe_single()
        .execute()
    )
    local = getattr(local_res, "data", None)
    if not local:
        return

    # Hard workspace boundary.
    if local.get("workspace_id") and str(local.get("workspace_id")) != str(workspace_id):
        return

    last_synced_at = _parse_dt(mapping.get("last_synced_at"))
    local_updated_at = _parse_dt(local.get("updated_at"))

    # If both sides changed since last sync -> create conflict and stop.
    if last_synced_at and local_updated_at and github_updated_at:
        if local_updated_at > last_synced_at and github_updated_at > last_synced_at:
            try:
                supabase.table("github_conflicts").insert(
                    {
                        "workspace_id": str(workspace_id),
                        "github_installation_id": int(installation_id),
                        "conflict_type": "field_mismatch",
                        "local_entity_type": "issue",
                        "local_entity_id": str(internal_issue_id),
                        "github_entity_type": "issue",
                        "github_entity_id": f"{github_repo_id}#{github_issue_number}",
                        "conflicting_fields": ["title", "description", "status"],
                        "local_version": {
                            "title": local.get("title"),
                            "description": local.get("description"),
                            "status": local.get("status"),
                            "updated_at": local.get("updated_at"),
                        },
                        "github_version": {
                            "title": github_title,
                            "body": github_body,
                            "state": github_state,
                            "updated_at": issue.get("updated_at"),
                        },
                        "local_updated_at": local_updated_at.isoformat(),
                        "github_updated_at": github_updated_at.isoformat(),
                        "status": "pending",
                    }
                ).execute()
            except Exception as e:
                logger.error("Failed to create github_conflicts row: %s", e)
            return

    # Apply GitHub -> local update
    update_payload: Dict[str, Any] = {
        "title": github_title,
        "description": github_body,
        "status": _local_status_from_github_state(github_state),
    }
    # Remove keys with None to avoid overwriting with null.
    update_payload = {k: v for k, v in update_payload.items() if v is not None}
    if update_payload:
        supabase.table("issues").update(update_payload).eq("id", str(internal_issue_id)).execute()

    # Update mapping sync timestamps (best-effort)
    try:
        supabase.table("github_issue_mappings").update(
            {
                "last_synced_at": datetime.now(timezone.utc).isoformat(),
                "last_known_local_updated_at": datetime.now(timezone.utc).isoformat(),
                "last_known_github_updated_at": github_updated_at.isoformat() if github_updated_at else None,
            }
        ).eq("id", mapping.get("id")).execute()
    except Exception:
        pass


async def _process_projects_v2_item_webhook_event(
    *, installation_id: int, payload: Dict[str, Any]
) -> None:
    """Background handler for ``projects_v2_item`` webhook events.

    Delegates to ``ProjectsV2SyncService.process_webhook_event()`` which
    handles conflict detection and field-level local updates.
    """
    projects_v2_item = payload.get("projects_v2_item") or {}
    item_node_id = projects_v2_item.get("node_id")
    project_node_id = projects_v2_item.get("project_node_id")
    action = payload.get("action")

    if not item_node_id or not project_node_id:
        return

    try:
        gql = GitHubGraphQLClient(installation_id)
        sync_service = ProjectsV2SyncService(gql)
        await sync_service.process_webhook_event(
            installation_id=installation_id,
            project_node_id=project_node_id,
            item_node_id=item_node_id,
            action=action or "edited",
            changes=payload.get("changes"),
        )
    except Exception as e:
        logger.error(
            "Failed to process projects_v2_item webhook (action=%s, item=%s): %s",
            action, item_node_id, e,
        )


@router.post(
    "/workspaces/{workspace_id}/github/repos/refresh",
    summary="Refresh repositories for installation",
)
@limiter.limit("10/minute")
async def refresh_repositories(
    request: Request,
    workspace_id: UUID,
    current_user: UserModel = Depends(get_current_user),
):
    wid = str(workspace_id)
    uid = str(current_user.id)
    _require_workspace_admin(wid, uid)

    installation = _get_active_installation_for_workspace(wid)
    if not installation:
        raise HTTPException(status_code=404, detail="No active GitHub installation")

    installation_id = installation.get("github_installation_id")
    if not installation_id:
        raise HTTPException(status_code=500, detail="Installation record missing github_installation_id")

    client = GitHubRestClient(int(installation_id))
    repos = await client.list_installation_repositories()

    upsert_rows: List[Dict[str, Any]] = []
    now = datetime.now(timezone.utc).isoformat()
    for r in repos:
        raw_repo_id = r.get("id")
        if raw_repo_id is None:
            continue
        upsert_rows.append(
            {
                "workspace_id": wid,
                "github_installation_id": int(installation_id),
                "github_repo_id": int(raw_repo_id),
                "owner_login": (r.get("owner") or {}).get("login"),
                "name": r.get("name"),
                "full_name": r.get("full_name"),
                "private": bool(r.get("private")),
                "archived": bool(r.get("archived")),
                "default_branch": r.get("default_branch"),
                "html_url": r.get("html_url"),
                "updated_at": now,
            }
        )

    try:
        if upsert_rows:
            supabase.table("github_repositories").upsert(
                upsert_rows,
                on_conflict="github_repo_id",
            ).execute()
    except Exception as e:
        logger.error("Failed to upsert github_repositories: %s", e)
        raise HTTPException(status_code=500, detail="Failed to store repositories")

    return {"success": True, "count": len(upsert_rows)}


@router.get(
    "/workspaces/{workspace_id}/github/repos",
    response_model=List[GitHubRepoResponse],
    summary="List linked GitHub repositories",
)
@limiter.limit("30/minute")
async def list_repositories(
    request: Request,
    workspace_id: UUID,
    current_user: UserModel = Depends(get_current_user),
) -> List[GitHubRepoResponse]:
    wid = str(workspace_id)
    uid = str(current_user.id)

    if not _is_workspace_member(wid, uid):
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    res = (
        supabase.table("github_repositories")
        .select("github_repo_id,full_name,private,archived,default_branch,html_url")
        .eq("workspace_id", wid)
        .order("full_name", desc=False)
        .execute()
    )
    rows = getattr(res, "data", []) or []
    return [
        GitHubRepoResponse(
            github_repo_id=int(r["github_repo_id"]),
            full_name=r.get("full_name") or "",
            private=bool(r.get("private")),
            archived=bool(r.get("archived")),
            default_branch=r.get("default_branch"),
            html_url=r.get("html_url"),
        )
        for r in rows
    ]


@router.post(
    "/workspaces/{workspace_id}/github/issues/push",
    response_model=List[GitHubPushIssuesResult],
    summary="Push internal issues to GitHub Issues",
    description="Admin-only. Creates/updates GitHub Issues and stores mappings for bidirectional sync.",
)
@limiter.limit("10/minute")
async def push_issues_to_github(
    request: Request,
    workspace_id: UUID,
    body: GitHubPushIssuesRequest,
    current_user: UserModel = Depends(get_current_user),
) -> List[GitHubPushIssuesResult]:
    wid = str(workspace_id)
    uid = str(current_user.id)
    _require_workspace_admin(wid, uid)

    installation = _get_active_installation_for_workspace(wid)
    if not installation:
        raise HTTPException(status_code=404, detail="No active GitHub installation")
    raw_installation_id = installation.get("github_installation_id")
    if raw_installation_id is None:
        raise HTTPException(status_code=500, detail="Installation record missing github_installation_id")
    installation_id = int(raw_installation_id)

    # Resolve repository
    repo_row = None
    if body.github_repo_id is not None:
        rr = (
            supabase.table("github_repositories")
            .select("github_repo_id,full_name,owner_login,name")
            .eq("workspace_id", wid)
            .eq("github_repo_id", int(body.github_repo_id))
            .limit(1)
            .execute()
        )
        rows = getattr(rr, "data", []) or []
        repo_row = rows[0] if rows else None
    elif body.repo_full_name:
        rr = (
            supabase.table("github_repositories")
            .select("github_repo_id,full_name,owner_login,name")
            .eq("workspace_id", wid)
            .eq("full_name", body.repo_full_name)
            .limit(1)
            .execute()
        )
        rows = getattr(rr, "data", []) or []
        repo_row = rows[0] if rows else None
    else:
        rr = (
            supabase.table("github_repositories")
            .select("github_repo_id,full_name,owner_login,name")
            .eq("workspace_id", wid)
            .order("full_name", desc=False)
            .limit(2)
            .execute()
        )
        rows = getattr(rr, "data", []) or []
        if len(rows) == 1:
            repo_row = rows[0]

    if not repo_row:
        raise HTTPException(status_code=400, detail="Repository not resolved. Provide github_repo_id or repo_full_name.")

    github_repo_id = int(repo_row["github_repo_id"])
    full_name = repo_row.get("full_name") or ""
    owner_login = repo_row.get("owner_login")
    repo_name = repo_row.get("name")
    if not owner_login or not repo_name:
        # Parse from full_name as a fallback.
        if "/" in full_name:
            owner_login, repo_name = full_name.split("/", 1)
    if not owner_login or not repo_name:
        raise HTTPException(status_code=500, detail="Repository record missing owner/name")

    # Fetch local issues
    issue_ids_str = [str(i) for i in body.issue_ids]
    issues_res = (
        supabase.table("issues")
        .select("id,title,description,status,updated_at,workspace_id")
        .in_("id", issue_ids_str)
        .execute()
    )
    issues = getattr(issues_res, "data", []) or []
    issues_by_id = {str(r.get("id")): r for r in issues if r.get("id")}

    client = GitHubRestClient(installation_id)
    results: List[GitHubPushIssuesResult] = []
    now = datetime.now(timezone.utc)

    for issue_id in body.issue_ids:
        row = issues_by_id.get(str(issue_id))
        if not row:
            results.append(
                GitHubPushIssuesResult(
                    internal_issue_id=issue_id,
                    github_repo_id=github_repo_id,
                    action="skipped",
                    error="Issue not found",
                )
            )
            continue
        if row.get("workspace_id") and str(row.get("workspace_id")) != wid:
            results.append(
                GitHubPushIssuesResult(
                    internal_issue_id=issue_id,
                    github_repo_id=github_repo_id,
                    action="skipped",
                    error="Cross-workspace issue",
                )
            )
            continue

        # Look up existing mapping
        mapping_res = (
            supabase.table("github_issue_mappings")
            .select("*")
            .eq("workspace_id", wid)
            .eq("internal_issue_id", str(issue_id))
            .eq("github_repo_id", github_repo_id)
            .limit(1)
            .execute()
        )
        mappings = getattr(mapping_res, "data", []) or []
        mapping = mappings[0] if mappings else None

        title = (row.get("title") or "").strip() or "Untitled"
        description = row.get("description")
        gh_state = _github_state_from_local_status(row.get("status"))

        try:
            if mapping and mapping.get("github_issue_number"):
                gh = await client.update_issue(
                    owner=str(owner_login),
                    repo=str(repo_name),
                    issue_number=int(mapping["github_issue_number"]),
                    title=title,
                    body=description,
                    state=gh_state,
                )
                action: Literal["created", "updated", "skipped"] = "updated"
            else:
                gh = await client.create_issue(
                    owner=str(owner_login),
                    repo=str(repo_name),
                    title=title,
                    body=description,
                )
                action = "created"

            gh_number = gh.get("number")
            gh_url = gh.get("html_url")
            gh_updated = _parse_dt(gh.get("updated_at"))

            # Upsert mapping (best-effort)
            try:
                supabase.table("github_issue_mappings").upsert(
                    {
                        "workspace_id": wid,
                        "github_installation_id": installation_id,
                        "internal_issue_id": str(issue_id),
                        "github_repo_id": github_repo_id,
                        "github_issue_number": int(gh_number) if gh_number is not None else None,
                        "github_issue_url": gh_url,
                        "last_synced_at": now.isoformat(),
                        "last_known_local_updated_at": (row.get("updated_at") or now.isoformat()),
                        "last_known_github_updated_at": gh_updated.isoformat() if gh_updated else None,
                    },
                    on_conflict="internal_issue_id,github_repo_id",
                ).execute()
            except Exception as e:
                logger.warning("Failed to upsert github_issue_mappings: %s", e)

            results.append(
                GitHubPushIssuesResult(
                    internal_issue_id=issue_id,
                    github_repo_id=github_repo_id,
                    github_issue_number=int(gh_number) if gh_number is not None else None,
                    github_issue_url=gh_url,
                    action=action,
                )
            )
        except Exception as e:
            results.append(
                GitHubPushIssuesResult(
                    internal_issue_id=issue_id,
                    github_repo_id=github_repo_id,
                    action="skipped",
                    error=str(e),
                )
            )

    return results


@router.get(
    "/workspaces/{workspace_id}/github/projects-v2",
    response_model=GitHubProjectsDiscoverResponse,
    summary="Discover GitHub Projects v2 for an owner",
)
@limiter.limit("20/minute")
async def discover_projects_v2(
    request: Request,
    workspace_id: UUID,
    owner_login: str,
    owner_type: OwnerType,
    current_user: UserModel = Depends(get_current_user),
) -> GitHubProjectsDiscoverResponse:
    wid = str(workspace_id)
    uid = str(current_user.id)

    # Discovery is admin-only because it can expose org/user metadata beyond the app's selected repos.
    _require_workspace_admin(wid, uid)

    installation = _get_active_installation_for_workspace(wid)
    if not installation:
        raise HTTPException(status_code=404, detail="No active GitHub installation")

    installation_id = installation.get("github_installation_id")
    if not installation_id:
        raise HTTPException(status_code=500, detail="Installation record missing github_installation_id")

    gql = GitHubGraphQLClient(int(installation_id))
    projects = await gql.list_projects_v2(owner_login=owner_login, owner_type=owner_type)
    return GitHubProjectsDiscoverResponse(owner_login=owner_login, owner_type=owner_type, projects=projects)


@router.post(
    "/workspaces/{workspace_id}/github/projects-v2/link",
    summary="Link a GitHub Project v2 to this workspace",
)
@limiter.limit("10/minute")
async def link_project_v2(
    request: Request,
    workspace_id: UUID,
    body: GitHubProjectLinkRequest,
    current_user: UserModel = Depends(get_current_user),
):
    wid = str(workspace_id)
    uid = str(current_user.id)
    _require_workspace_admin(wid, uid)

    installation = _get_active_installation_for_workspace(wid)
    if not installation:
        raise HTTPException(status_code=404, detail="No active GitHub installation")

    raw_installation_id = installation.get("github_installation_id")
    if raw_installation_id is None:
        raise HTTPException(status_code=500, detail="Installation record missing github_installation_id")
    installation_id = int(raw_installation_id)

    row = {
        "workspace_id": wid,
        "github_installation_id": installation_id,
        "owner_login": body.owner_login,
        "owner_type": body.owner_type,
        "project_number": body.project_number,
        "project_node_id": body.project_node_id,
        "title": body.title,
        "url": body.url,
        "internal_project_id": str(body.internal_project_id) if body.internal_project_id else None,
        "field_mappings": body.field_mappings or {},
        "sync_enabled": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        supabase.table("github_projects_v2_links").upsert(
            row,
            on_conflict="workspace_id,owner_login,project_number",
        ).execute()
    except Exception as e:
        logger.error("Failed to upsert github_projects_v2_links: %s", e)
        raise HTTPException(status_code=500, detail="Failed to link project")

    return {"success": True}


# ---------------------------------------------------------------------------
# Projects v2 — field mapping, sync, push, status
# ---------------------------------------------------------------------------

class GitHubProjectFieldMappingsRequest(BaseModel):
    """User-defined field mappings: local field name → GitHub field config."""
    mappings: Dict[str, Any] = Field(
        ...,
        description="Mapping of local field names to GitHub field config objects",
    )


class GitHubPushProjectItemsRequest(BaseModel):
    """Push selected local issues into a GitHub Project v2 as items."""
    issue_ids: List[UUID] = Field(..., min_length=1)


@router.get(
    "/workspaces/{workspace_id}/github/projects-v2/{link_id}/fields",
    summary="Get project field definitions from GitHub",
    description="Fetches live field definitions (status options, iterations, etc.) from the linked project.",
)
@limiter.limit("20/minute")
async def get_project_v2_fields(
    request: Request,
    workspace_id: UUID,
    link_id: UUID,
    current_user: UserModel = Depends(get_current_user),
):
    wid = str(workspace_id)
    uid = str(current_user.id)
    _require_workspace_admin(wid, uid)

    installation = _get_active_installation_for_workspace(wid)
    if not installation:
        raise HTTPException(status_code=404, detail="No active GitHub installation")

    raw_installation_id = installation.get("github_installation_id")
    if raw_installation_id is None:
        raise HTTPException(status_code=500, detail="Installation record missing github_installation_id")

    gql = GitHubGraphQLClient(int(raw_installation_id))
    sync_service = ProjectsV2SyncService(gql)

    try:
        fields = await sync_service.fetch_and_cache_fields(str(link_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Failed to fetch project fields: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch project fields")

    return {"fields": fields}


@router.post(
    "/workspaces/{workspace_id}/github/projects-v2/{link_id}/field-mappings",
    summary="Save field mappings for a linked project",
    description="Saves user-defined mappings (local field → GitHub field + option mappings).",
)
@limiter.limit("20/minute")
async def save_project_v2_field_mappings(
    request: Request,
    workspace_id: UUID,
    link_id: UUID,
    body: GitHubProjectFieldMappingsRequest,
    current_user: UserModel = Depends(get_current_user),
):
    wid = str(workspace_id)
    uid = str(current_user.id)
    _require_workspace_admin(wid, uid)

    # Verify project link exists and belongs to this workspace
    link_res = (
        supabase.table("github_projects_v2_links")
        .select("id, workspace_id, field_mappings")
        .eq("id", str(link_id))
        .eq("workspace_id", wid)
        .maybe_single()
        .execute()
    )
    link = getattr(link_res, "data", None)
    if not link:
        raise HTTPException(status_code=404, detail="Project link not found")

    # Preserve _schema from existing mappings
    existing = link.get("field_mappings") or {}
    new_mappings = dict(body.mappings)
    if "_schema" in existing:
        new_mappings["_schema"] = existing["_schema"]

    try:
        supabase.table("github_projects_v2_links").update({
            "field_mappings": new_mappings,
        }).eq("id", str(link_id)).execute()
    except Exception as e:
        logger.error("Failed to save field mappings: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save field mappings")

    return {"success": True}


@router.post(
    "/workspaces/{workspace_id}/github/projects-v2/{link_id}/sync",
    summary="Trigger manual reconciliation for a linked project",
    description="Performs a full bidirectional sync: pulls field changes from GitHub, pushes unmapped items, detects conflicts.",
)
@limiter.limit("5/minute")
async def trigger_project_v2_sync(
    request: Request,
    workspace_id: UUID,
    link_id: UUID,
    current_user: UserModel = Depends(get_current_user),
):
    wid = str(workspace_id)
    uid = str(current_user.id)
    _require_workspace_admin(wid, uid)

    installation = _get_active_installation_for_workspace(wid)
    if not installation:
        raise HTTPException(status_code=404, detail="No active GitHub installation")

    raw_installation_id = installation.get("github_installation_id")
    if raw_installation_id is None:
        raise HTTPException(status_code=500, detail="Installation record missing github_installation_id")

    # Verify project link
    link_res = (
        supabase.table("github_projects_v2_links")
        .select("id, workspace_id")
        .eq("id", str(link_id))
        .eq("workspace_id", wid)
        .maybe_single()
        .execute()
    )
    if not getattr(link_res, "data", None):
        raise HTTPException(status_code=404, detail="Project link not found")

    gql = GitHubGraphQLClient(int(raw_installation_id))
    sync_service = ProjectsV2SyncService(gql)

    try:
        result = await sync_service.reconcile(str(link_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Project v2 reconciliation failed: %s", e)
        raise HTTPException(status_code=500, detail="Reconciliation failed")

    return result


@router.post(
    "/workspaces/{workspace_id}/github/projects-v2/{link_id}/push-items",
    summary="Push selected local issues into a GitHub Project v2",
    description="Issues must be pushed to GitHub Issues first. This adds them as project items and sets field values.",
)
@limiter.limit("10/minute")
async def push_items_to_project_v2(
    request: Request,
    workspace_id: UUID,
    link_id: UUID,
    body: GitHubPushProjectItemsRequest,
    current_user: UserModel = Depends(get_current_user),
):
    wid = str(workspace_id)
    uid = str(current_user.id)
    _require_workspace_admin(wid, uid)

    installation = _get_active_installation_for_workspace(wid)
    if not installation:
        raise HTTPException(status_code=404, detail="No active GitHub installation")

    raw_installation_id = installation.get("github_installation_id")
    if raw_installation_id is None:
        raise HTTPException(status_code=500, detail="Installation record missing github_installation_id")

    # Verify project link
    link_res = (
        supabase.table("github_projects_v2_links")
        .select("id, workspace_id")
        .eq("id", str(link_id))
        .eq("workspace_id", wid)
        .maybe_single()
        .execute()
    )
    if not getattr(link_res, "data", None):
        raise HTTPException(status_code=404, detail="Project link not found")

    gql = GitHubGraphQLClient(int(raw_installation_id))
    sync_service = ProjectsV2SyncService(gql)

    results: List[Dict[str, Any]] = []
    for issue_id in body.issue_ids:
        try:
            result = await sync_service.push_issue_to_project(str(issue_id), str(link_id))
            result["internal_issue_id"] = str(issue_id)
            results.append(result)
        except Exception as e:
            results.append({
                "internal_issue_id": str(issue_id),
                "action": "skipped",
                "error": str(e),
            })

    return {"results": results}


@router.get(
    "/workspaces/{workspace_id}/github/projects-v2/{link_id}/sync-status",
    summary="Get latest sync job status for a linked project",
)
@limiter.limit("30/minute")
async def get_project_v2_sync_status(
    request: Request,
    workspace_id: UUID,
    link_id: UUID,
    current_user: UserModel = Depends(get_current_user),
):
    wid = str(workspace_id)
    uid = str(current_user.id)

    if not _is_workspace_member(wid, uid):
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    res = (
        supabase.table("github_sync_jobs")
        .select("*")
        .eq("workspace_id", wid)
        .eq("resource_type", "projects_v2")
        .eq("resource_id", str(link_id))
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = getattr(res, "data", []) or []
    if not rows:
        return {"sync_job": None}

    return {"sync_job": rows[0]}


# ---------------------------------------------------------------------------
# Disconnect
# ---------------------------------------------------------------------------

class GitHubDisconnectResponse(BaseModel):
    success: bool


@router.post(
    "/workspaces/{workspace_id}/github/disconnect",
    response_model=GitHubDisconnectResponse,
    summary="Disconnect GitHub integration",
    description="Admin-only. Marks the active installation as inactive. Existing sync mappings are retained.",
)
@limiter.limit("10/minute")
async def disconnect_github(
    request: Request,
    workspace_id: UUID,
    current_user: UserModel = Depends(get_current_user),
) -> GitHubDisconnectResponse:
    wid = str(workspace_id)
    uid = str(current_user.id)
    _require_workspace_admin(wid, uid)

    installation = _get_active_installation_for_workspace(wid)
    if not installation:
        raise HTTPException(status_code=404, detail="No active GitHub installation found")

    try:
        supabase.table("github_installations").update(
            {
                "is_active": False,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("workspace_id", wid).eq("is_active", True).execute()
    except Exception as e:
        logger.error("Failed to deactivate github_installations: %s", e)
        raise HTTPException(status_code=500, detail="Failed to disconnect GitHub integration")

    return GitHubDisconnectResponse(success=True)


# ---------------------------------------------------------------------------
# Conflict resolution
# ---------------------------------------------------------------------------

class GitHubConflictResponse(BaseModel):
    id: str
    workspace_id: str
    conflict_type: str
    local_entity_type: str
    local_entity_id: str
    github_entity_type: str
    github_entity_id: str
    conflicting_fields: List[str]
    local_version: Dict[str, Any]
    github_version: Dict[str, Any]
    local_updated_at: Optional[str] = None
    github_updated_at: Optional[str] = None
    status: str
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: Optional[str] = None


class GitHubConflictResolveRequest(BaseModel):
    resolution: Literal["local", "github"]


@router.get(
    "/workspaces/{workspace_id}/github/conflicts",
    response_model=List[GitHubConflictResponse],
    summary="List pending GitHub sync conflicts",
)
@limiter.limit("30/minute")
async def list_github_conflicts(
    request: Request,
    workspace_id: UUID,
    current_user: UserModel = Depends(get_current_user),
) -> List[GitHubConflictResponse]:
    wid = str(workspace_id)
    uid = str(current_user.id)

    if not _is_workspace_member(wid, uid):
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    res = (
        supabase.table("github_conflicts")
        .select("*")
        .eq("workspace_id", wid)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    rows = getattr(res, "data", []) or []
    return [
        GitHubConflictResponse(
            id=str(r.get("id")),
            workspace_id=str(r.get("workspace_id")),
            conflict_type=str(r.get("conflict_type", "")),
            local_entity_type=str(r.get("local_entity_type", "")),
            local_entity_id=str(r.get("local_entity_id", "")),
            github_entity_type=str(r.get("github_entity_type", "")),
            github_entity_id=str(r.get("github_entity_id", "")),
            conflicting_fields=list(r.get("conflicting_fields") or []),
            local_version=dict(r.get("local_version") or {}),
            github_version=dict(r.get("github_version") or {}),
            local_updated_at=r.get("local_updated_at"),
            github_updated_at=r.get("github_updated_at"),
            status=str(r.get("status", "pending")),
            resolved_by=r.get("resolved_by"),
            resolved_at=r.get("resolved_at"),
            created_at=r.get("created_at"),
        )
        for r in rows
    ]


@router.post(
    "/workspaces/{workspace_id}/github/conflicts/{conflict_id}/resolve",
    summary="Resolve a GitHub sync conflict",
    description="Choose 'local' to keep the local version or 'github' to apply the GitHub version.",
)
@limiter.limit("20/minute")
async def resolve_github_conflict(
    request: Request,
    workspace_id: UUID,
    conflict_id: UUID,
    body: GitHubConflictResolveRequest,
    current_user: UserModel = Depends(get_current_user),
):
    wid = str(workspace_id)
    uid = str(current_user.id)

    if not _is_workspace_member(wid, uid):
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    # Fetch conflict
    res = (
        supabase.table("github_conflicts")
        .select("*")
        .eq("id", str(conflict_id))
        .eq("workspace_id", wid)
        .eq("status", "pending")
        .maybe_single()
        .execute()
    )
    conflict = getattr(res, "data", None)
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found or already resolved")

    now = datetime.now(timezone.utc).isoformat()

    if body.resolution == "github":
        # Apply GitHub version to the local issue
        github_version = conflict.get("github_version") or {}
        local_entity_id = conflict.get("local_entity_id")
        if local_entity_id:
            update_payload: Dict[str, Any] = {}
            if "title" in github_version:
                update_payload["title"] = github_version["title"]
            if "body" in github_version:
                update_payload["description"] = github_version["body"]
            if "state" in github_version:
                update_payload["status"] = _local_status_from_github_state(github_version["state"])
            if update_payload:
                try:
                    supabase.table("issues").update(update_payload).eq("id", local_entity_id).execute()
                except Exception as e:
                    logger.error("Failed to apply GitHub version to issue %s: %s", local_entity_id, e)

    # In both cases ("local" or "github"), mark conflict resolved
    try:
        supabase.table("github_conflicts").update(
            {
                "status": "resolved",
                "resolved_by": uid,
                "resolved_at": now,
            }
        ).eq("id", str(conflict_id)).execute()
    except Exception as e:
        logger.error("Failed to mark conflict resolved: %s", e)
        raise HTTPException(status_code=500, detail="Failed to resolve conflict")

    # Update mapping sync timestamp so next webhook doesn't re-conflict on same state
    local_entity_id = conflict.get("local_entity_id")
    github_entity_id = conflict.get("github_entity_id", "")  # format: "{repo_id}#{issue_number}"
    if local_entity_id and "#" in github_entity_id:
        try:
            supabase.table("github_issue_mappings").update(
                {
                    "last_synced_at": now,
                    "last_known_local_updated_at": now,
                    "last_known_github_updated_at": now,
                }
            ).eq("internal_issue_id", local_entity_id).execute()
        except Exception:
            pass

    return {"success": True, "resolution": body.resolution}
