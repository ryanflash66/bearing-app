"""
Story 5.9 Modal worker contract: generate_book_asset

This endpoint is designed for Modal deployment. It:
1) marks cover_jobs row as running
2) calls Vertex Imagen with wrapped prompt + negative prompt
3) uploads each variation to R2 as WebP (quality 85)
4) progressively appends image metadata to cover_jobs.images
5) marks job completed/failed, including 429 queued/retry_after handling
"""

from __future__ import annotations

import base64
import io
import json
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import modal
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import boto3
import requests
from PIL import Image
from supabase import create_client

# ---------------------------------------------------------------------------
# Modal app definition
# ---------------------------------------------------------------------------

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "fastapi[standard]",
    "boto3",
    "pillow",
    "requests",
    "supabase",
    "google-auth",
)

app = modal.App("bearing-cover-generator", image=image)

_bearer = HTTPBearer()


MAX_RETRIES = 3
VARIATION_COUNT = 4


@dataclass
class WorkerPayload:
    job_id: str
    manuscript_id: str
    account_id: str
    user_id: str
    description: str
    genre: str
    mood: str
    style: str
    wrapped_prompt: str
    negative_prompt: str
    aspect_ratio: str
    variation_seeds: list[int]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _supabase():
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def _r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def _bucket_name() -> str:
    return os.environ.get("R2_BUCKET_NAME", "bearing-uploads")


def _to_webp_bytes(image_bytes: bytes) -> bytes:
    with Image.open(io.BytesIO(image_bytes)) as image:
        output = io.BytesIO()
        image.convert("RGB").save(output, format="WEBP", quality=85, method=6)
        return output.getvalue()


def _parse_retry_after_seconds(header_value: str | None) -> int:
    if not header_value:
        return 30

    try:
        parsed = int(header_value)
        return max(parsed, 1)
    except ValueError:
        return 30


def _resolve_vertex_access_token() -> str:
    explicit_token = os.environ.get("VERTEX_ACCESS_TOKEN")
    if explicit_token:
        return explicit_token

    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    service_account_json = os.environ.get("VERTEX_SERVICE_ACCOUNT_JSON")

    if service_account_json:
        try:
            from google.auth.transport.requests import Request
            from google.oauth2 import service_account

            credentials = service_account.Credentials.from_service_account_info(
                json.loads(service_account_json),
                scopes=scopes,
            )
            credentials.refresh(Request())
            if credentials.token:
                return credentials.token
        except Exception as exc:  # pragma: no cover - external credential providers
            raise RuntimeError(f"Failed to use VERTEX_SERVICE_ACCOUNT_JSON: {exc}") from exc

    credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if credentials_path and os.path.exists(credentials_path):
        try:
            from google.auth.transport.requests import Request
            from google.oauth2 import service_account

            credentials = service_account.Credentials.from_service_account_file(
                credentials_path,
                scopes=scopes,
            )
            credentials.refresh(Request())
            if credentials.token:
                return credentials.token
        except Exception as exc:  # pragma: no cover - external credential providers
            raise RuntimeError(
                f"Failed to use GOOGLE_APPLICATION_CREDENTIALS file '{credentials_path}': {exc}"
            ) from exc

    try:
        from google.auth import default as google_auth_default
        from google.auth.transport.requests import Request

        credentials, _ = google_auth_default(scopes=scopes)
        credentials.refresh(Request())
        if credentials.token:
            return credentials.token
    except Exception as exc:  # pragma: no cover - external credential providers
        raise RuntimeError(f"Failed to resolve Google default credentials: {exc}") from exc

    raise RuntimeError("Unable to resolve a Vertex access token.")


