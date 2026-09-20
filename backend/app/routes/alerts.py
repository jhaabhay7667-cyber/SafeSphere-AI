
# ============================================================
# SAFESPHERE AI - ALERT ROUTES
# ============================================================

import logging
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from ..database import get_db
from ..models import TrustedContact
from ..config import settings
from .auth import get_current_user


# ============================================================
# ROUTER AND LOGGER
# ============================================================

router = APIRouter(
    prefix="/api/alerts",
    tags=["Alerts"],
)

logger = logging.getLogger(__name__)


# ============================================================
# REQUEST SCHEMA
# ============================================================

class SOSAlertRequest(BaseModel):
    title: str = Field(
        default="SOS Emergency Alert",
        max_length=200,
    )

    description: str = Field(
        default="Emergency assistance requested.",
        max_length=5000,
    )

    category: str = Field(
        default="Other",
        max_length=100,
    )

    severity: str = Field(
        default="High",
        max_length=50,
    )

    location: str | None = Field(
        default=None,
        max_length=500,
    )

    latitude: float | None = None
    longitude: float | None = None


# ============================================================
# FORMAT INCIDENT MESSAGE
# ============================================================

def build_alert_message(
    sender_name: str,
    incident: SOSAlertRequest,
) -> tuple[str, str]:

    subject = f"SafeSphere AI - {incident.title}"

    current_time = datetime.now(
        timezone.utc
    ).strftime("%Y-%m-%d %H:%M:%S UTC")

    latitude = (
        str(incident.latitude)
        if incident.latitude is not None
        else "Not available"
    )

    longitude = (
        str(incident.longitude)
        if incident.longitude is not None
        else "Not available"
    )

    location = (
        incident.location.strip()
        if incident.location
        else "Location not provided"
    )

    body = f"""
SAFESPHERE AI - SOS EMERGENCY ALERT

An emergency alert has been submitted.

Sender: {sender_name}

Incident: {incident.title}
Category: {incident.category}
Severity: {incident.severity}

Description:
{incident.description}

Location:
{location}

Latitude: {latitude}
Longitude: {longitude}

Reported at: {current_time}

Please contact the sender and check their safety.

This is an automated notification from SafeSphere AI.
"""

    if incident.latitude is not None and incident.longitude is not None:
        body += (
            "\nGoogle Maps location:\n"
            f"https://www.google.com/maps?q="
            f"{incident.latitude},{incident.longitude}\n"
        )

    return subject, body.strip()


# ============================================================
# EMAIL SENDER
# ============================================================

def send_email(
    recipient: str,
    subject: str,
    body: str,
) -> tuple[bool, str]:

    smtp_host = settings.smtp_host
    smtp_port = settings.smtp_port
    smtp_username = settings.smtp_username
    smtp_password = settings.smtp_password
    smtp_from = settings.smtp_from or smtp_username

    if not smtp_host or not smtp_username or not smtp_password:
        return False, "SMTP settings are incomplete."

    if not recipient:
        return False, "Recipient email is missing."

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = smtp_from
    message["To"] = recipient
    message.set_content(body)

    try:
        with smtplib.SMTP(
            smtp_host,
            smtp_port,
            timeout=20,
        ) as server:

            server.starttls()

            server.login(
                smtp_username,
                smtp_password,
            )

            server.send_message(message)

        return True, "Email accepted by SMTP server."

    except smtplib.SMTPAuthenticationError:
        logger.exception("SMTP authentication failed.")

        return False, (
            "Gmail authentication failed. "
            "Check SMTP_USERNAME and Google App Password."
        )

    except smtplib.SMTPException:
        logger.exception("SMTP sending failed.")

        return False, "SMTP server rejected or failed the email."

    except Exception:
        logger.exception("Unexpected email error.")

        return False, "Unexpected email error."


# ============================================================
# SMS SENDER
# ============================================================

