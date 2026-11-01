from concurrent.futures import ThreadPoolExecutor

import pytest

from backend.app import create_app
from backend.game import GameError, Store
from backend.twitch import Twitch, Worker, parse_command, valid_socket_url


@pytest.fixture
def room(tmp_path):
    store = Store(str(tmp_path / "game.sqlite3"))
    code, key = store.create(["Alex", "Jamie"], "rehearsal")
    return store, code, key


def start(store, code, key):
    store.action(code, key, "advance", {})


def test_private_inbox_and_advice_never_reach_public_view(room):
    store, code, key = room
    store.submit(code, "spin", "Blame the cake", "Viewer", "channel", "1", "m1")
    item = store.view(code, key)["queue"][0]
    start(store, code, key)
    store.action(code, key, "approve", {"id": item["id"]})
    public = store.view(code)
    assert "spin" not in public and "queue" not in public and "key_hash" not in public
    assert store.view(code, key)["spin"]["text"] == "Blame the cake"
    assert "key_hash" not in store.view(code, key)


def test_claim_correction_is_shared_atomic_and_keeps_original(room):
    store, code, key = room
    start(store, code, key)
    store.action(code, key, "claim", {"text": "All guests get a room"})
    claim_id = store.view(code)["claims"][0]["id"]

    def correct(replacement):
        try:
            store.action(code, key, "correct", {"id": claim_id, "text": replacement})
            return True
        except GameError:
            return False

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sum(pool.map(correct, ["A room in spirit", "A room in theory"])) == 1
    state = store.view(code)
    assert state["correction_used"]
    assert state["claims"][0]["original"] == "All guests get a room"


def test_invalid_correction_does_not_spend_lifeline(room):
    store, code, key = room
    start(store, code, key)
    with pytest.raises(GameError):
        store.action(code, key, "correct", {"id": "missing", "text": "oops"})
    assert not store.view(code)["correction_used"]


def test_duplicate_shared_chat_message_and_cooldown(room, monkeypatch):
    store, code, key = room
    monkeypatch.setattr("backend.game.time.time", lambda: 1000)
    assert store.submit(code, "question", "Why?", "A", "one", "1", "m1")
    assert not store.submit(code, "question", "Why?", "A", "two", "1", "m1")
    assert not store.submit(code, "question", "Again?", "A", "one", "1", "m2")
    monkeypatch.setattr("backend.game.time.time", lambda: 1011)
    assert store.submit(code, "question", "Now?", "A", "one", "1", "m3")
    assert len(store.view(code, key)["queue"]) == 2


def test_queue_limit_and_length_validation(room):
    store, code, key = room
    for i in range(101):
        store.submit(code, "question", "Question", "A", "one", str(i), str(i))
    assert len(store.view(code, key)["queue"]) == 100
    with pytest.raises(GameError):
        store.submit(code, "question", "x" * 281, "A", "one", "next", "next")


def test_round_lifecycle_and_reset(room):
    store, code, key = room
    with pytest.raises(GameError):
        store.action(code, key, "new_round", {})
    for phase in ["opening", "questions", "closing", "finished"]:
        store.action(code, key, "advance", {})
        assert store.view(code)["phase"] == phase
    with pytest.raises(GameError):
        store.action(code, key, "advance", {})
    assert not store.submit(code, "question", "Late", "A", "one", "1", "1")
    store.action(code, key, "new_round", {})
    assert store.view(code)["round"] == 2
    assert store.view(code)["phase"] == "briefing"
    assert store.view(code)["claims"] == []


def test_approval_is_explicit_and_phase_guarded(room):
    store, code, key = room
    store.submit(code, "question", "Does the bride know?", "A", "one", "1", "1")
    item = store.view(code, key)["queue"][0]
    assert store.view(code)["featured"] is None
    with pytest.raises(GameError):
        store.action(code, key, "approve", {"id": item["id"]})
    assert len(store.view(code, key)["queue"]) == 1
    start(store, code, key)
    store.action(code, key, "approve", {"id": item["id"]})
    assert store.view(code)["featured"]["text"] == "Does the bride know?"
    with pytest.raises(GameError):
        store.action(code, key, "approve", {"id": item["id"]})


