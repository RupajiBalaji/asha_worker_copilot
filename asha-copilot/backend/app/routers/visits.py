from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.models.db_models import Patient, Visit, Referral, FollowUp
from app.schemas import VisitCreate, VisitAssessmentOut, VisitOut, FollowUpCreate
from app.ml.engine import assess
from app.utils.referral_pdf import generate_referral_pdf

router = APIRouter(prefix="/visits", tags=["visits"])


def _get_reason_summary(flags):
    """Generate a concise referral reason from the flags."""
    if not flags:
        return "Patient requires further medical evaluation."
    
    critical_flags = [f for f in flags if f["severity"] == "critical"]
    if critical_flags:
        reasons = [f["message"].split("—")[0].strip() for f in critical_flags[:2]]
        return "Critical findings: " + "; ".join(reasons)
    
    high_flags = [f for f in flags if f["severity"] == "high"]
    if high_flags:
        reasons = [f["message"].split("—")[0].strip() for f in high_flags[:2]]
        return "High-risk findings: " + "; ".join(reasons)
    
    return "Patient requires further evaluation based on health indicators."


@router.post("/{patient_id}/assess", response_model=VisitAssessmentOut)
def record_visit_and_assess(patient_id: int, visit: VisitCreate, db: Session = Depends(get_db)):
    """
    ASHA worker records a visit: vitals, symptoms, pregnancy/child indicators.
    
    The endpoint:
    1. Evaluates the patient using the hybrid rule + ML engine
    2. Stores the visit & assessment in the database
    3. If high/critical risk: generates a referral letter PDF & schedules follow-ups
    4. Returns the full assessment with clinical flags and risk score
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Prepare assessment input: combine patient baseline + visit fields
    assessment_input = {
        "age": patient.age,
        "is_child": patient.is_child,
        "is_pregnant": patient.is_pregnant,
        "existing_diabetes": patient.existing_diabetes,
        "existing_hypertension": patient.existing_hypertension,
        # Visit vitals
        "systolic_bp": visit.systolic_bp,
        "diastolic_bp": visit.diastolic_bp,
        "blood_sugar_mg_dl": visit.blood_sugar_mg_dl,
        "hemoglobin_g_dl": visit.hemoglobin_g_dl,
        "temperature_c": visit.temperature_c,
        "pulse_bpm": visit.pulse_bpm,
        "bmi": round(visit.weight_kg / ((visit.height_cm / 100) ** 2), 1) if visit.weight_kg and visit.height_cm else None,
        # Pregnancy
        "trimester": visit.trimester,
        "pregnancy_danger_signs": visit.pregnancy_danger_signs,
        # Child
        "child_age_months": visit.child_age_months,
        "muac_cm": visit.muac_cm,
        "diarrhea": visit.diarrhea,
    }

    assessment = assess(assessment_input)

    # Store visit record
    db_visit = Visit(
        patient_id=patient_id,
        systolic_bp=visit.systolic_bp,
        diastolic_bp=visit.diastolic_bp,
        blood_sugar_mg_dl=visit.blood_sugar_mg_dl,
        hemoglobin_g_dl=visit.hemoglobin_g_dl,
        temperature_c=visit.temperature_c,
        pulse_bpm=visit.pulse_bpm,
        weight_kg=visit.weight_kg,
        height_cm=visit.height_cm,
        bmi=assessment_input["bmi"],
        trimester=visit.trimester,
        pregnancy_danger_signs=visit.pregnancy_danger_signs,
        child_age_months=visit.child_age_months,
        muac_cm=visit.muac_cm,
        diarrhea=visit.diarrhea,
        symptoms=visit.symptoms,
        notes=visit.notes,
        risk_level=assessment["risk_level"],
        risk_flags=assessment["flags"],
        ml_confidence=assessment["ml_confidence"],
        needs_referral=assessment["needs_referral"],
    )
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)

    referral_id = None

    # Auto-generate referral if high/critical risk
    if assessment["needs_referral"]:
        reason = _get_reason_summary(assessment["flags"])
        facility = "Primary Health Center (PHC)"

        pdf_filename = generate_referral_pdf(
            patient={"id": patient.id, "name": patient.name, "age": patient.age, "gender": patient.gender,
                     "village": patient.village, "phone": patient.phone, "asha_worker_name": patient.asha_worker_name},
            visit={
                "id": db_visit.id,
                "systolic_bp": db_visit.systolic_bp,
                "diastolic_bp": db_visit.diastolic_bp,
                "blood_sugar_mg_dl": db_visit.blood_sugar_mg_dl,
                "hemoglobin_g_dl": db_visit.hemoglobin_g_dl,
                "temperature_c": db_visit.temperature_c,
                "pulse_bpm": db_visit.pulse_bpm,
                "bmi": db_visit.bmi,
            },
            assessment={"risk_level": assessment["risk_level"], "flags": assessment["flags"],
                       "reason_summary": reason},
            facility_name=facility,
        )

        db_referral = Referral(
            patient_id=patient_id,
            visit_id=db_visit.id,
            facility_name=facility,
            reason_summary=reason,
            risk_level=assessment["risk_level"],
            pdf_filename=pdf_filename,
            status="pending",
        )
        db.add(db_referral)
        db.commit()
        db.refresh(db_referral)
        referral_id = db_referral.id

        # Schedule automatic follow-up in 3-7 days
        followup_days = 3 if assessment["risk_level"] == "critical" else 7
        followup = FollowUp(
            patient_id=patient_id,
            visit_id=db_visit.id,
            type="general_checkup",
            due_date=datetime.utcnow() + timedelta(days=followup_days),
            notes=f"Follow-up for {assessment['risk_level'].upper()} risk assessment",
            status="upcoming",
        )
        db.add(followup)
        db.commit()

    # Return full assessment
    return VisitAssessmentOut(
        visit=VisitOut.model_validate(db_visit),
        rule_risk_level=assessment["rule_risk_level"],
        ml_risk_level=assessment["ml_risk_level"],
        ml_confidence=assessment["ml_confidence"],
        class_probabilities=assessment["class_probabilities"],
        flags=assessment["flags"],
        category_levels=assessment["category_levels"],
        needs_referral=assessment["needs_referral"],
        referral_id=referral_id,
    )


@router.get("/{patient_id}", response_model=list[VisitOut])
def list_visits(patient_id: int, db: Session = Depends(get_db)):
    """Fetch all visits for a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return db.query(Visit).filter(Visit.patient_id == patient_id).order_by(Visit.visit_date.desc()).all()


@router.get("/detail/{visit_id}", response_model=VisitOut)
def get_visit(visit_id: int, db: Session = Depends(get_db)):
    """Fetch a specific visit."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return visit
