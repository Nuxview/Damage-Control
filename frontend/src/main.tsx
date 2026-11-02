import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

type Item = {
  id: string;
  kind: "incident" | "question" | "spin";
  text: string;
  author: string;
  source: string;
};
type Claim = {
  id: string;
  text: string;
  speaker: string;
  corrected: boolean;
  original?: string;
};
type Channel = { slot: number; status: string; channel: string | null };
type Participant = "creator" | "moderator" | "viewer";
type Setup = {
  shared: Record<Participant, boolean>;
  confirmed: Record<Participant, boolean>;
  incident_selected: boolean;
  complete: boolean;
};
type Room = {
  role: Participant;
  setup?: Setup;
  control_version: number;
  id: string;
  names: string[];
  mode: string;
  phase: string;
  turn: number;
  round: number;
  incident: string;
  queue?: Item[];
  claims: Claim[];
  featured: Item | null;
  spin?: Item | null;
  correction_used: boolean;
  deadline: number | null;
  remaining: number | null;
  channels: Channel[];
  server_time: number;
};
type Config = { twitch_configured: boolean; incidents: string[] };
const phases = ["briefing", "opening", "questions", "closing", "finished"];
const phaseNames: Record<string, string> = {
  briefing: "The briefing",
  opening: "Opening statement",
  questions: "Face the press",
  closing: "Closing statement",
  finished: "Conference closed",
};
const nextNames: Record<string, string> = {
  briefing: "Start opening statement",
  opening: "Open the floor",
  questions: "Make closing statement",
  closing: "Close conference",
  finished: "Start next round",
};
const kindNames = {
  incident: "Incident",
  question: "Journalist question",
  spin: "PR talking point",
};
const samples = [
  {
    kind: "question",
    text: "Your website promises complimentary accommodation. Does the bride know?",
  },
  { kind: "spin", text: "Describe this as a destination wedding upgrade." },
  {
    kind: "question",
    text: "Why does the wedding cake have a boarding gate number?",
  },
];
async function api(path: string, key = "", data?: unknown) {
  const response = await fetch("/api" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      ...(key ? { "X-Control-Key": key } : {}),
      ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "The request failed. Try again.");
  return result;
}
function App() {
  const path = location.pathname.split("/");
  const code = path[2]?.toUpperCase() || "";
  const overlay = path[1] === "overlay";
  const publicViewer = path[1] === "view";
  const setupPage = path[3] === "setup";
  const storageKey = (path[1] === "moderator" ? "dc:moderator:" : "dc:") + code;
  const [key] = useState(() => {
    if (overlay || publicViewer || !code) return "";
    const incoming = new URLSearchParams(location.hash.slice(1)).get("key");
    try {
      if (incoming) localStorage.setItem(storageKey, incoming);
      if (incoming)
        history.replaceState(null, "", location.pathname + location.search);
      return incoming || localStorage.getItem(storageKey) || "";
    } catch {
      return incoming || "";
    }
  });
  const [config, setConfig] = useState<Config>({
    twitch_configured: false,
    incidents: [],
  });
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now() / 1000);
  const [offset, setOffset] = useState(0);
  const [help, setHelp] = useState(false);
  const [moderatorKey, setModeratorKey] = useState("");
  const [displayConfirmed, setDisplayConfirmed] = useState(false);
  const [names, setNames] = useState(["", ""]);
  const [mode, setMode] = useState("rehearsal");
  const [claim, setClaim] = useState("");
  const [incident, setIncident] = useState("");
  const [sampleKind, setSampleKind] = useState("question");
  const [sampleText, setSampleText] = useState("");
  const [filter, setFilter] = useState("all");
  const [correctionId, setCorrectionId] = useState("");
  const [correction, setCorrection] = useState("");
  const [copied, setCopied] = useState("");
  const prefix = "/rooms/" + code;
  const view = room?.role || "viewer";
  const isCreator = view === "creator";
  const setup = room?.setup;
  const showSetup = isCreator && setupPage;
  useEffect(() => {
    if (!showSetup || !key) return;
    api(prefix + "/invites", key, {})
      .then((result) => setModeratorKey(result.moderator_key))
      .catch((e) => setError(e.message));
  }, [showSetup, key, prefix]);
  useEffect(() => {
    api("/config")
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() / 1000), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    document.body.classList.toggle("overlay-body", overlay);
    if (!code) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const result = await api(prefix, key);
        if (!stopped) {
          setRoom(result);
          setOffset(result.server_time - Date.now() / 1000);
          setConnectionError("");
        }
      } catch (e) {
        if (!stopped) setConnectionError((e as Error).message);
      }
      if (!stopped) timer = setTimeout(load, 1000);
    };
    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [code, key]);
  async function perform(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setRoom(await api(prefix, key));
  }
  async function act(action: string, data: Record<string, unknown> = {}) {
    await api(prefix + "/actions", key, {
      action,
      expected_version: room?.control_version ?? 0,
      ...data,
    });
    await refresh();
  }
  async function create() {
    const result = await api("/rooms", "", {
      names: names.map((n, i) => n.trim() || ["Alex", "Jamie"][i]),
      mode,
    });
    if (mode === "rehearsal") {
      const invites = await api(
        "/rooms/" + result.id + "/invites",
        result.key,
        {},
      );
      for (const sample of samples)
        await api(
          "/rooms/" + result.id + "/rehearsal",
          invites.moderator_key,
          sample,
        );
    }
    location.href =
      "/room/" + result.id + "/setup#key=" + encodeURIComponent(result.key);
  }
  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }
  const remaining = room?.deadline
    ? Math.max(0, Math.ceil(room.deadline - now - offset))
    : Math.ceil(room?.remaining ?? 30);
  const isPerforming =
    !!room && ["opening", "questions", "closing"].includes(room.phase);
  const connected =
    room?.channels.filter((c) => c.status === "connected").length || 0;
  const disabled = busy || !!connectionError;
  const setupReady =
    !!setup &&
    Object.values(setup.shared).every(Boolean) &&
    Object.values(setup.confirmed).every(Boolean) &&
    setup.incident_selected &&
    (room?.mode === "rehearsal" || connected === 2);
  const notice = new URLSearchParams(location.search).get("twitch");
  const status =
    room?.mode === "rehearsal"
      ? "Rehearsal • sample contributions"
      : `${connected}/2 Twitch channels connected`;
  const stage = room && (
    <section
      className={"stage " + (overlay ? "broadcast" : "")}
      aria-label="Audience preview"
    >
      <div className="stage-top">
        <span className="on-air">
          <i />
          {room.mode === "rehearsal"
            ? "Rehearsal"
            : connected
              ? "Twitch connected"
              : "Awaiting Twitch"}
        </span>
        <span>
          Round {room.round} / {phaseNames[room.phase]}
        </span>
      </div>
      <div className="incident-display">
        <span className="stage-label">The situation</span>
        <h2>{room.incident}</h2>
      </div>
      {!overlay && (
        <div className="podiums">
          {room.names.map((name, i) => (
            <div
              key={i}
              className={"podium " + (room.turn === i ? "speaking" : "")}
            >
              <div className="mic" aria-hidden="true">
                <span />
              </div>
              <strong>{name}</strong>
              <span>
                {room.turn === i ? "On the record" : "Your partner in this"}
              </span>
            </div>
          ))}
        </div>
      )}
      {overlay && (
        <div className="broadcast-speaker">
          On the record: <strong>{room.names[room.turn]}</strong>
        </div>
      )}
      <div className="question-display">
        <span>
          {room.phase === "finished"
            ? "Officially, that went well."
            : room.featured
              ? `Question from ${room.featured.author}`
              : phaseNames[room.phase]}
        </span>
        <p>
          {room.phase === "finished"
            ? "Same partners. Another questionable explanation?"
            : room.featured?.text ||
              (room.phase === "briefing"
                ? "Your partner said it. You have to defend it."
                : room.phase === "closing"
                  ? "Deliver one explanation. Make your claims fit."
                  : "Keep a straight face. The press is listening.")}
        </p>
      </div>
      {overlay && room.claims.length > 0 && (
        <div className="broadcast-receipts">
          <strong>You said…</strong>
          {room.claims.slice(-3).map((c) => (
            <p key={c.id}>
              “{c.text}” <small>— {c.speaker}</small>
            </p>
          ))}
        </div>
      )}
      <div className="stage-bottom">
        <b>damage control.</b>
        <span>
          {room.correction_used
            ? "Official correction used"
            : "One official correction remaining"}
          {room.mode === "rehearsal" ? " / Sample play" : ""}
        </span>
      </div>
    </section>
  );
  const controls = room && key && (
    <section className="round-controls panel">
      <div className="phase-track">
        {phases.map((p, i) => (
          <span
            key={p}
            className={
              p === room.phase
                ? "current"
                : i < phases.indexOf(room.phase)
                  ? "complete"
                  : ""
            }
          >
            {i + 1}
            <small>{phaseNames[p]}</small>
          </span>
        ))}
      </div>
      <div className="control-row">
        <div className="timer">
          <strong>
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:
            {String(remaining % 60).padStart(2, "0")}
          </strong>
          <button
            className="text-button"
            disabled={disabled || !isPerforming}
            onClick={() => perform(() => act("timer"))}
          >
            {remaining === 0
              ? "Restart 30s timer"
              : room.deadline
                ? "Pause timer"
                : room.remaining !== null
                  ? "Resume timer"
                  : "Start 30s timer"}
          </button>
        </div>
        <button
          className="secondary"
          disabled={disabled || !isPerforming}
          onClick={() => perform(() => act("turn"))}
        >
          Pass the mic
        </button>
        <button
          className="primary"
          disabled={disabled || !setup?.complete}
          onClick={() =>
            perform(() =>
              act(room.phase === "finished" ? "new_round" : "advance"),
            )
          }
        >
          {nextNames[room.phase]}
        </button>
      </div>
      <p className="muted">
        The timer is a cue, not a cutoff. Advance when the joke lands.
      </p>
    </section>
  );
  const incidentPicker = room && isCreator && room.phase === "briefing" && (
    <section className="panel incident-picker">
      <h2>Choose your disaster</h2>
      <div className="incident-options">
        {config.incidents.map((s) => (
          <button
            disabled={disabled}
            key={s}
            className={
              s === room.incident && setup?.incident_selected ? "selected" : ""
            }
            aria-pressed={s === room.incident && !!setup?.incident_selected}
            onClick={() => perform(() => act("incident", { text: s }))}
          >
            {s}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          perform(async () => {
            await act("incident", { text: incident });
            setIncident("");
          });
        }}
      >
        <label>
          Or write your own fictional incident
          <textarea
            maxLength={280}
            value={incident}
            onChange={(e) => setIncident(e.target.value)}
            placeholder="Our company would like to address…"
          />
        </label>
        <button className="secondary" disabled={disabled || !incident.trim()}>
          Use this incident
        </button>
      </form>
    </section>
  );
  const advice = room && key && isPerforming && room.spin && (
    <section className="panel adviser">
      <div>
        <span className="section-kicker">For your eyes only</span>
        <h2>Your PR adviser says…</h2>
      </div>
      <p>
        {room.spin?.text ||
          "Approve a talking point from the inbox. Work it into your answer without breaking character."}
      </p>
      {room.spin && (
        <small>
          Suggested by {room.spin.author} / {room.spin.source}
        </small>
      )}
    </section>
  );
  const record = room && (
    <section className="panel record">
      <div className="panel-heading">
        <h2>You said…</h2>
        <span className="count">{room.claims.length}/12</span>
      </div>
      <p className="muted">An official record of unfortunate commitments.</p>
      {room.claims.length === 0 ? (
        <div className="empty-note">
          The record is clean.
          <br />
          <small>Enjoy that while it lasts.</small>
        </div>
      ) : (
        <ol className="claims">
          {room.claims.map((c, i) => (
            <li key={c.id}>
              <span className="receipt-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <blockquote>“{c.text}”</blockquote>
                <small>
                  {c.speaker}
                  {c.corrected ? " / Officially corrected" : ""}
                </small>
                {c.original && (
                  <p className="original">Previously: {c.original}</p>
                )}
                {key && !room.correction_used && isPerforming && (
                  <button
                    className="text-button correction-link"
                    disabled={disabled}
                    onClick={() => {
                      setCorrectionId(c.id);
                      setCorrection("");
                    }}
                  >
                    Use correction here
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {key && view === "moderator" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            perform(async () => {
              await act("claim", { text: claim });
              setClaim("");
            });
          }}
        >
          <label>
            Pin what was actually said
            <textarea
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              maxLength={280}
              placeholder="We guarantee every passenger a slice of cake."
            />
          </label>
          <button
            className="secondary full"
            disabled={disabled || !isPerforming || !claim.trim()}
          >
            Pin to the record
          </button>
        </form>
      )}
      <div
        className={"correction-meter " + (room.correction_used ? "used" : "")}
      >
        <span>{room.correction_used ? "0" : "1"}</span>
        <div>
          <strong>Shared official correction</strong>
          <small>
            {room.correction_used
              ? "You’re committed to everything else."
              : "One lifeline. Use it together."}
          </small>
        </div>
      </div>
    </section>
  );
  const inbox = room && view === "moderator" && (
    <section className="panel inbox">
      <div className="panel-heading">
        <h2>The press inbox</h2>
        <span className="count">{room.queue?.length || 0}</span>
      </div>
      <p className="muted">Nothing goes on-air until you approve it.</p>
      <div className="filters" role="group" aria-label="Filter contributions">
        {["all", "question", "spin", "incident"].map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {
              {
                all: "All",
                question: "Questions",
                spin: "PR",
                incident: "Incidents",
              }[f]
            }
          </button>
        ))}
      </div>
      <div className="queue-list">
        {room.queue
          ?.filter((q) => filter === "all" || q.kind === filter)
          .map((q) => (
            <article className="queue-item" key={q.id}>
              <div>
                <span className={"kind " + q.kind}>{kindNames[q.kind]}</span>
                <small>{q.source}</small>
              </div>
              <p>{q.text}</p>
              <small>From {q.author}</small>
              <div className="queue-actions">
                <button
                  className="secondary"
                  disabled={
                    disabled ||
                    (q.kind === "incident"
                      ? room.phase !== "briefing"
                      : !["opening", "questions"].includes(room.phase))
                  }
                  onClick={() => perform(() => act("approve", { id: q.id }))}
                >
                  {q.kind === "spin"
                    ? "Send to adviser"
                    : q.kind === "incident"
                      ? "Use incident"
                      : "Put on-air"}
                </button>
                <button
                  className="text-button"
                  disabled={disabled}
                  onClick={() => perform(() => act("reject", { id: q.id }))}
                >
                  Dismiss
                </button>
              </div>
            </article>
          ))}
        {!room.queue?.some((q) => filter === "all" || q.kind === filter) && (
          <div className="empty-note">
            Waiting for the press.
            <br />
            <small>
              {room.mode === "rehearsal"
                ? "Add a sample contribution below."
                : "Ask chat to use the commands below."}
            </small>
          </div>
        )}
      </div>
      <button
        className="text-button"
        disabled={disabled || (!room.featured && !room.spin)}
        onClick={() => perform(() => act("clear"))}
      >
        Clear question & talking point
      </button>
    </section>
  );
  const participantNames: Record<Participant, string> = {
    creator: "Your creator partner",
    moderator: "Your moderator",
    viewer: "Your audience",
  };
  const inviteLinks: Record<Participant, string> = {
    creator:
      location.origin + "/room/" + code + "#key=" + encodeURIComponent(key),
    moderator:
      location.origin +
      "/moderator/" +
      code +
      "#key=" +
      encodeURIComponent(moderatorKey),
    viewer: location.origin + "/view/" + code,
  };
  const roomLinks = room && isCreator && setup && (
    <section className="panel setup-step">
      <span className="section-kicker">1 / Bring everyone in</span>
      <h2>Share a link. Get a quick thumbs-up.</h2>
      <p className="muted">
        Each link opens only that participant’s page. Ask them to press “I can
        see the room” when it loads. Keep private links off-stream.
      </p>
      <ul className="setup-checklist">
        {(["creator", "moderator", "viewer"] as const).map((participant) => (
          <li key={participant}>
            <div className="checklist-heading">
              <h3>{participantNames[participant]}</h3>
              <span
                className={
                  "check-status " +
                  (setup.confirmed[participant] ? "checked" : "")
                }
              >
                {setup.confirmed[participant]
                  ? "Page checked ✓"
                  : "Waiting for confirmation"}
              </span>
            </div>
            <p className="muted">
              {participant === "creator"
                ? "The situation, approved advice and performance controls."
                : participant === "moderator"
                  ? "The press inbox, publishing controls and claim record."
                  : "The public display and chat commands. No private tools."}
            </p>
            <div className="checklist-actions">
              <button
                className="secondary"
                disabled={
                  disabled || (participant === "moderator" && !moderatorKey)
                }
                onClick={() =>
                  perform(() => copy(inviteLinks[participant], participant))
                }
              >
                {copied === participant
                  ? "Copied link"
                  : "Copy " + participant + " link"}
              </button>
              {(participant !== "moderator" || moderatorKey) && (
                <a
                  className="text-button"
                  href={inviteLinks[participant]}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open {participant} page
                </a>
              )}
              <label className="share-check">
                <input
                  type="checkbox"
                  checked={setup.shared[participant]}
                  disabled={disabled}
                  onChange={(e) =>
                    perform(() =>
                      act("share", {
                        role: participant,
                        shared: e.target.checked,
                      }),
                    )
                  }
                />
                I’ve shared this link
              </label>
            </div>
          </li>
        ))}
      </ul>
      <small className="invite-note">
        Page checks confirm that someone can see the page; they are not an
        ongoing connection or Twitch chat test. For a solo rehearsal, open the
        three links in separate tabs and confirm each one.
      </small>
      <details className="command-help">
        <summary>OBS browser source (optional)</summary>
        <p className="muted">
          Transparent, read-only display. Set the source to 1920 × 1080.
        </p>
        <button
          className="secondary"
          onClick={() =>
            perform(() => copy(location.origin + "/overlay/" + code, "overlay"))
          }
        >
          {copied === "overlay" ? "Copied overlay URL" : "Copy overlay URL"}
        </button>{" "}
        <a href={"/overlay/" + code} target="_blank" rel="noreferrer">
          Preview overlay
        </a>
      </details>
    </section>
  );
  const channels = room && room.mode === "live" && isCreator && (
    <section className="channel-bar panel">
      <div>
        <strong>Your communities</strong>
        <small>Each creator connects their own Twitch account.</small>
      </div>
      {room.channels.map((c, i) => (
        <div key={i} className="channel">
          <span>
            {room.names[i]}
            <small>
              {c.channel ? "@" + c.channel + " — " : ""}
              {c.status.replaceAll("_", " ")}
            </small>
          </span>
          <button
            className="secondary"
            disabled={disabled || !config.twitch_configured}
            onClick={() =>
              perform(async () => {
                const result = await api(prefix + "/twitch/start", key, {
                  slot: i,
                });
                location.href = result.url;
              })
            }
          >
            {c.status === "connected" ? "Reconnect" : "Connect Twitch"}
          </button>
          {c.channel && (
            <button
              className="text-button"
              disabled={disabled}
              onClick={() =>
                perform(async () => {
                  await api(prefix + "/twitch/disconnect", key, {
                    slot: i,
                  });
                  await refresh();
                })
              }
            >
              Disconnect
            </button>
          )}
        </div>
      ))}
      {!config.twitch_configured && (
        <p className="muted">
          Server setup required: add Twitch app credentials to .env and restart.
          See the README.
        </p>
      )}
    </section>
  );
  const sampleInput = room &&
    view === "moderator" &&
    room.mode === "rehearsal" && (
      <details className="panel rehearsal-tools">
        <summary>Add a sample contribution</summary>
        <p className="muted">
          Rehearsal only. These are not real Twitch messages.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            perform(async () => {
              await api(prefix + "/rehearsal", key, {
                kind: sampleKind,
                text: sampleText,
              });
              setSampleText("");
              await refresh();
            });
          }}
        >
          <label>
            Contribution type
            <select
              value={sampleKind}
              onChange={(e) => setSampleKind(e.target.value)}
            >
              {Object.entries(kindNames).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Message
            <textarea
              value={sampleText}
              maxLength={280}
              onChange={(e) => setSampleText(e.target.value)}
              required
            />
          </label>
          <button
            disabled={disabled || !sampleText.trim()}
            className="secondary"
          >
            Add to inbox
          </button>
        </form>
      </details>
    );
  const chatGuide = (
    <section className="chat-guide">
      <h3>Give chat the floor</h3>
      <p>
        <code>!question</code> Ask a difficult question
      </p>
      <p>
        <code>!spin</code> Suggest a terrible talking point
      </p>
      <p>
        <code>!incident</code> Pitch the next fictional disaster
      </p>
      <small>
        One contribution per viewer every 10 seconds. Keep it fictional, kind,
        and under 280 characters.
      </small>
    </section>
  );
  const participantCheck = room && room.phase === "briefing" && !showSetup && (
    <div className="participant-check" role="status">
      <div>
        <strong>
          {view === "viewer"
            ? "Audience display"
            : view === "moderator"
              ? "Moderator page"
              : "Creator page"}
        </strong>
        <p>
          {displayConfirmed || setup?.confirmed[view]
            ? "Page check sent to the creator."
            : "Let the creator know this page is working before the conference starts."}
        </p>
      </div>
      <button
        className="secondary"
        disabled={disabled || displayConfirmed || !!setup?.confirmed[view]}
        onClick={() =>
          perform(async () => {
            await api(prefix + "/confirm", key, {});
            setDisplayConfirmed(true);
            await refresh();
          })
        }
      >
        {displayConfirmed || setup?.confirmed[view]
          ? "Confirmed ✓"
          : "I can see the room"}
      </button>
    </div>
  );
  if (overlay)
    return (
      <main className="overlay-shell">
        {connectionError && (
          <div className="alert">
            Overlay disconnected. Waiting to reconnect.
          </div>
        )}
        {stage || (
          <p className="alert">
            {connectionError || "Connecting to conference…"}
          </p>
        )}
      </main>
    );
  return (
    <>
      <header className="app-header">
        <div className="page-frame header-content">
          <a className="brand" href="/">
            <span className="brand-mark">
              dc<span>.</span>
            </span>
            <span>
              damage control<small>My partner said what?</small>
            </span>
          </a>
          <div className="header-actions">
            {room && <span className="room-code">Room {code}</span>}
            <button className="text-button" onClick={() => setHelp(true)}>
              How to play
            </button>
            {room && isCreator && (
              <a
                className="secondary"
                href={"/room/" + code + (showSetup ? "" : "/setup")}
              >
                {showSetup ? "Creator page" : "Room setup"}
              </a>
            )}
          </div>
        </div>
      </header>
      <main className="shell page-frame">
        {(error || connectionError) && (
          <div className="alert" role="alert">
            {error || connectionError}
            <button
              aria-label="Dismiss action error"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}
        {!code ? (
          <div className="landing">
            <section className="intro">
              <span className="conference-seal" aria-hidden="true">
                Office of
                <br />
                <strong>questionable</strong>
                <br />
                explanations
              </span>
              <h1>
                Your partner said it.
                <br />
                You have to defend it.
              </h1>
              <p>
                Two creators. One terrible statement. An entire audience asking
                all the wrong questions.
              </p>
              <div className="example">
                <span>Breaking: the zoo has no animals.</span>
                <blockquote>“We’re prioritizing animal privacy.”</blockquote>
                <small>
                  Congratulations. That’s now your official position.
                </small>
              </div>
            </section>
            <section className="setup panel">
              <span className="section-kicker">Call a press conference</span>
              <h2>Who’s taking the mic?</h2>
              <p>
                Bring a partner and your usual voice or video call. We’ll bring
                the difficult questions.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  perform(create);
                }}
              >
                {names.map((name, i) => (
                  <label key={i}>
                    Creator {i + 1}
                    <input
                      maxLength={32}
                      value={name}
                      placeholder={["Alex", "Jamie"][i]}
                      onChange={(e) =>
                        setNames(
                          names.map((n, j) => (j === i ? e.target.value : n)),
                        )
                      }
                    />
                  </label>
                ))}
                <fieldset>
                  <legend>Choose your conference</legend>
                  <label
                    className={
                      "mode-option " + (mode === "rehearsal" ? "selected" : "")
                    }
                  >
                    <input
                      type="radio"
                      name="mode"
                      value="rehearsal"
                      checked={mode === "rehearsal"}
                      onChange={() => setMode("rehearsal")}
                    />
                    <span>
                      <strong>Rehearsal</strong>
                      <small>
                        Try a complete round with labeled sample questions.
                      </small>
                    </span>
                  </label>
                  <label
                    className={
                      "mode-option " + (mode === "live" ? "selected" : "")
                    }
                  >
                    <input
                      type="radio"
                      name="mode"
                      value="live"
                      checked={mode === "live"}
                      onChange={() => setMode("live")}
                    />
                    <span>
                      <strong>Live with Twitch</strong>
                      <small>
                        Connect each creator’s channel. Chat supplies the chaos.
                      </small>
                    </span>
                  </label>
                </fieldset>
                {mode === "live" && !config.twitch_configured && (
                  <p className="muted">
                    Twitch app credentials need to be configured on the server
                    before connecting channels. Rehearsal is ready now.
                  </p>
                )}
                <button className="primary full" disabled={busy}>
                  {busy
                    ? "Preparing the briefing…"
                    : mode === "rehearsal"
                      ? "Open rehearsal studio"
                      : "Create live studio"}
                </button>
              </form>
              <p className="setup-foot">
                No AI subscription. No downloads for your viewers. Absolutely no
                plausible deniability.
              </p>
            </section>
          </div>
        ) : !room ? (
          <div className="empty">
            {connectionError || "Preparing your press room…"}
          </div>
        ) : (
          <>
            <div className="studio-heading">
              <div>
                <span className="section-kicker">
                  {key
                    ? `${showSetup ? "Room setup" : view === "moderator" ? "Moderator" : "Creator"} / Round ${room.round}`
                    : "From the audience"}
                </span>
                <h1>
                  {!key
                    ? "The press is listening."
                    : view === "moderator"
                      ? "Give them a good question."
                      : showSetup
                        ? "First, get everyone ready."
                        : "Keep your stories straight."}
                </h1>
              </div>
              <span
                className={
                  "connection-pill " +
                  (room.mode === "rehearsal"
                    ? "demo"
                    : connected === 2
                      ? "ready"
                      : "")
                }
              >
                {status}
              </span>
            </div>
            {notice && (
              <div className="notice" role="status">
                {notice === "connected"
                  ? "Authorization received. Connection status appears below."
                  : "Twitch connection was not completed. Check the app configuration and try again."}
              </div>
            )}
            {participantCheck}
            {key && !setup?.complete && !showSetup && (
              <p className="notice">
                The creator is setting up the room. Confirm your page above; the
                conference can start when the checklist is complete.
              </p>
            )}
            {!key ? (
              <div className="viewer-workspace">
                <p className="workspace-intro">
                  Watch the conference and help build the next joke in Twitch
                  chat.
                </p>
                {stage}
                <details className="viewer-record">
                  <summary>The official record ({room.claims.length})</summary>
                  {record}
                </details>
                {chatGuide}
              </div>
            ) : showSetup ? (
              <div className="setup-workspace">
                <div className="workspace-intro">
                  <h2>A quick pre-show check.</h2>
                  <p>
                    Invite your team, check their pages, then choose the
                    fictional incident you’ll defend. Everyone’s confirmation
                    appears here automatically.
                  </p>
                </div>
                {roomLinks}
                <section className="panel setup-step">
                  <span className="section-kicker">2 / Check the chat</span>
                  <h2>
                    {room.mode === "rehearsal"
                      ? "Rehearsal is ready."
                      : "Connect your communities."}
                  </h2>
                  {room.mode === "rehearsal" ? (
                    <p className="muted">
                      Labeled sample contributions are waiting in the
                      moderator’s inbox. No Twitch connection is required.
                    </p>
                  ) : (
                    channels
                  )}
                </section>
                <div className="setup-step">
                  <span className="section-kicker">
                    3 / Pick your opening disaster
                  </span>
                  {room.phase === "briefing" ? (
                    incidentPicker
                  ) : (
                    <p className="notice">
                      The incident is locked for this round. Finish the
                      conference to choose another.
                    </p>
                  )}
                  {room.phase === "briefing" && setup?.incident_selected && (
                    <p className="selected-incident" role="status">
                      Selected: {room.incident}
                    </p>
                  )}
                </div>
                <div className="setup-finish">
                  <p>
                    {setup?.complete
                      ? "Setup is complete. Your team is ready for the conference."
                      : setupReady
                        ? "Everyone has checked in. Your disaster is selected."
                        : "Share and check all three links, then choose an incident. Live rooms also need both Twitch channels connected."}
                  </p>
                  <button
                    className="primary"
                    disabled={disabled || (!setup?.complete && !setupReady)}
                    onClick={() =>
                      perform(async () => {
                        if (!setup?.complete) await act("setup_complete");
                        location.href = "/room/" + code;
                      })
                    }
                  >
                    {setup?.complete
                      ? "Return to creator page"
                      : "Finish setup & enter creator page"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="workspace-intro">
                  {view === "creator"
                    ? "Focus on your partner and the question. Your moderator handles the press."
                    : "Choose what goes on-air and keep a faithful record of what was said."}
                </p>
                <div className={"workspace workspace-" + view}>
                  <div className="workspace-primary">
                    {view === "creator" ? (
                      <>
                        {stage}
                        {advice}
                        {room.phase === "briefing" && (
                          <a
                            className="text-button"
                            href={"/room/" + code + "/setup"}
                          >
                            Change the incident in room setup
                          </a>
                        )}
                        {controls}
                      </>
                    ) : (
                      <>
                        {inbox}
                        {sampleInput}
                        <details className="audience-peek">
                          <summary>Preview the audience display</summary>
                          {stage}
                        </details>
                        {controls}
                      </>
                    )}
                  </div>
                  <aside className="workspace-secondary">
                    {record}
                    {view === "moderator" && (
                      <details className="command-help">
                        <summary>Chat commands</summary>
                        {chatGuide}
                      </details>
                    )}
                  </aside>
                </div>
              </>
            )}
          </>
        )}
      </main>
      <footer className="app-footer">
        <div className="page-frame footer-content">
          <b>damage control.</b>
          <span>Fictional disasters. Real teamwork.</span>
        </div>
      </footer>
      {help && (
        <dialog
          ref={(node) => {
            if (node && !node.open) node.showModal();
          }}
          onCancel={() => setHelp(false)}
          className="modal"
          aria-labelledby="help-title"
        >
          <h2 id="help-title">Your partner said what?</h2>
          <p>
            Keep a shared explanation alive while your communities ask
            increasingly difficult questions.
          </p>
          <ol>
            <li>Choose a fictional incident. Start the opening statement.</li>
            <li>Take turns answering approved journalist questions.</li>
            <li>Feed your partner approved PR talking points.</li>
            <li>Pin actual claims. You get one shared correction.</li>
            <li>Close with one explanation that fits the record.</li>
          </ol>
          <p>
            Use your existing call for voice or video. Give the private invite
            to a moderator so you can focus on the performance.
          </p>
          <button className="primary" autoFocus onClick={() => setHelp(false)}>
            We’ve got this. Probably.
          </button>
        </dialog>
      )}
      {correctionId && (
        <dialog
          ref={(node) => {
            if (node && !node.open) node.showModal();
          }}
          onCancel={() => setCorrectionId("")}
          className="modal"
          aria-labelledby="correction-title"
        >
          <h2 id="correction-title">Issue your only correction</h2>
          <p>
            The original stays in the record. You won’t get another correction
            this round.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              perform(async () => {
                await act("correct", { id: correctionId, text: correction });
                setCorrectionId("");
              });
            }}
          >
            <label>
              What did you mean to say?
              <textarea
                autoFocus
                maxLength={280}
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                required
              />
            </label>
            <div className="button-row">
              <button
                type="button"
                className="secondary"
                onClick={() => setCorrectionId("")}
              >
                Keep our story
              </button>
              <button
                className="primary"
                disabled={disabled || !correction.trim()}
              >
                Use our correction
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
