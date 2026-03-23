# Smart Resume Job Matching System

Production-ready full-stack application for AI-powered resume–job matching.

## Architecture
- **Frontend + API:** Next.js (`app/`, `app/api/`)  
- **Database:** PostgreSQL (Supabase) + Prisma  
- **Storage:** Cloudinary  
- **ML Service:** External FastAPI (`/match` endpoint)  

## Prerequisites
- Node.js 20+, npm 10+  
- PostgreSQL/Supabase  
- Google OAuth credentials  
- Cloudinary credentials  
- Python 3.10+ (for local ML service)  

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/mehari06/Smart-Resume-Job-Matching-System.git
cd Smart-Resume-Job-Matching-System
npm install
2. Environment Variables

Create .env.local:

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=YOUR_SECRET
GOOGLE_CLIENT_ID=YOUR_ID
GOOGLE_CLIENT_SECRET=YOUR_SECRET
RECRUITER_EMAILS=your@email.com
NEXTAUTH_USE_PRISMA_ADAPTER=true

# Database
DATABASE_URL=YOUR_DB_URL
DIRECT_URL=YOUR_DIRECT_URL

# Cloudinary
CLOUDINARY_CLOUD_NAME=YOUR_NAME
CLOUDINARY_API_KEY=YOUR_KEY
CLOUDINARY_API_SECRET=YOUR_SECRET

# ML Service
ML_SERVICE_URL=http://127.0.0.1:8000
ML_SERVICE_API_KEY=OPTIONAL

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GA_ID=
RESEND_API_KEY=

 Security

Never commit .env.local
Store secrets securely & rotate when needed
3. Database Setup
npx prisma generate
npx prisma db push
4. Run ML Service (Local)
cd smartresume-v2
export FASTAPI_API_KEY=YOUR_KEY   # (Windows: use `set` instead of `export`)
export DATA_DIR=data
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
5. Run App
npm run dev

Open: http://localhost:3000

Testing Flow
Login with Google
Upload resume
Click Analyze & Find Jobs
Check match score & apply
Recruiter → /recruiter → view ranked applicants
Common Issues
404 /api/matches?resumeId=...: re-upload resume
422 Resume has no parsed content: invalid document → re-upload
Cloudinary errors: check env vars + system clock
Port 8000 busy: stop existing process
Deployment (Vercel)
Deploy as a single Next.js app (UI + API)
Add all environment variables in project settings
.vercelignore excludes non-deployment files
Highlights
Full-stack scalable architecture
ML integration for intelligent matching
Secure authentication & file handling
Production-ready deployment setup
Access / Configuration

Sensitive environment variables are not included.
Request .env file via Telegram: @meha06
