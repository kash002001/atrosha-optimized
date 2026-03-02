import asyncio
import time
from typing import Any

import httpx

from .types import ClassifyRequest, ClassifyResponse, HealthResponse

_DEFAULT_BASE = "https://atrosha-engine.onrender.com"
_DEFAULT_TIMEOUT = 10.0
_DEFAULT_RETRIES = 3


class AtroshClient:
    """Sync + async Atrosha Semantic Engine client.

    Sync usage:
        client = AtroshClient(api_key="...")
        verdict = client.classify(ClassifyRequest(...))

    Async usage:
        async with AtroshClient(api_key="...") as client:
            verdict = await client.aclassify(ClassifyRequest(...))
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = _DEFAULT_BASE,
        max_retries: int = _DEFAULT_RETRIES,
        timeout: float = _DEFAULT_TIMEOUT,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.max_retries = max_retries
        self.timeout = timeout
        self._headers = {
            "Content-Type": "application/json",
            "X-Atrosha-Key": api_key,
        }

    # --- sync interface ---

    def classify(self, req: ClassifyRequest) -> ClassifyResponse:
        data = self._post("/classify", {"target_url": req.target_url, "payload": req.payload})
        return self._parse_verdict(data)

    def health(self) -> HealthResponse:
        data = self._get("/health")
        return HealthResponse(
            status=data.get("status", ""),
            model_loaded=data.get("model_loaded", False),
            audit_sink=data.get("audit_sink", False),
        )

    def _post(self, path: str, body: dict) -> dict:
        return self._request("POST", path, body)

    def _get(self, path: str) -> dict:
        return self._request("GET", path)

    def _request(self, method: str, path: str, body: Any = None) -> dict:
        for attempt in range(1, self.max_retries + 1):
            try:
                with httpx.Client(timeout=self.timeout) as c:
                    res = c.request(
                        method,
                        f"{self.base_url}{path}",
                        json=body,
                        headers=self._headers,
                    )
                    res.raise_for_status()
                    return res.json()
            except (httpx.TransportError, httpx.TimeoutException) as e:
                if attempt == self.max_retries:
                    raise
                time.sleep(0.2 * 2 ** (attempt - 1))

    # --- async interface ---

    async def aclassify(self, req: ClassifyRequest) -> ClassifyResponse:
        data = await self._apost("/classify", {"target_url": req.target_url, "payload": req.payload})
        return self._parse_verdict(data)

    async def ahealth(self) -> HealthResponse:
        data = await self._aget("/health")
        return HealthResponse(
            status=data.get("status", ""),
            model_loaded=data.get("model_loaded", False),
            audit_sink=data.get("audit_sink", False),
        )

    async def _apost(self, path: str, body: dict) -> dict:
        return await self._arequest("POST", path, body)

    async def _aget(self, path: str) -> dict:
        return await self._arequest("GET", path)

    async def _arequest(self, method: str, path: str, body: Any = None) -> dict:
        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as c:
                    res = await c.request(
                        method,
                        f"{self.base_url}{path}",
                        json=body,
                        headers=self._headers,
                    )
                    res.raise_for_status()
                    return res.json()
            except (httpx.TransportError, httpx.TimeoutException):
                if attempt == self.max_retries:
                    raise
                await asyncio.sleep(0.2 * 2 ** (attempt - 1))

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        pass

    # ---

    @staticmethod
    def _parse_verdict(data: dict) -> ClassifyResponse:
        return ClassifyResponse(
            verdict=data["verdict"],
            confidence=data.get("confidence", 0.0),
            latency_ms=data.get("latency_ms", 0.0),
            source=data.get("source", ""),
            reason=data.get("reason", ""),
        )
