import json
import logging
import os
import time
import traceback
import uuid
from pathlib import Path
from typing import Any

import pandas as pd
import torch
import torch.nn.functional as F
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI(title="Smart Resume Job Matcher API", version="0.1.0")


class ResumeRequest(BaseModel):
    resume_text: str


class MonitoringEvent(BaseModel):
    source: str = "frontend"
    type: str
    level: str = "info"
    message: str | None = None
    path: str | None = None
    timestamp: str | None = None
    metadata: dict[str, Any] | None = None


FASTAPI_API_KEY = os.getenv("FASTAPI_API_KEY")
MONITORING_API_KEY = os.getenv("MONITORING_API_KEY") or FASTAPI_API_KEY
PERFORMANCE_WARN_MS = float(os.getenv("PERFORMANCE_WARN_MS", "1200"))

jobs_df = None
job_embeddings = None
model = None

BASE_DIR = Path(__file__).resolve().parents[1]
raw_data_dir = Path(os.getenv("DATA_DIR", "data"))
DATA_DIR = raw_data_dir if raw_data_dir.is_absolute() else (BASE_DIR / raw_data_dir)
JOBS_PATH = DATA_DIR / "jobs.pkl"
JOB_EMBEDDINGS_PATH = DATA_DIR / "job_embeddings.pt"

logger = logging.getLogger("smartresume.monitoring")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False


def emit_monitoring_event(
    *,
    level: str,
    event_type: str,
    message: str,
    source: str = "backend",
    path: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    payload = {
        "source": source,
        "type": event_type,
        "level": level,
        "message": message,
        "path": path,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "metadata": metadata or {},
    }
    line = json.dumps(payload, default=str)

    if level == "error":
        logger.error(line)
    elif level == "warning":
        logger.warning(line)
    else:
        logger.info(line)


@app.middleware("http")
async def performance_monitoring_middleware(request: Request, call_next):
    started_at = time.perf_counter()
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())

    response = await call_next(request)

    duration_ms = (time.perf_counter() - started_at) * 1000
    response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"

    emit_monitoring_event(
        level="warning" if duration_ms >= PERFORMANCE_WARN_MS else "info",
        event_type="backend.request_timing",
        message="Request completed",
        path=request.url.path,
        metadata={
            "requestId": request_id,
            "method": request.method,
            "statusCode": response.status_code,
            "durationMs": round(duration_ms, 2),
        },
    )

    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    emit_monitoring_event(
        level="error",
        event_type="backend.unhandled_exception",
        message="Unhandled backend exception",
        path=request.url.path,
        metadata={
            "error": str(exc),
            "traceback": traceback.format_exc(),
        },
    )
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


def require_api_key(x_api_key: str | None):
    if FASTAPI_API_KEY and x_api_key != FASTAPI_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def require_monitoring_api_key(x_api_key: str | None):
    if MONITORING_API_KEY and x_api_key != MONITORING_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


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

    emit_monitoring_event(
        level="info",
        event_type="backend.startup",
        message="Model and embeddings loaded",
        metadata={
            "jobsPath": str(JOBS_PATH),
            "embeddingsPath": str(JOB_EMBEDDINGS_PATH),
            "rows": int(len(jobs_df.index)),
        },
    )


@app.post("/match")
def match_jobs(request: ResumeRequest, x_api_key: str | None = Header(default=None)):
    global jobs_df, job_embeddings, model
    require_api_key(x_api_key)

    if jobs_df is None or job_embeddings is None or model is None:
        emit_monitoring_event(
            level="warning",
            event_type="backend.match_model_unavailable",
            message="Model or embeddings not loaded",
            path="/match",
        )
        return {"error": "Model or embeddings not loaded yet."}

    started_at = time.perf_counter()
    try:
        resume_embedding = model.encode(request.resume_text, convert_to_tensor=True)
        scores = F.cosine_similarity(resume_embedding.unsqueeze(0), job_embeddings, dim=1)
        top_k = torch.topk(scores, k=5)

        results = []
        for score, idx in zip(top_k.values, top_k.indices):
            job = jobs_df.iloc[idx.item()]
            results.append(
                {
                    "job_title": job.get("Title") or job.get("title"),
                    "score": float(score),
                    "resume_idx": 0,
                    "job_idx": int(idx),
                }
            )

        duration_ms = (time.perf_counter() - started_at) * 1000
        emit_monitoring_event(
            level="warning" if duration_ms >= PERFORMANCE_WARN_MS else "info",
            event_type="backend.match_completed",
            message="Resume match completed",
            path="/match",
            metadata={
                "durationMs": round(duration_ms, 2),
                "resultCount": len(results),
            },
        )
        return results
    except Exception as exc:
        emit_monitoring_event(
            level="error",
            event_type="backend.match_failed",
            message="Resume match failed",
            path="/match",
            metadata={
                "error": str(exc),
                "traceback": traceback.format_exc(),
            },
        )
        raise HTTPException(status_code=500, detail="Failed to compute matches") from exc


@app.post("/monitoring/events")
def ingest_monitoring_event(
    event: MonitoringEvent, x_api_key: str | None = Header(default=None)
):
    require_monitoring_api_key(x_api_key)

    level = event.level.lower()
    if level not in {"info", "warning", "error"}:
        level = "info"

    emit_monitoring_event(
        level=level,
        event_type=event.type,
        message=event.message or event.type,
        source=event.source,
        path=event.path,
        metadata=event.metadata or {},
    )
    return {"ok": True}


@app.get("/")
def health_check():
    return {"status": "API is running!"}
