# Epic Decomposer v3.0 - OpenAI Agents SDK Redesign

## Overview

The epic decomposition agent has been completely redesigned using the **official OpenAI Agents SDK** for enterprise-grade performance.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenAI Agents SDK                        │
├─────────────────────────────────────────────────────────────┤
│  Agent (Story Generator)                                     │
│  ├── model: OpenAIChatCompletionsModel (OpenRouter/Gemini)  │
│  ├── output_type: StoriesOutput (Pydantic structured)       │
│  ├── input_guardrails: [validate_epic_input]                │
│  └── instructions: Dynamic prompt with story count          │
├─────────────────────────────────────────────────────────────┤
│  Runner.run(agent, epic_description)                        │
│  └── Returns: result.final_output (typed StoriesOutput)     │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

1. **OpenAI Agents SDK Primitives**
   - Uses `Agent`, `Runner` from `agents` package
   - `OpenAIChatCompletionsModel` for custom LLM providers
   - Structured outputs via `output_type=StoriesOutput`
   - Input guardrails via `@input_guardrail` decorator

2. **Model Fallback**
   - Primary: OpenRouter (`OPENROUTER_API_KEY`)
   - Fallback: Gemini 2.5 Flash (`GEMINI_API_KEY`)
   - Automatic fallback if primary fails

3. **Structured Outputs**
   ```python
   class StoryOutput(BaseModel):
       title: str
       persona: str = "User"
       user_value: str
       acceptance_criteria: List[str]
       risks: List[str] = []
   
   class StoriesOutput(BaseModel):
       stories: List[StoryOutput]
   ```

4. **Input Guardrails**
   - Validates epic description before processing
   - Rejects empty, too short, or greeting-only inputs
   - Runs in parallel with agent for performance

5. **Exact Story Count**
   - Strong prompt enforcement: "Generate EXACTLY N stories"
   - Tested with 3, 5, 7 story requests - all matched exactly

## Test Results

```
✓ 5 stories requested → 5 generated (OpenRouter)
✓ 3 stories requested → 3 generated
✓ 7 stories requested → 7 generated
✓ Quality score: 1.0 (perfect)
✓ All 9 unit tests passing
```

## API Compatibility

Fully compatible with `agents.py` routes:
- `decompose_epic()` → Dict
- `decompose_epic_stream()` → AsyncGenerator
- `regenerate_story()` → Dict
- `_fetch_existing_children()` → Tuple[List, List]
- `MODEL_NAME` → str

## Configuration

```bash
# Primary model (OpenRouter)
OPENROUTER_API_KEY=your-key
AGENT_MODEL_NAME=google/gemini-2.0-flash-001

# Fallback model (Gemini direct)
GEMINI_API_KEY=your-key

# Timeouts
AGENT_HTTP_TIMEOUT=60
```

## Rollback

```powershell
cp app/agents/epic_decomposer_backup.py app/agents/epic_decomposer.py
```
