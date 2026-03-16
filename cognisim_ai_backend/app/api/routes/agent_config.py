"""Agent Configuration API Routes

Endpoints for managing enterprise agent customization.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone
import logging

from app.core.dependencies import (
    get_current_user, 
    UserModel, 
    supabase, 
    get_workspace_context, 
    WorkspaceContext
)
from app.models.agent_config_models import (
    AgentType,
    AgentConfigCreate,
    AgentConfigUpdate,
    AgentConfigResponse,
    AgentConfigListResponse,
    AgentInstructionsConfig,
    EpicDecomposerConfig,
    PRDGeneratorConfig,
)

logger = logging.getLogger("agent_config_api")

router = APIRouter(
    prefix="/api/agent-configs",
    tags=["Agent Configuration"],
    dependencies=[Depends(get_current_user)],
)


# ═══════════════════════════════════════════════════════════════════════════════
# DEFAULT CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _get_default_config(agent_type: AgentType) -> Dict[str, Any]:
    """Get default configuration for an agent type."""
    if agent_type == AgentType.EPIC_DECOMPOSER:
        return EpicDecomposerConfig().model_dump()
    elif agent_type == AgentType.PRD_GENERATOR:
        return PRDGeneratorConfig().model_dump()
    return {}


# ═══════════════════════════════════════════════════════════════════════════════
# LIST & GET ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("", response_model=AgentConfigListResponse)
async def list_agent_configs(
    agent_type: Optional[AgentType] = Query(None, description="Filter by agent type"),
    active_only: bool = Query(True, description="Only return active configurations"),
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> AgentConfigListResponse:
    """List all agent configurations for the workspace."""
    try:
        query = supabase.table("agent_configs").select("*").eq(
            "workspace_id", str(wctx.workspace_id)
        )
        
        if agent_type:
            query = query.eq("agent_type", agent_type.value)
        
        if active_only:
            query = query.eq("is_active", True)
        
        result = query.order("created_at", desc=True).execute()
        rows = getattr(result, 'data', []) or []
        
        items = []
        for row in rows:
            items.append(_row_to_response(row))
        
        return AgentConfigListResponse(items=items, total=len(items))
    except Exception as e:
        logger.error(f"Failed to list agent configs: {e}")
        raise HTTPException(status_code=500, detail="Failed to list configurations")


@router.get("/default/{agent_type}")
async def get_default_config(
    agent_type: AgentType,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> Dict[str, Any]:
    """Get the default/active configuration for an agent type.
    
    Returns the workspace's default config if set, otherwise returns system defaults.
    """
    try:
        # Try to find workspace default
        result = supabase.table("agent_configs").select("*").eq(
            "workspace_id", str(wctx.workspace_id)
        ).eq("agent_type", agent_type.value).eq("is_default", True).eq(
            "is_active", True
        ).limit(1).execute()
        
        rows = getattr(result, 'data', []) or []
        
        if rows:
            return _row_to_response(rows[0]).model_dump()
        
        # Return system defaults
        return {
            "agent_type": agent_type.value,
            "name": f"Default {agent_type.value.replace('_', ' ').title()} Configuration",
            "is_default": True,
            "is_system_default": True,
            "instructions": AgentInstructionsConfig().model_dump(),
            "agent_config": _get_default_config(agent_type),
        }
    except Exception as e:
        logger.error(f"Failed to get default config: {e}")
        raise HTTPException(status_code=500, detail="Failed to get default configuration")


@router.get("/{config_id}", response_model=AgentConfigResponse)
async def get_agent_config(
    config_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> AgentConfigResponse:
    """Get a specific agent configuration."""
    try:
        result = supabase.table("agent_configs").select("*").eq(
            "id", str(config_id)
        ).eq("workspace_id", str(wctx.workspace_id)).limit(1).execute()
        
        rows = getattr(result, 'data', []) or []
        if not rows:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        return _row_to_response(rows[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get agent config: {e}")
        raise HTTPException(status_code=500, detail="Failed to get configuration")


# ═══════════════════════════════════════════════════════════════════════════════
# CREATE ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("", response_model=AgentConfigResponse)
async def create_agent_config(
    config: AgentConfigCreate,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> AgentConfigResponse:
    """Create a new agent configuration."""
    # Check permission (admin or owner)
    if wctx.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Only admins can create agent configurations")
    
    try:
        # Prepare agent-specific config
        agent_config = {}
        if config.agent_type == AgentType.EPIC_DECOMPOSER and config.epic_decomposer_config:
            agent_config = config.epic_decomposer_config.model_dump()
        elif config.agent_type == AgentType.PRD_GENERATOR and config.prd_generator_config:
            agent_config = config.prd_generator_config.model_dump()
        
        # If setting as default, unset other defaults first
        if config.is_default:
            supabase.table("agent_configs").update({"is_default": False}).eq(
                "workspace_id", str(wctx.workspace_id)
            ).eq("agent_type", config.agent_type.value).eq("is_default", True).execute()
        
        # Create the config
        data = {
            "workspace_id": str(wctx.workspace_id),
            "agent_type": config.agent_type.value,
            "name": config.name,
            "description": config.description,
            "is_default": config.is_default,
            "is_active": config.is_active,
            "instructions": config.instructions.model_dump(),
            "agent_config": agent_config,
            "created_by": str(current_user.id),
        }
        
        result = supabase.table("agent_configs").insert(data).execute()
        rows = getattr(result, 'data', []) or []
        
        if not rows:
            raise HTTPException(status_code=500, detail="Failed to create configuration")
        
        logger.info(f"Created agent config {rows[0]['id']} for workspace {wctx.workspace_id}")
        return _row_to_response(rows[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create agent config: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create configuration: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
# UPDATE ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@router.patch("/{config_id}", response_model=AgentConfigResponse)
async def update_agent_config(
    config_id: UUID,
    update: AgentConfigUpdate,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> AgentConfigResponse:
    """Update an agent configuration."""
    # Check permission
    if wctx.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Only admins can update agent configurations")
    
    try:
        # Verify config exists and belongs to workspace
        existing = supabase.table("agent_configs").select("*").eq(
            "id", str(config_id)
        ).eq("workspace_id", str(wctx.workspace_id)).limit(1).execute()
        
        rows = getattr(existing, 'data', []) or []
        if not rows:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        existing_config = rows[0]
        
        # Build update data
        update_data: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if update.name is not None:
            update_data["name"] = update.name
        if update.description is not None:
            update_data["description"] = update.description
        if update.is_active is not None:
            update_data["is_active"] = update.is_active
        if update.instructions is not None:
            update_data["instructions"] = update.instructions.model_dump()
        
        # Handle default flag
        if update.is_default is not None:
            if update.is_default and not existing_config.get("is_default"):
                # Unset other defaults first
                supabase.table("agent_configs").update({"is_default": False}).eq(
                    "workspace_id", str(wctx.workspace_id)
                ).eq("agent_type", existing_config["agent_type"]).eq("is_default", True).execute()
            update_data["is_default"] = update.is_default
        
        # Handle agent-specific config
        agent_type = AgentType(existing_config["agent_type"])
        if agent_type == AgentType.EPIC_DECOMPOSER and update.epic_decomposer_config:
            update_data["agent_config"] = update.epic_decomposer_config.model_dump()
        elif agent_type == AgentType.PRD_GENERATOR and update.prd_generator_config:
            update_data["agent_config"] = update.prd_generator_config.model_dump()
        
        # Perform update
        result = supabase.table("agent_configs").update(update_data).eq(
            "id", str(config_id)
        ).execute()
        
        updated_rows = getattr(result, 'data', []) or []
        if not updated_rows:
            raise HTTPException(status_code=500, detail="Failed to update configuration")
        
        logger.info(f"Updated agent config {config_id}")
        return _row_to_response(updated_rows[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update agent config: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
# DELETE ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@router.delete("/{config_id}")
async def delete_agent_config(
    config_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> Dict[str, str]:
    """Delete an agent configuration."""
    # Check permission
    if wctx.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Only admins can delete agent configurations")
    
    try:
        # Verify config exists
        existing = supabase.table("agent_configs").select("id").eq(
            "id", str(config_id)
        ).eq("workspace_id", str(wctx.workspace_id)).limit(1).execute()
        
        if not getattr(existing, 'data', []):
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        # Delete
        supabase.table("agent_configs").delete().eq("id", str(config_id)).execute()
        
        logger.info(f"Deleted agent config {config_id}")
        return {"message": "Configuration deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete agent config: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete configuration")


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _row_to_response(row: Dict[str, Any]) -> AgentConfigResponse:
    """Convert database row to response model."""
    agent_type = AgentType(row["agent_type"])
    instructions = AgentInstructionsConfig(**row.get("instructions", {}))
    agent_config = row.get("agent_config") or {}
    
    epic_config = None
    prd_config = None
    
    if agent_type == AgentType.EPIC_DECOMPOSER and agent_config:
        epic_config = EpicDecomposerConfig(**agent_config)
    elif agent_type == AgentType.PRD_GENERATOR and agent_config:
        prd_config = PRDGeneratorConfig(**agent_config)
    
    return AgentConfigResponse(
        id=UUID(row["id"]),
        workspace_id=UUID(row["workspace_id"]),
        agent_type=agent_type,
        name=row["name"],
        description=row.get("description"),
        is_default=row.get("is_default", False),
        is_active=row.get("is_active", True),
        instructions=instructions,
        epic_decomposer_config=epic_config,
        prd_generator_config=prd_config,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        created_by=UUID(row["created_by"]) if row.get("created_by") else UUID("00000000-0000-0000-0000-000000000000"),
    )
