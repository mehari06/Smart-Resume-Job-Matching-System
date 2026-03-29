# Smart Resume Job Matching System

AI-powered resume-to-job matching platform with end-to-end workflow:
- Candidate uploads resume
- Resume text is parsed and normalized
- ML service computes semantic similarity against job embeddings
- Ranked matches are persisted and visualized
- Recruiters can post jobs and review candidate fit

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack and Versions](#tech-stack-and-versions)
4. [Repository Structure](#repository-structure)
5. [Environment Variables](#environment-variables)
6. [Local Setup](#local-setup)
7. [Runbook](#runbook)
8. [API Overview](#api-overview)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)
12. [Security Notes](#security-notes)
13. [Contribution Workflow](#contribution-workflow)

## Project Overview
This project combines a modern Next.js application with a Python ML scoring service to match resumes to relevant jobs using semantic embeddings and cosine similarity.

Primary user journeys:
- Seeker: authenticate, upload resume, get ranked jobs, apply
- Recruiter: post/manage jobs, search candidates, review match quality

## Architecture
- Frontend and API layer: Next.js App Router (`app/`, `app/api/`)
- Authentication: NextAuth (Google OAuth)
- Database: PostgreSQL (Supabase) via Prisma
- File storage: Cloudinary
- ML scoring service: FastAPI (`backend/main.py`) with SentenceTransformer + PyTorch
- Data artifacts: `data/jobs.pkl`, `data/job_embeddings.pt`

Request flow:
1. Resume upload is stored and parsed.
2. `GET /api/matches?resumeId=...` builds resume text.
3. Next.js calls ML service `POST /match` with `x-api-key`.
4. ML service returns top similarity results.
5. API maps to jobs, persists matches, and returns ranked response.

## Tech Stack and Versions
Frontend/runtime:
- Node.js: 20+ (recommended)
- npm: 10+ (recommended)
- Next.js: `14.2.5`
- React: `18.3.1`
- TypeScript: `5.4.5`
- NextAuth: `^4.24.7`
- Prisma Client: `^5.18.0`
- Tailwind CSS: `3.4.10`

Backend/runtime:
- Python: 3.10+
- FastAPI (imported in `backend/main.py`)
- Uvicorn (run target)
- pandas, torch, sentence-transformers, pydantic

Note: Python dependencies are currently not pinned in a `requirements.txt` file.

## Repository Structure
```text
.
|-- app/                    # Next.js pages and API routes
|   |-- api/
|   |   |-- auth/[...nextauth]/route.ts
|   |   |-- jobs/
|   |   |-- matches/route.ts
|   |   |-- resumes/
|   |   `-- recruiter/
|-- backend/
|   `-- main.py             # FastAPI ML scoring service
|-- lib/                    # Shared server utilities/auth/data helpers
|-- prisma/
|   `-- schema.prisma
|-- data/                   # Local JSON + ML artifacts
|-- components/             # UI components
|-- README.md
|-- .env.example
|-- package.json
`-- tailwind.config.js
```

## Environment Variables
Start from `.env.example`:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-strong-secret"
GOOGLE_CLIENT_ID="replace-with-google-client-id"
GOOGLE_CLIENT_SECRET="replace-with-google-client-secret"
RECRUITER_EMAILS="admin@example.com"

DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

ML_SERVICE_URL="http://127.0.0.1:8000"
ML_SERVICE_API_KEY="shared-local-key"
FASTAPI_API_KEY="shared-local-key"
DATA_DIR="data"
```

Critical rule:
- `ML_SERVICE_API_KEY` and `FASTAPI_API_KEY` must match in local development.

## Local Setup
### 1) Clone and install
```bash
git clone https://github.com/mehari06/Smart-Resume-Job-Matching-System.git
cd Smart-Resume-Job-Matching-System
npm install
```

### 2) Create `.env`
Linux/macOS:
```bash
cp .env.example .env
```

PowerShell:
```powershell
Copy-Item .env.example .env
```

### 3) Configure database
```bash
npx prisma generate
npx prisma db push
```

### 4) Install Python dependencies
```bash
python -m pip install fastapi uvicorn pandas torch sentence-transformers pydantic
```

### 5) Ensure ML data artifacts exist
- `data/jobs.pkl`
- `data/job_embeddings.pt`

If missing, generate them before running backend.

## Runbook
### Terminal A: Start ML service
From repo root:

Linux/macOS:
```bash
export FASTAPI_API_KEY="shared-local-key"
export DATA_DIR="data"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

PowerShell:
```powershell
$env:FASTAPI_API_KEY="shared-local-key"
$env:DATA_DIR="data"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal B: Start Next.js app
```bash
npm run dev
```

Open:
- App: `http://localhost:3000`
- ML health: `http://127.0.0.1:8000/`

### Quick API verification
```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8000/match `
  -Headers @{ "x-api-key" = "shared-local-key" } `
  -ContentType "application/json" `
  -Body '{"resume_text":"python react developer"}'
```

## API Overview
Core API routes (Next.js):
- `GET/POST /api/jobs`
- `GET/PATCH/DELETE /api/jobs/[id]`
- `GET /api/matches?resumeId=<id>`
- `GET/POST /api/resumes`
- `GET/PATCH/DELETE /api/resumes/[id]`
- `GET /api/recruiter/search`
- `GET /api/recruiter/jobs/[id]/candidates`
- `GET /api/users/me`
- `POST /api/cloudinary/sign`
- `GET/POST /api/auth/[...nextauth]`

ML API:
- `POST /match`
- `GET /`

## Testing
Available scripts:
```bash
npm run lint
npm run build
npm run test
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Deployment
Recommended: deploy Next.js app to Vercel and run ML service separately.

Checklist:
1. Configure all environment variables in hosting platform.
2. Ensure ML service URL and API key are reachable from deployed Next.js API routes.
3. Run database migration/push in target environment.
4. Verify Cloudinary and Google OAuth callback settings.

## Troubleshooting
### `POST /match` returns `401 Unauthorized`
Cause:
- API key mismatch or missing `x-api-key` header.

Fix:
1. Confirm `ML_SERVICE_API_KEY` == `FASTAPI_API_KEY`.
2. Restart both frontend and backend after env changes.
3. Re-test with direct `Invoke-RestMethod` call.

### Next.js error: `stream did not contain valid UTF-8`
Cause:
- Source file saved in UTF-16/corrupt encoding.

Fix:
1. Re-save file as UTF-8.
2. Confirm no null bytes in the file.
3. Clear `.next` cache and restart.

### `ML service failed to compute matches` in browser
Cause:
- ML service unavailable, key mismatch, or missing model artifacts.

Fix:
1. Check backend logs for `401`, startup errors, or missing data files.
2. Confirm `ML_SERVICE_URL` points to running backend.
3. Validate `data/jobs.pkl` and `data/job_embeddings.pt`.

### Build fails with missing module
Cause:
- Missing file import or incomplete branch merge.

Fix:
1. Resolve import path.
2. Re-run `npm run build` before merge.

## Security Notes
- Do not commit `.env` or real credentials.
- Rotate keys exposed in screenshots/logs/chats.
- Keep API keys server-side only.
- Use least-privilege DB credentials in production.

## Contribution Workflow
1. Create branch from `main`.
2. Implement changes and run lint/build/tests.
3. Open PR with scope, screenshots/logs, and risk notes.
4. After approval, squash-merge to `main`.
5. Delete merged branch and close stale PRs.
