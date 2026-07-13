# ConnectLove backend face verification worker

This private Python service uses OpenCV YuNet and SFace to create normalized face embeddings from
the authenticated user's 1-5 stored profile photos and compares them with 3-5
camera frames. A majority of frames must score at least 60%, contain exactly
one face, and show frame-to-frame motion.

## Run

This Python/OpenCV worker is part of `connect-love-backend`; it is not a separate application repository. Use Python 3.11. The required ONNX files live in `models/`.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:FACE_SERVICE_SECRET="use-a-long-random-secret"
uvicorn app:app --app-dir connect-love-backend/face-service --host 127.0.0.1 --port 8001
```

Set the same secret in the NestJS backend as `FACE_SERVICE_SECRET`, and set
`FACE_SERVICE_URL=http://127.0.0.1:8001`.

Keep this service private. The browser must only call the authenticated NestJS
endpoint, never this service directly.

Run one Uvicorn worker per container because OpenCV inference is CPU-bound and models are reused in memory. Scale containers horizontally and cap upstream concurrency; do not expose this service publicly.
