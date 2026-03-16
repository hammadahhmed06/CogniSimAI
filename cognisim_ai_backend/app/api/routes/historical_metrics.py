import logging
from fastapi import APIRouter, Depends
from typing import List
from uuid import UUID
from app.core.dependencies import supabase, get_current_user, UserModel

try:
    from postgrest.exceptions import APIError  # type: ignore
except Exception:  # pragma: no cover - safety
    APIError = Exception  # fallback

logger = logging.getLogger("cognisim_ai")

router = APIRouter(prefix="/api/historical", tags=["Historical Analytics"])


@router.get("/project/{project_id}/snapshots", response_model=List[dict])
def get_project_snapshots(project_id: UUID, user: UserModel = Depends(get_current_user)):
    try:
        res = (
            supabase
            .table("project_metric_snapshots")
            .select("date,open_issues,closed_issues,story_points_open,story_points_closed,velocity,avg_cycle_time,extra_metrics")
            .eq("project_id", str(project_id))
            .order("date", desc=False)
            .execute()
        )
        return getattr(res, "data", []) or []
    except APIError as exc:  # table missing or other Supabase error
        logger.warning(
            "Project metric snapshots unavailable for project %s: %s",
            project_id,
            getattr(exc, "message", str(exc)),
        )
        return []


@router.get("/issue/{issue_id}/status-history", response_model=List[dict])
def get_issue_status_history(issue_id: UUID, user: UserModel = Depends(get_current_user)):
    try:
        res = (
            supabase
            .table("issue_status_history")
            .select("from_status,to_status,changed_at")
            .eq("issue_id", str(issue_id))
            .order("changed_at", desc=False)
            .execute()
        )
        return getattr(res, "data", []) or []
    except APIError as exc:
        logger.warning(
            "Issue status history unavailable for issue %s: %s",
            issue_id,
            getattr(exc, "message", str(exc)),
        )
        return []
