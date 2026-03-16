"""
Jira Settings API Routes
Endpoints for managing Jira integration settings and preferences.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
import httpx

from app.core.dependencies import get_workspace_context, WorkspaceContext, supabase, get_current_user, UserModel

router = APIRouter(prefix="/api/jira/settings", tags=["jira-settings"])
logger = logging.getLogger(__name__)


def _extract_text_from_adf(adf: Dict[str, Any]) -> str:
    """
    Extract plain text from Atlassian Document Format (ADF).
    Recursively walks the ADF tree and concatenates text content.
    """
    if not isinstance(adf, dict):
        return ""
    
    text_parts = []
    
    # Process content array
    if "content" in adf and isinstance(adf["content"], list):
        for node in adf["content"]:
            text_parts.append(_extract_text_from_adf(node))
    
    # Extract text from text nodes
    if adf.get("type") == "text" and "text" in adf:
        text_parts.append(adf["text"])
    
    return " ".join(filter(None, text_parts))


class SyncPreferencesRequest(BaseModel):
    """Request model for updating sync preferences."""
    auto_sync_enabled: Optional[bool] = None
    real_time_updates_enabled: Optional[bool] = None
    bidirectional_sync_enabled: Optional[bool] = None
    sync_comments_enabled: Optional[bool] = None
    auto_sync_interval_minutes: Optional[int] = Field(None, ge=5, le=1440)
    sync_project_keys: Optional[List[str]] = None
    sync_issue_types: Optional[List[str]] = None


class SyncPreferencesResponse(BaseModel):
    """Response model for sync preferences."""
    id: str
    workspace_id: str
    integration_id: str
    auto_sync_enabled: bool
    real_time_updates_enabled: bool
    bidirectional_sync_enabled: bool
    sync_comments_enabled: bool
    auto_sync_interval_minutes: int
    sync_project_keys: Optional[List[str]]
    sync_issue_types: Optional[List[str]]
    created_at: str
    updated_at: str


@router.get("/{integration_id}/preferences")
async def get_sync_preferences(
    integration_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Get sync preferences for a Jira integration.
    Creates default preferences if none exist.
    """
    try:
        # Try to get existing preferences
        result = supabase.table("jira_sync_preferences").select("*").eq(
            "workspace_id", str(ctx.workspace_id)
        ).eq("integration_id", integration_id).execute()
        
        if result.data:
            return {
                "success": True,
                "preferences": result.data[0]
            }
        
        # Create default preferences
        default_prefs = {
            "workspace_id": str(ctx.workspace_id),
            "integration_id": integration_id,
            "auto_sync_enabled": True,
            "real_time_updates_enabled": True,
            "bidirectional_sync_enabled": True,
            "sync_comments_enabled": False,
            "auto_sync_interval_minutes": 30
        }
        
        insert_result = supabase.table("jira_sync_preferences").insert(default_prefs).execute()
        
        return {
            "success": True,
            "preferences": insert_result.data[0]
        }
    except Exception as e:
        logger.error(f"Failed to get sync preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")


