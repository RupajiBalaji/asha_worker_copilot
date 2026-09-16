"""
predict.py — loads the trained model and exposes a single predict_risk() call.
"""
import os
import joblib
import pandas as pd

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
_bundle = None


def _load():
    global _bundle
    if _bundle is None:
        if not os.path.exists(_MODEL_PATH):
            # Auto-train if model file is missing (e.g., fresh deploy on Render)
            try:
                from app.ml.train_model import main as train_main
                train_main()
            except Exception as e:
                raise RuntimeError(
                    f"ML model not found and auto-train failed: {e}. "
                    "Run `python -m app.ml.train_model` from the backend/ directory."
                )
        _bundle = joblib.load(_MODEL_PATH)
    return _bundle


def predict_risk(features: dict) -> dict:
    """
    features: dict with keys matching app.ml.train_model.FEATURE_COLUMNS
    Returns: {"ml_risk_level": str, "ml_confidence": float, "class_probabilities": {level: prob}}
    """
    bundle = _load()
    model = bundle["model"]
    le = bundle["label_encoder"]
    cols = bundle["feature_columns"]

    row = {c: features.get(c, 0) for c in cols}
    df = pd.DataFrame([row], columns=cols)

    proba = model.predict_proba(df)[0]
    pred_idx = proba.argmax()
    pred_label = le.inverse_transform([pred_idx])[0]

    # Map class index -> human-readable label
    probs = {le.inverse_transform([i])[0]: float(p) for i, p in enumerate(proba)}

    return {
        "ml_risk_level": pred_label,
        "ml_confidence": float(proba[pred_idx]),
        "class_probabilities": probs,
    }
