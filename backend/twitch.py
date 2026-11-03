"""Read-only Twitch EventSub bridge. OAuth tokens never leave the server."""

import threading
import time
from urllib.parse import urlsplit

import requests
import websocket

from backend.game import GameError

SOCKET_URL = "wss://eventsub.wss.twitch.tv/ws"


def parse_command(body):
    if not isinstance(body, str):
        return None
    command, _, content = body.strip().partition(" ")
    kind = {"!incident": "incident", "!question": "question", "!spin": "spin"}.get(command.lower())
    if kind and 0 < len(content.strip()) <= 280:
        return kind, content.strip()
    return None


def valid_socket_url(url):
    parsed = urlsplit(url)
    return (
        parsed.scheme == "wss"
        and parsed.hostname == "eventsub.wss.twitch.tv"
        and parsed.port in (None, 443)
        and not parsed.username
        and not parsed.password
    )


class Twitch:
    def __init__(self, store, client_id, secret):
        self.store, self.client_id, self.secret = store, client_id, secret
        self.workers = {}
        self.lock = threading.RLock()

    def connect(self, room, slot, token):
        validation = requests.get(
            "https://id.twitch.tv/oauth2/validate",
            headers={"Authorization": f"OAuth {token['access_token']}"},
            timeout=10,
        )
        validation.raise_for_status()
        user = validation.json()
        if user.get("client_id") != self.client_id or "user:read:chat" not in user.get(
            "scopes", []
        ):
            raise GameError("Twitch authorization did not include chat reading permission.")
        worker = Worker(self, room, slot, token, user)
        with self.lock:
            other = self.workers.get((room, 1 - slot))
            if other and other.user["user_id"] == user["user_id"]:
                raise GameError("Connect a different Twitch account for the second creator.")
            for key, old in list(self.workers.items()):
                if key == (room, slot) or old.user["user_id"] == user["user_id"]:
                    old.stop.set()
                    if old.socket:
                        old.socket.close()
                    del self.workers[key]
            self.workers[(room, slot)] = worker
        threading.Thread(target=worker.run, daemon=True).start()

    def current(self, worker):
        return self.workers.get((worker.room, worker.slot)) is worker and not worker.stop.is_set()

    def statuses(self, code):
        with self.lock:
            return [
                {
                    "slot": i,
                    "status": self.workers[(code, i)].status,
                    "channel": self.workers[(code, i)].user["login"],
                }
                if (code, i) in self.workers
                else {"slot": i, "status": "disconnected", "channel": None}
                for i in range(2)
            ]

    def disconnect(self, code, slot):
        with self.lock:
            worker = self.workers.pop((code, slot), None)
            if worker:
                worker.stop.set()
                if worker.socket:
                    worker.socket.close()
                self.pause(code)

    def pause(self, code):
        with self.store.room(code, write=True) as room:
            if room["deadline"]:
                room["remaining"] = max(0, room["deadline"] - time.time())
                room["deadline"] = None

    def receive(self, worker, payload):
        event = payload.get("event", {})
        # Shared Chat copies must be ingested only by their original channel's connection.
        source = event.get("source_broadcaster_user_id") or event.get("broadcaster_user_id")
        if source != worker.user["user_id"]:
            return
        parsed = parse_command(event.get("message", {}).get("text"))
        if not parsed:
            return
        user_id, message_id = event.get("chatter_user_id"), event.get("message_id")
        if not user_id or not message_id:
            return
        with self.lock:
            if self.current(worker):
                self.store.submit(
                    worker.room,
                    *parsed,
                    event.get("chatter_user_name", "Viewer"),
                    worker.user["login"],
                    user_id,
                    message_id,
                )