@router.patch("/{integration_id}/preferences")
async def update_sync_preferences(
    integration_id: str,
    request: SyncPreferencesRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Update sync preferences for a Jira integration.
    Only updates fields that are provided in the request.
    """
    try:
        # Build update dict with only provided fields
        update_data = {}
        if request.auto_sync_enabled is not None:
            update_data["auto_sync_enabled"] = request.auto_sync_enabled
        if request.real_time_updates_enabled is not None:
            update_data["real_time_updates_enabled"] = request.real_time_updates_enabled
        if request.bidirectional_sync_enabled is not None:
            update_data["bidirectional_sync_enabled"] = request.bidirectional_sync_enabled
        if request.sync_comments_enabled is not None:
            update_data["sync_comments_enabled"] = request.sync_comments_enabled
        if request.auto_sync_interval_minutes is not None:
            update_data["auto_sync_interval_minutes"] = request.auto_sync_interval_minutes
        if request.sync_project_keys is not None:
            update_data["sync_project_keys"] = request.sync_project_keys
        if request.sync_issue_types is not None:
            update_data["sync_issue_types"] = request.sync_issue_types
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update preferences
        result = supabase.table("jira_sync_preferences").update(update_data).eq(
            "workspace_id", str(ctx.workspace_id)
        ).eq("integration_id", integration_id).execute()
        
        if not result.data:
            # Preferences don't exist yet, create them
            create_data = {
                "workspace_id": str(ctx.workspace_id),
                "integration_id": integration_id,
                **update_data
            }
            result = supabase.table("jira_sync_preferences").insert(create_data).execute()
        
        return {
            "success": True,
            "message": "Preferences updated successfully",
            "preferences": result.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update sync preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")


@router.post("/{integration_id}/actions/import-projects")
async def import_projects(
    integration_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Manually import all projects from Jira to local workspace.
    This is a bulk operation that fetches all accessible projects.
    """
    try:
        from app.services.jira.token_manager import JiraOAuthManager
        from app.services.jira.api_client import JiraAPIClient
        from app.core.config import settings
        
        # Get authenticated client
        oauth_manager = JiraOAuthManager(
            client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
            client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value() if settings.JIRA_OAUTH_CLIENT_SECRET else "")
        )
        access_token, cloud_id = await oauth_manager.ensure_valid_token(integration_id, str(ctx.workspace_id))
        client = JiraAPIClient(access_token, cloud_id)
        
        # Fetch all projects
        projects = await client.get_projects(expand=["description", "lead"])
        
        # Store projects in database
        imported_count = 0
        for project in projects:
            # First, save to jira_projects table for tracking
            jira_project_data = {
                "workspace_id": str(ctx.workspace_id),
                "integration_id": integration_id,
                "project_id": project["id"],
                "project_key": project["key"],
                "project_name": project["name"],
                "description": project.get("description"),
                "project_type": project.get("projectTypeKey", "software"),
                "lead_account_id": project.get("lead", {}).get("accountId"),
                "lead_display_name": project.get("lead", {}).get("displayName"),
                "avatar_urls": project.get("avatarUrls"),
                "is_active": True
            }
            
            # Upsert to jira_projects
            supabase.table("jira_projects").upsert(
                jira_project_data,
                on_conflict="workspace_id,project_key"
            ).execute()
            
            # Check if project already exists in main projects table
            existing = supabase.table("projects").select("id").eq(
                "workspace_id", str(ctx.workspace_id)
            ).eq("jira_project_key", project["key"]).execute()
            
            if not existing.data:
                # Create a new project in the main projects table
                project_data = {
                    "workspace_id": str(ctx.workspace_id),
                    "name": project["name"],
                    "key": project["key"],
                    "description": project.get("description", ""),
                    "type": "scrum",  # Default type
                    "status": "active",
                    "integration_id": integration_id,
                    "jira_project_id": project["id"],
                    "jira_project_key": project["key"],
                    "owner_id": str(current_user.id)  # Use current user ID
                }
                
                supabase.table("projects").insert(project_data).execute()
            
            imported_count += 1
        
        return {
            "success": True,
            "message": f"Successfully imported {imported_count} projects",
            "imported_count": imported_count
        }
    except Exception as e:
        logger.error(f"Failed to import projects: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to import projects: {str(e)}")


