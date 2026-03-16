"""
Jira Issues API Routes
Endpoints for managing Jira issues - list, get, create, update, transition, push to Jira.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.dependencies import get_workspace_context, WorkspaceContext
from app.core.config import settings
from app.services.jira.token_manager import JiraOAuthManager
from app.services.jira.api_client import JiraAPIClient
from app.services.jira.sync_service import JiraSyncService

router = APIRouter(prefix="/api/jira/issues", tags=["jira-issues"])
oauth_manager = JiraOAuthManager(
    client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
    client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value() if settings.JIRA_OAUTH_CLIENT_SECRET else "")
)


class IssueSearchRequest(BaseModel):
    jql: str = Field(..., description="JQL query string")
    max_results: int = Field(50, ge=1, le=100, description="Maximum results")
    start_at: int = Field(0, ge=0, description="Pagination offset")
    fields: Optional[List[str]] = Field(None, description="Fields to return")


class IssueCreateRequest(BaseModel):
    project_key: str = Field(..., description="Jira project key")
    summary: str = Field(..., description="Issue title/summary")
    description: str = Field("", description="Issue description")
    issue_type: str = Field("Task", description="Issue type (Epic, Story, Task, Bug, Sub-task)")
    priority: Optional[str] = Field(None, description="Priority (Highest, High, Medium, Low, Lowest)")
    epic_link: Optional[str] = Field(None, description="Epic key to link to")
    labels: Optional[List[str]] = Field(None, description="Issue labels")
    assignee_id: Optional[str] = Field(None, description="Assignee account ID")


class IssueUpdateRequest(BaseModel):
    summary: Optional[str] = Field(None, description="Updated title/summary")
    description: Optional[str] = Field(None, description="Updated description")
    priority: Optional[str] = Field(None, description="Updated priority")
    labels: Optional[List[str]] = Field(None, description="Updated labels")


class IssueTransitionRequest(BaseModel):
    transition_id: str = Field(..., description="Transition ID to execute")
    comment: Optional[str] = Field(None, description="Optional comment to add")


class PushToJiraRequest(BaseModel):
    issue_ids: List[str] = Field(..., description="Local issue IDs to push to Jira")
    epic_key: Optional[str] = Field(None, description="Epic key to link stories to")


async def get_authenticated_jira_client(
    integration_id: str,
    workspace_id: str
) -> JiraAPIClient:
    """Helper to get authenticated Jira client."""
    access_token, cloud_id = await oauth_manager.ensure_valid_token(integration_id, workspace_id)
    return JiraAPIClient(access_token, cloud_id)


async def get_jira_sync_service(
    integration_id: str,
    workspace_id: str
) -> JiraSyncService:
    """Helper to get Jira sync service."""
    access_token, cloud_id = await oauth_manager.ensure_valid_token(integration_id, workspace_id)
    client = JiraAPIClient(access_token, cloud_id)
    return JiraSyncService(client, workspace_id, integration_id)


@router.post("/{integration_id}/search")
async def search_issues(
    integration_id: str,
    request: IssueSearchRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Search for issues using JQL (Jira Query Language).
    
    Example JQL queries:
    - "project = PROJ AND type = Story"
    - "assignee = currentUser() AND status != Done"
    - "updated >= -7d ORDER BY updated DESC"
    """
    client = await get_authenticated_jira_client(integration_id, str(ctx.workspace_id))
    
    result = await client.search_issues(
        jql=request.jql,
        start_at=request.start_at,
        max_results=request.max_results,
        fields=request.fields
    )
    
    return {
        "success": True,
        "issues": result.get("issues", []),
        "total": result.get("total", 0),
        "start_at": result.get("startAt", 0),
        "max_results": result.get("maxResults", 0)
    }


@router.get("/{integration_id}/{issue_key}")
async def get_issue(
    integration_id: str,
    issue_key: str,
    ctx: WorkspaceContext = Depends(get_workspace_context),
    fields: Optional[str] = Query(None, description="Comma-separated fields to return"),
    expand: Optional[str] = Query(None, description="Comma-separated fields to expand")
):
    """
    Get issue by key or ID.
    
    Example: /jira/issues/{integration_id}/PROJ-123
    """
    client = await get_authenticated_jira_client(integration_id, str(ctx.workspace_id))
    
    fields_list = fields.split(",") if fields else None
    expand_list = expand.split(",") if expand else None
    
    issue = await client.get_issue(issue_key, fields=fields_list, expand=expand_list)
    
    return {
        "success": True,
        "issue": issue
    }


