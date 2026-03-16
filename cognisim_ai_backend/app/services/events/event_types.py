# services/events/event_types.py
"""
Enumeration of all system events that can be dispatched via the event bus.
"""

from enum import Enum


class EventType(str, Enum):
    """System event types for the notification dispatch engine."""

    # PRD Events
    PRD_COMPLETED = "prd_completed"
    PRD_REVIEW_REQUESTED = "prd_review_requested"

    # Story / Issue Events
    STORY_ASSIGNED = "story_assigned"
    STORY_STATUS_CHANGED = "story_status_changed"

    # Sprint Events
    SPRINT_STARTED = "sprint_started"
    SPRINT_COMPLETED = "sprint_completed"

    # Epic Events
    EPIC_CREATED = "epic_created"

    # Comment Events
    COMMENT_ADDED = "comment_added"

    # Team Events
    TEAM_MEMBER_JOINED = "team_member_joined"

    # Integration Events
    INTEGRATION_CONNECTED = "integration_connected"
    INTEGRATION_DISCONNECTED = "integration_disconnected"
    INTEGRATION_ERROR = "integration_error"
