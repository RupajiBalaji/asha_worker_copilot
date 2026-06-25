"""
train_model.py
----------------
Generates a clinically-informed SYNTHETIC dataset (no real patient data is
used anywhere in this project) and trains a RandomForestClassifier that
predicts a continuous risk level. The rule engine (risk_rules.py) is used to
LABEL the synthetic data, with noise added, so the model learns to
approximate clinical judgement and generalize to feature combinations the
rules don't explicitly enumerate.

This model is for DEMONSTRATION / PROTOTYPE purposes. A production system
would need a real, ethically-sourced, de-identified training dataset and
clinical validation before deployment.

Run with: python -m app.ml.train_model
"""
import random
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder
import joblib
import os

from app.ml.risk_rules import evaluate_vitals, RISK_LEVELS

random.seed(42)
np.random.seed(42)

N_SAMPLES = 6000

FEATURE_COLUMNS = [
    "age", "systolic_bp", "diastolic_bp", "blood_sugar_mg_dl", "hemoglobin_g_dl",
    "temperature_c", "pulse_bpm", "bmi", "existing_diabetes", "existing_hypertension",
    "is_pregnant", "trimester", "pregnancy_danger_signs_count",
    "is_child", "muac_cm", "diarrhea",
]


def random_patient():
    age = int(np.clip(np.random.gamma(2, 18), 0, 95))
    is_child = age < 5
    is_pregnant = False
    trimester = 0
    danger_signs = []

    if not is_child and 14 <= age <= 45 and random.random() < 0.18:
        is_pregnant = True
        trimester = random.choice([1, 2, 3])
        possible_signs = ["bleeding", "severe_headache", "reduced_fetal_movement",
                           "high_fever", "convulsions", "severe_abdominal_pain", "swelling"]
        if random.random() < 0.12:
            danger_signs = random.sample(possible_signs, k=random.choice([1, 1, 2]))

    existing_diabetes = age > 35 and random.random() < 0.15
    existing_hypertension = age > 35 and random.random() < 0.20

    systolic = int(np.clip(np.random.normal(122 if not existing_hypertension else 148, 14), 80, 200))
    diastolic = int(np.clip(np.random.normal(80 if not existing_hypertension else 96, 10), 50, 130))
    blood_sugar = float(np.clip(np.random.normal(110 if not existing_diabetes else 190, 35), 50, 350))
    hemoglobin = float(np.round(np.clip(np.random.normal(12.5 if age > 5 else 11, 2.2), 5, 17), 1))
    temperature = float(np.round(np.clip(np.random.normal(37, 0.8), 35.5, 41), 1))
    pulse = int(np.clip(np.random.normal(80, 15), 40, 160))

    height_m = np.clip(np.random.normal(1.55, 0.1), 1.2, 1.9)
    weight_kg = float(np.clip(np.random.normal(58, 14), 8, 110))
    bmi = round(weight_kg / (height_m ** 2), 1) if not is_child else None

    muac_cm = None
    diarrhea = False
    child_age_months = None
    if is_child:
        child_age_months = int(age * 12 + random.randint(0, 11))
        muac_cm = float(np.round(np.clip(np.random.normal(13.2, 1.6), 8, 17), 1))
        diarrhea = random.random() < 0.15

    return {
        "age": age, "systolic_bp": systolic, "diastolic_bp": diastolic,
        "blood_sugar_mg_dl": round(blood_sugar, 1), "hemoglobin_g_dl": hemoglobin,
        "temperature_c": temperature, "pulse_bpm": pulse, "bmi": bmi,
        "existing_diabetes": existing_diabetes, "existing_hypertension": existing_hypertension,
        "is_pregnant": is_pregnant, "trimester": trimester,
        "pregnancy_danger_signs": danger_signs,
        "is_child": is_child, "child_age_months": child_age_months,
        "muac_cm": muac_cm, "diarrhea": diarrhea,
    }


def build_dataset(n=N_SAMPLES):
    rows = []
    labels = []
    for _ in range(n):
        p = random_patient()
        result = evaluate_vitals(p)
        label = result["rule_risk_level"]

        # Add label noise to simulate real-world ambiguity / borderline cases
        if random.random() < 0.05:
            idx = RISK_LEVELS.index(label)
            shift = random.choice([-1, 1])
            idx = max(0, min(len(RISK_LEVELS) - 1, idx + shift))
            label = RISK_LEVELS[idx]

        row = {
            "age": p["age"], "systolic_bp": p["systolic_bp"], "diastolic_bp": p["diastolic_bp"],
            "blood_sugar_mg_dl": p["blood_sugar_mg_dl"], "hemoglobin_g_dl": p["hemoglobin_g_dl"],
            "temperature_c": p["temperature_c"], "pulse_bpm": p["pulse_bpm"],
            "bmi": p["bmi"] if p["bmi"] is not None else 17.0,
            "existing_diabetes": int(p["existing_diabetes"]),
            "existing_hypertension": int(p["existing_hypertension"]),
            "is_pregnant": int(p["is_pregnant"]), "trimester": p["trimester"] or 0,
            "pregnancy_danger_signs_count": len(p["pregnancy_danger_signs"]),
            "is_child": int(p["is_child"]),
            "muac_cm": p["muac_cm"] if p["muac_cm"] is not None else 14.0,
            "diarrhea": int(p["diarrhea"]),
        }
        rows.append(row)
        labels.append(label)

    df = pd.DataFrame(rows, columns=FEATURE_COLUMNS)
    return df, labels


def main():
    print(f"Generating {N_SAMPLES} synthetic patient-visit samples...")
    df, labels = build_dataset()

    le = LabelEncoder()
    le.fit(RISK_LEVELS)
    y = le.transform(labels)

    X_train, X_test, y_train, y_test = train_test_split(
        df, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(
        n_estimators=200, max_depth=10, class_weight="balanced", random_state=42
    )
    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)
    print(classification_report(y_test, preds, target_names=RISK_LEVELS))

    importances = sorted(
        zip(FEATURE_COLUMNS, clf.feature_importances_), key=lambda x: -x[1]
    )
    print("\nTop feature importances:")
    for name, imp in importances[:8]:
        print(f"  {name}: {imp:.3f}")

    os.makedirs(os.path.dirname(__file__), exist_ok=True)
    model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
    joblib.dump({"model": clf, "label_encoder": le, "feature_columns": FEATURE_COLUMNS}, model_path)
    print(f"\nSaved model to {model_path}")

    # Save a sample of the synthetic dataset for transparency / report purposes
    sample_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "synthetic_sample.csv")
    df_with_labels = df.copy()
    df_with_labels["risk_label"] = labels
    df_with_labels.head(200).to_csv(sample_path, index=False)
    print(f"Saved synthetic sample data to {sample_path}")


if __name__ == "__main__":
    main()
