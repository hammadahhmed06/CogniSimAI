"""PRD Generator Models

Pydantic models for the PRD (Product Requirements Document) generation system.
Includes input validation, section outputs, and complete document structure.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from uuid import UUID
import re

from pydantic import BaseModel, Field, field_validator


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class PRDSection(str, Enum):
    """PRD section identifiers."""
    EXECUTIVE_SUMMARY = "executive_summary"
    PERSONAS = "personas"
    FEATURES = "features"
    TECHNICAL = "technical"
    RISKS = "risks"
    TIMELINE = "timeline"


class PRDStatus(str, Enum):
    """PRD document lifecycle status."""
    DRAFT = "draft"
    GENERATING = "generating"
    IN_REVIEW = "in_review"
    CHANGES_REQUESTED = "changes_requested"
    APPROVED = "approved"
    ARCHIVED = "archived"


class Priority(str, Enum):
    """Feature priority levels."""
    P0 = "P0"  # Must have
    P1 = "P1"  # Should have
    P2 = "P2"  # Nice to have
    P3 = "P3"  # Future consideration


class RiskCategory(str, Enum):
    """Risk classification categories."""
    TECHNICAL = "Technical"
    BUSINESS = "Business"
    OPERATIONAL = "Operational"
    SECURITY = "Security"


class RiskLevel(str, Enum):
    """Risk probability/impact levels."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class ExportFormat(str, Enum):
    """Supported export formats."""
    MARKDOWN = "markdown"
    PDF = "pdf"
    JIRA = "jira"
    JSON = "json"


# ═══════════════════════════════════════════════════════════════════════════════
# INPUT MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class TargetUser(BaseModel):
    """Target user type for the PRD."""
    role: str = Field(..., description="User role (e.g., 'Product Manager', 'Developer')")
    description: Optional[str] = Field(None, description="Additional context about this user type")


class PRDInput(BaseModel):
    """Input for PRD generation request."""
    problem_statement: str = Field(
        ...,
        min_length=50,
        max_length=5000,
        description="Detailed problem statement describing the user pain points"
    )
    target_users: Union[str, List[str]] = Field(
        ...,
        description="Target user types - can be a string (comma/newline separated) or list"
    )
    constraints: Optional[str] = Field(
        None,
        max_length=2000,
        description="Known constraints, budget, timeline, technical limitations"
    )
    product_name: Optional[str] = Field(
        None,
        max_length=100,
        description="Name of the product/feature being specified"
    )
    template_version: str = Field(
        default="1.0",
        description="PRD template version to use"
    )
    
    # Optional context sources
    jira_epic_key: Optional[str] = Field(
        None,
        description="Jira epic key to fetch additional context"
    )
    slack_channel_ids: Optional[List[str]] = Field(
        None,
        description="Slack channel IDs to query for discussions"
    )
    github_repo: Optional[str] = Field(
        None,
        description="GitHub repository URL for codebase analysis"
    )
    
    @field_validator('target_users', mode='before')
    @classmethod
    def parse_target_users(cls, v):
        """Convert string to list if needed."""
        if isinstance(v, str):
            # Split by newlines, commas, or bullet points
            users = re.split(r'[\n,;•\-]+', v)
            users = [u.strip() for u in users if u.strip()]
            if len(users) < 2:
                # If splitting didn't give us enough, treat as single user description
                users = [v.strip()] if v.strip() else []
            return users
        return v
    
    # Generation preferences
    max_features: int = Field(
        default=10,
        ge=3,
        le=25,
        description="Maximum number of features to generate"
    )
    include_technical_details: bool = Field(
        default=True,
        description="Whether to include technical requirements section"
    )
    
    @field_validator("target_users")
    @classmethod
    def validate_target_users(cls, v: List[str]) -> List[str]:
        """Ensure at least 2 unique target users."""
        unique_users = list(set(u.strip() for u in v if u.strip()))
        if len(unique_users) < 2:
            raise ValueError("At least 2 unique target user types are required")
        return unique_users


