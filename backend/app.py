import os
import secrets
import threading
import time
from pathlib import Path
from urllib.parse import urlencode, urlsplit

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, send_from_directory
from werkzeug.exceptions import HTTPException

from backend.game import INCIDENTS, GameError, Store, slot_number
from backend.twitch import Twitch

ROOT = Path(__file__).resolve().parent.parent


def create_app(database=None):
    load_dotenv(ROOT / ".env", encoding="utf-8-sig")
    dist = ROOT / "frontend" / "dist"
    app = Flask(__name__, static_folder=str(dist), static_url_path="/assets-static")
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024
    store = Store(database or os.environ.get("DAMAGE_CONTROL_DB", "damage-control.sqlite3"))
    client_id = os.environ.get("TWITCH_CLIENT_ID", "")
    secret = os.environ.get("TWITCH_CLIENT_SECRET", "")
    base = os.environ.get("APP_BASE_URL", "http://localhost:5000").rstrip("/")
    twitch = Twitch(store, client_id, secret)
    pending = {}
    pending_lock = threading.Lock()
    app.extensions.update(game=store, twitch=twitch)

    def key():
        value = request.headers.get("X-Control-Key", "")
        if not value or len(value) > 100:
            raise GameError("Open the creator invite link to use these controls.", 403)
        return value

    def body():
        value = request.get_json()
        if not isinstance(value, dict):
            raise GameError("Send a JSON object.")
        return value

    @app.before_request
    def protect_writes():
        if request.method == "POST":
            origin = request.headers.get("Origin")
            if origin and origin not in (base, request.host_url.rstrip("/")):
                raise GameError("Requests must come from this application's origin.", 403)

    @app.after_request
    def headers(response):
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"
        )
        if not request.path.startswith(("/assets/", "/assets-static/")):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.errorhandler(GameError)
    def game_error(error):
        return jsonify(error=str(error)), error.status

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(error=error.description), error.code

    @app.get("/api/config")
    def config():
        return jsonify(
            twitch_configured=bool(client_id and secret),
            twitch_redirect_uri=base + "/api/twitch/callback",
            incidents=INCIDENTS,
        )

    @app.post("/api/rooms")
    def create_room():
        data = body()
        code, control_key = store.create(data.get("names"), data.get("mode", "rehearsal"))
        return jsonify(id=code, key=control_key), 201

    @app.get("/api/rooms/<code>")
    def room(code):
        control_key = key() if request.headers.get("X-Control-Key") else None
        result = store.view(code, control_key)
        result["channels"] = twitch.statuses(code)
        result["server_time"] = time.time()
        return jsonify(result)

    @app.post("/api/rooms/<code>/actions")
    def action(code):
        data = body()
        if data.get("action") == "setup_complete":
            with store.room(code, key(), roles=("creator",)) as current:
                if current["mode"] == "live" and any(
                    c["status"] != "connected" for c in twitch.statuses(code)
                ):
                    raise GameError("Connect both Twitch channels before finishing setup.", 409)
        store.action(code, key(), data.get("action"), data)
        return jsonify(ok=True)

    @app.post("/api/rooms/<code>/invites")
    def invites(code):
        return jsonify(moderator_key=store.invite(code, key()))

    @app.post("/api/rooms/<code>/confirm")
    def confirm(code):
        data = body() if request.content_length else {}
        store.confirm(
            code,
            key() if request.headers.get("X-Control-Key") else None,
            data.get("name"),
            data.get("slot"),
        )
        return jsonify(ok=True)

    @app.post("/api/rooms/<code>/rehearsal")
    def rehearsal(code):
        control_key = key()
        data = body()
        with store.room(code, control_key, roles=("moderator",)) as current:
            if current["mode"] != "rehearsal":
                raise GameError("Sample contributions are disabled in live rooms.", 403)
        store.submit(
            code,
            data.get("kind"),
            data.get("text"),
            "Demo journalist",
            "Rehearsal",
            secrets.token_hex(8),
            secrets.token_hex(8),
        )
        return jsonify(ok=True)

    @app.post("/api/rooms/<code>/twitch/start")
    def oauth_start(code):
        data = body()
        slot = slot_number(data.get("slot"))
        with store.room(code, key(), roles=("creator",)) as current:
            if current["mode"] != "live":
                raise GameError("Create a live room to connect Twitch.")
        if not client_id or not secret:
            raise GameError("Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET, then restart.", 503)
        origin = request.headers.get("Origin")
        if origin and origin != base:
            raise GameError(
                f"Open {base} before connecting Twitch so the authorization returns to this browser's room.",
                409,
            )
        if data.get("name") is not None:
            store.confirm(code, key(), data["name"], slot)
        state = secrets.token_urlsafe(32)
        with pending_lock:
            for stale in [s for s, v in pending.items() if time.time() - v[2] > 600]:
                del pending[stale]
            if len(pending) >= 100:
                raise GameError("Too many pending Twitch connections. Try again later.", 429)
            pending[state] = (code, slot, time.time())
        url = "https://id.twitch.tv/oauth2/authorize?" + urlencode(
            {
                "client_id": client_id,
                "redirect_uri": base + "/api/twitch/callback",
                "response_type": "code",
                "scope": "user:read:chat",
                "state": state,
                "force_verify": "true",
            }
        )
        response = jsonify(url=url)
        response.set_cookie(
            "dc_oauth",
            state,
            max_age=600,
            httponly=True,
            secure=urlsplit(base).scheme == "https",
            samesite="Lax",
        )
        return response

    @app.get("/api/twitch/callback")
    def oauth_callback():
        state = request.args.get("state", "")
        cookie = request.cookies.get("dc_oauth", "")
        if not state or not cookie or not secrets.compare_digest(state, cookie):
            raise GameError(
                "Twitch connection expired or opened in another browser. Try again.", 403
            )
        with pending_lock:
            entry = pending.pop(state, None)
        if not entry or time.time() - entry[2] > 600:
            raise GameError("This Twitch connection has expired. Try again.", 403)
        code, slot, _ = entry
        notice = "connected"
        if request.args.get("error") or not request.args.get("code"):
            notice = "denied"
        else:
            try:
                response = requests.post(
                    "https://id.twitch.tv/oauth2/token",
                    data={
                        "client_id": client_id,
                        "client_secret": secret,
                        "code": request.args["code"],
                        "grant_type": "authorization_code",
                        "redirect_uri": base + "/api/twitch/callback",
                    },
                    timeout=10,
                )
                response.raise_for_status()
                twitch.connect(code, slot, response.json())
            except (requests.RequestException, GameError, KeyError, ValueError):
                notice = "failed"
        with store.room(code) as current:
            needs_setup = not current.get("setup", {"complete": True})["complete"]
        destination = f"/room/{code}" + ("/setup" if slot == 0 and needs_setup else "")
        result = redirect(f"{destination}?slot={slot}&twitch={notice}")
        result.delete_cookie("dc_oauth")
        return result

    @app.post("/api/rooms/<code>/twitch/disconnect")
    def disconnect(code):
        data = body()
        with store.room(code, key(), roles=("creator",)):
            pass
        twitch.disconnect(code, slot_number(data.get("slot")))
        return jsonify(ok=True)

    @app.get("/healthz")
    def health():
        return jsonify(status="ok")

    @app.get("/")
    @app.get("/<path:path>")
    def frontend(path=""):
        if path.startswith("api/"):
            raise GameError("API route not found.", 404)
        if not (dist / "index.html").exists():
            return (
                "Build the frontend first: cd frontend && pnpm install --frozen-lockfile && pnpm run build",
                503,
            )
        if path.startswith("assets/"):
            return send_from_directory(dist, path)
        return send_from_directory(dist, "index.html")

    return app


if __name__ == "__main__":
    from waitress import serve

    serve(
        create_app(),
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "5000")),
        threads=8,
    )
