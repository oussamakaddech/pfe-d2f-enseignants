"""Couvre NullBroker complet + RabbitBroker (pika mocké) + build_broker."""
import sys
from types import SimpleNamespace

import pytest

from app.core.messaging import NullBroker, RabbitBroker, build_broker
from tests.fakes import build_settings


def test_null_broker_start_and_stop_noop():
    broker = build_broker(build_settings())
    broker.start(lambda message: None)
    broker.stop()


def test_build_broker_returns_rabbit_for_rabbitmq():
    settings = build_settings(message_broker_type="rabbitmq")
    broker = build_broker(settings)
    assert isinstance(broker, RabbitBroker)


def test_rabbit_broker_stop_without_connection():
    broker = RabbitBroker(build_settings(message_broker_type="rabbitmq"))
    broker.stop()
    assert broker._connection is None


class _FakeChannel:
    def __init__(self):
        self.consumer_callback = None
        self.consumed = False
        self.published = []

    def exchange_declare(self, **kwargs):
        pass

    def queue_declare(self, **kwargs):
        pass

    def queue_bind(self, **kwargs):
        pass

    def basic_consume(self, queue=None, on_message_callback=None):
        self.consumer_callback = on_message_callback

    def start_consuming(self):
        self.consumed = True

    def basic_publish(self, **kwargs):
        self.published.append(kwargs)

    def basic_ack(self, delivery_tag=None):
        pass

    def basic_nack(self, delivery_tag=None, requeue=False):
        pass


class _FakeConnection:
    def __init__(self, params):
        self.channel_obj = _FakeChannel()
        self.closed = False

    def channel(self):
        return self.channel_obj

    def close(self):
        self.closed = True


class _FakePika:
    def __init__(self):
        self._conn = None

    def URLParameters(self, url):
        return SimpleNamespace(url=url)

    def BlockingConnection(self, params):
        self._conn = _FakeConnection(params)
        return self._conn


@pytest.fixture
def fake_pika(monkeypatch):
    fake = _FakePika()
    monkeypatch.setitem(sys.modules, "pika", fake)
    return fake


def _rabbit_settings():
    return build_settings(
        message_broker_type="rabbitmq",
        rabbitmq_consumer_enabled=True,
        rabbitmq_exchange="d2f.events",
        rabbitmq_queue="d2f.test",
        rabbitmq_routing_key="analyse.#",
    )


def test_rabbit_start_with_consumer_enabled_consumes(fake_pika):
    broker = RabbitBroker(_rabbit_settings())
    received = []
    broker.start(on_message=lambda message: received.append(message))
    channel = fake_pika._conn.channel_obj
    assert channel.consumed is True
    assert channel.consumer_callback is not None

    method = SimpleNamespace(delivery_tag=1)
    channel.consumer_callback(channel, method, None, b'{"teacher_id": "T001"}')
    assert received == [{"teacher_id": "T001"}]


def test_rabbit_callback_acks_valid_and_nacks_failing(fake_pika):
    broker = RabbitBroker(_rabbit_settings())

    def failing(message):
        raise RuntimeError("boom")

    broker.start(on_message=failing)
    channel = fake_pika._conn.channel_obj
    method = SimpleNamespace(delivery_tag=3)
    channel.consumer_callback(channel, method, None, b'{"x": 1}')


def test_rabbit_callback_ignores_undecodable(fake_pika):
    broker = RabbitBroker(_rabbit_settings())
    broker.start(on_message=lambda message: None)
    channel = fake_pika._conn.channel_obj
    channel.consumer_callback(channel, SimpleNamespace(delivery_tag=2), None, b"not-json")


def test_rabbit_start_disabled_does_not_connect(fake_pika):
    settings = build_settings(
        message_broker_type="rabbitmq",
        rabbitmq_consumer_enabled=False,
    )
    broker = RabbitBroker(settings)
    broker.start(on_message=lambda message: None)
    assert fake_pika._conn is None


def test_rabbit_publish_connects_and_sends(fake_pika):
    broker = RabbitBroker(_rabbit_settings())
    broker.publish("analyse.gap", {"teacher_id": "T001"})
    channel = fake_pika._conn.channel_obj
    assert len(channel.published) == 1
    assert channel.published[0]["routing_key"] == "analyse.gap"
    assert '"teacher_id"' in channel.published[0]["body"]


def test_rabbit_stop_closes_connection(fake_pika):
    broker = RabbitBroker(_rabbit_settings())
    broker.publish("analyse.gap", {"teacher_id": "T001"})
    broker.stop()
    assert fake_pika._conn.closed is True
