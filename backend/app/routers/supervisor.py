from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models.db_models import Patient, Visit, Referral, FollowUp

router = APIRouter(prefix="/supervisor", tags=["supervisor"])

# Predefined Static Profiles (ASHA Workers 1, 2, 3 + PHC Manager)
STATIC_PROFILES = [
    {
        "id": "asha1",
        "username": "asha1",
        "password": "asha123",
        "name": "Asha Devi",
        "role": "asha_worker",
        "worker_label": "ASHA Worker 1",
        "worker_id": "ASHA-101",
        "village": "Palani",
        "phc": "PHC Nandipuram",
        "phone": "+91 98765 43210",
        "experience": "4 years",
        "monthly_target_visits": 35,
        "avatar": "👩🏽‍⚕️",
        "bio": "Senior ASHA community health worker covering Palani village cluster. Specializes in maternal & child health, ANC tracking, and immunization.",
    },
    {
        "id": "asha2",
        "username": "asha2",
        "password": "asha123",
        "name": "Lakshmi R",
        "role": "asha_worker",
        "worker_label": "ASHA Worker 2",
        "worker_id": "ASHA-102",
        "village": "Vadapalani",
        "phc": "PHC Velachery",
        "phone": "+91 98765 43211",
        "experience": "3 years",
        "monthly_target_visits": 35,
        "avatar": "👩🏾‍⚕️",
        "bio": "Field worker for Vadapalani. Focuses on high-risk pregnancy screening, adolescent health, and elderly chronic care.",
    },
    {
        "id": "asha3",
        "username": "asha3",
        "password": "asha123",
        "name": "Meena Kumari",
        "role": "asha_worker",
        "worker_label": "ASHA Worker 3",
        "worker_id": "ASHA-103",
        "village": "Kancheepuram",
        "phc": "Government Hospital Kancheepuram",
        "phone": "+91 98765 43212",
        "experience": "5 years",
        "monthly_target_visits": 30,
        "avatar": "👩🏻‍⚕️",
        "bio": "Community health volunteer covering Kancheepuram rural hamlets. Active in malnutrition checks and door-to-door NCD surveillance.",
    },
    {
        "id": "manager",
        "username": "manager",
        "password": "admin123",
        "name": "Dr. Rajesh Sharma",
        "role": "manager",
        "worker_label": "PHC Medical Officer & Block Health Supervisor",
        "worker_id": "MOIC-501",
        "village": "All Block Sectors (HQ)",
        "phc": "Block Primary Health Centre (HQ)",
        "phone": "+91 98765 40001",
        "email": "dr.rajesh.phc@health.gov.in",
        "experience": "12 years",
        "designation": "Medical Officer In-Charge (MOIC)",
        "monthly_target_visits": 0,
        "avatar": "👨🏽‍⚕️",
        "bio": "Oversees community health operations, monitors frontline ASHA worker clinical entries, reviews referrals, and evaluates block-level healthcare efficiency.",
    },
]


@router.get("/profiles")
def get_profiles():
    """Return list of available static demo profiles for easy switcher UI."""
    return [
        {
            **p,
            "demo_password": p["password"],
        }
        for p in STATIC_PROFILES
    ]


@router.post("/login")
def login(credentials: Dict[str, str]):
    """Authenticate a static worker or manager user."""
    username = (credentials.get("username") or "").strip().lower()
    password = (credentials.get("password") or "").strip()

    profile = next(
        (p for p in STATIC_PROFILES if p["username"].lower() == username and p["password"] == password),
        None
    )
    if not profile:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password. Use asha1/asha123, asha2/asha123, asha3/asha123, or manager/admin123."
        )

    safe_profile = {k: v for k, v in profile.items() if k != "password"}
    return {
        "status": "success",
        "user": safe_profile,
        "token": f"demo-token-{profile['id']}",
    }


