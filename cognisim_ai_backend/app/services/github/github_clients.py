"""app/services/github/github_clients.py

HTTP clients for GitHub REST + GraphQL using GitHub App installation tokens.

- GitHub REST: https://api.github.com
- GitHub GraphQL: https://api.github.com/graphql

These clients are thin wrappers to keep API routes clean.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional, Literal

import httpx

from app.core.config import settings
from app.services.github.github_app_auth import get_github_app_auth

logger = logging.getLogger("cognisim_ai")


class GitHubAPIError(RuntimeError):
    pass


class GitHubRestClient:
    def __init__(self, installation_id: int, *, api_base_url: Optional[str] = None):
        self.installation_id = installation_id
        self.api_base_url = (api_base_url or str(settings.GITHUB_API_BASE_URL)).rstrip("/")
        self.max_retries = 3
        self.base_backoff_seconds = 0.5

    @staticmethod
    def _transient_status(status_code: int) -> bool:
        return status_code in (429, 500, 502, 503, 504)

    def _retry_delay_seconds(self, *, attempt: int, response: Optional[httpx.Response]) -> float:
        # Honor GitHub-provided retry hints first.
        if response is not None and response.status_code == 429:
            retry_after = response.headers.get("Retry-After")
            if retry_after:
                try:
                    return max(float(retry_after), 0.1)
                except Exception:
                    pass

            rl_reset = response.headers.get("X-RateLimit-Reset")
            if rl_reset:
                try:
                    wait = float(rl_reset) - float(time.time())
                    return max(wait, 0.1)
                except Exception:
                    pass

        # Exponential backoff with cap.
        return min(self.base_backoff_seconds * (2 ** (attempt - 1)), 8.0)

    async def _request(
        self,
        *,
        method: str,
        url: str,
        headers: Dict[str, str],
        json: Optional[Dict[str, Any]] = None,
        timeout_seconds: float = 30.0,
    ) -> httpx.Response:
        last_response: Optional[httpx.Response] = None
        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(timeout_seconds)) as client:
                    resp = await client.request(method=method, url=url, headers=headers, json=json)

                if resp.status_code < 400:
                    return resp

                last_response = resp
                if attempt < self.max_retries and self._transient_status(resp.status_code):
                    await asyncio.sleep(self._retry_delay_seconds(attempt=attempt, response=resp))
                    continue

                return resp
            except httpx.RequestError as e:
                last_error = e
                if attempt < self.max_retries:
                    await asyncio.sleep(self._retry_delay_seconds(attempt=attempt, response=None))
                    continue
                break

        if last_response is not None:
            return last_response
        raise GitHubAPIError(f"GitHub request failed after retries: {last_error}")

    async def _headers(self) -> Dict[str, str]:
        auth = get_github_app_auth()
        tok = await auth.get_installation_token(self.installation_id)
        return {
            "Authorization": f"token {tok.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def list_installation_repositories(self) -> List[Dict[str, Any]]:
        url = f"{self.api_base_url}/installation/repositories"
        headers = await self._headers()
        resp = await self._request(
            method="GET",
            url=url,
            headers=headers,
            timeout_seconds=20.0,
        )

        if resp.status_code >= 400:
            logger.error("GitHub list installation repos failed: %s %s", resp.status_code, resp.text)
            raise GitHubAPIError(f"Failed to list installation repositories (status={resp.status_code})")

        data = resp.json()
        repos = data.get("repositories") or []
        return list(repos)

    async def create_issue(
        self,
        *,
        owner: str,
        repo: str,
        title: str,
        body: Optional[str] = None,
        labels: Optional[List[str]] = None,
        assignees: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.api_base_url}/repos/{owner}/{repo}/issues"
        headers = await self._headers()
        payload: Dict[str, Any] = {"title": title}
        if body is not None:
            payload["body"] = body
        if labels:
            payload["labels"] = labels
        if assignees:
            payload["assignees"] = assignees

        resp = await self._request(
            method="POST",
            url=url,
            headers=headers,
            json=payload,
            timeout_seconds=30.0,
        )

        if resp.status_code >= 400:
            logger.error("GitHub create issue failed: %s %s", resp.status_code, resp.text)
            raise GitHubAPIError(f"Failed to create issue (status={resp.status_code})")
        return resp.json()

    async def update_issue(
        self,
        *,
        owner: str,
        repo: str,
        issue_number: int,
        title: Optional[str] = None,
        body: Optional[str] = None,
        state: Optional[Literal["open", "closed"]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.api_base_url}/repos/{owner}/{repo}/issues/{issue_number}"
        headers = await self._headers()
        payload: Dict[str, Any] = {}
        if title is not None:
            payload["title"] = title
        if body is not None:
            payload["body"] = body
        if state is not None:
            payload["state"] = state

        resp = await self._request(
            method="PATCH",
            url=url,
            headers=headers,
            json=payload,
            timeout_seconds=30.0,
        )

        if resp.status_code >= 400:
            logger.error("GitHub update issue failed: %s %s", resp.status_code, resp.text)
            raise GitHubAPIError(f"Failed to update issue (status={resp.status_code})")
        return resp.json()


OwnerType = Literal["org", "user"]


class GitHubGraphQLClient:
    def __init__(self, installation_id: int, *, graphql_url: Optional[str] = None):
        self.installation_id = installation_id
        self.graphql_url = str(graphql_url or settings.GITHUB_GRAPHQL_URL)
        self.max_retries = 3
        self.base_backoff_seconds = 0.5

    @staticmethod
    def _transient_status(status_code: int) -> bool:
        return status_code in (429, 500, 502, 503, 504)

    def _retry_delay_seconds(self, *, attempt: int, response: Optional[httpx.Response]) -> float:
        if response is not None and response.status_code == 429:
            retry_after = response.headers.get("Retry-After")
            if retry_after:
                try:
                    return max(float(retry_after), 0.1)
                except Exception:
                    pass
            rl_reset = response.headers.get("X-RateLimit-Reset")
            if rl_reset:
                try:
                    wait = float(rl_reset) - float(time.time())
                    return max(wait, 0.1)
                except Exception:
                    pass
        return min(self.base_backoff_seconds * (2 ** (attempt - 1)), 8.0)

    async def _post_graphql(self, payload: Dict[str, Any], headers: Dict[str, str]) -> httpx.Response:
        last_response: Optional[httpx.Response] = None
        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
                    resp = await client.post(self.graphql_url, headers=headers, json=payload)

                if resp.status_code < 400:
                    return resp

                last_response = resp
                if attempt < self.max_retries and self._transient_status(resp.status_code):
                    await asyncio.sleep(self._retry_delay_seconds(attempt=attempt, response=resp))
                    continue

                return resp
            except httpx.RequestError as e:
                last_error = e
                if attempt < self.max_retries:
                    await asyncio.sleep(self._retry_delay_seconds(attempt=attempt, response=None))
                    continue
                break

        if last_response is not None:
            return last_response
        raise GitHubAPIError(f"GitHub GraphQL request failed after retries: {last_error}")

    async def _headers(self) -> Dict[str, str]:
        auth = get_github_app_auth()
        tok = await auth.get_installation_token(self.installation_id)
        return {
            "Authorization": f"bearer {tok.token}",
            "Accept": "application/vnd.github+json",
        }

    async def query(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        headers = await self._headers()
        payload: Dict[str, Any] = {"query": query, "variables": variables or {}}
        resp = await self._post_graphql(payload=payload, headers=headers)

        if resp.status_code >= 400:
            logger.error("GitHub GraphQL HTTP error: %s %s", resp.status_code, resp.text)
            raise GitHubAPIError(f"GitHub GraphQL request failed (status={resp.status_code})")

        data = resp.json()
        if "errors" in data and data["errors"]:
            raise GitHubAPIError(f"GitHub GraphQL errors: {data['errors']}")
        return data.get("data") or {}

    async def list_projects_v2(self, *, owner_login: str, owner_type: OwnerType, first: int = 50) -> List[Dict[str, Any]]:
        if owner_type == "org":
            query = """
            query($login: String!, $first: Int!) {
              organization(login: $login) {
                projectsV2(first: $first) {
                  nodes {
                    id
                    number
                    title
                    url
                    closed
                  }
                }
              }
            }
            """
            data = await self.query(query, {"login": owner_login, "first": first})
            org = data.get("organization") or {}
            nodes = ((org.get("projectsV2") or {}).get("nodes")) or []
            return list(nodes)

        query = """
        query($login: String!, $first: Int!) {
          user(login: $login) {
            projectsV2(first: $first) {
              nodes {
                id
                number
                title
                url
                closed
              }
            }
          }
        }
        """
        data = await self.query(query, {"login": owner_login, "first": first})
        user = data.get("user") or {}
        nodes = ((user.get("projectsV2") or {}).get("nodes")) or []
        return list(nodes)

    # -----------------------------------------------------------------------
    # Projects v2 — field definitions, item CRUD, field value mutations
    # -----------------------------------------------------------------------

    async def get_project_v2_fields(self, project_node_id: str) -> List[Dict[str, Any]]:
        """Fetch field definitions for a Projects v2 board.

        Returns a list of field dicts with keys: id, name, dataType,
        and options (for SINGLE_SELECT fields).
        """
        query = """
        query($projectId: ID!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              fields(first: 50) {
                nodes {
                  ... on ProjectV2Field {
                    id
                    name
                    dataType
                  }
                  ... on ProjectV2IterationField {
                    id
                    name
                    dataType
                    configuration {
                      iterations {
                        id
                        title
                        startDate
                        duration
                      }
                    }
                  }
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    dataType
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
        """
        data = await self.query(query, {"projectId": project_node_id})
        node = data.get("node") or {}
        fields = (node.get("fields") or {}).get("nodes") or []
        return list(fields)

    async def list_project_v2_items(
        self,
        project_node_id: str,
        *,
        first: int = 50,
        after: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Paginated cursor-based listing of project items with field values.

        Returns ``{"items": [...], "pageInfo": {...}}`` where each item
        contains ``id``, ``content`` (issue/PR node), and ``fieldValues``.
        """
        query = """
        query($projectId: ID!, $first: Int!, $after: String) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: $first, after: $after) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  content {
                    ... on Issue {
                      id
                      number
                      title
                      url
                      repository {
                        nameWithOwner
                      }
                    }
                    ... on PullRequest {
                      id
                      number
                      title
                      url
                    }
                  }
                  fieldValues(first: 20) {
                    nodes {
                      ... on ProjectV2ItemFieldTextValue {
                        text
                        field { ... on ProjectV2Field { id name } }
                      }
                      ... on ProjectV2ItemFieldNumberValue {
                        number
                        field { ... on ProjectV2Field { id name } }
                      }
                      ... on ProjectV2ItemFieldDateValue {
                        date
                        field { ... on ProjectV2Field { id name } }
                      }
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        optionId
                        field { ... on ProjectV2SingleSelectField { id name } }
                      }
                      ... on ProjectV2ItemFieldIterationValue {
                        title
                        iterationId
                        field { ... on ProjectV2IterationField { id name } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """
        variables: Dict[str, Any] = {"projectId": project_node_id, "first": first}
        if after:
            variables["after"] = after

        data = await self.query(query, variables)
        node = data.get("node") or {}
        items_data = node.get("items") or {}
        nodes = items_data.get("nodes") or []
        page_info = items_data.get("pageInfo") or {}
        return {"items": list(nodes), "pageInfo": page_info}

    async def add_item_to_project_v2(
        self, project_node_id: str, content_node_id: str
    ) -> str:
        """Add an issue/PR to a Projects v2 board via ``addProjectV2ItemById``.

        Returns the created item's node ID.
        """
        mutation = """
        mutation($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
            item {
              id
            }
          }
        }
        """
        data = await self.query(mutation, {"projectId": project_node_id, "contentId": content_node_id})
        item = (data.get("addProjectV2ItemById") or {}).get("item") or {}
        item_id = item.get("id")
        if not item_id:
            raise GitHubAPIError("addProjectV2ItemById returned no item ID")
        return str(item_id)

    async def update_project_v2_item_field(
        self,
        project_node_id: str,
        item_node_id: str,
        field_node_id: str,
        value: Dict[str, Any],
    ) -> None:
        """Update a single field value on a Projects v2 item.

        ``value`` is the GraphQL ``ProjectV2FieldValue`` input, e.g.:
        - ``{"text": "hello"}``
        - ``{"number": 5}``
        - ``{"singleSelectOptionId": "<option-node-id>"}``
        - ``{"iterationId": "<iteration-node-id>"}``
        - ``{"date": "2026-03-01"}``
        """
        mutation = """
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: $value
          }) {
            projectV2Item {
              id
            }
          }
        }
        """
        await self.query(mutation, {
            "projectId": project_node_id,
            "itemId": item_node_id,
            "fieldId": field_node_id,
            "value": value,
        })

    async def remove_item_from_project_v2(
        self, project_node_id: str, item_node_id: str
    ) -> None:
        """Remove an item from a Projects v2 board via ``deleteProjectV2Item``."""
        mutation = """
        mutation($projectId: ID!, $itemId: ID!) {
          deleteProjectV2Item(input: {projectId: $projectId, itemId: $itemId}) {
            deletedItemId
          }
        }
        """
        await self.query(mutation, {"projectId": project_node_id, "itemId": item_node_id})
