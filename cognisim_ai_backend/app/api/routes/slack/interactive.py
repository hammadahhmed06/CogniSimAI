# api/routes/slack/interactive.py
# Handles Slack interactive components (buttons, select menus, modals).

import json
import logging
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, status, Form
from fastapi.responses import JSONResponse

from app.core.dependencies import supabase
from app.services.slack.slack_client import SlackClient

logger = logging.getLogger("cognisim_ai")

router = APIRouter(prefix="/api/slack", tags=["slack-interactive"])


def _find_integration_by_team_id(team_id: str):
    """Look up active Slack integration by team ID."""
    try:
        result = (
            supabase.table("slack_integrations")
            .select("*")
            .eq("slack_team_id", team_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        data = getattr(result, "data", [])
        return data[0] if data else None
    except Exception as e:
        logger.error(f"Error looking up integration for team {team_id}: {e}")
        return None


# ── Interactive Endpoint ────────────────────────────────────────────────
@router.post("/interactive")
async def handle_interactive(request: Request, payload: str = Form(...)):
    """
    Handle Slack interactive payloads:
      - block_actions (button clicks, dropdown selections)
      - view_submission (modal form submissions)
      - shortcut (global shortcuts)
    
    Slack sends these as application/x-www-form-urlencoded with a `payload` field
    containing a JSON string.
    """
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in payload")

    interaction_type = data.get("type", "")
    team_id = data.get("team", {}).get("id", "") if isinstance(data.get("team"), dict) else data.get("team_id", "")
    user = data.get("user", {})
    user_id = user.get("id", "")
    user_name = user.get("username", "")

    logger.info(f"Interactive: {interaction_type} from {user_name} ({user_id}) in team {team_id}")

    integration = _find_integration_by_team_id(team_id) if team_id else None

    if interaction_type == "block_actions":
        return await _handle_block_actions(data, integration)
    elif interaction_type == "view_submission":
        return await _handle_view_submission(data, integration)
    elif interaction_type == "shortcut":
        return await _handle_shortcut(data, integration)
    else:
        logger.warning(f"Unhandled interactive type: {interaction_type}")
        return JSONResponse(content={"ok": True})


# ── Handlers ────────────────────────────────────────────────────────────

async def _handle_block_actions(data: dict, integration: Optional[dict]) -> JSONResponse:
    """
    Handle button clicks and dropdown selections in Slack messages.
    """
    actions = data.get("actions", [])
    channel = data.get("channel", {})
    channel_id = channel.get("id", "") if isinstance(channel, dict) else ""
    user = data.get("user", {})
    user_id = user.get("id", "")

    for action in actions:
        action_id = action.get("action_id", "")
        action_value = action.get("value", "")
        block_id = action.get("block_id", "")

        logger.info(f"Block action: {action_id} = {action_value}")

        if action_id == "view_prd":
            # View PRD summary
            return await _action_view_prd(action_value, channel_id, user_id, integration)
        elif action_id == "approve_prd":
            return await _action_approve_prd(action_value, channel_id, user_id, integration)
        elif action_id == "reject_prd":
            return await _action_reject_prd(action_value, channel_id, user_id, integration)
        elif action_id == "view_project":
            return await _action_view_project(action_value, channel_id, user_id, integration)
        else:
            logger.info(f"Unhandled action: {action_id}")

    return JSONResponse(content={"ok": True})


async def _handle_view_submission(data: dict, integration: Optional[dict]) -> JSONResponse:
    """
    Handle modal form submissions.
    """
    view = data.get("view", {})
    callback_id = view.get("callback_id", "")
    values = view.get("state", {}).get("values", {})

    logger.info(f"View submission: {callback_id}")

    if callback_id == "create_prd_modal":
        return await _submit_create_prd(values, data, integration)
    else:
        logger.info(f"Unhandled modal submission: {callback_id}")

    return JSONResponse(content={"response_action": "clear"})


async def _handle_shortcut(data: dict, integration: Optional[dict]) -> JSONResponse:
    """Handle global shortcuts."""
    callback_id = data.get("callback_id", "")
    trigger_id = data.get("trigger_id", "")
    logger.info(f"Shortcut: {callback_id}")

    if callback_id == "create_prd" and integration and trigger_id:
        # Open a modal for PRD creation
        try:
            client = SlackClient(integration["bot_access_token"], is_encrypted=True)
            modal_view = _build_create_prd_modal()
            client.open_modal(trigger_id, modal_view)
        except Exception as e:
            logger.error(f"Failed to open PRD modal: {e}")

    return JSONResponse(content={"ok": True})


# ── Action Implementations ──────────────────────────────────────────────

async def _action_view_prd(prd_id: str, channel_id: str, user_id: str, integration: Optional[dict]) -> JSONResponse:
    """Show PRD summary as ephemeral message."""
    if not integration:
        return JSONResponse(content={"text": "Integration not found"})

    try:
        result = supabase.table("prd_runs").select("*").eq("id", prd_id).limit(1).execute()
        prd_data = getattr(result, "data", [])
        if not prd_data:
            return JSONResponse(content={"text": ":warning: PRD not found."})

        prd = prd_data[0]
        client = SlackClient(integration["bot_access_token"], is_encrypted=True)
        summary_text = (
            f":page_facing_up: *PRD: {prd.get('title', 'Untitled')}*\n\n"
            f"*Status:* {prd.get('status', 'Unknown')}\n"
            f"*Quality Score:* {prd.get('quality_score', 'N/A')}\n"
            f"*Created:* {prd.get('created_at', 'Unknown')[:10]}\n"
        )
        client.post_ephemeral_message(
            channel=channel_id,
            user=user_id,
            text=summary_text,
        )
    except Exception as e:
        logger.error(f"Error viewing PRD: {e}")

    return JSONResponse(content={"ok": True})


async def _action_approve_prd(prd_id: str, channel_id: str, user_id: str, integration: Optional[dict]) -> JSONResponse:
    """Approve a PRD from Slack."""
    if not integration:
        return JSONResponse(content={"text": "Integration not found"})

    try:
        supabase.table("prd_runs").update({"status": "approved"}).eq("id", prd_id).execute()
        client = SlackClient(integration["bot_access_token"], is_encrypted=True)
        client.send_message(
            channel=channel_id,
            text=f":white_check_mark: PRD `{prd_id[:8]}...` approved by <@{user_id}>!",
        )
    except Exception as e:
        logger.error(f"Error approving PRD: {e}")

    return JSONResponse(content={"ok": True})


async def _action_reject_prd(prd_id: str, channel_id: str, user_id: str, integration: Optional[dict]) -> JSONResponse:
    """Reject a PRD from Slack."""
    if not integration:
        return JSONResponse(content={"text": "Integration not found"})

    try:
        supabase.table("prd_runs").update({"status": "rejected"}).eq("id", prd_id).execute()
        client = SlackClient(integration["bot_access_token"], is_encrypted=True)
        client.send_message(
            channel=channel_id,
            text=f":x: PRD `{prd_id[:8]}...` rejected by <@{user_id}>.",
        )
    except Exception as e:
        logger.error(f"Error rejecting PRD: {e}")

    return JSONResponse(content={"ok": True})


async def _action_view_project(project_id: str, channel_id: str, user_id: str, integration: Optional[dict]) -> JSONResponse:
    """Show project details as ephemeral message."""
    if not integration:
        return JSONResponse(content={"text": "Integration not found"})

    try:
        result = supabase.table("projects").select("*").eq("id", project_id).limit(1).execute()
        proj_data = getattr(result, "data", [])
        if not proj_data:
            return JSONResponse(content={"text": ":warning: Project not found."})

        proj = proj_data[0]
        client = SlackClient(integration["bot_access_token"], is_encrypted=True)
        client.post_ephemeral_message(
            channel=channel_id,
            user=user_id,
            text=(
                f":file_folder: *{proj.get('name', 'Untitled')}*\n"
                f"Key: `{proj.get('key', 'N/A')}`\n"
                f"Status: {proj.get('status', 'Unknown')}\n"
                f"Created: {proj.get('created_at', 'Unknown')[:10]}"
            ),
        )
    except Exception as e:
        logger.error(f"Error viewing project: {e}")

    return JSONResponse(content={"ok": True})


async def _submit_create_prd(values: dict, data: dict, integration: Optional[dict]) -> JSONResponse:
    """Handle PRD creation modal submission."""
    logger.info(f"Create PRD modal submitted with values: {list(values.keys())}")
    # Extract form values and create PRD — placeholder for integration with PRD service
    return JSONResponse(content={"response_action": "clear"})


def _build_create_prd_modal() -> dict:
    """Build a Slack modal view for PRD creation."""
    return {
        "type": "modal",
        "callback_id": "create_prd_modal",
        "title": {"type": "plain_text", "text": "Create PRD"},
        "submit": {"type": "plain_text", "text": "Generate"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "prd_title",
                "element": {
                    "type": "plain_text_input",
                    "action_id": "title_input",
                    "placeholder": {"type": "plain_text", "text": "e.g., User Authentication System"},
                },
                "label": {"type": "plain_text", "text": "Project Title"},
            },
            {
                "type": "input",
                "block_id": "prd_description",
                "element": {
                    "type": "plain_text_input",
                    "action_id": "description_input",
                    "multiline": True,
                    "placeholder": {"type": "plain_text", "text": "Describe the project requirements..."},
                },
                "label": {"type": "plain_text", "text": "Description"},
            },
        ],
    }
