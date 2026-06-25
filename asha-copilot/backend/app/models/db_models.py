from sqlalchemy import (
    Column, Integer, String, Float, Boolean, ForeignKey, DateTime, JSON, Text
)
from sqlalchemy.orm import relationship
from datetime import datetime, date as date_cls

from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)  # male / female / other
    phone = Column(String, nullable=True)
    village = Column(String, nullable=False)
    address = Column(String, nullable=True)

    is_pregnant = Column(Boolean, default=False)
    is_child = Column(Boolean, default=False)
    existing_diabetes = Column(Boolean, default=False)
    existing_hypertension = Column(Boolean, default=False)

    asha_worker_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    referrals = relationship("Referral", back_populates="patient", cascade="all, delete-orphan")
    followups = relationship("FollowUp", back_populates="patient", cascade="all, delete-orphan")


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    visit_date = Column(DateTime, default=datetime.utcnow)

    # Vitals
    systolic_bp = Column(Integer, nullable=True)
    diastolic_bp = Column(Integer, nullable=True)
    blood_sugar_mg_dl = Column(Float, nullable=True)
    hemoglobin_g_dl = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    pulse_bpm = Column(Integer, nullable=True)
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    bmi = Column(Float, nullable=True)

    # Pregnancy
    trimester = Column(Integer, nullable=True)
    pregnancy_danger_signs = Column(JSON, default=list)

    # Child
    child_age_months = Column(Integer, nullable=True)
    muac_cm = Column(Float, nullable=True)
    diarrhea = Column(Boolean, default=False)

    symptoms = Column(JSON, default=list)
    notes = Column(Text, nullable=True)

    # Stored assessment result (denormalized for fast querying)
    risk_level = Column(String, nullable=True)
    risk_flags = Column(JSON, default=list)
    ml_confidence = Column(Float, nullable=True)
    needs_referral = Column(Boolean, default=False)

    patient = relationship("Patient", back_populates="visits")
    referral = relationship("Referral", back_populates="visit", uselist=False)


class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=False)

    facility_name = Column(String, nullable=False)
    reason_summary = Column(Text, nullable=False)
    risk_level = Column(String, nullable=False)
    pdf_filename = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending / acknowledged / completed
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="referrals")
    visit = relationship("Visit", back_populates="referral")


class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=True)

    type = Column(String, nullable=False)  # medication_reminder / anc_checkup / growth_monitoring / general_checkup
    due_date = Column(DateTime, nullable=False)
    notes = Column(String, nullable=True)
    status = Column(String, default="upcoming")  # upcoming / done / missed

    patient = relationship("Patient", back_populates="followups")
