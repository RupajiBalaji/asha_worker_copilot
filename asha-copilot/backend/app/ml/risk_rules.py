"""
risk_rules.py
--------------
Deterministic, explainable clinical rule engine.

Why rules AND a ML model?
In healthcare, a pure black-box ML score is dangerous: a false negative on a
danger sign (e.g. a pregnant woman with severe bleeding) cannot be tolerated
just because a model under-weighted it. So this engine encodes simplified,
clinically-informed thresholds (inspired by WHO / ICMR ANC & IMNCI guidance)
as hard rules that ALWAYS fire regardless of what the ML model thinks.

The ML model (see ml/predict.py) is layered on top to produce a continuous
risk score used for triage *ordering* among patients who aren't already
flagged critical by a rule.

DISCLAIMER: Thresholds here are simplified for demonstration purposes and
are NOT a substitute for validated clinical protocols. A real deployment
would need clinical review, validation against ICMR/CDSCO guidelines, and
sign-off from a medical advisory board before use in the field.
"""

from typing import Dict, List, Any

RISK_LEVELS = ["low", "medium", "high", "critical"]


def _level_rank(level: str) -> int:
    return RISK_LEVELS.index(level)


def _max_level(a: str, b: str) -> str:
    return a if _level_rank(a) >= _level_rank(b) else b


def evaluate_vitals(v: Dict[str, Any]) -> Dict[str, Any]:
    """
    v is a dict of raw visit fields (see schemas.VisitCreate for the full list).
    Returns: {
        "rule_risk_level": "low|medium|high|critical",
        "flags": [ {category, severity, message}, ... ],
        "category_levels": {category: level}
    }
    """
    flags: List[Dict[str, str]] = []
    category_levels: Dict[str, str] = {}
    overall = "low"

    def flag(category: str, severity: str, message: str):
        nonlocal overall
        flags.append({"category": category, "severity": severity, "message": message})
        category_levels[category] = _max_level(category_levels.get(category, "low"), severity)
        overall = _max_level(overall, severity)

    age = v.get("age")
    systolic = v.get("systolic_bp")
    diastolic = v.get("diastolic_bp")
    blood_sugar = v.get("blood_sugar_mg_dl")
    hemoglobin = v.get("hemoglobin_g_dl")
    temp = v.get("temperature_c")
    pulse = v.get("pulse_bpm")
    bmi = v.get("bmi")

    existing_diabetes = v.get("existing_diabetes", False)
    existing_hypertension = v.get("existing_hypertension", False)

    is_pregnant = v.get("is_pregnant", False)
    trimester = v.get("trimester")
    danger_signs = v.get("pregnancy_danger_signs", []) or []

    is_child = v.get("is_child", False)
    child_age_months = v.get("child_age_months")
    muac_cm = v.get("muac_cm")
    diarrhea = v.get("diarrhea", False)

    # ---------------- Blood pressure ----------------
    if systolic is not None and diastolic is not None:
        if systolic >= 160 or diastolic >= 110:
            flag("hypertension", "critical",
                 f"Severe hypertension (BP {systolic}/{diastolic} mmHg) — needs urgent medical attention")
        elif systolic >= 140 or diastolic >= 90:
            flag("hypertension", "high",
                 f"Elevated blood pressure (BP {systolic}/{diastolic} mmHg)")
        elif systolic < 90 or diastolic < 60:
            flag("hypotension", "medium",
                 f"Low blood pressure (BP {systolic}/{diastolic} mmHg)")

    # ---------------- Blood sugar ----------------
    if blood_sugar is not None:
        if blood_sugar >= 250 or (existing_diabetes and blood_sugar >= 220):
            flag("diabetes", "critical",
                 f"Very high blood sugar ({blood_sugar} mg/dL) — risk of hyperglycemic emergency")
        elif blood_sugar >= 200:
            flag("diabetes", "high", f"High blood sugar ({blood_sugar} mg/dL)")
        elif blood_sugar >= 140:
            flag("diabetes", "medium", f"Borderline/pre-diabetic blood sugar ({blood_sugar} mg/dL)")
        elif blood_sugar < 70:
            flag("hypoglycemia", "high", f"Low blood sugar ({blood_sugar} mg/dL)")

    # ---------------- Anemia ----------------
    if hemoglobin is not None:
        if hemoglobin < 7:
            flag("anemia", "critical", f"Severe anemia (Hb {hemoglobin} g/dL) — needs referral")
        elif hemoglobin < 9:
            flag("anemia", "high", f"Moderate anemia (Hb {hemoglobin} g/dL)")
        elif hemoglobin < 11:
            flag("anemia", "medium", f"Mild anemia (Hb {hemoglobin} g/dL)")

    # ---------------- Fever / temperature ----------------
    if temp is not None:
        if temp >= 40:
            flag("fever", "critical", f"Very high fever ({temp}°C)")
        elif temp >= 38.5:
            flag("fever", "medium", f"Fever ({temp}°C)")

    # ---------------- Pulse ----------------
    if pulse is not None:
        if pulse >= 130 or pulse <= 40:
            flag("pulse", "high", f"Abnormal pulse rate ({pulse} bpm)")

    # ---------------- Pregnancy ----------------
    if is_pregnant:
        danger_sign_messages = {
            "bleeding": "Vaginal bleeding",
            "severe_headache": "Severe headache / blurred vision (possible pre-eclampsia)",
            "reduced_fetal_movement": "Reduced fetal movement",
            "high_fever": "High fever during pregnancy",
            "convulsions": "Convulsions / fits",
            "severe_abdominal_pain": "Severe abdominal pain",
            "swelling": "Sudden swelling of face/hands/feet",
        }
        for sign in danger_signs:
            msg = danger_sign_messages.get(sign, sign)
            flag("pregnancy", "critical", f"ANC danger sign: {msg} — refer to PHC/hospital immediately")

        if trimester == 3 and not danger_signs:
            flag("pregnancy", "medium", "Third trimester — schedule frequent ANC follow-up")

    # ---------------- Child malnutrition ----------------
    if is_child:
        if muac_cm is not None:
            if muac_cm < 11.5:
                flag("malnutrition", "critical",
                     f"Severe Acute Malnutrition (MUAC {muac_cm} cm) — urgent referral required")
            elif muac_cm < 12.5:
                flag("malnutrition", "high",
                     f"Moderate Acute Malnutrition (MUAC {muac_cm} cm)")
        if diarrhea:
            flag("child_illness", "medium", "Diarrhea reported — monitor for dehydration")
        if child_age_months is not None and temp is not None and temp >= 38.5 and child_age_months < 6:
            flag("child_illness", "high", "Fever in infant under 6 months — needs prompt evaluation")

    # ---------------- Elderly ----------------
    if age is not None and age >= 60:
        comorbidities = sum([bool(existing_diabetes), bool(existing_hypertension)])
        if comorbidities >= 1 and (overall == "low" or overall == "medium"):
            flag("elderly", "medium", "Elderly patient with existing chronic condition — routine monitoring advised")

    # ---------------- BMI ----------------
    if bmi is not None:
        if bmi < 16:
            flag("nutrition", "high", f"Severely underweight (BMI {bmi})")
        elif bmi < 18.5:
            flag("nutrition", "medium", f"Underweight (BMI {bmi})")
        elif bmi >= 30:
            flag("nutrition", "medium", f"Obese (BMI {bmi}) — counsel on diet/lifestyle")

    return {
        "rule_risk_level": overall,
        "flags": flags,
        "category_levels": category_levels,
    }
