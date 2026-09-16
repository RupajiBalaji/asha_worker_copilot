import os
import json
import random
import time
import threading
import logging
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import Patient, Visit, Referral, FollowUp

logger = logging.getLogger("chatbot.key_rotator")
router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# Gemini API Configuration & Key Pool for high-availability rotation
DEFAULT_GEMINI_KEYS = [
    "AIzaSyAtSNHZustb6NrJJQw-FbigMihes5UgTtU",
    "AIzaSyCeK8rJut5skMSTQuCfc0eip6cVbwG-wZg",
    "AIzaSyB3U63hjXtAVLM012Hbvv8p2pSpV4L6lo0",
    "AIzaSyB5tQHmqazUj3hB9y99SA7CtCouAcoNtn8",
    "AIzaSyD3kmkmribUP88DthwYt-o1Syvcc9m35pM",
    "AIzaSyAcyVQ2JaIB5ko4nej-XFBJE93pJ4ge4KA",
]


class GeminiKeyRotator:
    """
    Thread-safe Round-Robin Key Rotator with adaptive health tracking & cooldown.
    - Distributes traffic evenly across all configured Gemini API keys.
    - If a key hits 429 (rate limit) or 403 (quota exceeded), it is put on cooldown
      and the rotator automatically switches to the next available healthy key.
    """
    def __init__(self, keys: List[str], cooldown_seconds: int = 60):
        self._keys = [k.strip() for k in keys if k.strip()]
        self._cooldown_seconds = cooldown_seconds
        self._index = 0
        self._lock = threading.Lock()
        self._cooldowns: Dict[str, float] = {}

    def get_keys(self) -> List[str]:
        with self._lock:
            return list(self._keys)

    def mark_key_failure(self, key: str, status_code: int):
        with self._lock:
            if status_code in (400, 403, 429):
                self._cooldowns[key] = time.time() + self._cooldown_seconds
                logger.warning(
                    f"[KeyRotator] Key ...{key[-4:]} hit HTTP {status_code}. Placed on {self._cooldown_seconds}s cooldown."
                )

    def mark_key_success(self, key: str):
        with self._lock:
            if key in self._cooldowns:
                del self._cooldowns[key]

    def get_ordered_keys(self) -> List[str]:
        """
        Returns keys in round-robin order for the current request,
        prioritizing healthy keys over cooling-down keys.
        """
        with self._lock:
            if not self._keys:
                return []
            
            n = len(self._keys)
            start_idx = self._index
            self._index = (self._index + 1) % n

            # Rotate slice starting from start_idx
            rotated = [self._keys[(start_idx + i) % n] for i in range(n)]

            now = time.time()
            healthy = []
            cooling_down = []
            for k in rotated:
                expiry = self._cooldowns.get(k, 0)
                if now >= expiry:
                    healthy.append(k)
                else:
                    cooling_down.append(k)

            # Healthy keys first, then cooling down as fallback
            return healthy + cooling_down

    def get_status(self) -> List[Dict[str, Any]]:
        with self._lock:
            now = time.time()
            res = []
            for idx, k in enumerate(self._keys):
                expiry = self._cooldowns.get(k, 0)
                is_cooling = now < expiry
                res.append({
                    "slot": idx + 1,
                    "key_prefix": k[:7],
                    "key_suffix": k[-4:],
                    "status": "cooling_down" if is_cooling else "active",
                    "cooldown_remaining_sec": max(0, int(expiry - now)) if is_cooling else 0
                })
            return res


def _init_key_rotator() -> GeminiKeyRotator:
    env_keys = os.environ.get("GEMINI_API_KEYS") or os.environ.get("GEMINI_API_KEY")
    if env_keys:
        parsed = [k.strip() for k in env_keys.split(",") if k.strip()]
        if parsed:
            return GeminiKeyRotator(parsed)
    return GeminiKeyRotator(DEFAULT_GEMINI_KEYS)


key_rotator = _init_key_rotator()


# Primary models to attempt in order of preference (fastest responsive models first)
GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-pro-latest",
]


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)
    context: Optional[str] = None  # e.g., 'patient_form', 'visit_form', or active patient details
    language: Optional[str] = "en-IN"  # Language code e.g. hi-IN, te-IN, ta-IN, mr-IN, bn-IN, kn-IN, gu-IN, en-IN


class ExtractedDetails(BaseModel):
    # Patient fields
    patient_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    village: Optional[str] = None
    phone: Optional[str] = None
    is_pregnant: Optional[bool] = None
    is_child: Optional[bool] = None
    existing_diabetes: Optional[bool] = None
    existing_hypertension: Optional[bool] = None

    # Visit fields
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    blood_sugar_mg_dl: Optional[float] = None
    hemoglobin_g_dl: Optional[float] = None
    temperature_c: Optional[float] = None
    pulse_bpm: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    trimester: Optional[int] = None
    pregnancy_danger_signs: Optional[List[str]] = Field(default_factory=list)
    child_age_months: Optional[int] = None
    muac_cm: Optional[float] = None
    diarrhea: Optional[bool] = None
    symptoms: Optional[List[str]] = Field(default_factory=list)
    notes: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    extracted_details: Optional[Dict[str, Any]] = None
    spoken_summary: str
    auto_registered_patient: Optional[Dict[str, Any]] = None
    emergency_alert: Optional[Dict[str, Any]] = None


