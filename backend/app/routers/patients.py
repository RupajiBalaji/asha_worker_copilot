from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.db_models import Patient, Visit, Referral, FollowUp
from app.schemas import PatientCreate, PatientOut, PatientUpdate, StatsOut

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("/", response_model=PatientOut)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    """Register a new patient."""
    db_patient = Patient(**patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    """
    Dashboard statistics:
    - Total registered patients
    - Patients with critical / high risk from their last visit
    - Pending referrals
    - Upcoming & overdue follow-ups
    """
    total_patients = db.query(Patient).count()

    # Critical / high risk: look at most recent visit per patient
    # We use a subquery to get the latest visit_id per patient
    from sqlalchemy import func
    latest_visit_subq = (
        db.query(Visit.patient_id, func.max(Visit.id).label("max_id"))
        .group_by(Visit.patient_id)
        .subquery()
    )
    latest_visits = (
        db.query(Visit)
        .join(latest_visit_subq, Visit.id == latest_visit_subq.c.max_id)
        .all()
    )
    critical_patients = sum(1 for v in latest_visits if v.risk_level == "critical")
    high_risk_patients = sum(1 for v in latest_visits if v.risk_level in ("high", "critical"))

    pending_referrals = db.query(Referral).filter(Referral.status == "pending").count()

    now = datetime.utcnow()
    # Upcoming follow-ups: scheduled in the future AND not yet overdue
    upcoming_followups = (
        db.query(FollowUp)
        .filter(FollowUp.status == "upcoming", FollowUp.due_date >= now)
        .count()
    )
    # Overdue follow-ups: ANY follow-up past its due date that hasn't been marked done.
    # Previously this only counted status="upcoming", which made "missed" follow-ups
    # vanish from the dashboard. Include both "upcoming" (past due) and "missed".
    overdue_followups = (
        db.query(FollowUp)
        .filter(
            ((FollowUp.status == "upcoming") & (FollowUp.due_date < now))
            | (FollowUp.status == "missed")
        )
        .count()
    )

    return StatsOut(
        total_patients=total_patients,
        critical_patients=critical_patients,
        high_risk_patients=high_risk_patients,
        pending_referrals=pending_referrals,
        upcoming_followups=upcoming_followups,
        overdue_followups=overdue_followups,
    )


@router.get("/", response_model=list[PatientOut])
def list_patients(
    name: str = Query(None, description="Filter by patient name (partial match)"),
    village: str = Query(None, description="Filter by village (partial match)"),
    db: Session = Depends(get_db),
):
    """List all patients with optional name and village filtering."""
    query = db.query(Patient)
    if name:
        query = query.filter(Patient.name.ilike(f"%{name}%"))
    if village:
        query = query.filter(Patient.village.ilike(f"%{village}%"))
    return query.order_by(Patient.created_at.desc()).all()


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    """Fetch patient by ID."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.patch("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: int, updates: PatientUpdate, db: Session = Depends(get_db)):
    """Update patient details (partial update — only provided fields are changed)."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient
