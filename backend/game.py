"""The room is the game: private inbox, public record, one shared correction."""

import copy
import hashlib
import hmac
import json
import secrets
import sqlite3
import threading
import time
from contextlib import contextmanager

INCIDENTS = [
    "Your budget airline delivered every passenger to the same person's wedding.",
    "Your zoo insists it has no animals. Something has just escaped.",
    "Your luxury hotel replaced every bed with a motivational poster.",
    "Your weather app has been reporting everyone's emotional state instead.",
    "Your restaurant accidentally appointed a raccoon as head of customer service.",
    "Your space agency sent its only astronaut to a very convincing escape room.",
]
PHASES = ["briefing", "opening", "questions", "closing", "finished"]
KINDS = {"incident", "question", "spin"}


def setup_state():
    return {
        "confirmed": {role: False for role in ("creator", "moderator", "viewer")},
        "creators_confirmed": [False, False],
        "incident_selected": False,
        "complete": False,
    }


def moderator_key(code, key):
    return hmac.new(key.encode(), f"moderator:{code}".encode(), hashlib.sha256).hexdigest()


class GameError(Exception):
    def __init__(self, message, status=400):
        self.status = status
        super().__init__(message)


def text(value, label="Text", maximum=280):
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > maximum:
        raise GameError(f"{label} must be 1–{maximum} characters.")
    return value.strip()


def slot_number(value):
    if type(value) is not int or value not in (0, 1):
        raise GameError("Choose creator 1 or 2.")
    return value


