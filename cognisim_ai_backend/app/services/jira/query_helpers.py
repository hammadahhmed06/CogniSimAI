"""
Database query helpers for Jira integration mapping.

Provides utility functions to efficiently query projects and issues
with their Jira integration status.
"""

from typing import List, Dict, Any, Optional
from uuid import UUID
from supabase import Client


class JiraQueryHelper:
    """Helper class for querying Jira-integrated data"""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    def get_projects_with_jira_mapping(
        self, workspace_id: str, include_local: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get all projects with their Jira integration mapping.

        Args:
            workspace_id: Workspace ID to filter by
            include_local: If True, include projects without Jira mapping

        Returns:
            List of projects with integration_mapping fields joined
        """
        query = self.supabase.table("projects").select(
            """
            *,
            integration_mapping!left(
                external_item_id,
                external_url,
                last_synced_at
            )
            """
        ).eq("workspace_id", workspace_id)

        if not include_local:
            # Only projects with Jira mapping
            query = query.not_.is_("integration_mapping", "null")

        result = query.execute()
        return result.data or []

    def get_issues_with_jira_mapping(
        self, 
        workspace_id: Optional[str] = None,
        project_id: Optional[str] = None,
        include_local: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get all issues with their Jira integration mapping.

        Args:
            workspace_id: Optional workspace ID filter
            project_id: Optional project ID filter
            include_local: If True, include issues without Jira mapping

        Returns:
            List of issues with integration_mapping fields joined
        """
        query = self.supabase.table("issues").select(
            """
            *,
            integration_mapping!left(
                external_item_id,
                external_url,
                last_synced_at
            )
            """
        )

        if workspace_id:
            query = query.eq("workspace_id", workspace_id)

        if project_id:
            query = query.eq("project_id", project_id)

        if not include_local:
            # Only issues with Jira mapping
            query = query.not_.is_("integration_mapping", "null")

        result = query.execute()
        return result.data or []

    def get_jira_projects_count(self, workspace_id: str) -> int:
        """
        Get count of Jira-integrated projects in a workspace.

        Args:
            workspace_id: Workspace ID

        Returns:
            Count of projects with Jira integration
        """
        result = (
            self.supabase.table("projects")
            .select("*", count="exact")  # type: ignore
            .eq("workspace_id", workspace_id)
            .not_.is_("integration_id", "null")
            .execute()
        )
        return result.count or 0

    def get_jira_issues_count(
        self, workspace_id: Optional[str] = None, project_id: Optional[str] = None
    ) -> int:
        """
        Get count of Jira-integrated issues.

        Args:
            workspace_id: Optional workspace filter
            project_id: Optional project filter

        Returns:
            Count of issues with Jira integration
        """
        query = (
            self.supabase.table("integration_mapping")
            .select("*", count="exact")  # type: ignore
            .eq("external_system", "jira")
        )

        if workspace_id or project_id:
            # Need to join with issues table to filter
            issue_ids_query = self.supabase.table("issues").select("id")

            if workspace_id:
                issue_ids_query = issue_ids_query.eq("workspace_id", workspace_id)

            if project_id:
                issue_ids_query = issue_ids_query.eq("project_id", project_id)

            issue_ids = [row["id"] for row in issue_ids_query.execute().data]
            query = query.in_("item_id", issue_ids)

        result = query.execute()
        return result.count or 0

    def get_item_jira_mapping(self, item_id: str) -> Optional[Dict[str, Any]]:
        """
        Get Jira mapping for a specific item (project or issue).

        Args:
            item_id: UUID of the item

        Returns:
            Integration mapping dict or None
        """
        result = (
            self.supabase.table("integration_mapping")
            .select("*")
            .eq("item_id", item_id)
            .eq("external_system", "jira")
            .execute()
        )

        return result.data[0] if result.data else None

    def get_local_item_from_jira_key(self, jira_key: str) -> Optional[str]:
        """
        Get local item ID from Jira issue key.

        Args:
            jira_key: Jira issue key (e.g., "PROJ-123")

        Returns:
            Local item UUID or None
        """
        result = (
            self.supabase.table("integration_mapping")
            .select("item_id")
            .eq("external_system", "jira")
            .eq("external_item_id", jira_key)
            .execute()
        )

        return result.data[0]["item_id"] if result.data else None

    def get_unsynced_items(
        self, 
        entity_type: str,
        workspace_id: Optional[str] = None,
        minutes_threshold: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get items that haven't been synced recently.

        Args:
            entity_type: 'project' or 'issue'
            workspace_id: Optional workspace filter
            minutes_threshold: Minutes since last sync to consider "unsynced"

        Returns:
            List of items needing sync
        """
        table = "projects" if entity_type == "project" else "issues"

        # Get items with Jira integration
        query = self.supabase.table(table).select(
            """
            *,
            integration_mapping!left(
                last_synced_at
            )
            """
        ).not_.is_("integration_id", "null")

        if workspace_id:
            query = query.eq("workspace_id", workspace_id)

        result = query.execute()
        items = result.data or []

        # Filter by sync threshold
        import datetime
        threshold_time = datetime.datetime.utcnow() - datetime.timedelta(
            minutes=minutes_threshold
        )

        unsynced = []
        for item in items:
            mapping = item.get("integration_mapping")
            if not mapping or not mapping.get("last_synced_at"):
                # Never synced
                unsynced.append(item)
            else:
                last_sync = datetime.datetime.fromisoformat(
                    mapping["last_synced_at"].replace("Z", "+00:00")
                )
                if last_sync < threshold_time:
                    unsynced.append(item)

        return unsynced


# Standalone helper functions for convenience

def get_projects_with_jira(supabase: Client, workspace_id: str) -> List[Dict[str, Any]]:
    """Get all projects with Jira integration mapping"""
    helper = JiraQueryHelper(supabase)
    return helper.get_projects_with_jira_mapping(workspace_id, include_local=False)


def get_issues_with_jira(
    supabase: Client, workspace_id: Optional[str] = None, project_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get all issues with Jira integration mapping"""
    helper = JiraQueryHelper(supabase)
    return helper.get_issues_with_jira_mapping(workspace_id, project_id, include_local=False)


def get_jira_key_from_item(supabase: Client, item_id: str) -> Optional[str]:
    """Get Jira key for a local item"""
    helper = JiraQueryHelper(supabase)
    mapping = helper.get_item_jira_mapping(item_id)
    return mapping.get("external_item_id") if mapping else None
