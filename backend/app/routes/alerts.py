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
    """
    Data received when the frontend triggers an SOS alert.

    contact_id:
        If provided, only that trusted contact receives
        the notification.

        If not provided, all trusted contacts are notified.

    emergency_name:
        Example:
            Hospital / Ambulance
            Police Emergency
            Fire Brigade
            Trusted Contact

    emergency_phone:
        Example:
            108
            112
            101
            +919876543210
    """

    title: str = Field(
        default="SOS Emergency Alert",
        max_length=200,
    )

    description: str = Field(
        default="Emergency assistance requested.",
        max_length=5000,
    )

    category: str = Field(
        default="Emergency",
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

    # --------------------------------------------------------
    # SELECTED TRUSTED CONTACT
    # --------------------------------------------------------

    contact_id: int | None = None

    # --------------------------------------------------------
    # SELECTED EMERGENCY DESTINATION
    # --------------------------------------------------------

    emergency_name: str | None = Field(
        default=None,
        max_length=100,
    )

    emergency_phone: str | None = Field(
        default=None,
        max_length=50,
    )

    # --------------------------------------------------------
    # BACKWARD COMPATIBILITY
    #
    # Older frontend code may send:
    #   message
    #   location_text
    #
    # We keep these fields so the backend doesn't break if
    # an older frontend request is still being used.
    # --------------------------------------------------------

    message: str | None = Field(
        default=None,
        max_length=5000,
    )

    location_text: str | None = Field(
        default=None,
        max_length=500,
    )


# ============================================================
# BUILD FULL INCIDENT REPORT
# ============================================================

def build_alert_message(
    sender_name: str,
    incident: SOSAlertRequest,
) -> tuple[str, str]:

    # --------------------------------------------------------
    # Use old frontend fields if the newer fields are empty
    # --------------------------------------------------------

    description = (
        incident.description
        if incident.description
        else incident.message
        or "Emergency assistance requested."
    )

    location_value = (
        incident.location
        if incident.location
        else incident.location_text
    )

    # --------------------------------------------------------
    # Basic values
    # --------------------------------------------------------

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
        location_value.strip()
        if location_value
        else "Location not provided"
    )

    emergency_name = (
        incident.emergency_name.strip()
        if incident.emergency_name
        else "Not specified"
    )

    emergency_phone = (
        incident.emergency_phone.strip()
        if incident.emergency_phone
        else "Not specified"
    )

    # --------------------------------------------------------
    # Google Maps link
    # --------------------------------------------------------

    if (
        incident.latitude is not None
        and incident.longitude is not None
    ):
        maps_link = (
            "https://www.google.com/maps?q="
            f"{incident.latitude},{incident.longitude}"
        )
    else:
        maps_link = "Not available"

    # --------------------------------------------------------
    # FULL INCIDENT REPORT
    # --------------------------------------------------------

    body = f"""
============================================================
SAFESPHERE AI - SOS EMERGENCY ALERT
============================================================

URGENT: An emergency alert has been triggered.

------------------------------------------------------------
USER INFORMATION
------------------------------------------------------------

Name:
{sender_name}

------------------------------------------------------------
INCIDENT INFORMATION
------------------------------------------------------------

Incident:
{incident.title}

Category:
{incident.category}

Severity:
{incident.severity}

Description:
{description}

------------------------------------------------------------
EMERGENCY DESTINATION
------------------------------------------------------------

Selected destination:
{emergency_name}

Destination phone:
{emergency_phone}

------------------------------------------------------------
LOCATION INFORMATION
------------------------------------------------------------

Location:
{location}

Latitude:
{latitude}

Longitude:
{longitude}

Google Maps:
{maps_link}

------------------------------------------------------------
TIME
------------------------------------------------------------

Reported at:
{current_time}

------------------------------------------------------------
ACTION REQUIRED
------------------------------------------------------------

Please contact the sender and check their safety immediately.

This alert was generated automatically by SafeSphere AI.

============================================================
END OF INCIDENT REPORT
============================================================
"""

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

    # --------------------------------------------------------
    # Validate SMTP settings
    # --------------------------------------------------------

    if (
        not smtp_host
        or not smtp_username
        or not smtp_password
    ):
        return False, "SMTP settings are incomplete."

    if not recipient:
        return False, "Recipient email is missing."

    # --------------------------------------------------------
    # Create email
    # --------------------------------------------------------

    message = EmailMessage()

    message["Subject"] = subject
    message["From"] = smtp_from
    message["To"] = recipient

    message.set_content(body)

    # --------------------------------------------------------
    # Send email
    # --------------------------------------------------------

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

        logger.exception(
            "SMTP authentication failed."
        )

        return False, (
            "Gmail authentication failed. "
            "Check SMTP_USERNAME and Google App Password."
        )

    except smtplib.SMTPException:

        logger.exception(
            "SMTP sending failed."
        )

        return False, (
            "SMTP server rejected or failed the email."
        )

    except Exception:

        logger.exception(
            "Unexpected email error."
        )

        return False, (
            "Unexpected email error."
        )


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

    # --------------------------------------------------------
    # Validate Twilio settings
    # --------------------------------------------------------

    if (
        not account_sid
        or not auth_token
        or not sender_number
    ):
        return False, "Twilio settings are incomplete."

    if not recipient:
        return False, "Recipient phone number is missing."

    # --------------------------------------------------------
    # Send SMS
    # --------------------------------------------------------

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
            "Twilio rejected the request "
            f"(code {exc.code}): {exc.msg}"
        )

    except Exception:

        logger.exception(
            "Unexpected SMS error."
        )

        return False, (
            "Unexpected SMS error."
        )


