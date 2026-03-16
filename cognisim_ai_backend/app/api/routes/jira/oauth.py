from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from typing import Optional
from datetime import datetime, timedelta, timezone
import logging
import secrets

from app.core.config import settings
from app.core.dependencies import get_current_user, get_workspace_context, WorkspaceContext, UserModel, supabase
from app.services.jira.atlassian_oauth_client import AtlassianOAuthClient
from app.services.encryption.simple_credential_store import simple_credential_store

logger = logging.getLogger("cognisim_ai")
router = APIRouter(prefix="/api/jira/oauth", tags=["Jira OAuth"])

oauth_client = AtlassianOAuthClient(
    client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
    client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value() if settings.JIRA_OAUTH_CLIENT_SECRET else "")
)


@router.get("/init")
async def init_jira_oauth(
    workspace_context: WorkspaceContext = Depends(get_workspace_context),
    current_user: UserModel = Depends(get_current_user),
):
    """Initialize Jira OAuth flow (NO PKCE)"""
    try:
        workspace_id = workspace_context.workspace_id
        
        logger.info(f"Initializing Jira OAuth for workspace: {workspace_id}, user: {current_user.id}")
        
        state = secrets.token_urlsafe(32)
        redirect_uri = settings.JIRA_OAUTH_REDIRECT_URI
        if not redirect_uri:
            raise HTTPException(status_code=500, detail="JIRA_OAUTH_REDIRECT_URI not configured")
        
        authorization_url = oauth_client.build_authorization_url(redirect_uri=redirect_uri, state=state)
        
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        supabase.table("oauth_states").insert({
            "state": state,
            "workspace_id": str(workspace_id),
            "user_id": str(current_user.id),
            "redirect_uri": redirect_uri,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        
        logger.info(f"OAuth initialized. State: {state[:10]}...")
        return {"authorization_url": authorization_url, "state": state}
        
    except Exception as e:
        logger.error(f"OAuth init failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/callback")
async def jira_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None)
):
    """Handle OAuth callback from Atlassian"""
    try:
        if error:
            logger.error(f"OAuth error: {error} - {error_description}")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/integrations?status=error&message={error}",
                status_code=302
            )
        
        if not code or not state:
            logger.error("Missing code or state")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/integrations?status=error&message=missing_parameters",
                status_code=302
            )
        
        logger.info(f"Received callback. State: {state[:10]}...")
        
        state_result = supabase.table("oauth_states").select("*").eq("state", state).single().execute()
        if not state_result.data:
            logger.error("Invalid state")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/integrations?status=error&message=invalid_state",
                status_code=302
            )
        
        state_data = state_result.data
        workspace_id = str(state_data["workspace_id"])
        user_id = str(state_data["user_id"])  # Get user_id from oauth state
        redirect_uri = state_data["redirect_uri"]
        
        expires_at = datetime.fromisoformat(state_data["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            logger.error("Expired state")
            supabase.table("oauth_states").delete().eq("state", state).execute()
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/integrations?status=error&message=expired_state",
                status_code=302
            )
        
        logger.info(f"State validated. Workspace: {workspace_id}")
        
        token_data = await oauth_client.exchange_code_for_tokens(code=code, redirect_uri=redirect_uri)
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)
        
        logger.info(f"Tokens received. Expires in: {expires_in}s")
        
        resources = await oauth_client.get_accessible_resources(access_token)
        if not resources:
            logger.error("No accessible resources")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/integrations?status=error&message=no_resources",
                status_code=302
            )
        
        resource = resources[0]
        cloud_id = resource["id"]
        site_url = resource["url"]
        site_name = resource.get("name", "Jira Site")
        
        logger.info(f"Resource: {site_name} (cloudId: {cloud_id})")
        
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        encrypted_access_token = simple_credential_store.encode_credential(access_token)
        encrypted_refresh_token = simple_credential_store.encode_credential(refresh_token) if refresh_token else None
        
        # Check if integration already exists
        existing = supabase.table("integration_credentials").select("id").eq("workspace_id", workspace_id).eq("integration_type", "jira_oauth").execute()
        
        integration_data = {
            "workspace_id": workspace_id,
            "owner_id": str(user_id),  # Track who created/connected the integration
            "integration_type": "jira_oauth",
            "jira_api_token_encrypted": encrypted_access_token,
            "jira_refresh_token_encrypted": encrypted_refresh_token,
            "jira_cloud_id": cloud_id,
            "jira_url": site_url,
            "is_active": True,
            "connection_status": "connected",
            "last_tested_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing.data:
            integration_id = existing.data[0]["id"]
            logger.info(f"Updating integration: {integration_id}")
            supabase.table("integration_credentials").update(integration_data).eq("id", integration_id).execute()
        else:
            logger.info("Creating new integration")
            integration_data["created_at"] = datetime.now(timezone.utc).isoformat()
            result = supabase.table("integration_credentials").insert(integration_data).execute()
            integration_id = result.data[0]["id"]
        
        supabase.table("oauth_states").delete().eq("state", state).execute()
        
        logger.info(f"OAuth completed! Integration: {integration_id}")
        
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/integrations?status=success&integration=jira&site={site_name}",
            status_code=302
        )
        
    except Exception as e:
        logger.error(f"Callback failed: {str(e)}", exc_info=True)
        if state:
            try:
                supabase.table("oauth_states").delete().eq("state", state).execute()
            except:
                pass
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard/integrations?status=error&message={str(e)}",
            status_code=302
        )


@router.get("/status")
async def get_oauth_status(
    workspace_context: WorkspaceContext = Depends(get_workspace_context)
):
    """Check if workspace has an active Jira OAuth integration"""
    try:
        workspace_id = str(workspace_context.workspace_id)
        
        result = supabase.table("integration_credentials")\
            .select("id,is_active,connection_status,jira_url,jira_cloud_id")\
            .eq("workspace_id", workspace_id)\
            .eq("integration_type", "jira_oauth")\
            .execute()
        
        if result.data and len(result.data) > 0:
            integration = result.data[0]
            is_connected = integration.get("is_active", False) and integration.get("connection_status") == "connected"
            return {
                "is_connected": is_connected,
                "connected": is_connected,  # Also include for backward compatibility
                "integration_id": integration["id"],
                "site_url": integration.get("jira_url"),
                "cloud_id": integration.get("jira_cloud_id"),
                "connection_status": integration.get("connection_status"),
                "last_tested_at": integration.get("last_tested_at")
            }
        
        return {"is_connected": False, "connected": False}
    except Exception as e:
        logger.error(f"Error checking OAuth status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disconnect")
async def disconnect_jira(
    workspace_context: WorkspaceContext = Depends(get_workspace_context),
):
    """Disconnect Jira integration"""
    try:
        workspace_id = str(workspace_context.workspace_id)
        
        # Delete or deactivate the integration
        result = supabase.table("integration_credentials")\
            .delete()\
            .eq("workspace_id", workspace_id)\
            .in_("integration_type", ["jira_oauth", "jira"])\
            .execute()
        
        logger.info(f"✅ Disconnected Jira for workspace: {workspace_id}")
        
        return {
            "success": True, 
            "message": "Jira integration disconnected successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Disconnect failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to disconnect Jira: {str(e)}"
        )

