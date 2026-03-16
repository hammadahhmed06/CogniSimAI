# api/routes/notifications.py
"""
REST endpoints for the in-app notification centre.

- GET  /api/notifications              — paginated list, newest first
- GET  /api/notifications/unread-count — badge counter
- PATCH /api/notifications/{id}/read   — mark one as read
- POST  /api/notifications/read-all    — mark all as read
- DELETE /api/notifications/{id}       — delete a single notification
"""

import logging
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel

from app.core.dependencies import get_current_user, UserModel, supabase, limiter

logger = logging.getLogger("cognisim_ai")

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# ── Response Models ──────────────────────────────────────────────────
class NotificationItem(BaseModel):
    id: str
    workspace_id: Optional[str] = None
    user_id: Optional[str] = None
    team_id: Optional[str] = None
    type: str
    title: str
    message: str
    data: Optional[dict] = None
    is_read: bool = False
    read_at: Optional[str] = None
    created_at: str


class NotificationsListResponse(BaseModel):
    notifications: list[NotificationItem]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int


# ── Helpers ──────────────────────────────────────────────────────────
def _get_active_workspace_id(current_user: UserModel) -> str:
    """Resolve the user's active workspace from their profile."""
    try:
        result = (
            supabase.table("profiles")
            .select("active_workspace_id")
            .eq("id", current_user.id)
            .limit(1)
            .execute()
        )
        data = getattr(result, "data", [])
        if data and data[0].get("active_workspace_id"):
            return data[0]["active_workspace_id"]
    except Exception:
        pass

    # Fallback: first workspace membership
    try:
        result = (
            supabase.table("workspace_members")
            .select("workspace_id")
            .eq("user_id", current_user.id)
            .limit(1)
            .execute()
        )
        data = getattr(result, "data", [])
        if data:
            return data[0]["workspace_id"]
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="No active workspace found for user",
    )


# ── GET /api/notifications ───────────────────────────────────────────
@router.get("", response_model=NotificationsListResponse)
@limiter.limit("30/minute")
async def list_notifications(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    unread_only: bool = Query(default=False),
    current_user: UserModel = Depends(get_current_user),
):
    """Return paginated notifications for the user's active workspace."""
    workspace_id = _get_active_workspace_id(current_user)

    try:
        query = (
            supabase.table("notifications")
            .select("*", count="exact")  # type: ignore[arg-type]
            .or_(
                f"user_id.eq.{current_user.id},user_id.is.null"
            )
            .eq("workspace_id", workspace_id)
            .order("created_at", desc=True)
        )
        if unread_only:
            query = query.eq("is_read", False)
        result = query.range(offset, offset + limit - 1).execute()
        rows = getattr(result, "data", [])
        total = getattr(result, "count", len(rows)) or len(rows)

        # Unread count (separate quick query)
        unread_result = (
            supabase.table("notifications")
            .select("id", count="exact")  # type: ignore[arg-type]
            .or_(
                f"user_id.eq.{current_user.id},user_id.is.null"
            )
            .eq("workspace_id", workspace_id)
            .eq("is_read", False)
            .limit(0)
            .execute()
        )
        unread_count = getattr(unread_result, "count", 0) or 0

        return NotificationsListResponse(
            notifications=[NotificationItem(**r) for r in rows],
            total=total,
            unread_count=unread_count,
        )
    except Exception as e:
        logger.error(f"Error listing notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")


# ── GET /api/notifications/unread-count ──────────────────────────────
@router.get("/unread-count", response_model=UnreadCountResponse)
@limiter.limit("60/minute")
async def get_unread_count(
    request: Request,
    current_user: UserModel = Depends(get_current_user),
):
    """Quick unread badge counter."""
    workspace_id = _get_active_workspace_id(current_user)
    try:
        result = (
            supabase.table("notifications")
            .select("id", count="exact")  # type: ignore[arg-type]
            .or_(
                f"user_id.eq.{current_user.id},user_id.is.null"
            )
            .eq("workspace_id", workspace_id)
            .eq("is_read", False)
            .limit(0)
            .execute()
        )
        return UnreadCountResponse(unread_count=getattr(result, "count", 0) or 0)
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        raise HTTPException(status_code=500, detail="Failed to get unread count")


# ── PATCH /api/notifications/{id}/read ───────────────────────────────
@router.patch("/{notification_id}/read")
@limiter.limit("30/minute")
async def mark_read(
    request: Request,
    notification_id: UUID,
    current_user: UserModel = Depends(get_current_user),
):
    """Mark a single notification as read."""
    try:
        from datetime import datetime, timezone
        result = (
            supabase.table("notifications")
            .update({"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", str(notification_id))
            .execute()
        )
        updated = getattr(result, "data", [])
        if not updated:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"status": "ok", "id": str(notification_id)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification read: {e}")
        raise HTTPException(status_code=500, detail="Failed to update notification")


# ── POST /api/notifications/read-all ─────────────────────────────────
@router.post("/read-all")
@limiter.limit("10/minute")
async def mark_all_read(
    request: Request,
    current_user: UserModel = Depends(get_current_user),
):
    """Mark all notifications in the user's workspace as read."""
    workspace_id = _get_active_workspace_id(current_user)
    try:
        from datetime import datetime, timezone
        supabase.table("notifications").update(
            {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}
        ).or_(
            f"user_id.eq.{current_user.id},user_id.is.null"
        ).eq("workspace_id", workspace_id).eq("is_read", False).execute()
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error marking all read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark all as read")


# ── DELETE /api/notifications/{id} ───────────────────────────────────
@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def delete_notification(
    request: Request,
    notification_id: UUID,
    current_user: UserModel = Depends(get_current_user),
):
    """Delete a single notification."""
    try:
        result = (
            supabase.table("notifications")
            .delete()
            .eq("id", str(notification_id))
            .execute()
        )
        deleted = getattr(result, "data", [])
        if not deleted:
            raise HTTPException(status_code=404, detail="Notification not found")
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete notification")
