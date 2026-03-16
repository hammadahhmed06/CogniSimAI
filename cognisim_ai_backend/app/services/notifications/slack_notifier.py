# services/notifications/slack_notifier.py
"""
Formats system events as rich Slack Block Kit messages and sends them
to the appropriate workspace/team channels.
"""

import logging
from typing import Any, Optional

from app.core.dependencies import supabase
from app.core.config import settings
from app.services.events.event_types import EventType
from app.services.slack.slack_client import (
    SlackClient,
    build_prd_notification_blocks,
    build_story_update_blocks,
    build_sprint_summary_blocks,
)

logger = logging.getLogger("cognisim_ai")

# Map event types to human-readable labels for fallback text
_EVENT_LABELS = {
    EventType.PRD_COMPLETED: "PRD Completed",
    EventType.PRD_REVIEW_REQUESTED: "PRD Review Requested",
    EventType.STORY_ASSIGNED: "Story Assigned",
    EventType.STORY_STATUS_CHANGED: "Story Status Changed",
    EventType.SPRINT_STARTED: "Sprint Started",
    EventType.SPRINT_COMPLETED: "Sprint Completed",
    EventType.EPIC_CREATED: "Epic Created",
    EventType.COMMENT_ADDED: "New Comment",
    EventType.TEAM_MEMBER_JOINED: "Team Member Joined",
    EventType.INTEGRATION_CONNECTED: "Integration Connected",
    EventType.INTEGRATION_ERROR: "Integration Error",
}