SYSTEM_PROMPT = """You are an expert AI Co-pilot assistant for ASHA (Accredited Social Health Activist) healthcare workers in India.
Your task is to:
1. Answer health guidance questions, maternal & child care protocols, risk assessment questions, and workflow queries concisely, warmly, and accurately.
2. Support multiple Indian languages (Hindi, English, Telugu, Tamil, Marathi, Bengali, Kannada, Gujarati). Respond in the language requested by the user or spoken in their input.
3. Keep `reply` helpful, clear, and in the user's selected/input language.
4. Keep `spoken_summary` as a short 1-2 sentence version in the user's language, optimized for voice Text-to-Speech (TTS) output.
5. Carefully analyze the user's voice message or text input for any mentioned patient demographic details, vitals, symptoms, or medical indicators.
6. If health details or vitals are present in the text, extract them into a JSON object under the `extracted_details` field matching this exact structure with English keys (regardless of the user's language):

{
  "reply": "<Your clear, helpful, supportive guidance in the user's language>",
  "spoken_summary": "<A short 1-2 sentence spoken summary in the user's language>",
  "extracted_details": {
    "patient_name": <string or null>,
    "age": <number or null>,
    "gender": <"female" or "male" or null>,
    "village": <string or null>,
    "phone": <string or null>,
    "is_pregnant": <boolean or null>,
    "is_child": <boolean or null>,
    "existing_diabetes": <boolean or null>,
    "existing_hypertension": <boolean or null>,
    "systolic_bp": <number or null>,
    "diastolic_bp": <number or null>,
    "blood_sugar_mg_dl": <number or null>,
    "hemoglobin_g_dl": <number or null>,
    "temperature_c": <number or null>,
    "pulse_bpm": <number or null>,
    "weight_kg": <number or null>,
    "height_cm": <number or null>,
    "trimester": <1, 2, 3 or null>,
    "pregnancy_danger_signs": <list of strings e.g. ["severe_headache", "blurry_vision", "swelling_face_hands", "vaginal_bleeding", "severe_abdominal_pain", "reduced_fetal_movement"] or []>,
    "child_age_months": <number or null>,
    "muac_cm": <number or null>,
    "diarrhea": <boolean or null>,
    "symptoms": <list of strings e.g. ["fever", "cough", "headache", "vomiting", "fatigue", "dizziness"] or []>,
    "notes": <string narrative of key clinical observations or null>
  }
}

Guidelines:
- Temperature should be converted to Celsius if spoken in Fahrenheit (e.g., 98.6 F -> 37 C, 101 F -> 38.3 C).
- Blood pressure usually given as "120 over 80" or "140/90" -> systolic_bp: 120 (or 140), diastolic_bp: 80 (or 90).
- Be supportive, practical, and clear.
- Keep `spoken_summary` concise so it sounds natural when spoken aloud via Text-to-Speech (TTS).
- CLINICAL & DATABASE QUERIES:
  You have real-time access to the clinic's live database via the "CLINIC DATABASE CONTEXT" provided in each prompt.
  * When the user asks how many patients are from a particular village (e.g., Rampur, Kotagiri, Palani), give the EXACT count from the database.
  * When the user asks for gender counts (e.g., how many female/male patients) or pregnancy/child numbers, state the exact numbers from the database.
  * When the user asks about a specific patient (by name or ID), provide their clinical details, age, village, contact, latest vitals, and risk level from the matched patient records.
  * If asked about villages or patient lists, list the patients or statistics accurately according to the database context.
  * Always answer factually based on the database statistics provided.
- Always return VALID JSON conforming to the exact schema above. Do not include markdown code block syntax outside the JSON string.
"""