@router.post("/{integration_id}/actions/import-issues")
async def import_issues(
    integration_id: str,
    project_keys: Optional[List[str]] = None,
    ctx: WorkspaceContext = Depends(get_workspace_context),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Import issues from Jira projects.
    If project_keys provided, only import issues from those projects.
    Otherwise import from all connected Jira projects.
    """
    try:
        # Get integration credentials
        creds_result = supabase.table("integration_credentials").select("*").eq(
            "id", integration_id
        ).eq("workspace_id", str(ctx.workspace_id)).execute()
        
        if not creds_result.data:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        creds = creds_result.data[0]
        if creds.get("integration_type") != "jira_oauth" or not creds.get("is_active"):
            raise HTTPException(status_code=400, detail="Invalid Jira integration")
        
        # Get projects to import issues from
        if project_keys:
            projects_query = supabase.table("jira_projects").select("*").eq(
                "workspace_id", str(ctx.workspace_id)
            ).eq("integration_id", integration_id).in_("project_key", project_keys)
        else:
            projects_query = supabase.table("jira_projects").select("*").eq(
                "workspace_id", str(ctx.workspace_id)
            ).eq("integration_id", integration_id)
        
        projects_result = projects_query.execute()
        
        if not projects_result.data:
            return {
                "success": True,
                "message": "No Jira projects found to import issues from",
                "imported_count": 0
            }
        
        # Initialize Jira client using OAuth manager
        from app.services.jira.token_manager import JiraOAuthManager
        from app.services.jira.api_client import JiraAPIClient
        from app.core.config import settings
        
        oauth_manager = JiraOAuthManager(
            client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
            client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value() if settings.JIRA_OAUTH_CLIENT_SECRET else "")
        )
        # This will automatically refresh the token if needed
        access_token, cloud_id = await oauth_manager.ensure_valid_token(integration_id, str(ctx.workspace_id))
        jira_client = JiraAPIClient(access_token, cloud_id)
        
        total_imported = 0
        total_updated = 0
        
        for jira_project in projects_result.data:
            project_key = jira_project["project_key"]
            
            # Get corresponding local project
            local_project = supabase.table("projects").select("id").eq(
                "workspace_id", str(ctx.workspace_id)
            ).eq("jira_project_key", project_key).execute()
            
            if not local_project.data:
                logger.warning(f"Local project not found for Jira project {project_key}")
                continue
            
            project_id = local_project.data[0]["id"]
            
            # Fetch issues from Jira with retry on 410
            try:
                jql = f"project = {project_key} ORDER BY created DESC"
                search_result = await jira_client.search_issues(
                    jql=jql,
                    max_results=1000,
                    fields=["summary", "description", "issuetype", "status", "priority", "created", "updated"]
                )
            except Exception as e:
                if "410" in str(e):
                    # Token expired mid-operation, refresh and retry
                    logger.warning(f"Token expired (410), refreshing and retrying for project {project_key}")
                    access_token, cloud_id = await oauth_manager.ensure_valid_token(
                        integration_id,
                        str(ctx.workspace_id),
                        force_refresh=True
                    )
                    jira_client = JiraAPIClient(access_token, cloud_id)
                    # Retry the request
                    search_result = await jira_client.search_issues(
                        jql=jql,
                        max_results=1000,
                        fields=["summary", "description", "issuetype", "status", "priority", "created", "updated"]
                    )
                else:
                    raise
            
            issues = search_result.get("issues", [])
            
            for jira_issue in issues:
                fields = jira_issue["fields"]
                issue_key = jira_issue["key"]
                
                # Map Jira issue type to local type
                jira_type = fields.get("issuetype", {}).get("name", "Task").lower()
                if jira_type in ["epic"]:
                    issue_type = "epic"
                elif jira_type in ["story", "user story"]:
                    issue_type = "story"
                elif jira_type in ["bug", "defect"]:
                    issue_type = "bug"
                elif jira_type in ["subtask", "sub-task"]:
                    issue_type = "subtask"
                else:
                    issue_type = "task"
                
                # Extract description
                description = ""
                if fields.get("description"):
                    if isinstance(fields["description"], dict):
                        description = _extract_text_from_adf(fields["description"])
                    else:
                        description = str(fields["description"])
                
                # Check if issue already exists
                existing = supabase.table("issues").select("id").eq(
                    "workspace_id", str(ctx.workspace_id)
                ).eq("jira_issue_key", issue_key).execute()
                
                issue_data = {
                    "workspace_id": str(ctx.workspace_id),
                    "project_id": project_id,
                    "title": fields.get("summary", ""),
                    "description": description,
                    "type": issue_type,
                    "status": fields.get("status", {}).get("name", "To Do"),
                    "priority": fields.get("priority", {}).get("name", "Medium"),
                    "integration_id": integration_id,
                    "jira_issue_id": jira_issue["id"],
                    "jira_issue_key": issue_key
                }
                
                if existing.data:
                    supabase.table("issues").update(issue_data).eq(
                        "id", existing.data[0]["id"]
                    ).execute()
                    total_updated += 1
                else:
                    supabase.table("issues").insert(issue_data).execute()
                    total_imported += 1
        
        return {
            "success": True,
            "message": f"Successfully imported {total_imported} issues, updated {total_updated} issues",
            "imported_count": total_imported,
            "updated_count": total_updated
        }
    except Exception as e:
        logger.error(f"Failed to import issues: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to import issues: {str(e)}")


@router.post("/{integration_id}/actions/export-issues")
async def export_issues(
    integration_id: str,
    project_key: Optional[str] = None,
    issue_ids: Optional[List[str]] = None,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Export local issues to Jira.
    Optionally specify project_key to export only issues from that project.
    Or provide issue_ids to export specific issues.
    """
    try:
        # Get integration credentials
        creds_result = supabase.table("integration_credentials").select("*").eq(
            "id", integration_id
        ).eq("workspace_id", str(ctx.workspace_id)).execute()
        
        if not creds_result.data:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        creds = creds_result.data[0]
        if creds.get("integration_type") != "jira_oauth" or not creds.get("is_active"):
            raise HTTPException(status_code=400, detail="Invalid Jira integration")
        
        # Initialize Jira client using OAuth manager (handles refresh)
        from app.services.jira.token_manager import JiraOAuthManager
        from app.services.jira.api_client import JiraAPIClient
        from app.core.config import settings
        oauth_manager = JiraOAuthManager(
            client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
            client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value() if settings.JIRA_OAUTH_CLIENT_SECRET else "")
        )
        access_token, cloud_id = await oauth_manager.ensure_valid_token(integration_id, str(ctx.workspace_id))
        jira_client = JiraAPIClient(access_token, cloud_id)
        
        # Build query for local issues to export
        query = supabase.table("issues").select("*").eq(
            "workspace_id", str(ctx.workspace_id)
        ).is_("integration_id", "null")  # Only export local (non-Jira) issues
        
        if issue_ids:
            query = query.in_("id", issue_ids)
        elif project_key:
            # Get project ID from project_key
            project_result = supabase.table("projects").select("id").eq(
                "workspace_id", str(ctx.workspace_id)
            ).eq("key", project_key).execute()
            
            if not project_result.data:
                raise HTTPException(status_code=404, detail=f"Project {project_key} not found")
            
            query = query.eq("project_id", project_result.data[0]["id"])
        
        issues_result = query.execute()
        
        if not issues_result.data:
            return {
                "success": True,
                "message": "No local issues found to export",
                "exported_count": 0
            }
        
        exported_count = 0
        failed_count = 0
        errors = []

        # Cache project_id -> jira_project_key to reduce round-trips
        project_key_cache: dict[str, str] = {}
        
        for issue in issues_result.data:
            try:
                project_id = issue.get("project_id")
                if not project_id:
                    errors.append(f"Issue {issue.get('title')}: Missing project_id; cannot export")
                    failed_count += 1
                    continue

                # Resolve Jira project key with caching
                if project_id not in project_key_cache:
                    project_result = supabase.table("projects").select("jira_project_key").eq(
                        "id", project_id
                    ).maybe_single().execute()
                    jira_project_key = (project_result.data or {}).get("jira_project_key") if getattr(project_result, "data", None) else None
                    if not jira_project_key:
                        errors.append(f"Issue {issue.get('title')}: Project not linked to Jira")
                        failed_count += 1
                        continue
                    project_key_cache[project_id] = jira_project_key
                else:
                    jira_project_key = project_key_cache[project_id]
                
                # Map local issue type to Jira issue type
                issue_type_map = {
                    "epic": "Epic",
                    "story": "Story",
                    "task": "Task",
                    "bug": "Bug",
                    "subtask": "Sub-task"
                }
                jira_issue_type = issue_type_map.get(issue.get("type", "task"), "Task")
                
                # Map local priority to Jira priority (capitalize first letter)
                priority_map = {
                    "highest": "Highest",
                    "high": "High",
                    "medium": "Medium",
                    "low": "Low",
                    "lowest": "Lowest"
                }
                
                # Create issue in Jira
                create_payload = {
                    "fields": {
                        "project": {"key": jira_project_key},
                        "summary": issue["title"],
                        "description": {
                            "type": "doc",
                            "version": 1,
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": issue.get("description", "") or "No description"
                                        }
                                    ]
                                }
                            ]
                        },
                        "issuetype": {"name": jira_issue_type}
                    }
                }
                
                # Add priority if present and valid
                local_priority = issue.get("priority", "").lower() if issue.get("priority") else None
                if local_priority and local_priority in priority_map:
                    create_payload["fields"]["priority"] = {"name": priority_map[local_priority]}
                
                # Create issue in Jira
                result = await jira_client.create_issue(create_payload)
                
                # Update local issue with Jira metadata
                supabase.table("issues").update({
                    "integration_id": integration_id,
                    "jira_issue_id": result["id"],
                    "jira_issue_key": result["key"]
                }).eq("id", issue["id"]).execute()
                
                exported_count += 1
                
            except httpx.HTTPStatusError as e:
                detail = e.response.text if e.response is not None else str(e)
                logger.error(f"Failed to export issue {issue.get('title')}: {detail}")
                errors.append(f"Issue {issue.get('title')}: {detail}")
                failed_count += 1
            except Exception as e:
                logger.error(f"Failed to export issue {issue.get('title')}: {e}")
                errors.append(f"Issue {issue.get('title')}: {str(e)}")
                failed_count += 1
        
        message = f"Successfully exported {exported_count} issues to Jira"
        if failed_count > 0:
            message += f", {failed_count} failed"
        
        return {
            "success": True,
            "message": message,
            "exported_count": exported_count,
            "failed_count": failed_count,
            "errors": errors if errors else None
        }
    except Exception as e:
        logger.error(f"Failed to export issues: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export issues: {str(e)}")


