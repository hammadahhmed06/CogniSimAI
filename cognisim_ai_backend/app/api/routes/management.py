from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from app.core.dependencies import supabase, get_current_user, UserModel
from uuid import UUID

router = APIRouter(prefix="/api/management", tags=["Management"])

@router.post("/snapshot-project-metrics", tags=["Management"])
def snapshot_project_metrics(current_user: UserModel = Depends(get_current_user)):
    """
    Management endpoint to snapshot all project metrics using Supabase (no ORM).
    Can be scheduled externally or called manually.
    """
    # 1. Get all projects
    projects_res = supabase.table("projects").select("id").execute()
    projects = getattr(projects_res, "data", []) or []
    now = datetime.now(timezone.utc).isoformat()
    results = []
    for project in projects:
        pid = project["id"]
        # 2. Get all issues for this project
        issues_res = supabase.table("issues").select("status,story_points,started_at,done_at").eq("project_id", pid).execute()
        issues = getattr(issues_res, "data", []) or []
        open_issues = sum(1 for i in issues if i.get("status") not in ("done", "closed"))
        closed_issues = sum(1 for i in issues if i.get("status") in ("done", "closed"))
        story_points_open = sum(i.get("story_points") or 0 for i in issues if i.get("status") not in ("done", "closed"))
        story_points_closed = sum(i.get("story_points") or 0 for i in issues if i.get("status") in ("done", "closed"))
        # Velocity: issues closed in last 14 days
        two_weeks_ago = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
        velocity = sum(1 for i in issues if i.get("status") in ("done", "closed") and i.get("done_at") and i["done_at"] >= two_weeks_ago)
        # Avg cycle time (in days)
        cycle_times = []
        for i in issues:
            if i.get("started_at") and i.get("done_at"):
                try:
                    start = datetime.fromisoformat(i["started_at"].replace("Z", "+00:00"))
                    done = datetime.fromisoformat(i["done_at"].replace("Z", "+00:00"))
                    cycle_times.append((done - start).days)
                except Exception:
                    pass
        avg_cycle_time = sum(cycle_times) / len(cycle_times) if cycle_times else 0
        # 3. Insert snapshot
        snap = {
            "project_id": pid,
            "date": now,
            "open_issues": open_issues,
            "closed_issues": closed_issues,
            "story_points_open": story_points_open,
            "story_points_closed": story_points_closed,
            "velocity": velocity,
            "avg_cycle_time": avg_cycle_time,
        }
        ins = supabase.table("project_metric_snapshots").insert(snap).execute()
        results.append({"project_id": pid, "inserted": bool(getattr(ins, "data", []))})
    return {"snapshots_created": results}
