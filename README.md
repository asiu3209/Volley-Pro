# VolleyPro

VolleyPro is a web application for **volleyball technique feedback**. Athletes upload a short clip, select the skill type, and draw a box around the player to analyze. The backend sends the **marked first frame** and **full video** to **Google Gemini**, compares against optional reference imagery, and returns structured coaching output (scores, strengths, weaknesses, timeline notes, and drill-style recommendations).

The default product path is **full-video LLM analysis**—not a hosted training of custom vision models.

---

## Architecture

| Layer | Stack |
|--------|--------|
| **Frontend** | Next.js (App Router), React, TypeScript, Tailwind CSS |
| **Backend** | Python 3, FastAPI, Uvicorn |
| **Data** | Supabase (Postgres + auth-aligned tables used in code) |
| **AI** | Google Gemini (`google-genai`), Files API for video where supported |
| **Video / CV** | OpenCV (preview JPEG + upload handling) |

Typical deployment: **frontend on Vercel**, **API on Railway** (or any container/host with enough RAM for video + SDK). **Video uploads** go **directly** from the browser to `POST /videos/upload` on the API host (`NEXT_PUBLIC_API_URL`), not through Vercel serverless (payload limits).

---

## Features

- Video upload with first-frame preview for athlete selection  
- Bounding box on preview; server composites a marked JPEG for Gemini  
- Skill/action type selection aligned with reference image sets  
- Full-clip Gemini analysis + JSON-shaped coaching response  
- Dashboard UI for summarized results  

---

## Repository layout

```
volleyPro/
├── frontend/          # Next.js app
├── backend/           # FastAPI app (Python package `app`)
│   └── railway.toml   # Single-worker deploy hint for small instances
└── README.md
```

---

## Prerequisites

- **Node.js** 18+ (see `frontend/package.json` for exact tooling)  
- **Python** 3.10+ (3.12 recommended; match your deployment image)  

---

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create **`backend/.env`** (or export in your host) with at least:

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Google AI Studio / Gemini API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service or anon key (as used by your app) |
| `REFERENCE_IMAGE_BUCKET` | Supabase Storage bucket for skill reference stills |
| `REFERENCE_IMAGE_EXT` | e.g. `png` |
| `REFERENCE_IMAGE_COUNT` | Number of reference files per skill |
| `REFERENCE_IMAGE_CACHE_TTL_SECONDS` | Local cache TTL for reference downloads |
| `VOLLEY_DEMO_USER_ID` | Fallback UUID for submissions when `X-User-Id` is absent (has a safe default in code) |

Optional tuning (see code for defaults):

- `FRAMES_DIR` — directory for uploaded videos and preview JPEGs (default `frames`)  
- `VOLLEY_MAX_UPLOAD_MB` — max upload size (default `48`)  
- `CORS_ORIGINS` — comma-separated allowed origins  
- `GEMINI_FILE_READY_TIMEOUT_SEC`, `GEMINI_FILE_POLL_INTERVAL_SEC` — Files API polling  
- `VOLLEY_DELETE_LOCAL_MEDIA_AFTER_ANALYZE` — delete local video/preview after successful analyze (`true` / `false`)  

Run locally:

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check: `GET /health`

---

## Frontend setup

```bash
cd frontend
npm install
```

Create **`frontend/.env.local`**:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Public FastAPI base URL (e.g. `http://localhost:8000`) — **required** for browser uploads, preview images, and `GET /videos/action-types` |
| `INTERNAL_API_URL` | Server-side proxy target for Next.js `app/api/*` routes that call the backend (Vercel → Railway); often same as public URL in dev |
| `JWT_SECRET` | Signs app JWTs after Supabase email/password login |
| `NEXT_PUBLIC_VOLLEY_MAX_UPLOAD_MB` | Should match `VOLLEY_MAX_UPLOAD_MB` on the API |

Run:

```bash
npm run dev
```

(Default dev port in this repo is **3001** per `package.json`.)

---

## Primary API surface (FastAPI)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/videos/upload` | Multipart video upload; returns `video_id`, `video_filename`, `preview_frame` |
| `GET` | `/videos/action-types` | Skill options for the UI |
| `POST` | `/videos/analyze` | JSON: video id, filename, preview path, bbox fractions, optional `action_type` |
| `GET` | `/users/stats` | Query: `user_id` — dashboard aggregates |
| `GET` | `/users/videos` | Query: `user_id` — recent submissions |
| `GET` | `/users/skill-stats` | Query: `user_id` — per-skill averages |

Additional routes for user/profile creation live under the same routers in `backend/app/api/` (see FastAPI `/docs` when the server is running).

Next.js routes under `frontend/app/api/*` (e.g. `/api/analyze`, `/api/users/*`) forward **JSON** to the backend using **`INTERNAL_API_URL`**. Large **multipart** uploads use **`NEXT_PUBLIC_API_URL`** from the browser only.

---

## Deployment notes

- **Railway / small RAM:** keep **one** Uvicorn worker; prefer the **Gemini Files API** path for video (see `app/services/gemini.py`) instead of holding full-file byte buffers when possible.  
- **Vercel:** do not send large multipart bodies to Next serverless routes; use **`NEXT_PUBLIC_API_URL`** for `POST /videos/upload`.  
- **CORS:** set `CORS_ORIGINS` to your production frontend origin(s).

---

## Contributing

1. Fork the repository and create a feature branch.  
2. Run backend and frontend linters/tests as available.  
3. Open a pull request with a clear description of behavior changes.

---

## License

MIT — see [LICENSE](LICENSE).
