# api/routes/slack/commands.py
# Handles Slack slash commands (/cognisim ...)

import json
import logging
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, status, Form
from fastapi.responses import JSONResponse

from app.core.dependencies import supabase
from app.models.slack_models import SlackSlashCommandRequest
from app.services.slack.slack_client import SlackClient

logger = logging.getLogger("cognisim_ai")

router = APIRouter(prefix="/api/slack", tags=["slack-commands"])


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


def _get_workspace_projects(workspace_id: str, limit: int = 10):
    """Fetch projects for a workspace."""
    try:
        result = (
            supabase.table("projects")
            .select("id, name, key, status, created_at")
            .eq("workspace_id", workspace_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return getattr(result, "data", [])
    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        return []


def _get_workspace_stats(workspace_id: str):
    """Fetch quick stats for a workspace."""
    try:
        projects = supabase.table("projects").select("id", count="exact").eq("workspace_id", workspace_id).execute()  # type: ignore[arg-type]
        issues = supabase.table("issues").select("id", count="exact").eq("workspace_id", workspace_id).execute()  # type: ignore[arg-type]
        members = supabase.table("workspace_members").select("id", count="exact").eq("workspace_id", workspace_id).execute()  # type: ignore[arg-type]

        return {
            "projects": getattr(projects, "count", 0) or 0,
            "issues": getattr(issues, "count", 0) or 0,
            "members": getattr(members, "count", 0) or 0,
        }
    except Exception as e:
        logger.error(f"Error fetching workspace stats: {e}")
        return {"projects": 0, "issues": 0, "members": 0}


def _get_recent_stories(workspace_id: str, project_name: Optional[str] = None, limit: int = 5):
    """Fetch recent user stories/issues."""
    try:
        query = (
            supabase.table("issues")
            .select("id, title, issue_key, status, priority, assignee_name, created_at")
            .eq("workspace_id", workspace_id)
            .order("created_at", desc=True)
            .limit(limit)
        )

        if project_name:
            # Look up project first
            proj = (
                supabase.table("projects")
                .select("id")
                .eq("workspace_id", workspace_id)
                .ilike("name", f"%{project_name}%")
                .limit(1)
                .execute()
            )
            proj_data = getattr(proj, "data", [])
            if proj_data:
                query = query.eq("project_id", proj_data[0]["id"])

        result = query.execute()
        return getattr(result, "data", [])
    except Exception as e:
        logger.error(f"Error fetching stories: {e}")
        return []


# ── Slash Command Endpoint ──────────────────────────────────────────────
@router.post("/commands")
async def handle_slash_command(
    request: Request,
    command: str = Form(...),
    text: str = Form(default=""),
    user_id: str = Form(...),
    user_name: str = Form(...),
    channel_id: str = Form(...),
    channel_name: str = Form(...),
    team_id: str = Form(...),
    team_domain: str = Form(...),
    trigger_id: str = Form(...),
    response_url: str = Form(default=""),
):
    """
    Handle /cognisim slash commands from Slack.
    Must respond within 3 seconds (Slack requirement).

    Commands:
      /cognisim help        — Show available commands
      /cognisim status      — Workspace status & stats
      /cognisim list-projects — List workspace projects
      /cognisim list-stories [project] — Recent stories
    """
    logger.info(f"Slash command: {command} {text} from {user_name} ({user_id}) in #{channel_name}")

    # Look up integration
    integration = _find_integration_by_team_id(team_id)
    if not integration:
        return JSONResponse(content={
            "response_type": "ephemeral",
            "text": ":warning: No CogniSim integration found for this Slack workspace. Please connect via the CogniSim dashboard.",
        })

    workspace_id = integration.get("workspace_id", "")
    subcommand = text.strip().lower().split()[0] if text.strip() else "help"
    args = text.strip().split()[1:] if len(text.strip().split()) > 1 else []

    # ── Route subcommands ──
    if subcommand == "help":
        return _cmd_help()
    elif subcommand == "status":
        return _cmd_status(workspace_id, integration)
    elif subcommand in ("list-projects", "projects"):
        return _cmd_list_projects(workspace_id)
    elif subcommand in ("list-stories", "stories"):
        project_name = " ".join(args) if args else None
        return _cmd_list_stories(workspace_id, project_name)
    else:
        return JSONResponse(content={
            "response_type": "ephemeral",
            "text": f":thinking_face: Unknown command `{subcommand}`. Try `/cognisim help` for available commands.",
        })


# ── Command Implementations ────────────────────────────────────────────

def _cmd_help() -> JSONResponse:
    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": ":robot_face: CogniSim AI Commands", "emoji": True},
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    "*Available Commands:*\n\n"
                    "• `/cognisim help` — Show this help message\n"
                    "• `/cognisim status` — Show workspace status & stats\n"
                    "• `/cognisim list-projects` — List all projects\n"
                    "• `/cognisim list-stories [project]` — Show recent stories\n"
                ),
            },
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": ":bulb: You can also mention <@CogniSim> in any channel for quick interactions.",
                }
            ],
        },
    ]
    return JSONResponse(content={
        "response_type": "ephemeral",
        "blocks": blocks,
        "text": "CogniSim AI Commands",
    })


