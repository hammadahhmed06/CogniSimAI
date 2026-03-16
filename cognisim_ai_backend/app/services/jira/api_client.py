"""
Jira Cloud REST API Client
Provides comprehensive methods for interacting with Jira Cloud API v3.
"""

import httpx
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class JiraAPIClient:
    """
    Authenticated Jira Cloud API client.
    Uses OAuth 2.0 access token and cloud_id to make API calls.
    """

    def __init__(self, access_token: str, cloud_id: str):
        """
        Initialize Jira API client.
        
        Args:
            access_token: OAuth 2.0 access token
            cloud_id: Atlassian cloud_id (site identifier)
        """
        self.access_token = access_token
        self.cloud_id = cloud_id
        self.base_url = f"https://api.atlassian.com/ex/jira/{cloud_id}"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None,
        timeout: float = 30.0
    ) -> Dict:
        """
        Make authenticated request to Jira API.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (without base_url)
            params: Query parameters
            json: JSON body
            timeout: Request timeout in seconds
            
        Returns:
            JSON response as dictionary
            
        Raises:
            httpx.HTTPStatusError: On HTTP errors
        """
        url = f"{self.base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.request(
                method=method,
                url=url,
                headers=self.headers,
                params=params,
                json=json
            )
            response.raise_for_status()
            
            # Some endpoints return empty responses (e.g., DELETE)
            if response.status_code == 204:
                return {"success": True}
                
            return response.json()

    # ==================== Project Methods ====================

    async def get_projects(self, expand: Optional[List[str]] = None) -> List[Dict]:
        """
        Get all accessible projects.
        
        Args:
            expand: Fields to expand (e.g., ['description', 'lead', 'issueTypes'])
            
        Returns:
            List of project dictionaries
        """
        params = {}
        if expand:
            params["expand"] = ",".join(expand)
            
        response = await self._request("GET", "/rest/api/3/project", params=params)
        return response if isinstance(response, list) else []

    async def get_project(self, project_key: str, expand: Optional[List[str]] = None) -> Dict:
        """
        Get project by key or ID.
        
        Args:
            project_key: Project key (e.g., 'PROJ') or ID
            expand: Fields to expand
            
        Returns:
            Project dictionary
        """
        params = {}
        if expand:
            params["expand"] = ",".join(expand)
            
        return await self._request("GET", f"/rest/api/3/project/{project_key}", params=params)

    async def get_project_statuses(self, project_key: str) -> List[Dict]:
        """
        Get all statuses available in a project.
        
        Args:
            project_key: Project key or ID
            
        Returns:
            List of status dictionaries grouped by issue type
        """
        result = await self._request("GET", f"/rest/api/3/project/{project_key}/statuses")
        return result if isinstance(result, list) else []

    # ==================== Issue Methods ====================

    async def search_issues(
        self,
        jql: str,
        start_at: int = 0,
        max_results: int = 50,
        fields: Optional[List[str]] = None,
        expand: Optional[List[str]] = None
    ) -> Dict:
        """
        Search for issues using JQL (Jira Query Language).
        Uses the new /rest/api/3/search/jql endpoint (POST method).
        
        Note: The old /rest/api/3/search endpoint was deprecated and removed by Atlassian.
        
        Args:
            jql: JQL query string
            start_at: Pagination offset (note: new API uses nextPageToken for pagination)
            max_results: Maximum results per page (max 100)
            fields: Fields to return (default: all)
            expand: Fields to expand
            
        Returns:
            Dictionary with 'issues', 'total', 'startAt', 'maxResults' (normalized response)
        """
        # Build request body for new API
        request_body = {
            "jql": jql,
            "maxResults": min(max_results, 100),
            "fields": fields if fields else ["*all"]
        }
        
        # Add expand if specified
        if expand:
            request_body["expand"] = expand
        
        # Note: New API uses cursor-based pagination (nextPageToken)
        # For backwards compatibility, we'll use startAt in the URL if provided
        params = {}
        if start_at > 0:
            params["startAt"] = start_at
            
        try:
            # Try new endpoint first (POST /rest/api/3/search/jql)
            result = await self._request("POST", "/rest/api/3/search/jql", json=request_body, params=params if params else None)
            
            # Normalize response to match old format
            # New API returns 'issues' array directly, may have 'nextPageToken' for pagination
            if "issues" not in result:
                result["issues"] = []
            if "total" not in result:
                result["total"] = len(result.get("issues", []))
            if "startAt" not in result:
                result["startAt"] = start_at
            if "maxResults" not in result:
                result["maxResults"] = max_results
                
            return result
            
        except Exception as e:
            # If new endpoint fails, log and re-raise
            logger.error(f"Search failed with new /search/jql endpoint: {e}")
            raise

    async def get_issue(
        self,
        issue_key: str,
        fields: Optional[List[str]] = None,
        expand: Optional[List[str]] = None
    ) -> Dict:
        """
        Get issue by key or ID.
        
        Args:
            issue_key: Issue key (e.g., 'PROJ-123') or ID
            fields: Fields to return
            expand: Fields to expand (e.g., ['changelog', 'renderedFields'])
            
        Returns:
            Issue dictionary
        """
        params = {}
        if fields:
            params["fields"] = ",".join(fields)
        if expand:
            params["expand"] = ",".join(expand)
            
        return await self._request("GET", f"/rest/api/3/issue/{issue_key}", params=params)

    async def create_issue(self, issue_data: Dict) -> Dict:
        """
        Create a new issue.
        
        Args:
            issue_data: Issue creation payload following Jira schema
                Example:
                {
                    "fields": {
                        "project": {"key": "PROJ"},
                        "summary": "Issue title",
                        "description": {...},  # Atlassian Document Format
                        "issuetype": {"name": "Story"},
                        "priority": {"name": "Medium"},
                        "customfield_10016": "PROJ-123"  # Epic link example
                    }
                }
                
        Returns:
            Created issue with 'id', 'key', 'self'
        """
        return await self._request("POST", "/rest/api/3/issue", json=issue_data)

    async def update_issue(self, issue_key: str, update_data: Dict) -> Dict:
        """
        Update an existing issue.
        
        Args:
            issue_key: Issue key or ID
            update_data: Update payload with 'fields' or 'update' objects
                Example:
                {
                    "fields": {
                        "summary": "Updated title",
                        "description": {...}
                    }
                }
                
        Returns:
            Success response
        """
        return await self._request("PUT", f"/rest/api/3/issue/{issue_key}", json=update_data)

    async def delete_issue(self, issue_key: str, delete_subtasks: bool = False) -> Dict:
        """
        Delete an issue.
        
        Args:
            issue_key: Issue key or ID
            delete_subtasks: Whether to delete subtasks
            
        Returns:
            Success response
        """
        params = {"deleteSubtasks": str(delete_subtasks).lower()}
        return await self._request("DELETE", f"/rest/api/3/issue/{issue_key}", params=params)

    async def get_issue_transitions(self, issue_key: str) -> List[Dict]:
        """
        Get available transitions for an issue.
        
        Args:
            issue_key: Issue key or ID
            
        Returns:
            List of transition dictionaries
        """
        response = await self._request("GET", f"/rest/api/3/issue/{issue_key}/transitions")
        return response.get("transitions", [])

    async def transition_issue(self, issue_key: str, transition_id: str, fields: Optional[Dict] = None) -> Dict:
        """
        Transition an issue to a new status.
        
        Args:
            issue_key: Issue key or ID
            transition_id: ID of the transition to execute
            fields: Optional fields to update during transition
            
        Returns:
            Success response
        """
        payload = {"transition": {"id": transition_id}}
        if fields:
            payload["fields"] = fields
            
        return await self._request("POST", f"/rest/api/3/issue/{issue_key}/transitions", json=payload)

    async def add_comment(self, issue_key: str, comment_body: str) -> Dict:
        """
        Add a comment to an issue.
        
        Args:
            issue_key: Issue key or ID
            comment_body: Comment text (plain text will be converted to ADF)
            
        Returns:
            Created comment dictionary
        """
        # Convert plain text to Atlassian Document Format
        adf_body = {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": comment_body
                        }
                    ]
                }
            ]
        }
        
        payload = {"body": adf_body}
        return await self._request("POST", f"/rest/api/3/issue/{issue_key}/comment", json=payload)

    # ==================== Board & Sprint Methods ====================

    async def get_boards(self, start_at: int = 0, max_results: int = 50, project_key: Optional[str] = None) -> Dict:
        """
        Get all boards accessible to the user.
        
        Args:
            start_at: Pagination offset
            max_results: Maximum results per page
            project_key: Filter by project key
            
        Returns:
            Dictionary with 'values', 'startAt', 'maxResults', 'total'
        """
        params: Dict[str, Any] = {
            "startAt": start_at,
            "maxResults": max_results
        }
        if project_key:
            params["projectKeyOrId"] = project_key
            
        return await self._request("GET", "/rest/agile/1.0/board", params=params)

    async def get_board(self, board_id: int) -> Dict:
        """
        Get board by ID.
        
        Args:
            board_id: Board ID
            
        Returns:
            Board dictionary
        """
        return await self._request("GET", f"/rest/agile/1.0/board/{board_id}")

    async def get_board_sprints(
        self,
        board_id: int,
        start_at: int = 0,
        max_results: int = 50,
        state: Optional[str] = None
    ) -> Dict:
        """
        Get sprints for a board.
        
        Args:
            board_id: Board ID
            start_at: Pagination offset
            max_results: Maximum results per page
            state: Filter by state ('active', 'future', 'closed')
            
        Returns:
            Dictionary with 'values', 'startAt', 'maxResults', 'isLast'
        """
        params: Dict[str, Any] = {
            "startAt": start_at,
            "maxResults": max_results
        }
        if state:
            params["state"] = state
            
        return await self._request("GET", f"/rest/agile/1.0/board/{board_id}/sprint", params=params)

    async def get_sprint(self, sprint_id: int) -> Dict:
        """
        Get sprint by ID.
        
        Args:
            sprint_id: Sprint ID
            
        Returns:
            Sprint dictionary
        """
        return await self._request("GET", f"/rest/agile/1.0/sprint/{sprint_id}")

    async def get_sprint_issues(
        self,
        sprint_id: int,
        start_at: int = 0,
        max_results: int = 50,
        jql: Optional[str] = None
    ) -> Dict:
        """
        Get issues in a sprint.
        
        Args:
            sprint_id: Sprint ID
            start_at: Pagination offset
            max_results: Maximum results per page
            jql: Additional JQL filter
            
        Returns:
            Dictionary with 'issues', 'startAt', 'maxResults', 'total'
        """
        params: Dict[str, Any] = {
            "startAt": start_at,
            "maxResults": max_results
        }
        if jql:
            params["jql"] = jql
            
        return await self._request("GET", f"/rest/agile/1.0/sprint/{sprint_id}/issue", params=params)

    async def create_sprint(self, board_id: int, sprint_data: Dict) -> Dict:
        """
        Create a new sprint.
        
        Args:
            board_id: Board ID
            sprint_data: Sprint creation payload
                Example:
                {
                    "name": "Sprint 1",
                    "startDate": "2024-01-01T00:00:00.000Z",
                    "endDate": "2024-01-14T23:59:59.999Z",
                    "originBoardId": 1
                }
                
        Returns:
            Created sprint dictionary
        """
        return await self._request("POST", "/rest/agile/1.0/sprint", json=sprint_data)

    # ==================== Metadata Methods ====================

    async def get_issue_types(self, project_key: Optional[str] = None) -> List[Dict]:
        """
        Get issue types.
        
        Args:
            project_key: Filter by project (returns project-specific issue types)
            
        Returns:
            List of issue type dictionaries
        """
        if project_key:
            project = await self.get_project(project_key, expand=["issueTypes"])
            return project.get("issueTypes", [])
        else:
            result = await self._request("GET", "/rest/api/3/issuetype")
            return result if isinstance(result, list) else []

    async def get_priorities(self) -> List[Dict]:
        """
        Get all priorities.
        
        Returns:
            List of priority dictionaries
        """
        result = await self._request("GET", "/rest/api/3/priority")
        return result if isinstance(result, list) else []

    async def get_assignable_users(
        self,
        project_key: str,
        start_at: int = 0,
        max_results: int = 50
    ) -> List[Dict]:
        """
        Get users assignable to issues in a project.
        
        Args:
            project_key: Project key
            start_at: Pagination offset
            max_results: Maximum results per page
            
        Returns:
            List of user dictionaries
        """
        params: Dict[str, Any] = {
            "project": project_key,
            "startAt": start_at,
            "maxResults": max_results
        }
        result = await self._request("GET", "/rest/api/3/user/assignable/search", params=params)
        return result if isinstance(result, list) else []

    async def get_create_metadata(
        self,
        project_keys: Optional[List[str]] = None,
        issue_type_names: Optional[List[str]] = None,
        expand: Optional[str] = None
    ) -> Dict:
        """
        Get metadata required to create issues (fields, required fields, etc.).
        
        Args:
            project_keys: Filter by project keys
            issue_type_names: Filter by issue type names
            expand: Fields to expand (e.g., 'projects.issuetypes.fields')
            
        Returns:
            Create metadata dictionary
        """
        params = {}
        if project_keys:
            params["projectKeys"] = ",".join(project_keys)
        if issue_type_names:
            params["issuetypeNames"] = ",".join(issue_type_names)
        if expand:
            params["expand"] = expand
            
        return await self._request("GET", "/rest/api/3/issue/createmeta", params=params)

    # ==================== Webhook Methods ====================

    async def create_webhook(self, webhook_data: Dict) -> Dict:
        """
        Create a new webhook using Jira Cloud REST API v3.
        
        Args:
            webhook_data: Webhook configuration
                Example:
                {
                    "webhooks": [{
                        "jqlFilter": "project = PROJ",
                        "events": [
                            "jira:issue_created",
                            "jira:issue_updated",
                            "jira:issue_deleted"
                        ]
                    }],
                    "url": "https://your-app.com/api/jira/webhooks/receive"
                }
                
        Returns:
            Created webhook response
        """
        return await self._request("POST", "/rest/api/3/webhook", json=webhook_data)

    async def get_webhooks(self, start_at: int = 0, max_results: int = 50) -> Dict:
        """
        Get all webhooks registered by this app using REST API v3.
        
        Args:
            start_at: Pagination offset
            max_results: Max results per page
            
        Returns:
            Dictionary with 'values' containing webhook list
        """
        params = {
            "startAt": start_at,
            "maxResults": max_results
        }
        return await self._request("GET", "/rest/api/3/webhook", params=params)

    async def delete_webhook(self, webhook_id: str) -> Dict:
        """
        Delete a webhook using REST API v3.
        
        Args:
            webhook_id: Webhook ID to delete
            
        Returns:
            Success response
        """
        # REST API v3 uses DELETE with body containing webhook IDs
        payload = {
            "webhookIds": [int(webhook_id)]
        }
        return await self._request("DELETE", "/rest/api/3/webhook", json=payload)

    # ==================== Utility Methods ====================

    async def get_server_info(self) -> Dict:
        """
        Get Jira server information.
        
        Returns:
            Server info including version, build number, etc.
        """
        return await self._request("GET", "/rest/api/3/serverInfo")

    async def get_myself(self) -> Dict:
        """
        Get current user information.
        
        Returns:
            User dictionary
        """
        return await self._request("GET", "/rest/api/3/myself")

    def convert_text_to_adf(self, text: str) -> Dict:
        """
        Convert plain text to Atlassian Document Format (ADF).
        
        Args:
            text: Plain text string
            
        Returns:
            ADF document structure
        """
        paragraphs = text.split("\n\n")
        content = []
        
        for para in paragraphs:
            if para.strip():
                # Handle line breaks within paragraph
                lines = para.split("\n")
                paragraph_content = []
                
                for i, line in enumerate(lines):
                    if line.strip():
                        paragraph_content.append({
                            "type": "text",
                            "text": line
                        })
                        if i < len(lines) - 1:
                            paragraph_content.append({"type": "hardBreak"})
                
                if paragraph_content:
                    content.append({
                        "type": "paragraph",
                        "content": paragraph_content
                    })
        
        return {
            "type": "doc",
            "version": 1,
            "content": content if content else [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": text}]
                }
            ]
        }
