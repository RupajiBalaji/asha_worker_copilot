"""
Seed script - populates the ASHA Co-pilot SQLite database with
~150 patients, ~300 visits, referrals and follow-ups.

Usage (run from the `backend/` directory):
    python seed_data.py
"""

import random
import sys
import os
from datetime import datetime, timedelta

# Allow `from app.xxx import ...` even when run directly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.db_models import Patient, Visit, Referral, FollowUp

FIRST_NAMES = [
    "Priya", "Anita", "Sunita", "Kavitha", "Rekha", "Lalitha", "Meena",
    "Saroja", "Geetha", "Radha", "Bhavani", "Nirmala", "Usha", "Vijaya",
    "Shanthi", "Padma", "Indira", "Kamala", "Pushpa", "Savitha",
    "Ramesh", "Suresh", "Mahesh", "Rajesh", "Ganesh", "Dinesh", "Naresh",
    "Venkat", "Kumar", "Srinivas", "Raju", "Mohan", "Prakash", "Santosh",
    "Ashok", "Vikram", "Arjun", "Karthik", "Arun", "Balan",
    "Fatima", "Ayesha", "Noor", "Zainab", "Rukhsar", "Sajida", "Mariam",
    "Lakshmi", "Saraswathi", "Devaki", "Mythili", "Supriya", "Deepa",
    "Chandra", "Vani", "Hema", "Sumathi", "Malathi", "Janaki", "Rohini",
]

LAST_NAMES = [
    "Devi", "Kumari", "Bai", "Amma", "Reddy", "Naidu", "Rao", "Kumar",
    "Patel", "Singh", "Sharma", "Pillai", "Nair", "Menon", "Iyer",
    "Krishnan", "Murthy", "Prasad", "Das", "Verma",
]

VILLAGES = [
    "Nandipuram", "Krishnapuram", "Ramnagar", "Sundarbagh", "Kotagiri",
    "Palani", "Vadapalani", "Velachery", "Tambaram", "Poonamallee",
    "Sriperumbudur", "Kancheepuram", "Thiruvalluvar Nagar", "Avadi",
    "Tiruvottiyur", "Chromepet", "Perungalathur", "Guduvanchery",
    "Maraimalai Nagar", "Urapakkam",
]

ASHA_WORKERS = [
    "Asha Devi", "Lakshmi R", "Meena Kumari", "Radha Bai",
    "Sunita Patel", "Pushpa Singh", "Kavitha Nair", "Geetha Pillai",
]

FACILITIES = [
    "PHC Nandipuram", "CHC Krishnapuram", "District Hospital Palani",
    "Government Hospital Kancheepuram", "Taluk Hospital Tambaram",
    "PHC Velachery", "CHC Avadi", "JIPMER Pondicherry",
]

SYMPTOMS_POOL = [
    "headache", "fever", "fatigue", "nausea", "vomiting", "dizziness",
    "chest_pain", "breathlessness", "swelling_feet", "back_pain",
    "abdominal_pain", "blurred_vision", "loss_of_appetite", "cough",
    "body_ache", "weakness",
]

PREGNANCY_DANGER_SIGNS = [
    "severe_headache", "blurred_vision", "swelling_face_hands",
    "reduced_fetal_movement", "vaginal_bleeding", "convulsions",
]

FOLLOWUP_TYPES = [
    "medication_reminder", "anc_checkup", "growth_monitoring", "general_checkup",
]

FOLLOWUP_NOTES_POOL = [
    "Remind patient to take iron tablets",
    "Check BP at next visit",
    "Weigh child and update growth chart",
    "Follow up on referral status",
    "Ensure ANC card is updated",
    "Check immunization schedule",
    "Counsel on nutrition",
    "Remind about hand hygiene",
    "Schedule next home visit",
    "Discuss family planning",
]

NOW = datetime.utcnow()


def rand_date(days_back_max=180, days_back_min=1):
    delta = random.randint(days_back_min, days_back_max)
    return NOW - timedelta(days=delta)


def rand_future(days_ahead_min=1, days_ahead_max=60):
    delta = random.randint(days_ahead_min, days_ahead_max)
    return NOW + timedelta(days=delta)


def rand_past(days_back_min=1, days_back_max=30):
    delta = random.randint(days_back_min, days_back_max)
    return NOW - timedelta(days=delta)


def make_patient_data():
    gender = random.choices(["female", "male"], weights=[65, 35])[0]
    age = random.randint(16, 70)
    is_child = age < 5
    is_pregnant = gender == "female" and not is_child and age < 45 and random.random() < 0.35
    name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    phone = f"9{random.randint(100000000, 999999999)}"
    village = random.choice(VILLAGES)
    return dict(
        name=name,
        age=age,
        gender=gender,
        phone=phone,
        village=village,
        address=f"No. {random.randint(1, 200)}, {village}",
        is_pregnant=is_pregnant,
        is_child=is_child,
        existing_diabetes=random.random() < 0.12,
        existing_hypertension=random.random() < 0.15,
        asha_worker_name=random.choice(ASHA_WORKERS),
        created_at=rand_date(days_back_max=365, days_back_min=30),
    )


