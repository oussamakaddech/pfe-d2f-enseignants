import pytest

from app.core.messaging import NullBroker, build_broker, decode_message
from tests.fakes import build_settings


def test_decode_message_from_json_bytes():
    assert decode_message(b'{"a": 1}') == {"a": 1}


def test_decode_message_from_string():
    assert decode_message('{"a": 1}') == {"a": 1}


def test_decode_message_rejects_non_object():
    with pytest.raises(ValueError):
        decode_message(b'[1, 2, 3]')


def test_decode_message_rejects_invalid_json():
    with pytest.raises(ValueError):
        decode_message(b"not-json")


def test_build_broker_defaults_to_null():
    broker = build_broker(build_settings())
    assert isinstance(broker, NullBroker)


def test_null_broker_publish_is_noop():
    broker = build_broker(build_settings())
    broker.publish("analyse.test", {"teacher_id": "T1"})
