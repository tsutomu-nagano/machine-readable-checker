"""HTTP API and browser UI for the machine-readable checker."""

from __future__ import annotations

from contextlib import suppress
from email.message import Message
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, unquote, urlparse
from urllib.request import Request, urlopen

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, HttpUrl

from .checker import check_file

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ALLOWED_SUFFIXES = {".csv", ".tsv", ".xlsx", ".xls"}
STATIC_DIR = Path(__file__).with_name("static")
DOWNLOAD_TIMEOUT_SECONDS = 30
USER_AGENT = "machine-readable-checker/0.1"

app = FastAPI(title="Machine-readable checker", version="0.1.0")

allowed_origins = [origin.strip() for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


class UrlCheckRequest(BaseModel):
    url: HttpUrl


@app.post("/api/check")
async def check_upload(file: UploadFile = File(...)) -> dict:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail="CSV、TSV、XLSX、XLS のいずれかをアップロードしてください。")

    payload = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="ファイルは 25 MB 以下にしてください。")

    temporary_path: Path | None = None
    try:
        with NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
            temporary.write(payload)
            temporary_path = Path(temporary.name)
        result = check_file(temporary_path).as_dict()
        result["filename"] = file.filename
        return result
    finally:
        if temporary_path is not None:
            with suppress(FileNotFoundError):
                temporary_path.unlink()
        await file.close()


@app.post("/api/check-url")
def check_url(payload: UrlCheckRequest) -> dict:
    url = str(payload.url)
    downloaded = _download_table(url)
    suffix = _detect_suffix(downloaded["filename"], downloaded["headers"], url, downloaded["content"])
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail="取得したファイル形式を判定できません。CSV、TSV、XLSX、XLS の URL を指定してください。")

    temporary_path: Path | None = None
    try:
        with NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
            temporary.write(downloaded["content"])
            temporary_path = Path(temporary.name)
        result = check_file(temporary_path).as_dict()
        result["filename"] = downloaded["filename"] or f"downloaded{suffix}"
        result["source_url"] = url
        return result
    finally:
        if temporary_path is not None:
            with suppress(FileNotFoundError):
                temporary_path.unlink()


def _download_table(url: str) -> dict:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="URL は http または https を指定してください。")
    if parsed.hostname != "www.e-stat.go.jp" or parsed.path != "/stat-search/file-download":
        raise HTTPException(status_code=400, detail="e-Stat の file-download URL を指定してください。")

    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=DOWNLOAD_TIMEOUT_SECONDS) as response:
            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="ファイルは 25 MB 以下にしてください。")
            content = response.read(MAX_UPLOAD_BYTES + 1)
            if len(content) > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="ファイルは 25 MB 以下にしてください。")
            return {
                "content": content,
                "headers": response.headers,
                "filename": _filename_from_headers(response.headers) or _filename_from_url(url),
            }
    except HTTPException:
        raise
    except HTTPError as error:
        raise HTTPException(status_code=400, detail=f"URL からファイルを取得できません: HTTP {error.code}") from error
    except (OSError, URLError, TimeoutError) as error:
        raise HTTPException(status_code=400, detail=f"URL からファイルを取得できません: {error}") from error


def _filename_from_headers(headers: Message) -> str | None:
    content_disposition = headers.get("Content-Disposition")
    if not content_disposition:
        return None
    for part in content_disposition.split(";"):
        key, _, value = part.strip().partition("=")
        if key.lower() == "filename*":
            _, _, encoded = value.strip('"').partition("''")
            return unquote(encoded or value.strip('"'))
        if key.lower() == "filename":
            return value.strip('"') or None
    return None


def _filename_from_url(url: str) -> str | None:
    parsed = urlparse(url)
    name = Path(parsed.path).name
    return unquote(name) if name else None


def _detect_suffix(filename: str | None, headers: Message, url: str, content: bytes) -> str:
    if filename and Path(filename).suffix.lower() in ALLOWED_SUFFIXES:
        return Path(filename).suffix.lower()

    content_type = headers.get_content_type().lower()
    if content_type in {"text/csv", "application/csv"}:
        return ".csv"
    if content_type in {"text/tab-separated-values"}:
        return ".tsv"
    if content_type in {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}:
        return ".xlsx"
    if content_type in {"application/vnd.ms-excel"}:
        return ".xls"

    if content.startswith(b"PK\x03\x04"):
        return ".xlsx"

    query = parse_qs(urlparse(url).query)
    if query.get("fileKind") == ["0"]:
        return ".csv"

    return ""


def run() -> None:
    uvicorn.run("machine_readable_checker.api:app", host="0.0.0.0", port=8000)