def _call_vertex_imagen(
    wrapped_prompt: str,
    negative_prompt: str,
    aspect_ratio: str,
    seed: int,
) -> dict[str, Any]:
    project_id = os.environ.get("VERTEX_PROJECT_ID")
    location = os.environ.get("VERTEX_LOCATION", "us-central1")
    model = os.environ.get("VERTEX_IMAGEN_MODEL", "imagen-4.0-generate-001")

    if not project_id:
        return {
            "ok": False,
            "status": 500,
            "image_base64": None,
            "safety_status": "ok",
            "retry_after_seconds": None,
            "error": "VERTEX_PROJECT_ID is not configured",
        }

    endpoint = (
        f"https://{location}-aiplatform.googleapis.com/v1/"
        f"projects/{project_id}/locations/{location}/publishers/google/models/{model}:predict"
    )

    try:
        access_token = _resolve_vertex_access_token()
    except Exception as exc:
        return {
            "ok": False,
            "status": 500,
            "image_base64": None,
            "safety_status": "ok",
            "retry_after_seconds": None,
            "error": f"Credential resolution failed: {exc}",
        }

    payload = {
        "instances": [{"prompt": wrapped_prompt}],
        "parameters": {
            "sampleCount": 1,
            "seed": seed,
            "aspectRatio": aspect_ratio,
            "negativePrompt": negative_prompt,
            "safetyFilterLevel": os.environ.get("VERTEX_SAFETY_FILTER_LEVEL", "BLOCK_ONLY_HIGH"),
            "personGeneration": os.environ.get("VERTEX_PERSON_GENERATION", "ALLOW_ADULT"),
        },
    }

    timeout_seconds = int(os.environ.get("VERTEX_TIMEOUT_SECONDS", "120"))

    try:
        response = requests.post(
            endpoint,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=timeout_seconds,
        )
    except requests.RequestException as exc:
        return {
            "ok": False,
            "status": 0,
            "image_base64": None,
            "safety_status": "ok",
            "retry_after_seconds": None,
            "error": f"Vertex request failed: {exc}",
        }

    if response.status_code == 429:
        return {
            "ok": False,
            "status": 429,
            "image_base64": None,
            "safety_status": "ok",
            "retry_after_seconds": _parse_retry_after_seconds(response.headers.get("Retry-After")),
            "error": "Vertex quota exceeded",
        }

    if response.status_code >= 400:
        error_message = f"Vertex returned HTTP {response.status_code}"
        try:
            error_json = response.json()
            details = (
                error_json.get("error", {}).get("message")
                if isinstance(error_json, dict)
                else None
            )
            if details:
                error_message = f"{error_message}: {details}"
        except ValueError:
            pass

        return {
            "ok": False,
            "status": response.status_code,
            "image_base64": None,
            "safety_status": "ok",
            "retry_after_seconds": None,
            "error": error_message,
        }

    try:
        data = response.json()
    except ValueError:
        return {
            "ok": False,
            "status": response.status_code,
            "image_base64": None,
            "safety_status": "ok",
            "retry_after_seconds": None,
            "error": "Vertex returned a non-JSON response",
        }

    predictions = data.get("predictions") if isinstance(data, dict) else None
    if not isinstance(predictions, list) or not predictions:
        return {
            "ok": False,
            "status": response.status_code,
            "image_base64": None,
            "safety_status": "ok",
            "retry_after_seconds": None,
            "error": "Vertex response did not contain predictions",
        }

    first_prediction = predictions[0] if isinstance(predictions[0], dict) else {}
    image_base64 = (
        first_prediction.get("bytesBase64Encoded")
        or first_prediction.get("image")
        or first_prediction.get("b64Json")
    )

    if image_base64:
        return {
            "ok": True,
            "status": response.status_code,
            "image_base64": image_base64,
            "safety_status": "ok",
            "retry_after_seconds": None,
            "error": None,
        }

    safety_blocked = bool(
        first_prediction.get("raiFilteredReason")
        or first_prediction.get("safetyAttributes", {}).get("blocked")
    )
    if safety_blocked:
        return {
            "ok": False,
            "status": response.status_code,
            "image_base64": None,
            "safety_status": "blocked",
            "retry_after_seconds": None,
            "error": "Image blocked by safety filters",
        }

    return {
        "ok": False,
        "status": response.status_code,
        "image_base64": None,
        "safety_status": "ok",
        "retry_after_seconds": None,
        "error": "Vertex response did not include image bytes",
    }


def _append_cover_image(
    supabase_client,
    job_id: str,
    image_row: dict[str, Any],
) -> None:
    current = (
        supabase_client.table("cover_jobs")
        .select("images")
        .eq("id", job_id)
        .single()
        .execute()
    )
    existing = current.data.get("images") if current.data else []
    if not isinstance(existing, list):
        existing = []
    next_images = [*existing, image_row]

    supabase_client.table("cover_jobs").update(
        {
            "images": next_images,
            "updated_at": _now_iso(),
        }
    ).eq("id", job_id).execute()


