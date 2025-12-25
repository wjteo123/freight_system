import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from ..dependencies import get_current_user
from .. import config

router = APIRouter(
    prefix="/uploads",
    tags=["Uploads"]
)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".pdf", ".webp"}

UPLOAD_ROOT = Path(config.UPLOAD_DIR).resolve()
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def _validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files or PDF are allowed",
        )
    return ext


@router.post("/", response_class=JSONResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    _validate_extension(file.filename)

    ext = Path(file.filename).suffix.lower()
    safe_name = f"{uuid.uuid4()}{ext}"
    destination = UPLOAD_ROOT / safe_name

    try:
        contents = await file.read()
        destination.write_bytes(contents)
    except Exception as exc:  # pragma: no cover - simple disk write
        raise HTTPException(status_code=500, detail=f"Failed to save file: {exc}")

    url_path = f"/uploads/{safe_name}"
    return {"url": url_path, "filename": safe_name, "content_type": file.content_type}