class Store:
    def __init__(self, path):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, data TEXT NOT NULL)"
        )
        self.db.commit()
        self.lock = threading.RLock()

    def create(self, names, mode):
        if names is None:
            names = ["Creator 1", "Creator 2"]
        if not isinstance(names, list) or len(names) != 2:
            raise GameError("Enter two creator names.")
        names = [text(n, "Creator name", 32) for n in names]
        if mode not in ("rehearsal", "live"):
            raise GameError("Choose rehearsal or live play.")
        key = secrets.token_urlsafe(32)
        code = secrets.token_hex(4).upper()
        room = {
            "id": code,
            "key_hash": hashlib.sha256(key.encode()).hexdigest(),
            "moderator_key_hash": hashlib.sha256(moderator_key(code, key).encode()).hexdigest(),
            "setup": setup_state(),
            "names": names,
            "mode": mode,
            "phase": "briefing",
            "turn": 0,
            "round": 1,
            "incident": INCIDENTS[0],
            "queue": [],
            "claims": [],
            "featured": None,
            "spin": None,
            "correction_used": False,
            "deadline": None,
            "remaining": None,
            "seen": [],
            "cooldowns": {},
            "revision": 0,
            "control_version": 0,
        }
        with self.lock, self.db:
            # shortcut: bounded local rooms, use expiring room ownership for a public service.
            if self.db.execute("SELECT COUNT(*) FROM rooms").fetchone()[0] >= 100:
                raise GameError("This server has reached its 100-room limit.", 429)
            self.db.execute("INSERT INTO rooms VALUES (?, ?)", (room["id"], json.dumps(room)))
        return room["id"], key

    @contextmanager
    def room(self, code, key=None, write=False, roles=None):
        with self.lock:
            row = self.db.execute("SELECT data FROM rooms WHERE id = ?", (code,)).fetchone()
            if not row:
                raise GameError("Room not found. Check the room link.", 404)
            room = json.loads(row[0])
            if key is not None:
                role = self.role(room, key)
                if roles and role not in roles:
                    raise GameError("This control is not available to your role.", 403)
            yield room
            if write:
                room["revision"] += 1
                with self.db:
                    self.db.execute(
                        "UPDATE rooms SET data = ? WHERE id = ?", (json.dumps(room), code)
                    )

    def role(self, room, key):
        digest = hashlib.sha256(key.encode()).hexdigest()
        for role, field in (("creator", "key_hash"), ("moderator", "moderator_key_hash")):
            if secrets.compare_digest(room.get(field, ""), digest):
                return role
        raise GameError("This private invite is invalid. Ask the creator for a new link.", 403)

    def invite(self, code, key):
        # Older rooms acquire a separate moderator credential when the creator opens setup.
        with self.room(code, key, write=True, roles=("creator",)) as room:
            invite = moderator_key(code, key)
            room["moderator_key_hash"] = hashlib.sha256(invite.encode()).hexdigest()
        return invite

    def confirm(self, code, key=None, name=None, slot=None):
        with self.room(code, key, write=True) as room:
            role = self.role(room, key) if key else "viewer"
            if role == "creator" and slot is not None:
                slot = slot_number(slot)
                room["names"][slot] = text(name, "Your name", 32)
            if "setup" in room and not (role == "creator" and slot == 0):
                room["setup"]["confirmed"][role] = True
            if "setup" in room and role == "creator":
                checks = room["setup"].setdefault(
                    "creators_confirmed", [False, room["setup"]["confirmed"]["creator"]]
                )
                if slot is None:
                    checks[:] = [True, True]  # Compatibility with earlier creator check-in clients.
                else:
                    checks[slot] = True

    def view(self, code, key=None):
        with self.room(code, key) as room:
            result = copy.deepcopy(room)
            role = self.role(room, key) if key else "viewer"
        for field in ("key_hash", "moderator_key_hash", "seen", "cooldowns"):
            result.pop(field, None)
        result["role"] = role
        # Existing rooms remain playable without retroactively requiring a setup checklist.
        result.setdefault(
            "setup",
            {
                **setup_state(),
                "complete": True,
                "incident_selected": True,
                "creators_confirmed": [True, True],
            },
        )
        result["setup"].pop("shared", None)
        result["setup"].setdefault(
            "creators_confirmed",
            [result["setup"]["complete"], result["setup"]["confirmed"]["creator"]],
        )
        result["setup_complete"] = result["setup"]["complete"]
        if role != "moderator":
            result.pop("queue")
        if role == "viewer":
            result.pop("spin")  # Adviser's talking point stays off the audience display.
            result.pop("setup")
        return result

    def submit(self, code, kind, body, author, source, user_id, message_id):
        if not isinstance(kind, str) or kind not in KINDS:
            raise GameError("Unknown contribution type.")
        body = text(body)
        with self.room(code, write=True) as room:
            if room["phase"] == "finished":
                return False
            if message_id in room["seen"]:
                return False
            now = time.time()
            room["seen"] = (room["seen"] + [message_id])[-500:]
            last = room["cooldowns"].get(user_id, 0)
            if now - last < 10:
                return False
            if len(room["queue"]) >= 100:
                return False
            room["cooldowns"][user_id] = now
            room["cooldowns"] = {u: t for u, t in room["cooldowns"].items() if now - t < 60}
            room["queue"].append(
                {
                    "id": secrets.token_hex(6),
                    "kind": kind,
                    "text": body,
                    "author": str(author)[:40],
                    "source": str(source)[:40],
                }
            )
            return True

    def action(self, code, key, action, data):
        with self.room(code, key, write=True) as room:
            role = self.role(room, key)
            allowed = {
                "creator": {
                    "incident",
                    "setup_complete",
                    "advance",
                    "turn",
                    "timer",
                    "correct",
                    "new_round",
                },
                "moderator": {
                    "approve",
                    "reject",
                    "claim",
                    "clear",
                    "correct",
                },
            }
            if not isinstance(action, str) or action not in allowed[role]:
                raise GameError("This control is not available to your role.", 403)
            if data.get("expected_version", room.get("control_version", 0)) != room.get(
                "control_version", 0
            ):
                raise GameError("Your partner changed the controls. Refresh and try again.", 409)
            if action == "incident":
                if room["phase"] != "briefing":
                    raise GameError("Choose the incident during briefing.", 409)
                room["incident"] = text(data.get("text"), "Incident")
                if "setup" in room:
                    room["setup"]["incident_selected"] = True
            elif action == "setup_complete":
                setup = room.get("setup")
                if setup:
                    if not (
                        all(setup["confirmed"][role] for role in ("creator", "moderator"))
                        and all(setup.get("creators_confirmed", [True, True]))
                        and setup["incident_selected"]
                    ):
                        raise GameError(
                            "Confirm both creators and the moderator, then choose an incident.", 409
                        )
                    setup["complete"] = True
            elif action == "advance":
                if not room.get("setup", {"complete": True})["complete"]:
                    raise GameError("The creator must finish room setup first.", 409)
                if (
                    room["phase"] == "briefing"
                    and not room.get("setup", {"incident_selected": True})["incident_selected"]
                ):
                    raise GameError(
                        "Choose this round's incident before starting the statement.", 409
                    )
                if room["phase"] == "finished":
                    raise GameError("Start a new round first.", 409)
                room["phase"] = PHASES[PHASES.index(room["phase"]) + 1]
                room["deadline"] = None
                room["remaining"] = None
                if room["phase"] == "opening":
                    room["deadline"] = time.time() + 30
                if room["phase"] == "closing":
                    room["featured"] = None
                    room["spin"] = None
            elif action == "turn":
                if room["phase"] not in ("opening", "questions", "closing"):
                    raise GameError("Start the conference before passing the mic.", 409)
                room["turn"] = 1 - room["turn"]
                room["deadline"] = time.time() + 30
                room["remaining"] = None
            elif action == "timer":
                if room["phase"] not in ("opening", "questions", "closing"):
                    raise GameError("The timer is available during the conference.", 409)
                if room["deadline"] and room["deadline"] <= time.time():
                    room["deadline"] = time.time() + 30
                    room["remaining"] = None
                elif room["deadline"]:
                    room["remaining"] = max(0, room["deadline"] - time.time())
                    room["deadline"] = None
                else:
                    duration = room["remaining"] or 30
                    room["deadline"] = time.time() + duration
                    room["remaining"] = None
            elif action == "claim":
                if room["phase"] not in ("opening", "questions", "closing"):
                    raise GameError("Start the conference before pinning a claim.", 409)
                if len(room["claims"]) >= 12:
                    raise GameError("The record is full: 12 claims per round.", 409)
                room["claims"].append(
                    {
                        "id": secrets.token_hex(4),
                        "text": text(data.get("text"), "Claim"),
                        "speaker": room["names"][room["turn"]],
                        "corrected": False,
                    }
                )
            elif action == "correct":
                if room["phase"] not in ("opening", "questions", "closing"):
                    raise GameError("Corrections are available during the conference.", 409)
                if room["correction_used"]:
                    raise GameError("Your shared correction has already been used.", 409)
                claim = next((c for c in room["claims"] if c["id"] == data.get("id")), None)
                if not claim:
                    raise GameError("Choose a pinned claim.")
                replacement = text(data.get("text"), "Correction")
                claim["original"] = claim["text"]
                claim["text"] = replacement
                claim["corrected"] = True
                room["correction_used"] = True
            elif action in ("approve", "reject"):
                item = next((q for q in room["queue"] if q["id"] == data.get("id")), None)
                if not item:
                    raise GameError("That contribution has already been handled.", 409)
                if action == "approve":
                    if item["kind"] == "incident":
                        if room["phase"] != "briefing":
                            raise GameError("Save incident selection for the next briefing.", 409)
                        room["incident"] = item["text"]
                        if "setup" in room:
                            room["setup"]["incident_selected"] = True
                    else:
                        if room["phase"] not in ("opening", "questions"):
                            raise GameError(
                                "Feature contributions during opening or questions.", 409
                            )
                        room["featured" if item["kind"] == "question" else "spin"] = item
                room["queue"].remove(item)
            elif action == "clear":
                room["featured"] = None
                room["spin"] = None
            elif action == "new_round":
                if room["phase"] != "finished":
                    raise GameError("Finish this conference before starting the next.", 409)
                room.update(
                    phase="briefing",
                    turn=0,
                    claims=[],
                    queue=[],
                    featured=None,
                    spin=None,
                    correction_used=False,
                    deadline=None,
                    remaining=None,
                    round=room["round"] + 1,
                )
                setup = room.setdefault(
                    "setup",
                    {
                        **setup_state(),
                        "complete": True,
                        "confirmed": {role: True for role in ("creator", "moderator", "viewer")},
                        "creators_confirmed": [True, True],
                    },
                )
                setup["incident_selected"] = False
            else:
                raise GameError("Unknown room action.")
            room["control_version"] = room.get("control_version", 0) + 1
