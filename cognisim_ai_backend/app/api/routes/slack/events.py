# api/routes/slack/events.py
# Handles incoming Slack events (app_mention, message, etc.) and URL verification challenges.

import hashlib
import hmac
import json
import logging
import time
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, status, Response
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.dependencies import supabase
from app.models.slack_models import SlackWebhookEventRequest
from app.services.slack.slack_client import SlackClient

logger = logging.getLogger("cognisim_ai")

router = APIRouter(prefix="/api/slack", tags=["slack-events"])


# ── Helpers ─────────────────────────────────────────────────────────────
async def verify_slack_signature(request: Request) -> bool:
    """
    Verify that an incoming request actually comes from Slack using
    the signing secret (HMAC-SHA256).  Returns True when valid.
    """
    signing_secret = (
        settings.SLACK_SIGNING_SECRET.get_secret_value()
        if settings.SLACK_SIGNING_SECRET
        else None
    )
    if not signing_secret:
        logger.warning("SLACK_SIGNING_SECRET not configured – skipping verification")
        return True  # Allow in dev mode

    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")

    if not timestamp or not signature:
        return False

    # Reject requests older than 5 minutes (replay protection)
    try:
        if abs(time.time() - int(timestamp)) > 60 * 5:
            logger.warning("Slack request timestamp too old – possible replay attack")
            return False
    except ValueError:
        return False

    body = await request.body()
    sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
    my_signature = (
        "v0="
        + hmac.new(
            signing_secret.encode(), sig_basestring.encode(), hashlib.sha256
        ).hexdigest()
    )

    return hmac.compare_digest(my_signature, signature)


def _find_integration_by_team_id(team_id: str):
    """Look up the Slack integration record by Slack team ID."""
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


# ── Event Endpoint ──────────────────────────────────────────────────────
@router.post("/events")
async def handle_slack_events(request: Request):
    """
    Receives all Slack Events API payloads.
    Handles:
      - url_verification challenge
      - event_callback routing (app_mention, message, etc.)
    """
    # Verify signature
    if not await verify_slack_signature(request):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Slack signature",
        )

    body = await request.body()
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = payload.get("type")

    # ── URL Verification ──
    if event_type == "url_verification":
        challenge = payload.get("challenge", "")
        logger.info("Slack URL verification challenge received")
        return JSONResponse(content={"challenge": challenge})

    # ── Event Callback ──
    if event_type == "event_callback":
        event = payload.get("event", {})
        inner_type = event.get("type", "")
        team_id = payload.get("team_id", "")

        logger.info(f"Slack event received: {inner_type} from team {team_id}")

        # Look up integration
        integration = _find_integration_by_team_id(team_id)
        if not integration:
            logger.warning(f"No active integration for team {team_id}")
            return JSONResponse(content={"ok": True})

        # Route to handler
        try:
            if inner_type == "app_mention":
                await _handle_app_mention(event, integration)
            elif inner_type == "message":
                await _handle_message(event, integration)
            elif inner_type in ("channel_created", "channel_rename"):
                logger.info(f"Channel event: {inner_type} – {event.get('channel', {}).get('name', 'unknown')}")
            elif inner_type == "member_joined_channel":
                logger.info(f"Member joined channel: {event.get('user')}")
            elif inner_type == "reaction_added":
                logger.info(f"Reaction added: {event.get('reaction')} by {event.get('user')}")
            else:
                logger.info(f"Unhandled event type: {inner_type}")
        except Exception as e:
            logger.error(f"Error processing event {inner_type}: {e}")

        # Always return 200 quickly (Slack retries on failure)
        return JSONResponse(content={"ok": True})

    logger.warning(f"Unknown Slack payload type: {event_type}")
    return JSONResponse(content={"ok": True})


# ── Event Handlers ──────────────────────────────────────────────────────
async def _handle_app_mention(event: dict, integration: dict):
    """
    Handle @CogniSim mentions in Slack channels.
    Parses the mention text and routes to the right response.
    """
    text = event.get("text", "").lower()
    channel = event.get("channel", "")
    user = event.get("user", "")
    thread_ts = event.get("thread_ts") or event.get("ts")

    logger.info(f"App mention from {user} in {channel}: {text}")

    try:
        client = SlackClient(integration["bot_access_token"], is_encrypted=True)
    except Exception as e:
        logger.error(f"Failed to init SlackClient: {e}")
        return

    # Parse the mention to determine intent
    # Remove the bot mention from the text
    clean_text = text.split(">", 1)[-1].strip() if ">" in text else text

    if any(kw in clean_text for kw in ["status", "health", "ping"]):
        response_text = (
            ":white_check_mark: *CogniSim AI is running!*\n"
            f"Workspace integration is active.\n"
            f"Notifications: {'enabled' if integration.get('notifications_enabled') else 'disabled'}"
        )
    elif any(kw in clean_text for kw in ["help", "commands", "what can you do"]):
        response_text = (
            ":robot_face: *CogniSim AI Commands*\n\n"
            "Mention me with:\n"
            "• `status` — Check bot health\n"
            "• `help` — Show this message\n\n"
            "Or use slash commands:\n"
            "• `/cognisim status` — Workspace status\n"
            "• `/cognisim list-projects` — List projects\n"
            "• `/cognisim help` — Full command list"
        )
    else:
        response_text = (
            f"Hi <@{user}>! :wave: I'm CogniSim AI.\n"
            "Try `@CogniSim status` or `@CogniSim help` to get started."
        )

    client.send_message(
        channel=channel,
        text=response_text,
        thread_ts=thread_ts,
    )


async def _handle_message(event: dict, integration: dict):
    """
    Handle messages in channels where the bot is present.
    Only processes bot-relevant messages (not from bots, not in threads already handled).
    """
    # Ignore bot messages and message changes
    if event.get("bot_id") or event.get("subtype"):
        return

    # For now, only log — future: keyword triggers, auto-responses
    logger.info(
        f"Message in {event.get('channel')} from {event.get('user')}: "
        f"{event.get('text', '')[:100]}"
    )
