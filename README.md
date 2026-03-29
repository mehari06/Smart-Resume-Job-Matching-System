# Smart Resume Job Matching System

Production-ready full-stack application for AI-powered resume-to-job matching.

## Stack
- Frontend/API: Next.js 14 (`app/`, `app/api/`)
- Auth: NextAuth
- Database: PostgreSQL (Supabase) + Prisma
- Storage: Cloudinary
- ML Service: FastAPI (`backend/main.py`, `/match`)

## Prerequisites
- Node.js 20+
- npm 10+
- Python 3.10+

## Setup
1. Clone and install
```bash
git clone https://github.com/mehari06/Smart-Resume-Job-Matching-System.git
cd Smart-Resume-Job-Matching-System
npm install
```

2. Create env file from template
```bash
cp .env.example .env
```

3. Fill required values in `.env`
- Database + auth + cloudinary credentials
- ML settings:
  - `ML_SERVICE_URL=http://127.0.0.1:8000`
  - `ML_SERVICE_API_KEY=<same value as FASTAPI_API_KEY>`
  - `FASTAPI_API_KEY=<same value as ML_SERVICE_API_KEY>`

4. Start ML service (PowerShell example)
```powershell
cd backend
$env:FASTAPI_API_KEY="<same shared key>"
$env:DATA_DIR="data"
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

5. Start Next.js app (new terminal)
```powershell
cd <repo-root>
npm run dev
```

## Quick Verification
Test `/match` directly:
```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8000/match `
  -Headers @{ "x-api-key" = "<same shared key>" } `
  -ContentType "application/json" `
  -Body '{"resume_text":"python react developer"}'
```

If this returns JSON, auth between frontend and ML service is configured correctly.

## Troubleshooting
### `POST /match` returns `401 Unauthorized`
- Cause: API key mismatch or missing key header.
- Fix:
  - Ensure `ML_SERVICE_API_KEY` and `FASTAPI_API_KEY` are set and identical.
  - Restart both services after any `.env` change.

### Next.js compile error: `stream did not contain valid UTF-8`
- Cause: one source file saved in UTF-16 or corrupted encoding.
- Fix:
  - Re-save affected file as UTF-8 (without null bytes).
  - This repo includes `.editorconfig` with `charset = utf-8` to reduce recurrence.

### ML startup fails (missing data files)
- Ensure `data/jobs.pkl` and `data/job_embeddings.pt` exist.
- Ensure `DATA_DIR` points to the correct `data` directory.

## Security
- Never commit `.env` or real secrets.
- Rotate any key that was exposed in screenshots, logs, or chat.
