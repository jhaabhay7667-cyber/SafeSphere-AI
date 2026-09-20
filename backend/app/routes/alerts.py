
import logging
import smtplib
from email.message import EmailMessage
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.config import settings
from app.database import get_db
from app.models import TrustedContact
from app.routes.auth import get_current_user


# ============================================================
# LOGGER
# ============================================================

logger = logging.getLogger(__name__)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/alerts",
    tags=["SOS Alerts"],
)


# ============================================================
# SOS REQUEST MODEL
# ============================================================

class SOSRequest(BaseModel):
    title: str = Field(
        default="Emergency SOS Alert",
        min_length=1,
        max_length=150,
    )

    message: str = Field(
        default="I need assistance. Please contact me.",
        min_length=1,
        max_length=2000,
    )

    location_text: Optional[str] = Field(
        default=None,
        max_length=500,
    )

    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ============================================================
# EMAIL SENDING FUNCTION
# ============================================================

def send_email(
    recipient: str,
    subject: str,
    body: str,
) -> tuple[bool, str]:

    required_settings = [
        settings.smtp_host,
        settings.smtp_port,
        settings.smtp_username,
        settings.smtp_password,
        settings.smtp_from,
    ]

    if not all(required_settings):
        return False, "SMTP email settings are incomplete."

    try:
        email = EmailMessage()
        email["Subject"] = subject
        email["From"] = settings.smtp_from
        email["To"] = recipient
        email.set_content(body)

        with smtplib.SMTP(
            settings.smtp_host,
            settings.smtp_port,
            timeout=20,
        ) as server:

            server.ehlo()
            server.starttls()
            server.ehlo()

            server.login(
                settings.smtp_username,
                settings.smtp_password,
            )

            server.send_message(email)

        return True, "Email accepted by the SMTP server."

    except smtplib.SMTPAuthenticationError:
        logger.warning("SMTP authentication failed.")
        return False, (
            "Gmail authentication failed. "
            "Check the SMTP username and App Password."
        )

    except smtplib.SMTPRecipientsRefused:
        logger.warning("SMTP recipient was refused.")
        return False, "The email recipient was refused."

    except smtplib.SMTPException as exc:
        logger.warning(
            "SMTP sending failed: %s",
            type(exc).__name__,
        )
        return False, (
            f"SMTP sending failed: {type(exc).__name__}."
        )

    except (OSError, TimeoutError) as exc:
        logger.warning(
            "SMTP connection failed: %s",
            type(exc).__name__,
        )
        return False, (
            "Could not connect to the SMTP server."
        )

    except Exception as exc:
        logger.exception(
            "Unexpected email error: %s",
            type(exc).__name__,
        )
        return False, (
            "Unexpected email error. "
            "Check the backend terminal."
        )


# ============================================================
# SMS SENDING FUNCTION
# ============================================================

def send_sms(
    recipient: str,
    body: str,
) -> tuple[bool, str]:

    required_settings = [
        settings.twilio_account_sid,
        settings.twilio_auth_token,
        settings.twilio_phone_number,
    ]

    if not all(required_settings):
        return False, (
            "Twilio SMS settings are incomplete."
        )

    try:
        client = Client(
            settings.twilio_account_sid,
            settings.twilio_auth_token,
        )

        message = client.messages.create(
            body=body,
            from_=settings.twilio_phone_number,
            to=recipient,
        )

        logger.info(
            "Twilio accepted SMS request. "
            "SID=%s Status=%s",
            message.sid,
            message.status,
        )

        return True, (
            "Twilio accepted the SMS request. "
            f"Status: {message.status}. "
            f"Message SID: {message.sid}"
        )

    except TwilioRestException as exc:
        # Do not log or return account credentials.
        logger.warning(
            "Twilio rejected SMS. Code=%s HTTP=%s",
            exc.code,
            exc.status,
        )

        return False, (
            f"Twilio error code {exc.code}. "
            "Check your Twilio configuration and logs."
        )

    except Exception as exc:
        logger.exception(
            "Unexpected SMS error: %s",
            type(exc).__name__,
        )

        return False, (
            "Unexpected SMS error. "
            "Check the backend terminal."
        )


