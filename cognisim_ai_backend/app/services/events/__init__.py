# services/events/__init__.py
"""
Event Bus System for CogniSim AI.

Provides an in-process async event bus for dispatching system events
to registered handlers (Slack notifications, email notifications,
in-app notifications, audit logging, etc.).

Usage:
    from app.services.events import event_bus, EventType

    # Emit an event (fire-and-forget via FastAPI BackgroundTasks)
    event_bus.emit(EventType.PRD_COMPLETED, {
        "workspace_id": "...",
        "prd_id": "...",
        "title": "...",
    })

    # Register a handler
    @event_bus.on(EventType.PRD_COMPLETED)
    async def handle_prd_completed(payload):
        ...
"""

from .event_types import EventType
from .event_bus import EventBus, event_bus
from .event_models import (
    BaseEventPayload,
    PRDCompletedPayload,
    PRDReviewRequestedPayload,
    StoryAssignedPayload,
    StoryStatusChangedPayload,
    SprintStartedPayload,
    SprintCompletedPayload,
    EpicCreatedPayload,
    IntegrationConnectedPayload,
    IntegrationErrorPayload,
    CommentAddedPayload,
    TeamMemberJoinedPayload,
)

__all__ = [
    "EventType",
    "EventBus",
    "event_bus",
    "BaseEventPayload",
    "PRDCompletedPayload",
    "PRDReviewRequestedPayload",
    "StoryAssignedPayload",
    "StoryStatusChangedPayload",
    "SprintStartedPayload",
    "SprintCompletedPayload",
    "EpicCreatedPayload",
    "IntegrationConnectedPayload",
    "IntegrationErrorPayload",
    "CommentAddedPayload",
    "TeamMemberJoinedPayload",
]