def generate_book_asset(payload_dict: dict[str, Any]) -> dict[str, Any]:
    payload = WorkerPayload(
        job_id=payload_dict["job_id"],
        manuscript_id=payload_dict["manuscript_id"],
        account_id=payload_dict["account_id"],
        user_id=payload_dict["user_id"],
        description=payload_dict["description"],
        genre=payload_dict["genre"],
        mood=payload_dict["mood"],
        style=payload_dict["style"],
        wrapped_prompt=payload_dict["wrapped_prompt"],
        negative_prompt=payload_dict["negative_prompt"],
        aspect_ratio=payload_dict.get("aspect_ratio", "2:3"),
        variation_seeds=list(payload_dict.get("variation_seeds") or []),
    )

    supabase_client = _supabase()
    r2 = _r2_client()

    supabase_client.table("cover_jobs").update(
        {
            "status": "running",
            "started_at": _now_iso(),
            "error_message": None,
        }
    ).eq("id", payload.job_id).execute()

    completed = 0
    blocked = 0

    for index in range(VARIATION_COUNT):
        seed = payload.variation_seeds[index] if index < len(payload.variation_seeds) else int(time.time()) + index
        attempts = 0

        while attempts < MAX_RETRIES:
            attempts += 1
            result = _call_vertex_imagen(
                wrapped_prompt=payload.wrapped_prompt,
                negative_prompt=payload.negative_prompt,
                aspect_ratio=payload.aspect_ratio,
                seed=seed,
            )

            if result.get("ok"):
                image_bytes = base64.b64decode(result["image_base64"])
                webp_bytes = _to_webp_bytes(image_bytes)
                key = f"tmp/covers/{payload.manuscript_id}/{payload.job_id}/{index}.webp"
                r2.put_object(
                    Bucket=_bucket_name(),
                    Key=key,
                    Body=webp_bytes,
                    ContentType="image/webp",
                )

                _append_cover_image(
                    supabase_client,
                    payload.job_id,
                    {
                        "storage_path": key,
                        "safety_status": result.get("safety_status", "ok"),
                        "seed": seed,
                    },
                )

                completed += 1
                break

            if result.get("status") == 429:
                retry_after = int(result.get("retry_after_seconds") or 30)
                retry_at = datetime.now(timezone.utc) + timedelta(seconds=retry_after)
                supabase_client.table("cover_jobs").update(
                    {
                        "status": "queued",
                        "retry_count": attempts,
                        "retry_after": retry_at.isoformat(),
                        "error_message": "Generation queued due to high demand.",
                    }
                ).eq("id", payload.job_id).execute()
                time.sleep(retry_after)
                continue

            if result.get("safety_status") == "blocked":
                blocked += 1
                _append_cover_image(
                    supabase_client,
                    payload.job_id,
                    {
                        "error": "blocked",
                        "safety_status": "blocked",
                        "seed": seed,
                    },
                )
                break

            if attempts >= MAX_RETRIES:
                _append_cover_image(
                    supabase_client,
                    payload.job_id,
                    {
                        "error": result.get("error") or "generation_failed",
                        "seed": seed,
                    },
                )
                break
        else:
            # while loop exhausted without break — all retries were 429s
            _append_cover_image(
                supabase_client,
                payload.job_id,
                {
                    "error": "quota_exhausted",
                    "seed": seed,
                },
            )

    if completed == 0:
        supabase_client.table("cover_jobs").update(
            {
                "status": "failed",
                "completed_at": _now_iso(),
                "error_message": "All cover variations were blocked or failed.",
                "wrapped_prompt": payload.wrapped_prompt,
            }
        ).eq("id", payload.job_id).execute()
        return {"ok": False, "job_id": payload.job_id, "completed": 0, "blocked": blocked}

    supabase_client.table("cover_jobs").update(
        {
            "status": "completed",
            "completed_at": _now_iso(),
            "wrapped_prompt": payload.wrapped_prompt,
            "error_message": None,
        }
    ).eq("id", payload.job_id).execute()
    return {"ok": True, "job_id": payload.job_id, "completed": completed, "blocked": blocked}


# ---------------------------------------------------------------------------
# Modal web endpoint — POST /generate_cover
# Vercel calls this with Authorization: Bearer <MODAL_API_KEY>
# ---------------------------------------------------------------------------

@app.function(
    secrets=[modal.Secret.from_name("bearing-cover-secrets")],
    timeout=600,
)
@modal.fastapi_endpoint(method="POST")
async def generate_cover(
    request: Request,
    token: HTTPAuthorizationCredentials = Depends(_bearer),
):
    import asyncio
    import hmac

    expected = os.environ.get("AUTH_TOKEN")
    if not expected or not hmac.compare_digest(token.credentials, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = await request.json()
    # Run blocking I/O (requests, boto3, time.sleep) in a thread
    return await asyncio.to_thread(generate_book_asset, payload)
