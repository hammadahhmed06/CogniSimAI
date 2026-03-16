"""PRD Generator API Routes

Endpoints for generating, managing, and exporting PRD documents.
"""

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Path
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field, field_validator
from typing import Any, Dict, List, Optional, Union
from uuid import UUID, uuid4
from datetime import datetime, timezone
import json
import time
import logging
import re
from io import BytesIO

from app.core.dependencies import get_current_user, UserModel, supabase, get_workspace_context, WorkspaceContext
from app.core.config import settings
from app.models.prd_models import (
    PRDInput,
    PRDDocument,
    PRDSection,
    PRDStatus,
    PRDStreamEvent,
    PRDRegenerateRequest,
    PRDSummary,
    PRDListResponse,
    ExportFormat,
    MigrationResult,
    PRDTemplate,
)
from app.agents.prd_generator import (
    generate_prd,
    generate_prd_stream,
    regenerate_section,
)
from app.agents.prd_tools import enrich_prd_context

logger = logging.getLogger("prd_api")

router = APIRouter(
    prefix="/api/prd",
    tags=["PRD Generator"],
    dependencies=[Depends(get_current_user)],
)


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# REQUEST/RESPONSE MODELS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

class PRDGenerateRequest(BaseModel):
    """Request to generate a new PRD."""
    problem_statement: str = Field(..., min_length=50, max_length=5000)
    target_users: Union[str, List[str]] = Field(..., description="Target users - can be a string (comma/newline separated) or list")
    constraints: Optional[str] = Field(None, max_length=2000)
    product_name: Optional[str] = Field(None, max_length=100)
    template_version: str = Field(default="1.0")
    
    # Context sources
    jira_epic_key: Optional[str] = None
    jira_integration_id: Optional[str] = None
    slack_channel_ids: Optional[List[str]] = None
    slack_integration_id: Optional[str] = None
    github_repo: Optional[str] = None
    
    # Generation options
    max_features: int = Field(default=10, ge=3, le=25)
    include_technical_details: bool = Field(default=True)
    enrich_context: bool = Field(default=True)
    
    @field_validator('target_users', mode='before')
    @classmethod
    def parse_target_users(cls, v):
        """Convert string to list if needed."""
        if isinstance(v, str):
            # Split by newlines, commas, or bullet points
            users = re.split(r'[\n,;•\-]+', v)
            users = [u.strip() for u in users if u.strip()]
            if len(users) < 2:
                # If splitting didn't give us enough, treat the whole string as one user description
                # and extract potential user types
                users = [v.strip()] if v.strip() else []
            return users
        return v


class PRDUpdateRequest(BaseModel):
    """Request to update PRD metadata or content."""
    title: Optional[str] = None
    status: Optional[PRDStatus] = None
    sections: Optional[Dict[str, Any]] = None


class PRDRegenerateResponse(BaseModel):
    """Response from section regeneration."""
    section: PRDSection
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# HELPER FUNCTIONS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

