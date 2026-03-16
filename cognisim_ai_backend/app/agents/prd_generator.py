"""PRD Generator Multi-Agent System

Enterprise-grade PRD (Product Requirements Document) generation using the OpenAI Agents SDK.

Architecture:
- Uses Agent, Runner from openai-agents SDK
- Multi-agent orchestration with parallel execution
- Specialized agents for each PRD section
- Human-in-the-loop checkpoints
- Streaming progress updates

Agents:
1. Discovery Agent - Market analysis, problem validation, objectives
2. Personas Agent - User personas with pain points, goals, use cases
3. Feature Spec Agent - Features with acceptance criteria
4. Technical Agent - Architecture, integrations, NFRs
5. Risk Timeline Agent - Risk matrix and implementation timeline
6. Coherence Agent - Final review for cross-section consistency
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple, Type, TypeVar

from dotenv import load_dotenv, find_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel, TypeAdapter, ValidationError

# OpenAI Agents SDK imports
from agents import (
    Agent,
    Runner,
    ModelSettings,
    GuardrailFunctionOutput,
    RunContextWrapper,
    TResponseInputItem,
    input_guardrail,
    output_guardrail,
    set_tracing_disabled,
)
from agents.models.openai_chatcompletions import OpenAIChatCompletionsModel

# Local imports
from app.models.prd_models import (
    PRDInput,
    PRDDocument,
    PRDSections,
    PRDSection,
    PRDStatus,
    PRDStreamEvent,
    ExecutiveSummary,
    UserPersona,
    PersonasOutput,
    FeatureSpec,
    FeaturesOutput,
    TechnicalRequirements,
    RiskItem,
    RisksOutput,
    RiskCategory,
    RiskLevel,
    Priority,
    TimelinePhase,
    TimelineOutput,
    CoherenceReview,
    CoherenceIssue,
    EnrichedContext,
)

# Load environment
load_dotenv(find_dotenv())

logger = logging.getLogger("prd_generator")

# Disable tracing since we're not using OpenAI API keys for traces
set_tracing_disabled(True)


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# CONFIGURATION
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Model name - Gemini is the sole provider
GEMINI_MODEL = os.getenv("GEMINI_MODEL_NAME", "models/gemini-3-flash-preview")

# Output hardening: nudge the model to emit only JSON (no markdown, no prose)
STRICT_JSON_ONLY = """