def test_state_survives_restart(room):
    store, code, key = room
    start(store, code, key)
    store.action(code, key, "claim", {"text": "A permanent commitment"})
    database = store.db.execute("PRAGMA database_list").fetchone()[2]
    restored = Store(database)
    assert restored.view(code, key)["claims"][0]["text"] == "A permanent commitment"


def test_connection_loss_pauses_timer(room):
    store, code, key = room
    start(store, code, key)
    Twitch(store, "client", "secret").pause(code)
    state = store.view(code)
    assert state["deadline"] is None and 0 < state["remaining"] <= 30


@pytest.fixture
def client(tmp_path):
    app = create_app(str(tmp_path / "api.sqlite3"))
    app.config["TESTING"] = True
    return app.test_client()


def create(client, mode="rehearsal"):
    result = client.post("/api/rooms", json={"names": ["Alex", "Jamie"], "mode": mode})
    assert result.status_code == 201
    data = result.json
    return "/api/rooms/" + data["id"], {"X-Control-Key": data["key"]}


def test_api_auth_and_public_projection(client):
    path, headers = create(client)
    assert client.post(path + "/actions", json={"action": "advance"}).status_code == 403
    assert (
        client.post(
            path + "/actions", headers={"X-Control-Key": "bad"}, json={"action": "advance"}
        ).status_code
        == 403
    )
    assert client.get(path, headers={"X-Control-Key": "bad"}).status_code == 403
    assert "queue" not in client.get(path).json
    assert "queue" in client.get(path, headers=headers).json
    assert (
        client.post(path + "/actions", headers=headers, json={"action": "advance"}).status_code
        == 200
    )


def test_live_rooms_cannot_receive_fake_chat(client):
    path, headers = create(client, "live")
    response = client.post(
        path + "/rehearsal", headers=headers, json={"kind": "question", "text": "Fake"}
    )
    assert response.status_code == 403
    assert client.get(path, headers=headers).json["queue"] == []


def test_request_validation_and_origin(client):
    path, headers = create(client)
    assert client.post(path + "/actions", headers=headers, json=[]).status_code == 400
    assert (
        client.post(
            path + "/actions",
            headers={**headers, "Origin": "https://evil.invalid"},
            json={"action": "advance"},
        ).status_code
        == 403
    )
    assert client.post("/api/rooms", json={"names": ["One"], "mode": "live"}).status_code == 400
    assert client.get("/api/rooms/UNKNOWN").status_code == 404
    assert client.get(path).headers["Cache-Control"] == "no-store"


def test_oauth_requires_cookie_and_consumes_state_once(client, monkeypatch):
    monkeypatch.setenv("TWITCH_CLIENT_ID", "client")
    monkeypatch.setenv("TWITCH_CLIENT_SECRET", "secret")
    client = create_app(":memory:").test_client()
    path, headers = create(client, "live")
    assert (
        client.post(path + "/twitch/start", headers=headers, json={"slot": True}).status_code == 400
    )
    response = client.post(path + "/twitch/start", headers=headers, json={"slot": 0})
    from urllib.parse import parse_qs, urlsplit

    state = parse_qs(urlsplit(response.json["url"]).query)["state"][0]
    assert client.get("/api/twitch/callback?state=wrong&code=abc").status_code == 403
    assert client.get(f"/api/twitch/callback?state={state}&error=access_denied").status_code == 302
    assert client.get(f"/api/twitch/callback?state={state}&code=abc").status_code == 403


@pytest.mark.parametrize(
    "body,expected",
    [
        ("!question Why the cake?", ("question", "Why the cake?")),
        ("!SPIN   Blame gravity ", ("spin", "Blame gravity")),
        ("hello !question hi", None),
        ("!question ", None),
        ("!question " + "x" * 281, None),
        (None, None),
    ],
)
def test_chat_command_parser(body, expected):
    assert parse_command(body) == expected


@pytest.mark.parametrize(
    "url",
    [
        "ws://eventsub.wss.twitch.tv/ws",
        "wss://evil.invalid/ws",
        "wss://eventsub.wss.twitch.tv.evil.invalid/ws",
        "wss://user@eventsub.wss.twitch.tv/ws",
    ],
)
def test_reconnect_url_validation(url):
    assert not valid_socket_url(url)


