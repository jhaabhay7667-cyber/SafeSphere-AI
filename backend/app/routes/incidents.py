from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident, User
from app.routes.auth import get_current_user
from app.schemas import (
    IncidentCreate,
    IncidentResponse,
    IncidentStatusUpdate,
)

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

ALLOWED_SEVERITIES = {"Low", "Medium", "High", "Critical"}
ALLOWED_STATUSES = {"Reported", "In Progress", "Resolved", "Closed"}


@router.post(
    "",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.severity not in ALLOWED_SEVERITIES:
        raise HTTPException(
            status_code=400,
            detail="Severity must be Low, Medium, High, or Critical.",
        )

    incident = Incident(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        severity=payload.severity,
        location_text=payload.location_text,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status="Reported",
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("", response_model=list[IncidentResponse])
def list_my_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Incident)
        .filter(Incident.user_id == current_user.id)
        .order_by(Incident.created_at.desc())
        .all()
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = (
        db.query(Incident)
        .filter(
            Incident.id == incident_id,
            Incident.user_id == current_user.id,
        )
        .first()
    )

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    return incident


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(
    incident_id: int,
    payload: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid status.",
        )

    incident = (
        db.query(Incident)
        .filter(
            Incident.id == incident_id,
            Incident.user_id == current_user.id,
        )
        .first()
    )

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    incident.status = payload.status
    db.commit()
    db.refresh(incident)
    return incident


@router.delete("/{incident_id}")
def delete_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = (
        db.query(Incident)
        .filter(
            Incident.id == incident_id,
            Incident.user_id == current_user.id,
        )
        .first()
    )

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    db.delete(incident)
    db.commit()

    return {"message": "Incident deleted successfully."}