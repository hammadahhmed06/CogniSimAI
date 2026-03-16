"""
Jira OAuth Token Management
Handles token refresh and ensures valid tokens for API calls.
"""

import logging
from typing import Tuple
from datetime import datetime, timezone, timedelta
from app.core.dependencies import supabase
from app.services.encryption.simple_credential_store import simple_credential_store
from app.services.jira.atlassian_oauth_client import AtlassianOAuthClient
from app.core.config import settings

logger = logging.getLogger("cognisim_ai")


class JiraOAuthManager:
    """Manages Jira OAuth tokens with automatic refresh (NO PKCE)."""
    
    def __init__(self, client_id: str, client_secret: str):
        """
        Initialize OAuth manager.
        
        Args:
            client_id: OAuth client ID
            client_secret: OAuth client secret
        """
        self.client = AtlassianOAuthClient(
            client_id=client_id,
            client_secret=client_secret
        )
    
    async def ensure_valid_token(
        self,
        integration_id: str,
        workspace_id: str,
        force_refresh: bool = False
    ) -> Tuple[str, str]:
        """
        Ensure we have a valid access token, refreshing if needed.
        
        Args:
            integration_id: Integration ID
            workspace_id: Workspace ID
            
        Returns:
            Tuple of (access_token, cloud_id)
            
        Raises:
            Exception: If unable to get valid token
        """
        # Get integration from database
        result = supabase.table("integration_credentials")\
            .select("*")\
            .eq("id", integration_id)\
            .eq("workspace_id", workspace_id)\
            .eq("integration_type", "jira_oauth")\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not result.data:
            raise Exception("Jira integration not found or not active")
        
        integration = result.data
        
        # Get encrypted tokens and cloud_id
        encrypted_access_token = integration.get("jira_api_token_encrypted")
        encrypted_refresh_token = integration.get("jira_refresh_token_encrypted")
        cloud_id = integration.get("jira_cloud_id")
        last_tested_at_str = integration.get("last_tested_at")
        
        if not encrypted_access_token or not cloud_id:
            raise Exception("Missing access token or cloud ID")
        
        # Decrypt access token
        access_token = simple_credential_store.decode_credential(encrypted_access_token)
        
        # Check if token is expired or expiring soon (OAuth tokens typically expire in 1 hour)
        needs_refresh = force_refresh
        if last_tested_at_str and not force_refresh:
            try:
                # Parse last_tested_at as timezone-aware datetime
                last_tested = datetime.fromisoformat(last_tested_at_str.replace('Z', '+00:00'))
                # Ensure it's timezone-aware
                if last_tested.tzinfo is None:
                    last_tested = last_tested.replace(tzinfo=timezone.utc)
                # Refresh if last tested was more than 50 minutes ago (tokens expire in 60 minutes)
                time_since_test = datetime.now(timezone.utc) - last_tested
                if time_since_test.total_seconds() > 3000:  # 50 minutes
                    logger.info("Access token may be expired, refreshing...")
                    needs_refresh = True
            except Exception as e:
                logger.warning(f"Could not parse last_tested_at: {e}")
                # If we can't parse, assume token might be old and refresh
                needs_refresh = True
        
        # Refresh token if needed
        if needs_refresh:
            if not encrypted_refresh_token:
                raise Exception("Access token may be expired and no refresh token available")
            
            # Decrypt refresh token
            refresh_token = simple_credential_store.decode_credential(encrypted_refresh_token)
            
            # Refresh tokens
            token_data = await self.client.refresh_access_token(refresh_token)
            
            # Extract new tokens
            access_token = token_data["access_token"]
            new_refresh_token = token_data.get("refresh_token", refresh_token)  # Rotating refresh token
            expires_in = token_data.get("expires_in", 3600)
            
            # Also refresh cloud_id from accessible resources (in case it changed)
            try:
                resources = await self.client.get_accessible_resources(access_token)
                if resources:
                    # Use the first Jira resource
                    new_cloud_id = resources[0].get("id")
                    if new_cloud_id and new_cloud_id != cloud_id:
                        logger.info(f"Cloud ID updated: {cloud_id} -> {new_cloud_id}")
                        cloud_id = new_cloud_id
            except Exception as res_err:
                logger.warning(f"Could not refresh cloud_id: {res_err}")
            
            # Calculate new expiration
            new_tested_at = datetime.now(timezone.utc)
            
            # Encrypt new tokens
            new_encrypted_access_token = simple_credential_store.encode_credential(access_token)
            new_encrypted_refresh_token = simple_credential_store.encode_credential(new_refresh_token)
            
            # Update database (including potentially updated cloud_id)
            supabase.table("integration_credentials")\
                .update({
                    "jira_api_token_encrypted": new_encrypted_access_token,
                    "jira_refresh_token_encrypted": new_encrypted_refresh_token,
                    "jira_cloud_id": cloud_id,
                    "last_tested_at": new_tested_at.isoformat(),
                    "connection_status": "connected",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                })\
                .eq("id", integration_id)\
                .execute()
            
            logger.info(f"Token refreshed successfully for integration {integration_id}")
        
        return access_token, cloud_id


# Singleton instance
oauth_manager = JiraOAuthManager(
    client_id=settings.JIRA_OAUTH_CLIENT_ID or "",
    client_secret=str(settings.JIRA_OAUTH_CLIENT_SECRET.get_secret_value() if settings.JIRA_OAUTH_CLIENT_SECRET else "")
)