def test_shared_chat_copies_and_stale_workers_are_ignored(room):
    store, code, key = room
    twitch = Twitch(store, "client", "secret")
    worker = Worker(twitch, code, 0, {}, {"user_id": "123", "login": "alex"})
    twitch.workers[(code, 0)] = worker
    event = {
        "broadcaster_user_id": "123",
        "chatter_user_id": "viewer",
        "message_id": "1",
        "message": {"text": "!question Why?"},
    }
    twitch.receive(worker, {"event": {**event, "source_broadcaster_user_id": "456"}})
    assert store.view(code, key)["queue"] == []
    twitch.receive(worker, {"event": event})
    assert len(store.view(code, key)["queue"]) == 1
    worker.stop.set()
    twitch.receive(worker, {"event": {**event, "message_id": "2", "chatter_user_id": "other"}})
    assert len(store.view(code, key)["queue"]) == 1


def test_partner_cannot_advance_twice_from_the_same_screen(room):
    store, code, key = room
    version = store.view(code)["control_version"]
    store.action(code, key, "advance", {"expected_version": version})
    with pytest.raises(GameError, match="partner changed"):
        store.action(code, key, "advance", {"expected_version": version})
    assert store.view(code)["phase"] == "opening"


def test_expired_timer_can_restart(room, monkeypatch):
    store, code, key = room
    monkeypatch.setattr("backend.game.time.time", lambda: 1000)
    start(store, code, key)
    monkeypatch.setattr("backend.game.time.time", lambda: 1031)
    store.action(code, key, "timer", {})
    assert store.view(code)["deadline"] == 1061


def test_bad_command_kind_returns_validation_error(client):
    path, headers = create(client)
    response = client.post(
        path + "/rehearsal", headers=headers, json={"kind": [], "text": "invalid"}
    )
    assert response.status_code == 400


def test_eventsub_migration_preserves_subscription_and_revocation_pauses(room, monkeypatch):
    import json

    store, code, key = room
    start(store, code, key)
    manager = Twitch(store, "client", "secret")
    worker = Worker(
        manager,
        code,
        0,
        {"access_token": "test-only", "expires_in": 10000},
        {"user_id": "123", "login": "alex"},
    )
    manager.workers[(code, 0)] = worker

    class Response:
        def __init__(self, data):
            self.data = data

        def raise_for_status(self):
            pass

        def json(self):
            return self.data

    monkeypatch.setattr(
        "backend.twitch.requests.get",
        lambda *a, **k: Response(
            {"user_id": "123", "client_id": "client", "scopes": ["user:read:chat"]}
        ),
    )
    subscriptions = []

    def subscribe(*args, **kwargs):
        subscriptions.append(kwargs["json"])
        return Response({"data": [{"status": "enabled"}]})

    monkeypatch.setattr("backend.twitch.requests.post", subscribe)

    def packet(kind, payload):
        return json.dumps({"metadata": {"message_type": kind}, "payload": payload})

    class Socket:
        closed = False

        def __init__(self, packets):
            self.packets = iter(packets)

        def recv(self):
            return next(self.packets)

        def settimeout(self, value):
            assert value > 0

        def close(self):
            self.closed = True

    old = Socket(
        [
            packet("session_welcome", {"session": {"id": "old", "keepalive_timeout_seconds": 10}}),
            packet(
                "session_reconnect",
                {"session": {"reconnect_url": "wss://eventsub.wss.twitch.tv/ws?session=new"}},
            ),
        ]
    )
    new = Socket(
        [
            packet("session_welcome", {"session": {"id": "new", "keepalive_timeout_seconds": 10}}),
            packet(
                "notification",
                {
                    "event": {
                        "broadcaster_user_id": "123",
                        "chatter_user_id": "viewer",
                        "chatter_user_name": "Viewer",
                        "message_id": "message",
                        "message": {"text": "!question Why?"},
                    }
                },
            ),
            packet("revocation", {}),
        ]
    )
    sockets = iter([old, new])
    monkeypatch.setattr("backend.twitch.websocket.create_connection", lambda *a, **k: next(sockets))
    worker.run()
    assert len(subscriptions) == 1  # A requested migration transfers existing subscriptions.
    assert subscriptions[0]["transport"]["session_id"] == "old"
    assert worker.status == "authorization_error"
    assert store.view(code)["deadline"] is None
    assert len(store.view(code, key)["queue"]) == 1
    assert old.closed and new.closed
