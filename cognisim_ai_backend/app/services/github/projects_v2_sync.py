"""app/services/github/projects_v2_sync.py

Sync engine for GitHub Projects v2 ↔ local issues.

Design:
- Mirrors the Jira JiraSyncService pattern — owns all sync logic, creates
  ``github_sync_jobs`` rows for observability.
- Strategy-based field mapping: each GitHub field type (single-select,
  iteration, text, number, date) has its own mapping logic via FieldMapper.
- Three-timestamp conflict detection identical to issue sync.
- All mutations are idempotent (keyed on composite unique constraints).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.core.dependencies import supabase
from app.services.github.github_clients import GitHubGraphQLClient

logger = logging.getLogger("cognisim_ai")


# ---------------------------------------------------------------------------
# Field Mapper (Strategy Pattern)
# ---------------------------------------------------------------------------

class FieldMapper:
    """Translates between local issue fields and GitHub project field values.

    Constructed from the ``field_mappings`` JSONB stored on
    ``github_projects_v2_links`` and the live field definitions fetched
    from the GitHub GraphQL API.

    ``field_mappings`` schema expected::

        {
            "<local_field_name>": {
                "github_field_id": "<node-id>",
                "github_field_name": "<display name>",
                "data_type": "SINGLE_SELECT" | "TEXT" | "NUMBER" | "DATE" | "ITERATION",
                "option_mappings": {          # only for SINGLE_SELECT / ITERATION
                    "<local_value>": "<github_option_id>"
                }
            }
        }
    """

    def __init__(self, field_mappings: Dict[str, Any], github_fields: List[Dict[str, Any]]):
        self.field_mappings = field_mappings or {}
        # Build a lookup from github field id → field definition for reverse mapping.
        self._gh_fields_by_id: Dict[str, Dict[str, Any]] = {}
        for f in github_fields:
            fid = f.get("id")
            if fid:
                self._gh_fields_by_id[fid] = f

    # --- local → GitHub ------------------------------------------------

    def local_to_github(self, local_fields: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Return a list of ``(field_node_id, value_input)`` dicts ready for
        ``update_project_v2_item_field``.
        """
        results: List[Dict[str, Any]] = []
        for local_key, mapping in self.field_mappings.items():
            local_val = local_fields.get(local_key)
            if local_val is None:
                continue

            gh_field_id = mapping.get("github_field_id")
            data_type = (mapping.get("data_type") or "").upper()
            if not gh_field_id:
                continue

            value = self._build_field_value(data_type, local_val, mapping)
            if value is not None:
                results.append({"field_id": gh_field_id, "value": value})
        return results

    @staticmethod
    def _build_field_value(
        data_type: str, local_val: Any, mapping: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        if data_type == "SINGLE_SELECT":
            option_mappings = mapping.get("option_mappings") or {}
            option_id = option_mappings.get(str(local_val))
            if option_id:
                return {"singleSelectOptionId": option_id}
            return None
        elif data_type == "TEXT":
            return {"text": str(local_val)}
        elif data_type == "NUMBER":
            try:
                return {"number": float(local_val)}
            except (ValueError, TypeError):
                return None
        elif data_type == "DATE":
            return {"date": str(local_val)}
        elif data_type == "ITERATION":
            option_mappings = mapping.get("option_mappings") or {}
            iter_id = option_mappings.get(str(local_val))
            if iter_id:
                return {"iterationId": iter_id}
            return None
        return None

    # --- GitHub → local ------------------------------------------------

    def github_to_local(self, field_values_nodes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Convert GitHub project field values back to local field key/value pairs."""
        # Build reverse lookup: github_field_id → local_field_name
        reverse: Dict[str, str] = {}
        reverse_options: Dict[str, Dict[str, str]] = {}
        for local_key, mapping in self.field_mappings.items():
            gh_id = mapping.get("github_field_id")
            if gh_id:
                reverse[gh_id] = local_key
                # Reverse option mappings
                opts = mapping.get("option_mappings") or {}
                reverse_options[gh_id] = {v: k for k, v in opts.items()}

        result: Dict[str, Any] = {}
        for fv in field_values_nodes:
            field_info = fv.get("field") or {}
            gh_field_id = field_info.get("id")
            if not gh_field_id or gh_field_id not in reverse:
                continue
            local_key = reverse[gh_field_id]

            # Determine value based on type
            if "text" in fv:
                result[local_key] = fv["text"]
            elif "number" in fv:
                result[local_key] = fv["number"]
            elif "date" in fv:
                result[local_key] = fv["date"]
            elif "optionId" in fv:
                rev_opts = reverse_options.get(gh_field_id, {})
                result[local_key] = rev_opts.get(fv["optionId"], fv.get("name"))
            elif "iterationId" in fv:
                rev_opts = reverse_options.get(gh_field_id, {})
                result[local_key] = rev_opts.get(fv["iterationId"], fv.get("title"))
        return result


# ---------------------------------------------------------------------------
# ProjectsV2SyncService
# ---------------------------------------------------------------------------

class ProjectsV2SyncService:
    """Orchestrates bidirectional sync between local issues and GitHub
    Projects v2 items.
    """

    def __init__(self, gql_client: GitHubGraphQLClient):
        self.gql = gql_client

    # -- helpers -----------------------------------------------------------

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _create_sync_job(
        self,
        workspace_id: str,
        installation_id: int,
        sync_type: str,
        resource_id: Optional[str] = None,
    ) -> str:
        job_id = str(uuid4())
        supabase.table("github_sync_jobs").insert({
            "id": job_id,
            "workspace_id": workspace_id,
            "github_installation_id": installation_id,
            "sync_type": sync_type,
            "resource_type": "projects_v2",
            "resource_id": resource_id,
            "status": "in_progress",
            "started_at": self._now_iso(),
        }).execute()
        return job_id

    def _complete_sync_job(
        self,
        job_id: str,
        *,
        status: str = "success",
        items_processed: int = 0,
        items_created: int = 0,
        items_updated: int = 0,
        items_failed: int = 0,
        error_message: Optional[str] = None,
        sync_metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        payload: Dict[str, Any] = {
            "status": status,
            "items_processed": items_processed,
            "items_created": items_created,
            "items_updated": items_updated,
            "items_failed": items_failed,
            "completed_at": self._now_iso(),
        }
        if error_message:
            payload["error_message"] = error_message
        if sync_metadata:
            payload["sync_metadata"] = sync_metadata
        try:
            supabase.table("github_sync_jobs").update(payload).eq("id", job_id).execute()
        except Exception as e:
            logger.error("Failed to update sync job %s: %s", job_id, e)

    # -- field schema caching ---------------------------------------------

    async def fetch_and_cache_fields(self, project_link_id: str) -> List[Dict[str, Any]]:
        """Fetch project field definitions from GitHub and cache them in the
        ``github_projects_v2_links`` row's ``field_mappings`` column under
        the ``_schema`` key.
        """
        link = self._get_project_link(project_link_id)
        if not link:
            raise ValueError(f"Project link {project_link_id} not found")

        project_node_id = link["project_node_id"]
        fields = await self.gql.get_project_v2_fields(project_node_id)

        # Store schema alongside user-defined mappings
        existing_mappings = link.get("field_mappings") or {}
        existing_mappings["_schema"] = fields
        supabase.table("github_projects_v2_links").update({
            "field_mappings": existing_mappings,
        }).eq("id", project_link_id).execute()

        return fields

    def build_field_mapper(self, link: Dict[str, Any]) -> FieldMapper:
        mappings = link.get("field_mappings") or {}
        schema = mappings.get("_schema") or []
        # Filter out the _schema key from field_mappings for the mapper
        user_mappings = {k: v for k, v in mappings.items() if k != "_schema"}
        return FieldMapper(user_mappings, schema)

    @staticmethod
    def _get_project_link(project_link_id: str) -> Optional[Dict[str, Any]]:
        res = (
            supabase.table("github_projects_v2_links")
            .select("*")
            .eq("id", project_link_id)
            .maybe_single()
            .execute()
        )
        return getattr(res, "data", None)

    # -- push issue → project ---------------------------------------------

    async def push_issue_to_project(
        self, issue_id: str, project_link_id: str
    ) -> Dict[str, Any]:
        """Idempotently add a local issue to a GitHub Projects v2 board and
        set its field values based on configured mappings.

        Returns a summary dict with ``action`` ('created'|'updated'|'skipped')
        and optional ``error``.
        """
        link = self._get_project_link(project_link_id)
        if not link:
            return {"action": "skipped", "error": "Project link not found"}

        project_node_id = link["project_node_id"]
        workspace_id = str(link["workspace_id"])
        installation_id = int(link["github_installation_id"])

        # Check existing mapping
        existing_res = (
            supabase.table("github_project_v2_item_mappings")
            .select("*")
            .eq("project_link_id", project_link_id)
            .eq("internal_issue_id", issue_id)
            .maybe_single()
            .execute()
        )
        existing = getattr(existing_res, "data", None)

        # Ensure issue has a github_issue_node_id (must be pushed to GitHub Issues first)
        issue_mapping_res = (
            supabase.table("github_issue_mappings")
            .select("github_issue_number, github_issue_url")
            .eq("internal_issue_id", issue_id)
            .eq("workspace_id", workspace_id)
            .limit(1)
            .execute()
        )
        issue_mappings = getattr(issue_mapping_res, "data", []) or []

        # We need the issue's GitHub node_id — fetch it from the REST-created
        # issue via GraphQL if we don't have it in the mapping yet.
        github_issue_node_id: Optional[str] = None
        if existing:
            github_issue_node_id = existing.get("github_issue_node_id")

        if not github_issue_node_id and issue_mappings:
            # Look up the node ID via the issue URL's repo + number
            mapping = issue_mappings[0]
            url = mapping.get("github_issue_url") or ""
            number = mapping.get("github_issue_number")
            if url and number:
                # Parse owner/repo from URL: https://github.com/owner/repo/issues/N
                parts = url.replace("https://github.com/", "").split("/")
                if len(parts) >= 3:
                    owner, repo = parts[0], parts[1]
                    node_query = """
                    query($owner: String!, $repo: String!, $number: Int!) {
                      repository(owner: $owner, name: $repo) {
                        issue(number: $number) { id }
                      }
                    }
                    """
                    try:
                        node_data = await self.gql.query(node_query, {
                            "owner": owner, "repo": repo, "number": int(number)
                        })
                        github_issue_node_id = (
                            (node_data.get("repository") or {}).get("issue") or {}
                        ).get("id")
                    except Exception as e:
                        logger.warning("Failed to fetch issue node ID: %s", e)

        if not github_issue_node_id:
            return {
                "action": "skipped",
                "error": "Issue must be pushed to GitHub Issues first (no node ID available)",
            }

        action = "updated"
        item_node_id: Optional[str] = None

        if existing:
            item_node_id = existing.get("github_item_node_id")
        else:
            # Add item to project
            try:
                item_node_id = await self.gql.add_item_to_project_v2(
                    project_node_id, github_issue_node_id
                )
                action = "created"
            except Exception as e:
                return {"action": "skipped", "error": f"Failed to add item: {e}"}

        if not item_node_id:
            return {"action": "skipped", "error": "No item node ID"}

        # Map and update field values
        local_issue = self._get_local_issue(issue_id)
        if local_issue:
            mapper = self.build_field_mapper(link)
            field_updates = mapper.local_to_github(local_issue)
            for fu in field_updates:
                try:
                    await self.gql.update_project_v2_item_field(
                        project_node_id,
                        item_node_id,
                        fu["field_id"],
                        fu["value"],
                    )
                except Exception as e:
                    logger.warning(
                        "Failed to update field %s on item %s: %s",
                        fu["field_id"], item_node_id, e,
                    )

        # Upsert mapping
        now = self._now_iso()
        snapshot = {}
        if local_issue:
            mapper = self.build_field_mapper(link)
            snapshot = {k: local_issue.get(k) for k in (link.get("field_mappings") or {}) if k != "_schema"}

        try:
            supabase.table("github_project_v2_item_mappings").upsert(
                {
                    "workspace_id": workspace_id,
                    "project_link_id": project_link_id,
                    "internal_issue_id": issue_id,
                    "github_item_node_id": item_node_id,
                    "github_issue_node_id": github_issue_node_id,
                    "field_values_snapshot": snapshot,
                    "last_synced_at": now,
                },
                on_conflict="project_link_id,internal_issue_id",
            ).execute()
        except Exception as e:
            logger.warning("Failed to upsert item mapping: %s", e)

        return {"action": action, "item_node_id": item_node_id}

    # -- pull (GitHub → local) --------------------------------------------

    async def pull_project_items(self, project_link_id: str) -> Dict[str, Any]:
        """Fetch all project items from GitHub and update local issues where
        mappings exist.  Returns summary counts.
        """
        link = self._get_project_link(project_link_id)
        if not link:
            raise ValueError("Project link not found")

        project_node_id = link["project_node_id"]
        mapper = self.build_field_mapper(link)
        updated = 0
        conflicts = 0
        cursor: Optional[str] = None

        while True:
            page = await self.gql.list_project_v2_items(
                project_node_id, first=50, after=cursor
            )
            items = page.get("items") or []
            page_info = page.get("pageInfo") or {}

            for item in items:
                item_id = item.get("id")
                if not item_id:
                    continue

                # Find mapping
                map_res = (
                    supabase.table("github_project_v2_item_mappings")
                    .select("*")
                    .eq("project_link_id", project_link_id)
                    .eq("github_item_node_id", item_id)
                    .maybe_single()
                    .execute()
                )
                mapping = getattr(map_res, "data", None)
                if not mapping:
                    continue

                issue_id = mapping.get("internal_issue_id")
                field_values = (item.get("fieldValues") or {}).get("nodes") or []
                github_fields = mapper.github_to_local(field_values)

                if not github_fields:
                    continue

                local = self._get_local_issue(issue_id)
                if not local:
                    continue

                # Conflict detection
                last_synced = self._parse_dt(mapping.get("last_synced_at"))
                local_updated = self._parse_dt(local.get("updated_at"))
                snapshot = mapping.get("field_values_snapshot") or {}

                # Check if github fields differ from snapshot (github changed)
                github_changed = any(
                    github_fields.get(k) != snapshot.get(k)
                    for k in github_fields
                )
                local_changed = False
                if last_synced and local_updated and local_updated > last_synced:
                    local_changed = True

                if github_changed and local_changed:
                    # Both changed → conflict
                    self._create_conflict(
                        workspace_id=str(link["workspace_id"]),
                        installation_id=int(link["github_installation_id"]),
                        issue_id=issue_id,
                        item_id=item_id,
                        local_fields=local,
                        github_fields=github_fields,
                        local_updated=local_updated,
                    )
                    conflicts += 1
                elif github_changed:
                    # Only github changed → apply to local
                    update_payload = {k: v for k, v in github_fields.items() if v is not None}
                    if update_payload:
                        supabase.table("issues").update(update_payload).eq("id", issue_id).execute()
                    # Update snapshot + sync timestamp
                    supabase.table("github_project_v2_item_mappings").update({
                        "field_values_snapshot": github_fields,
                        "last_synced_at": self._now_iso(),
                    }).eq("id", mapping["id"]).execute()
                    updated += 1

            if not page_info.get("hasNextPage"):
                break
            cursor = page_info.get("endCursor")

        return {"updated": updated, "conflicts": conflicts}

    # -- reconcile ---------------------------------------------------------

    async def reconcile(self, project_link_id: str) -> Dict[str, Any]:
        """Full reconciliation: fetch all items, detect drift, apply
        non-conflicting changes, create conflict records for true conflicts.
        """
        link = self._get_project_link(project_link_id)
        if not link:
            raise ValueError("Project link not found")

        workspace_id = str(link["workspace_id"])
        installation_id = int(link["github_installation_id"])

        job_id = self._create_sync_job(
            workspace_id, installation_id, "auto", project_link_id
        )

        try:
            result = await self.pull_project_items(project_link_id)
            updated = result.get("updated", 0)
            conflicts = result.get("conflicts", 0)

            # Also push unmapped local issues that have issue mappings
            pushed = await self._push_unmapped_issues(project_link_id, link)

            self._complete_sync_job(
                job_id,
                status="success" if conflicts == 0 else "partial",
                items_processed=updated + conflicts + pushed,
                items_created=pushed,
                items_updated=updated,
                items_failed=conflicts,
                sync_metadata={
                    "pulled_updated": updated,
                    "conflicts_detected": conflicts,
                    "pushed_new": pushed,
                },
            )

            # Update last_reconciled_at
            supabase.table("github_projects_v2_links").update({
                "last_reconciled_at": self._now_iso(),
            }).eq("id", project_link_id).execute()

            return {
                "job_id": job_id,
                "updated": updated,
                "conflicts": conflicts,
                "pushed": pushed,
            }

        except Exception as e:
            logger.error("Reconciliation failed for %s: %s", project_link_id, e)
            self._complete_sync_job(job_id, status="failed", error_message=str(e))
            raise

    async def _push_unmapped_issues(
        self, project_link_id: str, link: Dict[str, Any]
    ) -> int:
        """Push local issues that have GitHub issue mappings but aren't yet
        in the project."""
        workspace_id = str(link["workspace_id"])

        # Get all issues that have github issue mappings in this workspace
        issue_mappings_res = (
            supabase.table("github_issue_mappings")
            .select("internal_issue_id")
            .eq("workspace_id", workspace_id)
            .execute()
        )
        all_issue_ids = {
            r["internal_issue_id"]
            for r in (getattr(issue_mappings_res, "data", []) or [])
        }

        # Get issues already mapped to this project
        existing_res = (
            supabase.table("github_project_v2_item_mappings")
            .select("internal_issue_id")
            .eq("project_link_id", project_link_id)
            .execute()
        )
        existing_ids = {
            r["internal_issue_id"]
            for r in (getattr(existing_res, "data", []) or [])
        }

        unmapped = all_issue_ids - existing_ids
        pushed = 0
        for issue_id in unmapped:
            try:
                result = await self.push_issue_to_project(issue_id, project_link_id)
                if result.get("action") in ("created", "updated"):
                    pushed += 1
            except Exception as e:
                logger.warning("Failed to push issue %s to project: %s", issue_id, e)
        return pushed

    # -- process webhook event ---------------------------------------------

    async def process_webhook_event(
        self,
        *,
        installation_id: int,
        project_node_id: str,
        item_node_id: str,
        action: str,
        changes: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Handle a ``projects_v2_item`` webhook event.

        Actions: created, edited, deleted, archived, restored, reordered.
        """
        # Find linked project
        link_res = (
            supabase.table("github_projects_v2_links")
            .select("*")
            .eq("project_node_id", project_node_id)
            .eq("sync_enabled", True)
            .maybe_single()
            .execute()
        )
        link = getattr(link_res, "data", None)
        if not link:
            return

        project_link_id = link["id"]

        if action == "deleted":
            # Remove mapping if exists
            try:
                supabase.table("github_project_v2_item_mappings").delete().eq(
                    "project_link_id", project_link_id
                ).eq("github_item_node_id", item_node_id).execute()
            except Exception as e:
                logger.warning("Failed to delete item mapping: %s", e)
            return

        if action in ("created", "edited", "restored"):
            # Find mapping
            map_res = (
                supabase.table("github_project_v2_item_mappings")
                .select("*")
                .eq("project_link_id", project_link_id)
                .eq("github_item_node_id", item_node_id)
                .maybe_single()
                .execute()
            )
            mapping = getattr(map_res, "data", None)
            if not mapping:
                # Item not tracked locally — skip
                return

            issue_id = mapping.get("internal_issue_id")
            if not issue_id:
                return

            # Fetch latest field values from GitHub
            try:
                page = await self.gql.list_project_v2_items(
                    link["project_node_id"], first=1
                )
                # Unfortunately we need to fetch the specific item; use a
                # targeted query.  For now, refetch all and find ours.
                # In production, you'd query the specific item node.
                all_items_page = await self.gql.list_project_v2_items(
                    link["project_node_id"], first=100
                )
                target_item = None
                for it in all_items_page.get("items", []):
                    if it.get("id") == item_node_id:
                        target_item = it
                        break

                if not target_item:
                    return

                field_values = (target_item.get("fieldValues") or {}).get("nodes") or []
                mapper = self.build_field_mapper(link)
                github_fields = mapper.github_to_local(field_values)

                if not github_fields:
                    return

                local = self._get_local_issue(issue_id)
                if not local:
                    return

                # Conflict detection
                last_synced = self._parse_dt(mapping.get("last_synced_at"))
                local_updated = self._parse_dt(local.get("updated_at"))
                snapshot = mapping.get("field_values_snapshot") or {}

                github_changed = any(
                    github_fields.get(k) != snapshot.get(k)
                    for k in github_fields
                )
                local_changed = bool(
                    last_synced and local_updated and local_updated > last_synced
                )

                if github_changed and local_changed:
                    self._create_conflict(
                        workspace_id=str(link["workspace_id"]),
                        installation_id=installation_id,
                        issue_id=issue_id,
                        item_id=item_node_id,
                        local_fields=local,
                        github_fields=github_fields,
                        local_updated=local_updated,
                    )
                elif github_changed:
                    update_payload = {k: v for k, v in github_fields.items() if v is not None}
                    if update_payload:
                        supabase.table("issues").update(update_payload).eq("id", issue_id).execute()
                    supabase.table("github_project_v2_item_mappings").update({
                        "field_values_snapshot": github_fields,
                        "last_synced_at": self._now_iso(),
                    }).eq("id", mapping["id"]).execute()

            except Exception as e:
                logger.error(
                    "Failed to process projects_v2_item webhook (%s) for item %s: %s",
                    action, item_node_id, e,
                )

    # -- internal helpers --------------------------------------------------

    @staticmethod
    def _get_local_issue(issue_id: str) -> Optional[Dict[str, Any]]:
        res = (
            supabase.table("issues")
            .select("*")
            .eq("id", issue_id)
            .maybe_single()
            .execute()
        )
        return getattr(res, "data", None)

    @staticmethod
    def _parse_dt(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            v = str(value).strip()
            if v.endswith("Z"):
                v = v[:-1] + "+00:00"
            dt = datetime.fromisoformat(v)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return None

    @staticmethod
    def _create_conflict(
        *,
        workspace_id: str,
        installation_id: int,
        issue_id: str,
        item_id: str,
        local_fields: Dict[str, Any],
        github_fields: Dict[str, Any],
        local_updated: Optional[datetime],
    ) -> None:
        try:
            supabase.table("github_conflicts").insert({
                "workspace_id": workspace_id,
                "github_installation_id": installation_id,
                "conflict_type": "project_v2_field_mismatch",
                "local_entity_type": "issue",
                "local_entity_id": issue_id,
                "github_entity_type": "project_v2_item",
                "github_entity_id": item_id,
                "conflicting_fields": list(github_fields.keys()),
                "local_version": {
                    k: local_fields.get(k)
                    for k in github_fields
                },
                "github_version": github_fields,
                "local_updated_at": local_updated.isoformat() if local_updated else datetime.now(timezone.utc).isoformat(),
                "github_updated_at": datetime.now(timezone.utc).isoformat(),
                "status": "pending",
            }).execute()
        except Exception as e:
            logger.error("Failed to create conflict record: %s", e)
