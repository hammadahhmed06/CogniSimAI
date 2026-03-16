"""Manual SMTP smoke test.

This file used to run an interactive script at import-time, which breaks automated
test runs (pytest captures stdin/stdout and disallows input()).

To run it intentionally, set:
  RUN_SMTP_QUICK_TEST=1
and then execute pytest with -s.
"""

import os

import pytest


if os.getenv("RUN_SMTP_QUICK_TEST") != "1":
    pytest.skip("Skipping manual SMTP quick test (set RUN_SMTP_QUICK_TEST=1 to run).", allow_module_level=True)


def test_smtp_quick_smoke():  # pragma: no cover
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    from dotenv import load_dotenv

    load_dotenv()

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    email_from = os.getenv("EMAIL_FROM")
    recipient = os.getenv("SMTP_TEST_RECIPIENT") or smtp_username

    assert smtp_username, "SMTP_USERNAME must be set"
    assert smtp_password, "SMTP_PASSWORD must be set"
    assert recipient, "SMTP_TEST_RECIPIENT (or SMTP_USERNAME) must be set"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "CogniSim AI - SMTP Smoke Test"
    msg["From"] = email_from or smtp_username
    msg["To"] = recipient
    msg.attach(MIMEText("<p>SMTP smoke test</p>", "html"))

    server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
    server.login(smtp_username, smtp_password)
    server.send_message(msg)
    server.quit()
