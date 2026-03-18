import pandas as pd
import torch
from sentence_transformers import SentenceTransformer

# Load your raw dataset (IMPORTANT — do you have this?)
jobs_df = pd.read_csv(r"C:\Users\bezis\Downloads\Smart-Resume-Job-Matching-System\data\preprocessed_jobs.csv")   # <-- change path if needed

# Load model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Create embeddings
job_embeddings = model.encode(
    jobs_df["preprocessed_text"].tolist(),
    convert_to_tensor=True
)

# Save everything
jobs_df.to_pickle("jobs.pkl")
torch.save(job_embeddings, "job_embeddings.pt")
model.save("model/")

print("✅ Data and model saved successfully!")