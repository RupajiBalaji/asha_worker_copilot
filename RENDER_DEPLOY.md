# 🚀 Deploying ASHA Co-pilot on Render

This project is partitioned into a clean monorepo structure with `/backend` and `/frontend`, pre-configured for instant deployment on [Render](https://render.com).

```
asha-copilot/
├── backend/          # FastAPI Python Web Service
├── frontend/         # React + Vite Static Site
├── render.yaml       # Render Blueprint (Infrastructure-as-Code)
└── RENDER_DEPLOY.md  # Deployment instructions
```

---

## ⚡ Method 1: 1-Click Render Blueprint (Recommended)

Render Blueprints automatically deploy **both the Backend Web Service and Frontend Static Site** together, wiring the API URLs automatically.

### Steps:

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Configure repo for Render deployment"
   git push origin main
   ```

2. **Log into [Render Dashboard](https://dashboard.render.com/)**.

3. Click **New +** in the top right and select **Blueprint**.

4. Connect your GitHub repository (`asha_worker_copilot` or your repo name).

5. Render will automatically detect `render.yaml` and prompt you to create:
   - 🌐 **`asha-copilot-backend`** (Web Service, Python)
   - 📱 **`asha-copilot-frontend`** (Static Site)

6. (Optional) Set your `GEMINI_API_KEY` under Environment Variables if you want to use your personal Gemini API key (a default fallback key is already included in the code).

7. Click **Apply**. Render will build and deploy both services automatically!

---

## 🛠️ Method 2: Manual Deployment (Step-by-Step)

If you prefer to create the backend and frontend services individually on Render, follow these steps:

### Step A: Deploy the Backend (Web Service)

1. On the Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Name**: `asha-copilot-backend`
   - **Region**: Any (e.g., `Oregon (US West)` or `Singapore`)
   - **Branch**: `main`
   - **Root Directory**: `backend`  ⚠️ *(Crucial!)*
   - **Runtime**: `Python 3`
   - **Build Command**: `bash ./render-build.sh`  
     *(or: `pip install -r requirements.txt && python -m app.ml.train_model`)*
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
4. Under **Advanced -> Environment Variables**, add:
   - `PYTHON_VERSION`: `3.11.9`
   - `ALLOWED_ORIGINS`: `*`
   - `GEMINI_API_KEY`: *(your Gemini key, optional)*
5. Click **Deploy Web Service**.
6. Once deployed, note down your backend URL:  
   `https://asha-copilot-backend-xxxx.onrender.com`

---

### Step B: Deploy the Frontend (Static Site)

1. On the Render Dashboard, click **New +** -> **Static Site**.
2. Connect the same GitHub repository.
3. Configure the following settings:
   - **Name**: `asha-copilot-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`  ⚠️ *(Crucial!)*
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Advanced -> Environment Variables**, add:
   - `VITE_API_BASE`: `https://asha-copilot-backend-xxxx.onrender.com`  
     *(replace with your actual backend URL from Step A)*
5. Under **Redirects / Rewrites** (or via `public/_redirects` already included):
   - Type: `Rewrite`
   - Source: `/*`
   - Destination: `/index.html`
6. Click **Create Static Site**.

---

## ✅ Verifying Your Deployment

1. **Backend Health Check**:
   Visit `https://<your-backend>.onrender.com/health` -> should return `{"status": "ok", "version": "1.0.0"}`.
   Interactive API documentation is at `https://<your-backend>.onrender.com/docs`.

2. **Frontend App**:
   Visit `https://<your-frontend>.onrender.com` -> The full ASHA Worker Co-pilot Dashboard, Patient Management, AI Multilingual Voice Chatbot, and Emergency SOS features will be live!

---

## 💡 Troubleshooting & Notes

- **Cold Starts on Free Tier**: Render's free web services spin down after 15 minutes of inactivity. The first request after sleep may take ~30-50 seconds to boot up.
- **Database Persistence**: By default, the backend uses SQLite (`asha_copilot.db`). If you need persistent data across free-tier restarts, you can create a free **PostgreSQL database** on Render and paste its `Internal Database URL` as `DATABASE_URL` in the backend service environment variables. The backend automatically detects and connects to PostgreSQL.
- **Client-Side Routing (SPA 404s)**: Handled automatically by `frontend/public/_redirects` (`/* /index.html 200`).
