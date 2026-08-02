import math
from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")


@dataclass(frozen=True)
class PageMeta:
    page: int
    size: int
    total: int
    pages: int

    def to_dict(self) -> dict:
        return {"page": self.page, "size": self.size, "total": self.total, "pages": self.pages}


@dataclass(frozen=True)
class Page(Generic[T]):
    data: list[T]
    meta: PageMeta


def paginate(items: list[T], page: int, size: int) -> Page[T]:
    page = max(page, 1)
    size = max(size, 1)
    total = len(items)
    pages = math.ceil(total / size) if total else 0
    start = (page - 1) * size
    return Page(data=items[start : start + size], meta=PageMeta(page=page, size=size, total=total, pages=pages))
