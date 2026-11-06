from datetime import datetime, timedelta, timezone

from app.domain.value_objects.time_format import iso_utc


def test_naive_date_is_read_as_utc():
    assert iso_utc(datetime(2026, 9, 24, 3, 12)) == "2026-09-24T03:12:00+00:00"


def test_aware_date_has_a_single_timezone_suffix():
    # avant : isoformat() + "Z" donnait "...+00:00Z" et GET /needs répondait 500
    value = datetime(2026, 9, 24, 5, 12, tzinfo=timezone(timedelta(hours=2)))
    assert iso_utc(value) == "2026-09-24T03:12:00+00:00"
    assert datetime.fromisoformat(iso_utc(value)) == value
