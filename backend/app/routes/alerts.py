# ============================================================
# SAFESPHERE AI - ALERT ROUTES
# ============================================================

import logging
from datetime import datetime, timezone

import resend

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

    # Selected trusted contact
    contact_id: int | None = None

    # Emergency call information
    emergency_name: str | None = Field(
        default=None,
        max_length=100,
    )

    emergency_phone: str | None = Field(
        default=None,
        max_length=30,
    )

    # Backward-compatible fields
    message: str | None = Field(
        default=None,
        max_length=5000,
    )

    location_text: str | None = Field(
        default=None,
        max_length=500,
    )


# ============================================================
# BUILD FULL SOS INCIDENT REPORT
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
        else (
            incident.location_text.strip()
            if incident.location_text
            else "Location not provided"
        )
    )

    description = (
        incident.description.strip()
        if incident.description
        else (
            incident.message.strip()
            if incident.message
            else "Emergency assistance requested."
        )
    )

    body = f"""
SAFESPHERE AI - SOS EMERGENCY ALERT

An emergency alert has been submitted.

==================================================
SENDER INFORMATION
==================================================

Name: {sender_name}

==================================================
INCIDENT INFORMATION
==================================================

Incident: {incident.title}
Category: {incident.category}
Severity: {incident.severity}

Description:
{description}

==================================================
LOCATION INFORMATION
==================================================

Location:
{location}

Latitude: {latitude}
Longitude: {longitude}

Reported at:
{current_time}
"""

    if incident.latitude is not None and incident.longitude is not None:
        body += f"""

Google Maps Location:
https://www.google.com/maps?q={incident.latitude},{incident.longitude}
"""

    body += """

==================================================

Please contact the sender and check their safety.

This is an automated emergency notification from SafeSphere AI.
"""

    return subject, body.strip()


# ============================================================
# RESEND EMAIL SENDER
# ============================================================

def send_email(
    recipient: str,
    subject: str,
    body: str,
) -> tuple[bool, str]:

    api_key = settings.resend_api_key
    from_email = settings.resend_from_email

    if not api_key:
        return False, "Resend API key is not configured."

    if not from_email:
        return False, "RESEND_FROM_EMAIL is not configured."

    if not recipient:
        return False, "Recipient email is missing."

    try:
        # Configure Resend API key
        resend.api_key = api_key

        params = {
            "from": from_email,
            "to": [recipient],
            "subject": subject,
            "text": body,
        }

        response = resend.Emails.send(params)

        email_id = None

        if isinstance(response, dict):
            email_id = response.get("id")
        else:
            email_id = getattr(response, "id", None)

        if email_id:
            return True, (
                "Email accepted by Resend. "
                f"Resend ID: {email_id}. "
                "Delivery is not confirmed."
            )

        return True, (
            "Email request accepted by Resend. "
            "Delivery is not confirmed."
        )

    except Exception as exc:
        logger.exception("Resend email sending failed.")

        return False, (
            f"Resend email error: "
            f"{type(exc).__name__}: {str(exc)}"
        )


# ============================================================
# TWILIO SMS SENDER
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
            "SMS request accepted by Twilio. "
            f"SID: {message.sid}. "
            f"Status: {message.status}. "
            "Delivery is not confirmed."
        )

    except TwilioRestException as exc:

        logger.error(
            "Twilio request failed. "
            "Code: %s | Message: %s | Status: %s",
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

    except Exception as exc:

        logger.exception(
            "Unexpected SMS error."
        )

        return False, (
            f"SMS error: "
            f"{type(exc).__name__}: {str(exc)}"
        )


# ============================================================
# GET SELECTED TRUSTED CONTACT
# ============================================================

def get_selected_contact(
    db: Session,
    current_user,
    contact_id: int | None,
):
    if contact_id is None:
        return None

    contact = (
        db.query(TrustedContact)
        .filter(
            TrustedContact.id == contact_id,
            TrustedContact.user_id == current_user.id,
        )
        .first()
    )

    if not contact:
        raise HTTPException(
            status_code=404,
            detail="Selected trusted contact was not found.",
        )

    return contact


# ============================================================
# SOS ALERT ENDPOINT
# ============================================================

@router.post("/sos")
def send_sos_alert(
    incident: SOSAlertRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    # --------------------------------------------------------
    # Sender information
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Selected emergency contact
    # --------------------------------------------------------

    selected_contact = get_selected_contact(
        db=db,
        current_user=current_user,
        contact_id=incident.contact_id,
    )

    # --------------------------------------------------------
    # Build full incident report
    # --------------------------------------------------------

    subject, alert_body = build_alert_message(
        sender_name=sender_name,
        incident=incident,
    )

    # --------------------------------------------------------
    # Get all trusted contacts
    # --------------------------------------------------------

    contacts = (
        db.query(TrustedContact)
        .filter(
            TrustedContact.user_id == current_user.id
        )
        .order_by(
            TrustedContact.created_at.desc()
        )
        .all()
    )

    # --------------------------------------------------------
    # Prepare recipients
    # --------------------------------------------------------

    recipients = []

    # Sender gets an email copy
    if sender_email:
        recipients.append({
            "name": sender_name,
            "contact_id": None,
            "email": sender_email,
            "phone": None,
            "is_sender": True,
        })

    # Trusted contacts
    for contact in contacts:

        # Include a contact if they have
        # either email OR phone.
        if contact.email or contact.phone:

            recipients.append({
                "name": contact.name,
                "contact_id": contact.id,
                "email": contact.email,
                "phone": contact.phone,
                "is_sender": False,
            })

    # --------------------------------------------------------
    # Notification counters
    # --------------------------------------------------------

    results = []

    email_attempt_count = 0
    email_success_count = 0

    sms_attempt_count = 0
    sms_success_count = 0

    # --------------------------------------------------------
    # Send email + SMS
    # --------------------------------------------------------

    for recipient in recipients:

        contact_result = {
            "name": recipient["name"],
            "contact_id": recipient["contact_id"],
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

            email_attempt_count += 1

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

            sms_attempt_count += 1

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
    # Determine call target
    # --------------------------------------------------------

    call_name = None
    call_phone = None

    if selected_contact:

        call_name = selected_contact.name
        call_phone = selected_contact.phone

    elif incident.emergency_phone:

        call_name = (
            incident.emergency_name
            or "Emergency Contact"
        )

        call_phone = incident.emergency_phone

    call_target = {
        "available": bool(call_phone),
        "name": call_name,
        "phone": call_phone,
    }

    # --------------------------------------------------------
    # Overall success
    # --------------------------------------------------------

    any_notification_success = (
        email_success_count > 0
        or sms_success_count > 0
    )

    if any_notification_success:

        response_message = (
            "At least one notification was accepted "
            "by its provider. Delivery is not confirmed."
        )

    else:

        response_message = (
            "No notification was accepted by its provider."
        )

    # --------------------------------------------------------
    # Final response
    # --------------------------------------------------------

    return {
        "success": any_notification_success,

        "message": response_message,

        "sender_name": sender_name,
        "sender_email": sender_email,

        "total_contacts": len(contacts),

        "email_attempt_count": email_attempt_count,
        "email_success_count": email_success_count,

        "sms_attempt_count": sms_attempt_count,
        "sms_success_count": sms_success_count,

        "selected_contact_id": incident.contact_id,

        "emergency_name": (
            call_name
            or incident.emergency_name
        ),

        "emergency_phone": (
            call_phone
            or incident.emergency_phone
        ),

        "call_target": call_target,

        "results": results,
    }