# ============================================================
# BUILD SOS MESSAGE
# ============================================================

def build_alert_message(
    current_user,
    request: SOSRequest,
) -> str:

    user_name = getattr(
        current_user,
        "name",
        None,
    ) or "A SafeSphere AI user"

    lines = [
        "SAFESPHERE AI - SOS ALERT",
        "",
        f"Alert from: {user_name}",
        f"Message: {request.message}",
    ]

    if request.location_text:
        lines.extend([
            "",
            f"Location: {request.location_text}",
        ])

    if (
        request.latitude is not None
        and request.longitude is not None
    ):
        lines.extend([
            (
                "Coordinates: "
                f"{request.latitude}, "
                f"{request.longitude}"
            ),
            (
                "Map: https://www.google.com/maps?q="
                f"{request.latitude},{request.longitude}"
            ),
        ])

    lines.extend([
        "",
        "Please contact the sender directly.",
        "",
        "This alert was generated by SafeSphere AI.",
    ])

    return "\n".join(lines)


# ============================================================
# SEND SOS ALERT
# ============================================================

@router.post("/sos")
def send_sos_alert(
    request: SOSRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    # --------------------------------------------------------
    # 1. Get contacts belonging to the logged-in user
    # --------------------------------------------------------

    contacts = (
        db.query(TrustedContact)
        .filter(
            TrustedContact.user_id == current_user.id
        )
        .all()
    )

    if not contacts:
        return {
            "success": False,
            "message": (
                "No trusted contacts found. "
                "Please add a trusted contact first."
            ),
            "results": [],
        }

    # --------------------------------------------------------
    # 2. Prepare alert message
    # --------------------------------------------------------

    alert_body = build_alert_message(
        current_user,
        request,
    )

    results = []

    email_success_count = 0
    sms_success_count = 0

    # --------------------------------------------------------
    # 3. Attempt to notify each trusted contact
    # --------------------------------------------------------

    for contact in contacts:

        contact_result = {
            "contact_name": contact.name,
            "email": None,
            "sms": None,
        }

        # ----------------------------------------------------
        # EMAIL
        # ----------------------------------------------------

        email_address = (
            getattr(contact, "email", None) or ""
        ).strip()

        if email_address:

            email_ok, email_detail = send_email(
                recipient=email_address,
                subject=request.title,
                body=alert_body,
            )

            contact_result["email"] = {
                "success": email_ok,
                "detail": email_detail,
            }

            if email_ok:
                email_success_count += 1

        else:
            contact_result["email"] = {
                "success": False,
                "detail": (
                    "No email address saved for this contact."
                ),
            }

        # ----------------------------------------------------
        # SMS
        # ----------------------------------------------------

        phone_number = (
            getattr(contact, "phone", None) or ""
        ).strip()

        if phone_number:

            sms_ok, sms_detail = send_sms(
                recipient=phone_number,
                body=alert_body,
            )

            contact_result["sms"] = {
                "success": sms_ok,
                "detail": sms_detail,
            }

            if sms_ok:
                sms_success_count += 1

        else:
            contact_result["sms"] = {
                "success": False,
                "detail": (
                    "No phone number saved for this contact."
                ),
            }

        results.append(contact_result)

    # --------------------------------------------------------
    # 4. Determine overall result
    # --------------------------------------------------------

    total_successes = (
        email_success_count + sms_success_count
    )

    if total_successes > 0:

        message = (
            "At least one alert was accepted for sending. "
            "This does not confirm delivery."
        )

    else:

        message = (
            "No alert could be sent. "
            "Check the individual email and SMS results."
        )

    # --------------------------------------------------------
    # 5. Return detailed response to frontend
    # --------------------------------------------------------

    return {
        "success": total_successes > 0,
        "message": message,
        "email_success_count": email_success_count,
        "sms_success_count": sms_success_count,
        "results": results,
    }