class PRDRegenerateRequest(BaseModel):
    """Request to regenerate a specific PRD section."""
    feedback: Optional[str] = Field(
        None,
        max_length=1000,
        description="User feedback to guide regeneration"
    )
    preserve_parts: Optional[List[str]] = Field(
        None,
        description="IDs of parts to preserve (e.g., persona IDs)"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION OUTPUT MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class SuccessMetric(BaseModel):
    """A measurable success metric."""
    name: str = Field(..., description="Metric name")
    target: str = Field(..., description="Target value")
    measurement: str = Field(..., description="How to measure")


class ExecutiveSummary(BaseModel):
    """Executive summary section of the PRD."""
    vision: str = Field(
        ...,
        min_length=50,
        description="Product vision statement (2-3 sentences)"
    )
    problem_statement: str = Field(
        ...,
        min_length=100,
        description="Detailed problem description with user pain points"
    )
    solution_overview: str = Field(
        ...,
        min_length=100,
        description="High-level solution approach"
    )
    key_objectives: List[str] = Field(
        ...,
        min_length=3,
        max_length=7,
        description="3-7 key objectives for the product"
    )
    success_metrics: List[SuccessMetric] = Field(
        ...,
        min_length=2,
        description="Measurable success criteria"
    )
    target_release: Optional[str] = Field(
        None,
        description="Target release timeframe"
    )


class UserPersona(BaseModel):
    """User persona definition."""
    id: str = Field(..., description="Unique persona ID (e.g., 'persona_1')")
    name: str = Field(
        ...,
        description="Persona name with role (e.g., 'Sarah - Product Owner')"
    )
    role: str = Field(..., description="Job title and organizational context")
    background: Optional[str] = Field(
        None,
        description="Brief background and experience level"
    )
    goals: List[str] = Field(
        ...,
        min_length=2,
        max_length=5,
        description="2-5 primary goals"
    )
    pain_points: List[str] = Field(
        ...,
        min_length=2,
        max_length=5,
        description="2-5 key pain points"
    )
    use_cases: List[str] = Field(
        ...,
        min_length=2,
        max_length=5,
        description="2-5 primary use cases"
    )
    tech_proficiency: str = Field(
        default="Medium",
        description="Technical proficiency level (Low/Medium/High)"
    )
    success_criteria: Optional[str] = Field(
        None,
        description="What success looks like for this persona"
    )


class PersonasOutput(BaseModel):
    """Output from personas agent."""
    personas: List[UserPersona] = Field(
        ...,
        min_length=2,
        max_length=6,
        description="2-6 user personas"
    )


class AcceptanceCriterion(BaseModel):
    """Single acceptance criterion."""
    id: str = Field(..., description="Criterion ID (e.g., 'AC1')")
    description: str = Field(..., description="Testable acceptance criterion")
    given: Optional[str] = Field(None, description="Given condition (BDD)")
    when: Optional[str] = Field(None, description="When action (BDD)")
    then: Optional[str] = Field(None, description="Then outcome (BDD)")


class FeatureSpec(BaseModel):
    """Feature specification."""
    id: str = Field(..., description="Feature ID (e.g., 'F1', 'F2')")
    title: str = Field(..., description="Feature title")
    description: str = Field(
        ...,
        min_length=50,
        description="Detailed feature description"
    )
    priority: Priority = Field(..., description="Feature priority (P0-P3)")
    user_value: str = Field(
        ...,
        description="Business value delivered to users"
    )
    target_personas: List[str] = Field(
        ...,
        min_length=1,
        description="Persona IDs this feature serves"
    )
    acceptance_criteria: List[str] = Field(
        ...,
        min_length=3,
        max_length=8,
        description="3-8 testable acceptance criteria"
    )
    dependencies: Optional[List[str]] = Field(
        None,
        description="Feature IDs this depends on"
    )
    estimated_effort: Optional[str] = Field(
        None,
        description="Rough effort estimate (e.g., 'S', 'M', 'L', 'XL')"
    )
    out_of_scope: Optional[List[str]] = Field(
        None,
        description="Explicitly out of scope items"
    )

    @field_validator("out_of_scope", mode="before")
    @classmethod
    def coerce_out_of_scope(cls, v):
        """Accept either a list of strings or a single string.

        Some LLM outputs produce `out_of_scope` as a single sentence.
        Normalize to a list to keep downstream handling consistent.
        """
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return None
            # Split on newlines/commas/semicolons/bullets when present, otherwise wrap.
            parts = re.split(r"[\n,;•]+", s)
            items = [p.strip() for p in parts if p.strip()]
            return items if items else [s]
        return v


class FeaturesOutput(BaseModel):
    """Output from feature spec agent."""
    features: List[FeatureSpec] = Field(
        ...,
        min_length=3,
        description="Feature specifications"
    )


class Integration(BaseModel):
    """External system integration."""
    name: str = Field(..., description="Integration name")
    type: str = Field(..., description="Integration type (API, Webhook, SDK, etc.)")
    description: str = Field(..., description="Integration purpose")
    requirements: List[str] = Field(..., description="Integration requirements")


class TechnicalRequirements(BaseModel):
    """Technical requirements section."""
    architecture_overview: str = Field(
        ...,
        # NOTE: Keep validation permissive so streaming generation doesn't fail
        # when the agent returns placeholder content. Quality is handled separately.
        min_length=1,
        description="High-level architecture description"
    )
    integrations: List[Integration] = Field(
        default_factory=list,
        description="External system integrations"
    )
    performance_requirements: List[str] = Field(
        ...,
        min_length=1,
        description="Performance requirements and SLAs"
    )
    security_requirements: List[str] = Field(
        ...,
        min_length=1,
        description="Security requirements"
    )
    scalability_considerations: List[str] = Field(
        ...,
        min_length=1,
        description="Scalability requirements"
    )
    tech_stack_recommendations: List[str] = Field(
        default_factory=list,
        description="Recommended technology stack"
    )
    data_requirements: List[str] = Field(
        default_factory=list,
        description="Data storage and handling requirements"
    )
    api_specifications: str = Field(
        default="",
        description="API design considerations"
    )


class RiskItem(BaseModel):
    """Risk assessment item."""
    id: str = Field(..., description="Risk ID (e.g., 'R1')")
    category: RiskCategory = Field(..., description="Risk category")
    title: str = Field(..., description="Risk title")
    description: str = Field(..., description="Detailed risk description")
    probability: RiskLevel = Field(..., description="Probability of occurrence")
    impact: RiskLevel = Field(..., description="Impact if occurs")
    mitigation: str = Field(..., description="Mitigation strategy")
    contingency: Optional[str] = Field(
        None,
        description="Contingency plan if risk materializes"
    )
    owner: Optional[str] = Field(
        None,
        description="Risk owner role"
    )


class RisksOutput(BaseModel):
    """Output from risk assessment agent."""
    risks: List[RiskItem] = Field(
        ...,
        min_length=3,
        description="Identified risks"
    )


class TimelinePhase(BaseModel):
    """Implementation timeline phase."""
    phase: str = Field(..., description="Phase name (e.g., 'Phase 1: Foundation')")
    duration: str = Field(..., description="Duration (e.g., '2 weeks')")
    objectives: List[str] = Field(
        ...,
        min_length=1,
        description="Phase objectives"
    )
    deliverables: List[str] = Field(
        ...,
        min_length=1,
        description="Expected deliverables"
    )
    dependencies: Optional[List[str]] = Field(
        None,
        description="Dependencies from previous phases"
    )
    milestones: Optional[List[str]] = Field(
        None,
        description="Key milestones"
    )

    @field_validator("dependencies", "milestones", mode="before")
    @classmethod
    def coerce_string_list_fields(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return None
            parts = re.split(r"[\n,;•]+", s)
            items = [p.strip() for p in parts if p.strip()]
            return items if items else [s]
        return v


class TimelineOutput(BaseModel):
    """Output from timeline agent."""
    phases: List[TimelinePhase] = Field(
        ...,
        min_length=2,
        description="Implementation phases"
    )
    total_duration: str = Field(..., description="Total estimated duration")
    critical_path: Optional[List[str]] = Field(
        None,
        description="Critical path items"
    )

    @field_validator("critical_path", mode="before")
    @classmethod
    def coerce_critical_path(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return None
            parts = re.split(r"[\n,;•]+", s)
            items = [p.strip() for p in parts if p.strip()]
            return items if items else [s]
        return v


# ═══════════════════════════════════════════════════════════════════════════════
# COMPLETE PRD DOCUMENT
# ═══════════════════════════════════════════════════════════════════════════════

class PRDSections(BaseModel):
    """All PRD sections combined."""
    executive_summary: Optional[ExecutiveSummary] = None
    personas: Optional[List[UserPersona]] = None
    features: Optional[List[FeatureSpec]] = None
    technical: Optional[TechnicalRequirements] = None
    risks: Optional[List[RiskItem]] = None
    timeline: Optional[List[TimelinePhase]] = None


class PRDDocument(BaseModel):
    """Complete PRD document."""
    id: Optional[UUID] = Field(default=None, description="Document ID")
    template_version: str = Field(default="1.0")
    status: PRDStatus = Field(default=PRDStatus.DRAFT)
    title: Optional[str] = Field(default=None, description="PRD title")
    
    # Input that generated this PRD
    input: Optional[PRDInput] = None
    
    # Generated sections
    sections: PRDSections = Field(default_factory=PRDSections)
    
    # Quality and metadata
    quality_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Overall quality score (0-100)"
    )
    section_scores: Optional[Dict[str, float]] = Field(
        default=None,
        description="Quality scores per section"
    )
    warnings: List[str] = Field(default_factory=list)
    
    # Audit fields
    workspace_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    
    # Run tracking
    run_id: Optional[UUID] = None
    generation_time_ms: Optional[int] = None
    tokens_used: Optional[int] = None


# ═══════════════════════════════════════════════════════════════════════════════
# STREAMING EVENT MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class PRDStreamEvent(BaseModel):
    """Streaming event for PRD generation progress."""
    type: str = Field(
        ...,
        description="Event type: progress, section_start, section_complete, error, complete"
    )
    stage: Optional[str] = Field(
        default=None,
        description="Current generation stage"
    )
    section: Optional[PRDSection] = Field(
        default=None,
        description="Section being processed"
    )
    percent: Optional[int] = Field(
        default=None,
        ge=0,
        le=100,
        description="Progress percentage"
    )
    message: Optional[str] = Field(
        default=None,
        description="Human-readable progress message"
    )
    data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Section data when complete"
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if type is 'error'"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# COHERENCE REVIEW MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class CoherenceIssue(BaseModel):
    """Issue found during coherence review."""
    severity: str = Field(..., description="low, medium, high")
    section: PRDSection = Field(..., description="Affected section")
    description: str = Field(..., description="Issue description")
    suggestion: str = Field(..., description="Suggested fix")
    related_sections: Optional[List[PRDSection]] = Field(
        None,
        description="Other sections involved"
    )


class CoherenceReview(BaseModel):
    """Output from coherence review agent."""
    overall_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Overall coherence score"
    )
    issues: List[CoherenceIssue] = Field(
        default_factory=list,
        description="Identified issues"
    )
    suggestions: List[str] = Field(
        default_factory=list,
        description="General improvement suggestions"
    )
    passed: bool = Field(
        ...,
        description="Whether document passes coherence check"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class SectionDefinition(BaseModel):
    """Definition of a PRD section in a template."""
    id: str
    name: str
    description: str
    required: bool = True
    order: int
    min_items: Optional[int] = None
    max_items: Optional[int] = None


class PRDTemplate(BaseModel):
    """PRD template definition."""
    version: str
    name: str
    description: str
    created_at: datetime
    deprecated_at: Optional[datetime] = None
    
    # Section definitions
    sections: List[SectionDefinition]
    required_sections: List[str]
    
    # Validation rules
    min_personas: int = 2
    min_features: int = 3
    min_acceptance_criteria_per_feature: int = 3
    
    # Compliance metadata
    compliance_standards: List[str] = Field(default_factory=list)
    audit_fields: List[str] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXT MODELS (for tool outputs)
# ═══════════════════════════════════════════════════════════════════════════════

class JiraContext(BaseModel):
    """Context fetched from Jira."""
    epic_key: str
    epic_summary: str
    epic_description: Optional[str] = None
    child_issues: List[Dict[str, Any]] = Field(default_factory=list)
    comments: List[str] = Field(default_factory=list)
    labels: List[str] = Field(default_factory=list)


class SlackContext(BaseModel):
    """Context fetched from Slack."""
    threads: List[Dict[str, Any]] = Field(default_factory=list)
    participants: List[str] = Field(default_factory=list)


class WebSearchResult(BaseModel):
    """Web search result."""
    title: str
    url: str
    snippet: str


class EnrichedContext(BaseModel):
    """Combined context from all sources."""
    jira: Optional[JiraContext] = None
    slack: Optional[SlackContext] = None
    web_search: List[WebSearchResult] = Field(default_factory=list)
    codebase_analysis: Optional[Dict[str, Any]] = None


# ═══════════════════════════════════════════════════════════════════════════════
# API RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class PRDSummary(BaseModel):
    """Summary of a PRD for list views."""
    id: UUID
    title: Optional[str]
    status: PRDStatus
    quality_score: Optional[float]
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: Optional[UUID]
    section_count: int = 0


class PRDListResponse(BaseModel):
    """Response for PRD list endpoint."""
    items: List[PRDSummary]
    total: int
    page: int
    page_size: int


class MigrationChange(BaseModel):
    """A change made during template migration."""
    section: str
    field: str
    change_type: str  # added, removed, modified
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None


class MigrationResult(BaseModel):
    """Result of a template migration."""
    success: bool
    from_version: str
    to_version: str
    changes: List[MigrationChange] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    dry_run: bool = False
