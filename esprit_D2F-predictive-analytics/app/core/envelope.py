from typing import Any

from app.core.exceptions import AppError
from app.core.pagination import PageMeta


def ok(data: Any, meta: dict | None = None) -> dict[str, Any]:
    return {"data": data, "meta": meta or {}, "errors": []}


def ok_page(data: list[Any], page_meta: PageMeta, extra_meta: dict | None = None) -> dict[str, Any]:
    meta: dict[str, Any] = page_meta.to_dict()
    if extra_meta:
        meta.update(extra_meta)
    return ok(data, meta)


def error_response(errors: list[dict[str, Any]]) -> dict[str, Any]:
    return {"data": None, "meta": {}, "errors": errors}


def error_from_app_error(exc: AppError) -> dict[str, Any]:
    return error_response([exc.to_dict()])
