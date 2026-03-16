"""
Jira Boards and Sprints Routes
Handles Agile board and sprint operations.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import Optional
import logging

from app.core.config import settings
from app.core.dependencies import get_workspace_context, WorkspaceContext, supabase
from app.services.jira import JiraAPIClient, JiraOAuthManager, JiraSyncService

# Initialize
logger = logging.getLogger("cognisim_ai")
router = APIRouter(prefix="/api/jira/boards", tags=["Jira Boards"])

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
    summary="Get All Boards",
    description="List all Scrum and Kanban boards"
)
async def get_boards(
    integration_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Get all boards from Jira."""
    workspace_id = str(ctx.workspace_id)
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        # Fetch boards
        boards = await client.get_boards()
        
        logger.info(f"Retrieved {len(boards)} boards")
        
        # Return direct data (frontend expects { boards: [...] })
        return {"boards": boards}
        
    except Exception as e:
        logger.error(f"Failed to get boards: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{integration_id}/{board_id}",
    summary="Get Board Details",
    description="Get details of a specific board"
)
async def get_board(
    integration_id: str,
    board_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Get board details by ID."""
    workspace_id = str(ctx.workspace_id)
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        # Fetch board
        board = await client.get_board(board_id)
        
        # Return board object directly
        return board
        
    except Exception as e:
        logger.error(f"Failed to get board {board_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{integration_id}/{board_id}/sprints",
    summary="Get Board Sprints",
    description="Get all sprints for a board, optionally filtered by state"
)
async def get_board_sprints(
    integration_id: str,
    board_id: str,
    state: Optional[str] = Query(None, description="Sprint state: active, future, or closed"),
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Get sprints for a board."""
    workspace_id = str(ctx.workspace_id)
    
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        # Fetch sprints
        sprints = await client.get_board_sprints(board_id, state)
        
        logger.info(f"Retrieved {len(sprints)} sprints for board {board_id}")
        
        # Return direct data (frontend expects { sprints: [...] })
        return {"sprints": sprints}
        
    except Exception as e:
        logger.error(f"Failed to get sprints: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{integration_id}/sprints/{sprint_id}",
    summary="Get Sprint Details",
    description="Get details of a specific sprint"
)
async def get_sprint(
    integration_id: str,
    sprint_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Get sprint details by ID."""
    workspace_id = str(ctx.workspace_id)
    
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        # Fetch sprint
        sprint = await client.get_sprint(sprint_id)
        
        # Return sprint object directly
        return sprint
        
    except Exception as e:
        logger.error(f"Failed to get sprint {sprint_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{integration_id}/sprints/{sprint_id}/issues",
    summary="Get Sprint Issues",
    description="Get all issues in a sprint"
)
async def get_sprint_issues(
    integration_id: str,
    sprint_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Get issues in a sprint."""
    workspace_id = str(ctx.workspace_id)
    
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        # Use JQL to fetch sprint issues
        jql = f"sprint = {sprint_id} ORDER BY rank"
        search_result = await client.search_issues(jql, max_results=100)
        issues = search_result.get("issues", [])
        
        logger.info(f"Retrieved {len(issues)} issues for sprint {sprint_id}")
        
        # Sync sprint using sync service
        sync_service = JiraSyncService(client, workspace_id, integration_id)
        try:
            await sync_service.sync_sprint(sprint_id)
            logger.info(f"✅ Synced sprint {sprint_id} issues to database")
        except Exception as sync_error:
            logger.warning(f"⚠️ Failed to sync sprint issues: {sync_error}")
        
        # Return direct data (frontend expects { issues: [...], total: X })
        return {"issues": issues, "total": len(issues)}
        
    except Exception as e:
        logger.error(f"Failed to get sprint issues: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{integration_id}/{board_id}/sprints",
    summary="Create Sprint",
    description="Create a new sprint on a board"
)
async def create_sprint(
    integration_id: str,
    board_id: str,
    sprint_data: dict = Body(...),
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Create a new sprint.
    
    Request body should include:
    - name: Sprint name
    - start_date: (optional) Sprint start date (ISO format)
    - end_date: (optional) Sprint end date (ISO format)
    - goal: (optional) Sprint goal
    """
    workspace_id = str(ctx.workspace_id)
    
    try:
        # Get authenticated client
        client = await get_authenticated_jira_client(integration_id, workspace_id)
        
        sprint_name = sprint_data.get("name")
        if not sprint_name:
            raise HTTPException(status_code=400, detail="Sprint name is required")
        
        # Prepare sprint payload
        sprint_payload = {
            "name": sprint_name,
            "originBoardId": int(board_id)
        }
        
        if sprint_data.get("start_date"):
            sprint_payload["startDate"] = sprint_data["start_date"]
        
        if sprint_data.get("end_date"):
            sprint_payload["endDate"] = sprint_data["end_date"]
        
        if sprint_data.get("goal"):
            sprint_payload["goal"] = sprint_data["goal"]
        
        # Create sprint
        created_sprint = await client.create_sprint(sprint_payload)
        sprint_id = created_sprint.get("id")
        
        logger.info(f"Created sprint {sprint_id}")
        
        # Keep success/message for actions (frontend expects this)
        return {
            "success": True,
            "message": f"Sprint {sprint_name} created successfully",
            "sprint": created_sprint
        }
        
    except Exception as e:
        logger.error(f"Failed to create sprint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
