"""Thin async wrapper around the Supabase Storage REST API.

We call the Storage HTTP API directly (rather than the ``supabase-py`` SDK)
because:
  * we only need a tiny subset (upload + delete by path)
  * we already use ``httpx`` elsewhere
  * avoiding the SDK keeps our dependency surface small and lets us run with
    any plan of Supabase without worrying about pinned SDK versions

All writes use the *service role* key so they bypass bucket RLS; the key must
therefore NEVER be exposed to clients. Reads use the bucket's public URL.
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class SupabaseStorageError(RuntimeError):
    """Raised when Supabase returns a non-2xx response we cannot ignore."""


class SupabaseStorageClient:
    """Uploads / deletes objects on a single Supabase project's Storage bucket."""

    def __init__(
        self,
        *,
        url: Optional[str] = None,
        service_role_key: Optional[str] = None,
        bucket: Optional[str] = None,
        timeout_seconds: float = 15.0,
    ) -> None:
        self.url     = (url or settings.SUPABASE_URL or "").rstrip("/")
        self.key     = service_role_key or settings.SUPABASE_SERVICE_ROLE_KEY or ""
        self.bucket  = bucket or settings.SUPABASE_AVATAR_BUCKET
        self.timeout = timeout_seconds

    # ------------------------------------------------------------------ helpers
    @property
    def is_configured(self) -> bool:
        return bool(self.url and self.key and self.bucket)

    def public_url(self, object_path: str) -> str:
        """Return the public URL for a bucket object (bucket must be public)."""
        return f"{self.url}/storage/v1/object/public/{self.bucket}/{object_path.lstrip('/')}"

    def _headers(self, *, content_type: Optional[str] = None, upsert: bool = False) -> dict:
        h = {
            "Authorization": f"Bearer {self.key}",
            "apikey": self.key,
        }
        if content_type:
            h["Content-Type"] = content_type
        if upsert:
            # Supabase Storage requires x-upsert=true to replace an existing object.
            h["x-upsert"] = "true"
        return h

    # ------------------------------------------------------------------ uploads
    async def upload_bytes(
        self,
        *,
        object_path: str,
        data: bytes,
        content_type: str,
        upsert: bool = True,
    ) -> str:
        """Upload raw bytes to ``<bucket>/<object_path>`` and return the public URL.

        ``upsert=True`` lets the same path be re-written (e.g. when a user
        uploads a new avatar — we overwrite ``avatars/<user_id>.<ext>``).
        """
        if not self.is_configured:
            raise SupabaseStorageError(
                "Supabase Storage is not configured. Set SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY in the MainPlatform .env."
            )

        endpoint = f"{self.url}/storage/v1/object/{self.bucket}/{object_path.lstrip('/')}"
        headers  = self._headers(content_type=content_type, upsert=upsert)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(endpoint, content=data, headers=headers)

        if resp.status_code >= 400:
            # Common: 400 wrong content-type; 409 exists + upsert false; 413 too large.
            logger.warning(
                "Supabase upload failed %s: %s (bucket=%s path=%s)",
                resp.status_code, resp.text[:300], self.bucket, object_path,
            )
            raise SupabaseStorageError(
                f"Supabase upload failed ({resp.status_code}): {resp.text[:200]}"
            )

        return self.public_url(object_path)

    # ------------------------------------------------------------------ deletes
    async def delete(self, object_path: str) -> bool:
        """Delete an object. Returns True on success, False if missing/unconfigured."""
        if not self.is_configured:
            return False
        endpoint = f"{self.url}/storage/v1/object/{self.bucket}/{object_path.lstrip('/')}"
        headers  = self._headers()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.delete(endpoint, headers=headers)
            return resp.status_code < 400
        except Exception:  # noqa: BLE001 — delete failures must never block user flows
            logger.exception("Supabase delete failed for %s/%s", self.bucket, object_path)
            return False


# A default singleton — import as `supabase_avatars` to use the avatar bucket.
supabase_avatars = SupabaseStorageClient()
