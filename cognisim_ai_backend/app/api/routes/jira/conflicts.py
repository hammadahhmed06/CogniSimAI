"""
Jira Conflict Resolution API Routes
Handles conflict detection and resolution for bidirectional sync.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
import logging

from app.core.dependencies import get_workspace_context, WorkspaceContext, supabase
from app.services.jira.api_client import JiraAPIClient

router = APIRouter(prefix="/api/jira/conflicts", tags=["jira-conflicts"])
logger = logging.getLogger(__name__)


class ConflictResolution(BaseModel):
    """Model for resolving a conflict."""
    conflict_id: str
    resolution: Literal["use_local", "use_jira", "merge"]
    merged_data: Optional[Dict[str, Any]] = None


class ConflictResponse(BaseModel):
    """Response model for conflict detection."""
    id: str
    issue_id: str
    issue_key: str
    conflict_type: str
    local_version: Dict[str, Any]
    jira_version: Dict[str, Any]
    local_updated_at: str
    jira_updated_at: str
    detected_at: str
    status: str


@router.get("/{integration_id}/detect")
async def detect_conflicts(
    integration_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Detect conflicts between local and Jira issues.
    
    A conflict occurs when:
    - Both local and Jira versions have been modified since last sync
    - Changes are incompatible (e.g., different field values)
    """
    try:
        # Get integration credentials
        creds_result = supabase.table("integration_credentials").select("*").eq(
            "id", integration_id
        ).eq("workspace_id", str(ctx.workspace_id)).execute()
        
        if not creds_result.data:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        creds = creds_result.data[0]
        if creds["provider"] != "jira" or creds["status"] != "active":
            raise HTTPException(status_code=400, detail="Invalid Jira integration")
        
        # Initialize Jira client
        jira_client = JiraAPIClient(
            cloud_id=creds["credentials"]["cloudId"],
            access_token=creds["credentials"]["accessToken"]
        )
        
        # Get all Jira-linked issues
        issues_result = supabase.table("issues").select("*").eq(
            "workspace_id", str(ctx.workspace_id)
        ).eq("integration_id", integration_id).execute()
        
        conflicts = []
        
        for local_issue in issues_result.data:
            if not local_issue.get("jira_issue_key"):
                continue
            
            try:
                # Fetch current Jira version
                jira_issue = await jira_client.get_issue(local_issue["jira_issue_key"])
                jira_fields = jira_issue["fields"]
                
                # Parse timestamps
                local_updated = datetime.fromisoformat(local_issue["updated_at"].replace("Z", "+00:00"))
                jira_updated = datetime.fromisoformat(jira_fields["updated"].replace("Z", "+00:00"))
                
                # Check if both have been modified (simple check)
                # In production, you'd track "last_synced_at" per issue
                has_conflict = False
                conflict_fields = []
                
                # Compare key fields
                if local_issue["title"] != jira_fields["summary"]:
                    conflict_fields.append("title")
                    has_conflict = True
                
                if local_issue["status"] != jira_fields["status"]["name"]:
                    conflict_fields.append("status")
                    has_conflict = True
                
                if local_issue.get("priority") != jira_fields.get("priority", {}).get("name"):
                    conflict_fields.append("priority")
                    has_conflict = True
                
                if has_conflict:
                    # Check existing conflict record
                    existing = supabase.table("jira_conflicts").select("*").eq(
                        "issue_id", local_issue["id"]
                    ).eq("status", "pending").execute()
                    
                    if existing.data:
                        conflict_id = existing.data[0]["id"]
                    else:
                        # Create conflict record
                        conflict_data = {
                            "workspace_id": str(ctx.workspace_id),
                            "integration_id": integration_id,
                            "issue_id": local_issue["id"],
                            "issue_key": local_issue["jira_issue_key"],
                            "conflict_type": "field_mismatch",
                            "conflicting_fields": conflict_fields,
                            "local_version": {
                                "title": local_issue["title"],
                                "status": local_issue["status"],
                                "priority": local_issue.get("priority"),
                                "description": local_issue.get("description"),
                                "updated_at": local_issue["updated_at"]
                            },
                            "jira_version": {
                                "title": jira_fields["summary"],
                                "status": jira_fields["status"]["name"],
                                "priority": jira_fields.get("priority", {}).get("name"),
                                "description": jira_fields.get("description"),
                                "updated_at": jira_fields["updated"]
                            },
                            "local_updated_at": local_issue["updated_at"],
                            "jira_updated_at": jira_fields["updated"],
                            "status": "pending"
                        }
                        
                        result = supabase.table("jira_conflicts").insert(conflict_data).execute()
                        conflict_id = result.data[0]["id"]
                    
                    conflicts.append({
                        "id": conflict_id,
                        "issue_id": local_issue["id"],
                        "issue_key": local_issue["jira_issue_key"],
                        "conflict_type": "field_mismatch",
                        "conflicting_fields": conflict_fields,
                        "local_version": {
                            "title": local_issue["title"],
                            "status": local_issue["status"],
                            "priority": local_issue.get("priority"),
                        },
                        "jira_version": {
                            "title": jira_fields["summary"],
                            "status": jira_fields["status"]["name"],
                            "priority": jira_fields.get("priority", {}).get("name"),
                        },
                        "local_updated_at": local_issue["updated_at"],
                        "jira_updated_at": jira_fields["updated"]
                    })
                    
            except Exception as e:
                logger.error(f"Error checking issue {local_issue.get('jira_issue_key')}: {e}")
                continue
        
        return {
            "success": True,
            "conflicts": conflicts,
            "count": len(conflicts)
        }
        
    except Exception as e:
        logger.error(f"Failed to detect conflicts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to detect conflicts: {str(e)}")