def make_vitals(patient):
    risk_scenario = random.choices(
        ["normal", "borderline", "high", "critical"],
        weights=[45, 30, 15, 10],
    )[0]

    if risk_scenario == "normal":
        sys_bp = random.randint(100, 130)
        dia_bp = random.randint(65, 85)
    elif risk_scenario == "borderline":
        sys_bp = random.randint(130, 145)
        dia_bp = random.randint(85, 95)
    elif risk_scenario == "high":
        sys_bp = random.randint(145, 170)
        dia_bp = random.randint(95, 110)
    else:
        sys_bp = random.randint(170, 210)
        dia_bp = random.randint(110, 130)

    if patient.existing_diabetes or risk_scenario in ("high", "critical"):
        blood_sugar = round(random.uniform(180, 380), 1)
    elif risk_scenario == "borderline":
        blood_sugar = round(random.uniform(110, 180), 1)
    else:
        blood_sugar = round(random.uniform(70, 110), 1)

    if patient.is_pregnant:
        hemoglobin = round(random.uniform(7.0, 12.5), 1)
    elif risk_scenario in ("high", "critical"):
        hemoglobin = round(random.uniform(6.0, 9.5), 1)
    else:
        hemoglobin = round(random.uniform(10.0, 15.5), 1)

    weight = round(random.uniform(35, 95), 1)
    height = round(random.uniform(145, 175), 1)
    bmi = round(weight / ((height / 100) ** 2), 1)

    return dict(
        systolic_bp=sys_bp,
        diastolic_bp=dia_bp,
        blood_sugar_mg_dl=blood_sugar,
        hemoglobin_g_dl=hemoglobin,
        temperature_c=round(random.uniform(36.0, 39.5), 1),
        pulse_bpm=random.randint(58, 115),
        weight_kg=weight,
        height_cm=height,
        bmi=bmi,
        _scenario=risk_scenario,
    )


def assess_risk(vitals, patient, symptoms):
    flags = []
    score = 0
    sys_bp = vitals["systolic_bp"]
    dia_bp = vitals["diastolic_bp"]
    sugar = vitals["blood_sugar_mg_dl"]
    hb = vitals["hemoglobin_g_dl"]

    if sys_bp >= 180 or dia_bp >= 110:
        flags.append({"category": "BP", "severity": "critical", "message": "Hypertensive crisis"})
        score += 4
    elif sys_bp >= 160 or dia_bp >= 100:
        flags.append({"category": "BP", "severity": "high", "message": "Stage 2 hypertension"})
        score += 3
    elif sys_bp >= 140 or dia_bp >= 90:
        flags.append({"category": "BP", "severity": "moderate", "message": "Stage 1 hypertension"})
        score += 2

    if sugar >= 300:
        flags.append({"category": "Blood Sugar", "severity": "critical", "message": "Dangerously high blood sugar"})
        score += 4
    elif sugar >= 200:
        flags.append({"category": "Blood Sugar", "severity": "high", "message": "Uncontrolled diabetes"})
        score += 2
    elif sugar >= 140:
        flags.append({"category": "Blood Sugar", "severity": "moderate", "message": "Elevated blood sugar"})
        score += 1

    if hb < 7:
        flags.append({"category": "Hemoglobin", "severity": "critical", "message": "Severe anaemia"})
        score += 4
    elif hb < 9:
        flags.append({"category": "Hemoglobin", "severity": "high", "message": "Moderate anaemia"})
        score += 2
    elif hb < 11:
        flags.append({"category": "Hemoglobin", "severity": "moderate", "message": "Mild anaemia"})
        score += 1

    if "chest_pain" in symptoms:
        flags.append({"category": "Symptoms", "severity": "high", "message": "Chest pain reported"})
        score += 3
    if "breathlessness" in symptoms:
        flags.append({"category": "Symptoms", "severity": "moderate", "message": "Breathlessness reported"})
        score += 2

    if score >= 6:
        risk_level = "critical"
    elif score >= 3:
        risk_level = "high"
    elif score >= 1:
        risk_level = "moderate"
    else:
        risk_level = "low"

    confidence = round(random.uniform(0.72, 0.98), 2)
    return risk_level, flags, confidence


