"""
Slack Routes Module
Exports all Slack-specific routers: events, commands, interactive.
Note: The main Slack integration CRUD + OAuth routes remain in
      api/routes/slack_integration.py (already mounted in main.py).
"""

from .events import router as events_router
from .commands import router as commands_router
from .interactive import router as interactive_router

__all__ = [
    "events_router",
    "commands_router",
    "interactive_router",
]