@router.get("/efficiency")
def get_efficiency_report(db: Session = Depends(get_db)):
    """
    Comprehensive Manager / Supervisor Report:
    - Overall Frontline Healthcare Metrics
    - Worker-by-worker efficiency scorecards and leaderboard
    - Live chronological activity audit feed of entries made by ASHA workers
    """
    now = datetime.utcnow()

    # 1. Gather all distinct ASHA worker names recorded in DB
    db_worker_rows = db.query(Patient.asha_worker_name).distinct().all()
    db_worker_names = [r[0] for r in db_worker_rows if r[0]]

    # Ensure our 3 primary static workers appear at the top
    priority_names = ["Asha Devi", "Lakshmi R", "Meena Kumari"]
    all_workers = priority_names + [w for w in db_worker_names if w not in priority_names]

    worker_meta_map = {
        "Asha Devi": {"id": "ASHA-101", "label": "ASHA Worker 1", "village": "Palani", "phc": "PHC Nandipuram", "target": 35, "avatar": "👩🏽‍⚕️"},
        "Lakshmi R": {"id": "ASHA-102", "label": "ASHA Worker 2", "village": "Vadapalani", "phc": "PHC Velachery", "target": 35, "avatar": "👩🏾‍⚕️"},
        "Meena Kumari": {"id": "ASHA-103", "label": "ASHA Worker 3", "village": "Kancheepuram", "phc": "GH Kancheepuram", "target": 30, "avatar": "👩🏻‍⚕️"},
        "Sunita Patel": {"id": "ASHA-104", "label": "ASHA Worker 4", "village": "Tambaram", "phc": "Taluk Hospital Tambaram", "target": 35, "avatar": "👩🏽‍⚕️"},
        "Radha Bai": {"id": "ASHA-105", "label": "ASHA Worker 5", "village": "Sriperumbudur", "phc": "CHC Krishnapuram", "target": 35, "avatar": "👩🏾‍⚕️"},
        "Kavitha Nair": {"id": "ASHA-106", "label": "ASHA Worker 6", "village": "Avadi", "phc": "CHC Avadi", "target": 35, "avatar": "👩🏻‍⚕️"},
        "Pushpa Singh": {"id": "ASHA-107", "label": "ASHA Worker 7", "village": "Tiruvottiyur", "phc": "PHC Nandipuram", "target": 35, "avatar": "👩🏽‍⚕️"},
        "Geetha Pillai": {"id": "ASHA-108", "label": "ASHA Worker 8", "village": "Chromepet", "phc": "PHC Velachery", "target": 35, "avatar": "👩🏾‍⚕️"},
    }

    worker_stats_list = []
    total_patients_all = 0
    total_visits_all = 0
    total_critical_all = 0
    total_high_all = 0
    total_fu_done_all = 0
    total_fu_overdue_all = 0

    for worker_name in all_workers:
        pts_count = db.query(Patient).filter(Patient.asha_worker_name == worker_name).count()
        if pts_count == 0 and worker_name not in priority_names:
            continue

        # Visits query
        v_query = db.query(Visit).join(Patient, Visit.patient_id == Patient.id).filter(Patient.asha_worker_name == worker_name)
        visits_count = v_query.count()
        crit_count = v_query.filter(Visit.risk_level == "critical").count()
        high_count = v_query.filter(Visit.risk_level == "high").count()

        # Referrals query
        ref_count = db.query(Referral).join(Patient, Referral.patient_id == Patient.id).filter(Patient.asha_worker_name == worker_name).count()

        # Follow-ups query
        fu_query = db.query(FollowUp).join(Patient, FollowUp.patient_id == Patient.id).filter(Patient.asha_worker_name == worker_name)
        fu_total = fu_query.count()
        fu_done = fu_query.filter(FollowUp.status == "done").count()
        fu_overdue = fu_query.filter(
            ((FollowUp.status == "upcoming") & (FollowUp.due_date < now)) | (FollowUp.status == "missed")
        ).count()
        fu_upcoming = fu_query.filter(
            (FollowUp.status == "upcoming") & (FollowUp.due_date >= now)
        ).count()

        meta = worker_meta_map.get(worker_name, {
            "id": f"ASHA-{abs(hash(worker_name)) % 900 + 100}",
            "label": "ASHA Field Worker",
            "village": "Community Sector",
            "phc": "Block Health Centre",
            "target": 30,
            "avatar": "👩🏽‍⚕️"
        })

        target_visits = meta.get("target", 30)
        target_pct = min(round((visits_count / target_visits) * 100, 1), 100.0) if target_visits > 0 else 100.0

        # Compliance rate
        fu_evaluated = fu_done + fu_overdue
        compliance_rate = round((fu_done / fu_evaluated) * 100, 1) if fu_evaluated > 0 else 85.0

        # Composite efficiency score:
        # 40% Target Visits progress + 40% Follow-up compliance + 20% Clinical Engagement
        clinical_engagement = min(round((visits_count / max(pts_count, 1)) * 50, 1), 100.0)
        efficiency_score = round((0.40 * target_pct) + (0.40 * compliance_rate) + (0.20 * clinical_engagement), 1)
        efficiency_score = min(max(efficiency_score, 0.0), 100.0)

        if efficiency_score >= 80.0:
            grade = "Excellent"
            badge_color = "#16a34a" # green
        elif efficiency_score >= 65.0:
            grade = "Good"
            badge_color = "#2563eb" # blue
        else:
            grade = "Needs Attention"
            badge_color = "#ea580c" # amber/orange

        # Latest visit or registration timestamp
        latest_visit = v_query.order_by(desc(Visit.visit_date)).first()
        last_active_str = latest_visit.visit_date.strftime("%d %b %Y, %I:%M %p") if latest_visit else "Active this week"

        worker_stats_list.append({
            "name": worker_name,
            "worker_id": meta["id"],
            "label": meta["label"],
            "village": meta["village"],
            "phc": meta["phc"],
            "avatar": meta["avatar"],
            "patients_registered": pts_count,
            "visits_completed": visits_count,
            "critical_cases": crit_count,
            "high_risk_cases": high_count,
            "total_high_risk": crit_count + high_count,
            "referrals_generated": ref_count,
            "followups_total": fu_total,
            "followups_done": fu_done,
            "followups_overdue": fu_overdue,
            "followups_upcoming": fu_upcoming,
            "compliance_rate": compliance_rate,
            "target_visits": target_visits,
            "target_progress_pct": target_pct,
            "efficiency_score": efficiency_score,
            "efficiency_grade": grade,
            "badge_color": badge_color,
            "last_active": last_active_str,
        })

        total_patients_all += pts_count
        total_visits_all += visits_count
        total_critical_all += crit_count
        total_high_all += high_count
        total_fu_done_all += fu_done
        total_fu_overdue_all += fu_overdue

    # Sort workers by efficiency score descending
    worker_stats_list.sort(key=lambda w: w["efficiency_score"], reverse=True)

    # 2. Activity Audit Log (latest 40 entries made across workers)
    recent_visits = (
        db.query(Visit)
        .join(Patient, Visit.patient_id == Patient.id)
        .order_by(desc(Visit.visit_date))
        .limit(30)
        .all()
    )

    activity_log = []
    for v in recent_visits:
        p = v.patient
        activity_log.append({
            "id": f"visit-{v.id}",
            "type": "visit",
            "timestamp": v.visit_date.strftime("%d %b %Y, %I:%M %p") if v.visit_date else "Recent",
            "worker_name": p.asha_worker_name or "ASHA Worker",
            "patient_name": p.name,
            "patient_id": p.id,
            "patient_age": p.age,
            "patient_gender": p.gender,
            "village": p.village,
            "risk_level": v.risk_level or "low",
            "findings": f"BP: {v.systolic_bp or '—'}/{v.diastolic_bp or '—'} mmHg | Sugar: {v.blood_sugar_mg_dl or '—'} mg/dL | Hb: {v.hemoglobin_g_dl or '—'} g/dL",
            "needs_referral": v.needs_referral,
        })

    # Also add some recent patient registrations to activity log
    recent_pts = (
        db.query(Patient)
        .order_by(desc(Patient.created_at))
        .limit(15)
        .all()
    )
    for p in recent_pts:
        activity_log.append({
            "id": f"reg-{p.id}",
            "type": "registration",
            "timestamp": p.created_at.strftime("%d %b %Y, %I:%M %p") if p.created_at else "Recent",
            "worker_name": p.asha_worker_name or "ASHA Worker",
            "patient_name": p.name,
            "patient_id": p.id,
            "patient_age": p.age,
            "patient_gender": p.gender,
            "village": p.village,
            "risk_level": "info",
            "findings": f"Registered new patient ({p.age}y {p.gender}) in {p.village}" + (" [Pregnant]" if p.is_pregnant else "") + (" [Child <5]" if p.is_child else ""),
            "needs_referral": False,
        })

    # Overall compliance
    fu_total_eval = total_fu_done_all + total_fu_overdue_all
    overall_compliance = round((total_fu_done_all / fu_total_eval * 100), 1) if fu_total_eval > 0 else 85.0
    overall_avg_efficiency = round(sum(w["efficiency_score"] for w in worker_stats_list) / max(len(worker_stats_list), 1), 1)

    return {
        "summary": {
            "total_workers": len(worker_stats_list),
            "total_patients": total_patients_all,
            "total_visits": total_visits_all,
            "critical_cases": total_critical_all,
            "high_risk_cases": total_high_all,
            "total_escalations": total_critical_all + total_high_all,
            "followups_completed": total_fu_done_all,
            "followups_overdue": total_fu_overdue_all,
            "overall_compliance_rate": overall_compliance,
            "average_efficiency_score": overall_avg_efficiency,
            "active_block": "Nandipuram Health Block",
            "evaluation_date": now.strftime("%d %B %Y"),
        },
        "workers": worker_stats_list,
        "activity_log": activity_log,
    }