class SlackNotifier:
    """Sends Slack notifications for system events."""

    @staticmethod
    async def send(event_type: EventType, payload: Any, workspace_id: str):
        """
        Look up the Slack integration for the workspace, check if
        notifications are enabled, build rich blocks, and send.
        """
        # Look up integration
        integration = SlackNotifier._get_integration(workspace_id)
        if not integration:
            logger.debug(f"No Slack integration for workspace {workspace_id}")
            return

        if not integration.get("notifications_enabled", False):
            logger.debug(f"Slack notifications disabled for workspace {workspace_id}")
            return

        if not integration.get("is_active", False):
            return

        bot_token = integration.get("bot_access_token") or integration.get("bot_token")
        if not bot_token:
            return

        # Determine target channel
        channel = integration.get("default_channel_id")
        if not channel:
            logger.warning(f"No default channel configured for workspace {workspace_id}")
            return

        # Build message
        text, blocks = SlackNotifier._build_message(event_type, payload)
        if not text:
            return

        # Send
        try:
            client = SlackClient(bot_token, is_encrypted=True)
            success, msg_ts, error = client.send_message(
                channel=channel,
                text=text,
                blocks=blocks,
            )
            if success:
                logger.info(f"Slack notification sent: {event_type.value} → {channel}")
            else:
                logger.error(f"Slack notification failed: {error}")
        except Exception as e:
            logger.error(f"Error sending Slack notification: {e}")

    @staticmethod
    def _get_integration(workspace_id: str) -> Optional[dict]:
        """Fetch the active Slack integration for a workspace."""
        try:
            result = (
                supabase.table("slack_integrations")
                .select("*")
                .eq("workspace_id", workspace_id)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
            data = getattr(result, "data", [])
            return data[0] if data else None
        except Exception as e:
            logger.error(f"Error fetching Slack integration: {e}")
            return None

    @staticmethod
    def _build_message(event_type: EventType, payload: Any):
        """Return (fallback_text, blocks) for a given event."""
        p = payload if isinstance(payload, dict) else (
            payload.model_dump() if hasattr(payload, "model_dump") else {}
        )

        label = _EVENT_LABELS.get(event_type, event_type.value)
        frontend_url = getattr(settings, "FRONTEND_URL", "")

        # ── PRD Events ──
        if event_type == EventType.PRD_COMPLETED:
            blocks = build_prd_notification_blocks(
                prd_title=p.get("title", "Untitled PRD"),
                quality_score=p.get("quality_score"),
                features_count=p.get("features_count", 0),
                prd_id=p.get("prd_id"),
                frontend_url=frontend_url,
            )
            return f"PRD Generated: {p.get('title', 'Untitled')}", blocks

        if event_type == EventType.PRD_REVIEW_REQUESTED:
            text = f":mag: *PRD Review Requested*\n*{p.get('title', 'Untitled')}*"
            blocks = [
                {"type": "section", "text": {"type": "mrkdwn", "text": text}},
            ]
            if p.get("prd_id"):
                blocks.append({
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": ":eyes: Review PRD", "emoji": True},
                            "action_id": "view_prd",
                            "value": p["prd_id"],
                        }
                    ],
                })
            return f"PRD Review Requested: {p.get('title')}", blocks

        # ── Story Events ──
        if event_type == EventType.STORY_ASSIGNED:
            blocks = build_story_update_blocks(
                story_title=p.get("title", ""),
                story_key=p.get("issue_key", ""),
                status="Assigned",
                assignee=p.get("assignee_name"),
                priority=p.get("priority"),
            )
            fallback = f"Story {p.get('issue_key')} assigned to {p.get('assignee_name', 'someone')}"
            return fallback, blocks

        if event_type == EventType.STORY_STATUS_CHANGED:
            blocks = build_story_update_blocks(
                story_title=p.get("title", ""),
                story_key=p.get("issue_key", ""),
                status=p.get("new_status", ""),
                assignee=p.get("assignee_name"),
                priority=p.get("priority"),
            )
            fallback = f"Story {p.get('issue_key')} → {p.get('new_status')}"
            return fallback, blocks

        # ── Sprint Events ──
        if event_type == EventType.SPRINT_STARTED:
            blocks = build_sprint_summary_blocks(
                sprint_name=p.get("sprint_name", "Sprint"),
                event="started",
                total_stories=p.get("total_stories", 0),
                team_name=p.get("team_name"),
            )
            return f"Sprint Started: {p.get('sprint_name')}", blocks

        if event_type == EventType.SPRINT_COMPLETED:
            blocks = build_sprint_summary_blocks(
                sprint_name=p.get("sprint_name", "Sprint"),
                event="completed",
                total_stories=p.get("total_stories", 0),
                completed_stories=p.get("completed_stories", 0),
                team_name=p.get("team_name"),
            )
            return f"Sprint Completed: {p.get('sprint_name')}", blocks

        # ── Epic Created ──
        if event_type == EventType.EPIC_CREATED:
            text = (
                f":bookmark: *New Epic Created*\n"
                f"*{p.get('title', 'Untitled')}*\n"
                f"Stories: {p.get('stories_count', 0)}"
            )
            return f"Epic Created: {p.get('title')}", [
                {"type": "section", "text": {"type": "mrkdwn", "text": text}}
            ]

        # ── Comment Added ──
        if event_type == EventType.COMMENT_ADDED:
            text = (
                f":speech_balloon: *New Comment on [{p.get('issue_key', '')}]*\n"
                f"By _{p.get('author_name', 'Unknown')}_\n"
                f"> {p.get('comment_text', '')[:200]}"
            )
            return f"Comment on {p.get('issue_key')}", [
                {"type": "section", "text": {"type": "mrkdwn", "text": text}}
            ]

        # ── Team Member Joined ──
        if event_type == EventType.TEAM_MEMBER_JOINED:
            text = (
                f":wave: *{p.get('member_name') or p.get('member_email')}* "
                f"joined team *{p.get('team_name', '')}*"
            )
            return text, [{"type": "section", "text": {"type": "mrkdwn", "text": text}}]

        # ── Integration Events ──
        if event_type == EventType.INTEGRATION_CONNECTED:
            text = f":link: *{p.get('integration_type', 'Integration')}* connected successfully"
            return text, [{"type": "section", "text": {"type": "mrkdwn", "text": text}}]

        if event_type == EventType.INTEGRATION_ERROR:
            text = (
                f":warning: *{p.get('integration_type', 'Integration')} Error*\n"
                f"{p.get('error_message', 'Unknown error')}"
            )
            return text, [{"type": "section", "text": {"type": "mrkdwn", "text": text}}]

        # ── Fallback ──
        return f"{label}: {str(p)[:200]}", None
