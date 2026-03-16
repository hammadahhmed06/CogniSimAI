"""
Jira Routes Module
Exports all Jira routers: OAuth, projects, boards, issues, and sync.
"""

from .oauth import router as oauth_router
from .projects import router as projects_router
from .boards import router as boards_router
from .issues import router as issues_router
from .sync import router as sync_router

__all__ = [
    "oauth_router",
    "projects_router",
    "boards_router",
    "issues_router",
    "sync_router"
]