def make_visit(patient, visit_date):
    vitals = make_vitals(patient)
    scenario = vitals.pop("_scenario")
    symptoms = random.sample(SYMPTOMS_POOL, k=random.randint(0, 4))

    trimester = None
    pregnancy_danger_signs = []
    if patient.is_pregnant:
        trimester = random.choice([1, 2, 3])
        if scenario in ("high", "critical"):
            pregnancy_danger_signs = random.sample(PREGNANCY_DANGER_SIGNS, k=random.randint(1, 3))

    child_age_months = None
    muac_cm = None
    diarrhea = False
    if patient.is_child:
        child_age_months = random.randint(0, 59)
        muac_cm = round(random.uniform(10.5, 16.0), 1)
        diarrhea = random.random() < 0.2

    risk_level, risk_flags, confidence = assess_risk(vitals, patient, symptoms)
    needs_referral = risk_level in ("critical", "high") and random.random() < 0.7

    notes_options = [
        "Patient cooperative, all vitals recorded.",
        "Patient complained of fatigue since last week.",
        "Follow-up visit; improvement noted.",
        "First visit to this patient.",
        "Patient lives alone; social support needed.",
        "Advised bed rest and hydration.",
        "Iron and folic acid tablets provided.",
        "Counselled on diet and exercise.",
        "Patient expressed concerns about hospital visit.",
        "Referral discussed with patient and family.",
    ]

    return dict(
        patient_id=patient.id,
        visit_date=visit_date,
        **vitals,
        trimester=trimester,
        pregnancy_danger_signs=pregnancy_danger_signs,
        child_age_months=child_age_months,
        muac_cm=muac_cm,
        diarrhea=diarrhea,
        symptoms=symptoms,
        notes=random.choice(notes_options),
        risk_level=risk_level,
        risk_flags=risk_flags,
        ml_confidence=confidence,
        needs_referral=needs_referral,
    )


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("Clearing existing data ...")
    db.query(FollowUp).delete()
    db.query(Referral).delete()
    db.query(Visit).delete()
    db.query(Patient).delete()
    db.commit()

    print("Seeding 150 patients ...")
    for i in range(150):
        data = make_patient_data()
        p = Patient(**data)
        db.add(p)
    db.commit()

    patients = db.query(Patient).all()
    print(f"  -> {len(patients)} patients created")

    print("Seeding visits (1-3 per patient) ...")
    for patient in patients:
        num_visits = random.randint(1, 3)
        visit_dates = sorted(
            [rand_date(days_back_max=150, days_back_min=1) for _ in range(num_visits)]
        )
        for vdate in visit_dates:
            vdata = make_visit(patient, vdate)
            v = Visit(**vdata)
            db.add(v)
            db.flush()
    db.commit()

    visits_all = db.query(Visit).all()
    print(f"  -> {len(visits_all)} visits created")

    print("Seeding referrals ...")
    referral_count = 0
    for v in visits_all:
        if v.needs_referral:
            flag_msgs = ", ".join(f["message"] for f in (v.risk_flags or [])[:2])
            r = Referral(
                patient_id=v.patient_id,
                visit_id=v.id,
                facility_name=random.choice(FACILITIES),
                reason_summary=f"Patient flagged as {v.risk_level} risk. {flag_msgs or 'Multiple risk indicators detected.'}",
                risk_level=v.risk_level,
                pdf_filename=None,
                status=random.choices(
                    ["pending", "acknowledged", "completed"],
                    weights=[50, 30, 20],
                )[0],
                created_at=v.visit_date + timedelta(hours=random.randint(1, 6)),
            )
            db.add(r)
            referral_count += 1
    db.commit()
    print(f"  -> {referral_count} referrals created")

    print("Seeding follow-ups ...")
    followup_count = 0
    for patient in patients:
        num_followups = random.randint(1, 3)
        for _ in range(num_followups):
            ftype = random.choice(FOLLOWUP_TYPES)
            status_choice = random.choices(
                ["upcoming_future", "upcoming_overdue", "done", "missed"],
                weights=[35, 20, 30, 15],
            )[0]

            if status_choice == "upcoming_future":
                due_date = rand_future(days_ahead_min=1, days_ahead_max=45)
                status = "upcoming"
            elif status_choice == "upcoming_overdue":
                due_date = rand_past(days_back_min=1, days_back_max=20)
                status = "upcoming"
            elif status_choice == "done":
                due_date = rand_past(days_back_min=5, days_back_max=60)
                status = "done"
            else:
                due_date = rand_past(days_back_min=3, days_back_max=45)
                status = "missed"

            fu = FollowUp(
                patient_id=patient.id,
                visit_id=None,
                type=ftype,
                due_date=due_date,
                notes=random.choice(FOLLOWUP_NOTES_POOL),
                status=status,
            )
            db.add(fu)
            followup_count += 1
    db.commit()
    print(f"  -> {followup_count} follow-ups created")

    db.close()
    print("\n? Seeding complete!")
    print(f"   Patients  : {len(patients)}")
    print(f"   Visits    : {len(visits_all)}")
    print(f"   Referrals : {referral_count}")
    print(f"   Follow-ups: {followup_count}")


if __name__ == "__main__":
    seed()