# ============================================================
# GET TRUSTED CONTACTS
# ============================================================

def get_sos_contacts(
    db: Session,
    current_user,
    contact_id: int | None = None,
):
    """
    Get trusted contacts for the SOS.

    contact_id supplied:
        Only the selected contact is returned.

    contact_id not supplied:
        All contacts belonging to the logged-in user
        are returned.
    """

    query = (
        db.query(TrustedContact)
        .filter(
            TrustedContact.user_id
            == current_user.id
        )
    )

    # --------------------------------------------------------
    # Specific trusted contact selected
    # --------------------------------------------------------

    if contact_id is not None:

        contact = (
            query
            .filter(
                TrustedContact.id
                == contact_id
            )
            .first()
        )

        if not contact:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Trusted contact not found "
                    "or does not belong to this user."
                ),
            )

        return [contact]

    # --------------------------------------------------------
    # No contact selected
    # Send to all trusted contacts
    # --------------------------------------------------------

    return (
        query
        .order_by(
            TrustedContact.created_at.desc()
        )
        .all()
    )


# ============================================================
# BUILD RECIPIENT
# ============================================================

def build_contact_recipient(contact):

    return {
        "name": contact.name,
        "email": contact.email,
        "phone": contact.phone,
        "is_sender": False,
        "contact_id": contact.id,
    }


# ============================================================
# SOS ALERT ENDPOINT
# ============================================================