@router.get("/{integration_id}/list")
async def list_conflicts(
    integration_id: str,
    ctx: WorkspaceContext = Depends(get_workspace_context),
    status: Optional[str] = None
):
    """
    List all conflicts for this integration.
    """
    try:
        query = supabase.table("jira_conflicts").select("*").eq(
            "workspace_id", str(ctx.workspace_id)
        ).eq("integration_id", integration_id)
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("detected_at", desc=True).execute()
        
        return {
            "success": True,
            "conflicts": result.data,
            "count": len(result.data)
        }
        
    except Exception as e:
        logger.error(f"Failed to list conflicts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{integration_id}/resolve")
async def resolve_conflict(
    integration_id: str,
    resolution: ConflictResolution,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Resolve a conflict by choosing local, Jira, or merged version.
    """
    try:
        # Get conflict
        conflict_result = supabase.table("jira_conflicts").select("*").eq(
            "id", resolution.conflict_id
        ).eq("workspace_id", str(ctx.workspace_id)).execute()
        
        if not conflict_result.data:
            raise HTTPException(status_code=404, detail="Conflict not found")
        
        conflict = conflict_result.data[0]
        
        # Get integration credentials
        creds_result = supabase.table("integration_credentials").select("*").eq(
            "id", integration_id
        ).execute()
        
        if not creds_result.data:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        creds = creds_result.data[0]
        jira_client = JiraAPIClient(
            cloud_id=creds["credentials"]["cloudId"],
            access_token=creds["credentials"]["accessToken"]
        )
        
        # Apply resolution
        if resolution.resolution == "use_local":
            # Update Jira with local version
            local_data = conflict["local_version"]
            update_payload = {
                "fields": {
                    "summary": local_data["title"],
                }
            }
            
            if local_data.get("description"):
                update_payload["fields"]["description"] = {
                    "type": "doc",
                    "version": 1,
                    "content": [{
                        "type": "paragraph",
                        "content": [{
                            "type": "text",
                            "text": local_data["description"]
                        }]
                    }]
                }
            
            await jira_client.update_issue(conflict["issue_key"], update_payload)
            
        elif resolution.resolution == "use_jira":
            # Update local with Jira version
            jira_data = conflict["jira_version"]
            supabase.table("issues").update({
                "title": jira_data["title"],
                "status": jira_data["status"],
                "priority": jira_data.get("priority"),
            }).eq("id", conflict["issue_id"]).execute()
            
        elif resolution.resolution == "merge":
            if not resolution.merged_data:
                raise HTTPException(status_code=400, detail="merged_data required for merge resolution")
            
            # Apply merged data to both systems
            # Update local
            supabase.table("issues").update(resolution.merged_data).eq(
                "id", conflict["issue_id"]
            ).execute()
            
            # Update Jira
            jira_update = {
                "fields": {
                    "summary": resolution.merged_data.get("title"),
                }
            }
            await jira_client.update_issue(conflict["issue_key"], jira_update)
        
        # Mark conflict as resolved
        supabase.table("jira_conflicts").update({
            "status": "resolved",
            "resolution_method": resolution.resolution,
            "resolved_at": datetime.utcnow().isoformat()
        }).eq("id", resolution.conflict_id).execute()
        
        return {
            "success": True,
            "message": f"Conflict resolved using {resolution.resolution}",
            "conflict_id": resolution.conflict_id
        }
        
    except Exception as e:
        logger.error(f"Failed to resolve conflict: {e}")
        raise HTTPException(status_code=500, detail=str(e))
