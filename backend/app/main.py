
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from . import models
from .routes import auth, incidents, contacts, alerts


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SafeSphere AI",
    description="AI-powered safety and incident reporting platform",
    version="1.0.0",
)

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

app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(contacts.router)

# SOS email + SMS router
app.include_router(alerts.router)


@app.get("/")
def root():
    return {
        "message": "Welcome to SafeSphere AI",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok"}