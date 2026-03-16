"""Agent Configuration Models

Models for enterprise agent customization - allowing workspaces to customize
agent instructions, prompts, and behavior.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


class AgentType(str, Enum):
    """Available agent types."""
    EPIC_DECOMPOSER = "epic_decomposer"
    PRD_GENERATOR = "prd_generator"


class AgentConfigBase(BaseModel):
    """Base agent configuration."""
    agent_type: AgentType = Field(..., description="Type of agent")
    name: str = Field(..., min_length=1, max_length=100, description="Custom name for this configuration")
    description: Optional[str] = Field(None, max_length=500, description="Description of this configuration")
    is_default: bool = Field(default=False, description="Whether this is the default configuration")
    is_active: bool = Field(default=True, description="Whether this configuration is active")


class AgentInstructionsConfig(BaseModel):
    """Custom instructions for an agent."""
    system_prompt_prefix: Optional[str] = Field(
        default=None, 
        max_length=2000,
        description="Text to prepend to the system prompt"
    )
    system_prompt_suffix: Optional[str] = Field(
        default=None, 
        max_length=2000,
        description="Text to append to the system prompt"
    )
    custom_instructions: Optional[str] = Field(
        default=None, 
        max_length=5000,
        description="Custom instructions to include in agent prompts"
    )
    output_format_override: Optional[str] = Field(
        default=None, 
        max_length=2000,
        description="Custom output format instructions"
    )
    
    # Tone and style
    tone: Optional[str] = Field(
        default=None,
        description="Preferred tone (professional, casual, technical, etc.)"
    )
    language: Optional[str] = Field(
        default="en",
        description="Output language code"
    )
    
    # Domain-specific context
    industry_context: Optional[str] = Field(
        default=None, 
        max_length=1000,
        description="Industry-specific context (e.g., fintech, healthcare, e-commerce)"
    )
    company_context: Optional[str] = Field(
        default=None, 
        max_length=1000,
        description="Company-specific context and terminology"
    )
    glossary: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="Domain-specific glossary of terms"
    )


class EpicDecomposerConfig(BaseModel):
    """Specific configuration for Epic Decomposer agent."""
    min_stories: int = Field(default=3, ge=1, le=20, description="Minimum stories to generate")
    max_stories: int = Field(default=12, ge=3, le=30, description="Maximum stories to generate")
    default_stories: int = Field(default=6, ge=3, le=15, description="Default number of stories")
    
    # Story format preferences
    story_title_format: Optional[str] = Field(
        default=None,
        description="Preferred story title format (e.g., 'As a [persona], I want to [action]')"
    )
    acceptance_criteria_format: Optional[str] = Field(
        default="given_when_then",
        description="AC format: given_when_then, bullet_points, or custom"
    )
    min_acceptance_criteria: int = Field(default=3, ge=1, le=10)
    max_acceptance_criteria: int = Field(default=6, ge=3, le=15)
    
    # Include/exclude features
    include_risks: bool = Field(default=True, description="Include risk assessment")
    include_story_points: bool = Field(default=False, description="Include story point estimates")
    include_dependencies: bool = Field(default=False, description="Include dependency analysis")
    
    # Persona preferences
    default_personas: List[str] = Field(
        default_factory=lambda: ["User", "Admin", "System"],
        description="Default personas to consider"
    )


class PRDGeneratorConfig(BaseModel):
    """Specific configuration for PRD Generator agent."""
    template_version: str = Field(default="1.0", description="PRD template version")
    
    # Section preferences
    include_executive_summary: bool = Field(default=True)
    include_personas: bool = Field(default=True)
    include_user_journeys: bool = Field(default=True)
    include_features: bool = Field(default=True)
    include_technical_requirements: bool = Field(default=True)
    include_risks: bool = Field(default=True)
    include_timeline: bool = Field(default=True)
    include_success_metrics: bool = Field(default=True)
    
    # Feature preferences
    min_features: int = Field(default=5, ge=3, le=15)
    max_features: int = Field(default=15, ge=5, le=30)
    default_max_features: int = Field(default=10, ge=5, le=20)
    
    # Persona preferences
    min_personas: int = Field(default=2, ge=1, le=5)
    max_personas: int = Field(default=5, ge=2, le=10)
    
    # Risk categories to include
    risk_categories: List[str] = Field(
        default_factory=lambda: ["Technical", "Business", "Security", "Timeline", "Resource"],
        description="Risk categories to analyze"
    )
    
    # Export preferences
    default_export_format: str = Field(default="markdown", description="Default export format")
    include_table_of_contents: bool = Field(default=True)
    include_version_history: bool = Field(default=True)


class AgentConfigCreate(AgentConfigBase):
    """Create a new agent configuration."""
    instructions: AgentInstructionsConfig = Field(default_factory=AgentInstructionsConfig)
    epic_decomposer_config: Optional[EpicDecomposerConfig] = None
    prd_generator_config: Optional[PRDGeneratorConfig] = None


class AgentConfigUpdate(BaseModel):
    """Update an agent configuration."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None
    instructions: Optional[AgentInstructionsConfig] = None
    epic_decomposer_config: Optional[EpicDecomposerConfig] = None
    prd_generator_config: Optional[PRDGeneratorConfig] = None


class AgentConfigResponse(AgentConfigBase):
    """Agent configuration response."""
    id: UUID
    workspace_id: UUID
    instructions: AgentInstructionsConfig
    epic_decomposer_config: Optional[EpicDecomposerConfig] = None
    prd_generator_config: Optional[PRDGeneratorConfig] = None
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    
    class Config:
        from_attributes = True


class AgentConfigListResponse(BaseModel):
    """List of agent configurations."""
    items: List[AgentConfigResponse]
    total: int
