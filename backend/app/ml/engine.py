"""
engine.py — the single entry point the API calls to assess a visit.

Combines:
  1. risk_rules.evaluate_vitals()  -> explainable flags + a deterministic rule-based level
  2. predict.predict_risk()        -> ML model's continuous risk level + confidence

Final rule: the HIGHER (more severe) of the two levels wins. This means the
ML model can escalate a borderline case the rules didn't catch, but it can
NEVER downgrade a rule-based critical flag (e.g. an ANC danger sign).
This "rules cannot be overridden downward by ML" property is the key
safety guarantee of the hybrid design.
"""
from app.ml.risk_rules import evaluate_vitals, RISK_LEVELS, _max_level
from app.ml import predict as ml_predict


def _to_ml_features(v: dict) -> dict:
    bmi = v.get("bmi")
    return {
        "age": v.get("age", 0),
        "systolic_bp": v.get("systolic_bp", 120),
        "diastolic_bp": v.get("diastolic_bp", 80),
        "blood_sugar_mg_dl": v.get("blood_sugar_mg_dl", 100),
        "hemoglobin_g_dl": v.get("hemoglobin_g_dl", 12.5),
        "temperature_c": v.get("temperature_c", 37.0),
        "pulse_bpm": v.get("pulse_bpm", 80),
        "bmi": bmi if bmi is not None else 17.0,
        "existing_diabetes": int(v.get("existing_diabetes", False)),
        "existing_hypertension": int(v.get("existing_hypertension", False)),
        "is_pregnant": int(v.get("is_pregnant", False)),
        "trimester": v.get("trimester") or 0,
        "pregnancy_danger_signs_count": len(v.get("pregnancy_danger_signs", []) or []),
        "is_child": int(v.get("is_child", False)),
        "muac_cm": v.get("muac_cm") if v.get("muac_cm") is not None else 14.0,
        "diarrhea": int(v.get("diarrhea", False)),
    }


def assess(v: dict) -> dict:
    rule_result = evaluate_vitals(v)
    ml_features = _to_ml_features(v)

    # Defensive: if the ML model isn't trained or fails to load, fall back to
    # rule-only output rather than 500-ing the entire assessment endpoint.
    try:
        ml_result = ml_predict.predict_risk(ml_features)
        ml_risk_level = ml_result["ml_risk_level"]
        ml_confidence = ml_result["ml_confidence"]
        class_probabilities = ml_result["class_probabilities"]
    except Exception:
        ml_risk_level = rule_result["rule_risk_level"]
        ml_confidence = 0.0
        class_probabilities = {lvl: 0.0 for lvl in ["low", "medium", "high", "critical"]}

    final_level = _max_level(rule_result["rule_risk_level"], ml_risk_level)

    needs_referral = final_level in ("high", "critical")

    return {
        "risk_level": final_level,
        "rule_risk_level": rule_result["rule_risk_level"],
        "ml_risk_level": ml_risk_level,
        "ml_confidence": round(ml_confidence, 3),
        "class_probabilities": {k: round(p, 3) for k, p in class_probabilities.items()},
        "flags": rule_result["flags"],
        "category_levels": rule_result["category_levels"],
        "needs_referral": needs_referral,
    }