class Worker:
    def __init__(self, manager, room, slot, token, user):
        self.manager, self.room, self.slot = manager, room, slot
        self.token, self.user = token, user
        self.status = "connecting"
        self.stop = threading.Event()
        self.socket = None
        self.expires = time.time() + token.get("expires_in", 3600)
        self.validated = time.time()

    def refresh(self):
        response = requests.post(
            "https://id.twitch.tv/oauth2/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": self.token["refresh_token"],
                "client_id": self.manager.client_id,
                "client_secret": self.manager.secret,
            },
            timeout=10,
        )
        response.raise_for_status()
        self.token = response.json()
        self.expires = time.time() + self.token.get("expires_in", 3600)

    def validate(self):
        response = requests.get(
            "https://id.twitch.tv/oauth2/validate",
            headers={"Authorization": f"OAuth {self.token['access_token']}"},
            timeout=10,
        )
        response.raise_for_status()
        user = response.json()
        if (
            user.get("user_id") != self.user["user_id"]
            or user.get("client_id") != self.manager.client_id
            or "user:read:chat" not in user.get("scopes", [])
        ):
            raise GameError("Twitch authorization changed. Connect again.")
        self.validated = time.time()

    def subscribe(self, session):
        response = requests.post(
            "https://api.twitch.tv/helix/eventsub/subscriptions",
            headers={
                "Authorization": f"Bearer {self.token['access_token']}",
                "Client-Id": self.manager.client_id,
            },
            json={
                "type": "channel.chat.message",
                "version": "1",
                "condition": {
                    "broadcaster_user_id": self.user["user_id"],
                    "user_id": self.user["user_id"],
                },
                "transport": {"method": "websocket", "session_id": session},
            },
            timeout=10,
        )
        response.raise_for_status()
        if not response.json().get("data"):
            raise GameError("Twitch did not create the chat subscription.")

    def run(self):
        import json

        backoff = 1
        while not self.stop.is_set():
            try:
                if time.time() > self.expires - 90:
                    self.refresh()
                self.validate()
                self.socket = websocket.create_connection(SOCKET_URL, timeout=15)
                welcome = json.loads(self.socket.recv())
                if welcome.get("metadata", {}).get("message_type") != "session_welcome":
                    raise GameError("Twitch did not welcome the connection.")
                session = welcome["payload"]["session"]
                self.socket.settimeout(session.get("keepalive_timeout_seconds", 10) + 5)
                self.subscribe(session["id"])
                with self.manager.lock:
                    if not self.manager.current(self):
                        return
                    self.status = "connected"
                backoff = 1
                while not self.stop.is_set():
                    if time.time() > self.expires - 90:
                        self.refresh()
                    if time.time() - self.validated > 3000:
                        self.validate()
                    message = json.loads(self.socket.recv())
                    kind = message.get("metadata", {}).get("message_type")
                    if kind == "notification":
                        try:
                            self.manager.receive(self, message["payload"])
                        except GameError:
                            pass  # Invalid or oversized viewer commands never crash the bridge.
                    elif kind == "session_reconnect":
                        url = message["payload"]["session"]["reconnect_url"]
                        if not valid_socket_url(url):
                            raise GameError("Untrusted Twitch reconnect address.")
                        replacement = websocket.create_connection(url, timeout=15)
                        try:
                            greeting = json.loads(replacement.recv())
                            if greeting["metadata"]["message_type"] != "session_welcome":
                                raise GameError("Invalid reconnect welcome.")
                            replacement.settimeout(
                                greeting["payload"]["session"].get("keepalive_timeout_seconds", 10)
                                + 5
                            )
                        except Exception:
                            replacement.close()
                            raise
                        self.socket.close()
                        self.socket = replacement
                    elif kind == "revocation":
                        raise GameError("Twitch revoked chat access. Connect again.")
            except (requests.HTTPError, GameError):
                self.status = "authorization_error"
                with self.manager.lock:
                    if self.manager.current(self):
                        self.manager.pause(self.room)
                return
            except (
                requests.RequestException,
                websocket.WebSocketException,
                OSError,
                ValueError,
                KeyError,
            ):
                self.status = "reconnecting"
                with self.manager.lock:
                    if self.manager.current(self):
                        self.manager.pause(self.room)
                if self.stop.wait(backoff):
                    return
                backoff = min(backoff * 2, 30)
            finally:
                if self.socket:
                    self.socket.close()
