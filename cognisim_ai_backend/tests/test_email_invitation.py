"""
Quick test script for email invitation functionality.

Usage:
    python test_email_invitation.py

Requirements:
    - Set SMTP_PASSWORD (Gmail App Password) in environment or .env file
    - See docs/GMAIL_SMTP_SETUP.md for setup instructions
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.services.email_service import send_invitation_email


def main():
    """Test email invitation sending."""
    
    # Check if SMTP credentials are set
    smtp_password = os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_API_KEY")
    if not smtp_password:
        print("❌ Error: SMTP_PASSWORD not set in environment")
        print("\nTo fix this:")
        print("1. Enable 2FA on your Gmail account")
        print("2. Generate App Password: https://myaccount.google.com/apppasswords")
        print("3. Run: export SMTP_PASSWORD=your-16-char-app-password")
        print("\nOr add to .env file:")
        print("SMTP_PASSWORD=your-16-char-app-password")
        print("\nSee docs/GMAIL_SMTP_SETUP.md for detailed instructions")
        return
    
    # Set defaults if not configured
    smtp_username = os.getenv("SMTP_USERNAME")
    if not smtp_username:
        print("❌ Error: SMTP_USERNAME not set in environment")
        print("Set your Gmail address: export SMTP_USERNAME=your-email@gmail.com")
        return
    
    if not os.getenv("EMAIL_FROM"):
        os.environ["EMAIL_FROM"] = smtp_username
        print(f"ℹ️  Using sender: {smtp_username}")
    
    if not os.getenv("EMAIL_PROVIDER"):
        os.environ["EMAIL_PROVIDER"] = "smtp"
    
    # Get test email from user
    test_email = input("\n📧 Enter your email address to receive test invitation: ").strip()
    
    if not test_email or "@" not in test_email:
        print("❌ Invalid email address")
        return
    
    print(f"\n🚀 Sending test invitation to {test_email}...")
    print(f"📤 Using provider: {os.getenv('EMAIL_PROVIDER')}")
    print(f"📨 From: {os.getenv('EMAIL_FROM')}")
    
    try:
        result = send_invitation_email(
            to_email=test_email,
            invite_link="http://localhost:5173/accept-invite?token=test-token-12345",
            inviter_name="Test Admin",
            workspace_name="Demo Workspace"
        )
        
        print("\n✅ Email sent successfully!")
        print(f"📊 Result: {result}")
        print(f"\n📬 Check {test_email} for the invitation email")
        print("   (Check spam folder if not in inbox)")
        
    except ValueError as e:
        print(f"\n❌ Configuration error: {e}")
        print("\nMake sure you've set:")
        print("- SMTP_PASSWORD (Gmail App Password)")
        print("- SMTP_USERNAME (your Gmail address)")
        print("- See docs/GMAIL_SMTP_SETUP.md for setup")
        
    except Exception as e:
        print(f"\n❌ Error sending email: {e}")
        print("\nTroubleshooting:")
        print("1. Verify your App Password is correct (16 characters, no spaces)")
        print("2. Make sure 2FA is enabled on your Gmail account")
        print("3. Check that 'Less secure app access' is not blocking the connection")
        print("4. See docs/GMAIL_SMTP_SETUP.md for detailed troubleshooting")


if __name__ == "__main__":
    print("=" * 60)
    print("🔧 CogniSim AI - Email Invitation Test")
    print("=" * 60)
    main()