def _cmd_status(workspace_id: str, integration: dict) -> JSONResponse:
    stats = _get_workspace_stats(workspace_id)
    workspace_name = integration.get("slack_workspace_name", "Your workspace")
    notifications = "Enabled :bell:" if integration.get("notifications_enabled") else "Disabled :no_bell:"
    commands_status = "Enabled :zap:" if integration.get("slash_commands_enabled") else "Disabled"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f":bar_chart: {workspace_name} — Status", "emoji": True},
        },
        {"type": "divider"},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Projects:*\n{stats['projects']}"},
                {"type": "mrkdwn", "text": f"*Issues:*\n{stats['issues']}"},
                {"type": "mrkdwn", "text": f"*Members:*\n{stats['members']}"},
                {"type": "mrkdwn", "text": f"*Notifications:*\n{notifications}"},
            ],
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [
                {"type": "mrkdwn", "text": ":white_check_mark: Integration active | Slash commands: " + commands_status},
            ],
        },
    ]
    return JSONResponse(content={
        "response_type": "ephemeral",
        "blocks": blocks,
        "text": f"CogniSim Status: {stats['projects']} projects, {stats['issues']} issues",
    })


def _cmd_list_projects(workspace_id: str) -> JSONResponse:
    projects = _get_workspace_projects(workspace_id)

    if not projects:
        return JSONResponse(content={
            "response_type": "ephemeral",
            "text": ":file_folder: No projects found in this workspace.",
        })

    project_lines = []
    for p in projects:
        status_emoji = {
            "active": ":large_green_circle:",
            "completed": ":white_check_mark:",
            "archived": ":file_cabinet:",
        }.get(p.get("status", ""), ":white_circle:")
        project_lines.append(f"{status_emoji} *{p['name']}* (`{p.get('key', 'N/A')}`)")

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": ":file_folder: Workspace Projects", "emoji": True},
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": "\n".join(project_lines)},
        },
        {
            "type": "context",
            "elements": [
                {"type": "mrkdwn", "text": f"Showing {len(projects)} project(s)"},
            ],
        },
    ]
    return JSONResponse(content={
        "response_type": "ephemeral",
        "blocks": blocks,
        "text": f"Found {len(projects)} projects",
    })


def _cmd_list_stories(workspace_id: str, project_name: Optional[str] = None) -> JSONResponse:
    stories = _get_recent_stories(workspace_id, project_name)

    if not stories:
        msg = f":mag: No stories found"
        if project_name:
            msg += f" for project '{project_name}'"
        return JSONResponse(content={"response_type": "ephemeral", "text": msg})

    story_lines = []
    for s in stories:
        priority_emoji = {
            "critical": ":red_circle:",
            "high": ":orange_circle:",
            "medium": ":yellow_circle:",
            "low": ":white_circle:",
        }.get((s.get("priority") or "").lower(), ":white_circle:")
        assignee = s.get("assignee_name") or "Unassigned"
        story_lines.append(
            f"{priority_emoji} `{s.get('issue_key', 'N/A')}` {s['title']}\n"
            f"    Status: _{s.get('status', 'Unknown')}_ | Assignee: _{assignee}_"
        )

    header_text = ":clipboard: Recent Stories"
    if project_name:
        header_text += f" — {project_name}"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": header_text, "emoji": True},
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": "\n\n".join(story_lines)},
        },
        {
            "type": "context",
            "elements": [
                {"type": "mrkdwn", "text": f"Showing {len(stories)} most recent"},
            ],
        },
    ]
    return JSONResponse(content={
        "response_type": "ephemeral",
        "blocks": blocks,
        "text": f"Found {len(stories)} stories",
    })