@router.post("/{integration_id}/create")
async def create_issue(
    integration_id: str,
    request: IssueCreateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Create a new issue in Jira.
    
    Creates an issue with the specified fields and returns the created issue key.
    """
    client = await get_authenticated_jira_client(integration_id, str(ctx.workspace_id))
    
    # Convert description to ADF
    description_adf = client.convert_text_to_adf(request.description)
    
    # Build issue data
    issue_data = {
        "fields": {
            "project": {"key": request.project_key},
            "summary": request.summary,
            "description": description_adf,
            "issuetype": {"name": request.issue_type}
        }
    }
    
    # Add optional fields
    if request.priority:
        issue_data["fields"]["priority"] = {"name": request.priority}
    
    if request.epic_link:
        issue_data["fields"]["customfield_10016"] = request.epic_link
    
    if request.labels:
        issue_data["fields"]["labels"] = request.labels
    
    if request.assignee_id:
        issue_data["fields"]["assignee"] = {"id": request.assignee_id}
    
    # Create issue
    result = await client.create_issue(issue_data)
    
    return {
        "success": True,
        "issue_key": result["key"],
        "issue_id": result["id"],
        "self": result["self"]
    }


@router.put("/{integration_id}/{issue_key}")
async def update_issue(
    integration_id: str,
    issue_key: str,
    request: IssueUpdateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Update an existing issue in Jira.
    
    Updates the specified fields of an issue.
    """
    client = await get_authenticated_jira_client(integration_id, str(ctx.workspace_id))
    
    # Build update data
    fields = {}
    
    if request.summary is not None:
        fields["summary"] = request.summary
    
    if request.description is not None:
        fields["description"] = client.convert_text_to_adf(request.description)
    
    if request.priority is not None:
        fields["priority"] = {"name": request.priority}
    
    if request.labels is not None:
        fields["labels"] = request.labels
    
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Update issue
    await client.update_issue(issue_key, {"fields": fields})
    
    return {
        "success": True,
        "message": f"Issue {issue_key} updated successfully"
    }


@router.delete("/{integration_id}/{issue_key}")
async def delete_issue(
    integration_id: str,
    issue_key: str,
    ctx: WorkspaceContext = Depends(get_workspace_context),
    delete_subtasks: bool = Query(False, description="Whether to delete subtasks")
):
    """
    Delete an issue from Jira.
    
    Permanently deletes an issue. Use with caution.
    """
    client = await get_authenticated_jira_client(integration_id, str(ctx.workspace_id))
    
    await client.delete_issue(issue_key, delete_subtasks=delete_subtasks)
    
    return {
        "success": True,
        "message": f"Issue {issue_key} deleted successfully"
    }


@router.get("/{integration_id}/{issue_key}/transitions")
async def get_issue_transitions(
    integration_id: str,
    issue_key: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Get available transitions for an issue.
    
    Returns list of transitions that can be executed on the issue.
    """
    client = await get_authenticated_jira_client(integration_id, str(ctx.workspace_id))
    
    transitions = await client.get_issue_transitions(issue_key)
    
    return {
        "success": True,
        "transitions": transitions
    }


@router.post("/{integration_id}/{issue_key}/transition")
async def transition_issue(
    integration_id: str,
    issue_key: str,
    request: IssueTransitionRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Transition an issue to a new status.
    
    Executes a workflow transition (e.g., move from "To Do" to "In Progress").
    """
    client = await get_authenticated_jira_client(integration_id, str(ctx.workspace_id))
    
    # Execute transition
    await client.transition_issue(issue_key, request.transition_id)
    
    # Add comment if provided
    if request.comment:
        await client.add_comment(issue_key, request.comment)
    
    return {
        "success": True,
        "message": f"Issue {issue_key} transitioned successfully"
    }


@router.post("/{integration_id}/{issue_key}/comment")
async def add_comment(
    integration_id: str,
    issue_key: str,
    comment: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Add a comment to an issue.
    
    Adds a comment with the specified text to the issue.
    """
    client = await get_authenticated_jira_client(integration_id, str(ctx.workspace_id))
    
    result = await client.add_comment(issue_key, comment)
    
    return {
        "success": True,
        "comment_id": result.get("id"),
        "message": "Comment added successfully"
    }


@router.post("/{integration_id}/push")
async def push_to_jira(
    integration_id: str,
    request: PushToJiraRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Push local issues to Jira.
    
    Creates issues in Jira from local database records.
    Useful for pushing AI-generated stories to Jira.
    """
    sync_service = await get_jira_sync_service(integration_id, str(ctx.workspace_id))
    
    result = await sync_service.push_multiple_issues_to_jira(
        issue_ids=request.issue_ids,
        link_to_epic=request.epic_key
    )
    
    return {
        "success": result["success"],
        "created_count": result["created_count"],
        "failed_count": result["failed_count"],
        "results": result["results"],
        "failed": result["failed"]
    }


@router.post("/{integration_id}/push/{issue_id}")
async def push_single_issue_to_jira(
    integration_id: str,
    issue_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Push a single local issue to Jira.
    
    Creates or updates an issue in Jira from local database record.
    """
    sync_service = await get_jira_sync_service(integration_id, str(ctx.workspace_id))
    
    result = await sync_service.push_issue_to_jira(issue_id, create_in_jira=True)
    
    return result
