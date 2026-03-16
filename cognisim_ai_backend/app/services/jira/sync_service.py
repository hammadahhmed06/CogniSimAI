"""
Jira Synchronization Service
Handles bidirectional sync between Jira and local database.
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from uuid import UUID, uuid4
import asyncio

from app.services.jira.api_client import JiraAPIClient
from app.core.dependencies import supabase

logger = logging.getLogger(__name__)


class JiraSyncService:
    """
    Service for synchronizing Jira data with local database.
    Supports incremental sync, full sync, and webhook-triggered sync.
    """

    def __init__(self, jira_client: JiraAPIClient, workspace_id: str, integration_id: str):
        """
        Initialize sync service.
        
        Args:
            jira_client: Authenticated Jira API client
            workspace_id: Workspace UUID
            integration_id: Integration credentials UUID
        """
        self.jira_client = jira_client
        self.workspace_id = workspace_id
        self.integration_id = integration_id
        self.supabase = supabase

    async def _create_sync_job(
        self,
        sync_type: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> str:
        """
        Create a sync job record.
        
        Args:
            sync_type: Type of sync ('manual', 'auto', 'initial', 'webhook')
            resource_type: Resource being synced ('project', 'sprint', 'issues', etc.)
            resource_id: Optional resource identifier
            metadata: Optional sync metadata
            
        Returns:
            Sync job ID
        """
        job_data = {
            "workspace_id": self.workspace_id,
            "integration_id": self.integration_id,
            "sync_type": sync_type,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "status": "in_progress",
            "sync_metadata": metadata or {}
        }
        
        result = self.supabase.table("jira_sync_jobs").insert(job_data).execute()
        return result.data[0]["id"]

    async def _update_sync_job(
        self,
        job_id: str,
        status: str,
        items_processed: int = 0,
        items_created: int = 0,
        items_updated: int = 0,
        items_failed: int = 0,
        error_message: Optional[str] = None
    ):
        """Update sync job with results."""
        update_data = {
            "status": status,
            "items_processed": items_processed,
            "items_created": items_created,
            "items_updated": items_updated,
            "items_failed": items_failed,
            "completed_at": datetime.utcnow().isoformat()
        }
        
        if error_message:
            update_data["error_message"] = error_message
            
        self.supabase.table("jira_sync_jobs").update(update_data).eq("id", job_id).execute()

    async def _upsert_integration_mapping(
        self,
        item_id: str,
        external_item_id: str,
        external_url: str
    ):
        """
        Create or update integration mapping for bidirectional sync.
        
        Args:
            item_id: Local item UUID (e.g., issue_id)
            external_item_id: External system ID (e.g., "PROJ-123")
            external_url: Direct link to external item
        """
        # Check if mapping exists
        existing = self.supabase.table("integration_mapping")\
            .select("id")\
            .eq("item_id", item_id)\
            .eq("external_system", "jira")\
            .execute()
        
        mapping_data = {
            "item_id": item_id,
            "external_system": "jira",
            "external_item_id": external_item_id,
            "external_url": external_url,
            "last_synced_at": datetime.utcnow().isoformat()
        }
        
        if existing.data:
            # Update existing mapping
            self.supabase.table("integration_mapping")\
                .update(mapping_data)\
                .eq("id", existing.data[0]["id"])\
                .execute()
            logger.debug(f"Updated mapping: {item_id} <-> {external_item_id}")
        else:
            # Create new mapping
            mapping_data["created_at"] = datetime.utcnow().isoformat()
            self.supabase.table("integration_mapping")\
                .insert(mapping_data)\
                .execute()
            logger.debug(f"Created mapping: {item_id} <-> {external_item_id}")
    
    async def _get_local_item_from_jira_key(self, jira_key: str) -> Optional[str]:
        """
        Find local item ID from Jira key using integration mapping.
        
        Args:
            jira_key: Jira issue key (e.g., "PROJ-123")
            
        Returns:
            Local item UUID or None
        """
        result = self.supabase.table("integration_mapping")\
            .select("item_id")\
            .eq("external_system", "jira")\
            .eq("external_item_id", jira_key)\
            .execute()
        
        return result.data[0]["item_id"] if result.data else None

    # ==================== Project Sync ====================

    async def sync_project(
        self,
        project_key: str,
        sync_type: str = "manual",
        include_issues: bool = True
    ) -> Dict:
        """
        Sync a Jira project to local database.
        
        Args:
            project_key: Jira project key
            sync_type: Type of sync
            include_issues: Whether to sync project issues
            
        Returns:
            Sync result dictionary
        """
        job_id = await self._create_sync_job(sync_type, "project", project_key)
        
        try:
            # Fetch project from Jira
            jira_project = await self.jira_client.get_project(
                project_key,
                expand=["description", "lead", "issueTypes"]
            )
            
            # Check if project already exists
            existing = self.supabase.table("projects").select("*").eq(
                "jira_project_key", project_key
            ).eq("workspace_id", self.workspace_id).execute()
            
            project_data = {
                "workspace_id": self.workspace_id,
                "integration_id": self.integration_id,
                "jira_project_id": jira_project["id"],
                "jira_project_key": jira_project["key"],
                "name": jira_project["name"],
                "key": jira_project["key"],
                "description": jira_project.get("description", ""),
                "type": jira_project.get("projectTypeKey", "software"),
                "status": "active"
            }
            
            if existing.data:
                # Update existing project
                self.supabase.table("projects").update(project_data).eq(
                    "id", existing.data[0]["id"]
                ).execute()
                project_id = existing.data[0]["id"]
                items_created = 0
                items_updated = 1
            else:
                # Create new project
                result = self.supabase.table("projects").insert(project_data).execute()
                project_id = result.data[0]["id"]
                items_created = 1
                items_updated = 0
            
            # Sync issues if requested
            issues_synced = 0
            issues_created = 0
            issues_updated = 0
            
            if include_issues:
                issue_result = await self.sync_project_issues(project_key, project_id, sync_type)
                issues_synced = issue_result["items_processed"]
                issues_created = issue_result["items_created"]
                issues_updated = issue_result["items_updated"]
            
            total_created = items_created + issues_created
            total_updated = items_updated + issues_updated
            
            await self._update_sync_job(
                job_id,
                "success",
                1 + issues_synced,
                total_created,
                total_updated,
                0
            )
            
            return {
                "success": True,
                "job_id": job_id,
                "project_id": project_id,
                "items_processed": 1 + issues_synced,
                "items_created": total_created,
                "items_updated": total_updated
            }
            
        except Exception as e:
            logger.error(f"Project sync failed: {e}")
            await self._update_sync_job(job_id, "failed", error_message=str(e))
            raise

    async def sync_project_issues(
        self,
        project_key: str,
        project_id: str,
        sync_type: str = "manual",
        since: Optional[datetime] = None,
        max_results: int = 1000
    ) -> Dict:
        """
        Sync issues for a project.
        
        Args:
            project_key: Jira project key
            project_id: Local project ID
            sync_type: Type of sync
            since: Only sync issues updated after this date (incremental sync)
            max_results: Maximum issues to sync
            
        Returns:
            Sync result dictionary
        """
        job_id = await self._create_sync_job(sync_type, "issues", project_key)
        
        try:
            # Build JQL query
            jql = f"project = {project_key}"
            if since:
                jql += f" AND updated >= '{since.strftime('%Y-%m-%d %H:%M')}'"
            jql += " ORDER BY updated DESC"
            
            # Paginated fetch
            start_at = 0
            page_size = 100
            all_issues = []
            
            while start_at < max_results:
                page_result = await self.jira_client.search_issues(
                    jql=jql,
                    start_at=start_at,
                    max_results=min(page_size, max_results - start_at),
                    fields=[
                        "summary", "description", "issuetype", "status", "priority",
                        "assignee", "reporter", "created", "updated", "parent",
                        "customfield_10016",  # Epic link (common field ID)
                        "labels", "components", "fixVersions"
                    ]
                )
                
                issues = page_result.get("issues", [])
                if not issues:
                    break
                    
                all_issues.extend(issues)
                start_at += len(issues)
                
                if len(issues) < page_size:
                    break
            
            # Process issues
            items_created = 0
            items_updated = 0
            items_failed = 0
            
            for jira_issue in all_issues:
                try:
                    await self._sync_single_issue(jira_issue, project_id, project_key)
                    
                    # Check if issue existed
                    existing = self.supabase.table("issues").select("id").eq(
                        "issue_key", jira_issue["key"]
                    ).execute()
                    
                    if existing.data:
                        items_updated += 1
                    else:
                        items_created += 1
                        
                except Exception as e:
                    logger.error(f"Failed to sync issue {jira_issue.get('key')}: {e}")
                    items_failed += 1
            
            await self._update_sync_job(
                job_id,
                "success" if items_failed == 0 else "partial",
                len(all_issues),
                items_created,
                items_updated,
                items_failed
            )
            
            return {
                "success": True,
                "job_id": job_id,
                "items_processed": len(all_issues),
                "items_created": items_created,
                "items_updated": items_updated,
                "items_failed": items_failed
            }
            
        except Exception as e:
            logger.error(f"Issues sync failed: {e}")
            await self._update_sync_job(job_id, "failed", error_message=str(e))
            raise

    async def _sync_single_issue(
        self,
        jira_issue: Dict,
        project_id: str,
        project_key: str
    ):
        """
        Sync a single issue to local database.
        
        Args:
            jira_issue: Jira issue data
            project_id: Local project ID
            project_key: Jira project key
        """
        fields = jira_issue["fields"]
        issue_key = jira_issue["key"]
        
        # Extract description (ADF to plain text conversion)
        description = ""
        if fields.get("description"):
            description = self._extract_text_from_adf(fields["description"])
        
        # Check if issue already exists
        existing = self.supabase.table("issues").select("*").eq(
            "issue_key", issue_key
        ).eq("workspace_id", self.workspace_id).execute()
        
        # Map Jira issue type to local type
        issue_type = fields.get("issuetype", {}).get("name", "Task").lower()
        if issue_type not in ["epic", "story", "task", "bug", "subtask"]:
            issue_type = "task"
        
        issue_data = {
            "workspace_id": self.workspace_id,
            "project_id": project_id,
            "issue_key": issue_key,
            "title": fields.get("summary", ""),
            "description": description,
            "type": issue_type,
            "status": fields.get("status", {}).get("name", "To Do"),
            "priority": fields.get("priority", {}).get("name", "Medium"),
            "jira_issue_id": jira_issue["id"],
            "jira_url": f"{self.jira_client.base_url}/browse/{issue_key}",
            "external_system": "jira",
            "sync_metadata": {
                "last_synced": datetime.utcnow().isoformat(),
                "jira_updated": fields.get("updated"),
                "jira_created": fields.get("created"),
                "labels": fields.get("labels", [])
            }
        }
        
        # Handle epic link
        epic_link = fields.get("customfield_10016") or fields.get("parent", {}).get("key")
        if epic_link:
            # Find local epic
            epic_result = self.supabase.table("issues").select("id").eq(
                "issue_key", epic_link
            ).eq("workspace_id", self.workspace_id).execute()
            
            if epic_result.data:
                issue_data["epic_id"] = epic_result.data[0]["id"]
        
        if existing.data:
            # Update existing issue
            issue_id = existing.data[0]["id"]
            self.supabase.table("issues").update(issue_data).eq(
                "id", issue_id
            ).execute()
        else:
            # Create new issue
            result = self.supabase.table("issues").insert(issue_data).execute()
            issue_id = result.data[0]["id"]
        
        # Create/update integration mapping for bidirectional sync
        jira_url = f"{self.jira_client.base_url}/browse/{issue_key}"
        await self._upsert_integration_mapping(
            item_id=issue_id,
            external_item_id=issue_key,
            external_url=jira_url
        )

    def _extract_text_from_adf(self, adf: Dict) -> str:
        """
        Extract plain text from Atlassian Document Format.
        
        Args:
            adf: ADF document structure
            
        Returns:
            Plain text string
        """
        if not adf or not isinstance(adf, dict):
            return ""
        
        text_parts = []
        
        def extract_content(node):
            if isinstance(node, dict):
                node_type = node.get("type")
                
                if node_type == "text":
                    text_parts.append(node.get("text", ""))
                elif node_type in ["paragraph", "heading", "listItem"]:
                    if node.get("content"):
                        for child in node["content"]:
                            extract_content(child)
                        text_parts.append("\n")
                elif node.get("content"):
                    for child in node["content"]:
                        extract_content(child)
            elif isinstance(node, list):
                for item in node:
                    extract_content(item)
        
        if adf.get("content"):
            for content_node in adf["content"]:
                extract_content(content_node)
        
        return " ".join(text_parts).strip()

    # ==================== Sprint Sync ====================

    async def sync_sprint(
        self,
        sprint_id: int,
        board_id: Optional[int] = None,
        sync_type: str = "manual"
    ) -> Dict:
        """
        Sync a sprint and its issues.
        
        Args:
            sprint_id: Jira sprint ID
            board_id: Optional board ID
            sync_type: Type of sync
            
        Returns:
            Sync result dictionary
        """
        job_id = await self._create_sync_job(sync_type, "sprint", str(sprint_id))
        
        try:
            # Fetch sprint details
            sprint = await self.jira_client.get_sprint(sprint_id)
            
            # Fetch sprint issues
            issues_result = await self.jira_client.get_sprint_issues(sprint_id, max_results=200)
            issues = issues_result.get("issues", [])
            
            # Find or create project for sprint issues
            if issues:
                first_issue = issues[0]
                project_key = first_issue["key"].split("-")[0]
                
                # Ensure project exists
                project_result = self.supabase.table("projects").select("id").eq(
                    "jira_project_key", project_key
                ).eq("workspace_id", self.workspace_id).execute()
                
                if not project_result.data:
                    # Sync project first
                    await self.sync_project(project_key, sync_type="auto", include_issues=False)
                    project_result = self.supabase.table("projects").select("id").eq(
                        "jira_project_key", project_key
                    ).eq("workspace_id", self.workspace_id).execute()
                
                project_id = project_result.data[0]["id"]
                
                # Sync sprint issues
                items_created = 0
                items_updated = 0
                
                for jira_issue in issues:
                    try:
                        await self._sync_single_issue(jira_issue, project_id, project_key)
                        
                        # Check if created or updated
                        existing = self.supabase.table("issues").select("id").eq(
                            "issue_key", jira_issue["key"]
                        ).execute()
                        
                        if existing.data:
                            items_updated += 1
                        else:
                            items_created += 1
                            
                    except Exception as e:
                        logger.error(f"Failed to sync sprint issue {jira_issue.get('key')}: {e}")
                
                await self._update_sync_job(
                    job_id,
                    "success",
                    len(issues),
                    items_created,
                    items_updated,
                    0
                )
                
                return {
                    "success": True,
                    "job_id": job_id,
                    "sprint_name": sprint.get("name"),
                    "items_processed": len(issues),
                    "items_created": items_created,
                    "items_updated": items_updated
                }
            else:
                await self._update_sync_job(job_id, "success", 0, 0, 0, 0)
                return {
                    "success": True,
                    "job_id": job_id,
                    "sprint_name": sprint.get("name"),
                    "items_processed": 0,
                    "items_created": 0,
                    "items_updated": 0
                }
                
        except Exception as e:
            logger.error(f"Sprint sync failed: {e}")
            await self._update_sync_job(job_id, "failed", error_message=str(e))
            raise

    # ==================== Push to Jira ====================

    async def push_issue_to_jira(
        self,
        issue_id: str,
        create_in_jira: bool = True
    ) -> Dict:
        """
        Push a local issue to Jira.
        
        Args:
            issue_id: Local issue ID
            create_in_jira: Whether to create new issue or update existing
            
        Returns:
            Result dictionary with Jira issue key
        """
        # Fetch local issue
        issue_result = self.supabase.table("issues").select("*").eq("id", issue_id).execute()
        
        if not issue_result.data:
            raise ValueError(f"Issue {issue_id} not found")
        
        issue = issue_result.data[0]
        
        # Fetch project to get Jira project key
        project_result = self.supabase.table("projects").select("*").eq(
            "id", issue["project_id"]
        ).execute()
        
        if not project_result.data:
            raise ValueError(f"Project not found for issue {issue_id}")
        
        project = project_result.data[0]
        project_key = project["jira_project_key"]
        
        # Convert description to ADF
        description_adf = self.jira_client.convert_text_to_adf(issue.get("description", ""))
        
        # Map issue type
        issue_type_map = {
            "epic": "Epic",
            "story": "Story",
            "task": "Task",
            "bug": "Bug",
            "subtask": "Sub-task"
        }
        jira_issue_type = issue_type_map.get(issue.get("type", "task").lower(), "Task")
        
        # Build issue data
        issue_data = {
            "fields": {
                "project": {"key": project_key},
                "summary": issue["title"],
                "description": description_adf,
                "issuetype": {"name": jira_issue_type}
            }
        }
        
        # Add epic link if present
        if issue.get("epic_id"):
            epic_result = self.supabase.table("issues").select("issue_key").eq(
                "id", issue["epic_id"]
            ).execute()
            
            if epic_result.data and epic_result.data[0].get("issue_key"):
                issue_data["fields"]["customfield_10016"] = epic_result.data[0]["issue_key"]
        
        if create_in_jira or not issue.get("issue_key"):
            # Create new issue in Jira
            jira_result = await self.jira_client.create_issue(issue_data)
            jira_key = jira_result["key"]
            
            # Update local issue with Jira key
            self.supabase.table("issues").update({
                "issue_key": jira_key,
                "jira_issue_id": jira_result["id"],
                "jira_url": f"{self.jira_client.base_url}/browse/{jira_key}",
                "external_system": "jira"
            }).eq("id", issue_id).execute()
            
            return {
                "success": True,
                "action": "created",
                "jira_key": jira_key,
                "jira_url": f"{self.jira_client.base_url}/browse/{jira_key}"
            }
        else:
            # Update existing issue in Jira
            jira_key = issue["issue_key"]
            await self.jira_client.update_issue(jira_key, issue_data)
            
            return {
                "success": True,
                "action": "updated",
                "jira_key": jira_key,
                "jira_url": f"{self.jira_client.base_url}/browse/{jira_key}"
            }

    async def push_multiple_issues_to_jira(
        self,
        issue_ids: List[str],
        link_to_epic: Optional[str] = None
    ) -> Dict:
        """
        Push multiple issues to Jira (e.g., AI-generated stories).
        
        Args:
            issue_ids: List of local issue IDs
            link_to_epic: Optional epic key to link stories to
            
        Returns:
            Result dictionary with created issue keys
        """
        results = []
        failed = []
        
        for issue_id in issue_ids:
            try:
                result = await self.push_issue_to_jira(issue_id, create_in_jira=True)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to push issue {issue_id}: {e}")
                failed.append({"issue_id": issue_id, "error": str(e)})
        
        return {
            "success": len(failed) == 0,
            "created_count": len(results),
            "failed_count": len(failed),
            "results": results,
            "failed": failed
        }
