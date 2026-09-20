from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TrustedContact, User
from app.routes.auth import get_current_user
from app.schemas import ContactCreate, ContactResponse

router = APIRouter(
    prefix="/api/contacts",
    tags=["Trusted Contacts"],
)


@router.post(
    "",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_contact(
    payload: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = TrustedContact(
        user_id=current_user.id,
        name=payload.name,
        phone=payload.phone,
        email=str(payload.email) if payload.email else None,
        relationship_label=payload.relationship_label,
    )

    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("", response_model=list[ContactResponse])
def list_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(TrustedContact)
        .filter(TrustedContact.user_id == current_user.id)
        .order_by(TrustedContact.created_at.desc())
        .all()
    )


@router.delete("/{contact_id}")
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = (
        db.query(TrustedContact)
        .filter(
            TrustedContact.id == contact_id,
            TrustedContact.user_id == current_user.id,
        )
        .first()
    )

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")

    db.delete(contact)
    db.commit()

    return {"message": "Trusted contact deleted successfully."}