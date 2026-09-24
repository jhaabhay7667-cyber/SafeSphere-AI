from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from . import models
from .routes import auth, incidents, contacts, alerts


# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="SafeSphere AI",
    description="AI-powered safety and incident reporting platform",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.frontend_origins.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTERS
# ============================================================

app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(contacts.router)
app.include_router(alerts.router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to SafeSphere AI",
        "docs": "/docs",
    }


# ============================================================
# BASIC HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "ok"
    }


# ============================================================
# PROVIDER CONFIGURATION CHECK
# ============================================================
# This endpoint ONLY returns True/False.
# It NEVER exposes passwords, API keys, or tokens.
# ============================================================

@app.get("/api/health/providers")
def provider_config_check():
    return {
        "smtp": {
            "host": bool(settings.smtp_host),
            "username": bool(settings.smtp_username),
            "password": bool(settings.smtp_password),
            "from": bool(settings.smtp_from),
            "port": settings.smtp_port,
        },

        "resend": {
            "api_key": bool(settings.resend_api_key),
            "from_email": bool(settings.resend_from_email),
        },

        "twilio": {
            "account_sid": bool(settings.twilio_account_sid),
            "auth_token": bool(settings.twilio_auth_token),
            "phone_number": bool(settings.twilio_phone_number),
        },
    }