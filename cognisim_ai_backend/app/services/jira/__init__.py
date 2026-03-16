"""
Jira Integration Service

This module provides comprehensive Jira integration:
- AtlassianOAuthClient: OAuth flow with Jira
- JiraOAuthManager: Token management with auto-refresh
- JiraAPIClient: Full Jira REST API client
- JiraSyncService: Bidirectional sync between Jira and local DB
- credential_helpers: Encryption/decryption helpers
"""

from .atlassian_oauth_client import AtlassianOAuthClient
from .token_manager import JiraOAuthManager, oauth_manager
from .credential_helpers import encrypt_credentials, decrypt_credentials
from .api_client import JiraAPIClient
from .sync_service import JiraSyncService

__all__ = [
    "AtlassianOAuthClient",
    "JiraOAuthManager", 
    "oauth_manager",
    "encrypt_credentials",
    "decrypt_credentials",
    "JiraAPIClient",
    "JiraSyncService"
]

