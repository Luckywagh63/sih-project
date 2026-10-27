import os
import re
from pathlib import Path
from uuid import uuid4
from typing import Optional, Tuple, Dict, Any
from fastapi import UploadFile, HTTPException, status
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR_CONFIG = os.getenv("UPLOAD_DIR", "./uploads")
MAX_UPLOAD_MB = float(os.getenv("MAX_UPLOAD_MB", "10"))
MAX_UPLOAD_BYTES = int(MAX_UPLOAD_MB * 1024 * 1024)

UPLOAD_DIR = Path(UPLOAD_DIR_CONFIG).resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Magic bytes & signatures
FILE_SIGNATURES = {
    "pdf": [b"%PDF"],
    "png": [b"\x89PNG\r\n\x1a\n", b"\x89PNG"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"]
}

ALLOWED_MIME_TYPES = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/pjpeg": "jpg",
    "image/jpg": "jpg"
}

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}


def sanitize_filename(name: str) -> str:
    """Sanitize original filename to remove hazardous characters."""
    clean = re.sub(r"[^\w\s\.-]", "_", name)
    clean = re.sub(r"\s+", "_", clean)
    return clean[:120]


def validate_file_signature(content: bytes, ext: str) -> bool:
    """Validate file content begins with valid magic bytes for its extension."""
    sigs = FILE_SIGNATURES.get(ext.lower(), [])
    for sig in sigs:
        if content.startswith(sig):
            return True
    return False


async def process_and_save_upload(file: UploadFile, app_id: str, doc_type: str) -> Dict[str, Any]:
    """
    Validate and save uploaded document securely.
    Returns metadata dict for MongoDB storage.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing."
        )

    # 1. Check extension
    raw_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if raw_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '.{raw_ext}'. Allowed formats: PDF, PNG, JPG, JPEG."
        )

    # 2. Check MIME type
    content_type = file.content_type or ""
    if content_type.lower() not in ALLOWED_MIME_TYPES and not content_type.startswith("application/") and not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME type '{content_type}'. Must be application/pdf or image (PNG/JPEG)."
        )

    # 3. Read content and check size limit
    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    if file_size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({round(file_size / (1024*1024), 2)} MB) exceeds maximum allowed limit of {MAX_UPLOAD_MB} MB."
        )

    # 4. Validate file signature (magic bytes)
    if not validate_file_signature(content, raw_ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File signature mismatch. The file content does not match genuine .{raw_ext} format."
        )

    # 5. Generate secure isolated storage filename
    safe_orig = sanitize_filename(file.filename)
    safe_basename = safe_orig.rsplit(".", 1)[0]
    unique_name = f"{app_id}_{uuid4().hex[:8]}_{safe_basename[:30]}.{raw_ext}"
    target_path = (UPLOAD_DIR / unique_name).resolve()

    # Path traversal protection
    if not str(target_path).startswith(str(UPLOAD_DIR)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid destination path traversal attempt."
        )

    # Write file safely
    with open(target_path, "wb") as f:
        f.write(content)

    return {
        "stored_filename": unique_name,
        "original_filename": file.filename,
        "mime_type": content_type or f"application/{raw_ext}",
        "file_size": file_size,
        "storage_path": unique_name  # store only relative filename, not full server path
    }


def get_document_file_path(stored_filename: str) -> Path:
    """Retrieve verified file path, preventing directory traversal."""
    safe_path = (UPLOAD_DIR / stored_filename).resolve()
    if not str(safe_path).startswith(str(UPLOAD_DIR)) or not safe_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found on storage server."
        )
    return safe_path


def delete_document_file(stored_filename: str) -> bool:
    """Safely delete file from storage."""
    try:
        safe_path = (UPLOAD_DIR / stored_filename).resolve()
        if str(safe_path).startswith(str(UPLOAD_DIR)) and safe_path.is_file():
            safe_path.unlink()
            return True
    except Exception as exc:
        print(f"[Storage] Error deleting file {stored_filename}: {exc}")
    return False
