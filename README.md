# 🏥 ASHA Worker AI Co-pilot

> **AI-powered healthcare assistance for ASHA (Accredited Social Health Activist) frontline workers** — real-time patient risk assessment, automated referrals, and follow-up scheduling, built for rural India.

[![Python](https://img.shields.io/badge/Python-3.14%2B-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.9%2B-F7931E?logo=scikit-learn)](https://scikit-learn.org)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-Academic%20Prototype-lightgrey)](#disclaimer)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [API Reference](#api-reference)
- [ML Model](#ml-model)
- [Core Workflow](#core-workflow)
- [Screens & UI](#screens--ui)
- [PWA Support](#pwa-support)
- [Tested Scenarios](#tested-scenarios)
- [Known Limitations & Roadmap](#known-limitations--roadmap)
- [Disclaimer](#disclaimer)

---

## Overview

ASHA workers are India's frontline community health workers — over 1 million strong — responsible for monitoring maternal and child health across rural villages. They visit patients at home with limited connectivity and no on-the-spot clinical decision support.

**ASHA Co-pilot** gives them a mobile-first AI assistant that:

- 📝 **Registers patients** with medical profiles (pregnancy status, chronic conditions)
- 🔬 **Records field visits** — vitals, pregnancy danger signs, child malnutrition markers
- 🤖 **Instantly assesses risk** using a hybrid Rule Engine + RandomForest ML model
- 📄 **Auto-generates referral letters** (PDF) for high-risk patients
- 📅 **Schedules follow-up visits** automatically based on risk level
- 📊 **Shows a live dashboard** with overdue follow-ups, pending referrals, and patient stats

---

## Architecture

```
┌────────────────────────────────────┐         ┌──────────────────────────────────────────┐
│       Mobile/Web App (React PWA)   │  HTTP   │            FastAPI Backend                │
│                                    │ ──────► │                                          │
│  ◉ Home Dashboard                  │         │   ┌──────────────┐   ┌────────────────┐  │
│  ◉ Patient Registration            │         │   │  Rule Engine  │ + │   ML Model     │  │
│  ◉ Visit Recording                 │         │   │ (explainable) │   │ (RandomForest) │  │
│  ◉ Risk Results                    │         │   └──────┬───────┘   └───────┬────────┘  │
│  ◉ Follow-up Management            │         │          └─────────┬──────────┘          │
│  ◉ Referral Tracking               │         │                    ▼                     │
└────────────────────────────────────┘         │       Combined Risk Assessment           │
                                               │         (max of the two levels)          │
                                               │                    │                     │
                                               │     ┌──────────────┴─────────────┐       │
                                               │     ▼                            ▼       │
                                               │  Referral PDF             Follow-up      │
                                               │  (auto-generated)         Scheduling     │
                                               └──────────────────┬───────────────────────┘
                                                                  ▼
                                                         SQLite Database
```

### Why Hybrid Rule Engine + ML?

In healthcare, a pure black-box ML model is dangerous — a false negative on a danger sign (e.g. a pregnant woman with severe bleeding) **cannot** be tolerated. So the system uses:

1. **Rule Engine** (`app/ml/risk_rules.py`) — deterministic, explainable thresholds inspired by WHO/ICMR ANC and IMNCI guidelines. These **always fire** regardless of what the ML model predicts.
2. **ML Model** (`app/ml/predict.py`) — a `RandomForestClassifier` trained on synthetic data to catch combinations of risk factors the rules don't explicitly enumerate, producing a continuous confidence score for triage ordering.
3. **Combined Engine** (`app/ml/engine.py`) — takes the **maximum severity** of the two. The ML model can *escalate* a case the rules missed, but can **never downgrade** a rule-based critical flag. This is the key safety guarantee.

---

## Project Structure

```
asha-copilot/
│
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application entry point, CORS, static mounts
│   │   ├── database.py                 # SQLAlchemy engine, session, base
│   │   ├── schemas.py                  # Pydantic v2 request/response models
│   │   ├── models/
│   │   │   └── db_models.py            # SQLAlchemy ORM tables (Patient, Visit, Referral, FollowUp)
│   │   ├── routers/
│   │   │   ├── patients.py             # Patient CRUD + stats + search
│   │   │   ├── visits.py               # Visit recording + hybrid risk assessment
│   │   │   └── referrals_followups.py  # Referral & follow-up management
│   │   ├── ml/
│   │   │   ├── risk_rules.py           # Deterministic clinical rule engine (explainable)
│   │   │   ├── train_model.py          # Synthetic data generation + model training
│   │   │   ├── predict.py              # ML inference wrapper
│   │   │   ├── engine.py               # Combines rules + ML into final assessment
│   │   │   └── model.pkl               # Trained model bundle (generated, git-ignored)
│   │   └── utils/
│   │       └── referral_pdf.py         # PDF referral letter generator (ReportLab)
│   ├── data/
│   │   └── synthetic_sample.csv        # 200-row sample of training data (for transparency)
│   ├── referrals/                      # Generated referral PDFs land here (git-ignored)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── index.jsx                   # Full React SPA — all screens and components
│   │   └── index.css                   # Full design system (CSS custom properties, animations)
│   ├── public/
│   │   ├── manifest.json               # PWA manifest (installable on phone)
│   │   └── sw.js                       # Service worker (offline support)
│   ├── index.html                      # HTML template (Google Fonts, PWA meta)
│   ├── package.json
│   └── vite.config.js
│
└── demo-preview/
    └── AshaCopilotDemo.jsx             # Standalone demo component
```

---

## Features

### 🏠 Home Dashboard
- Live stat cards: Total Patients, Critical Risk, Pending Referrals, Overdue Follow-ups, Upcoming Follow-ups, High Risk Total
- Overdue follow-up alerts panel
- Recent patients quick-access panel
- API connectivity status indicator (animated green dot)
- Quick action buttons (Register Patient, View All Patients)

### 👥 Patient Management
- Register new patients with full medical profile
  - Personal details (name, age, gender, village, phone, address)
  - Medical flags: pregnant, child under 5, existing diabetes, existing hypertension
  - Auto-sets `is_child = true` when age < 5
- Searchable patient list — search by name, village, or ASHA worker name
- Patient detail modal with:
  - Full profile summary with tags
  - Visit history timeline (last 5 visits)
  - Referral history with status and PDF download
  - Follow-up list with mark-as-done buttons
- Edit existing patient details via PATCH

### 🔬 Visit Recording & Risk Assessment
- Comprehensive vitals form:
  - Blood pressure (systolic/diastolic)
  - Blood sugar (mg/dL)
  - Hemoglobin (g/dL)
  - Temperature (°C)
  - Pulse rate (bpm)
  - Weight & Height with **live BMI calculator**
- **Pregnancy assessment** (if patient is flagged pregnant):
  - Trimester selection
  - ANC danger signs checklist with icons (7 signs)
- **Child assessment** (if patient is flagged as child < 5 years):
  - Age in months
  - MUAC (mid-upper arm circumference) for malnutrition screening
  - Diarrhea checkbox
- Freeform notes field

### 📊 Assessment Results
- Animated risk banner (LOW / MEDIUM / HIGH / CRITICAL) with pulse animation for critical
- ML confidence percentage display
- Rule-based vs ML model comparison
- Clinical flags sorted by severity — with color-coded cards
- AI model probability distribution bar chart
- Recorded vitals summary grid
- Auto-generated referral letter PDF link (when high/critical)

### 📅 Follow-ups Screen
- All follow-ups across all patients
- Tabbed view: Upcoming / Overdue / Done
- Day countdown badges ("Today", "In 3 days", "2 days ago")
- One-click mark-as-done

### 📄 Referrals Screen
- All referrals across all patients
- Filter by status: All / Pending / Acknowledged / Completed
- Acknowledge and mark-complete workflow
- PDF download links
- Color-coded by risk level

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18 (JSX, hooks) |
| **Build Tool** | Vite 5 |
| **Styling** | Vanilla CSS with CSS custom properties (design tokens) |
| **Backend Framework** | FastAPI 0.115+ |
| **ASGI Server** | Uvicorn with auto-reload |
| **Database** | SQLite (via SQLAlchemy 2.0) |
| **ORM** | SQLAlchemy 2.0 (declarative) |
| **Validation** | Pydantic 2.10+ |
| **ML** | scikit-learn 1.9 (RandomForestClassifier) |
| **Data Processing** | pandas 3, numpy 2 |
| **Model Serialization** | joblib |
| **PDF Generation** | ReportLab 4.2 |
| **Python Version** | 3.14+ |
| **PWA** | manifest.json + Service Worker |
| **Fonts** | Inter (Google Fonts) |

---

## Getting Started

### Prerequisites

| Tool | Minimum Version | Check |
|---|---|---|
| Python | 3.11+ (tested on 3.14) | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 8+ | `npm --version` |

> **Windows note:** If PowerShell blocks script execution, run once:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

---

### Backend Setup

Open a terminal and run the following commands from the **`backend/`** directory:

```powershell
# 1. Navigate to backend
cd backend

# 2. Create a Python virtual environment
python -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\Activate.ps1          # PowerShell
# OR
venv\Scripts\activate                # Command Prompt (cmd.exe)

# 4. Install all Python dependencies
pip install -r requirements.txt

# 5. Train the ML model  ← only needed ONCE (creates app/ml/model.pkl)
python -m app.ml.train_model

# 6. Start the API server
python -m uvicorn app.main:app --reload --port 8000
```

**Backend is now running at:**
- 🌐 API: `http://localhost:8000`
- 📖 Interactive Swagger Docs: `http://localhost:8000/docs`
- 📖 ReDoc: `http://localhost:8000/redoc`
- ❤️ Health check: `http://localhost:8000/health`

> The SQLite database (`asha_copilot.db`) and `referrals/` folder are created automatically on first run.

---

### Frontend Setup

Open a **second terminal** and run:

```powershell
# 1. Navigate to frontend
cd frontend

# 2. Install Node.js dependencies
npm install

# 3. Start the development server
npm run dev
```

**Frontend is now running at:**
- 🌐 App: `http://localhost:5173`

> To point the frontend at a deployed backend instead of localhost, set the environment variable before running:
> ```powershell
> $env:VITE_API_BASE = "https://your-backend.example.com"
> npm run dev
> ```

---

## 🚀 Deploying on Render

The repository is pre-configured with a **`render.yaml` Blueprint** for 1-click deployment on [Render](https://render.com).

### ⚡ 1-Click Blueprint Deploy:
1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Blueprint**.
3. Connect your repository.
4. Render automatically detects `render.yaml` and deploys:
   - **`asha-copilot-backend`** (Python Web Service)
   - **`asha-copilot-frontend`** (Static Site with SPA client routing)
5. Click **Apply**!

📖 For full manual setup and environment variable configuration, see [**`RENDER_DEPLOY.md`**](file:///e:/asha-copilot/RENDER_DEPLOY.md).

---

## API Reference

All endpoints are documented interactively at `http://localhost:8000/docs`. Below is a summary:

### Patients — `/patients`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/patients/` | Register a new patient |
| `GET` | `/patients/` | List all patients (supports `?name=` and `?village=` filters) |
| `GET` | `/patients/stats` | Dashboard statistics (counts, risk summary) |
| `GET` | `/patients/{id}` | Get a specific patient |
| `PATCH` | `/patients/{id}` | Partially update patient details |

### Visits — `/visits`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/visits/{patient_id}/assess` | Record a visit & run full risk assessment |
| `GET` | `/visits/{patient_id}` | List all visits for a patient |
| `GET` | `/visits/detail/{visit_id}` | Get a specific visit |

### Referrals — `/referrals`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/referrals/all` | All referrals (supports `?status=` filter) |
| `GET` | `/referrals/{patient_id}` | All referrals for a patient |
| `GET` | `/referrals/detail/{id}` | Get a specific referral |
| `PATCH` | `/referrals/{id}/status` | Update status (`pending`/`acknowledged`/`completed`) |
| `GET` | `/referrals/pdf/{id}` | Get PDF filename + URL for a referral |

### Follow-ups — `/followups`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/followups/all` | All follow-ups (supports `?status=` and `?due_before=` filters) |
| `GET` | `/followups/{patient_id}` | All follow-ups for a patient |
| `PATCH` | `/followups/{id}/status` | Update status (`upcoming`/`done`/`missed`) |

### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | API health check |
| `GET` | `/` | API info |
| `GET` | `/referral-pdfs/{filename}` | Download a referral PDF |

---

## ML Model

### Algorithm
`RandomForestClassifier` with 200 estimators, max depth 10, class-weighted balancing.

### Training Data
6,000 synthetically generated patient-visit records, labeled by the rule engine with ±5% label noise to simulate real-world ambiguity.

### Features (16 total)

| Feature | Description |
|---|---|
| `age` | Patient age (years) |
| `systolic_bp` | Systolic blood pressure (mmHg) |
| `diastolic_bp` | Diastolic blood pressure (mmHg) |
| `blood_sugar_mg_dl` | Blood glucose (mg/dL) |
| `hemoglobin_g_dl` | Hemoglobin level (g/dL) |
| `temperature_c` | Body temperature (°C) |
| `pulse_bpm` | Pulse rate (bpm) |
| `bmi` | Body Mass Index |
| `existing_diabetes` | Boolean flag |
| `existing_hypertension` | Boolean flag |
| `is_pregnant` | Boolean flag |
| `trimester` | Pregnancy trimester (0, 1, 2, 3) |
| `pregnancy_danger_signs_count` | Count of ANC danger signs present |
| `is_child` | Boolean flag (age < 5) |
| `muac_cm` | Mid-upper arm circumference (cm) |
| `diarrhea` | Boolean flag |

### Performance (on 20% holdout)

| Class | Precision | Recall | F1 |
|---|---|---|---|
| low | 0.93 | 0.71 | 0.81 |
| medium | 0.92 | 0.92 | 0.92 |
| high | 0.76 | 0.95 | 0.85 |
| critical | 0.90 | 0.82 | 0.86 |
| **weighted avg** | **0.89** | **0.88** | **0.88** |

### Clinical Rules (deterministic, always fire)

| Category | Threshold | Severity |
|---|---|---|
| Blood pressure | ≥ 160/110 mmHg | Critical |
| Blood pressure | ≥ 140/90 mmHg | High |
| Blood pressure | < 90/60 mmHg | Medium |
| Blood sugar | ≥ 250 mg/dL | Critical |
| Blood sugar | ≥ 200 mg/dL | High |
| Blood sugar | ≥ 140 mg/dL | Medium |
| Blood sugar | < 70 mg/dL | High (hypoglycemia) |
| Hemoglobin | < 7 g/dL | Critical |
| Hemoglobin | < 9 g/dL | High |
| Hemoglobin | < 11 g/dL | Medium |
| Temperature | ≥ 40°C | Critical |
| Temperature | ≥ 38.5°C | Medium |
| Pulse | ≥ 130 or ≤ 40 bpm | High |
| Any ANC danger sign | present | Critical |
| MUAC | < 11.5 cm | Critical (SAM) |
| MUAC | < 12.5 cm | High (MAM) |
| BMI | < 16 | High |
| BMI | < 18.5 | Medium |

---

## Core Workflow

```
ASHA Worker opens app
        │
        ▼
   [Register Patient]  ─── or ───  [Search Existing Patient]
        │                                     │
        └──────────────┬──────────────────────┘
                       │
                       ▼
            [Record Visit & Vitals]
            (+ pregnancy / child section if applicable)
                       │
                       ▼
            [Hybrid Risk Engine runs]
            Rule Engine   +   ML Model
            → max severity wins
                       │
              ┌────────┴────────┐
              │                 │
         LOW / MEDIUM       HIGH / CRITICAL
              │                 │
         Show result    Auto-generate referral PDF
         No follow-up   Schedule follow-up (3 days critical,
                                            7 days high)
                                │
                         [Track in Follow-ups screen]
                         [Track in Referrals screen]
```

---

## Screens & UI

| Screen | Description |
|---|---|
| **Dashboard** | Live stats, overdue follow-ups, recent patients, quick actions |
| **Patients** | Searchable list with risk badges, condition tags, inline visit button |
| **Patient Detail** | Profile modal — visit timeline, referrals, follow-ups with mark-done |
| **Visit Form** | Structured vitals form with live BMI, danger signs, child section |
| **Assessment Result** | Animated risk banner, sorted flags, probability chart, vitals summary |
| **Follow-ups** | All follow-ups tabbed by Upcoming/Overdue/Done, one-click done |
| **Referrals** | All referrals filtered by status, acknowledge/complete workflow, PDF links |

### Design System

- **Font**: [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts)
- **Primary palette**: Deep teal (`#0D5C55`) with warm green accents
- **Risk colors**: Green (low) → Amber (medium) → Orange (high) → Red (critical)
- **Animations**: `slide-up` on page load, `pulse-critical` for urgent alerts, `pulse-green` for API status
- **Responsive**: Sidebar layout on desktop, bottom navigation bar on mobile
- **Dark mode**: Automatic via `prefers-color-scheme`
- **Reduced motion**: Respected via `prefers-reduced-motion`

---

## PWA Support

The app is a **Progressive Web App** — it can be installed on a smartphone like a native app:

1. Open `http://localhost:5173` on a mobile browser (Chrome/Edge/Safari)
2. Tap **"Add to Home Screen"**
3. The app installs with its own icon and launches fullscreen

**Service Worker** (`public/sw.js`) enables:
- Offline access to the shell
- Background sync when connectivity returns

**Manifest** (`public/manifest.json`) configures:
- App name and short name
- Theme color (`#0D5C55`)
- Display mode: `standalone`
- Icons

---

## Tested Scenarios

| Scenario | Expected | Result |
|---|---|---|
| Pregnant patient with BP 165/115 + "severe_headache" danger sign | `critical` + referral + 3-day follow-up | ✅ Correct |
| Child aged 2 with MUAC 10.8 cm + diarrhea | `critical` + referral | ✅ Correct |
| Healthy adult, all vitals normal | `low`, no referral, no follow-up | ✅ Correct |
| Patient with blood sugar 280 mg/dL | `critical` | ✅ Correct |
| Patient with hemoglobin 6.5 g/dL | `critical` (severe anemia) | ✅ Correct |
| Elderly patient (65y) with known hypertension | at least `medium` | ✅ Correct |

---

## Known Limitations & Roadmap

### Current Limitations (prototype)
- No authentication or authorization — API is open
- SQLite is single-writer only; not suitable for concurrent multi-user production use
- ML model trained entirely on **synthetic data** — not clinically validated
- No offline data entry (form data requires connectivity to submit)

### Roadmap to Production

**Security & Compliance**
- [ ] JWT/OAuth2 authentication
- [ ] Role-based access (ASHA worker vs supervisor vs PHC doctor)
- [ ] Data encryption at rest and in transit
- [ ] Audit logging for patient record access
- [ ] Compliance with India's DPDP Act 2023

**Data & ML**
- [ ] Replace synthetic training data with real de-identified data (requires ethics board)
- [ ] Clinical validation of thresholds against ICMR/WHO ANC & IMNCI protocols
- [ ] Model drift monitoring + periodic retraining pipeline

**Infrastructure**
- [ ] Migrate from SQLite → PostgreSQL for concurrent multi-user access
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Cloud deployment (AWS/GCP/Azure or NIC India)

**Mobile & Offline**
- [ ] Full offline-first data entry with background sync (IndexedDB + service worker)
- [ ] Wrap PWA in Capacitor or port to React Native/Expo for app store distribution
- [ ] Bluetooth integration for digital BP monitors

**Product**
- [ ] Multi-language support (Hindi + major regional languages)
- [ ] Supervisor/PHC dashboard — aggregated alerts across all ASHA workers in a block
- [ ] SMS/IVR fallback notifications for areas with no smartphone access
- [ ] Voice input for hands-free vitals entry in the field

---

## Disclaimer

> ⚠️ **This is an academic prototype for demonstration purposes only.**
>
> The ML model is trained on **synthetically generated** data using clinically-informed heuristics. It has **not** been validated against real patient data, reviewed by a clinical board, or approved by any regulatory body (CDSCO, ICMR, etc.).
>
> **Do not use this system for real clinical decision-making.** A production deployment would require:
> - Ethically sourced, de-identified real patient data
> - Clinical validation against ICMR/WHO ANC and IMNCI guidelines
> - Sign-off from a qualified medical advisory board
> - Regulatory review under the Medical Devices Rules, 2017 (India)
> - Compliance with the Digital Personal Data Protection (DPDP) Act, 2023

---

<div align="center">
  <p>Built as an academic prototype to demonstrate AI/ML in rural healthcare 🏥</p>
  <p><strong>ASHA Co-pilot v1.0.0</strong></p>
</div>