STRICT OUTPUT RULES:
- Output MUST be valid JSON only (no markdown/code fences).
- Do NOT include any extra commentary outside JSON.
- If unsure about a field, use a reasonable placeholder that satisfies schema constraints.
"""

# Generation limits
MAX_PROBLEM_CHARS = 5000
MAX_FEATURES = 25
MIN_PERSONAS = 2
MAX_PERSONAS = 6

# Timeout settings
HTTP_TIMEOUT = float(os.getenv("PRD_HTTP_TIMEOUT", "90"))

# Type variable for generic parsing
T = TypeVar('T', bound=BaseModel)


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ROBUST JSON PARSING & REPAIR
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

def repair_truncated_json(raw: str) -> str:
    """
    Attempt to repair truncated JSON by closing unclosed brackets/braces.
    
    Handles cases where LLM output is cut off due to token limits:
    - Unclosed arrays: [{"a": 1}, {"b": 2  -> [{"a": 1}]
    - Unclosed objects: {"a": 1, "b": 2  -> {"a": 1}
    - Truncated strings: {"a": "hello wo  -> {"a": "hello wo"}
    - Nested structures
    """
    if not raw:
        return raw
    
    # Remove markdown code fences if present
    raw = re.sub(r'^```(?:json)?\s*', '', raw.strip())
    raw = re.sub(r'```\s*$', '', raw.strip())
    
    # Find the start of JSON
    json_start = -1
    for i, c in enumerate(raw):
        if c in '{[':
            json_start = i
            break
    
    if json_start < 0:
        return raw
    
    raw = raw[json_start:]
    
    # Track bracket/brace depth
    stack: List[str] = []
    in_string = False
    escape_next = False
    last_valid_end = 0
    last_complete_item_end = 0
    
    i = 0
    while i < len(raw):
        c = raw[i]
        
        if escape_next:
            escape_next = False
            i += 1
            continue
        
        if c == '\\' and in_string:
            escape_next = True
            i += 1
            continue
        
        if c == '"' and (not stack or stack[-1] != '"'):
            in_string = True
            stack.append('"')
        elif c == '"' and stack and stack[-1] == '"':
            in_string = False
            stack.pop()
        elif not in_string:
            if c == '{':
                stack.append('{')
            elif c == '[':
                stack.append('[')
            elif c == '}' and stack and stack[-1] == '{':
                stack.pop()
                last_valid_end = i + 1
                if not stack:
                    return raw[:last_valid_end]
            elif c == ']' and stack and stack[-1] == '[':
                stack.pop()
                last_valid_end = i + 1
                if not stack:
                    return raw[:last_valid_end]
            elif c == ',' and stack:
                # After a comma, we completed an item
                last_complete_item_end = i
        
        i += 1
    
    # If we get here, JSON is truncated - try to repair
    if not stack:
        return raw[:last_valid_end] if last_valid_end > 0 else raw
    
    # Find the last complete item before truncation
    # Remove trailing partial content after last comma
    if last_complete_item_end > 0:
        repaired = raw[:last_complete_item_end]
    else:
        repaired = raw
    
    # Remove any trailing incomplete tokens (partial strings, numbers, etc.)
    # Find the last structural character
    for j in range(len(repaired) - 1, -1, -1):
        c = repaired[j]
        if c in '{}[],"':
            # Remove trailing comma
            if c == ',':
                repaired = repaired[:j]
            else:
                repaired = repaired[:j+1]
            break
        elif c in ' \t\n\r':
            continue
    
    # Close any remaining open brackets/braces
    # Re-analyze the repaired string
    stack = []
    in_string = False
    escape_next = False
    
    for c in repaired:
        if escape_next:
            escape_next = False
            continue
        if c == '\\' and in_string:
            escape_next = True
            continue
        if c == '"' and (not stack or stack[-1] != '"'):
            in_string = True
            stack.append('"')
        elif c == '"' and stack and stack[-1] == '"':
            in_string = False
            stack.pop()
        elif not in_string:
            if c == '{':
                stack.append('{')
            elif c == '[':
                stack.append('[')
            elif c == '}' and stack and stack[-1] == '{':
                stack.pop()
            elif c == ']' and stack and stack[-1] == '[':
                stack.pop()
    
    # Close unclosed brackets/braces in reverse order
    closers = ''
    for bracket in reversed(stack):
        if bracket == '"':
            closers += '"'
        elif bracket == '{':
            closers += '}'
        elif bracket == '[':
            closers += ']'
    
    return repaired + closers


def extract_partial_array(raw_json: str, item_key: str) -> List[Dict[str, Any]]:
    """
    Extract complete items from a truncated array in JSON.
    
    For example, if we have:
    {"features": [{"id": "F1", ...}, {"id": "F2", ...}, {"id": "F3"  <- truncated
    
    This will extract the complete F1 and F2 items.
    """
    items: List[Dict[str, Any]] = []
    
    try:
        # First try to repair and parse
        repaired = repair_truncated_json(raw_json)
        parsed = json.loads(repaired)
        
        if isinstance(parsed, dict) and item_key in parsed:
            array = parsed[item_key]
            if isinstance(array, list):
                for item in array:
                    if isinstance(item, dict):
                        items.append(item)
        elif isinstance(parsed, list):
            for item in parsed:
                if isinstance(item, dict):
                    items.append(item)
        
        return items
    except json.JSONDecodeError:
        pass
    
    # Fallback: Extract items one by one using regex
    # Find the array start
    array_pattern = rf'"{item_key}"\s*:\s*\['
    array_match = re.search(array_pattern, raw_json)
    if not array_match:
        return items
    
    array_start = array_match.end()
    
    # Extract individual objects from the array
    depth = 0
    obj_start = -1
    in_string = False
    escape_next = False
    
    for i in range(array_start, len(raw_json)):
        c = raw_json[i]
        
        if escape_next:
            escape_next = False
            continue
        if c == '\\' and in_string:
            escape_next = True
            continue
        if c == '"':
            in_string = not in_string
            continue
        
        if in_string:
            continue
        
        if c == '{':
            if depth == 0:
                obj_start = i
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0 and obj_start >= 0:
                obj_str = raw_json[obj_start:i+1]
                try:
                    obj = json.loads(obj_str)
                    items.append(obj)
                except json.JSONDecodeError:
                    pass
                obj_start = -1
        elif c == ']' and depth == 0:
            break
    
    return items


def safe_parse_with_repair(
    raw_json: str,
    model_class: Any,
    array_key: Optional[str] = None,
) -> Tuple[Any, List[str]]:
    """
    Safely parse JSON into a Pydantic model with repair for truncated responses.
    
    Returns:
        Tuple of (parsed model or None, list of warnings)
    """
    warnings: List[str] = []
    
    # Handle None model_class
    if model_class is None:
        warnings.append("No model class provided for parsing")
        return None, warnings
    
    # Step 1: Try direct parsing
    try:
        adapter = TypeAdapter(model_class)
        return adapter.validate_json(raw_json), warnings
    except (ValidationError, json.JSONDecodeError) as e:
        warnings.append(f"Initial parse failed: {str(e)[:100]}")
    
    # Step 2: Try with repaired JSON
    try:
        repaired = repair_truncated_json(raw_json)
        if repaired != raw_json:
            warnings.append("JSON was truncated, attempted repair")
        adapter = TypeAdapter(model_class)
        return adapter.validate_json(repaired), warnings
    except (ValidationError, json.JSONDecodeError) as e:
        warnings.append(f"Repair parse failed: {str(e)[:100]}")
    
    # Step 3: If there's an array key, try to extract partial items
    if array_key:
        try:
            partial_items = extract_partial_array(raw_json, array_key)
            if partial_items:
                warnings.append(f"Extracted {len(partial_items)} partial items from truncated response")
                # Build a minimal valid structure
                partial_data = {array_key: partial_items}
                adapter = TypeAdapter(model_class)
                return adapter.validate_python(partial_data), warnings
        except Exception as e:
            warnings.append(f"Partial extraction failed: {str(e)[:100]}")
    
    return None, warnings


def create_fallback_features(prd_input: PRDInput, num_features: int = 3) -> FeaturesOutput:
    """Create minimal fallback features when agent fails completely."""
    features = []
    for i in range(min(num_features, prd_input.max_features)):
        features.append(FeatureSpec(
            id=f"F{i+1}",
            title=f"Core Feature {i+1} for {prd_input.product_name}",
            description=f"Key functionality to address the needs of target users. Details to be refined based on further analysis.",
            priority=Priority.P0 if i == 0 else (Priority.P1 if i < 3 else Priority.P2),
            user_value="Delivers value by solving core user needs identified in the problem statement.",
            target_personas=["persona_1"],
            acceptance_criteria=[
                "Feature delivers expected functionality",
                "Feature is usable by target personas",
                "Feature meets performance requirements",
            ],
            dependencies=[],
            estimated_effort="M",
            out_of_scope=["Advanced customization options"],
        ))
    return FeaturesOutput(features=features)


def create_fallback_personas(target_users: "str | List[str]") -> PersonasOutput:
    """Create minimal fallback personas when agent fails completely."""
    # Normalize to list
    if isinstance(target_users, str):
        target_users = [target_users]
    
    personas = []
    for i, user_type in enumerate(target_users[:3]):
        personas.append(UserPersona(
            id=f"persona_{i+1}",
            name=f"Representative {user_type}",
            role=user_type,
            background=f"A professional in the {user_type} domain seeking solutions to common challenges.",
            goals=["Improve efficiency", "Reduce manual work", "Make better decisions"],
            pain_points=["Current tools are fragmented", "Manual processes are time-consuming"],
            use_cases=["Daily workflow optimization", "Data-driven decision making"],
            tech_proficiency="Medium",
            success_criteria="Successfully adopts the product into daily workflow",
        ))
    return PersonasOutput(personas=personas)


def create_fallback_risks() -> RisksOutput:
    """Create minimal fallback risks when agent fails completely."""
    return RisksOutput(risks=[
        RiskItem(
            id="R1",
            category=RiskCategory.TECHNICAL,
            title="Technical Implementation Complexity",
            description="The system may face unexpected technical challenges during implementation.",
            probability=RiskLevel.MEDIUM,
            impact=RiskLevel.MEDIUM,
            mitigation="Conduct thorough technical spikes before implementation. Use proven technologies.",
            contingency="Allocate buffer time and consider phased rollout.",
            owner="Engineering Lead",
        ),
        RiskItem(
            id="R2",
            category=RiskCategory.BUSINESS,
            title="User Adoption Risk",
            description="Target users may be slow to adopt the new solution.",
            probability=RiskLevel.MEDIUM,
            impact=RiskLevel.HIGH,
            mitigation="Implement user feedback loops. Provide comprehensive onboarding.",
            contingency="Pivot based on user feedback. Consider incentive programs.",
            owner="Product Manager",
        ),
    ])


def create_fallback_timeline(num_features: int) -> TimelineOutput:
    """Create minimal fallback timeline when agent fails completely."""
    phases = [
        TimelinePhase(
            phase="Phase 1: Foundation",
            duration="4-6 weeks",
            objectives=["Core infrastructure", "Basic functionality"],
            deliverables=["MVP with P0 features"],
            dependencies=[],
            milestones=["Technical architecture complete", "Core features deployed"],
        ),
        TimelinePhase(
            phase="Phase 2: Enhancement",
            duration="4-6 weeks",
            objectives=["P1 features", "User feedback integration"],
            deliverables=["Enhanced product with P1 features"],
            dependencies=["Phase 1 completion"],
            milestones=["P1 features deployed", "User testing complete"],
        ),
    ]
    return TimelineOutput(
        phases=phases,
        total_duration="8-12 weeks",
        critical_path=["Core infrastructure", "P0 features", "User testing"],
    )


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# OPENAI CLIENT (Gemini via OpenAI-compatible API)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

gemini_client: Optional[AsyncOpenAI] = None
if GEMINI_API_KEY:
    gemini_client = AsyncOpenAI(
        api_key=GEMINI_API_KEY,
        base_url=os.getenv(
            "GEMINI_BASE_URL",
            "https://generativelanguage.googleapis.com/v1beta/openai/",
        ),
        timeout=HTTP_TIMEOUT,
    )


def create_gemini_model() -> OpenAIChatCompletionsModel:
    """Create model using Gemini client."""
    if not gemini_client:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return OpenAIChatCompletionsModel(
        model=GEMINI_MODEL,
        openai_client=gemini_client,
    )


def get_model() -> Tuple[OpenAIChatCompletionsModel, str]:
    """Get the Gemini model."""
    model = create_gemini_model()
    return model, "gemini"


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# INPUT GUARDRAILS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@input_guardrail
async def validate_prd_input(
    ctx: RunContextWrapper[None],
    agent: Agent,
    input: str | list[TResponseInputItem],
) -> GuardrailFunctionOutput:
    """Validate PRD generation input."""
    # Extract text from input
    if isinstance(input, list):
        parts: List[str] = []
        for item in input:
            if isinstance(item, dict):
                content = item.get("content", "")
                if isinstance(content, str):
                    parts.append(content)
            elif isinstance(item, str):
                parts.append(item)
        text = " ".join(parts)
    else:
        text = str(input)
    
    text = text.strip()
    
    # Basic validation
    if not text:
        return GuardrailFunctionOutput(
            output_info={"reason": "Empty input"},
            tripwire_triggered=True,
        )
    
    if len(text) < 50:
        return GuardrailFunctionOutput(
            output_info={"reason": "Problem statement too short - need at least 50 characters for meaningful PRD generation"},
            tripwire_triggered=True,
        )
    
    # Check for obvious non-PRD content
    lower_text = text.lower()
    greeting_words = ["hello", "hi there", "what's up", "how are you", "hey"]
    if any(word in lower_text for word in greeting_words) and len(text) < 100:
        return GuardrailFunctionOutput(
            output_info={"reason": "Input appears to be a greeting, not a problem statement"},
            tripwire_triggered=True,
        )
    
    return GuardrailFunctionOutput(
        output_info={"reason": "Valid PRD input"},
        tripwire_triggered=False,
    )


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# AGENT DEFINITIONS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

def create_discovery_agent(model: OpenAIChatCompletionsModel) -> Agent:
    """Create the Discovery Agent for market analysis and problem validation."""
    
    instructions = """You are an expert Product Strategist specializing in market analysis and problem validation.

Your task is to analyze a problem statement and generate the Executive Summary section of a PRD.

CRITICAL REQUIREMENTS:
1. Validate the problem is real and worth solving
2. Identify the market opportunity
3. Define clear, measurable objectives
4. Establish success metrics with specific targets

OUTPUT FORMAT:
- vision: A compelling 2-3 sentence product vision statement
- problem_statement: Detailed problem description (150-300 words) including:
  - Who experiences this problem
  - What is the current pain
  - Why existing solutions fail
- solution_overview: High-level solution approach (100-200 words)
- key_objectives: 3-7 clear, actionable objectives
- success_metrics: 2-5 measurable metrics with targets and measurement methods

QUALITY STANDARDS:
- Be specific, not generic
- Include quantifiable targets where possible
- Focus on user value, not features
- Ensure objectives are achievable and measurable""" + STRICT_JSON_ONLY

    return Agent(
        name="Discovery Agent",
        instructions=instructions,
        model=model,
        output_type=ExecutiveSummary,
        model_settings=ModelSettings(
            temperature=0.4,
            max_tokens=2500,
        ),
        input_guardrails=[validate_prd_input],
    )


def create_personas_agent(model: OpenAIChatCompletionsModel, num_personas: int = 3) -> Agent:
    """Create the Personas Agent for user persona generation."""
    
    instructions = f"""You are an expert UX Researcher specializing in user persona development.

Your task is to create {num_personas} detailed user personas based on the problem statement and target users.

CRITICAL REQUIREMENTS:
1. Create exactly {num_personas} distinct personas
2. Each persona must represent a different user segment
3. Personas should be realistic and research-backed
4. Include specific, actionable pain points and goals

OUTPUT FORMAT for each persona:
- id: Unique ID (persona_1, persona_2, etc.)
- name: Character name with role (e.g., "Sarah - Senior Product Manager")
- role: Job title and organizational context
- background: 2-3 sentences about experience and context
- goals: 2-5 specific, measurable goals
- pain_points: 2-5 concrete pain points they experience
- use_cases: 2-5 specific scenarios where they'd use the product
- tech_proficiency: Low/Medium/High
- success_criteria: What success looks like for this persona

QUALITY STANDARDS:
- Make personas feel like real people
- Pain points should be specific and relatable
- Goals should align with the problem being solved
- Use cases should be actionable scenarios""" + STRICT_JSON_ONLY

    return Agent(
        name="Personas Agent",
        instructions=instructions,
        model=model,
        output_type=PersonasOutput,
        model_settings=ModelSettings(
            temperature=0.5,
            max_tokens=3000,
        ),
    )


def create_features_agent(model: OpenAIChatCompletionsModel, max_features: int = 10) -> Agent:
    """Create the Feature Spec Agent for feature specification."""
    
    instructions = f"""You are an expert Product Manager specializing in feature specification and requirements writing.

Your task is to define {max_features} features that solve the identified problems for the given personas.

CRITICAL REQUIREMENTS:
1. Generate {max_features} features prioritized by user value
2. Each feature must have clear acceptance criteria
3. Features should map to specific personas
4. Use P0/P1/P2/P3 priority levels

PRIORITY LEVELS:
- P0: Must have - Core functionality, launch blocker
- P1: Should have - Important but not blocking
- P2: Nice to have - Enhances experience
- P3: Future consideration - Backlog items

OUTPUT FORMAT for each feature:
- id: Feature ID (F1, F2, etc.)
- title: Clear, concise feature title
- description: Detailed description (50-150 words)
- priority: P0/P1/P2/P3
- user_value: Why this matters to users
- target_personas: List of persona IDs this serves
- acceptance_criteria: 3-8 testable criteria
- dependencies: Other feature IDs this depends on
- estimated_effort: S/M/L/XL
- out_of_scope: What this feature explicitly doesn't include

QUALITY STANDARDS:
- Features should be independent where possible
- Acceptance criteria must be testable
- Each feature should deliver clear user value
- Prioritization should reflect user needs""" + STRICT_JSON_ONLY

    return Agent(
        name="Feature Spec Agent",
        instructions=instructions,
        model=model,
        output_type=FeaturesOutput,
        model_settings=ModelSettings(
            temperature=0.3,
            max_tokens=5000,
        ),
    )


def create_technical_agent(model: OpenAIChatCompletionsModel) -> Agent:
    """Create the Technical Agent for technical requirements."""
    
    instructions = """You are an expert Solutions Architect specializing in technical requirements and system design.

Your task is to define technical requirements that support the specified features.

CRITICAL REQUIREMENTS:
1. Architecture must support all P0/P1 features
2. Include specific performance targets
3. Address security requirements comprehensively
4. Consider scalability from day one

OUTPUT FORMAT:
- architecture_overview: High-level architecture description (150-300 words)
- integrations: List of external system integrations with:
  - name: Integration name
  - type: API/Webhook/SDK/Database/etc.
  - description: Purpose of integration
  - requirements: Specific integration requirements
- performance_requirements: 3-6 specific performance requirements with targets
- security_requirements: 3-6 security requirements
- scalability_considerations: 2-4 scalability requirements
- tech_stack_recommendations: Optional technology recommendations
- data_requirements: Data storage and handling requirements
- api_specifications: API design considerations

QUALITY STANDARDS:
- Be specific with numbers (latency, throughput, etc.)
- Security requirements should follow best practices
- Consider compliance requirements (GDPR, SOC2, etc.)
- Architecture should be pragmatic and implementable""" + STRICT_JSON_ONLY

    return Agent(
        name="Technical Agent",
        instructions=instructions,
        model=model,
        output_type=TechnicalRequirements,
        model_settings=ModelSettings(
            temperature=0.3,
            max_tokens=3000,
        ),
    )


def create_risks_agent(model: OpenAIChatCompletionsModel) -> Agent:
    """Create the Risk Assessment Agent."""
    
    instructions = """You are an expert Risk Manager specializing in product and technical risk assessment.

Your task is to identify and assess risks for the product being specified.

CRITICAL REQUIREMENTS:
1. Identify 5-10 significant risks
2. Cover Technical, Business, Operational, and Security categories
3. Each risk must have a mitigation strategy
4. Be realistic about probability and impact

RISK CATEGORIES:
- Technical: Implementation challenges, technical debt, dependencies
- Business: Market risks, competition, adoption challenges
- Operational: Process, team, resource risks
- Security: Data protection, compliance, vulnerabilities

OUTPUT FORMAT for each risk:
- id: Risk ID (R1, R2, etc.)
- category: Technical/Business/Operational/Security
- title: Brief risk title
- description: Detailed risk description
- probability: Low/Medium/High
- impact: Low/Medium/High
- mitigation: Strategy to reduce risk
- contingency: Plan if risk materializes
- owner: Role responsible for monitoring

QUALITY STANDARDS:
- Risks should be specific, not generic
- Mitigations should be actionable
- Consider both short-term and long-term risks
- Include at least one risk per category""" + STRICT_JSON_ONLY

    return Agent(
        name="Risk Assessment Agent",
        instructions=instructions,
        model=model,
        output_type=RisksOutput,
        model_settings=ModelSettings(
            temperature=0.4,
            max_tokens=2500,
        ),
    )


def create_timeline_agent(model: OpenAIChatCompletionsModel) -> Agent:
    """Create the Timeline Agent for implementation planning."""
    
    instructions = """You are an expert Program Manager specializing in product roadmaps and implementation planning.

Your task is to create a phased implementation timeline based on the features and priorities defined.

CRITICAL REQUIREMENTS:
1. Create 3-5 implementation phases
2. P0 features must be in Phase 1
3. Each phase should have clear deliverables
4. Dependencies should be properly sequenced

OUTPUT FORMAT:
- phases: List of implementation phases with:
  - phase: Phase name (e.g., "Phase 1: Foundation")
  - duration: Time estimate (e.g., "4 weeks")
  - objectives: 2-4 phase objectives
  - deliverables: Specific deliverables
  - dependencies: Dependencies from previous phases
  - milestones: Key milestones
- total_duration: Overall timeline estimate
- critical_path: Items on the critical path

QUALITY STANDARDS:
- Phases should be achievable and well-scoped
- Include buffer for unexpected issues
- Consider resource constraints
- Milestones should be measurable""" + STRICT_JSON_ONLY

    return Agent(
        name="Timeline Agent",
        instructions=instructions,
        model=model,
        output_type=TimelineOutput,
        model_settings=ModelSettings(
            temperature=0.3,
            max_tokens=2000,
        ),
    )


def create_coherence_agent(model: OpenAIChatCompletionsModel) -> Agent:
    """Create the Coherence Agent for final review."""
    
    instructions = """You are an expert Technical Writer and Quality Analyst specializing in PRD review.

Your task is to review a complete PRD for coherence, consistency, and completeness.

CHECK FOR:
1. Persona-Feature Alignment: Do features address persona pain points?
2. Priority Consistency: Are dependencies between features properly prioritized?
3. Technical Feasibility: Does technical architecture support all features?
4. Risk Coverage: Are there risks for all critical features?
5. Timeline Realism: Does timeline match feature scope?
6. Metric Alignment: Do success metrics cover all objectives?

OUTPUT FORMAT:
- overall_score: 0-100 score for document quality
- issues: List of issues found with:
  - severity: low/medium/high
  - section: Affected section
  - description: Issue description
  - suggestion: How to fix
  - related_sections: Other sections involved
- suggestions: General improvement suggestions
- passed: Boolean - whether document passes quality check (score >= 70)

QUALITY STANDARDS:
- Be thorough but constructive
- Prioritize issues by impact
- Provide specific, actionable suggestions
- Consider the document as a whole""" + STRICT_JSON_ONLY

    return Agent(
        name="Coherence Agent",
        instructions=instructions,
        model=model,
        output_type=CoherenceReview,
        model_settings=ModelSettings(
            temperature=0.2,
            max_tokens=2000,
        ),
    )


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# PROMPT BUILDERS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

def build_discovery_prompt(prd_input: PRDInput, context: Optional[EnrichedContext] = None) -> str:
    """Build prompt for Discovery Agent."""
    prompt = f"""Generate an Executive Summary for the following product:

PROBLEM STATEMENT:
{prd_input.problem_statement}

TARGET USERS:
{', '.join(prd_input.target_users)}

CONSTRAINTS:
{prd_input.constraints or 'None specified'}
"""
    
    if context:
        if context.jira:
            prompt += f"\n\nJIRA CONTEXT:\nEpic: {context.jira.epic_summary}\n"
            if context.jira.child_issues:
                prompt += f"Existing issues: {len(context.jira.child_issues)} items\n"
        
        if context.web_search:
            prompt += "\n\nMARKET RESEARCH:\n"
            for result in context.web_search[:3]:
                prompt += f"- {result.title}: {result.snippet[:200]}\n"
    
    return prompt


def build_personas_prompt(
    prd_input: PRDInput,
    executive_summary: ExecutiveSummary,
    context: Optional[EnrichedContext] = None,
) -> str:
    """Build prompt for Personas Agent."""
    return f"""Create user personas for this product:

VISION:
{executive_summary.vision}

PROBLEM:
{executive_summary.problem_statement}

TARGET USERS TO CREATE PERSONAS FOR:
{', '.join(prd_input.target_users)}

KEY OBJECTIVES:
{chr(10).join(f'- {obj}' for obj in executive_summary.key_objectives)}

Create detailed, realistic personas that represent these user types.
"""


def build_features_prompt(
    prd_input: PRDInput,
    executive_summary: ExecutiveSummary,
    personas: List[UserPersona],
) -> str:
    """Build prompt for Features Agent."""
    persona_summary = "\n".join([
        f"- {p.name}: {', '.join(p.pain_points[:2])}"
        for p in personas
    ])
    
    return f"""Define features for this product:

PROBLEM:
{executive_summary.problem_statement}

SOLUTION APPROACH:
{executive_summary.solution_overview}

USER PERSONAS AND THEIR PAIN POINTS:
{persona_summary}

OBJECTIVES TO ACHIEVE:
{chr(10).join(f'- {obj}' for obj in executive_summary.key_objectives)}

CONSTRAINTS:
{prd_input.constraints or 'None specified'}

Create {prd_input.max_features} features that address these pain points and achieve the objectives.
Reference personas by their IDs (persona_1, persona_2, etc.) in target_personas.
"""


def build_technical_prompt(
    executive_summary: ExecutiveSummary,
    features: List[FeatureSpec],
    prd_input: PRDInput,
) -> str:
    """Build prompt for Technical Agent."""
    p0_features = [f for f in features if f.priority.value == "P0"]
    p1_features = [f for f in features if f.priority.value == "P1"]
    
    feature_summary = "P0 (Must Have):\n" + "\n".join([f"- {f.title}" for f in p0_features])
    feature_summary += "\n\nP1 (Should Have):\n" + "\n".join([f"- {f.title}" for f in p1_features])
    
    return f"""Define technical requirements for this product:

SOLUTION OVERVIEW:
{executive_summary.solution_overview}

KEY FEATURES TO SUPPORT:
{feature_summary}

CONSTRAINTS:
{prd_input.constraints or 'None specified'}

Define architecture, integrations, and non-functional requirements to support these features.
"""


def build_risks_prompt(
    executive_summary: ExecutiveSummary,
    features: List[FeatureSpec],
    technical: TechnicalRequirements,
) -> str:
    """Build prompt for Risks Agent."""
    return f"""Identify risks for this product:

VISION:
{executive_summary.vision}

KEY FEATURES ({len(features)} total):
{chr(10).join(f'- {f.title} ({f.priority.value})' for f in features[:5])}

TECHNICAL ARCHITECTURE:
{technical.architecture_overview[:500]}

INTEGRATIONS:
{chr(10).join(f'- {i.name}: {i.type}' for i in technical.integrations[:5])}

Identify 5-10 risks across Technical, Business, Operational, and Security categories.
"""


def build_timeline_prompt(
    features: List[FeatureSpec],
    technical: TechnicalRequirements,
    risks: List[RiskItem],
) -> str:
    """Build prompt for Timeline Agent."""
    features_by_priority = {}
    for f in features:
        priority = f.priority.value
        if priority not in features_by_priority:
            features_by_priority[priority] = []
        features_by_priority[priority].append(f.title)
    
    priority_summary = ""
    for p in ["P0", "P1", "P2", "P3"]:
        if p in features_by_priority:
            priority_summary += f"\n{p}: {', '.join(features_by_priority[p])}"
    
    return f"""Create an implementation timeline:

FEATURES BY PRIORITY:
{priority_summary}

ARCHITECTURE COMPLEXITY:
{technical.architecture_overview[:300]}

KEY RISKS TO CONSIDER:
{chr(10).join(f'- {r.title} ({r.probability} probability, {r.impact} impact)' for r in risks[:5])}

Create a phased timeline that delivers P0 features first, properly sequences dependencies,
and includes realistic time estimates with buffer for the identified risks.
"""


def build_coherence_prompt(prd: PRDDocument) -> str:
    """Build prompt for Coherence Agent."""
    sections = prd.sections
    
    return f"""Review this PRD for coherence and consistency:

EXECUTIVE SUMMARY:
Vision: {sections.executive_summary.vision if sections.executive_summary else 'Missing'}
Objectives: {len(sections.executive_summary.key_objectives) if sections.executive_summary else 0}

PERSONAS: {len(sections.personas) if sections.personas else 0} defined

FEATURES: {len(sections.features) if sections.features else 0} defined
- P0: {len([f for f in (sections.features or []) if f.priority.value == 'P0'])}
- P1: {len([f for f in (sections.features or []) if f.priority.value == 'P1'])}

TECHNICAL REQUIREMENTS:
- Integrations: {len(sections.technical.integrations) if sections.technical else 0}
- Performance Reqs: {len(sections.technical.performance_requirements) if sections.technical else 0}

RISKS: {len(sections.risks) if sections.risks else 0} identified

TIMELINE: {len(sections.timeline) if sections.timeline else 0} phases

Check for:
1. Do features map to persona pain points?
2. Are feature dependencies properly prioritized?
3. Does technical architecture support P0 features?
4. Are critical features covered by risks?
5. Is the timeline realistic for the scope?

Provide a quality score and list any issues found.
"""


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# AGENT EXECUTION
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

# Mapping of agent output types to their array keys for partial extraction
AGENT_ARRAY_KEYS: Dict[str, str] = {
    "FeaturesOutput": "features",
    "PersonasOutput": "personas",
    "RisksOutput": "risks",
    "TimelineOutput": "phases",
}


async def run_agent_with_json_repair(
    agent: Agent,
    prompt: str,
    agent_name: str,
) -> Tuple[Any, List[str]]:
    """
    Run an agent with robust JSON repair for truncated responses.
    
    If the standard Runner fails due to JSON parsing, this attempts to:
    1. Extract raw response text
    2. Repair truncated JSON
    3. Parse into the expected output type
    """
    warnings: List[str] = []
    output_type = agent.output_type
    output_type_name = output_type.__name__ if output_type else ""
    array_key = AGENT_ARRAY_KEYS.get(output_type_name)
    
    try:
        result = await Runner.run(agent, prompt)
        if result.final_output:
            return result.final_output, warnings
    except Exception as e:
        error_msg = str(e)
        logger.warning(f"{agent_name} standard run failed: {error_msg}")
        warnings.append(f"{agent_name} initial parse failed: {error_msg[:100]}")
        
        # Check if this is a JSON parsing error (truncated response)
        if "json_invalid" in error_msg.lower() or "eof while parsing" in error_msg.lower() or "invalid json" in error_msg.lower():
            logger.info(f"{agent_name}: Attempting JSON repair for truncated response...")
            
            # Try to extract raw JSON from the error message or rerun with raw output
            # The error message from TypeAdapter contains the raw input
            raw_json_match = re.search(r"input_value='(.+?)',\s*input_type", error_msg, re.DOTALL)
            if raw_json_match:
                raw_json = raw_json_match.group(1)
                # Unescape the string
                raw_json = raw_json.replace("\\n", "\n").replace("\\'", "'")
                
                parsed, repair_warnings = safe_parse_with_repair(raw_json, output_type, array_key)
                warnings.extend(repair_warnings)
                
                if parsed:
                    logger.info(f"{agent_name}: Successfully recovered from truncated JSON")
                    warnings.append(f"{agent_name}: Recovered from truncated response")
                    return parsed, warnings
    
    # Re-raise to trigger fallback
    raise RuntimeError(f"{agent_name} failed to parse output")


async def run_agent_with_fallback(
    agent: Agent,
    prompt: str,
    fallback_model_fn,
    agent_name: str,
) -> Tuple[Any, List[str], str]:
    """Run an agent with JSON repair on failure."""
    warnings: List[str] = []
    output_type = agent.output_type
    output_type_name = output_type.__name__ if output_type else ""
    array_key = AGENT_ARRAY_KEYS.get(output_type_name)
    
    # Run with Gemini
    try:
        logger.info(f"Running {agent_name} with Gemini...")
        result = await Runner.run(agent, prompt)
        if result.final_output:
            logger.info(f"{agent_name} succeeded with Gemini")
            return result.final_output, warnings, "gemini"
    except Exception as e:
        error_msg = str(e)
        logger.warning(f"{agent_name} failed with Gemini: {error_msg}")
        warnings.append(f"{agent_name} Gemini failed: {error_msg[:100]}")
        
        # Check if this is a JSON parsing error - try to repair
        if "json_invalid" in error_msg.lower() or "eof while parsing" in error_msg.lower() or "invalid json" in error_msg.lower():
            logger.info(f"{agent_name}: Attempting JSON repair for truncated response...")
            raw_json_match = re.search(r"input_value='(.+?)',\s*input_type", error_msg, re.DOTALL)
            if raw_json_match and output_type:
                raw_json = raw_json_match.group(1)
                raw_json = raw_json.replace("\\n", "\n").replace("\\'", "'")
                
                parsed, repair_warnings = safe_parse_with_repair(raw_json, output_type, array_key)
                warnings.extend(repair_warnings)
                
                if parsed:
                    logger.info(f"{agent_name}: Recovered from truncated JSON")
                    return parsed, warnings, "gemini"
    
    raise RuntimeError(f"{agent_name} failed with Gemini")


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# MAIN ORCHESTRATOR
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@dataclass
class PRDGenerationResult:
    """Result of PRD generation."""
    prd: PRDDocument
    warnings: List[str] = field(default_factory=list)
    generation_time_ms: int = 0
    tokens_used: int = 0


async def generate_prd(
    prd_input: PRDInput,
    context: Optional[EnrichedContext] = None,
) -> PRDGenerationResult:
    """Generate a complete PRD (non-streaming)."""
    import time
    start_time = time.time()
    
    warnings: List[str] = []
    model, provider = get_model()
    
    # Initialize document
    prd = PRDDocument(
        input=prd_input,
        status=PRDStatus.GENERATING,
        template_version=prd_input.template_version,
        title=prd_input.product_name,
    )
    
    # Phase 1: Discovery (sequential - needed for other agents)
    discovery_agent = create_discovery_agent(model)
    discovery_prompt = build_discovery_prompt(prd_input, context)
    executive_summary, ws, _ = await run_agent_with_fallback(
        discovery_agent, discovery_prompt, None, "Discovery Agent"
    )
    warnings.extend(ws)
    prd.sections.executive_summary = executive_summary
    
    # Phase 2: Parallel execution of independent agents
    personas_agent = create_personas_agent(model, len(prd_input.target_users))
    technical_agent = create_technical_agent(model)
    risks_agent = create_risks_agent(model)
    
    personas_prompt = build_personas_prompt(prd_input, executive_summary, context)
    
    # Run personas first (needed for features)
    personas_output, ws, _ = await run_agent_with_fallback(
        personas_agent, personas_prompt, None, "Personas Agent"
    )
    warnings.extend(ws)
    prd.sections.personas = personas_output.personas
    
    # Now run features (depends on personas)
    features_agent = create_features_agent(model, prd_input.max_features)
    features_prompt = build_features_prompt(prd_input, executive_summary, personas_output.personas)
    features_output, ws, _ = await run_agent_with_fallback(
        features_agent, features_prompt, None, "Features Agent"
    )
    warnings.extend(ws)
    prd.sections.features = features_output.features
    
    # Parallel: Technical and Risks (can run together)
    technical_prompt = build_technical_prompt(executive_summary, features_output.features, prd_input)
    
    async def run_technical():
        return await run_agent_with_fallback(
            technical_agent, technical_prompt, None, "Technical Agent"
        )
    
    # For risks, we need features but can start early with partial data
    risks_prompt_partial = f"""Identify risks for a product with {len(features_output.features)} features.
    
Vision: {executive_summary.vision}

Key features include:
{chr(10).join(f'- {f.title}' for f in features_output.features[:5])}
"""
    
    async def run_risks():
        return await run_agent_with_fallback(
            risks_agent, risks_prompt_partial, None, "Risks Agent"
        )
    
    # Run in parallel
    (technical_result, risks_result) = await asyncio.gather(
        run_technical(),
        run_risks(),
        return_exceptions=True,
    )
    
    # Process results
    if isinstance(technical_result, BaseException):
        warnings.append(f"Technical Agent failed: {str(technical_result)[:100]}")
    else:
        technical_tuple = technical_result  # type: ignore[assignment]
        technical_output, ws, _ = technical_tuple
        warnings.extend(ws)
        prd.sections.technical = technical_output
    
    if isinstance(risks_result, BaseException):
        warnings.append(f"Risks Agent failed: {str(risks_result)[:100]}")
    else:
        risks_tuple = risks_result  # type: ignore[assignment]
        risks_output, ws, _ = risks_tuple
        warnings.extend(ws)
        prd.sections.risks = risks_output.risks
    
    # Phase 3: Timeline (needs features and technical)
    if prd.sections.technical and prd.sections.risks:
        timeline_agent = create_timeline_agent(model)
        timeline_prompt = build_timeline_prompt(
            features_output.features,
            prd.sections.technical,
            prd.sections.risks,
        )
        try:
            timeline_output, ws, _ = await run_agent_with_fallback(
                timeline_agent, timeline_prompt, None, "Timeline Agent"
            )
            warnings.extend(ws)
            prd.sections.timeline = timeline_output.phases
        except Exception as e:
            warnings.append(f"Timeline Agent failed: {str(e)[:100]}")
    
    # Phase 4: Coherence Review
    coherence_agent = create_coherence_agent(model)
    coherence_prompt = build_coherence_prompt(prd)
    try:
        coherence_review, ws, _ = await run_agent_with_fallback(
            coherence_agent, coherence_prompt, None, "Coherence Agent"
        )
        warnings.extend(ws)
        prd.quality_score = coherence_review.overall_score
        if coherence_review.issues:
            for issue in coherence_review.issues:
                if issue.severity == "high":
                    warnings.append(f"High severity issue: {issue.description}")
    except Exception as e:
        warnings.append(f"Coherence review failed: {str(e)[:100]}")
        prd.quality_score = compute_basic_quality_score(prd)
    
    # Finalize
    prd.status = PRDStatus.DRAFT
    prd.warnings = warnings
    
    generation_time_ms = int((time.time() - start_time) * 1000)
    
    return PRDGenerationResult(
        prd=prd,
        warnings=warnings,
        generation_time_ms=generation_time_ms,
    )


async def generate_prd_stream(
    prd_input: PRDInput,
    context: Optional[EnrichedContext] = None,
) -> AsyncGenerator[PRDStreamEvent, None]:
    """Generate PRD with streaming progress updates."""
    import time
    start_time = time.time()
    
    warnings: List[str] = []
    
    try:
        model, provider = get_model()
    except RuntimeError as e:
        yield PRDStreamEvent(type="error", error=str(e))
        return
    
    # Initialize document
    prd = PRDDocument(
        input=prd_input,
        status=PRDStatus.GENERATING,
        template_version=prd_input.template_version,
        title=prd_input.product_name,
    )
    
    yield PRDStreamEvent(
        type="progress",
        stage="init",
        percent=5,
        message="Starting PRD generation...",
    )
    
    # Phase 1: Discovery
    yield PRDStreamEvent(
        type="section_start",
        section=PRDSection.EXECUTIVE_SUMMARY,
        percent=10,
        message="Analyzing problem space and market opportunity...",
    )
    
    try:
        discovery_agent = create_discovery_agent(model)
        discovery_prompt = build_discovery_prompt(prd_input, context)
        executive_summary, ws, _ = await run_agent_with_fallback(
            discovery_agent, discovery_prompt, None, "Discovery Agent"
        )
        warnings.extend(ws)
        prd.sections.executive_summary = executive_summary
        
        yield PRDStreamEvent(
            type="section_complete",
            section=PRDSection.EXECUTIVE_SUMMARY,
            percent=20,
            message="Executive summary complete",
            data=executive_summary.model_dump(),
        )
    except Exception as e:
        yield PRDStreamEvent(type="error", section=PRDSection.EXECUTIVE_SUMMARY, error=str(e))
        return
    
    # Phase 2: Personas
    yield PRDStreamEvent(
        type="section_start",
        section=PRDSection.PERSONAS,
        percent=25,
        message="Creating user personas...",
    )
    
    try:
        personas_agent = create_personas_agent(model, len(prd_input.target_users))
        personas_prompt = build_personas_prompt(prd_input, executive_summary, context)
        personas_output, ws, _ = await run_agent_with_fallback(
            personas_agent, personas_prompt, None, "Personas Agent"
        )
        warnings.extend(ws)
        prd.sections.personas = personas_output.personas
        
        yield PRDStreamEvent(
            type="section_complete",
            section=PRDSection.PERSONAS,
            percent=35,
            message=f"Created {len(personas_output.personas)} personas",
            data={"personas": [p.model_dump() for p in personas_output.personas]},
        )
    except Exception as e:
        logger.warning(f"Personas Agent failed completely, using fallback: {e}")
        warnings.append(f"Personas Agent failed, using fallback: {str(e)[:100]}")
        personas_output = create_fallback_personas(prd_input.target_users)
        prd.sections.personas = personas_output.personas
        
        yield PRDStreamEvent(
            type="section_complete",
            section=PRDSection.PERSONAS,
            percent=35,
            message=f"Created {len(personas_output.personas)} personas (fallback)",
            data={"personas": [p.model_dump() for p in personas_output.personas]},
        )
    
    # Phase 3: Features
    yield PRDStreamEvent(
        type="section_start",
        section=PRDSection.FEATURES,
        percent=40,
        message="Defining feature specifications...",
    )
    
    try:
        features_agent = create_features_agent(model, prd_input.max_features)
        features_prompt = build_features_prompt(prd_input, executive_summary, personas_output.personas)
        features_output, ws, _ = await run_agent_with_fallback(
            features_agent, features_prompt, None, "Features Agent"
        )
        warnings.extend(ws)
        prd.sections.features = features_output.features
        
        yield PRDStreamEvent(
            type="section_complete",
            section=PRDSection.FEATURES,
            percent=55,
            message=f"Defined {len(features_output.features)} features",
            data={"features": [f.model_dump() for f in features_output.features]},
        )
    except Exception as e:
        logger.warning(f"Features Agent failed completely, using fallback: {e}")
        warnings.append(f"Features Agent failed, using fallback: {str(e)[:100]}")
        features_output = create_fallback_features(prd_input)
        prd.sections.features = features_output.features
        
        yield PRDStreamEvent(
            type="section_complete",
            section=PRDSection.FEATURES,
            percent=55,
            message=f"Defined {len(features_output.features)} features (fallback)",
            data={"features": [f.model_dump() for f in features_output.features]},
        )
    
    # Phase 4: Technical + Risks (parallel)
    yield PRDStreamEvent(
        type="progress",
        stage="parallel",
        percent=60,
        message="Generating technical requirements and risk assessment...",
    )
    
    technical_agent = create_technical_agent(model)
    risks_agent = create_risks_agent(model)
    
    technical_prompt = build_technical_prompt(executive_summary, features_output.features, prd_input)
    risks_prompt = build_risks_prompt(executive_summary, features_output.features, prd.sections.technical or TechnicalRequirements(
        architecture_overview="To be defined",
        performance_requirements=["To be defined"],
        security_requirements=["To be defined"],
        scalability_considerations=["To be defined"],
        integrations=[],
        tech_stack_recommendations=[],
        data_requirements=[],
        api_specifications="",
    ))
    
    async def run_technical_stream():
        return await run_agent_with_fallback(
            technical_agent, technical_prompt, None, "Technical Agent"
        )
    
    async def run_risks_stream():
        return await run_agent_with_fallback(
            risks_agent, risks_prompt, None, "Risks Agent"
        )
    
    results = await asyncio.gather(
        run_technical_stream(),
        run_risks_stream(),
        return_exceptions=True,
    )
    
    # Process technical result
    if isinstance(results[0], BaseException):
        warnings.append(f"Technical Agent failed: {str(results[0])[:100]}")
        # Technical has no simple fallback, leave as None
        yield PRDStreamEvent(
            type="progress",
            section=PRDSection.TECHNICAL,
            percent=70,
            message=f"Technical requirements generation failed (will continue): {str(results[0])[:50]}",
        )
    else:
        technical_tuple = results[0]  # type: ignore[assignment]
        technical_output, ws, _ = technical_tuple
        warnings.extend(ws)
        prd.sections.technical = technical_output
        yield PRDStreamEvent(
            type="section_complete",
            section=PRDSection.TECHNICAL,
            percent=70,
            message="Technical requirements complete",
            data=technical_output.model_dump(),
        )
    
    # Process risks result
    if isinstance(results[1], BaseException):
        logger.warning(f"Risks Agent failed, using fallback: {results[1]}")
        warnings.append(f"Risks Agent failed, using fallback: {str(results[1])[:100]}")
        fallback_risks = create_fallback_risks()
        prd.sections.risks = fallback_risks.risks
        yield PRDStreamEvent(
            type="section_complete",
            section=PRDSection.RISKS,
            percent=75,
            message=f"Identified {len(fallback_risks.risks)} risks (fallback)",
            data={"risks": [r.model_dump() for r in fallback_risks.risks]},
        )
    else:
        risks_tuple = results[1]  # type: ignore[assignment]
        risks_output, ws, _ = risks_tuple
        warnings.extend(ws)
        prd.sections.risks = risks_output.risks
        yield PRDStreamEvent(
            type="section_complete",
            section=PRDSection.RISKS,
            percent=75,
            message=f"Identified {len(risks_output.risks)} risks",
            data={"risks": [r.model_dump() for r in risks_output.risks]},
        )
    
    # Phase 5: Timeline
    yield PRDStreamEvent(
        type="section_start",
        section=PRDSection.TIMELINE,
        percent=80,
        message="Creating implementation timeline...",
    )
    
    # Always try timeline, use fallback if dependencies missing or agent fails
    try:
        timeline_agent = create_timeline_agent(model)
        # Use available technical or create placeholder
        technical_for_timeline = prd.sections.technical or TechnicalRequirements(
            architecture_overview="Architecture to be defined based on features",
            performance_requirements=["Standard performance requirements"],
            security_requirements=["Standard security requirements"],
            scalability_considerations=["Consider scalability from the start"],
            integrations=[],
            tech_stack_recommendations=[],
            data_requirements=[],
            api_specifications="",
        )
        timeline_prompt = build_timeline_prompt(
            features_output.features,
            technical_for_timeline,
            prd.sections.risks or [],
        )
        timeline_output, ws, _ = await run_agent_with_fallback(
            timeline_agent, timeline_prompt, None, "Timeline Agent"
        )
        warnings.extend(ws)
        prd.sections.timeline = timeline_output.phases
        
        yield PRDStreamEvent(
            type="section_complete",
            section=PRDSection.TIMELINE,
            percent=90,
            message=f"Created {len(timeline_output.phases)} phase timeline",
            data={
                "phases": [p.model_dump() for p in timeline_output.phases],
                "total_duration": timeline_output.total_duration,
            },
        )
    except Exception as e:
        logger.warning(f"Timeline Agent failed, using fallback: {e}")
        warnings.append(f"Timeline Agent failed, using fallback: {str(e)[:100]}")
        fallback_timeline = create_fallback_timeline(len(features_output.features))
        prd.sections.timeline = fallback_timeline.phases
        
        yield PRDStreamEvent(
            type="section_complete",
            section=PRDSection.TIMELINE,
            percent=90,
            message=f"Created {len(fallback_timeline.phases)} phase timeline (fallback)",
            data={
                "phases": [p.model_dump() for p in fallback_timeline.phases],
                "total_duration": fallback_timeline.total_duration,
            },
        )
    
    # Phase 6: Coherence Review
    yield PRDStreamEvent(
        type="progress",
        stage="review",
        percent=92,
        message="Running coherence review...",
    )
    
    try:
        coherence_agent = create_coherence_agent(model)
        coherence_prompt = build_coherence_prompt(prd)
        coherence_review, ws, _ = await run_agent_with_fallback(
            coherence_agent, coherence_prompt, None, "Coherence Agent"
        )
        warnings.extend(ws)
        prd.quality_score = coherence_review.overall_score
        
        if coherence_review.issues:
            for issue in coherence_review.issues:
                if issue.severity == "high":
                    warnings.append(f"High severity issue: {issue.description}")
        
        yield PRDStreamEvent(
            type="progress",
            stage="review",
            percent=98,
            message=f"Quality score: {coherence_review.overall_score:.0f}/100",
            data=coherence_review.model_dump(),
        )
    except Exception as e:
        warnings.append(f"Coherence review failed: {str(e)[:100]}")
        prd.quality_score = compute_basic_quality_score(prd)
    
    # Finalize
    prd.status = PRDStatus.DRAFT
    prd.warnings = warnings
    prd.generation_time_ms = int((time.time() - start_time) * 1000)
    
    yield PRDStreamEvent(
        type="complete",
        percent=100,
        message="PRD generation complete",
        data={
            "prd": prd.model_dump(),
            "generation_time_ms": prd.generation_time_ms,
            "quality_score": prd.quality_score,
            "warnings": warnings,
        },
    )


def compute_basic_quality_score(prd: PRDDocument) -> float:
    """Compute a basic quality score when coherence agent fails."""
    score = 0.0
    sections = prd.sections
    
    # Executive summary (20%)
    if sections.executive_summary:
        score += 20.0
    
    # Personas (20%)
    if sections.personas and len(sections.personas) >= 2:
        score += 20.0
    elif sections.personas:
        score += 10.0
    
    # Features (25%)
    if sections.features and len(sections.features) >= 3:
        score += 25.0
    elif sections.features:
        score += 12.0
    
    # Technical (15%)
    if sections.technical:
        score += 15.0
    
    # Risks (10%)
    if sections.risks and len(sections.risks) >= 3:
        score += 10.0
    elif sections.risks:
        score += 5.0
    
    # Timeline (10%)
    if sections.timeline and len(sections.timeline) >= 2:
        score += 10.0
    elif sections.timeline:
        score += 5.0
    
    return score


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# SECTION REGENERATION
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async def regenerate_section(
    prd: PRDDocument,
    section: PRDSection,
    feedback: Optional[str] = None,
    preserve_parts: Optional[List[str]] = None,
) -> AsyncGenerator[PRDStreamEvent, None]:
    """Regenerate a specific section with optional feedback."""
    model, _ = get_model()
    
    # Ensure we have required data
    if not prd.input:
        yield PRDStreamEvent(
            type="error",
            section=section,
            error="Cannot regenerate: PRD input data is missing",
        )
        return
    
    prd_input = prd.input  # Narrow type for type checker
    
    yield PRDStreamEvent(
        type="section_start",
        section=section,
        percent=10,
        message=f"Regenerating {section.value}...",
    )
    
    try:
        if section == PRDSection.EXECUTIVE_SUMMARY:
            agent = create_discovery_agent(model)
            prompt = build_discovery_prompt(prd_input)
            if feedback:
                prompt += f"\n\nUSER FEEDBACK:\n{feedback}\nPlease address this feedback in the regenerated section."
            
            result, warnings, _ = await run_agent_with_fallback(
                agent, prompt, None, "Discovery Agent"
            )
            prd.sections.executive_summary = result
            
        elif section == PRDSection.PERSONAS:
            exec_summary = prd.sections.executive_summary
            if not exec_summary:
                raise ValueError("Cannot regenerate personas without executive summary")
            agent = create_personas_agent(model, len(prd_input.target_users))
            prompt = build_personas_prompt(prd_input, exec_summary)
            if feedback:
                prompt += f"\n\nUSER FEEDBACK:\n{feedback}"
            if preserve_parts:
                preserved = [p for p in (prd.sections.personas or []) if p.id in preserve_parts]
                if preserved:
                    prompt += f"\n\nKEEP THESE PERSONAS (do not regenerate):\n"
                    prompt += "\n".join([f"- {p.name}" for p in preserved])
            
            result, warnings, _ = await run_agent_with_fallback(
                agent, prompt, None, "Personas Agent"
            )
            
            # Merge preserved personas
            if preserve_parts:
                preserved = [p for p in (prd.sections.personas or []) if p.id in preserve_parts]
                new_personas = [p for p in result.personas if p.id not in preserve_parts]
                prd.sections.personas = preserved + new_personas
            else:
                prd.sections.personas = result.personas
            
        elif section == PRDSection.FEATURES:
            exec_summary = prd.sections.executive_summary
            if not exec_summary:
                raise ValueError("Cannot regenerate features without executive summary")
            agent = create_features_agent(model, prd_input.max_features)
            prompt = build_features_prompt(prd_input, exec_summary, prd.sections.personas or [])
            if feedback:
                prompt += f"\n\nUSER FEEDBACK:\n{feedback}"
            
            result, warnings, _ = await run_agent_with_fallback(
                agent, prompt, None, "Features Agent"
            )
            prd.sections.features = result.features
            
        elif section == PRDSection.TECHNICAL:
            exec_summary = prd.sections.executive_summary
            if not exec_summary:
                raise ValueError("Cannot regenerate technical requirements without executive summary")
            agent = create_technical_agent(model)
            prompt = build_technical_prompt(
                exec_summary,
                prd.sections.features or [],
                prd_input,
            )
            if feedback:
                prompt += f"\n\nUSER FEEDBACK:\n{feedback}"
            
            result, warnings, _ = await run_agent_with_fallback(
                agent, prompt, None, "Technical Agent"
            )
            prd.sections.technical = result
            
        elif section == PRDSection.RISKS:
            exec_summary = prd.sections.executive_summary
            if not exec_summary:
                raise ValueError("Cannot regenerate risks without executive summary")
            agent = create_risks_agent(model)
            prompt = build_risks_prompt(
                exec_summary,
                prd.sections.features or [],
                prd.sections.technical or TechnicalRequirements(
                    architecture_overview="",
                    performance_requirements=[],
                    security_requirements=[],
                    scalability_considerations=[],
                    integrations=[],
                    tech_stack_recommendations=[],
                    data_requirements=[],
                    api_specifications="",
                ),
            )
            if feedback:
                prompt += f"\n\nUSER FEEDBACK:\n{feedback}"
            
            result, warnings, _ = await run_agent_with_fallback(
                agent, prompt, None, "Risks Agent"
            )
            prd.sections.risks = result.risks
            
        elif section == PRDSection.TIMELINE:
            agent = create_timeline_agent(model)
            prompt = build_timeline_prompt(
                prd.sections.features or [],
                prd.sections.technical or TechnicalRequirements(
                    architecture_overview="",
                    performance_requirements=[],
                    security_requirements=[],
                    scalability_considerations=[],
                    integrations=[],
                    tech_stack_recommendations=[],
                    data_requirements=[],
                    api_specifications="",
                ),
                prd.sections.risks or [],
            )
            if feedback:
                prompt += f"\n\nUSER FEEDBACK:\n{feedback}"
            
            result, warnings, _ = await run_agent_with_fallback(
                agent, prompt, None, "Timeline Agent"
            )
            prd.sections.timeline = result.phases
        
        yield PRDStreamEvent(
            type="section_complete",
            section=section,
            percent=100,
            message=f"{section.value} regenerated successfully",
            data={"section": section.value, "warnings": warnings},
        )
        
    except Exception as e:
        yield PRDStreamEvent(
            type="error",
            section=section,
            error=str(e),
        )
