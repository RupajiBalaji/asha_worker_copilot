<div align="center">

<img src="https://img.shields.io/badge/🏥_ASHA_WORKER-AI_CO--PILOT-0D5C55?style=for-the-badge&labelColor=0a4a44" alt="ASHA Worker AI Co-pilot"/>

<br/>
<br/>

**AI-powered healthcare assistant for India's 1 million+ frontline ASHA workers**
*Voice-enabled · Real-time risk assessment · Auto referrals · Built for rural India 🇮🇳*

<br/>

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Frontend-0D5C55?style=for-the-badge)](https://asha-copilot-frontend.onrender.com)
[![API Docs](https://img.shields.io/badge/📖_API_Docs-Swagger-009688?style=for-the-badge)](https://asha-copilot-backend.onrender.com/docs)
[![Backend](https://img.shields.io/badge/⚡_Backend-Live-22c55e?style=for-the-badge)](https://asha-copilot-backend.onrender.com)

<br/>

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Render](https://img.shields.io/badge/Deployed_on-Render-46E3B7?logo=render&logoColor=black)](https://render.com)

</div>

---

## 🔗 Live Links

| Service | URL | Description |
|---------|-----|-------------|
| 🌐 **Frontend App** | [asha-copilot-frontend.onrender.com](https://asha-copilot-frontend.onrender.com) | Full React PWA — mobile-ready |
| ⚡ **Backend API** | [asha-copilot-backend.onrender.com](https://asha-copilot-backend.onrender.com) | FastAPI + PostgreSQL |
| 📖 **Swagger Docs** | [.../docs](https://asha-copilot-backend.onrender.com/docs) | Interactive API explorer |
| ❤️ **Health Check** | [.../health](https://asha-copilot-backend.onrender.com/health) | Live status |

> [!NOTE]
> Free tier services spin down after 15 minutes of inactivity. First load may take ~30 seconds to wake up.

---

## 📋 Table of Contents

- [What is ASHA Co-pilot?](#-what-is-asha-co-pilot)
- [Worker Profiles & Manager Oversight](#-worker-profiles--manager-oversight)
- [Key Features](#-key-features)
- [AI Voice Copilot](#-ai-voice-copilot)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [ML Risk Engine](#-ml-risk-engine)
- [Project Structure](#-project-structure)
- [Getting Started (Local Dev)](#-getting-started-local-dev)
- [Deploy on Render](#-deploy-on-render)
- [API Reference](#-api-reference)
- [Screens & UI](#-screens--ui)
- [Clinical Rules](#-clinical-rules)
- [Tested Scenarios](#-tested-scenarios)
- [Roadmap](#-roadmap)
- [Disclaimer](#-disclaimer)

---

## 🏥 What is ASHA Co-pilot?

**ASHA (Accredited Social Health Activist)** workers are India's frontline community health heroes — over **1 million strong** — responsible for maternal and child health monitoring across rural villages. They work in low-connectivity environments with no clinical decision support.

**ASHA Co-pilot** gives them a powerful AI assistant that works on any mobile browser:

```
ASHA Worker speaks into phone  →  AI extracts patient details  →  System assesses risk
        ↓                                                                  ↓
Auto-registers patient                                    Generates referral PDF + schedules follow-up
```

| Problem | Solution |
|---------|----------|
| 📝 Manual paper registers | Digital patient database with search |
| 🔬 No clinical decision support | Hybrid Rule Engine + ML risk assessment |
| 🗣️ Literacy & language barriers | Voice input in 8 Indian languages |
| 📄 Handwritten referral letters | Auto-generated PDF referral letters |
| 📅 Missed follow-up visits | Automated follow-up scheduling & reminders |
| ❓ Answering demographic queries | AI chatbot with live clinic database intelligence |

---

## 👥 Worker Profiles & Manager Oversight

The system provides **Role-Based Profiles** with pre-configured static logins for frontline ASHA workers and PHC Health Supervisors / Medical Officers.

### 🔑 Static Demo Login Accounts

| Role | Name | Username | Password | Worker ID | Assigned Sector / Village | Key Responsibility |
|------|------|----------|----------|-----------|---------------------------|--------------------|
| 👩🏽‍⚕️ **ASHA Worker 1** | **Asha Devi** | `asha1` | `password123` / `asha123` | `ASHA-101` | Palani | Maternal & Child Health, ANC visits |
| 👩🏾‍⚕️ **ASHA Worker 2** | **Lakshmi R** | `asha2` | `password123` / `asha123` | `ASHA-102` | Vadapalani | High-risk screening, door-to-door vitals |
| 👩🏻‍⚕️ **ASHA Worker 3** | **Meena Kumari** | `asha3` | `password123` / `asha123` | `ASHA-103` | Kancheepuram | Immunization, child malnutrition triage |
| 👨🏽‍⚕️ **PHC Manager / Supervisor** | **Dr. Rajesh Sharma** | `manager` | `admin123` | `MOIC-501` | All Block Sectors (HQ) | Block-level clinical audit, work efficiency |

> ⚡ **1-Click Quick Switcher**: Click the profile chip in the top navigation or sidebar to switch between any worker and manager role in a single click without typing passwords during demonstrations!

---

### 📊 Managerial Oversight & Work Efficiency System

Built specifically for **PHC Medical Officers and Block Health Supervisors** to monitor frontline workers:

1. **Live Clinical Entry Audit Stream**:
   - Real-time chronological audit of every entry logged by ASHA workers in the field.
   - Filter by specific ASHA worker, action type (*Visits & Vitals* vs *Patient Registrations*), or risk level (*Critical*, *High*, *Normal*).
   - Instant visibility into patient vitals, clinical danger signs, and referrals generated.

2. **ASHA Worker Efficiency Leaderboard & Scorecards**:
   - **Patient Coverage**: Number of registered community patients actively managed by each worker.
   - **Visit Quota Progress**: Tracks monthly field consultation progress against targets (e.g. 29/35 visits completed with progress meter).
   - **Danger Sign Interceptions**: High-risk and critical maternal/pediatric cases flagged and referred to higher health centers.
   - **Follow-up Compliance Rate**: Measures on-time follow-up completion percentage (*Done vs Overdue*).
   - **Composite Efficiency Index**: Automated 0–100% performance rating (*⭐ High Performer*, *🟢 On Track*, *⚠️ Needs Follow-up*).

3. **Individual Worker Drilldown**:
   - Inspect all patient records, recent consultations, and pending follow-ups assigned to any worker.

4. **ASHA Worker Experience**:
   - When logged in, patient registration forms auto-fill with the worker's name.
   - Dedicated *"My Sector Patients"* filter view on the Patients screen.
   - Personal *"My Profile"* modal with personal target tracking.

---

## ✨ Key Features

### 🏠 Live Dashboard
- Real-time stat cards: Total Patients · Critical Risk · Pending Referrals · Overdue Follow-ups
- Overdue follow-up alert panel
- Recent patients quick-access
- API connectivity status (animated green dot)

### 👥 Patient Management
- Full patient registration (name, age, gender, village, phone, medical flags)
- Pregnancy, diabetes, hypertension, child-under-5 tracking
- Searchable list — filter by name, village, or ASHA worker
- Patient detail modal: visit timeline · referral history · follow-ups · edit profile

### 🔬 Visit Recording & Risk Assessment
- Complete vitals form: BP · Blood sugar · Hemoglobin · Temperature · Pulse · BMI (live calculator)
- Pregnancy danger signs checklist (7 ANC signs)
- Child malnutrition screening (MUAC)
- **Instant risk output** — LOW / MEDIUM / HIGH / CRITICAL with animated banner
- ML confidence score + clinical flags sorted by severity
- Probability distribution chart

### 📄 Referrals & Follow-ups
- Auto-generated referral letter PDFs for HIGH/CRITICAL cases
- Referral status tracking: Pending → Acknowledged → Completed
- Follow-up tabs: Upcoming · Overdue · Done
- Day countdown badges ("Today", "In 3 days", "2 days ago")
- One-click mark-as-done

---

## 🎙️ AI Voice Copilot

The app features a full **AI Voice + Chat assistant** powered by Gemini AI with multi-key rotation for reliability.

### Voice Features
| Feature | Detail |
|---------|--------|
| 🌐 **8 Indian Languages** | Hindi · English · Telugu · Tamil · Marathi · Bengali · Kannada · Gujarati |
| 🎤 **Speech-to-Text** | Web Speech API (browser-native, no API cost) |
| 🔊 **Text-to-Speech** | TTS confirmation after every AI action |
| 🤖 **AI Extraction** | Gemini extracts patient details from natural speech |
| 📝 **Auto-Registration** | Say patient details aloud → auto-fills registration form |
| 🚨 **Emergency SOS** | One-tap emergency dispatch button |

### Chat Intelligence
- **Clinic Database Queries** — Ask anything: *"How many pregnant women in Palani village?"* · *"Show critical risk patients"* · *"How many male patients do we have?"*
- **Zero-latency local responses** for demographic/stats questions (no API call needed)
- **Gemini AI responses** for complex clinical and general health questions
- **Multi-key rotation** across 6 Gemini API keys with 60s cooldown on rate limits
- Floating chat pill button accessible from every screen

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐      HTTPS      ┌───────────────────────────────────────┐
│      React PWA (Vite + JSX)         │ ─────────────►  │       FastAPI Backend                 │
│                                     │                  │                                       │
│  ┌─────────┐  ┌──────────────────┐  │                  │  ┌─────────────┐  ┌───────────────┐  │
│  │Dashboard│  │ Patient / Visit  │  │                  │  │ Rule Engine │  │  ML Model     │  │
│  │ Screen  │  │   Forms          │  │                  │  │ (WHO/ICMR)  │  │ RandomForest  │  │
│  └─────────┘  └──────────────────┘  │                  │  └──────┬──────┘  └──────┬────────┘  │
│  ┌──────────────────────────────┐   │                  │         └────────┬─────────┘          │
│  │  🎙️ AI Voice Copilot         │   │                  │                  ▼                    │
│  │  (STT + Gemini + TTS)        │   │                  │    Combined Risk Assessment            │
│  └──────────────────────────────┘   │                  │    (max severity wins)                │
│  ┌──────────────────────────────┐   │                  │                  │                    │
│  │  💬 AI Chat (Clinic DB Intel) │   │                  │    ┌─────────────┴──────────────┐     │
│  └──────────────────────────────┘   │                  │    ▼                            ▼     │
└─────────────────────────────────────┘                  │ Referral PDF           Follow-up      │
                                                         │ (ReportLab)            Scheduling     │
                                                         └───────────────────────────────────────┘
                                                                         │
                                                                         ▼
                                                             PostgreSQL (Render)
                                                         patients · visits · referrals · followups
```

### Why Hybrid Rule Engine + ML?

In healthcare, a pure black-box ML model is dangerous. A false negative on a danger sign (e.g. a pregnant woman with severe bleeding) **cannot** be tolerated.

| Component | Role | Safety Property |
|-----------|------|-----------------|
| **Rule Engine** (`risk_rules.py`) | Deterministic WHO/ICMR ANC & IMNCI thresholds | Always fires — can never be overridden |
| **ML Model** (`predict.py`) | RandomForest catches combinations rules miss | Can only *escalate*, never downgrade |
| **Combined Engine** (`engine.py`) | Takes **max severity** of both | Safety guarantee: rules are a hard floor |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite 5 | SPA with fast HMR dev |
| **Styling** | Vanilla CSS (design tokens) | Zero runtime overhead |
| **Backend** | FastAPI 0.115+ | Async REST API |
| **ASGI Server** | Uvicorn | Production ASGI |
| **Database** | PostgreSQL 18 (Render) | Cloud-persistent storage |
| **ORM** | SQLAlchemy 2.0 | DB-agnostic models |
| **Validation** | Pydantic 2.10+ | Request/response schemas |
| **ML** | scikit-learn (RandomForest) | Clinical risk classification |
| **Data** | pandas + numpy | Feature engineering |
| **PDF** | ReportLab 4.2 | Referral letter generation |
| **AI/LLM** | Google Gemini API | Voice extraction + chat |
| **STT** | Web Speech API | Browser-native, free |
| **TTS** | SpeechSynthesis API | Browser-native, free |
| **PWA** | manifest.json + Service Worker | Installable on phone |
| **Deployment** | Render (Blueprint) | 1-click cloud deploy |

---

## 🤖 ML Risk Engine

### Algorithm
`RandomForestClassifier` — 200 estimators, max depth 10, class-weighted balancing.

### Training Data
**6,000 synthetically generated** patient-visit records, labeled by the rule engine with ±5% noise to simulate real-world ambiguity.

### 16 Input Features

| Feature | Description |
|---------|-------------|
| `age` | Patient age (years) |
| `systolic_bp` / `diastolic_bp` | Blood pressure (mmHg) |
| `blood_sugar_mg_dl` | Blood glucose level |
| `hemoglobin_g_dl` | Hemoglobin (g/dL) |
| `temperature_c` | Body temperature (°C) |
| `pulse_bpm` | Pulse rate |
| `bmi` | Body Mass Index |
| `existing_diabetes` / `existing_hypertension` | Comorbidity flags |
| `is_pregnant` + `trimester` | Pregnancy status |
| `pregnancy_danger_signs_count` | Count of ANC danger signs |
| `is_child` + `muac_cm` | Malnutrition screening |
| `diarrhea` | Child diarrhea flag |

### Model Performance (20% holdout)

| Risk Class | Precision | Recall | F1 |
|------------|-----------|--------|----|
| low | 0.93 | 0.71 | 0.81 |
| medium | 0.92 | 0.92 | 0.92 |
| high | 0.76 | 0.95 | 0.85 |
| critical | 0.90 | 0.82 | 0.86 |
| **weighted avg** | **0.89** | **0.88** | **0.88** |

---

## 📁 Project Structure

```
asha-copilot/
│
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app, CORS, static mounts
│   │   ├── database.py                # SQLAlchemy engine + dotenv loader
│   │   ├── schemas.py                 # Pydantic v2 request/response models
│   │   ├── models/
│   │   │   └── db_models.py           # ORM tables: Patient, Visit, Referral, FollowUp
│   │   ├── routers/
│   │   │   ├── patients.py            # Patient CRUD + stats + search
│   │   │   ├── visits.py              # Visit recording + hybrid risk assessment
│   │   │   ├── chatbot.py             # Gemini AI chat + DB intelligence + key rotation
│   │   │   └── referrals_followups.py # Referrals & follow-up management
│   │   ├── ml/
│   │   │   ├── risk_rules.py          # Deterministic WHO/ICMR rule engine
│   │   │   ├── train_model.py         # Synthetic data + model training
│   │   │   ├── predict.py             # ML inference wrapper
│   │   │   └── engine.py              # Rule + ML combined engine
│   │   └── utils/
│   │       └── referral_pdf.py        # PDF referral letter (ReportLab)
│   ├── seed_data.py                   # Seeds 153 demo patients
│   ├── render-build.sh                # Render build script
│   ├── requirements.txt
│   └── .env.example                   # Environment variable template
│
├── frontend/
│   ├── src/
│   │   ├── index.jsx                  # Full React SPA — all screens & components
│   │   ├── index.css                  # Design system (CSS tokens, animations)
│   │   ├── VoiceChatbot.jsx           # AI Voice + Chat assistant component
│   │   └── VoiceFormCopilot.jsx       # In-form voice fill component
│   ├── public/
│   │   ├── manifest.json              # PWA manifest
│   │   └── sw.js                      # Service worker
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── render.yaml                        # Render Blueprint (1-click deploy)
└── README.md
```

---

## 🚀 Getting Started (Local Dev)

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 8+ | `npm --version` |

### 1. Clone the repository

```bash
git clone https://github.com/RupajiBalaji/asha_worker_copilot.git
cd asha_worker_copilot
```

### 2. Backend Setup

```powershell
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1       # PowerShell
# venv\Scripts\activate           # CMD

# Install dependencies
pip install -r requirements.txt

# Train ML model (once — creates app/ml/model.pkl)
python -m app.ml.train_model

# Seed demo data (optional — 153 patients across 21 villages)
python seed_data.py

# Start the API server
python -m uvicorn app.main:app --reload --port 8000
```

**Backend running at:**
| URL | Description |
|-----|-------------|
| `http://localhost:8000` | API root |
| `http://localhost:8000/docs` | Swagger interactive docs |
| `http://localhost:8000/health` | Health check |

### 3. Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

**Frontend running at:** `http://localhost:5173`

> To connect to a deployed backend:
> ```powershell
> $env:VITE_API_BASE = "https://asha-copilot-backend.onrender.com"
> npm run dev
> ```

---

## ☁️ Deploy on Render

The repo ships with a **`render.yaml` Blueprint** for 1-click deployment.

### What gets deployed

| Resource | Type | Details |
|----------|------|---------|
| `asha-copilot-db` | PostgreSQL | Auto-created, auto-connected |
| `asha-copilot-backend` | Web Service (Python) | FastAPI + Uvicorn |
| `asha-copilot-frontend` | Static Site | React + Vite |

### Steps

1. Fork / push this repo to your GitHub
2. Go to **[dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)** → **New Blueprint Instance**
3. Connect your repository → Render detects `render.yaml`
4. Set `VITE_API_BASE` = your backend URL after deploy
5. Click **Apply** — done! 🎉

> **DATABASE_URL** is automatically injected from the Render PostgreSQL database — no manual configuration needed.

---

## 📡 API Reference

Full interactive docs: **[asha-copilot-backend.onrender.com/docs](https://asha-copilot-backend.onrender.com/docs)**

### Patients `/patients`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/patients/` | Register a new patient |
| `GET` | `/patients/` | List all (supports `?name=` `?village=`) |
| `GET` | `/patients/stats` | Dashboard statistics |
| `GET` | `/patients/{id}` | Get a patient |
| `PATCH` | `/patients/{id}` | Update patient details |

### Visits `/visits`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/visits/{patient_id}/assess` | Record visit + run risk assessment |
| `GET` | `/visits/{patient_id}` | Visit history for a patient |
| `GET` | `/visits/detail/{visit_id}` | Specific visit detail |

### Referrals `/referrals`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/referrals/all` | All referrals (`?status=` filter) |
| `PATCH` | `/referrals/{id}/status` | Update status |
| `GET` | `/referrals/pdf/{id}` | PDF download URL |

### Follow-ups `/followups`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/followups/all` | All follow-ups (`?status=` filter) |
| `PATCH` | `/followups/{id}/status` | Mark done/missed |

### AI Chatbot `/chatbot`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chatbot/chat` | Send message, get AI response with DB context |

---

## 🖥️ Screens & UI

| Screen | What it does |
|--------|-------------|
| **🏠 Dashboard** | Live stats, overdue alerts, recent patients, quick actions |
| **👥 Patients** | Searchable list with risk badges, condition tags, visit button |
| **📋 Patient Detail** | Visit timeline, referral history, follow-ups, edit profile |
| **🔬 Visit Form** | Vitals, live BMI, pregnancy danger signs, child MUAC |
| **📊 Assessment Result** | Animated risk banner, sorted flags, probability chart |
| **📅 Follow-ups** | Tabbed Upcoming/Overdue/Done, countdown badges, one-click done |
| **📄 Referrals** | Status filters, acknowledge/complete workflow, PDF links |
| **🎙️ AI Voice Copilot** | Full-page voice workspace with chat history |

### Design System
- **Font**: Inter (Google Fonts)
- **Primary**: Deep teal `#0D5C55` with warm green accents
- **Risk colors**: 🟢 Low → 🟡 Medium → 🟠 High → 🔴 Critical
- **Responsive**: Sidebar on desktop · Bottom nav on mobile
- **Dark mode**: Auto via `prefers-color-scheme`

---

## 🏥 Clinical Rules

| Vital | Threshold | Severity |
|-------|-----------|----------|
| Blood Pressure | ≥ 160/110 mmHg | 🔴 Critical |
| Blood Pressure | ≥ 140/90 mmHg | 🟠 High |
| Blood Pressure | < 90/60 mmHg | 🟡 Medium |
| Blood Sugar | ≥ 250 mg/dL | 🔴 Critical |
| Blood Sugar | ≥ 200 mg/dL | 🟠 High |
| Blood Sugar | < 70 mg/dL | 🟠 High (hypoglycemia) |
| Hemoglobin | < 7 g/dL | 🔴 Critical (severe anemia) |
| Hemoglobin | < 9 g/dL | 🟠 High |
| Temperature | ≥ 40°C | 🔴 Critical |
| Pulse | ≥ 130 or ≤ 40 bpm | 🟠 High |
| Any ANC Danger Sign | present | 🔴 Critical |
| MUAC | < 11.5 cm | 🔴 Critical (SAM) |
| MUAC | < 12.5 cm | 🟠 High (MAM) |
| BMI | < 16 | 🟠 High |

---

## ✅ Tested Scenarios

| Scenario | Expected Output | Status |
|----------|----------------|--------|
| Pregnant patient BP 165/115 + severe headache | Critical + referral + 3-day follow-up | ✅ |
| Child age 2, MUAC 10.8 cm + diarrhea | Critical + referral | ✅ |
| Healthy adult, all vitals normal | Low — no referral, no follow-up | ✅ |
| Blood sugar 280 mg/dL | Critical | ✅ |
| Hemoglobin 6.5 g/dL | Critical (severe anemia) | ✅ |
| Elderly (65y) with known hypertension | At least Medium | ✅ |
| Voice: "Register Priya Sharma, 28, pregnant, Palani village" | Patient auto-registered | ✅ |
| Chat: "How many pregnant women in Ramnagar?" | Instant DB query response | ✅ |

---

## 🗺️ Roadmap

### Security & Compliance
- [ ] JWT/OAuth2 authentication
- [ ] Role-based access (ASHA worker · Supervisor · PHC doctor)
- [ ] Data encryption at rest
- [ ] DPDP Act 2023 compliance

### AI & ML
- [ ] Replace synthetic data with real de-identified data (ethics board required)
- [ ] Clinical validation against ICMR/WHO ANC & IMNCI protocols
- [ ] Model drift monitoring + retraining pipeline
- [ ] Offline AI inference (on-device model)

### Mobile & Offline
- [ ] Full offline-first data entry (IndexedDB + background sync)
- [ ] Capacitor wrapper for app store distribution
- [ ] Bluetooth integration for digital BP monitors

### Product
- [ ] Supervisor/PHC dashboard — aggregated view across ASHA workers
- [ ] SMS/IVR fallback for areas with no smartphone
- [ ] Push notifications for overdue follow-ups

---

## ⚠️ Disclaimer

> This is an **academic prototype for demonstration purposes only.**
>
> The ML model is trained on **synthetically generated** data using clinically-informed heuristics. It has **not** been validated against real patient data, reviewed by a clinical board, or approved by any regulatory body (CDSCO, ICMR, etc.).
>
> **Do not use this system for real clinical decision-making.**

---

<div align="center">

Built with ❤️ to support India's frontline healthcare heroes

**[🌐 Live App](https://asha-copilot-frontend.onrender.com)** · **[📖 API Docs](https://asha-copilot-backend.onrender.com/docs)** · **[⭐ Star on GitHub](https://github.com/RupajiBalaji/asha_worker_copilot)**

<br/>

*ASHA Co-pilot v1.0.0 — AI-powered healthcare for rural India 🏥🇮🇳*

</div>
