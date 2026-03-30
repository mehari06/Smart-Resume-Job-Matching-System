import os
from pathlib import Path
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer
import torch.nn.functional as F

app = FastAPI(title="Smart Resume Job Matcher API", version="0.1.0")

class ResumeRequest(BaseModel):
    resume_text: str

FASTAPI_API_KEY = os.getenv("FASTAPI_API_KEY")
jobs_df = None
job_embeddings = None
model = None

BASE_DIR = Path(__file__).resolve().parents[1]
raw_data_dir = Path(os.getenv("DATA_DIR", "data"))
DATA_DIR = raw_data_dir if raw_data_dir.is_absolute() else (BASE_DIR / raw_data_dir)
JOBS_PATH = DATA_DIR / "jobs.pkl"
JOB_EMBEDDINGS_PATH = DATA_DIR / "job_embeddings.pt"

@app.on_event("startup")
def load_model_and_embeddings():
    global jobs_df, job_embeddings, model
    print("Loading jobs and embeddings...")

    if not JOBS_PATH.exists():
        raise RuntimeError(f"Missing jobs dataset: {JOBS_PATH}")
    if not JOB_EMBEDDINGS_PATH.exists():
        raise RuntimeError(f"Missing embeddings file: {JOB_EMBEDDINGS_PATH}")

    jobs_df = pd.read_pickle(JOBS_PATH)
    job_embeddings = torch.load(JOB_EMBEDDINGS_PATH)
    model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Model and embeddings loaded!")

def require_api_key(x_api_key: str | None):
    if FASTAPI_API_KEY and x_api_key != FASTAPI_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.post("/match")
def match_jobs(request: ResumeRequest, x_api_key: str | None = Header(default=None)):
    global jobs_df, job_embeddings, model
    require_api_key(x_api_key)
    if jobs_df is None or job_embeddings is None or model is None:
        return {"error": "Model or embeddings not loaded yet."}

    resume_embedding = model.encode(request.resume_text, convert_to_tensor=True)
    scores = F.cosine_similarity(resume_embedding.unsqueeze(0), job_embeddings, dim=1)
    top_k = torch.topk(scores, k=5)

    results = []
    for score, idx in zip(top_k.values, top_k.indices):
        job = jobs_df.iloc[idx.item()]
        results.append({
            "job_title": job.get("Title") or job.get("title"),
            "score": float(score),
            "resume_idx": 0,
            "job_idx": int(idx)
        })
    return results

@app.get("/")
def health_check():
    return {"status": "API is running!"}