def send_sms(
    recipient: str,
    body: str,
) -> tuple[bool, str]:

    account_sid = settings.twilio_account_sid
    auth_token = settings.twilio_auth_token
    sender_number = settings.twilio_phone_number

    if not account_sid or not auth_token or not sender_number:
        return False, "Twilio settings are incomplete."

    if not recipient:
        return False, "Recipient phone number is missing."

    try:
        client = Client(
            account_sid,
            auth_token,
        )

        message = client.messages.create(
            body=body,
            from_=sender_number,
            to=recipient,
        )

        return True, (
            f"SMS request accepted by Twilio. "
            f"SID: {message.sid}. "
            f"Status: {message.status}. "
            f"Delivery is not confirmed."
        )

    except TwilioRestException as exc:
        logger.error(
            "Twilio request failed. Code: %s | "
            "Message: %s | Status: %s",
            exc.code,
            exc.msg,
            exc.status,
        )

        if exc.code == 20003:
            return False, (
                "Twilio authentication failed. "
                "Check Account SID and Auth Token."
            )

        return False, (
            f"Twilio rejected the request "
            f"(code {exc.code}): {exc.msg}"
        )

    except Exception:
        logger.exception("Unexpected SMS error.")

        return False, "Unexpected SMS error."


# ============================================================
# SOS ALERT ENDPOINT
# Sends the same incident email to:
# 1. The logged-in sender
# 2. All trusted contacts with email addresses
# ============================================================

@router.post("/sos")
def send_sos_alert(
    incident: SOSAlertRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    sender_name = (
        getattr(current_user, "name", None)
        or getattr(current_user, "full_name", None)
        or "SafeSphere User"
    )

    sender_email = getattr(
        current_user,
        "email",
        None,
    )

    subject, alert_body = build_alert_message(
        sender_name=sender_name,
        incident=incident,
    )

    # --------------------------------------------------------
    # Get trusted contacts belonging to logged-in user
    # --------------------------------------------------------

    contacts = (
        db.query(TrustedContact)
        .filter(
            TrustedContact.user_id == current_user.id
        )
        .all()
    )

    # --------------------------------------------------------
    # Prepare recipients
    # --------------------------------------------------------

    recipients = []

    # Sender receives a copy
    if sender_email:
        recipients.append({
            "name": sender_name,
            "email": sender_email,
            "phone": None,
            "is_sender": True,
        })

    # Trusted contacts receive the same alert
    for contact in contacts:
        if contact.email:
            recipients.append({
                "name": contact.name,
                "email": contact.email,
                "phone": contact.phone,
                "is_sender": False,
            })

    # --------------------------------------------------------
    # Send notifications and collect results
    # --------------------------------------------------------

    results = []

    email_success_count = 0
    sms_success_count = 0

    for recipient in recipients:

        contact_result = {
            "name": recipient["name"],
            "is_sender": recipient["is_sender"],
            "email": {
                "attempted": False,
                "success": False,
                "message": "Not attempted",
            },
            "sms": {
                "attempted": False,
                "success": False,
                "message": "Not attempted",
            },
        }

        # ----------------------------------------------------
        # EMAIL
        # ----------------------------------------------------

        email_address = recipient["email"]

        if email_address:
            contact_result["email"]["attempted"] = True

            email_success, email_message = send_email(
                recipient=email_address,
                subject=subject,
                body=alert_body,
            )

            contact_result["email"]["success"] = email_success
            contact_result["email"]["message"] = email_message

            if email_success:
                email_success_count += 1

        # ----------------------------------------------------
        # SMS
        # ----------------------------------------------------

        phone_number = recipient["phone"]

        if phone_number:
            contact_result["sms"]["attempted"] = True

            sms_success, sms_message = send_sms(
                recipient=str(phone_number),
                body=alert_body,
            )

            contact_result["sms"]["success"] = sms_success
            contact_result["sms"]["message"] = sms_message

            if sms_success:
                sms_success_count += 1

        results.append(contact_result)

    # --------------------------------------------------------
    # Determine overall result
    # --------------------------------------------------------

    any_success = (
        email_success_count > 0
        or sms_success_count > 0
    )

    return {
        "success": any_success,
        "message": (
            "At least one notification was accepted "
            "by its provider. Delivery is not confirmed."
            if any_success
            else "No notification was accepted by its provider."
        ),
        "sender_email": sender_email,
        "total_contacts": len(contacts),
        "email_success_count": email_success_count,
        "sms_success_count": sms_success_count,
        "results": results,
    }