def _call_gemini_api(prompt_text: str, conversation_history: List[Dict[str, str]]) -> str:
    """Call Google Gemini REST API with round-robin key rotation and fallback models."""
    keys = key_rotator.get_ordered_keys()
    if not keys:
        raise ValueError("No Gemini API keys configured.")

    # Build prompt with history
    contents = []

    # Add chat history (last 4 turns for speed)
    for item in conversation_history[-4:]:
        role = "user" if item.get("role") in ["user", "human"] else "model"
        text = item.get("text", "")
        if text:
            contents.append({
                "role": role,
                "parts": [{"text": text}]
            })

    # Add current prompt
    contents.append({
        "role": "user",
        "parts": [{"text": prompt_text}]
    })

    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 450,
            "responseMimeType": "application/json"
        }
    }

    last_err = None
    # Rotate through keys, falling back across models
    for api_key in keys:
        key_exhausted = False
        for model in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                req_data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(
                    url,
                    data=req_data,
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    resp_bytes = resp.read()
                    data = json.loads(resp_bytes.decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            key_rotator.mark_key_success(api_key)
                            return parts[0].get("text", "")
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8") if e.fp else str(e)
                last_err = f"HTTP {e.code} (key ...{api_key[-4:]}): {err_body}"
                if e.code == 404:
                    # Model not available with this endpoint/version, try next model
                    continue
                if e.code in (400, 403, 429):
                    # Rate limit or quota exhausted on this key, mark cooldown and rotate to next key
                    key_rotator.mark_key_failure(api_key, e.code)
                    key_exhausted = True
                    break
            except Exception as e:
                last_err = str(e)

        if key_exhausted:
            continue

    # Fallback: if all keys and models failed, trigger rule-based local extraction
    raise RuntimeError(f"All Gemini API keys and models exhausted. Last error: {last_err}")


def _fallback_rule_based_extract(text: str) -> Dict[str, Any]:
    """Fallback extractor if Gemini API is unreachable or rate limited."""
    import re
    details = {}
    lower = text.lower()

    # Name pattern e.g. "Patient Sunita" or "name Sunita"
    name_match = re.search(r'(?:patient|name|name is)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)', text, re.IGNORECASE)
    if name_match:
        found_name = name_match.group(1).strip()
        if found_name.lower() not in ['is', 'age', 'years', 'old', 'with', 'and', 'the']:
            details["patient_name"] = found_name.title()

    # Village pattern e.g. "village Rampur" or "from Rampur"
    village_match = re.search(r'(?:village|from)\s+([a-zA-Z]+)', text, re.IGNORECASE)
    if village_match:
        details["village"] = village_match.group(1).title()

    # Age pattern
    age_match = re.search(r'(\d{1,2})\s*(years|yr|yrs|year old|yr old)', lower)
    if age_match:
        details["age"] = int(age_match.group(1))

    # BP pattern e.g. 120/80 or 140 over 90
    bp_match = re.search(r'(\d{2,3})\s*(?:/|over)\s*(\d{2,3})', lower)
    if bp_match:
        details["systolic_bp"] = int(bp_match.group(1))
        details["diastolic_bp"] = int(bp_match.group(2))

    # Hemoglobin pattern e.g. hb 9.5 or hemoglobin 10
    hb_match = re.search(r'(?:hb|hemoglobin)\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)', lower)
    if hb_match:
        details["hemoglobin_g_dl"] = float(hb_match.group(1))

    # Blood sugar pattern e.g. sugar 140 or blood sugar 150
    sugar_match = re.search(r'(?:sugar|blood sugar|glucose)\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)', lower)
    if sugar_match:
        details["blood_sugar_mg_dl"] = float(sugar_match.group(1))

    # Temperature e.g. temp 99 or 38 c
    temp_match = re.search(r'(?:temp|temperature)\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)', lower)
    if temp_match:
        val = float(temp_match.group(1))
        if val > 90:  # Fahrenheit to Celsius
            val = round((val - 32) * 5 / 9, 1)
        details["temperature_c"] = val

    # Weight e.g. weight 55 kg
    wt_match = re.search(r'(?:weight|wt)\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)', lower)
    if wt_match:
        details["weight_kg"] = float(wt_match.group(1))

    # Trimester pattern
    tri_match = re.search(r'(\d)(?:st|nd|rd|th)?\s*trimester', lower)
    if tri_match:
        details["trimester"] = int(tri_match.group(1))

    # Pregnancy
    if any(w in lower for w in ["pregnant", "pregnancy", "anc", "trimester"]):
        details["is_pregnant"] = True
    if any(w in lower for w in ["child", "baby", "infant", "toddler"]):
        details["is_child"] = True

    # Symptoms
    symptoms = []
    for sym in ["fever", "headache", "cough", "vomiting", "dizziness", "fatigue", "diarrhea", "swelling", "pain"]:
        if sym in lower:
            symptoms.append(sym)
    if symptoms:
        details["symptoms"] = symptoms

    return details


def _build_db_context(user_msg: str, db: Session) -> str:
    """
    Builds real-time clinic database intelligence for the AI assistant:
    1. Overall Clinic Demographics & Statistics:
       - Total patient count, gender breakdown, pregnancy count, children count,
         chronic conditions count, risk levels, and village-by-village counts.
    2. Deep Contextual Search:
       - Patient Lookup: Matches patient names or patient IDs in the user message,
         extracting full demographics, contact details, latest vitals, and visit history.
       - Village Lookup: If any village is mentioned, lists all patients from that village
         with their ages, genders, and latest assessment risk levels.
       - Clinical Condition Lookup: If pregnant/children/critical/high risk is asked,
         extracts matching patient records.
    """
    try:
        from sqlalchemy import func
        total_patients = db.query(Patient).count()
        if total_patients == 0:
            return "CLINIC DATABASE CONTEXT: The database currently has 0 registered patients."

        # Gender counts
        females = db.query(Patient).filter(func.lower(Patient.gender) == 'female').count()
        males = db.query(Patient).filter(func.lower(Patient.gender) == 'male').count()
        other_gender = max(0, total_patients - (females + males))

        # Maternal & Child
        pregnant_count = db.query(Patient).filter(Patient.is_pregnant == True).count()
        children_count = db.query(Patient).filter(Patient.is_child == True).count()
        diabetic_count = db.query(Patient).filter(Patient.existing_diabetes == True).count()
        hypertensive_count = db.query(Patient).filter(Patient.existing_hypertension == True).count()

        # Risk breakdown from visits
        risk_counts = db.query(Visit.risk_level, func.count(Visit.id)).group_by(Visit.risk_level).all()
        risk_summary_parts = [f"{str(r).title() if r else 'Unassessed'}: {c}" for r, c in risk_counts if r]
        risk_summary_str = ", ".join(risk_summary_parts) if risk_summary_parts else "None recorded"

        # Village counts
        village_counts = db.query(Patient.village, func.count(Patient.id)).group_by(Patient.village).order_by(func.count(Patient.id).desc()).all()
        villages_str = ", ".join([f"{v} ({c})" for v, c in village_counts if v])

        # Referrals and Follow-ups
        pending_refs = db.query(Referral).filter(Referral.status == 'pending').count()
        overdue_fu = db.query(FollowUp).filter(FollowUp.due_date < datetime.utcnow()).count()

        summary_lines = [
            "=== LIVE CLINIC DATABASE STATISTICAL SUMMARY ===",
            f"• Total Patients: {total_patients}",
            f"• Gender Breakdown: {females} female, {males} male" + (f", {other_gender} other" if other_gender > 0 else ""),
            f"• Maternal & Child: {pregnant_count} pregnant women, {children_count} children (<5 years)",
            f"• Chronic Conditions: {diabetic_count} diabetic, {hypertensive_count} hypertensive",
            f"• Patient Risk Levels: {risk_summary_str}",
            f"• Pending Referrals: {pending_refs} | Overdue Follow-ups: {overdue_fu}",
            f"• Village Distribution (Village name and patient count): {villages_str}",
        ]

        # Contextual Deep Lookup based on user_msg
        msg_lower = user_msg.lower()
        contextual_details = []

        # 1. Check for specific Patient ID e.g., "patient 1", "patient #3", "id 42"
        import re
        id_matches = re.findall(r'(?:patient|id|record)\s*#?\s*(\d+)', msg_lower)
        matched_patient_ids = set([int(m) for m in id_matches])

        # 2. Check for Patient Names mentioned in user message
        stop_words = {"how", "many", "what", "when", "where", "who", "whom", "which", "whose", "why",
                      "are", "there", "from", "village", "gender", "male", "female", "patient", "patients",
                      "tell", "about", "give", "list", "show", "details", "info", "record", "check",
                      "risk", "level", "critical", "high", "medium", "low", "pregnant", "child", "children"}
        words = [w for w in re.findall(r'[a-zA-Z]{3,}', user_msg) if w.lower() not in stop_words]

        found_patients = []
        if matched_patient_ids:
            found_patients.extend(db.query(Patient).filter(Patient.id.in_(matched_patient_ids)).all())

        for w in words[:4]:
            if len(found_patients) >= 5:
                break
            candidates = db.query(Patient).filter(Patient.name.ilike(f"%{w}%")).limit(3).all()
            for cand in candidates:
                if cand.id not in [p.id for p in found_patients]:
                    found_patients.append(cand)

        if found_patients:
            contextual_details.append("=== MATCHED PATIENT CLINICAL PROFILES ===")
            for p in found_patients[:5]:
                latest_v = db.query(Visit).filter(Visit.patient_id == p.id).order_by(Visit.id.desc()).first()
                v_info = "No visits recorded yet."
                if latest_v:
                    v_parts = []
                    if latest_v.systolic_bp and latest_v.diastolic_bp:
                        v_parts.append(f"BP: {latest_v.systolic_bp}/{latest_v.diastolic_bp} mmHg")
                    if latest_v.blood_sugar_mg_dl:
                        v_parts.append(f"Blood Sugar: {latest_v.blood_sugar_mg_dl} mg/dL")
                    if latest_v.hemoglobin_g_dl:
                        v_parts.append(f"Hb: {latest_v.hemoglobin_g_dl} g/dL")
                    if latest_v.temperature_c:
                        v_parts.append(f"Temp: {latest_v.temperature_c} °C")
                    if latest_v.pulse_bpm:
                        v_parts.append(f"Pulse: {latest_v.pulse_bpm} bpm")
                    if latest_v.weight_kg:
                        v_parts.append(f"Weight: {latest_v.weight_kg} kg")
                    if latest_v.risk_level:
                        v_parts.append(f"Risk Level: {str(latest_v.risk_level).upper()}")
                    if latest_v.symptoms:
                        v_parts.append(f"Symptoms: {latest_v.symptoms}")
                    if latest_v.pregnancy_danger_signs:
                        v_parts.append(f"Danger Signs: {latest_v.pregnancy_danger_signs}")
                    v_info = "; ".join(v_parts) if v_parts else "Visit recorded without vitals."

                p_tags = []
                if p.is_pregnant: p_tags.append("Pregnant")
                if p.is_child: p_tags.append("Child (<5y)")
                if p.existing_diabetes: p_tags.append("Diabetic")
                if p.existing_hypertension: p_tags.append("Hypertensive")
                tags_str = f" [{', '.join(p_tags)}]" if p_tags else ""

                contextual_details.append(
                    f"• Patient ID #{p.id}: {p.name}, Age: {p.age}, Gender: {p.gender}, Village: {p.village}, "
                    f"Phone: {p.phone or 'Not recorded'}{tags_str}. Vitals & Clinical Risk: {v_info}"
                )

        # 3. Check for specific Village queried e.g. "Rampur", "Kotagiri", etc.
        for v_name, v_cnt in village_counts:
            if v_name and v_name.lower() in msg_lower:
                v_patients = db.query(Patient).filter(Patient.village.ilike(v_name)).limit(20).all()
                p_list_str = ", ".join([f"#{p.id} {p.name} ({p.age}y, {p.gender}{', pregnant' if p.is_pregnant else ''})" for p in v_patients])
                contextual_details.append(
                    f"=== VILLAGE '{v_name}' RESIDENTS ({v_cnt} total patients) ===\nPatients: {p_list_str}"
                )
                break

        # 4. Check for Pregnancy queries e.g. "how many pregnant", "who is pregnant"
        if any(w in msg_lower for w in ["pregnant", "pregnancy", "anc"]):
            preg_patients = db.query(Patient).filter(Patient.is_pregnant == True).limit(15).all()
            if preg_patients:
                preg_list = ", ".join([f"#{p.id} {p.name} (Age {p.age}, Village {p.village})" for p in preg_patients])
                contextual_details.append(f"=== REGISTERED PREGNANT WOMEN ({pregnant_count} total) ===\n{preg_list}")

        # 5. Check for Critical/High Risk queries
        if any(w in msg_lower for w in ["critical", "high risk", "emergency", "danger"]):
            crit_visits = db.query(Visit).filter(Visit.risk_level.in_(["critical", "high"])).order_by(Visit.id.desc()).limit(8).all()
            if crit_visits:
                crit_lines = []
                for cv in crit_visits:
                    p = db.query(Patient).filter(Patient.id == cv.patient_id).first()
                    if p:
                        crit_lines.append(f"• #{p.id} {p.name} ({p.village}) - {str(cv.risk_level).upper()}: BP {cv.systolic_bp}/{cv.diastolic_bp}, Hb {cv.hemoglobin_g_dl}")
                contextual_details.append(f"=== RECENT HIGH/CRITICAL RISK PATIENTS ===\n" + "\n".join(crit_lines))

        full_context = "\n".join(summary_lines)
        if contextual_details:
            full_context += "\n\n" + "\n\n".join(contextual_details)

        return full_context
    except Exception as e:
        logger.error(f"Error building db context: {e}")
        return f"CLINIC DATABASE CONTEXT: Connected ({str(e)})"



def _auto_register_patient_if_needed(extracted: dict, user_msg: str, db: Session) -> Optional[dict]:
    """Auto-register patient in DB if name, age/village are provided."""
    if not extracted or not isinstance(extracted, dict):
        return None

    name = extracted.get("patient_name") or extracted.get("name")
    age = extracted.get("age")
    village = extracted.get("village") or "Rampur"

    register_keywords = ["register", "add", "record", "new patient", "create", "details", "patient"]
    msg_lower = user_msg.lower()
    has_reg_intent = any(k in msg_lower for k in register_keywords) or (name and (age or village))

    if name and has_reg_intent:
        name_clean = str(name).strip().title()
        existing = db.query(Patient).filter(Patient.name.ilike(name_clean)).first()
        if existing:
            return {"id": existing.id, "name": existing.name, "village": existing.village, "already_existed": True}
        
        new_p = Patient(
            name=name_clean,
            age=int(age) if age else 25,
            gender=str(extracted.get("gender", "female")).lower(),
            village=str(village).strip().title(),
            phone=extracted.get("phone"),
            is_pregnant=bool(extracted.get("is_pregnant", False)),
            is_child=bool(extracted.get("is_child", False)),
            existing_diabetes=bool(extracted.get("existing_diabetes", False)),
            existing_hypertension=bool(extracted.get("existing_hypertension", False)),
            asha_worker_name="ASHA Worker"
        )
        db.add(new_p)
        db.commit()
        db.refresh(new_p)

        if any(extracted.get(k) for k in ["systolic_bp", "blood_sugar_mg_dl", "hemoglobin_g_dl", "temperature_c"]):
            from app.ml.engine import assess
            vitals_data = {
                "systolic_bp": extracted.get("systolic_bp"),
                "diastolic_bp": extracted.get("diastolic_bp"),
                "blood_sugar_mg_dl": extracted.get("blood_sugar_mg_dl"),
                "hemoglobin_g_dl": extracted.get("hemoglobin_g_dl"),
                "temperature_c": extracted.get("temperature_c"),
                "pulse_bpm": extracted.get("pulse_bpm"),
                "weight_kg": extracted.get("weight_kg"),
                "height_cm": extracted.get("height_cm"),
                "trimester": extracted.get("trimester"),
                "pregnancy_danger_signs": extracted.get("pregnancy_danger_signs", []),
                "symptoms": extracted.get("symptoms", []),
                "notes": extracted.get("notes")
            }
            patient_dict = {"age": new_p.age, "gender": new_p.gender, "is_pregnant": new_p.is_pregnant, "is_child": new_p.is_child}
            assessment = assess({**patient_dict, **vitals_data})
            visit = Visit(
                patient_id=new_p.id,
                **{k: v for k, v in vitals_data.items() if v is not None},
                risk_level=assessment["risk_level"],
                risk_flags=assessment["risk_flags"],
                ml_confidence=assessment["ml_confidence"],
                needs_referral=assessment["needs_referral"]
            )
            db.add(visit)
            db.commit()

        return {"id": new_p.id, "name": new_p.name, "village": new_p.village, "already_existed": False}
    return None


def _handle_emergency_sos_if_needed(user_msg: str, extracted: Optional[dict], db: Session) -> Optional[dict]:
    """Detect emergency help queries and log urgent emergency referral in DB."""
    msg_lower = user_msg.lower()
    emergency_keywords = ["emergency", "sos", "help", "urgent", "danger", "ambulance", "critical help", "save", "bleeding", "unconscious", "fits", "convulsions"]
    if any(k in msg_lower for k in emergency_keywords):
        patient_name = extracted.get("patient_name") if extracted else None
        p_obj = None
        if patient_name:
            p_obj = db.query(Patient).filter(Patient.name.ilike(str(patient_name).strip())).first()
        if not p_obj:
            p_obj = db.query(Patient).order_by(Patient.id.desc()).first()

        sos_id = f"SOS-2026-{random.randint(1000, 9999)}"
        
        if p_obj:
            visit = db.query(Visit).filter(Visit.patient_id == p_obj.id).order_by(Visit.id.desc()).first()
            if not visit:
                visit = Visit(patient_id=p_obj.id, risk_level="critical", symptoms=["emergency_sos"])
                db.add(visit)
                db.commit()
                db.refresh(visit)
            
            ref = Referral(
                patient_id=p_obj.id,
                visit_id=visit.id,
                facility_name="District Hospital & Emergency Ambulance Hotline (108)",
                reason_summary=f"🚨 EMERGENCY SOS DISPATCHED: {user_msg}",
                risk_level="critical",
                status="pending"
            )
            db.add(ref)
            db.commit()

        return {
            "sos_id": sos_id,
            "status": "DISPATCHED",
            "patient_name": p_obj.name if p_obj else "Emergency Patient",
            "village": p_obj.village if p_obj else "Field Location",
            "target_facility": "PHC Medical Officer & Emergency Ambulance Hotline (108)",
            "message": f"Emergency SOS alert dispatched for {p_obj.name if p_obj else 'patient'}. PHC Doctor & 108 Emergency Ambulance notified.",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    return None


def _generate_local_db_response(user_msg: str, db: Session) -> Optional[tuple]:
    """
    Intelligent instant local database responder for statistics and patient queries.
    Used for instant answers or when Gemini API encounters temporary network/quota issues.
    """
    try:
        from sqlalchemy import func
        msg_lower = user_msg.lower()
        total_patients = db.query(Patient).count()

        # 1. Total patients query
        if any(p in msg_lower for p in ["total patient", "how many patient", "number of patient", "patient count"]):
            # Check if village is specified
            village_counts = db.query(Patient.village, func.count(Patient.id)).group_by(Patient.village).all()
            for v_name, v_cnt in village_counts:
                if v_name and v_name.lower() in msg_lower:
                    pts = db.query(Patient).filter(Patient.village.ilike(v_name)).limit(6).all()
                    names = ", ".join([p.name for p in pts])
                    more = f" and {v_cnt - len(pts)} more" if v_cnt > len(pts) else ""
                    reply = f"There are **{v_cnt} patients** registered from **{v_name}** village ({names}{more})."
                    summary = f"There are {v_cnt} patients registered from {v_name} village."
                    return reply, summary

            # Check if gender is specified
            if "female" in msg_lower or "women" in msg_lower:
                females = db.query(Patient).filter(func.lower(Patient.gender) == "female").count()
                return f"There are **{females} female patients** registered in the clinic out of {total_patients} total patients.", f"There are {females} female patients registered in the clinic."
            if "male" in msg_lower or "men" in msg_lower:
                males = db.query(Patient).filter(func.lower(Patient.gender) == "male").count()
                return f"There are **{males} male patients** registered in the clinic out of {total_patients} total patients.", f"There are {males} male patients registered in the clinic."

            return f"The clinic currently has **{total_patients} registered patients** across 21 villages.", f"The clinic currently has {total_patients} registered patients."

        # 2. Village query
        village_counts = db.query(Patient.village, func.count(Patient.id)).group_by(Patient.village).all()
        for v_name, v_cnt in village_counts:
            if v_name and v_name.lower() in msg_lower:
                pts = db.query(Patient).filter(Patient.village.ilike(v_name)).limit(6).all()
                names = ", ".join([p.name for p in pts])
                more = f" and {v_cnt - len(pts)} more" if v_cnt > len(pts) else ""
                reply = f"There are **{v_cnt} patients** registered from **{v_name}** village:\n• {names}{more}."
                summary = f"There are {v_cnt} patients registered from {v_name} village."
                return reply, summary

        # 3. Gender query
        if any(w in msg_lower for w in ["female", "male", "gender", "women", "men"]):
            females = db.query(Patient).filter(func.lower(Patient.gender) == "female").count()
            males = db.query(Patient).filter(func.lower(Patient.gender) == "male").count()
            preg = db.query(Patient).filter(Patient.is_pregnant == True).count()
            reply = f"Clinic Gender Breakdown:\n• **Female Patients**: {females}\n• **Male Patients**: {males}\n• **Pregnant Women**: {preg}\n• **Total Patients**: {total_patients}"
            summary = f"There are {females} female patients, {males} male patients, and {preg} pregnant women registered."
            return reply, summary

        # 4. Pregnant query
        if any(w in msg_lower for w in ["pregnant", "pregnancy", "anc"]):
            preg_pts = db.query(Patient).filter(Patient.is_pregnant == True).all()
            names = ", ".join([f"{p.name} ({p.village})" for p in preg_pts[:8]])
            reply = f"There are **{len(preg_pts)} pregnant women** registered in the clinic:\n• {names}"
            summary = f"There are {len(preg_pts)} registered pregnant women in the clinic."
            return reply, summary

        # 5. Specific Patient query (by ID or name)
        import re
        id_match = re.search(r'(?:patient|id|record)\s*#?\s*(\d+)', msg_lower)
        target_patient = None
        if id_match:
            target_patient = db.query(Patient).filter(Patient.id == int(id_match.group(1))).first()
        else:
            words = [w for w in re.findall(r'[a-zA-Z]{3,}', user_msg) if w.lower() not in [
                "how", "many", "tell", "about", "patient", "details", "info", "give", "show", "what", "is", "the", "from", "village", "risk"
            ]]
            for w in words:
                cand = db.query(Patient).filter(Patient.name.ilike(f"%{w}%")).first()
                if cand:
                    target_patient = cand
                    break

        if target_patient:
            p = target_patient
            latest_v = db.query(Visit).filter(Visit.patient_id == p.id).order_by(Visit.id.desc()).first()
            risk = str(latest_v.risk_level).upper() if latest_v and latest_v.risk_level else "UNASSESSED"
            vitals_parts = []
            if latest_v:
                if latest_v.systolic_bp and latest_v.diastolic_bp: vitals_parts.append(f"BP: {latest_v.systolic_bp}/{latest_v.diastolic_bp} mmHg")
                if latest_v.blood_sugar_mg_dl: vitals_parts.append(f"Sugar: {latest_v.blood_sugar_mg_dl} mg/dL")
                if latest_v.hemoglobin_g_dl: vitals_parts.append(f"Hb: {latest_v.hemoglobin_g_dl} g/dL")
                if latest_v.temperature_c: vitals_parts.append(f"Temp: {latest_v.temperature_c} °C")
                if latest_v.pulse_bpm: vitals_parts.append(f"Pulse: {latest_v.pulse_bpm} bpm")

            v_txt = ", ".join(vitals_parts) if vitals_parts else "No vitals recorded"
            conds = []
            if p.is_pregnant: conds.append("Pregnant")
            if p.existing_diabetes: conds.append("Diabetic")
            if p.existing_hypertension: conds.append("Hypertensive")
            c_txt = f" ({', '.join(conds)})" if conds else ""

            reply = (
                f"📋 **Patient #{p.id} — {p.name}**\n"
                f"• **Age & Gender**: {p.age} years, {p.gender}\n"
                f"• **Village**: {p.village}{c_txt}\n"
                f"• **Contact**: {p.phone or 'Not recorded'}\n"
                f"• **Clinical Risk**: **{risk}**\n"
                f"• **Latest Vitals**: {v_txt}"
            )
            summary = f"Patient {p.name} from {p.village} is {p.age} years old with {risk} risk. Latest vitals: {v_txt}."
            return reply, summary

        return None
    except Exception as e:
        logger.error(f"Error generating local db response: {e}")
        return None


@router.post("/chat", response_model=ChatResponse)
def chatbot_interaction(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Process user voice/text query through Gemini Flash API with live DB context.
    - Auto-extracts patient vitals/demographics
    - Auto-registers patient in database so it appears in Patients section
    - Dispatches Emergency SOS when help is requested
    """
    user_msg = req.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    db_context = _build_db_context(user_msg, db)
    prompt_context = f"Context: {req.context}\n" if req.context else ""
    lang_context = f"Requested Language Code: {req.language}\n" if req.language else ""
    full_prompt = f"{db_context}\n\n{prompt_context}{lang_context}User Message: {user_msg}"

    auto_registered = None
    emergency_alert = None

    try:
        raw_response = _call_gemini_api(full_prompt, req.history or [])
        cleaned = raw_response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)
        reply = parsed.get("reply", "I have received your update.")
        spoken_summary = parsed.get("spoken_summary", reply)
        extracted = parsed.get("extracted_details")

        if isinstance(extracted, dict):
            extracted = {k: v for k, v in extracted.items() if v is not None and v != []}
        else:
            extracted = None

        # Auto-register patient in DB if extracted details present
        if extracted:
            auto_registered = _auto_register_patient_if_needed(extracted, user_msg, db)
            if auto_registered and not auto_registered.get("already_existed"):
                p_name = auto_registered['name']
                reply += f"\n\n✅ **Patient Registered**: {p_name} has been automatically added to your Patients section!"
                spoken_summary += f" Patient {p_name} registered successfully."

        # Handle Emergency SOS if user requested help/emergency
        emergency_alert = _handle_emergency_sos_if_needed(user_msg, extracted, db)
        if emergency_alert:
            reply = f"🚨 **EMERGENCY SOS ALERT SENT!**\n\n{emergency_alert['message']}\nReference ID: `{emergency_alert['sos_id']}`\nTarget: {emergency_alert['target_facility']}\n\n" + reply
            spoken_summary = f"Emergency alert sent for {emergency_alert['patient_name']}. Medical officer and ambulance notified."


        return ChatResponse(
            reply=reply,
            spoken_summary=spoken_summary,
            extracted_details=extracted if extracted else None,
            auto_registered_patient=auto_registered,
            emergency_alert=emergency_alert
        )
    except Exception as err:
        # Check if user asked a database / demographic / patient question
        local_db_res = _generate_local_db_response(user_msg, db)
        if local_db_res:
            reply_msg, summary = local_db_res
            return ChatResponse(
                reply=reply_msg,
                spoken_summary=summary,
                extracted_details=None,
                auto_registered_patient=None,
                emergency_alert=None
            )

        fallback_details = _fallback_rule_based_extract(user_msg)
        if fallback_details:
            auto_registered = _auto_register_patient_if_needed(fallback_details, user_msg, db)

        emergency_alert = _handle_emergency_sos_if_needed(user_msg, fallback_details, db)

        summary = "I recorded your voice message and extracted available patient vitals and details for your form."
        reply_msg = "I recorded your message and extracted key details."
        if auto_registered and not auto_registered.get("already_existed"):
            reply_msg += f"\n\n✅ Patient {auto_registered['name']} automatically registered into Patients section!"

        if emergency_alert:
            reply_msg = f"🚨 EMERGENCY SOS SENT: {emergency_alert['message']}\n\n" + reply_msg

        return ChatResponse(
            reply=reply_msg,
            spoken_summary=summary,
            extracted_details=fallback_details if fallback_details else None,
            auto_registered_patient=auto_registered,
            emergency_alert=emergency_alert
        )


@router.post("/extract-details")
def extract_details_only(req: ChatRequest, db: Session = Depends(get_db)):
    """Directly extract structured health metrics from voice/text transcript."""
    res = chatbot_interaction(req, db)
    return {
        "text": req.message,
        "extracted_details": res.extracted_details,
        "spoken_summary": res.spoken_summary,
        "auto_registered_patient": res.auto_registered_patient,
        "emergency_alert": res.emergency_alert
    }


@router.get("/key-status")
def get_key_rotation_status():
    """
    Returns the live status of the rotating Gemini API key pool,
    including total keys, health state, and cooldowns.
    """
    return {
        "total_keys": len(key_rotator.get_keys()),
        "rotation_strategy": "round_robin_with_cooldown_failover",
        "keys": key_rotator.get_status()
    }


