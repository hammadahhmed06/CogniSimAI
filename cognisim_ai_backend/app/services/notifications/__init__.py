# services/notifications/__init__.py
"""
Notification Dispatcher System.

Routes system events to the appropriate notification channels:
  - Slack (rich Block Kit messages)
  - Email (HTML templates)
  - In-app (database notifications)

All handlers are auto-registered with the event bus on import.
"""

from .notification_service import NotificationService, notification_service
from .slack_notifier import SlackNotifier
from .inapp_notifier import InAppNotifier
from .email_notifier import EmailNotifier

__all__ = [
    "NotificationService",
    "notification_service",
    "SlackNotifier",
    "InAppNotifier",
    "EmailNotifier",
]
