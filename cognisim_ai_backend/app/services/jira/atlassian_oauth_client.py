"""
Atlassian OAuth 2.0 (3LO) Client - Official Implementation
Based on: https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/
         https://developer.atlassian.com/cloud/oauth/getting-started/implementing-oauth-3lo/

NO PKCE - Standard OAuth 2.0 Authorization Code Flow with client_secret
"""

import httpx
import logging
from typing import Dict, Optional, List
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("cognisim_ai")


class AtlassianOAuthClient:
    """
    Official Atlassian OAuth 2.0 (3LO) Client
    Implements standard OAuth 2.0 Authorization Code Grant (NO PKCE)
    
    Reference: 
    - https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/
    - https://developer.atlassian.com/cloud/oauth/getting-started/implementing-oauth-3lo/
    """
    
    # Official Atlassian OAuth 2.0 endpoints
    AUTHORIZATION_URL = "https://auth.atlassian.com/authorize"
    TOKEN_URL = "https://auth.atlassian.com/oauth/token"
    ACCESSIBLE_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources"
    
    # Default scopes for Jira
    # https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/
    DEFAULT_SCOPES = [
        "read:jira-user",        # Read user information
        "read:jira-work",        # Read project and issue data
        "write:jira-work",       # Create and update issues
        "manage:jira-webhook",   # Create and manage webhooks
        "offline_access",        # Get refresh token
        "read:me",               # Read user profile
    ]
    
    def __init__(self, client_id: str, client_secret: str):
        """
        Initialize Atlassian OAuth client.
        
        Args:
            client_id: OAuth 2.0 client ID from Atlassian Developer Console
            client_secret: OAuth 2.0 client secret from Atlassian Developer Console
        """
        self.client_id = client_id
        self.client_secret = client_secret
        
        if not self.client_id or not self.client_secret:
            logger.error("Missing Jira OAuth credentials")
    
    def build_authorization_url(
        self,
        redirect_uri: str,
        state: str,
        scopes: Optional[List[str]] = None
    ) -> str:
        """
        Build the authorization URL to direct users to Atlassian consent screen.
        
        Per official docs:
        https://auth.atlassian.com/authorize?
          client_id=YOUR_CLIENT_ID&
          scope=REQUESTED_SCOPE_ONE%20REQUESTED_SCOPE_TWO&
          redirect_uri=https://YOUR_APP_CALLBACK_URL&
          state=YOUR_USER_BOUND_VALUE&
          response_type=code&
          prompt=consent
        
        Args:
            redirect_uri: Callback URL (must match Developer Console configuration)
            state: CSRF token (required for security)
            scopes: List of OAuth scopes (defaults to DEFAULT_SCOPES)
            
        Returns:
            Authorization URL string
        """
        if scopes is None:
            scopes = self.DEFAULT_SCOPES
        
        # Join scopes with space (URL encoded as %20)
        scope_string = " ".join(scopes)
        
        # Build query parameters per official documentation
        params = {
            "client_id": self.client_id,
            "scope": scope_string,
            "redirect_uri": redirect_uri,
            "state": state,
            "response_type": "code",  # Authorization code flow
            "prompt": "consent"  # Always show consent screen
        }
        
        # Build URL with query string
        from urllib.parse import urlencode
        query_string = urlencode(params)
        auth_url = f"{self.AUTHORIZATION_URL}?{query_string}"
        
        logger.info(f"Generated authorization URL (NO PKCE): {auth_url[:100]}...")
        return auth_url
    
    async def exchange_code_for_tokens(
        self,
        code: str,
        redirect_uri: str
    ) -> Dict:
        """
        Exchange authorization code for access token and refresh token.
        
        Per official docs:
        POST https://auth.atlassian.com/oauth/token
        {
          "grant_type": "authorization_code",
          "client_id": "YOUR_CLIENT_ID",
          "client_secret": "YOUR_CLIENT_SECRET",
          "code": "YOUR_AUTHORIZATION_CODE",
          "redirect_uri": "https://YOUR_APP_CALLBACK_URL"
        }
        
        NO code_verifier parameter (no PKCE)!
        
        Args:
            code: Authorization code from callback
            redirect_uri: Same redirect_uri used in authorization request
            
        Returns:
            Token response with access_token, refresh_token, expires_in, scope
            
        Raises:
            Exception: If token exchange fails
        """
        payload = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,  # Required - NO PKCE
            "code": code,
            "redirect_uri": redirect_uri
        }
        
        logger.info(f"Exchanging authorization code for tokens (NO PKCE)")
        logger.debug(f"Token exchange payload: client_id={self.client_id}, redirect_uri={redirect_uri}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"Token exchange failed: {response.status_code} - {error_text}")
                raise Exception(f"Failed to exchange code for token: {response.status_code} - {error_text}")
            
            token_data = response.json()
            logger.info(f"Successfully exchanged code for tokens. Expires in: {token_data.get('expires_in')}s")
            
            return token_data
    
    async def refresh_access_token(
        self,
        refresh_token: str
    ) -> Dict:
        """
        Refresh access token using refresh token.
        
        Per official docs:
        POST https://auth.atlassian.com/oauth/token
        {
          "grant_type": "refresh_token",
          "client_id": "YOUR_CLIENT_ID",
          "client_secret": "YOUR_CLIENT_SECRET",
          "refresh_token": "YOUR_REFRESH_TOKEN"
        }
        
        Args:
            refresh_token: Refresh token from initial authorization
            
        Returns:
            New token response with access_token, refresh_token (rotated), expires_in
            
        Raises:
            Exception: If token refresh fails
        """
        payload = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token
        }
        
        logger.info("Refreshing access token")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"Token refresh failed: {response.status_code} - {error_text}")
                raise Exception(f"Failed to refresh token: {response.status_code} - {error_text}")
            
            token_data = response.json()
            logger.info(f"Successfully refreshed token. Expires in: {token_data.get('expires_in')}s")
            
            # Rotating refresh tokens: new refresh_token returned, old one invalidated
            if "refresh_token" in token_data:
                logger.info("New refresh token received (rotating refresh token)")
            
            return token_data
    
    async def get_accessible_resources(
        self,
        access_token: str
    ) -> List[Dict]:
        """
        Get list of Atlassian sites (resources) accessible to this access token.
        
        Per official docs:
        GET https://api.atlassian.com/oauth/token/accessible-resources
        Authorization: Bearer ACCESS_TOKEN
        
        Returns list of sites with id (cloudId), name, url, scopes, avatarUrl.
        
        Args:
            access_token: Valid access token
            
        Returns:
            List of accessible resources (sites)
            
        Raises:
            Exception: If request fails
        """
        logger.info("Fetching accessible Atlassian resources")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.ACCESSIBLE_RESOURCES_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"Failed to get accessible resources: {response.status_code} - {error_text}")
                raise Exception(f"Failed to get accessible resources: {response.status_code} - {error_text}")
            
            resources = response.json()
            logger.info(f"Found {len(resources)} accessible resource(s)")
            
            for resource in resources:
                logger.info(f"  - {resource.get('name')} (cloudId: {resource.get('id')})")
            
            return resources
