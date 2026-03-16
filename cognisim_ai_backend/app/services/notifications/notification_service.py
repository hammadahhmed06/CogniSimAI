# services/notifications/notification_service.py
"""
Central notification dispatcher.
Listens to events from the event bus and routes them to the
appropriate notifier(s) based on workspace/team configuration.
"""

import logging
from typing import Any

from app.services.events.event_types import EventType
from app.services.events.event_bus import event_bus
from app.core.dependencies import supabase

logger = logging.getLogger("cognisim_ai")


class NotificationService:
    """
    Orchestrates notification dispatch across channels.
    Automatically registers handlers with the event bus.
    """

    def __init__(self):
        self._register_handlers()
        logger.info("NotificationService initialised – handlers registered")

    def _register_handlers(self):
        """Register event handlers with the global event bus."""
        # All events flow through a single dispatcher that routes
        # to Slack / email / in-app based on config.
        event_bus.on_all(self._dispatch)

    async def _dispatch(self, event_type: EventType, payload: Any):
        """
        Central dispatch method.  For every event:
          1. Store in-app notification
          2. Send Slack notification (if integration active + enabled)
          3. Send email notification (if user prefs allow)
        """
        if payload is None:
            return

        workspace_id = getattr(payload, "workspace_id", None) or (
            payload.get("workspace_id") if isinstance(payload, dict) else None
        )
        if not workspace_id:
            logger.debug(f"No workspace_id in event {event_type.value} – skipping dispatch")
            return

        logger.info(f"Dispatching {event_type.value} for workspace {workspace_id}")

        # ── 1. In-app notification ──
        try:
            from .inapp_notifier import InAppNotifier
            await InAppNotifier.store(event_type, payload, workspace_id=workspace_id)
        except Exception as e:
            logger.error(f"In-app notification failed: {e}")

        # ── 2. Slack notification ──
        try:
            from .slack_notifier import SlackNotifier
            await SlackNotifier.send(event_type, payload, workspace_id)
        except Exception as e:
            logger.error(f"Slack notification failed: {e}")

        # ── 3. Email notification (best-effort) ──
        # Emails are lower priority; log errors but don't fail the dispatch
        try:
            from .email_notifier import EmailNotifier
            await EmailNotifier.send(event_type, payload, workspace_id)
        except ImportError:
            pass  # email_notifier not yet implemented
        except Exception as e:
            logger.error(f"Email notification failed: {e}")


# Singleton – import triggers handler registration
notification_service = NotificationService()
