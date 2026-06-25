# ASHA Worker AI Co-pilot

An AI-powered healthcare assistance platform for ASHA (Accredited Social Health Activist) workers, providing real-time risk assessment, automated referrals, and follow-up scheduling during field visits.

## Architecture

```
┌─────────────────┐         ┌──────────────────────────────────────┐
│  Mobile/Web App  │  HTTP   │           FastAPI Backend             │
│  (React PWA)     │ ──────► │                                        │
│                  │         │  ┌────────────┐    ┌─────────────┐    │
│  - Patient forms │         │  │ Rule Engine │ +  │  ML Model   │    │
│  - Risk alerts   │         │  │(explainable)│    │(RandomForest)│   │
│  - Referrals     │         │  └─────┬──────┘    └──────┬──────┘    │
│  - Follow-ups    │         │        └────────┬──────────┘          │
└──────────────────┘         │                 ▼                     │
                              │      Combined Risk Assessment         │
                              │                 │                     │
                              │     ┌───────────┴────────────┐        │
                              │     ▼                        ▼        │
                              │  Referral PDF          Follow-up      │
                              │  (auto-generated)      Scheduling     │
                              └──────────────────┬────────────────────┘
                                                  ▼
                                            SQLite Database
```

### Why a hybrid Rule Engine + ML Model?

In healthcare decision support, a pure black-box ML model is risky — a false negative on a danger sign (e.g., a pregnant woman with severe bleeding) cannot be tolerated. So this system uses:

1. **Rule engine** (`app/ml/risk_rules.py`) — deterministic, explainable thresholds inspired by WHO/ICMR ANC and IMNCI guidelines. These ALWAYS fire regardless of what the ML model predicts.
2. **ML model** (`app/ml/predict.py`) — a RandomForestClassifier trained on a synthetic dataset, used to catch combinations of risk factors the explicit rules don't enumerate, and to produce a continuous confidence score for triage prioritization.
3. **Combined engine** (`app/ml/engine.py`) — takes the **maximum severity** of the two. The ML model can escalate a case the rules missed, but can never downgrade a rule-based critical flag. This is the key safety property of the design.

**Important disclaimer**: The ML model is trained on synthetic, clinically-informed data for demonstration purposes only. It has NOT been validated against real patient data or reviewed by a clinical board. A real deployment would require ethically-sourced training data, clinical validation, and regulatory review (e.g., against ICMR/CDSCO guidelines) before use in the field.

## Project Structure

```
asha-copilot/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── database.py                # SQLAlchemy setup
│   │   ├── schemas.py                 # Pydantic request/response models
│   │   ├── models/db_models.py        # Database tables
│   │   ├── ml/
│   │   │   ├── risk_rules.py          # Explainable rule engine
│   │   │   ├── train_model.py         # Synthetic data + model training
│   │   │   ├── predict.py             # ML inference
│   │   │   └── engine.py              # Combines rules + ML
│   │   ├── routers/
│   │   │   ├── patients.py            # Patient CRUD
│   │   │   ├── visits.py              # Visit recording + assessment (core flow)
│   │   │   └── referrals_followups.py # Referral & follow-up management
│   │   └── utils/referral_pdf.py      # PDF referral letter generator
│   ├── data/synthetic_sample.csv      # Sample of training data (for your report)
│   ├── referrals/                     # Generated referral PDFs land here
│   └── requirements.txt
├── frontend/
│   ├── src/index.jsx                  # Main React app (all screens)
│   ├── src/index.css
│   ├── public/manifest.json           # PWA manifest (installable on phone)
│   ├── public/sw.js                   # Service worker (offline support)
│   ├── index.html
│   └── package.json
└── demo-preview/AshaCopilotDemo.jsx   # Standalone demo component (see chat artifact)
```

## Running the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Train the ML model (creates app/ml/model.pkl) — only needs to run once
python -m app.ml.train_model

# Start the API server
python -m uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for interactive Swagger API documentation — you can test every endpoint directly from the browser.

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. The app is a PWA — open it on your phone's browser and use "Add to Home Screen" to install it like a native app.

To point the frontend at a deployed backend instead of localhost, set the `VITE_API_BASE` environment variable before building.

## Core Workflow (what actually happens)

1. ASHA worker registers a patient (`POST /patients/`) with basic demographics and flags (pregnant / child / existing conditions).
2. During a field visit, she records vitals (`POST /visits/{patient_id}/assess`):
   - Blood pressure, blood sugar, hemoglobin, temperature, pulse, weight/height
   - Pregnancy danger signs (bleeding, severe headache, reduced fetal movement, etc.) if applicable
   - MUAC (mid-upper arm circumference) and diarrhea status for children
3. The backend immediately runs the hybrid risk engine and returns:
   - Final risk level (`low` / `medium` / `high` / `critical`)
   - Explainable flags with severity and message
   - ML confidence distribution across risk levels
4. If risk is `high` or `critical`:
   - A referral letter PDF is auto-generated and saved
   - A follow-up visit is automatically scheduled (3 days for critical, 7 for high)
5. Referrals and follow-ups can be tracked, updated, and listed per patient.

## Tested Scenarios

This prototype has been verified end-to-end for:
- A pregnant patient with severe hypertension + pre-eclampsia danger signs → correctly flagged `critical`, referral + PDF generated, 3-day follow-up scheduled
- A child with severe acute malnutrition (low MUAC) + diarrhea → correctly flagged `critical`
- A healthy adult with normal vitals → correctly flagged `low`, no referral, no false alarm

## Taking This to "Industry Level" — Next Steps

This prototype demonstrates the core AI/ML pipeline and workflow end-to-end. To move toward production:

**Data & ML**
- Replace synthetic training data with real, de-identified, ethically-sourced data (requires institutional ethics approval)
- Clinical validation of thresholds against ICMR/WHO guidelines with a medical advisory board
- Model monitoring for drift; periodic retraining pipeline

**Security & Compliance**
- Authentication/authorization (OAuth2/JWT) — currently the API has none
- Data encryption at rest and in transit (patient health data is highly sensitive)
- Compliance review against India's Digital Personal Data Protection (DPDP) Act, 2023
- Audit logging for all access to patient records

**Scalability**
- Move from SQLite to PostgreSQL for concurrent multi-user access
- Containerize (Docker) and deploy backend to a cloud provider
- Add Redis caching for frequently accessed data (alerts, dashboards)

**Mobile**
- Wrap the PWA in Capacitor, or port to React Native/Expo, for app-store distribution and deeper offline-first sync (critical for low-connectivity rural areas)
- Local-first data storage with background sync when connectivity returns

**Product**
- Multi-language support (Hindi, regional languages) — critical for real ASHA worker adoption
- Supervisor/PHC dashboard to view aggregated alerts across all ASHA workers in a block
- SMS/IVR fallback notifications for areas with no smartphone access

## Disclaimer

This is an academic prototype. It is not a certified medical device and should not be used for real clinical decision-making without proper validation, regulatory approval, and clinical oversight.