@router.post("/sos")
def send_sos_alert(
    incident: SOSAlertRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    # ========================================================
    # USER INFORMATION
    # ========================================================

    sender_name = (
        getattr(
            current_user,
            "name",
            None,
        )
        or getattr(
            current_user,
            "full_name",
            None,
        )
        or "SafeSphere User"
    )

    sender_email = getattr(
        current_user,
        "email",
        None,
    )

    # ========================================================
    # BUILD FULL REPORT
    # ========================================================

    subject, alert_body = build_alert_message(
        sender_name=sender_name,
        incident=incident,
    )

    # ========================================================
    # GET TRUSTED CONTACTS
    # ========================================================

    contacts = get_sos_contacts(
        db=db,
        current_user=current_user,
        contact_id=incident.contact_id,
    )

    # ========================================================
    # PREPARE RECIPIENTS
    # ========================================================

    recipients = []

    # --------------------------------------------------------
    # Add logged-in user's email as a copy
    # --------------------------------------------------------

    if sender_email:

        recipients.append(
            {
                "name": sender_name,
                "email": sender_email,
                "phone": None,
                "is_sender": True,
                "contact_id": None,
            }
        )

    # --------------------------------------------------------
    # Add trusted contacts
    #
    # IMPORTANT:
    # We add the contact if it has EITHER:
    #
    # email OR phone
    #
    # This fixes phone-only contacts.
    # --------------------------------------------------------

    for contact in contacts:

        if contact.email or contact.phone:

            recipients.append(
                build_contact_recipient(
                    contact
                )
            )

    # ========================================================
    # SEND NOTIFICATIONS
    # ========================================================

    results = []

    email_success_count = 0
    sms_success_count = 0

    email_attempt_count = 0
    sms_attempt_count = 0

    # ========================================================
    # PROCESS EVERY RECIPIENT
    # ========================================================

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

            contact_result["email"]["attempted"] = True

            email_attempt_count += 1

            email_success, email_message = send_email(
                recipient=email_address,
                subject=subject,
                body=alert_body,
            )

            contact_result["email"]["success"] = (
                email_success
            )

            contact_result["email"]["message"] = (
                email_message
            )

            if email_success:

                email_success_count += 1

        # ----------------------------------------------------
        # SMS
        # ----------------------------------------------------

        phone_number = recipient["phone"]

        if phone_number:

            contact_result["sms"]["attempted"] = True

            sms_attempt_count += 1

            sms_success, sms_message = send_sms(
                recipient=str(phone_number),
                body=alert_body,
            )

            contact_result["sms"]["success"] = (
                sms_success
            )

            contact_result["sms"]["message"] = (
                sms_message
            )

            if sms_success:

                sms_success_count += 1

        # ----------------------------------------------------
        # Save result
        # ----------------------------------------------------

        results.append(
            contact_result
        )

    # ========================================================
    # OVERALL SUCCESS
    # ========================================================

    any_success = (
        email_success_count > 0
        or sms_success_count > 0
    )

    # ========================================================
    # CALL TARGET
    #
    # IMPORTANT:
    # Backend DOES NOT make the phone call.
    #
    # It returns the number to the frontend.
    #
    # The frontend can then use:
    #
    # window.location.href = "tel:" + number
    #
    # ========================================================

    call_target_phone = None
    call_target_name = None

    # --------------------------------------------------------
    # Emergency service selected
    # --------------------------------------------------------

    if incident.emergency_phone:

        call_target_phone = (
            incident.emergency_phone
        )

        call_target_name = (
            incident.emergency_name
            or "Emergency Service"
        )

    # --------------------------------------------------------
    # Trusted contact selected
    # --------------------------------------------------------

    elif (
        incident.contact_id is not None
        and len(contacts) == 1
    ):

        selected_contact = contacts[0]

        if selected_contact.phone:

            call_target_phone = (
                str(selected_contact.phone)
            )

            call_target_name = (
                selected_contact.name
            )

    # ========================================================
    # RESULT MESSAGE
    # ========================================================

    if any_success:

        result_message = (
            "At least one notification was accepted "
            "by its provider. Delivery is not confirmed."
        )

    else:

        if not recipients:

            result_message = (
                "No notification recipients are "
                "available. Add a trusted contact "
                "with an email address or phone number."
            )

        else:

            result_message = (
                "No notification was accepted "
                "by its provider."
            )

    # ========================================================
    # RETURN RESPONSE
    # ========================================================

    return {
        "success": any_success,

        "message": result_message,

        "sender_name": sender_name,

        "sender_email": sender_email,

        "total_contacts": len(contacts),

        "email_attempt_count": email_attempt_count,

        "email_success_count": email_success_count,

        "sms_attempt_count": sms_attempt_count,

        "sms_success_count": sms_success_count,

        "selected_contact_id": incident.contact_id,

        "emergency_name": incident.emergency_name,

        "emergency_phone": incident.emergency_phone,

        "call_target": {
            "available": bool(
                call_target_phone
            ),
            "name": call_target_name,
            "phone": call_target_phone,
        },

        "results": results,
    }