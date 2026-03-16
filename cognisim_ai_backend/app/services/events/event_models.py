# services/events/event_models.py
"""
Pydantic models for event payloads.
Each event type has a corresponding model to ensure type safety.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class BaseEventPayload(BaseModel):
    """Base payload included with every event."""
    workspace_id: str
    triggered_by: Optional[str] = None  # user_id of the actor
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PRDCompletedPayload(BaseEventPayload):
    """Emitted when a PRD generation completes."""
    prd_id: str
    title: str
    quality_score: Optional[float] = None
    features_count: int = 0
    project_id: Optional[str] = None


class PRDReviewRequestedPayload(BaseEventPayload):
    """Emitted when a PRD review is requested."""
    prd_id: str
    title: str
    requested_by: Optional[str] = None
    reviewer_ids: List[str] = Field(default_factory=list)


class StoryAssignedPayload(BaseEventPayload):
    """Emitted when a story/issue is assigned to someone."""
    issue_id: str
    issue_key: str
    title: str
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    assigned_by: Optional[str] = None
    project_id: Optional[str] = None


class StoryStatusChangedPayload(BaseEventPayload):
    """Emitted when a story's status changes."""
    issue_id: str
    issue_key: str
    title: str
    old_status: str
    new_status: str
    changed_by: Optional[str] = None
    priority: Optional[str] = None
    assignee_name: Optional[str] = None


class SprintStartedPayload(BaseEventPayload):
    """Emitted when a sprint is started."""
    sprint_id: str
    sprint_name: str
    total_stories: int = 0
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class SprintCompletedPayload(BaseEventPayload):
    """Emitted when a sprint is completed."""
    sprint_id: str
    sprint_name: str
    total_stories: int = 0
    completed_stories: int = 0
    team_id: Optional[str] = None
    team_name: Optional[str] = None


class EpicCreatedPayload(BaseEventPayload):
    """Emitted when a new epic is created."""
    epic_id: str
    title: str
    description: Optional[str] = None
    stories_count: int = 0
    project_id: Optional[str] = None


class CommentAddedPayload(BaseEventPayload):
    """Emitted when a comment is added to an issue."""
    issue_id: str
    issue_key: str
    comment_text: str
    author_name: Optional[str] = None
    author_id: Optional[str] = None


class TeamMemberJoinedPayload(BaseEventPayload):
    """Emitted when a new member joins a team."""
    team_id: str
    team_name: str
    member_id: str
    member_email: str
    member_name: Optional[str] = None
    invited_by: Optional[str] = None


class IntegrationConnectedPayload(BaseEventPayload):
    """Emitted when an integration is connected."""
    integration_type: str  # "jira", "github", "slack"
    integration_id: Optional[str] = None
    connected_by: Optional[str] = None


class IntegrationErrorPayload(BaseEventPayload):
    """Emitted when an integration encounters an error."""
    integration_type: str
    error_message: str
    error_code: Optional[str] = None
