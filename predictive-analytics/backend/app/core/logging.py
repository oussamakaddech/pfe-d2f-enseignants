"""Configuration logging + middleware observabilité (request-id)."""

from __future__ import annotations

import logging
import sys
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


def setup_logging(debug: bool = False) -> None:
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    logging.basicConfig(
        level=logging.DEBUG if debug else logging.INFO,
        handlers=handlers,
        format="%(asctime)s %(levelname)s [%(name)s] request_id=%(request_id)s %(message)s",
    )
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Injecte request_id dans le contexte de logging et la réponse."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        context = {"request_id": request_id}
        filters = [
            f for f in logging.getLogger().filters
            if isinstance(f, RequestIdFilter)
        ]
        if not filters:
            request_id_filter = RequestIdFilter()
            logging.getLogger().addFilter(request_id_filter)
            filters = [request_id_filter]
        filters[0].request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response


class RequestIdFilter(logging.Filter):
    def __init__(self, request_id: str = "-") -> None:
        super().__init__()
        self.request_id = request_id

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = getattr(self, "request_id", "-")
        return True
