import base64
import binascii
import os
import threading
from pathlib import Path
from typing import List

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


load_dotenv()

MATCH_THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", "0.60"))
INTERNAL_SECRET = os.getenv("FACE_SERVICE_SECRET", "")
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_REQUEST_BYTES = int(os.getenv("MAX_REQUEST_BYTES", str(30 * 1024 * 1024)))
MODEL_DIR = Path(__file__).resolve().parent / "models"
DETECTOR_MODEL = MODEL_DIR / "face_detection_yunet_2023mar.onnx"
RECOGNIZER_MODEL = MODEL_DIR / "face_recognition_sface_2021dec.onnx"

app = FastAPI(title="ConnectLove Face Verification", docs_url=None, redoc_url=None)
model_lock = threading.Lock()
detector = None
recognizer = None


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_BYTES:
        return JSONResponse(status_code=413, content={"detail": "Request body is too large."})
    return await call_next(request)


def load_models():
    global detector, recognizer
    if detector is not None and recognizer is not None:
        return detector, recognizer
    if not DETECTOR_MODEL.exists() or not RECOGNIZER_MODEL.exists():
        raise HTTPException(503, "Face recognition models are not installed.")
    with model_lock:
        if detector is None:
            detector = cv2.FaceDetectorYN.create(str(DETECTOR_MODEL), "", (320, 320), 0.85, 0.3, 5000)
        if recognizer is None:
            recognizer = cv2.FaceRecognizerSF.create(str(RECOGNIZER_MODEL), "")
    return detector, recognizer


class VerifyRequest(BaseModel):
    reference_images: List[str] = Field(min_length=1, max_length=5)
    live_frames: List[str] = Field(min_length=3, max_length=5)


def decode_image(data_url: str) -> np.ndarray:
    encoded = data_url.split(",", 1)[1] if "," in data_url else data_url
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(400, "Invalid base64 image.") from exc
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(400, "Image is empty or larger than 5 MB.")
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(400, "Unsupported image data.")
    height, width = image.shape[:2]
    if width < 160 or height < 160:
        raise HTTPException(400, "Image resolution is too small.")
    scale = min(1.0, 1280.0 / max(width, height))
    if scale < 1.0:
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return image


def one_face_encoding(image: np.ndarray, label: str) -> np.ndarray:
    height, width = image.shape[:2]
    face_detector, face_recognizer = load_models()
    with model_lock:
        face_detector.setInputSize((width, height))
        _, faces = face_detector.detect(image)
    face_count = 0 if faces is None else len(faces)
    if face_count != 1:
        raise HTTPException(422, f"{label} must contain exactly one visible face.")
    with model_lock:
        aligned = face_recognizer.alignCrop(image, faces[0])
        vector = face_recognizer.feature(aligned).flatten().astype(np.float32)
    norm = np.linalg.norm(vector)
    if not norm:
        raise HTTPException(422, f"Invalid face graph in {label}.")
    return vector / norm


def motion_score(frames: List[np.ndarray]) -> float:
    samples = []
    resized = [cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (96, 96)) for frame in frames]
    for left, right in zip(resized, resized[1:]):
        diff = cv2.absdiff(left, right).astype(np.float32)
        samples.append(float(diff.mean()) / 255.0)
    return max(samples, default=0.0)


@app.get("/health")
def health():
    models_ready = DETECTOR_MODEL.exists() and RECOGNIZER_MODEL.exists()
    return {"status": "ok" if models_ready else "degraded", "threshold": MATCH_THRESHOLD, "modelsReady": models_ready}


@app.post("/verify")
def verify(
    payload: VerifyRequest,
    x_internal_secret: str = Header(default=""),
):
    if not INTERNAL_SECRET or x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(401, "Unauthorized service request.")

    references = [decode_image(value) for value in payload.reference_images]
    live_frames = [decode_image(value) for value in payload.live_frames]

    # A user may have scenic/group photos in addition to a clear portrait.
    # Ignore unusable extras instead of failing the entire KYC attempt.
    reference_graph = []
    ignored_references = 0
    for index, image in enumerate(references):
        try:
            reference_graph.append(one_face_encoding(image, f"profile photo {index + 1}"))
        except HTTPException as error:
            if error.status_code != 422:
                raise
            ignored_references += 1
    if not reference_graph:
        raise HTTPException(422, "No profile photo contains one clear visible face. Add a clear solo portrait and try again.")

    live_graph = []
    valid_live_frames = []
    ignored_live_frames = 0
    for index, image in enumerate(live_frames):
        try:
            live_graph.append(one_face_encoding(image, f"live frame {index + 1}"))
            valid_live_frames.append(image)
        except HTTPException as error:
            if error.status_code != 422:
                raise
            ignored_live_frames += 1
    if len(live_graph) < 3:
        raise HTTPException(422, "Keep one face clearly visible in the camera for the full recording and try again.")

    scores = []
    for live_vector in live_graph:
        similarities = [
            float(np.dot(live_vector, reference_vector))
            for reference_vector in reference_graph
        ]
        scores.append(max(0.0, min(1.0, max(similarities))))

    passing_frames = sum(score >= MATCH_THRESHOLD for score in scores)
    required_frames = max(2, (len(scores) // 2) + 1)
    movement = motion_score(valid_live_frames)
    has_motion = movement >= 0.008
    matched = passing_frames >= required_frames and has_motion

    return {
        "matched": matched,
        "score": round(float(np.median(scores)) * 100),
        "bestScore": round(max(scores) * 100),
        "passingFrames": passing_frames,
        "requiredFrames": required_frames,
        "referenceFaces": len(reference_graph),
        "ignoredReferencePhotos": ignored_references,
        "validLiveFrames": len(live_graph),
        "ignoredLiveFrames": ignored_live_frames,
        "motionDetected": has_motion,
    }