@router.get("/worker/{worker_name}/activity")
def get_worker_detail(worker_name: str, db: Session = Depends(get_db)):
    """Get detailed activity audit for an individual ASHA worker."""
    patients = db.query(Patient).filter(Patient.asha_worker_name == worker_name).all()
    patient_ids = [p.id for p in patients]

    visits = (
        db.query(Visit)
        .filter(Visit.patient_id.in_(patient_ids))
        .order_by(desc(Visit.visit_date))
        .limit(25)
        .all()
    ) if patient_ids else []

    followups = (
        db.query(FollowUp)
        .filter(FollowUp.patient_id.in_(patient_ids))
        .order_by(FollowUp.due_date.asc())
        .all()
    ) if patient_ids else []

    return {
        "worker_name": worker_name,
        "total_patients": len(patients),
        "patients": [
            {
                "id": p.id,
                "name": p.name,
                "age": p.age,
                "gender": p.gender,
                "village": p.village,
                "is_pregnant": p.is_pregnant,
                "is_child": p.is_child,
            }
            for p in patients
        ],
        "recent_visits": [
            {
                "id": v.id,
                "patient_id": v.patient_id,
                "patient_name": next((p.name for p in patients if p.id == v.patient_id), "Unknown"),
                "visit_date": v.visit_date.strftime("%d %b %Y, %I:%M %p") if v.visit_date else "—",
                "risk_level": v.risk_level,
                "systolic_bp": v.systolic_bp,
                "diastolic_bp": v.diastolic_bp,
                "blood_sugar": v.blood_sugar_mg_dl,
                "hemoglobin": v.hemoglobin_g_dl,
                "needs_referral": v.needs_referral,
            }
            for v in visits
        ],
        "followups": [
            {
                "id": f.id,
                "patient_id": f.patient_id,
                "patient_name": next((p.name for p in patients if p.id == f.patient_id), "Unknown"),
                "type": f.type,
                "due_date": f.due_date.strftime("%d %b %Y") if f.due_date else "—",
                "status": f.status,
            }
            for f in followups
        ]
    }
