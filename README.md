# Smart Resume Job Matching System

Production-ready Next.js application (UI + API routes) for resume-to-job matching with:
- Prisma + PostgreSQL/Supabase data layer
- Cloudinary resume storage
- External ML scoring service (`/match`)

## Architecture
- Frontend + Backend API: Next.js (`app/`, `app/api/`)
- Database: Prisma + PostgreSQL/Supabase
- File Storage: Cloudinary
- ML Service: External FastAPI endpoint (`ML_SERVICE_URL`)

## 1) Prerequisites
- Node.js `20+`
- npm `10+`
- PostgreSQL/Supabase access
- Google OAuth credentials
- Cloudinary credentials
- Python `3.10+` (if running ML service locally)

## 2) Clone And Install
```bash
git clone https://github.com/mehari06/Smart-Resume-Job-Matching-System.git
cd Smart-Resume-Job-Matching-System
npm install
```

## 3) Environment Variables (Required)
Create `.env.local` in repo root.

Use this exact credential map:

| Variable | Required | Description |
|---|---|---|
| `NEXTAUTH_URL` | Yes | App URL (`http://localhost:3000` locally) |
| `NEXTAUTH_SECRET` | Yes | NextAuth signing secret |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `RECRUITER_EMAILS` | Yes | Comma-separated recruiter emails |
| `NEXTAUTH_USE_PRISMA_ADAPTER` | Yes | `true`/`false` |
| `DATABASE_URL` | Yes | Prisma pooled DB URL |
| `DIRECT_URL` | Yes | Prisma direct DB URL |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `ML_SERVICE_URL` | Yes | ML endpoint base URL |
| `ML_SERVICE_API_KEY` | Optional | ML API key if enabled |
| `NEXT_PUBLIC_APP_URL` | Optional | Public app URL |
| `NEXT_PUBLIC_GA_ID` | Optional | Google Analytics ID |
| `RESEND_API_KEY` | Optional | Email provider key |

Template:

```env
# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
GOOGLE_CLIENT_ID=REPLACE
GOOGLE_CLIENT_SECRET=REPLACE
RECRUITER_EMAILS=mbereket523@gmail.com
NEXTAUTH_USE_PRISMA_ADAPTER=true

# Database (Supabase/Postgres)
DATABASE_URL=REPLACE
DIRECT_URL=REPLACE

# Cloudinary
CLOUDINARY_CLOUD_NAME=REPLACE
CLOUDINARY_API_KEY=REPLACE
CLOUDINARY_API_SECRET=REPLACE

# ML Service
ML_SERVICE_URL=http://127.0.0.1:8000
ML_SERVICE_API_KEY=REPLACE_IF_ENABLED

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GA_ID=
RESEND_API_KEY=
```

Security policy:
- Do **not** commit `.env.local`.
- Keep real values in private secret manager/secure DM.
- Rotate secrets after onboarding handoff.

## 4) Database Setup
```bash
npx prisma generate
npx prisma db push
```

## 5) Run ML Service (Local)
If your ML service lives in `smartresume-v2` locally:

```powershell
cd C:\Users\Mehari\Desktop\smartresume\smartresume-v2
$env:FASTAPI_API_KEY="REPLACE_IF_ENABLED"
$env:DATA_DIR="data"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

You should see:
- `Uvicorn running on http://127.0.0.1:8000`

## 6) Run Next.js App (Local)
In another terminal:

```bash
cd Smart-Resume-Job-Matching-System
npm run dev
```

Open:
- `http://localhost:3000`

## 7) Smoke Test Checklist
1. Login with Google.
2. Upload resume from Dashboard.
3. Click `Analyze & Find My Jobs`.
4. Open a specific job and click `Check Match Score`, then `Apply For This Job`.
5. Login as recruiter and open `/recruiter`.
6. Click `Applicants` and verify ranked candidates.

## 8) Common Issues
- `404 /api/matches?resumeId=...`: stale/invalid resume ID; re-upload and analyze from dashboard.
- `422 Resume has no parsed content`: parsing failed; re-upload document.
- Cloudinary `Invalid Signature` or `Stale request`: verify Cloudinary env vars + system clock.
- Port `8000 already in use` on ML: kill old process, then restart uvicorn.

## 9) Deployment Notes (Vercel)
- This repo deploys as a Next.js app (frontend + backend API in one project).
- `.vercelignore` is configured to skip non-deployment folders (notebooks, local ML copy, logs, etc.).
- Set the same env vars in Vercel Project Settings.
