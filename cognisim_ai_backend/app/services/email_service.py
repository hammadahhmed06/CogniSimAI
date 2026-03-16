"""Email service for sending invitations and transactional emails.

Uses Gmail SMTP (free tier: 500 emails/day)

Setup Guide: See docs/GMAIL_SMTP_SETUP.md
Get Gmail App Password: https://myaccount.google.com/apppasswords

Note: SMTP works locally but may be blocked on some cloud platforms like Hugging Face.
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Literal, Any
from pydantic import BaseModel, EmailStr

logger = logging.getLogger("cognisim_ai")

EmailProvider = Literal["smtp"]


class EmailConfig(BaseModel):
    """Email service configuration."""
    provider: EmailProvider = "smtp"  # Default to SMTP
    api_key: str
    from_email: EmailStr
    from_name: str = "CogniSim AI"


class EmailMessage(BaseModel):
    """Email message structure."""
    to: EmailStr
    subject: str
    html: str
    text: Optional[str] = None


def _send_via_smtp(config: EmailConfig, message: EmailMessage) -> dict[str, Any]:
    """Send email via SMTP (Gmail, Outlook, etc.) - Works with ANY email!"""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", config.from_email)
    smtp_password = config.api_key  # Use api_key field for SMTP password
    use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
    
    logger.info(f"SMTP Config: host={smtp_host}, port={smtp_port}, username={smtp_username}, use_ssl={use_ssl}")
    
    # Create message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = message.subject
    msg['From'] = f"{config.from_name} <{config.from_email}>"
    msg['To'] = message.to
    
    # Add HTML and text parts
    if message.text:
        msg.attach(MIMEText(message.text, 'plain'))
    msg.attach(MIMEText(message.html, 'html'))
    
    # Send via SMTP
    try:
        if use_ssl or smtp_port == 465:
            # Use SSL connection (port 465)
            logger.info(f"Using SSL connection to {smtp_host}:{smtp_port}")
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
            logger.info("SSL connection established")
        else:
            # Use STARTTLS connection (port 587)
            logger.info(f"Connecting to SMTP server {smtp_host}:{smtp_port}")
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
            logger.info("SMTP connection established")
            server.starttls()
            logger.info("STARTTLS successful")
        
        logger.info("Logging in...")
        server.login(smtp_username, smtp_password)
        logger.info("Login successful, sending message...")
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent via SMTP to {message.to}")
        return {"provider": "smtp", "status": "sent"}
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Authentication failed: {e}. Check your Gmail App Password and 2FA settings.")
        raise ValueError(f"Email authentication failed. Please verify your Gmail App Password is correct and 2FA is enabled.")
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error: {e}")
        raise ValueError(f"SMTP error: {str(e)}")
    except Exception as e:
        logger.error(f"SMTP send failed: {e}")
        raise ValueError(f"Failed to send email: {str(e)}")



def send_email(message: EmailMessage, provider: Optional[str] = None) -> dict[str, Any]:
    """Send an email using configured provider with automatic fallback.
    
    Args:
        message: Email message to send
        provider: Specific provider to use (defaults to env config)
        
    Returns:
        dict with provider, id/status, and status
        
    Raises:
        ValueError: If no provider is configured
        Exception: If all providers fail
    """
    # Load configuration from environment
    configured_provider = provider or os.getenv("EMAIL_PROVIDER", "smtp")  # Default to SMTP
    
    # Get API key (SMTP password)
    api_key = os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_API_KEY")
    
    from_email = os.getenv("EMAIL_FROM", "noreply@cognisim.ai")
    from_name = os.getenv("EMAIL_FROM_NAME", "CogniSim AI")
    
    if not api_key:
        raise ValueError(
            f"Email credentials not configured. Set SMTP_PASSWORD or EMAIL_API_KEY"
        )
    
    # Validate provider
    valid_providers: list[EmailProvider] = ["smtp"]
    if configured_provider not in valid_providers:
        configured_provider = "smtp"  # Default fallback to SMTP
    
    config = EmailConfig(
        provider=configured_provider,  # type: ignore
        api_key=api_key,
        from_email=from_email,
        from_name=from_name
    )
    
    # Send via SMTP
    try:
        return _send_via_smtp(config, message)
    except Exception as e:
        logger.error(f"Failed to send email via smtp: {e}")
        raise Exception(f"Email sending failed: {str(e)}")


def send_invitation_email(
    to_email: str,
    invite_link: str,
    inviter_name: Optional[str] = None,
    workspace_name: Optional[str] = None
) -> dict[str, Any]:
    """Send a team/workspace invitation email.
    
    Args:
        to_email: Recipient email address
        invite_link: Full invitation URL with token
        inviter_name: Name of person sending invite (optional)
        workspace_name: Name of workspace/team (optional)
        
    Returns:
        dict with send status
    """
    inviter = inviter_name or "A team member"
    workspace = workspace_name or "their workspace"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're Invited to CogniSim AI</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); border-radius: 8px 8px 0 0;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                    CogniSim AI
                                </h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px; font-weight: 600;">
                                    You've been invited!
                                </h2>
                                <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 24px;">
                                    {inviter} has invited you to join {workspace} on CogniSim AI.
                                </p>
                                <p style="margin: 0 0 32px; color: #475569; font-size: 16px; line-height: 24px;">
                                    CogniSim AI helps teams plan sprints, manage backlogs, and leverage AI-powered story generation to ship faster.
                                </p>
                                
                                <!-- CTA Button -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td align="center">
                                            <a href="{invite_link}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                                Accept Invitation
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 32px 0 0; color: #94a3b8; font-size: 14px; line-height: 20px;">
                                    Or copy and paste this link into your browser:
                                </p>
                                <p style="margin: 8px 0 0; color: #64748b; font-size: 14px; line-height: 20px; word-break: break-all;">
                                    {invite_link}
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 32px 40px; border-top: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 0 0 8px 8px;">
                                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 20px; text-align: center;">
                                    This invitation was sent to {to_email}. If you weren't expecting this, you can safely ignore this email.
                                </p>
                                <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px; line-height: 18px; text-align: center;">
                                    © 2025 CogniSim AI. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    text = f"""
You've been invited to CogniSim AI!

{inviter} has invited you to join {workspace} on CogniSim AI.

CogniSim AI helps teams plan sprints, manage backlogs, and leverage AI-powered story generation to ship faster.

Accept your invitation:
{invite_link}

This invitation was sent to {to_email}. If you weren't expecting this, you can safely ignore this email.

© 2025 CogniSim AI. All rights reserved.
    """
    
    message = EmailMessage(
        to=to_email,
        subject=f"You're invited to join {workspace} on CogniSim AI",
        html=html,
        text=text
    )
    
    return send_email(message)
