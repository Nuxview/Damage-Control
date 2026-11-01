"""The room is the game: private inbox, public record, one shared correction."""

import copy
import hashlib
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
        if not isinstance(names, list) or len(names) != 2:
            raise GameError("Enter two creator names.")
        names = [text(n, "Creator name", 32) for n in names]
        if mode not in ("rehearsal", "live"):
            raise GameError("Choose rehearsal or live play.")
        key = secrets.token_urlsafe(32)
        room = {
            "id": secrets.token_hex(4).upper(),
            "key_hash": hashlib.sha256(key.encode()).hexdigest(),
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
    def room(self, code, key=None, write=False):
        with self.lock:
            row = self.db.execute("SELECT data FROM rooms WHERE id = ?", (code,)).fetchone()
            if not row:
                raise GameError("Room not found. Check the room link.", 404)
            room = json.loads(row[0])
            if key is not None and not secrets.compare_digest(
                room["key_hash"], hashlib.sha256(key.encode()).hexdigest()
            ):
                raise GameError(
                    "This creator key is invalid. Ask the host for a fresh invite.", 403
                )
            yield room
            if write:
                room["revision"] += 1
                with self.db:
                    self.db.execute(
                        "UPDATE rooms SET data = ? WHERE id = ?", (json.dumps(room), code)
                    )

    def view(self, code, key=None):
        with self.room(code, key) as room:
            result = copy.deepcopy(room)
        for field in ("key_hash", "seen", "cooldowns"):
            result.pop(field)
        if key is None:
            result.pop("queue")
            result.pop("spin")  # Adviser's talking point stays off the audience display.
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
            if data.get("expected_version", room.get("control_version", 0)) != room.get(
                "control_version", 0
            ):
                raise GameError("Your partner changed the controls. Refresh and try again.", 409)
            if action == "incident":
                if room["phase"] != "briefing":
                    raise GameError("Choose the incident during briefing.", 409)
                room["incident"] = text(data.get("text"), "Incident")
            elif action == "advance":
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
                    incident=INCIDENTS[room["round"] % len(INCIDENTS)],
                )
            else:
                raise GameError("Unknown room action.")
            room["control_version"] = room.get("control_version", 0) + 1
