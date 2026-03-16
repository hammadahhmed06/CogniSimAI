# services/notifications/inapp_notifier.py
"""
Stores notifications in the ``notifications`` table so users can see
them in the frontend Notification Centre.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.dependencies import supabase
from app.services.events.event_types import EventType

logger = logging.getLogger("cognisim_ai")

# Map event types → user-facing titles
_TITLES = {
    EventType.PRD_COMPLETED: "PRD Generated",
    EventType.PRD_REVIEW_REQUESTED: "PRD Review Requested",
    EventType.STORY_ASSIGNED: "Story Assigned to You",
    EventType.STORY_STATUS_CHANGED: "Story Status Updated",
    EventType.SPRINT_STARTED: "Sprint Started",
    EventType.SPRINT_COMPLETED: "Sprint Completed",
    EventType.EPIC_CREATED: "New Epic Created",
    EventType.COMMENT_ADDED: "New Comment",
    EventType.TEAM_MEMBER_JOINED: "New Team Member",
    EventType.INTEGRATION_CONNECTED: "Integration Connected",
    EventType.INTEGRATION_DISCONNECTED: "Integration Disconnected",
    EventType.INTEGRATION_ERROR: "Integration Error",
}


class InAppNotifier:
    """Persists notifications into the ``notifications`` table."""

    @staticmethod
    async def store(
        event_type: EventType,
        payload: Any,
        workspace_id: str,
        user_id: Optional[str] = None,
        team_id: Optional[str] = None,
    ):
        """
        Insert a notification row.

        If *user_id* is ``None`` the notification targets the whole
        workspace (visible to every member).
        """
        p = payload if isinstance(payload, dict) else (
            payload.model_dump() if hasattr(payload, "model_dump") else {}
        )

        title = _TITLES.get(event_type, event_type.value)
        message = InAppNotifier._build_message(event_type, p)

        row = {
            "id": str(uuid.uuid4()),
            "workspace_id": workspace_id,
            "user_id": user_id or p.get("user_id"),
            "team_id": team_id or p.get("team_id"),
            "type": event_type.value,
            "title": title,
            "message": message,
            "data": p,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            supabase.table("notifications").insert(row).execute()
            logger.info(f"In-app notification stored: {event_type.value} for workspace {workspace_id}")
        except Exception as e:
            logger.error(f"Failed to store in-app notification: {e}")

    @staticmethod
    def _build_message(event_type: EventType, p: dict) -> str:
        """Build a short human-readable message for the notification card."""

        if event_type == EventType.PRD_COMPLETED:
            score = p.get("quality_score")
            score_str = f" (Score: {score}%)" if score else ""
            return f"PRD \"{p.get('title', 'Untitled')}\" was generated successfully{score_str}."

        if event_type == EventType.PRD_REVIEW_REQUESTED:
            return f"PRD \"{p.get('title', 'Untitled')}\" is awaiting your review."

        if event_type == EventType.STORY_ASSIGNED:
            return (
                f"Story {p.get('issue_key', '')} \"{p.get('title', '')}\" "
                f"has been assigned to {p.get('assignee_name', 'you')}."
            )

        if event_type == EventType.STORY_STATUS_CHANGED:
            return (
                f"Story {p.get('issue_key', '')} moved from "
                f"\"{p.get('old_status', '?')}\" → \"{p.get('new_status', '?')}\"."
            )

        if event_type == EventType.SPRINT_STARTED:
            return (
                f"Sprint \"{p.get('sprint_name', '')}\" has started "
                f"with {p.get('total_stories', 0)} stories."
            )

        if event_type == EventType.SPRINT_COMPLETED:
            return (
                f"Sprint \"{p.get('sprint_name', '')}\" completed — "
                f"{p.get('completed_stories', 0)}/{p.get('total_stories', 0)} stories done."
            )

        if event_type == EventType.EPIC_CREATED:
            return (
                f"Epic \"{p.get('title', '')}\" created with "
                f"{p.get('stories_count', 0)} stories."
            )

        if event_type == EventType.COMMENT_ADDED:
            return (
                f"{p.get('author_name', 'Someone')} commented on "
                f"{p.get('issue_key', 'an item')}: \"{p.get('comment_text', '')[:100]}\"."
            )

        if event_type == EventType.TEAM_MEMBER_JOINED:
            return (
                f"{p.get('member_name') or p.get('member_email', 'A new member')} "
                f"joined team \"{p.get('team_name', '')}\"."
            )

        if event_type == EventType.INTEGRATION_CONNECTED:
            return f"{p.get('integration_type', 'Integration')} connected successfully."

        if event_type == EventType.INTEGRATION_DISCONNECTED:
            return f"{p.get('integration_type', 'Integration')} disconnected."

        if event_type == EventType.INTEGRATION_ERROR:
            return (
                f"{p.get('integration_type', 'Integration')} encountered an error: "
                f"{p.get('error_message', 'Unknown error')}."
            )

        return f"Event: {event_type.value}"
