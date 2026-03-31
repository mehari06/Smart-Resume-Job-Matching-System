from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer
import torch.nn.functional as F
import os
import requests

app = FastAPI(title="Smart Resume Job Matcher API", version="0.1.0")

# Request schema
class ResumeRequest(BaseModel):
    resume_text: str

# Globals
jobs_df = None
job_embeddings = None
model = None

# Helper function to download files
def download_file(url, filename):
    BASE_DIR = os.path.dirname(__file__)
    filepath = os.path.join(BASE_DIR, filename)

    if not os.path.exists(filepath):
        print(f"⬇️ Downloading {filename}...")
        r = requests.get(url)
        with open(filepath, "wb") as f:
            f.write(r.content)
        print(f"✅ Downloaded {filename}")
    else:
        print(f"✔ {filename} already exists")

    return filepath

# Startup event
@app.on_event("startup")
def load_model_and_embeddings():
    global jobs_df, job_embeddings, model

    print("📦 Loading jobs and embeddings...")

    # 🔗 Google Drive direct download links
    jobs_url = "https://drive.google.com/uc?export=download&id=1A90Y27wk-yMdhN5oE3HyXNrKUiJnB8ZN"
    embeddings_url = "https://drive.google.com/uc?export=download&id=1VoN7q49zWWKvR6bPyDxTrC9CM0rGzW08"

    # Download files
    jobs_path = download_file(jobs_url, "jobs.pkl")
    embeddings_path = download_file(embeddings_url, "job_embeddings.pt")

    # Load data
    jobs_df = pd.read_pickle(jobs_path)
    job_embeddings = torch.load(embeddings_path)

    # Load model
    model = SentenceTransformer("all-MiniLM-L6-v2")

    print("✅ Model and embeddings loaded!")

# Match endpoint
@app.post("/match")
def match_jobs(request: ResumeRequest):
    global jobs_df, job_embeddings, model

    if jobs_df is None or job_embeddings is None or model is None:
        return {"error": "Model or embeddings not loaded yet."}

    resume_text = request.resume_text
    resume_embedding = model.encode(resume_text, convert_to_tensor=True)

    # Cosine similarity
    scores = F.cosine_similarity(
        resume_embedding.unsqueeze(0),
        job_embeddings,
        dim=1
    )

    # Top 5 results
    top_k = torch.topk(scores, k=5)

    results = []
    for score, idx in zip(top_k.values, top_k.indices):
        job = jobs_df.iloc[idx.item()]
        results.append({
            "job_title": job["Title"],
            "score": float(score),
            "resume_idx": 0,
            "job_idx": int(idx)
        })

    return results

# Health check
@app.get("/")
def health_check():
    return {"status": "API is running!"}