# backend/main.py
from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer
import torch.nn.functional as F

app = FastAPI(title="Smart Resume Job Matcher API", version="0.1.0")

# Pydantic model for request body
class ResumeRequest(BaseModel):
    resume_text: str

# Load job data and embeddings on startup
jobs_df = pd.read_pickle(r"C:\Users\bezis\Downloads\Smart-Resume-Job-Matching-System\data\jobs.pkl")               # your job dataframe
job_embeddings = torch.load(r"C:\Users\bezis\Downloads\Smart-Resume-Job-Matching-System\data\job_embeddings.pt")   # job embeddings
model = SentenceTransformer("all-MiniLM-L6-v2")         # pretrained embedding model

@app.post("/match")
def match_jobs(request: ResumeRequest):
    resume_text = request.resume_text
    resume_embedding = model.encode(resume_text, convert_to_tensor=True)

    # Compute cosine similarity
    scores = F.cosine_similarity(
        resume_embedding.unsqueeze(0),  # [1, dim]
        job_embeddings,                 # [num_jobs, dim]
        dim=1
    )

    # Get top 5 matches
    top_k = torch.topk(scores, k=5)
    results = []
    for score, idx in zip(top_k.values, top_k.indices):
        job = jobs_df.iloc[idx.item()]
        results.append({
            "job_title": job["Title"],
            "score": float(score),
            "resume_idx": 0,          # optional, for logging
            "job_idx": int(idx)
        })

    return results