def _create_prd_run(
    user_id: UUID,
    team_id: Optional[UUID],
    workspace_id: UUID,
    prd_input: PRDInput,
) -> UUID:
    """Create a new PRD generation run record."""
    run_id = uuid4()
    
    try:
        insert_payload = {
            "id": str(run_id),
            "agent_type": "prd_generator",
            "action": "generate",
            "mode": "stream",
            "user_id": str(user_id),
            "team_id": str(team_id) if team_id else None,
            "workspace_id": str(workspace_id),
            "status": "running",
            "input": prd_input.model_dump(mode="json"),
            # agent_runs uses started_at (created_at may not exist)
            "started_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            supabase.table("agent_runs").insert(insert_payload).execute()
        except Exception as e:
            # Some environments have an older `agent_runs` schema without workspace_id.
            # If PostgREST tells us the column is missing, retry without it.
            msg = str(e)
            if "PGRST204" in msg and "workspace_id" in msg:
                insert_payload.pop("workspace_id", None)
                supabase.table("agent_runs").insert(insert_payload).execute()
            else:
                raise
    except Exception as e:
        logger.error(f"Failed to create run record: {e}")
    
    return run_id


def _update_prd_run(
    run_id: UUID,
    status: str,
    output: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
    metrics: Optional[Dict[str, Any]] = None,
):
    """Update a PRD generation run record."""
    try:
        update_data: Dict[str, Any] = {
            "status": status,
            # agent_runs uses ended_at (see app.models.agent_runs)
            "ended_at": datetime.now(timezone.utc).isoformat(),
        }
        if output:
            update_data["output"] = output
        if error:
            update_data["error"] = error
        if metrics:
            update_data.update(metrics)
        
        supabase.table("agent_runs").update(update_data).eq("id", str(run_id)).execute()
    except Exception as e:
        logger.error(f"Failed to update run record: {e}")


def _save_prd_document(
    prd: PRDDocument,
    prd_input: PRDInput,
    user_id: UUID,
    workspace_id: UUID,
    run_id: Optional[UUID] = None,
) -> UUID:
    """Save PRD document to database."""
    prd_id = prd.id or uuid4()
    
    try:
        # Legacy schema compatibility (20251215T000000_create_prd_tables.sql)
        # prd_documents has NOT NULL: user_id, problem_statement, target_users, title.
        target_users_text = (
            "\n".join(prd_input.target_users)
            if isinstance(prd_input.target_users, list)
            else str(prd_input.target_users)
        )
        slack_channel_id = None
        slack_channel_ids = prd_input.slack_channel_ids or []
        if slack_channel_ids:
            slack_channel_id = slack_channel_ids[0]

        # Map new combined sections to legacy per-section JSONB columns
        legacy_exec = (
            prd.sections.executive_summary.model_dump(mode="json")
            if prd.sections.executive_summary
            else None
        )
        legacy_personas = (
            [p.model_dump(mode="json") for p in (prd.sections.personas or [])]
            if prd.sections.personas
            else None
        )
        legacy_features = (
            [f.model_dump(mode="json") for f in (prd.sections.features or [])]
            if prd.sections.features
            else None
        )
        legacy_tech = prd.sections.technical.model_dump(mode="json") if prd.sections.technical else None
        legacy_risks = (
            [r.model_dump(mode="json") for r in (prd.sections.risks or [])]
            if prd.sections.risks
            else None
        )
        legacy_timeline = (
            [t.model_dump(mode="json") for t in (prd.sections.timeline or [])]
            if prd.sections.timeline
            else None
        )

        # New combined storage (added by 20251220T000001_add_workspace_to_prd_documents.sql)
        sections_dump = prd.sections.model_dump(mode="json") if prd.sections else None

        # Legacy `overall_quality_score` is DECIMAL(3,2) in the initial migration,
        # so it can store up to 9.99. Our PRD model uses a 0-100 score.
        legacy_overall_quality_score = None
        if prd.quality_score is not None:
            try:
                legacy_overall_quality_score = round(float(prd.quality_score) / 10.0, 2)
                if legacy_overall_quality_score > 9.99:
                    legacy_overall_quality_score = 9.99
                if legacy_overall_quality_score < 0:
                    legacy_overall_quality_score = 0.0
            except Exception:
                legacy_overall_quality_score = None

        supabase.table("prd_documents").insert({
            "id": str(prd_id),

            # Workspace-based ownership
            "workspace_id": str(workspace_id),
            "created_by": str(user_id),

            # Legacy ownership
            "user_id": str(user_id),

            # Legacy input fields
            "problem_statement": prd_input.problem_statement,
            "target_users": target_users_text,
            "constraints": prd_input.constraints,
            "jira_epic_key": prd_input.jira_epic_key,
            "slack_channel_id": slack_channel_id,

            # Metadata
            "title": prd.title or prd_input.product_name or "Untitled PRD",
            "template_version": prd.template_version or prd_input.template_version,
            "status": prd.status.value,

            # Legacy per-section JSONB columns
            "executive_summary": legacy_exec,
            "user_personas": legacy_personas,
            "feature_specifications": legacy_features,
            "technical_requirements": legacy_tech,
            "risks_and_mitigations": legacy_risks,
            "timeline_and_phases": legacy_timeline,

            # New combined JSONB + metadata
            "sections": sections_dump,
            "quality_score": prd.quality_score,
            "overall_quality_score": legacy_overall_quality_score,
            "warnings": prd.warnings,
            "input": prd_input.model_dump(mode="json"),
            "run_id": str(run_id) if run_id else None,
            "generation_time_ms": prd.generation_time_ms,
            "tokens_used": prd.tokens_used,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        
        return prd_id
    except Exception as e:
        logger.error(f"Failed to save PRD document: {e}")
        raise HTTPException(status_code=500, detail="Failed to save PRD document")


def _get_prd_document(prd_id: UUID, user_id: UUID, workspace_id: UUID) -> Dict[str, Any]:
    """Fetch PRD document from database."""
    try:
        result = supabase.table("prd_documents").select("*").eq("id", str(prd_id)).eq("workspace_id", str(workspace_id)).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="PRD not found")
        
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch PRD: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch PRD")


def _log_audit_event(
    prd_id: UUID,
    action: str,
    user_id: UUID,
    user_email: Optional[str] = None,
    section: Optional[str] = None,
    previous_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
):
    """Log an audit event for PRD changes."""
    try:
        details: Dict[str, Any] = {}
        if section is not None:
            details["section"] = section
        if previous_value is not None:
            details["previous_value"] = previous_value
        if new_value is not None:
            details["new_value"] = new_value

        insert_payload: Dict[str, Any] = {
            "prd_id": str(prd_id),
            "action": action,
            "details": details or None,
            "user_id": str(user_id),
            "user_email": user_email,
            # created_at has a DB default, but set explicitly for consistent ordering
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("prd_audit_log").insert(insert_payload).execute()
    except Exception as e:
        logger.warning(f"Failed to log audit event: {e}")


class PRDApproveRequest(BaseModel):
    """Request to approve a PRD."""

    notes: Optional[str] = Field(default=None, max_length=5000)


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# GENERATION ENDPOINTS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@router.post("/generate")
async def generate_prd_sync(
    request: PRDGenerateRequest,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> Dict[str, Any]:
    """Generate a complete PRD (synchronous, non-streaming)."""
    start_time = time.time()
    
    # Build PRD input
    prd_input = PRDInput(
        problem_statement=request.problem_statement,
        target_users=request.target_users,
        constraints=request.constraints,
        product_name=request.product_name,
        template_version=request.template_version,
        jira_epic_key=request.jira_epic_key,
        slack_channel_ids=request.slack_channel_ids,
        github_repo=request.github_repo,
        max_features=request.max_features,
        include_technical_details=request.include_technical_details,
    )
    
    # Enrich context if requested
    context = None
    if request.enrich_context:
        try:
            context = await enrich_prd_context(
                prd_input,
                jira_integration_id=request.jira_integration_id,
                slack_integration_id=request.slack_integration_id,
            )
        except Exception as e:
            logger.warning(f"Context enrichment failed: {e}")
    
    # Create run record
    run_id = _create_prd_run(
        user_id=current_user.id,
        team_id=None,
        workspace_id=wctx.workspace_id ,
        prd_input=prd_input,
    )
    
    try:
        # Generate PRD
        result = await generate_prd(prd_input, context)
        
        # Save document
        prd_id = _save_prd_document(
            prd=result.prd,
            prd_input=prd_input,
            user_id=current_user.id,
            workspace_id=wctx.workspace_id ,
            run_id=run_id,
        )
        
        # Update run record
        _update_prd_run(
            run_id=run_id,
            status="succeeded",
            output={"prd_id": str(prd_id)},
            metrics={
                "latency_ms": result.generation_time_ms,
                "quality_score": result.prd.quality_score,
            },
        )

        # Emit notification event
        try:
            from app.services.events import event_bus, EventType
            event_bus.emit(EventType.PRD_COMPLETED, {
                "prd_id": str(prd_id),
                "run_id": str(run_id),
                "title": result.prd.title or prd_input.product_name,
                "quality_score": result.prd.quality_score,
                "features_count": len(result.prd.sections.features) if result.prd.sections and result.prd.sections.features else 0,
                "user_id": current_user.id,
                "workspace_id": str(wctx.workspace_id),
            })
        except Exception as _emit_err:
            logger.warning(f"Event emit failed: {_emit_err}")

        # Keep the HTTP response aligned with the frontend expectation:
        # `frontend/src/lib/api/prdService.ts` expects `{ prd: PRDDocument }`.
        return {
            "prd_id": str(prd_id),
            "run_id": str(run_id),
            "prd": result.prd.model_dump(mode="json"),
            "warnings": result.warnings,
            "generation_time_ms": result.generation_time_ms,
        }
    except Exception as e:
        _update_prd_run(run_id=run_id, status="failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"PRD generation failed: {str(e)[:200]}")


@router.post("/generate/stream")
async def generate_prd_streaming(
    request: PRDGenerateRequest,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> StreamingResponse:
    """Generate a PRD with streaming progress updates (SSE)."""
    
    # Build PRD input
    prd_input = PRDInput(
        problem_statement=request.problem_statement,
        target_users=request.target_users,
        constraints=request.constraints,
        product_name=request.product_name,
        template_version=request.template_version,
        jira_epic_key=request.jira_epic_key,
        slack_channel_ids=request.slack_channel_ids,
        github_repo=request.github_repo,
        max_features=request.max_features,
        include_technical_details=request.include_technical_details,
    )
    
    # Create run record
    run_id = _create_prd_run(
        user_id=current_user.id,
        team_id=None,
        workspace_id=wctx.workspace_id ,
        prd_input=prd_input,
    )
    
    async def event_generator():
        # Send run_created event
        yield f"data: {json.dumps({'type': 'run_created', 'run_id': str(run_id)})}\n\n"
        
        # Enrich context
        context = None
        if request.enrich_context:
            yield f"data: {json.dumps({'type': 'progress', 'stage': 'context', 'percent': 2, 'message': 'Gathering context...'})}\n\n"
            try:
                context = await enrich_prd_context(
                    prd_input,
                    jira_integration_id=request.jira_integration_id,
                    slack_integration_id=request.slack_integration_id,
                )
                if context:
                    yield f"data: {json.dumps({'type': 'context_complete', 'has_jira': context.jira is not None, 'has_slack': context.slack is not None, 'has_codebase': bool(getattr(context, 'codebase_analysis', None)), 'has_web': bool(getattr(context, 'web_search', None))})}\n\n"
            except Exception as e:
                logger.warning(f"Context enrichment failed: {e}")
                yield f"data: {json.dumps({'type': 'progress', 'message': 'Context gathering failed, continuing without external context'})}\n\n"
        
        prd_data = None
        try:
            async for event in generate_prd_stream(prd_input, context):
                yield f"data: {json.dumps(event.model_dump(mode='json'))}\n\n"
                
                # Capture final PRD data
                if event.type == "complete" and event.data:
                    prd_data = event.data.get("prd")
        
        except Exception as e:
            logger.error(f"PRD stream generation failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)[:200]})}\n\n"
            _update_prd_run(run_id=run_id, status="failed", error=str(e))
            return
        
        # Save document if generation completed
        if prd_data:
            try:
                prd = PRDDocument(**prd_data)
                workspace_id = wctx.workspace_id 
                prd_id = _save_prd_document(
                    prd=prd,
                    prd_input=prd_input,
                    user_id=current_user.id,
                    workspace_id=workspace_id,
                    run_id=run_id,
                )
                
                _update_prd_run(
                    run_id=run_id,
                    status="succeeded",
                    output={"prd_id": str(prd_id)},
                    metrics={
                        "latency_ms": prd.generation_time_ms,
                        "quality_score": prd.quality_score,
                    },
                )
                
                yield f"data: {json.dumps({'type': 'saved', 'prd_id': str(prd_id)})}\n\n"

                # Emit notification event
                try:
                    from app.services.events import event_bus, EventType
                    event_bus.emit(EventType.PRD_COMPLETED, {
                        "prd_id": str(prd_id),
                        "run_id": str(run_id),
                        "title": prd.title or prd_input.product_name,
                        "quality_score": prd.quality_score,
                        "features_count": len(prd.sections.features) if prd.sections and prd.sections.features else 0,
                        "user_id": current_user.id,
                        "workspace_id": str(wctx.workspace_id),
                    })
                except Exception as _emit_err:
                    logger.warning(f"Event emit failed: {_emit_err}")

            except Exception as e:
                logger.error(f"Failed to save PRD: {e}")
                yield f"data: {json.dumps({'type': 'warning', 'message': 'PRD generated but save failed'})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# CRUD ENDPOINTS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@router.get("")
async def list_prds(
    workspace_id: Optional[UUID] = None,
    status: Optional[PRDStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> PRDListResponse:
    """List PRDs for the workspace."""
    try:
        ws_id = workspace_id or (wctx.workspace_id )
        
        query = supabase.table("prd_documents").select(
            "id, title, status, quality_score, created_at, updated_at, created_by",
            count="exact",  # type: ignore[arg-type]
        ).eq("workspace_id", str(ws_id))
        
        if status:
            query = query.eq("status", status.value)
        
        query = query.order("created_at", desc=True)
        query = query.range((page - 1) * page_size, page * page_size - 1)
        
        result = query.execute()
        
        items = [
            PRDSummary(
                id=UUID(row["id"]),
                title=row.get("title"),
                status=PRDStatus(row["status"]),
                quality_score=row.get("quality_score"),
                created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")) if row.get("updated_at") else None,
                created_by=UUID(row["created_by"]) if row.get("created_by") else None,
            )
            for row in (result.data or [])
        ]
        
        return PRDListResponse(
            items=items,
            total=result.count or len(items),
            page=page,
            page_size=page_size,
        )
        
    except Exception as e:
        logger.error(f"Failed to list PRDs: {e}")
        raise HTTPException(status_code=500, detail="Failed to list PRDs")


@router.get("/{prd_id}")
async def get_prd(
    prd_id: UUID = Path(...),
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> Dict[str, Any]:
    """Get a specific PRD document."""
    workspace_id = wctx.workspace_id 
    
    data = _get_prd_document(prd_id, current_user.id, workspace_id)
    
    return {
        "prd": data,
    }


@router.patch("/{prd_id}")
async def update_prd(
    prd_id: UUID,
    request: PRDUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> Dict[str, Any]:
    """Update PRD metadata or content."""
    workspace_id = wctx.workspace_id 
    
    # Fetch existing
    existing = _get_prd_document(prd_id, current_user.id, workspace_id)
    
    # Check if approved (can't edit approved PRDs)
    if existing.get("status") == PRDStatus.APPROVED.value and request.status != PRDStatus.ARCHIVED:
        raise HTTPException(status_code=400, detail="Cannot modify approved PRD")
    
    # Build update
    update_data: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.title is not None:
        update_data["title"] = request.title
    if request.status is not None:
        update_data["status"] = request.status.value
    if request.sections is not None:
        update_data["sections"] = request.sections
    
    try:
        supabase.table("prd_documents").update(update_data).eq("id", str(prd_id)).execute()
        
        # Log audit event
        _log_audit_event(
            prd_id=prd_id,
            action="update",
            user_id=current_user.id,
            user_email=str(current_user.email),
            previous_value={"title": existing.get("title"), "status": existing.get("status")},
            new_value=update_data,
        )
        
        return {"success": True, "prd_id": str(prd_id)}
        
    except Exception as e:
        logger.error(f"Failed to update PRD: {e}")
        raise HTTPException(status_code=500, detail="Failed to update PRD")


@router.delete("/{prd_id}")
async def delete_prd(
    prd_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> Dict[str, Any]:
    """Delete a PRD document."""
    workspace_id = wctx.workspace_id 
    
    # Verify exists
    _get_prd_document(prd_id, current_user.id, workspace_id)
    
    try:
        supabase.table("prd_documents").delete().eq("id", str(prd_id)).execute()
        
        _log_audit_event(
            prd_id=prd_id,
            action="delete",
            user_id=current_user.id,
            user_email=str(current_user.email),
        )
        
        return {"success": True, "deleted": str(prd_id)}
        
    except Exception as e:
        logger.error(f"Failed to delete PRD: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete PRD")


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# SECTION REGENERATION
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@router.post("/{prd_id}/sections/{section}/regenerate")
async def regenerate_prd_section(
    prd_id: UUID,
    section: PRDSection,
    request: PRDRegenerateRequest,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> StreamingResponse:
    """Regenerate a specific PRD section with optional feedback."""
    workspace_id = wctx.workspace_id 
    
    # Fetch existing PRD
    data = _get_prd_document(prd_id, current_user.id, workspace_id)
    
    if data.get("status") == PRDStatus.APPROVED.value:
        raise HTTPException(status_code=400, detail="Cannot regenerate sections of approved PRD")
    
    # Reconstruct PRD document
    prd = PRDDocument(
        id=prd_id,
        template_version=data.get("template_version", "1.0"),
        status=PRDStatus(data.get("status", "draft")),
        title=data.get("title"),
        input=PRDInput(**data["input"]) if data.get("input") else None,
        sections=data.get("sections", {}),
        quality_score=data.get("quality_score"),
    )
    
    async def event_generator():
        previous_value = None
        new_value = None
        
        try:
            async for event in regenerate_section(
                prd=prd,
                section=section,
                feedback=request.feedback,
                preserve_parts=request.preserve_parts,
            ):
                yield f"data: {json.dumps(event.model_dump(mode='json'))}\n\n"
                
                if event.type == "section_complete":
                    new_value = event.data
        
        except Exception as e:
            logger.error(f"Section regeneration failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)[:200]})}\n\n"
            return
        
        # Update document with regenerated section
        if new_value:
            try:
                sections = data.get("sections", {})
                previous_value = sections.get(section.value)
                sections[section.value] = prd.sections.model_dump(mode="json").get(section.value)
                
                supabase.table("prd_documents").update({
                    "sections": sections,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", str(prd_id)).execute()
                
                _log_audit_event(
                    prd_id=prd_id,
                    action="regenerate",
                    user_id=current_user.id,
                    user_email=str(current_user.email),
                    section=section.value,
                    previous_value=previous_value,
                    new_value=new_value,
                )
                
                yield f"data: {json.dumps({'type': 'saved', 'section': section.value})}\n\n"
                
            except Exception as e:
                logger.error(f"Failed to save regenerated section: {e}")
                yield f"data: {json.dumps({'type': 'warning', 'message': 'Regenerated but save failed'})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )


@router.patch("/{prd_id}/sections/{section}")
async def update_section(
    prd_id: UUID,
    section: PRDSection,
    content: Dict[str, Any],
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> Dict[str, Any]:
    """Update a specific section content manually."""
    workspace_id = wctx.workspace_id 
    
    # Fetch existing
    data = _get_prd_document(prd_id, current_user.id, workspace_id)
    
    if data.get("status") == PRDStatus.APPROVED.value:
        raise HTTPException(status_code=400, detail="Cannot edit approved PRD")
    
    sections = data.get("sections", {})
    previous_value = sections.get(section.value)
    sections[section.value] = content
    
    try:
        supabase.table("prd_documents").update({
            "sections": sections,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", str(prd_id)).execute()
        
        _log_audit_event(
            prd_id=prd_id,
            action="edit",
            user_id=current_user.id,
            user_email=str(current_user.email),
            section=section.value,
            previous_value=previous_value,
            new_value=content,
        )
        
        return {"success": True, "section": section.value}
        
    except Exception as e:
        logger.error(f"Failed to update section: {e}")
        raise HTTPException(status_code=500, detail="Failed to update section")


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# APPROVAL WORKFLOW
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@router.post("/{prd_id}/approve")
async def approve_prd(
    prd_id: UUID,
    request: Optional[PRDApproveRequest] = Body(default=None),
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> Dict[str, Any]:
    """Approve a PRD and lock it for editing."""
    workspace_id = wctx.workspace_id 
    
    data = _get_prd_document(prd_id, current_user.id, workspace_id)
    
    if data.get("status") == PRDStatus.APPROVED.value:
        raise HTTPException(status_code=400, detail="PRD already approved")
    
    try:
        notes = request.notes if request else None
        supabase.table("prd_documents").update({
            "status": PRDStatus.APPROVED.value,
            "approved_by": str(current_user.id),
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approval_notes": notes,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", str(prd_id)).execute()
        
        _log_audit_event(
            prd_id=prd_id,
            action="approve",
            user_id=current_user.id,
            user_email=str(current_user.email),
            new_value={"approval_notes": notes} if notes else None,
        )
        
        return {"success": True, "status": "approved"}
        
    except Exception as e:
        logger.error(f"Failed to approve PRD: {e}")
        raise HTTPException(status_code=500, detail="Failed to approve PRD")


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# EXPORT ENDPOINTS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@router.get("/{prd_id}/export/{format}")
async def export_prd(
    prd_id: UUID,
    format: ExportFormat,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> Response:
    """Export PRD to various formats."""
    workspace_id = wctx.workspace_id 
    
    data = _get_prd_document(prd_id, current_user.id, workspace_id)
    
    if format == ExportFormat.MARKDOWN:
        content = _export_to_markdown(data)
        return Response(
            content=content,
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename=prd_{prd_id}.md"},
        )
    
    elif format == ExportFormat.JSON:
        return Response(
            content=json.dumps(data, indent=2, default=str),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=prd_{prd_id}.json"},
        )
    
    elif format == ExportFormat.PDF:
        # Generate a simple PDF (pure-Python) from the Markdown export.
        try:
            pdf_bytes = _export_to_pdf(data)
        except ImportError:
            raise HTTPException(
                status_code=501,
                detail="PDF export not available (missing dependency: fpdf2)",
            )
        except Exception as e:
            logger.error(f"PDF export failed: {e}")
            raise HTTPException(status_code=500, detail="PDF export failed")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=prd_{prd_id}.pdf"},
        )
    
    elif format == ExportFormat.JIRA:
        # Jira export requires POST body; redirect users to the dedicated endpoint.
        raise HTTPException(
            status_code=400,
            detail="Use POST /api/prd/{prd_id}/export/jira for Jira export (requires integration_id and project_key)."
        )
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown export format: {format}")


# Jira export — dedicated POST endpoint
class JiraExportRequest(BaseModel):
    """Request to export PRD features to Jira."""
    integration_id: str = Field(..., description="Jira OAuth integration ID")
    project_key: str = Field(..., description="Target Jira project key (e.g., 'PROJ')")
    issue_type: str = Field("Story", description="Jira issue type name")
    feature_ids: Optional[List[str]] = Field(None, description="Filter to specific feature IDs")
    epic_key: Optional[str] = Field(None, description="Epic to link stories under")
    labels: Optional[List[str]] = Field(None, description="Labels to add to each issue")


class JiraExportItem(BaseModel):
    """Result of a single Jira issue creation."""
    feature_id: str
    feature_title: str
    jira_key: Optional[str] = None
    jira_id: Optional[str] = None
    error: Optional[str] = None


class JiraExportResponse(BaseModel):
    """Response from Jira export."""
    created: int
    failed: int
    items: List[JiraExportItem]


@router.post("/{prd_id}/export/jira", response_model=JiraExportResponse)
async def export_prd_to_jira(
    prd_id: UUID,
    body: JiraExportRequest,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
):
    """Export PRD features as Jira issues.

    Creates one Jira issue per selected feature using the linked Jira integration.
    """
    from app.services.jira.token_manager import JiraOAuthManager
    from app.services.jira.api_client import JiraAPIClient

    workspace_id = wctx.workspace_id
    prd_data = _get_prd_document(prd_id, current_user.id, workspace_id)
    sections = prd_data.get("sections", {})

    # Extract features
    features_raw = sections.get("features") or sections.get("feature_specifications") or []
    if isinstance(features_raw, dict):
        features_raw = features_raw.get("features", [])
    if not features_raw:
        raise HTTPException(status_code=400, detail="PRD has no features to export")

    if body.feature_ids:
        fids = set(body.feature_ids)
        features_raw = [f for f in features_raw if isinstance(f, dict) and f.get("id") in fids]

    # Get authenticated Jira client
    try:
        oauth_mgr = JiraOAuthManager(
            client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
            client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value() if settings.JIRA_OAUTH_CLIENT_SECRET else "")
        )
        access_token, cloud_id = await oauth_mgr.ensure_valid_token(
            body.integration_id, str(workspace_id)
        )
        client = JiraAPIClient(access_token, cloud_id)
    except Exception as e:
        logger.error(f"Failed to authenticate Jira: {e}")
        raise HTTPException(status_code=401, detail=f"Jira authentication failed: {e}")

    prd_title = prd_data.get("title", "PRD")
    priority_map = {"P0": "Highest", "P1": "High", "P2": "Medium", "P3": "Low"}
    results: List[JiraExportItem] = []

    for feat in features_raw:
        if not isinstance(feat, dict):
            continue
        fid = feat.get("id", "?")
        ftitle = feat.get("title", "Untitled")
        try:
            # Build description text
            desc_parts = [feat.get("description", "")]
            if feat.get("user_value"):
                desc_parts.append(f"\nUser Value: {feat['user_value']}")
            ac = feat.get("acceptance_criteria", [])
            if ac and isinstance(ac, list):
                desc_parts.append("\nAcceptance Criteria:")
                for i, criterion in enumerate(ac, 1):
                    desc_parts.append(f"  {i}. {criterion}")
            if feat.get("out_of_scope"):
                desc_parts.append(f"\nOut of Scope: {', '.join(str(s) for s in feat['out_of_scope'])}")
            desc_parts.append(f"\n---\nExported from PRD: {prd_title} (Feature {fid})")
            description_text = "\n".join(desc_parts)

            # Build Jira issue
            adf_desc = client.convert_text_to_adf(description_text)
            issue_data: Dict[str, Any] = {
                "fields": {
                    "project": {"key": body.project_key},
                    "summary": f"[{fid}] {ftitle}",
                    "description": adf_desc,
                    "issuetype": {"name": body.issue_type or "Story"},
                }
            }
            raw_priority = str(feat.get("priority", "P2")).upper()
            jira_priority = priority_map.get(raw_priority)
            if jira_priority:
                issue_data["fields"]["priority"] = {"name": jira_priority}
            if body.epic_key:
                issue_data["fields"]["customfield_10016"] = body.epic_key
            if body.labels:
                issue_data["fields"]["labels"] = body.labels

            result = await client.create_issue(issue_data)
            results.append(JiraExportItem(
                feature_id=fid,
                feature_title=ftitle,
                jira_key=result.get("key"),
                jira_id=result.get("id"),
            ))
        except Exception as e:
            logger.warning(f"Failed to create Jira issue for {fid}: {e}")
            results.append(JiraExportItem(
                feature_id=fid,
                feature_title=ftitle,
                error=str(e),
            ))

    created = sum(1 for r in results if not r.error)
    failed = sum(1 for r in results if r.error)

    # Audit log
    _log_audit_event(
        prd_id=prd_id,
        action="export_to_jira",
        user_id=current_user.id,
        user_email=str(current_user.email),
        new_value={
            "project_key": body.project_key,
            "created": created,
            "failed": failed,
            "jira_keys": [r.jira_key for r in results if r.jira_key],
        },
    )

    return JiraExportResponse(created=created, failed=failed, items=results)


def _export_to_markdown(prd_data: Dict[str, Any]) -> str:
    """Convert PRD document to Markdown format."""
    sections = prd_data.get("sections", {})
    title = prd_data.get("title", "Product Requirements Document")
    
    md = f"# {title}\n\n"
    md += f"**Template Version:** {prd_data.get('template_version', '1.0')}\n"
    md += f"**Status:** {prd_data.get('status', 'draft')}\n"
    md += f"**Created:** {prd_data.get('created_at', 'Unknown')}\n\n"
    
    # Executive Summary
    exec_summary = sections.get("executive_summary", {})
    if exec_summary:
        md += "## Executive Summary\n\n"
        md += f"### Vision\n{exec_summary.get('vision', 'N/A')}\n\n"
        md += f"### Problem Statement\n{exec_summary.get('problem_statement', 'N/A')}\n\n"
        md += f"### Solution Overview\n{exec_summary.get('solution_overview', 'N/A')}\n\n"
        
        objectives = exec_summary.get("key_objectives", [])
        if objectives:
            md += "### Key Objectives\n"
            for obj in objectives:
                md += f"- {obj}\n"
            md += "\n"
        
        metrics = exec_summary.get("success_metrics", [])
        if metrics:
            md += "### Success Metrics\n"
            for metric in metrics:
                if isinstance(metric, dict):
                    md += f"- **{metric.get('name', 'Metric')}**: {metric.get('target', 'TBD')} ({metric.get('measurement', '')})\n"
                else:
                    md += f"- {metric}\n"
            md += "\n"
    
    # Personas
    personas = sections.get("personas", [])
    if personas:
        md += "## User Personas\n\n"
        for persona in personas:
            md += f"### {persona.get('name', 'Persona')}\n"
            md += f"**Role:** {persona.get('role', 'N/A')}\n\n"
            
            if persona.get("background"):
                md += f"{persona['background']}\n\n"
            
            goals = persona.get("goals", [])
            if goals:
                md += "**Goals:**\n"
                for goal in goals:
                    md += f"- {goal}\n"
                md += "\n"
            
            pain_points = persona.get("pain_points", [])
            if pain_points:
                md += "**Pain Points:**\n"
                for pp in pain_points:
                    md += f"- {pp}\n"
                md += "\n"
            
            use_cases = persona.get("use_cases", [])
            if use_cases:
                md += "**Use Cases:**\n"
                for uc in use_cases:
                    md += f"- {uc}\n"
                md += "\n"
    
    # Features
    features = sections.get("features", [])
    if features:
        md += "## Feature Specifications\n\n"
        for feature in features:
            md += f"### {feature.get('id', 'F?')}: {feature.get('title', 'Feature')}\n"
            md += f"**Priority:** {feature.get('priority', 'N/A')}\n\n"
            md += f"{feature.get('description', 'N/A')}\n\n"
            md += f"**User Value:** {feature.get('user_value', 'N/A')}\n\n"
            
            ac = feature.get("acceptance_criteria", [])
            if ac:
                md += "**Acceptance Criteria:**\n"
                for criterion in ac:
                    md += f"- {criterion}\n"
                md += "\n"
    
    # Technical Requirements
    technical = sections.get("technical", {})
    if technical:
        md += "## Technical Requirements\n\n"
        md += f"### Architecture Overview\n{technical.get('architecture_overview', 'N/A')}\n\n"
        
        integrations = technical.get("integrations", [])
        if integrations:
            md += "### Integrations\n"
            for integration in integrations:
                md += f"- **{integration.get('name', 'Integration')}** ({integration.get('type', 'N/A')}): {integration.get('description', '')}\n"
            md += "\n"
        
        perf = technical.get("performance_requirements", [])
        if perf:
            md += "### Performance Requirements\n"
            for req in perf:
                md += f"- {req}\n"
            md += "\n"
        
        security = technical.get("security_requirements", [])
        if security:
            md += "### Security Requirements\n"
            for req in security:
                md += f"- {req}\n"
            md += "\n"
    
    # Risks
    risks = sections.get("risks", [])
    if risks:
        md += "## Risk Assessment\n\n"
        md += "| ID | Category | Risk | Probability | Impact | Mitigation |\n"
        md += "|---|---|---|---|---|---|\n"
        for risk in risks:
            md += f"| {risk.get('id', '?')} | {risk.get('category', 'N/A')} | {risk.get('title', 'N/A')} | {risk.get('probability', 'N/A')} | {risk.get('impact', 'N/A')} | {risk.get('mitigation', 'N/A')} |\n"
        md += "\n"
    
    # Timeline
    timeline = sections.get("timeline", [])
    if timeline:
        md += "## Implementation Timeline\n\n"
        for phase in timeline:
            md += f"### {phase.get('phase', 'Phase')}\n"
            md += f"**Duration:** {phase.get('duration', 'TBD')}\n\n"
            
            deliverables = phase.get("deliverables", [])
            if deliverables:
                md += "**Deliverables:**\n"
                for d in deliverables:
                    md += f"- {d}\n"
                md += "\n"
    
    return md


def _markdown_to_plain_text(md: str) -> str:
    """Best-effort Markdown -> plain text.

    This is intentionally conservative (no complex formatting) so the
    PDF export stays dependency-light and robust.
    """

    # Remove code fences but keep content
    md = re.sub(r"```[a-zA-Z0-9_-]*\n", "", md)
    md = md.replace("```", "")

    # Convert headings to just their text
    md = re.sub(r"^#{1,6}\s+", "", md, flags=re.MULTILINE)

    # Remove emphasis markers
    md = md.replace("**", "").replace("__", "")
    md = md.replace("*", "").replace("_", "")

    # Drop Markdown table separators, keep rows (pipes -> spaced)
    md = re.sub(r"^\|?\s*-{3,}.*\|?\s*$", "", md, flags=re.MULTILINE)
    md = md.replace("|", "  ")

    # Normalize whitespace
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip() + "\n"


def _sanitize_for_pdf(text: str) -> str:
    """Remove or replace characters that cannot be rendered by the built-in
    Helvetica font (latin-1 only). Emojis, smart quotes, dashes, etc. are
    normalised so the PDF doesn't blow up."""

    replacements: dict[str, str] = {
        "\u2018": "'", "\u2019": "'",   # smart single quotes
        "\u201c": '"', "\u201d": '"',   # smart double quotes
        "\u2013": "-", "\u2014": "--",  # en-dash, em-dash
        "\u2026": "...",                # ellipsis
        "\u2022": "*",                  # bullet
        "\u00a0": " ",                  # non-breaking space
        "\u200b": "",                   # zero-width space
        "\u2032": "'", "\u2033": '"',   # prime / double-prime
        "\u2192": "->",                 # right arrow
        "\u2190": "<-",                 # left arrow
        "\u2713": "[x]",               # check mark
        "\u2717": "[ ]",               # ballot x
        "\u2605": "*",                  # star
        "\u00d7": "x",                  # multiplication sign
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)

    # Drop any remaining non-latin-1 characters (emojis, CJK, etc.)
    cleaned = []
    for ch in text:
        try:
            ch.encode("latin-1")
            cleaned.append(ch)
        except UnicodeEncodeError:
            cleaned.append("?")
    return "".join(cleaned)


def _export_to_pdf(prd_data: Dict[str, Any]) -> bytes:
    """Convert PRD document to a basic PDF.

    Uses fpdf2 (pure Python). Output is intentionally simple but valid.
    """

    try:
        from fpdf import FPDF  # type: ignore
    except Exception as e:
        # Raise ImportError so the endpoint can map to 501.
        raise ImportError("fpdf2 is required for PDF export") from e

    title = _sanitize_for_pdf(prd_data.get("title") or "Product Requirements Document")

    md = _export_to_markdown(prd_data)
    text = _sanitize_for_pdf(_markdown_to_plain_text(md))

    pdf = FPDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.multi_cell(0, 10, title)
    pdf.ln(2)

    # Body
    pdf.set_font("Helvetica", size=11)
    for line in text.splitlines():
        # Avoid writing empty lines with a full-height cell (looks odd)
        if not line.strip():
            pdf.ln(4)
            continue
        pdf.multi_cell(0, 6, line)

    out = pdf.output(dest="S")
    if isinstance(out, (bytes, bytearray)):
        return bytes(out)
    # fpdf2 returns a latin-1 string for dest="S" in some versions
    return out.encode("latin-1")


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# TEMPLATE ENDPOINTS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@router.get("/templates")
async def list_templates(
    include_deprecated: bool = False,
    current_user: UserModel = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List available PRD templates."""
    # For now, return hardcoded templates
    # In production, these would come from prd_templates table
    templates = [
        {
            "version": "1.0",
            "name": "Standard PRD",
            "description": "Standard product requirements document template",
            "sections": [
                "executive_summary",
                "personas",
                "features",
                "technical",
                "risks",
                "timeline",
            ],
            "compliance_standards": [],
        },
        {
            "version": "2.0",
            "name": "Enterprise PRD",
            "description": "Enterprise template with compliance support",
            "sections": [
                "executive_summary",
                "personas",
                "features",
                "technical",
                "risks",
                "timeline",
            ],
            "compliance_standards": ["SOC2", "GDPR"],
        },
    ]
    
    return templates


@router.post("/{prd_id}/migrate")
async def migrate_template(
    prd_id: UUID,
    target_version: str,
    dry_run: bool = True,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> MigrationResult:
    """Migrate PRD to a new template version."""
    workspace_id = wctx.workspace_id 
    
    data = _get_prd_document(prd_id, current_user.id, workspace_id)
    current_version = data.get("template_version", "1.0")
    
    if current_version == target_version:
        return MigrationResult(
            success=True,
            from_version=current_version,
            to_version=target_version,
            changes=[],
            dry_run=dry_run,
        )
    
    # For now, just update version (real migration logic would go here)
    if not dry_run:
        try:
            supabase.table("prd_documents").update({
                "template_version": target_version,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", str(prd_id)).execute()
            
            _log_audit_event(
                prd_id=prd_id,
                action="migrate",
                user_id=current_user.id,
                user_email=str(current_user.email),
                previous_value={"template_version": current_version},
                new_value={"template_version": target_version},
            )
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise HTTPException(status_code=500, detail="Migration failed")
    
    return MigrationResult(
        success=True,
        from_version=current_version,
        to_version=target_version,
        changes=[],
        dry_run=dry_run,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# VERSION HISTORY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class PRDVersionResponse(BaseModel):
    """Response model for PRD version."""
    id: str
    prd_id: str
    version_number: int
    change_summary: Optional[str] = None
    changed_sections: Optional[List[str]] = None
    document_snapshot: Dict[str, Any]
    created_at: str
    created_by: str
    created_by_email: Optional[str] = None


class PRDVersionListResponse(BaseModel):
    """Response model for version list."""
    items: List[PRDVersionResponse]
    total: int


class PRDVersionCompareResponse(BaseModel):
    """Response model for version comparison."""
    version_a: PRDVersionResponse
    version_b: PRDVersionResponse
    differences: List[Dict[str, Any]]


def _save_prd_version(
    prd_id: UUID,
    document_data: Dict[str, Any],
    user_id: UUID,
    change_summary: Optional[str] = None,
    changed_sections: Optional[List[str]] = None,
) -> int:
    """Save a new PRD version."""
    try:
        # Get current max version number
        result = supabase.table("prd_versions").select("version_number").eq(
            "prd_id", str(prd_id)
        ).order("version_number", desc=True).limit(1).execute()
        
        current_max = result.data[0]["version_number"] if result.data else 0
        new_version = current_max + 1
        
        # Insert new version
        supabase.table("prd_versions").insert({
            "id": str(uuid4()),
            "prd_id": str(prd_id),
            "version_number": new_version,
            "change_summary": change_summary,
            "changed_sections": changed_sections,
            "sections": document_data,
            "created_by": str(user_id),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        
        return new_version
    except Exception as e:
        logger.error(f"Failed to save PRD version: {e}")
        raise HTTPException(status_code=500, detail="Failed to save version")


@router.get("/{prd_id}/versions")
async def list_prd_versions(
    prd_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> PRDVersionListResponse:
    """List all versions of a PRD."""
    workspace_id = wctx.workspace_id
    
    # Verify PRD exists and user has access
    _get_prd_document(prd_id, current_user.id, workspace_id)
    
    try:
        result = supabase.table("prd_versions").select(
            "*, profiles:created_by(email)"
        ).eq("prd_id", str(prd_id)).order("version_number", desc=True).execute()
        
        versions = []
        for v in result.data:
            profile = v.pop("profiles", None)
            versions.append(PRDVersionResponse(
                id=v["id"],
                prd_id=v["prd_id"],
                version_number=v["version_number"],
                change_summary=v.get("change_summary"),
                changed_sections=v.get("changed_sections"),
                document_snapshot=v.get("sections", {}),
                created_at=v["created_at"],
                created_by=v["created_by"],
                created_by_email=profile.get("email") if profile else None,
            ))
        
        return PRDVersionListResponse(items=versions, total=len(versions))
    except Exception as e:
        logger.error(f"Failed to list PRD versions: {e}")
        raise HTTPException(status_code=500, detail="Failed to list versions")


@router.get("/{prd_id}/versions/latest")
async def get_latest_prd_version(
    prd_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> PRDVersionResponse:
    """Get the latest version of a PRD."""
    workspace_id = wctx.workspace_id
    
    # Verify PRD exists and user has access
    _get_prd_document(prd_id, current_user.id, workspace_id)
    
    try:
        result = supabase.table("prd_versions").select(
            "*, profiles:created_by(email)"
        ).eq("prd_id", str(prd_id)).order("version_number", desc=True).limit(1).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="No versions found")
        
        v = result.data[0]
        profile = v.pop("profiles", None)
        
        return PRDVersionResponse(
            id=v["id"],
            prd_id=v["prd_id"],
            version_number=v["version_number"],
            change_summary=v.get("change_summary"),
            changed_sections=v.get("changed_sections"),
            document_snapshot=v.get("sections", {}),
            created_at=v["created_at"],
            created_by=v["created_by"],
            created_by_email=profile.get("email") if profile else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get latest PRD version: {e}")
        raise HTTPException(status_code=500, detail="Failed to get version")


@router.get("/{prd_id}/versions/{version_number}")
async def get_prd_version(
    prd_id: UUID,
    version_number: int = Path(..., ge=1),
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> PRDVersionResponse:
    """Get a specific version of a PRD."""
    workspace_id = wctx.workspace_id
    
    # Verify PRD exists and user has access
    _get_prd_document(prd_id, current_user.id, workspace_id)
    
    try:
        result = supabase.table("prd_versions").select(
            "*, profiles:created_by(email)"
        ).eq("prd_id", str(prd_id)).eq("version_number", version_number).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Version not found")
        
        v = result.data
        profile = v.pop("profiles", None)
        
        return PRDVersionResponse(
            id=v["id"],
            prd_id=v["prd_id"],
            version_number=v["version_number"],
            change_summary=v.get("change_summary"),
            changed_sections=v.get("changed_sections"),
            document_snapshot=v.get("sections", {}),
            created_at=v["created_at"],
            created_by=v["created_by"],
            created_by_email=profile.get("email") if profile else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get PRD version: {e}")
        raise HTTPException(status_code=500, detail="Failed to get version")


@router.get("/{prd_id}/versions/compare")
async def compare_prd_versions(
    prd_id: UUID,
    v1: int = Query(..., ge=1, description="First version number"),
    v2: int = Query(..., ge=1, description="Second version number"),
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> PRDVersionCompareResponse:
    """Compare two versions of a PRD."""
    workspace_id = wctx.workspace_id
    
    # Verify PRD exists and user has access
    _get_prd_document(prd_id, current_user.id, workspace_id)
    
    # Get both versions
    try:
        result_a = supabase.table("prd_versions").select(
            "*, profiles:created_by(email)"
        ).eq("prd_id", str(prd_id)).eq("version_number", v1).single().execute()
        
        result_b = supabase.table("prd_versions").select(
            "*, profiles:created_by(email)"
        ).eq("prd_id", str(prd_id)).eq("version_number", v2).single().execute()
        
        if not result_a.data or not result_b.data:
            raise HTTPException(status_code=404, detail="One or both versions not found")
        
        va, vb = result_a.data, result_b.data
        profile_a, profile_b = va.pop("profiles", None), vb.pop("profiles", None)
        
        # Calculate differences
        differences = []
        doc_a, doc_b = va.get("sections", {}), vb.get("sections", {})
        
        for section_key in set(list(doc_a.keys()) + list(doc_b.keys())):
            if section_key in doc_a and section_key in doc_b:
                if doc_a[section_key] != doc_b[section_key]:
                    differences.append({
                        "section": section_key,
                        "field": section_key,
                        "old_value": doc_a[section_key] if v1 < v2 else doc_b[section_key],
                        "new_value": doc_b[section_key] if v1 < v2 else doc_a[section_key],
                    })
            elif section_key in doc_a:
                differences.append({
                    "section": section_key,
                    "field": section_key,
                    "old_value": doc_a[section_key] if v1 < v2 else None,
                    "new_value": None if v1 < v2 else doc_a[section_key],
                })
            else:
                differences.append({
                    "section": section_key,
                    "field": section_key,
                    "old_value": None if v1 < v2 else doc_b[section_key],
                    "new_value": doc_b[section_key] if v1 < v2 else None,
                })
        
        return PRDVersionCompareResponse(
            version_a=PRDVersionResponse(
                id=va["id"],
                prd_id=va["prd_id"],
                version_number=va["version_number"],
                change_summary=va.get("change_summary"),
                changed_sections=va.get("changed_sections"),
                document_snapshot=va.get("sections", {}),
                created_at=va["created_at"],
                created_by=va["created_by"],
                created_by_email=profile_a.get("email") if profile_a else None,
            ),
            version_b=PRDVersionResponse(
                id=vb["id"],
                prd_id=vb["prd_id"],
                version_number=vb["version_number"],
                change_summary=vb.get("change_summary"),
                changed_sections=vb.get("changed_sections"),
                document_snapshot=vb.get("sections", {}),
                created_at=vb["created_at"],
                created_by=vb["created_by"],
                created_by_email=profile_b.get("email") if profile_b else None,
            ),
            differences=differences,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to compare PRD versions: {e}")
        raise HTTPException(status_code=500, detail="Failed to compare versions")


@router.post("/{prd_id}/versions/{version_number}/restore")
async def restore_prd_version(
    prd_id: UUID,
    version_number: int = Path(..., ge=1),
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> PRDVersionResponse:
    """Restore a PRD to a specific version (creates a new version from old snapshot)."""
    workspace_id = wctx.workspace_id
    
    # Verify PRD exists and user has access
    prd_data = _get_prd_document(prd_id, current_user.id, workspace_id)
    
    try:
        # Get the version to restore
        result = supabase.table("prd_versions").select("*").eq(
            "prd_id", str(prd_id)
        ).eq("version_number", version_number).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Version not found")
        
        snapshot = result.data.get("sections", {})
        
        # Update the PRD document with restored content
        supabase.table("prd_documents").update({
            "sections": snapshot.get("sections", snapshot),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", str(prd_id)).execute()
        
        # Create new version entry
        new_version_num = _save_prd_version(
            prd_id=prd_id,
            document_data=snapshot,
            user_id=current_user.id,
            change_summary=f"Restored from version {version_number}",
            changed_sections=list(snapshot.keys()) if isinstance(snapshot, dict) else None,
        )
        
        # Log audit event
        _log_audit_event(
            prd_id=prd_id,
            action="restore_version",
            user_id=current_user.id,
            user_email=str(current_user.email),
            previous_value={"version": version_number},
            new_value={"version": new_version_num},
        )
        
        return PRDVersionResponse(
            id=str(uuid4()),  # New version ID
            prd_id=str(prd_id),
            version_number=new_version_num,
            change_summary=f"Restored from version {version_number}",
            changed_sections=list(snapshot.keys()) if isinstance(snapshot, dict) else None,
            document_snapshot=snapshot,
            created_at=datetime.now(timezone.utc).isoformat(),
            created_by=str(current_user.id),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to restore PRD version: {e}")
        raise HTTPException(status_code=500, detail="Failed to restore version")


# ═══════════════════════════════════════════════════════════════════════════════
# CREATE BACKLOG — Convert PRD features into project issues
# ═══════════════════════════════════════════════════════════════════════════════

class CreateBacklogRequest(BaseModel):
    """Request body for converting PRD features to backlog issues."""
    project_id: UUID = Field(..., description="Target project for created issues")
    feature_ids: Optional[List[str]] = Field(
        None, description="Optional list of feature IDs to include (e.g., ['F1','F3']). If omitted, all features are converted."
    )
    issue_type: str = Field("story", description="Issue type for created items (story/task/feature)")
    dry_run: bool = Field(False, description="If true, return mapped issues without creating them")


class BacklogIssueResult(BaseModel):
    """Result of a single issue creation."""
    feature_id: str
    feature_title: str
    issue_id: Optional[str] = None
    issue_key: Optional[str] = None
    error: Optional[str] = None


class CreateBacklogResponse(BaseModel):
    """Response from backlog creation."""
    prd_id: str
    project_id: str
    created: int
    skipped: int
    dry_run: bool
    items: List[BacklogIssueResult]


_PRIORITY_MAP = {"P0": "critical", "P1": "high", "P2": "medium", "P3": "low"}
_EFFORT_TO_POINTS = {"S": 1, "M": 3, "L": 5, "XL": 8}


@router.post("/{prd_id}/create-backlog", response_model=CreateBacklogResponse)
async def create_backlog_from_prd(
    prd_id: UUID,
    body: CreateBacklogRequest,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
):
    """Convert PRD features into backlog issues in a target project.
    
    Maps FeatureSpec fields → Issue fields:
    - title, description → issue title/description
    - priority (P0–P3) → critical/high/medium/low
    - acceptance_criteria → structured criteria list
    - estimated_effort (S/M/L/XL) → story_points (1/3/5/8)
    """
    workspace_id = wctx.workspace_id

    # 1. Validate PRD exists & belongs to workspace
    prd_data = _get_prd_document(prd_id, current_user.id, workspace_id)
    sections = prd_data.get("sections", {})

    # 2. Extract features
    features_raw = sections.get("features") or sections.get("feature_specifications") or []
    if isinstance(features_raw, dict):
        features_raw = features_raw.get("features", [])
    if not features_raw:
        raise HTTPException(status_code=400, detail="PRD has no features to convert")

    # 3. Filter by requested feature IDs
    if body.feature_ids:
        feature_ids_set = set(body.feature_ids)
        features_raw = [f for f in features_raw if isinstance(f, dict) and f.get("id") in feature_ids_set]
        if not features_raw:
            raise HTTPException(status_code=400, detail="None of the requested feature IDs were found")

    # 4. Validate target project
    proj_res = supabase.table("projects").select("id,key,workspace_id").eq(
        "id", str(body.project_id)
    ).maybe_single().execute()
    proj_row = getattr(proj_res, "data", None)
    if not proj_row:
        raise HTTPException(status_code=404, detail="Target project not found")
    if proj_row.get("workspace_id") and str(proj_row["workspace_id"]) != str(workspace_id):
        raise HTTPException(status_code=403, detail="Project does not belong to this workspace")
    proj_key = proj_row.get("key") or "ISS"

    # 5. Get current issue count for key sequencing
    count_res = supabase.table("issues").select("id").eq(
        "project_id", str(body.project_id)
    ).execute()
    seq = len(getattr(count_res, "data", []) or []) + 1

    # 6. Map features → issue rows
    prd_title = prd_data.get("title", "PRD")
    rows = []
    results: List[BacklogIssueResult] = []

    for feat in features_raw:
        if not isinstance(feat, dict):
            continue
        fid = feat.get("id", "?")
        ftitle = feat.get("title", "Untitled Feature")

        try:
            # Map priority
            raw_priority = feat.get("priority", "P2")
            priority = _PRIORITY_MAP.get(str(raw_priority).upper(), "medium")

            # Map effort → story points
            effort = feat.get("estimated_effort", "M")
            story_points = _EFFORT_TO_POINTS.get(str(effort).upper(), 3)

            # Build description with PRD context
            desc_parts = [feat.get("description", "")]
            if feat.get("user_value"):
                desc_parts.append(f"\n**User Value:** {feat['user_value']}")
            if feat.get("target_personas"):
                personas = feat["target_personas"]
                if isinstance(personas, list):
                    desc_parts.append(f"\n**Target Personas:** {', '.join(str(p) for p in personas)}")
            if feat.get("out_of_scope"):
                oos = feat["out_of_scope"]
                if isinstance(oos, list) and oos:
                    desc_parts.append(f"\n**Out of Scope:** {', '.join(str(s) for s in oos)}")
            desc_parts.append(f"\n\n---\n_Generated from PRD: {prd_title} (Feature {fid})_")
            description = "\n".join(desc_parts)

            # Map acceptance criteria
            raw_ac = feat.get("acceptance_criteria", [])
            acceptance_criteria = []
            if isinstance(raw_ac, list):
                for ac in raw_ac:
                    if isinstance(ac, str):
                        acceptance_criteria.append({"text": ac, "done": False})
                    elif isinstance(ac, dict) and "text" in ac:
                        acceptance_criteria.append({"text": ac["text"], "done": bool(ac.get("done", False))})

            issue_key = f"{proj_key}-{seq}"
            row = {
                "id": str(uuid4()),
                "issue_key": issue_key,
                "title": f"[{fid}] {ftitle}",
                "status": "todo",
                "priority": priority,
                "type": body.issue_type or "story",
                "project_id": str(body.project_id),
                "workspace_id": str(workspace_id),
                "description": description,
                "story_points": story_points,
                "acceptance_criteria": acceptance_criteria if acceptance_criteria else None,
                "owner_id": str(current_user.id),
                "search_blob": f"{ftitle} {feat.get('description', '')} {fid}".lower(),
            }
            rows.append(row)
            results.append(BacklogIssueResult(
                feature_id=fid,
                feature_title=ftitle,
                issue_id=row["id"],
                issue_key=issue_key,
            ))
            seq += 1
        except Exception as e:
            logger.warning(f"Failed to map feature {fid}: {e}")
            results.append(BacklogIssueResult(
                feature_id=fid,
                feature_title=ftitle,
                error=str(e),
            ))

    # 7. Insert if not dry run
    skipped = sum(1 for r in results if r.error)
    if not body.dry_run and rows:
        CHUNK = 100
        for i in range(0, len(rows), CHUNK):
            supabase.table("issues").insert(rows[i:i + CHUNK]).execute()

    # 8. Audit log
    if not body.dry_run and rows:
        _log_audit_event(
            prd_id=prd_id,
            action="create_backlog",
            user_id=current_user.id,
            user_email=str(current_user.email),
            new_value={
                "project_id": str(body.project_id),
                "features_count": len(rows),
                "issue_keys": [r.issue_key for r in results if r.issue_key],
            },
        )

    return CreateBacklogResponse(
        prd_id=str(prd_id),
        project_id=str(body.project_id),
        created=0 if body.dry_run else len(rows),
        skipped=skipped,
        dry_run=body.dry_run,
        items=results,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# COLLABORATION — Comments & Reviewers
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Comment Models ───

class CommentCreate(BaseModel):
    section: str
    body: str = Field(..., min_length=1, max_length=5000)
    parent_id: Optional[str] = None
    field_path: Optional[str] = None

class CommentUpdate(BaseModel):
    body: Optional[str] = Field(None, min_length=1, max_length=5000)
    resolved: Optional[bool] = None

class CommentResponse(BaseModel):
    id: str
    prd_id: str
    section: str
    field_path: Optional[str] = None
    body: str
    parent_id: Optional[str] = None
    author_id: str
    author_email: Optional[str] = None
    resolved: bool = False
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: str
    updated_at: str
    replies: Optional[List["CommentResponse"]] = None

# ─── Comment Endpoints ───

@router.get("/{prd_id}/comments", response_model=List[CommentResponse])
async def list_comments(
    prd_id: UUID,
    section: Optional[str] = Query(None),
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
):
    """List all comments on a PRD, optionally filtered by section."""
    _get_prd_document(prd_id, current_user.id, wctx.workspace_id)

    query = supabase.table("prd_comments").select("*").eq("prd_id", str(prd_id))
    if section:
        query = query.eq("section", section)
    query = query.order("created_at", desc=False)
    result = query.execute()
    rows = getattr(result, "data", []) or []

    # Build threaded structure
    by_id: Dict[str, Dict[str, Any]] = {}
    roots: List[Dict[str, Any]] = []
    for r in rows:
        r["replies"] = []
        by_id[r["id"]] = r
    for r in rows:
        pid = r.get("parent_id")
        if pid and pid in by_id:
            by_id[pid]["replies"].append(r)
        else:
            roots.append(r)

    return roots


@router.post("/{prd_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    prd_id: UUID,
    body: CommentCreate,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
):
    """Add a comment to a PRD section."""
    _get_prd_document(prd_id, current_user.id, wctx.workspace_id)

    row = {
        "id": str(uuid4()),
        "prd_id": str(prd_id),
        "section": body.section,
        "field_path": body.field_path,
        "body": body.body,
        "parent_id": body.parent_id,
        "author_id": str(current_user.id),
        "author_email": str(current_user.email),
    }
    result = supabase.table("prd_comments").insert(row).execute()
    data = getattr(result, "data", [None])[0]
    return data


@router.patch("/{prd_id}/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    prd_id: UUID,
    comment_id: UUID,
    body: CommentUpdate,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
):
    """Update or resolve a comment."""
    _get_prd_document(prd_id, current_user.id, wctx.workspace_id)

    updates: Dict[str, Any] = {}
    if body.body is not None:
        updates["body"] = body.body
    if body.resolved is not None:
        updates["resolved"] = body.resolved
        if body.resolved:
            updates["resolved_by"] = str(current_user.id)
            updates["resolved_at"] = datetime.now(timezone.utc).isoformat()
        else:
            updates["resolved_by"] = None
            updates["resolved_at"] = None
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = supabase.table("prd_comments").update(updates).eq(
        "id", str(comment_id)
    ).eq("prd_id", str(prd_id)).execute()
    data = getattr(result, "data", [None])
    if not data or not data[0]:
        raise HTTPException(status_code=404, detail="Comment not found")
    return data[0]


@router.delete("/{prd_id}/comments/{comment_id}", status_code=204)
async def delete_comment(
    prd_id: UUID,
    comment_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
):
    """Delete a comment (author only)."""
    _get_prd_document(prd_id, current_user.id, wctx.workspace_id)
    supabase.table("prd_comments").delete().eq(
        "id", str(comment_id)
    ).eq("author_id", str(current_user.id)).execute()


# ─── Reviewer Models ───

class ReviewerAssign(BaseModel):
    user_id: str
    email: Optional[str] = None

class ReviewerUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|approved|changes_requested|commented)$")
    feedback: Optional[str] = None

class ReviewerResponse(BaseModel):
    id: str
    prd_id: str
    user_id: str
    email: Optional[str] = None
    status: str
    feedback: Optional[str] = None
    reviewed_at: Optional[str] = None
    assigned_by: Optional[str] = None
    assigned_at: str

# ─── Reviewer Endpoints ───

@router.get("/{prd_id}/reviewers", response_model=List[ReviewerResponse])
async def list_reviewers(
    prd_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
):
    """List all reviewers assigned to a PRD."""
    _get_prd_document(prd_id, current_user.id, wctx.workspace_id)
    result = supabase.table("prd_reviewers").select("*").eq("prd_id", str(prd_id)).execute()
    return getattr(result, "data", []) or []


@router.post("/{prd_id}/reviewers", response_model=ReviewerResponse, status_code=201)
async def assign_reviewer(
    prd_id: UUID,
    body: ReviewerAssign,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
):
    """Assign a reviewer to a PRD."""
    _get_prd_document(prd_id, current_user.id, wctx.workspace_id)

    row = {
        "id": str(uuid4()),
        "prd_id": str(prd_id),
        "user_id": body.user_id,
        "email": body.email,
        "assigned_by": str(current_user.id),
    }
    try:
        result = supabase.table("prd_reviewers").insert(row).execute()
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(status_code=409, detail="Reviewer already assigned")
        raise
    data = getattr(result, "data", [None])[0]
    return data


@router.patch("/{prd_id}/reviewers/{reviewer_id}", response_model=ReviewerResponse)
async def update_reviewer_status(
    prd_id: UUID,
    reviewer_id: UUID,
    body: ReviewerUpdate,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
):
    """Update a reviewer's status (approve, request changes, etc.)."""
    _get_prd_document(prd_id, current_user.id, wctx.workspace_id)

    updates = {
        "status": body.status,
        "feedback": body.feedback,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }
    result = supabase.table("prd_reviewers").update(updates).eq(
        "id", str(reviewer_id)
    ).eq("prd_id", str(prd_id)).execute()
    data = getattr(result, "data", [None])
    if not data or not data[0]:
        raise HTTPException(status_code=404, detail="Reviewer not found")
    return data[0]


@router.delete("/{prd_id}/reviewers/{reviewer_id}", status_code=204)
async def remove_reviewer(
    prd_id: UUID,
    reviewer_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
):
    """Remove a reviewer from a PRD."""
    _get_prd_document(prd_id, current_user.id, wctx.workspace_id)
    supabase.table("prd_reviewers").delete().eq(
        "id", str(reviewer_id)
    ).eq("prd_id", str(prd_id)).execute()