@router.post("/{integration_id}/actions/force-resync")
async def force_full_resync(
    integration_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Force a full resync of all Jira data.
    This will refresh all projects, issues, and metadata.
    """
    try:
        from app.services.jira.sync_service import JiraSyncService
        from app.services.jira.token_manager import JiraOAuthManager
        from app.services.jira.api_client import JiraAPIClient
        from app.core.config import settings
        
        # Get sync service
        oauth_manager = JiraOAuthManager(
            client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
            client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value() if settings.JIRA_OAUTH_CLIENT_SECRET else "")
        )
        access_token, cloud_id = await oauth_manager.ensure_valid_token(integration_id, str(ctx.workspace_id))
        client = JiraAPIClient(access_token, cloud_id)
        sync_service = JiraSyncService(client, str(ctx.workspace_id), integration_id)
        
        # Get all projects to sync
        projects_result = supabase.table("jira_projects").select("project_key").eq(
            "workspace_id", str(ctx.workspace_id)
        ).eq("integration_id", integration_id).eq("is_active", True).execute()
        
        if not projects_result.data:
            return {
                "success": False,
                "message": "No projects found to sync. Import projects first."
            }
        
        # Trigger sync for each project
        synced_projects = []
        for project in projects_result.data:
            try:
                await sync_service.sync_project(
                    project_key=project["project_key"],
                    sync_type="manual",
                    include_issues=True
                )
                synced_projects.append(project["project_key"])
            except Exception as proj_error:
                logger.error(f"Failed to sync project {project['project_key']}: {proj_error}")
        
        return {
            "success": True,
            "message": f"Full resync completed for {len(synced_projects)} projects",
            "synced_projects": synced_projects
        }
    except Exception as e:
        logger.error(f"Failed to force resync: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to force resync: {str(e)}")
