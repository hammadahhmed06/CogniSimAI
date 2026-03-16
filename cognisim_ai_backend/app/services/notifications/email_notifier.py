# services/notifications/email_notifier.py
"""
Sends email notifications for important events using the existing
email_service module.
"""

import logging
from typing import Any, Optional

from app.core.dependencies import supabase
from app.services.events.event_types import EventType

logger = logging.getLogger("cognisim_ai")

# Which event types warrant an email
_EMAIL_WORTHY = {
    EventType.PRD_COMPLETED,
    EventType.PRD_REVIEW_REQUESTED,
    EventType.SPRINT_COMPLETED,
    EventType.INTEGRATION_ERROR,
}


class EmailNotifier:
    """Sends email notifications for high-priority system events."""

    @staticmethod
    async def send(
        event_type: EventType,
        payload: Any,
        workspace_id: str,
    ):
        """
        Only fires for events in ``_EMAIL_WORTHY``.  Looks up workspace
        owner / relevant user's email and dispatches via SMTP.
        """
        if event_type not in _EMAIL_WORTHY:
            return

        p = payload if isinstance(payload, dict) else (
            payload.model_dump() if hasattr(payload, "model_dump") else {}
        )

        try:
            from app.services.email_service import send_email, EmailMessage
        except ImportError:
            logger.debug("email_service not available — skipping email notification")
            return

        # Determine recipient
        recipient = EmailNotifier._get_recipient(workspace_id, p)
        if not recipient:
            logger.debug(f"No email recipient for workspace {workspace_id}")
            return

        subject, html = EmailNotifier._build_email(event_type, p)
        if not subject:
            return

        try:
            msg = EmailMessage(to=recipient, subject=subject, html=html or "")
            send_email(msg)
            logger.info(f"Email notification sent: {event_type.value} → {recipient}")
        except Exception as e:
            logger.error(f"Email notification failed: {e}")

    @staticmethod
    def _get_recipient(workspace_id: str, p: dict) -> Optional[str]:
        """Resolve recipient email from payload or workspace owner."""
        # If payload explicitly targets a user
        user_id = p.get("user_id") or p.get("assignee_id")
        if user_id:
            try:
                result = (
                    supabase.table("profiles")
                    .select("email")
                    .eq("id", user_id)
                    .limit(1)
                    .execute()
                )
                data = getattr(result, "data", [])
                if data and data[0].get("email"):
                    return data[0]["email"]
            except Exception:
                pass

        # Fallback: workspace owner
        try:
            result = (
                supabase.table("workspaces")
                .select("owner_id")
                .eq("id", workspace_id)
                .limit(1)
                .execute()
            )
            data = getattr(result, "data", [])
            if data:
                owner_id = data[0].get("owner_id")
                if owner_id:
                    profile = (
                        supabase.table("profiles")
                        .select("email")
                        .eq("id", owner_id)
                        .limit(1)
                        .execute()
                    )
                    pdata = getattr(profile, "data", [])
                    if pdata and pdata[0].get("email"):
                        return pdata[0]["email"]
        except Exception:
            pass

        return None

    @staticmethod
    def _build_email(event_type: EventType, p: dict):
        """Return (subject, html_body) for a notification email."""
        frontend_url = ""
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, "FRONTEND_URL", "")
        except Exception:
            pass

        if event_type == EventType.PRD_COMPLETED:
            subject = f"PRD Generated: {p.get('title', 'Untitled')}"
            html = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #6366f1;">PRD Generated Successfully</h2>
                <p>Your PRD <strong>{p.get('title', 'Untitled')}</strong> has been generated.</p>
                {"<p>Quality Score: <strong>" + str(p.get('quality_score')) + "%</strong></p>" if p.get('quality_score') else ""}
                <p>Features: {p.get('features_count', 0)}</p>
                {f'<a href="{frontend_url}/dashboard/prd/{p.get("prd_id")}" style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">View PRD</a>' if p.get('prd_id') and frontend_url else ''}
                <p style="color: #888; font-size: 12px; margin-top: 24px;">— CogniSim AI</p>
            </div>
            """
            return subject, html

        if event_type == EventType.PRD_REVIEW_REQUESTED:
            subject = f"PRD Review Requested: {p.get('title', 'Untitled')}"
            html = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">PRD Review Requested</h2>
                <p>A PRD is awaiting your review: <strong>{p.get('title', 'Untitled')}</strong></p>
                {f'<a href="{frontend_url}/dashboard/prd/{p.get("prd_id")}" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">Review PRD</a>' if p.get('prd_id') and frontend_url else ''}
                <p style="color: #888; font-size: 12px; margin-top: 24px;">— CogniSim AI</p>
            </div>
            """
            return subject, html

        if event_type == EventType.SPRINT_COMPLETED:
            subject = f"Sprint Completed: {p.get('sprint_name', 'Sprint')}"
            html = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">Sprint Completed</h2>
                <p>Sprint <strong>{p.get('sprint_name', '')}</strong> has been completed.</p>
                <p>Stories completed: {p.get('completed_stories', 0)} / {p.get('total_stories', 0)}</p>
                <p style="color: #888; font-size: 12px; margin-top: 24px;">— CogniSim AI</p>
            </div>
            """
            return subject, html

        if event_type == EventType.INTEGRATION_ERROR:
            subject = f"Integration Error: {p.get('integration_type', 'Unknown')}"
            html = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ef4444;">Integration Error</h2>
                <p>An error occurred with <strong>{p.get('integration_type', 'an integration')}</strong>:</p>
                <p style="background: #fef2f2; padding: 12px; border-radius: 6px;">{p.get('error_message', 'Unknown error')}</p>
                <p style="color: #888; font-size: 12px; margin-top: 24px;">— CogniSim AI</p>
            </div>
            """
            return subject, html

        return None, None
