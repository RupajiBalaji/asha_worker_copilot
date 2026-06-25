from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


# ---------------- Patient ----------------
class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    phone: Optional[str] = None
    village: str
    address: Optional[str] = None
    is_pregnant: bool = False
    is_child: bool = False
    existing_diabetes: bool = False
    existing_hypertension: bool = False
    asha_worker_name: Optional[str] = None


class PatientUpdate(BaseModel):
    """All fields optional — PATCH semantics."""
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    village: Optional[str] = None
    address: Optional[str] = None
    is_pregnant: Optional[bool] = None
    is_child: Optional[bool] = None
    existing_diabetes: Optional[bool] = None
    existing_hypertension: Optional[bool] = None
    asha_worker_name: Optional[str] = None


class PatientOut(PatientCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ---------------- Stats ----------------
class StatsOut(BaseModel):
    total_patients: int
    critical_patients: int
    high_risk_patients: int
    pending_referrals: int
    upcoming_followups: int
    overdue_followups: int


# ---------------- Visit ----------------
class VisitCreate(BaseModel):
    patient_id: int

    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    blood_sugar_mg_dl: Optional[float] = None
    hemoglobin_g_dl: Optional[float] = None
    temperature_c: Optional[float] = None
    pulse_bpm: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None

    trimester: Optional[int] = None
    pregnancy_danger_signs: List[str] = Field(default_factory=list)

    child_age_months: Optional[int] = None
    muac_cm: Optional[float] = None
    diarrhea: bool = False

    symptoms: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class RiskFlagOut(BaseModel):
    category: str
    severity: str
    message: str


class VisitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    visit_date: datetime
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    blood_sugar_mg_dl: Optional[float] = None
    hemoglobin_g_dl: Optional[float] = None
    temperature_c: Optional[float] = None
    pulse_bpm: Optional[int] = None
    bmi: Optional[float] = None
    risk_level: Optional[str] = None
    risk_flags: List[RiskFlagOut] = Field(default_factory=list)
    ml_confidence: Optional[float] = None
    needs_referral: Optional[bool] = None
    notes: Optional[str] = None


class VisitAssessmentOut(BaseModel):
    visit: VisitOut
    rule_risk_level: str
    ml_risk_level: str
    ml_confidence: float
    class_probabilities: dict
    flags: List[RiskFlagOut]
    category_levels: dict
    needs_referral: bool
    referral_id: Optional[int] = None


# ---------------- Referral ----------------
class ReferralCreate(BaseModel):
    visit_id: int
    facility_name: str


class ReferralOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    visit_id: int
    facility_name: str
    reason_summary: str
    risk_level: str
    pdf_filename: Optional[str] = None
    status: str
    created_at: datetime


# ---------------- FollowUp ----------------
class FollowUpCreate(BaseModel):
    patient_id: int
    visit_id: Optional[int] = None
    type: str
    due_date: datetime
    notes: Optional[str] = None


class FollowUpOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    visit_id: Optional[int] = None
    type: str
    due_date: datetime
    notes: Optional[str] = None
    status: str


class FollowUpStatusUpdate(BaseModel):
    status: str
