# api/routes/integrations.py
# OAuth integration endpoints for Jira

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request

from app.models.integration_models import (
    JiraDisconnectResponse,
    IntegrationStatusResponse,
    ConnectionStatus,
    IntegrationType
)
from app.core.dependencies import get_current_user, UserModel, supabase, limiter

logger = logging.getLogger("cognisim_ai")

# Create router for integration endpoints
router = APIRouter(prefix="/api/integrations", tags=["integrations"])

# Note: Jira OAuth routes are handled by the modular jira/oauth.py router
# - /api/jira/oauth/init
# - /api/jira/oauth/callback


@router.post(
    "/jira/disconnect",
    response_model=JiraDisconnectResponse,
    summary="Disconnect Jira Integration",
    description="Revoke and delete Jira connection"
)
@limiter.limit("5/minute")
async def disconnect_jira(
    request: Request,
    current_user: UserModel = Depends(get_current_user)
) -> JiraDisconnectResponse:
    """
    Disconnect Jira integration and remove stored credentials.
    """
    try:
        user_id = str(current_user.id)
        
        # Find and delete credentials for this user
        result = supabase.table('integration_credentials')\
            .delete()\
            .eq('owner_id', user_id)\
            .in_('integration_type', ['jira', 'jira_oauth'])\
            .execute()
        
        if result.data:
            logger.info(f"Jira integration disconnected for user {user_id}")
            return JiraDisconnectResponse(
                success=True,
                message="Jira integration disconnected successfully"
            )
        else:
            logger.warning(f"No Jira integration found for user {user_id}")
            return JiraDisconnectResponse(
                success=False,
                message="No Jira integration found"
            )
        
    except Exception as e:
        logger.error(f"Failed to disconnect Jira: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect: {str(e)}"
        )


@router.get(
    "/jira/status",
    response_model=IntegrationStatusResponse,
    summary="Get Jira Integration Status",
    description="Get the current status of Jira integration"
)
@limiter.limit("10/minute")
async def get_jira_status(
    request: Request,
    current_user: UserModel = Depends(get_current_user)
) -> IntegrationStatusResponse:
    """
    Get current Jira OAuth integration status.
    """
    try:
        user_id = str(current_user.id)
        
        # Look up stored credentials - check both jira_oauth (new) and jira (legacy)
        # Note: Integrations are workspace-level, but this endpoint needs workspace_id
        # For now, get the most recent integration for any workspace the user has access to
        cred_result = supabase.table("integration_credentials").select("*") \
            .in_("integration_type", ["jira_oauth", "jira"]) \
            .order("created_at", desc=True) \
            .limit(1).execute()

        if not cred_result.data:
            return IntegrationStatusResponse(
                is_connected=False,
                connection_status=ConnectionStatus.DISCONNECTED,
                integration_type=IntegrationType.JIRA,
                last_tested_at=None,
                last_sync_at=None,
                jira_url="",
                jira_email="",
                available_projects=[]
            )

        credentials = cred_result.data[0]
        integration_id = credentials.get("id")
        is_active = credentials.get("is_active", False)
        
        # For now, just return basic status without testing connection
        # OAuth connection testing will be handled by the OAuth callback
        return IntegrationStatusResponse(
            integration_id=integration_id,
            is_connected=is_active,
            connection_status=ConnectionStatus.CONNECTED if is_active else ConnectionStatus.DISCONNECTED,
            integration_type=IntegrationType.JIRA,
            last_tested_at=None,
            last_sync_at=None,
            jira_url=credentials.get("jira_url", ""),
            jira_email=credentials.get("jira_email", ""),
            available_projects=[]
        )

    except Exception as e:
        logger.error(f"Failed to get Jira status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get status: {str(e)}"
        )
