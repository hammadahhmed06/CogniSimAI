"""
Jira Projects Routes
Handles project management operations.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import Optional
from uuid import uuid4
import logging
import re

from app.core.config import settings
from app.core.dependencies import get_workspace_context, WorkspaceContext, supabase, get_current_user, UserModel
from app.services.jira import JiraAPIClient, JiraOAuthManager, JiraSyncService

# Initialize
logger = logging.getLogger("cognisim_ai")
router = APIRouter(prefix="/api/jira/projects", tags=["Jira Projects"])

# OAuth manager singleton
oauth_manager = JiraOAuthManager(
    client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
    client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value() if settings.JIRA_OAUTH_CLIENT_SECRET else "")
)


async def get_authenticated_jira_client(
    integration_id: str,
    workspace_id: str
) -> JiraAPIClient:
    """
    Helper to get authenticated Jira client with auto token refresh.
    
    Raises:
        HTTPException(401): If credentials are missing or invalid
        HTTPException(500): For other errors
    """
    try:
        access_token, cloud_id = await oauth_manager.ensure_valid_token(
            integration_id, workspace_id
        )
        return JiraAPIClient(access_token, cloud_id)
    except ValueError as e:
        # Credential validation/decryption errors
        logger.error(f"Credential error for integration {integration_id}: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Integration credentials are invalid. Please reconnect your Jira integration."
        )
    except Exception as e:
        # Check if it's a credential-related error
        error_msg = str(e)
        if any(keyword in error_msg.lower() for keyword in ["credential", "decrypt", "token", "unauthorized"]):
            logger.error(f"Auth error for integration {integration_id}: {error_msg}")
            raise HTTPException(
                status_code=401,
                detail="Integration credentials are invalid. Please reconnect your Jira integration."
            )
        # Other errors
        logger.error(f"Failed to get Jira client: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to Jira: {error_msg}")


@router.get(
    "/{integration_id}",
    summary="Get All Projects",
    description="List all Jira projects (fetch-only, no auto-import)"
)
async def get_projects(
    integration_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Get all projects from Jira (does not create projects in CogniSim)."""
    workspace_id = str(ctx.workspace_id)
    
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        # Fetch projects from Jira only
        projects = await client.get_projects()
        
        logger.info(f"✅ Retrieved {len(projects)} Jira projects")
        
        # Return direct data (frontend expects { projects: [...] })
        return {"projects": projects}
        
    except Exception as e:
        logger.error(f"Failed to get projects: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{integration_id}/{project_key}",
    summary="Get Project Details",
    description="Get details of a specific Jira project (fetch-only, no auto-import)"
)
async def get_project(
    integration_id: str,
    project_key: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Get project details by key from Jira (does not create in CogniSim)."""
    workspace_id = str(ctx.workspace_id)
    
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        # Fetch project from Jira only
        project = await client.get_project(project_key)
        
        logger.info(f"✅ Retrieved Jira project {project_key}")
        
        # Return project object directly
        return project
        
    except Exception as e:
        logger.error(f"Failed to get project {project_key}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{integration_id}/{project_key}/users",
    summary="Get Project Users",
    description="Get list of users who can be assigned to issues in a project"
)
async def get_project_users(
    integration_id: str,
    project_key: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Get assignable users for a project."""
    workspace_id = str(ctx.workspace_id)
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        # Fetch users
        users = await client.get_project_users(project_key)
        
        logger.info(f"Retrieved {len(users)} users for project {project_key}")
        
        # Return direct data
        return {"users": users}
        
    except Exception as e:
        logger.error(f"Failed to get project users: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{integration_id}/{project_key}/issue-types",
    summary="Get Project Issue Types",
    description="Get available issue types for a project"
)
async def get_project_issue_types(
    integration_id: str,
    project_key: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Get issue types available in a project."""
    workspace_id = str(ctx.workspace_id)
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        # Fetch project
        project = await client.get_project(project_key)
        issue_types = project.get("issueTypes", [])
        
        # Return direct data
        return {"issue_types": issue_types}
        
    except Exception as e:
        logger.error(f"Failed to get issue types: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{integration_id}/{project_key}/statuses",
    summary="Get Project Statuses",
    description="Get available statuses for a project"
)
async def get_project_statuses(
    integration_id: str,
    project_key: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Get available statuses in a project."""
    workspace_id = str(ctx.workspace_id)
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        # Note: get_project_statuses method needs to be added to JiraAPIClient
        # For now, return empty list
        # statuses = await client.get_project_statuses(project_key)
        
        # Return direct data
        return {
            "statuses": [],
            "note": "get_project_statuses method needs to be implemented in JiraAPIClient"
        }
        
    except Exception as e:
        logger.error(f"Failed to get statuses: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{integration_id}/{project_key}/import",
    summary="Import Jira Project",
    description="Import a Jira project as a new CogniSim project with optional issue import"
)
async def import_jira_project(
    integration_id: str,
    project_key: str,
    import_options: dict = Body(default={"import_issues": False, "import_sprints": False, "max_issues": 100}),
    ctx: WorkspaceContext = Depends(get_workspace_context),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Import a Jira project as a new CogniSim project.
    
    Options:
    - import_issues: Whether to import issues (default: False)
    - import_sprints: Whether to import sprints (default: False)  
    - max_issues: Maximum number of issues to import (default: 100)
    """
    workspace_id = str(ctx.workspace_id)
    
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        # Fetch Jira project details
        jira_project = await client.get_project(project_key)
        
        # Check if project with this key already exists in CogniSim
        existing = supabase.table("projects")\
            .select("id")\
            .eq("owner_id", str(current_user.id))\
            .eq("key", project_key)\
            .maybe_single()\
            .execute()
        
        if getattr(existing, "data", None):
            raise HTTPException(
                status_code=400, 
                detail=f"Project with key '{project_key}' already exists in your workspace"
            )
        
        # Create project in CogniSim database
        project_id = str(uuid4())
        
        # Generate slug from project name
        base_slug = re.sub(r"[^a-z0-9]+", "-", jira_project.get("name", project_key).lower()).strip('-')[:40]
        candidate_slug = base_slug or project_key.lower()
        
        # Ensure unique slug
        slug_counter = 1
        original_slug = candidate_slug
        while True:
            existing_slug = supabase.table("projects")\
                .select("id")\
                .eq("slug", candidate_slug)\
                .limit(1)\
                .execute()
            if not getattr(existing_slug, 'data', None):
                break
            candidate_slug = f"{original_slug}-{slug_counter}"[:48]
            slug_counter += 1
        
        # Prepare project data
        project_data = {
            "id": project_id,
            "workspace_id": workspace_id,
            "owner_id": str(current_user.id),
            "key": project_key,
            "name": jira_project.get("name", project_key),
            "description": jira_project.get("description", f"Imported from Jira project {project_key}"),
            "type": "scrum" if jira_project.get("projectTypeKey") == "software" else "kanban",
            "slug": candidate_slug,
            "status": "active",
            # Store Jira metadata for linking
            "integration_id": integration_id,
            "jira_project_id": jira_project.get("id"),
            "jira_project_key": project_key
        }
        
        # Insert project
        ins = supabase.table("projects").insert(project_data).execute()
        
        if not getattr(ins, "data", None):
            raise HTTPException(status_code=500, detail="Failed to create project")
        
        logger.info(f"✅ Created CogniSim project {project_key} from Jira")
        
        # Optional: Import issues
        issues_imported = 0
        if import_options.get("import_issues", False):
            try:
                max_issues = import_options.get("max_issues", 100)
                jql = f"project = {project_key} ORDER BY created DESC"
                search_result = await client.search_issues(jql, max_results=max_issues)
                issues = search_result.get("issues", [])
                
                # Sync issues using sync service
                sync_service = JiraSyncService(client, workspace_id, integration_id)
                result = await sync_service.sync_project_issues(
                    project_key=project_key,
                    project_id=project_id,
                    sync_type="manual"
                )
                issues_imported = result.get("items_created", 0) + result.get("items_updated", 0)
                
                logger.info(f"✅ Imported {issues_imported} issues from Jira project {project_key}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to import issues: {str(e)}")
        
        return {
            "success": True,
            "message": f"Successfully imported Jira project {project_key}",
            "data": {
                "project_id": project_id,
                "project_key": project_key,
                "project_name": jira_project.get("name"),
                "issues_imported": issues_imported,
                "jira_project_id": jira_project.get("id")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to import Jira project {project_key}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to import project: {str(e)}")
