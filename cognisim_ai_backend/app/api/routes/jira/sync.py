"""
Jira Sync API Routes
Endpoints for syncing Jira data and handling webhooks.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, Query
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import logging
import os

from app.core.dependencies import get_workspace_context, WorkspaceContext, supabase
from app.core.config import settings
from app.services.jira.token_manager import JiraOAuthManager
from app.services.jira.api_client import JiraAPIClient
from app.services.jira.sync_service import JiraSyncService

router = APIRouter(prefix="/api/jira/sync", tags=["jira-sync"])
oauth_manager = JiraOAuthManager(
    client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
    client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value() if settings.JIRA_OAUTH_CLIENT_SECRET else "")
)
logger = logging.getLogger(__name__)

# Get webhook URL from settings (uses JIRA_WEBHOOK_URL env variable)
# For production: https://hammadahhmed06-cognisimai-backend.hf.space/api/jira/sync/webhook/receive
# For local dev: http://localhost:8000/api/jira/sync/webhook/receive (or ngrok URL)
WEBHOOK_BASE_URL = settings.JIRA_WEBHOOK_URL or os.getenv("PUBLIC_URL", "http://localhost:8000")


class SyncProjectRequest(BaseModel):
    project_key: str = Field(..., description="Jira project key to sync")
    include_issues: bool = Field(True, description="Whether to sync project issues")
    since: Optional[str] = Field(None, description="ISO datetime - only sync issues updated after this")


class SyncSprintRequest(BaseModel):
    sprint_id: int = Field(..., description="Jira sprint ID to sync")
    board_id: Optional[int] = Field(None, description="Board ID (optional)")


class WebhookRegisterRequest(BaseModel):
    project_key: Optional[str] = Field(None, description="Limit webhook to specific project")
    events: Optional[list[str]] = Field(None, description="Jira events to listen for")


async def get_jira_sync_service(
    integration_id: str,
    workspace_id: str
) -> JiraSyncService:
    """Helper to get Jira sync service."""
    access_token, cloud_id = await oauth_manager.ensure_valid_token(integration_id, workspace_id)
    client = JiraAPIClient(access_token, cloud_id)
    return JiraSyncService(client, workspace_id, integration_id)


async def get_authenticated_jira_client(
    integration_id: str,
    workspace_id: str
) -> JiraAPIClient:
    """Helper to get authenticated Jira client."""
    access_token, cloud_id = await oauth_manager.ensure_valid_token(integration_id, workspace_id)
    return JiraAPIClient(access_token, cloud_id)


# ==================== Sync Endpoints ====================

@router.post("/{integration_id}/project")
async def sync_project(
    integration_id: str,
    request: SyncProjectRequest,
    background_tasks: BackgroundTasks,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Sync a Jira project to local database.
    
    Fetches project metadata and optionally all issues.
    For large projects, this may take some time and runs in background.
    """
    sync_service = await get_jira_sync_service(integration_id, str(ctx.workspace_id))
    
    # Parse since datetime if provided
    since_dt = None
    if request.since:
        try:
            since_dt = datetime.fromisoformat(request.since.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format for 'since'")
    
    # Run sync
    try:
        result = await sync_service.sync_project(
            project_key=request.project_key,
            sync_type="manual",
            include_issues=request.include_issues
        )
        
        return {
            "success": True,
            "message": f"Project {request.project_key} synced successfully",
            "job_id": result["job_id"],
            "project_id": result["project_id"],
            "items_processed": result["items_processed"],
            "items_created": result["items_created"],
            "items_updated": result["items_updated"]
        }
    except Exception as e:
        logger.error(f"Project sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{integration_id}/sprint")
async def sync_sprint(
    integration_id: str,
    request: SyncSprintRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Sync a Jira sprint and its issues.
    
    Fetches all issues in the sprint and syncs them to local database.
    """
    sync_service = await get_jira_sync_service(integration_id, str(ctx.workspace_id))
    
    try:
        result = await sync_service.sync_sprint(
            sprint_id=request.sprint_id,
            board_id=request.board_id,
            sync_type="manual"
        )
        
        return {
            "success": True,
            "message": f"Sprint synced successfully",
            "job_id": result["job_id"],
            "sprint_name": result.get("sprint_name"),
            "items_processed": result["items_processed"],
            "items_created": result["items_created"],
            "items_updated": result["items_updated"]
        }
    except Exception as e:
        logger.error(f"Sprint sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{integration_id}/status/{job_id}")
async def get_sync_status(
    integration_id: str,
    job_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Get the status of a sync job.
    
    Returns job status, progress, and results.
    """
    result = supabase.table("jira_sync_jobs").select("*").eq("id", job_id).eq(
        "workspace_id", str(ctx.workspace_id)
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Sync job not found")
    
    job = result.data[0]
    
    return {
        "success": True,
        "job": job
    }


@router.get("/{integration_id}/jobs")
async def list_sync_jobs(
    integration_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None, description="Filter by status")
):
    """
    List sync jobs for an integration.
    
    Returns paginated list of sync jobs with their status.
    """
    
    query = supabase.table("jira_sync_jobs").select("*").eq(
        "integration_id", integration_id
    ).eq("workspace_id", str(ctx.workspace_id))
    
    if status:
        query = query.eq("status", status)
    
    result = query.order("started_at", desc=True).range(offset, offset + limit - 1).execute()
    
    return {
        "success": True,
        "jobs": result.data,
        "count": len(result.data)
    }


# ==================== Webhook Endpoints ====================

@router.post("/{integration_id}/webhook/register")
async def register_webhook(
    integration_id: str,
    request: WebhookRegisterRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Register a Jira webhook for real-time updates.
    
    Creates a webhook in Jira that will send events to our public endpoint.
    Uses REST API v3 /rest/api/3/webhook endpoint.
    """
    client = await get_authenticated_jira_client(integration_id, str(ctx.workspace_id))
    
    # Build webhook URL - use WEBHOOK_BASE_URL which reads from JIRA_WEBHOOK_URL env
    # If WEBHOOK_BASE_URL already contains /api/jira/sync/webhook/receive, use it as-is
    # Otherwise, append the path
    if "/api/jira/sync/webhook/receive" in WEBHOOK_BASE_URL:
        webhook_url = WEBHOOK_BASE_URL
    else:
        webhook_url = f"{WEBHOOK_BASE_URL}/api/jira/sync/webhook/receive"
    
    # Default events if not specified
    events = request.events or [
        "jira:issue_created",
        "jira:issue_updated",
        "jira:issue_deleted",
        "comment_created",
        "comment_updated",
        "comment_deleted"
    ]
    
    # Build webhook data for REST API v3
    # Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-webhooks/#api-rest-api-3-webhook-post
    webhook_data = {
        "url": webhook_url,
        "webhooks": [{
            "events": events
        }]
    }
    
    # Add JQL filter if project specified
    if request.project_key:
        webhook_data["webhooks"][0]["jqlFilter"] = f"project = {request.project_key}"
    
    try:
        # Create webhook in Jira
        jira_webhook_response = await client.create_webhook(webhook_data)
        
        # REST API v3 returns: {"webhookRegistrationResult": [{"createdWebhookId": 123, ...}]}
        webhook_results = jira_webhook_response.get("webhookRegistrationResult", [])
        if not webhook_results:
            raise Exception("No webhook created in response")
        
        created_webhook = webhook_results[0]
        jira_webhook_id = str(created_webhook.get("createdWebhookId"))
        
        # Store webhook registration in database
        webhook_record = {
            "workspace_id": str(ctx.workspace_id),
            "integration_id": integration_id,
            "jira_webhook_id": jira_webhook_id,
            "webhook_name": f"CogniSim Sync - {ctx.workspace_id}",
            "webhook_url": webhook_url,
            "events": events,
            "jql_filter": webhook_data["webhooks"][0].get("jqlFilter"),
            "is_active": True
        }
        
        result = supabase.table("jira_webhooks").insert(webhook_record).execute()
        
        return {
            "success": True,
            "message": "Webhook registered successfully",
            "webhook_id": result.data[0]["id"],
            "jira_webhook_id": jira_webhook_id,
            "webhook_url": webhook_url
        }
    except Exception as e:
        logger.error(f"Webhook registration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to register webhook: {str(e)}")


@router.get("/{integration_id}/webhook/list")
async def list_webhooks(
    integration_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    List all registered webhooks for an integration.
    """
    
    result = supabase.table("jira_webhooks").select("*").eq(
        "integration_id", integration_id
    ).eq("workspace_id", str(ctx.workspace_id)).execute()
    
    return {
        "success": True,
        "webhooks": result.data
    }


@router.delete("/{integration_id}/webhook/{webhook_id}")
async def delete_webhook(
    integration_id: str,
    webhook_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Unregister a webhook.
    
    Deletes the webhook from both Jira and local database.
    """
    client = await get_authenticated_jira_client(integration_id, str(ctx.workspace_id))
    
    # Get webhook record
    webhook_result = supabase.table("jira_webhooks").select("*").eq("id", webhook_id).eq(
        "workspace_id", str(ctx.workspace_id)
    ).execute()
    
    if not webhook_result.data:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    webhook = webhook_result.data[0]
    jira_webhook_id = webhook["jira_webhook_id"]
    
    try:
        # Delete from Jira
        await client.delete_webhook(jira_webhook_id)
        
        # Delete from database
        supabase.table("jira_webhooks").delete().eq("id", webhook_id).execute()
        
        return {
            "success": True,
            "message": "Webhook deleted successfully"
        }
    except Exception as e:
        logger.error(f"Webhook deletion failed: {e}")
        # Try to delete from database anyway
        supabase.table("jira_webhooks").update({"is_active": False}).eq("id", webhook_id).execute()
        raise HTTPException(status_code=500, detail=f"Failed to delete webhook: {str(e)}")


@router.post("/webhook/receive")
async def receive_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Receive and process Jira webhook events.
    
    This is a public endpoint that Jira will call when events occur.
    Processes events in the background to sync data.
    """
    try:
        # Parse webhook payload
        payload = await request.json()
        
        logger.info(f"Received Jira webhook: {payload.get('webhookEvent')}")
        
        # Extract event data
        event_type = payload.get("webhookEvent")
        issue = payload.get("issue")
        
        if not issue:
            return {"success": True, "message": "No issue in payload"}
        
        issue_key = issue.get("key")
        
        # Find webhooks that should receive this event
        webhooks_result = supabase.table("jira_webhooks").select("*").eq("is_active", True).execute()
        
        # Log the event
        for webhook in webhooks_result.data:
            if event_type in webhook.get("events", []):
                event_record = {
                    "webhook_id": webhook["id"],
                    "workspace_id": webhook["workspace_id"],
                    "event_type": event_type,
                    "issue_key": issue_key,
                    "issue_id": issue.get("id"),
                    "payload": payload,
                    "processed": False
                }
                
                supabase.table("jira_webhook_events").insert(event_record).execute()
                
                # Update webhook last received timestamp
                supabase.table("jira_webhooks").update({
                    "last_received_at": datetime.utcnow().isoformat()
                }).eq("id", webhook["id"]).execute()
                
                # Process event in background
                background_tasks.add_task(
                    process_webhook_event,
                    webhook["workspace_id"],
                    webhook["integration_id"],
                    event_type,
                    issue
                )
        
        return {"success": True, "message": "Webhook received and queued for processing"}
        
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return {"success": False, "error": str(e)}


async def process_webhook_event(
    workspace_id: str,
    integration_id: str,
    event_type: str,
    issue_data: Dict[str, Any]
):
    """
    Background task to process webhook events.
    
    Syncs the affected issue to local database.
    """
    try:
        logger.info(f"Processing webhook event: {event_type} for issue {issue_data.get('key')}")
        
        # Get sync service
        sync_service = await get_jira_sync_service(integration_id, workspace_id)
        
        # Extract issue key and project
        issue_key = issue_data.get("key")
        project_key = issue_key.split("-")[0] if issue_key else None
        
        if not project_key:
            logger.warning(f"No project key found for issue: {issue_key}")
            return
        
        # Ensure project exists
        project_result = supabase.table("projects").select("id").eq(
            "jira_project_key", project_key
        ).eq("workspace_id", workspace_id).execute()
        
        if not project_result.data:
            # Sync project first
            await sync_service.sync_project(project_key, sync_type="webhook", include_issues=False)
            project_result = supabase.table("projects").select("id").eq(
                "jira_project_key", project_key
            ).eq("workspace_id", workspace_id).execute()
        
        if project_result.data:
            project_id = project_result.data[0]["id"]
            
            # Fetch full issue from Jira and sync
            if issue_key:
                issue_full = await sync_service.jira_client.get_issue(issue_key)
                await sync_service._sync_single_issue(issue_full, project_id, project_key)
            
            logger.info(f"Successfully processed webhook event for {issue_key}")
        else:
            logger.warning(f"Project {project_key} not found after sync")
            
    except Exception as e:
        logger.error(f"Error processing webhook event: {e}")


@router.get("/{integration_id}/webhook/events")
async def list_webhook_events(
    integration_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context),
    limit: int = Query(50, ge=1, le=200),
    processed: Optional[bool] = Query(None, description="Filter by processed status")
):
    """
    List recent webhook events.
    
    Returns events received from Jira webhooks.
    """
    
    query = supabase.table("jira_webhook_events").select("*").eq(
        "workspace_id", str(ctx.workspace_id)
    )
    
    if processed is not None:
        query = query.eq("processed", processed)
    
    result = query.order("received_at", desc=True).limit(limit).execute()
    
    return {
        "success": True,
        "events": result.data,
        "count": len(result.data)
    }
