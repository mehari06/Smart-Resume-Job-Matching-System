import os
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer
import torch.nn.functional as F

app = FastAPI(title="Smart Resume Job Matcher API", version="0.1.0")
API_KEY = os.environ.get("FASTAPI_API_KEY", "").strip()

# Pydantic model for request body
class ResumeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    resume_text: str = Field(min_length=25, max_length=50000)

# Global variables (will be initialized on startup)
jobs_df = None
job_embeddings = None
model = None

@app.on_event("startup")
def load_model_and_embeddings():
    global jobs_df, job_embeddings, model
    print("📦 Loading jobs and embeddings...")
    data_dir = os.environ.get("DATA_DIR", "data")
    try:
        jobs_df = pd.read_pickle(os.path.join(data_dir, "jobs.pkl"))
        job_embeddings = torch.load(os.path.join(data_dir, "job_embeddings.pt"), weights_only=False)
        print("✅ Model and embeddings loaded!")
    except FileNotFoundError as e:
        print(f"⚠️ Warning: {e}")
        print("Running with empty jobs data. Place jobs.pkl and job_embeddings.pt in 'data' directory.")
        jobs_df = pd.DataFrame(columns=["title"])
        job_embeddings = torch.zeros(0, 384)

    model = SentenceTransformer("all-MiniLM-L6-v2")

def verify_api_key(x_api_key: Annotated[str | None, Header()] = None):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.post("/match")
def match_jobs(request: ResumeRequest, _: None = Depends(verify_api_key)):
    global jobs_df, job_embeddings, model
    if jobs_df is None or job_embeddings is None or model is None:
        raise HTTPException(status_code=503, detail="Model unavailable")

    resume_text = request.resume_text
    resume_embedding = model.encode(resume_text, convert_to_tensor=True)

    # Compute cosine similarity
    scores = F.cosine_similarity(
        resume_embedding.unsqueeze(0),  # [1, dim]
        job_embeddings,                 # [num_jobs, dim]
        dim=1
    )

    # Get top 5 matches
    if scores.numel() == 0:
        return []

    top_k = torch.topk(scores, k=min(5, scores.numel()))
    results = []
    for score, idx in zip(top_k.values, top_k.indices):
        job = jobs_df.iloc[idx.item()]
        results.append({
            "job_title": job["title"],
            "score": float(score),
            "resume_idx": 0,
            "job_idx": int(idx)
        })

    return results

# Optional health check
@app.get("/")
def health_check():
    return {"status": "API is running!"}
