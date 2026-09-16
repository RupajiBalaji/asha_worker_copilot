from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, Literal

from app.database import get_db
from app.models.db_models import Referral, FollowUp, Patient
from app.schemas import ReferralOut, FollowUpOut, FollowUpStatusUpdate

router_referral = APIRouter(prefix="/referrals", tags=["referrals"])
router_followup = APIRouter(prefix="/followups", tags=["followups"])

# Valid status values for referral PATCH — single source of truth
REFERRAL_STATUS_VALUES = ("pending", "acknowledged", "completed")


class ReferralStatusUpdate(BaseModel):
    """Strictly typed referral status update — rejects unknown values."""
    status: Literal["pending", "acknowledged", "completed"]


# ─── Referrals ──────────────────────────────────────────────────────────────

# IMPORTANT: literal-path routes ("/all", "/detail", "/pdf") must be registered
# BEFORE the "/{patient_id}" / "/{referral_id}" path-param routes, otherwise
# FastAPI matches a literal segment (e.g. "all") as an int and returns 422.

@router_referral.get("/all", response_model=list[ReferralOut])
def list_all_referrals(
    status: Optional[str] = Query(None, description="Filter by status: pending/acknowledged/completed"),
    db: Session = Depends(get_db),
):
    """List ALL referrals across all patients (used by the referrals dashboard screen)."""
    query = db.query(Referral)
    if status:
        query = query.filter(Referral.status == status)
    return query.order_by(Referral.created_at.desc()).all()


@router_referral.get("/pdf/{referral_id}")
def download_referral_pdf(referral_id: int, db: Session = Depends(get_db)):
    """Returns the filename and URL of the referral PDF."""
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral or not referral.pdf_filename:
        raise HTTPException(status_code=404, detail="Referral PDF not found")
    return {"pdf_filename": referral.pdf_filename, "url": f"/referral-pdfs/{referral.pdf_filename}"}


@router_referral.get("/detail/{referral_id}", response_model=ReferralOut)
def get_referral(referral_id: int, db: Session = Depends(get_db)):
    """Fetch a specific referral."""
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    return referral


@router_referral.patch("/{referral_id}/status", response_model=ReferralOut)
def update_referral_status(referral_id: int, status_update: ReferralStatusUpdate, db: Session = Depends(get_db)):
    """Update referral status (pending / acknowledged / completed)."""
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    referral.status = status_update.status
    db.commit()
    db.refresh(referral)
    return referral


@router_referral.get("/{patient_id}", response_model=list[ReferralOut])
def list_referrals(patient_id: int, db: Session = Depends(get_db)):
    """Fetch all referrals for a patient."""
    return (
        db.query(Referral)
        .filter(Referral.patient_id == patient_id)
        .order_by(Referral.created_at.desc())
        .all()
    )


# ─── Follow-ups ─────────────────────────────────────────────────────────────

# IMPORTANT: literal-path routes ("/all") must be registered BEFORE the
# "/{patient_id}" path-param route, otherwise FastAPI matches "all" as an int
# and returns 422.

@router_followup.get("/all", response_model=list[FollowUpOut])
def list_all_followups(
    status: Optional[str] = Query(None, description="Filter by status: upcoming/done/missed"),
    due_before: Optional[datetime] = Query(None, description="Only followups due before this datetime"),
    db: Session = Depends(get_db),
):
    """
    List ALL follow-ups across all patients.
    Used by the follow-up dashboard to show today's pending work.
    """
    query = db.query(FollowUp)
    if status:
        query = query.filter(FollowUp.status == status)
    if due_before:
        query = query.filter(FollowUp.due_date <= due_before)
    return query.order_by(FollowUp.due_date).all()


@router_followup.get("/{patient_id}", response_model=list[FollowUpOut])
def list_followups(
    patient_id: int,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Fetch all follow-ups for a patient, optionally filtered by status."""
    query = db.query(FollowUp).filter(FollowUp.patient_id == patient_id)
    if status:
        query = query.filter(FollowUp.status == status)
    return query.order_by(FollowUp.due_date).all()


@router_followup.patch("/{followup_id}/status", response_model=FollowUpOut)
def update_followup_status(
    followup_id: int,
    status_update: FollowUpStatusUpdate,
    db: Session = Depends(get_db),
):
    """Mark follow-up as done / missed / upcoming."""
    followup = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    followup.status = status_update.status
    db.commit()
    db.refresh(followup)
    return followup
