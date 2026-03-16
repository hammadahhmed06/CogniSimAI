"""
Credential storage helpers for Jira integration.
Handles credential encryption/decryption using the simple_credential_store.
"""

import json
import logging
from typing import Dict
from app.services.encryption.simple_credential_store import simple_credential_store

logger = logging.getLogger("cognisim_ai")


def encrypt_credentials(credentials: Dict) -> str:
    """
    Encrypt credentials dictionary for storage.
    
    Args:
        credentials: Dictionary containing access_token, refresh_token, cloud_id
        
    Returns:
        Encrypted credentials as JSON string
    """
    try:
        # Convert dict to JSON string
        creds_json = json.dumps(credentials)
        # Encode using simple_credential_store
        encrypted = simple_credential_store.encode_credential(creds_json)
        return encrypted
    except Exception as e:
        logger.error(f"Failed to encrypt credentials: {str(e)}")
        raise


def decrypt_credentials(encrypted_credentials: str) -> Dict:
    """
    Decrypt credentials from storage.
    
    Args:
        encrypted_credentials: Encrypted credentials string
        
    Returns:
        Dictionary with decrypted credentials
    """
    if not encrypted_credentials:
        raise ValueError(
            "Encrypted credentials are empty. Please reconnect your Jira integration."
        )
    
    try:
        # Decode using simple_credential_store
        decrypted = simple_credential_store.decode_credential(encrypted_credentials)
        # Parse JSON
        credentials = json.loads(decrypted)
        return credentials
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse decrypted credentials as JSON: {str(e)}")
        raise ValueError("Invalid credential format. Please reconnect your Jira integration.")
    except Exception as e:
        logger.error(f"Failed to decrypt credentials: {str(e)}")
        raise ValueError(f"Failed to decrypt credentials: {str(e)}. Please reconnect your Jira integration.")
