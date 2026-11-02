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
type SetupStep = Participant | "you" | "incident";
type Setup = {
  confirmed: Record<Participant, boolean>;
  creators_confirmed: boolean[];
  incident_selected: boolean;
  complete: boolean;
};
type Room = {
  setup_complete: boolean;
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
type Config = {
  twitch_configured: boolean;
  twitch_redirect_uri: string;
  incidents: string[];
};
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
  const [creatorSlot] = useState(() => {
    const requested = new URLSearchParams(location.search).get("slot");
    try {
      if (requested === "0" || requested === "1")
        sessionStorage.setItem("dc:slot:" + code, requested);
      return sessionStorage.getItem("dc:slot:" + code) === "1" ? 1 : 0;
    } catch {
      return requested === "1" ? 1 : 0;
    }
  });
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
    twitch_redirect_uri: "",
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
  const [setupStep, setSetupStep] = useState<SetupStep | null>(null);
  const [reviewingStep, setReviewingStep] = useState(false);
  const [editingIncident, setEditingIncident] = useState(false);
  const [displayConfirmed, setDisplayConfirmed] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [mode, setMode] = useState("rehearsal");
  const [claim, setClaim] = useState("");
  const [incident, setIncident] = useState<string | null>(null);
  const [sampleKind, setSampleKind] = useState("question");
  const [sampleText, setSampleText] = useState("");
  const [filter, setFilter] = useState("all");
  const [correctionId, setCorrectionId] = useState("");
  const [correction, setCorrection] = useState("");
  const [copied, setCopied] = useState("");
  const prefix = "/rooms/" + code;
  const view = room?.role || "viewer";
  const isCreator = view === "creator";
  const ownName = displayName ?? room?.names[creatorSlot] ?? "";
  const setup = room?.setup;
  const showSetup = isCreator && creatorSlot === 0 && setupPage;
  const setupSteps: SetupStep[] = [
    "you",
    "creator",
    "moderator",
    "viewer",
    "incident",
  ];
  const stepComplete = (step: SetupStep) => {
    if (step === "incident") return !!setup?.incident_selected;
    if (step === "you" || step === "creator") {
      const slot = step === "you" ? 0 : 1;
      return (
        !!setup?.creators_confirmed[slot] &&
        (room?.mode === "rehearsal" ||
          room?.channels.some(
            (c) => c.slot === slot && c.status === "connected",
          ))
      );
    }
    return !!setup?.confirmed[step];
  };
  const firstIncompleteStep =
    setupSteps.find((step) => !stepComplete(step)) || "incident";
  const currentStep =
    setupStep || (setup?.complete ? "incident" : firstIncompleteStep);
  const stepIndex = setupSteps.indexOf(currentStep);
  const nextStep =
    setupSteps.slice(stepIndex + 1).find((step) => !stepComplete(step)) ||
    "incident";
  const currentStepComplete = stepComplete(currentStep);
  const stepTitles: Record<SetupStep, string> = {
    you: room?.mode === "live" ? "Your name & Twitch account" : "Your name",
    creator: "Invite your partner",
    moderator: "Invite your moderator",
    viewer: "Share the audience display",
    incident: "Choose your incident",
  };
  useEffect(() => {
    if (
      showSetup &&
      !reviewingStep &&
      currentStep !== "incident" &&
      currentStepComplete
    )
      setSetupStep(nextStep);
  }, [showSetup, reviewingStep, currentStep, currentStepComplete, nextStep]);
  useEffect(() => {
    setIncident(null);
    setEditingIncident(false);
  }, [room?.round]);
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
    document.documentElement.classList.toggle("overlay-root", overlay);
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
    Object.values(setup.confirmed).every(Boolean) &&
    setup.creators_confirmed.every(Boolean) &&
    setup.incident_selected &&
    (room?.mode === "rehearsal" || connected === 2);
  const notice = new URLSearchParams(location.search).get("twitch");
  const status =
    room?.mode === "rehearsal"
      ? "Rehearsal • sample contributions"
      : `${connected}/2 Twitch channels connected`;
  const stage = room && (
    <section className="stage" aria-label="Audience preview">
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
      {room.claims.length > 0 && (
        <div className="stage-receipts">
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
  const controls = room && isCreator && (
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
          disabled={
            disabled ||
            !setup?.complete ||
            (room.phase === "briefing" && !setup.incident_selected)
          }
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
  const incidentText =
    incident ??
    (room &&
    (room.round > 1 || setup?.incident_selected) &&
    !config.incidents.includes(room.incident)
      ? room.incident
      : "");
  const incidentPicker = room &&
    isCreator &&
    creatorSlot === 0 &&
    room.phase === "briefing" && (
      <section className="panel incident-picker">
        {setup?.incident_selected && !editingIncident ? (
          <>
            <h2>This round’s incident</h2>
            <p className="selected-incident" role="status">
              {room.incident}
            </p>
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => setEditingIncident(true)}
            >
              Change incident
            </button>
          </>
        ) : (
          <>
            <h2>
              {room.round > 1
                ? "Choose the next incident"
                : "Choose your disaster"}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                perform(async () => {
                  await act("incident", { text: incidentText });
                  setIncident(null);
                  setEditingIncident(false);
                });
              }}
            >
              <label>
                Write your own fictional incident
                <textarea
                  maxLength={280}
                  value={incidentText}
                  onChange={(e) => setIncident(e.target.value)}
                  placeholder="Our company would like to address…"
                />
              </label>
              <button
                className="secondary"
                disabled={disabled || !incidentText.trim()}
              >
                Use this incident
              </button>
            </form>
            {room.round > 1 && !setup?.incident_selected && (
              <button
                className="text-button"
                disabled={disabled}
                onClick={() =>
                  perform(async () => {
                    await act("incident", { text: room.incident });
                    setEditingIncident(false);
                  })
                }
              >
                Reuse previous incident
              </button>
            )}
            <details className="sample-incidents">
              <summary>Browse sample incidents</summary>
              <div className="incident-options">
                {config.incidents.map((s) => (
                  <button
                    disabled={disabled}
                    key={s}
                    onClick={() =>
                      perform(async () => {
                        await act("incident", { text: s });
                        setIncident(null);
                        setEditingIncident(false);
                      })
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </details>
            {setup?.incident_selected && (
              <button
                className="text-button"
                onClick={() => setEditingIncident(false)}
              >
                Keep current incident
              </button>
            )}
          </>
        )}
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
      location.origin +
      "/room/" +
      code +
      "?slot=1#key=" +
      encodeURIComponent(key),
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
      <p className="muted">
        This link opens only this participant’s page. Ask them to confirm their
        page when it loads. Keep private links off-stream.
      </p>
      <ul className="setup-checklist">
        {(["creator", "moderator", "viewer"] as const)
          .filter((participant) => participant === currentStep)
          .map((participant) => (
            <li key={participant}>
              <div className="checklist-heading">
                <h3>{participantNames[participant]}</h3>
                <span
                  className={
                    "check-status " +
                    (stepComplete(participant) ? "checked" : "")
                  }
                >
                  {stepComplete(participant)
                    ? participant === "creator"
                      ? "Partner ready ✓"
                      : "Page checked ✓"
                    : setup.confirmed[participant]
                      ? "Page checked · waiting for Twitch"
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
              </div>
            </li>
          ))}
      </ul>
      <small className="invite-note">
        Page checks confirm that someone can see the page; they are not an
        ongoing connection or Twitch chat test. For a solo rehearsal, open the
        participant page in another tab and confirm it. You can continue while
        waiting for a confirmation.
      </small>
      {currentStep === "viewer" && (
        <details className="command-help">
          <summary>OBS browser source (optional)</summary>
          <p className="muted">
            Transparent, read-only display. Set the source to 1920 × 1080.
          </p>
          <button
            className="secondary"
            onClick={() =>
              perform(() =>
                copy(location.origin + "/overlay/" + code, "overlay"),
              )
            }
          >
            {copied === "overlay" ? "Copied overlay URL" : "Copy overlay URL"}
          </button>{" "}
          <a href={"/overlay/" + code} target="_blank" rel="noreferrer">
            Preview overlay
          </a>
        </details>
      )}
    </section>
  );
  const channels = room && room.mode === "live" && isCreator && (
    <section className="channel-bar panel">
      <div>
        <strong>Your Twitch account</strong>
        <small>
          {config.twitch_configured
            ? "App credentials loaded. Authorize each creator’s account using Connect Twitch."
            : "Twitch app credentials have not been loaded by this server."}
        </small>
      </div>
      {room.channels
        .filter((c) => c.slot === creatorSlot)
        .map((c) => (
          <div key={c.slot} className="channel">
            <span>
              {room.names[c.slot]}
              <small>
                {c.channel ? "@" + c.channel + " — " : ""}
                {c.status.replaceAll("_", " ")}
              </small>
            </span>
            <button
              className="secondary"
              disabled={
                disabled || !config.twitch_configured || !ownName.trim()
              }
              onClick={() =>
                perform(async () => {
                  const result = await api(prefix + "/twitch/start", key, {
                    slot: c.slot,
                    ...(setup?.creators_confirmed[creatorSlot]
                      ? {}
                      : { name: ownName }),
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
                      slot: c.slot,
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
      {showSetup && config.twitch_configured && (
        <small>
          Connecting registers a read-only chat subscription; app credentials
          alone do not connect channels. Twitch must return to{" "}
          {config.twitch_redirect_uri}.
        </small>
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
  const pageChecked = isCreator
    ? !!setup?.creators_confirmed[creatorSlot]
    : displayConfirmed || !!setup?.confirmed[view];
  const participantCheck = room &&
    room.phase === "briefing" &&
    !room.setup_complete &&
    !pageChecked && (
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
            {isCreator
              ? "Choose the name shown to your partner and audience. It is saved before Twitch authorization."
              : "Let the creator know this page is working before the conference starts."}
          </p>
        </div>
        {isCreator && (
          <label className="creator-name">
            Your name
            <input
              maxLength={32}
              value={ownName}
              disabled={pageChecked}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
        )}
        <button
          className="secondary"
          disabled={disabled || pageChecked || (isCreator && !ownName.trim())}
          onClick={() =>
            perform(async () => {
              await api(
                prefix + "/confirm",
                key,
                isCreator ? { name: ownName, slot: creatorSlot } : {},
              );
              setDisplayConfirmed(true);
              await refresh();
            })
          }
        >
          {isCreator ? "Save name & confirm" : "I can see the room"}
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
            {room && isCreator && creatorSlot === 0 && (
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
              <h2>Call your press conference.</h2>
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
            {!showSetup && participantCheck}
            {isCreator &&
              !showSetup &&
              (!room.setup_complete ||
                room.channels.some(
                  (c) => c.slot === creatorSlot && c.status !== "connected",
                )) &&
              channels}
            {key && !setup?.complete && !showSetup && (
              <p className="notice">
                The host is finishing setup. You’ll enter the room automatically
                when it is ready.
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
                <div className="workspace-intro" aria-live="polite">
                  <span className="section-kicker">
                    Step {stepIndex + 1} of {setupSteps.length}
                  </span>
                  <h2>{stepTitles[currentStep]}</h2>
                  <progress
                    aria-label="Room setup step"
                    value={stepIndex + 1}
                    max={setupSteps.length}
                  />
                </div>
                {(["creator", "moderator", "viewer"] as string[]).includes(
                  currentStep,
                ) && roomLinks}
                {currentStep === "you" && (
                  <section className="panel setup-step">
                    {participantCheck}
                    {!participantCheck && (
                      <p className="notice">
                        {room.names[creatorSlot]} · Name saved.
                      </p>
                    )}
                    {channels}
                  </section>
                )}
                {currentStep === "incident" && (
                  <div className="setup-step">
                    {room.phase === "briefing" ? (
                      incidentPicker
                    ) : (
                      <p className="notice">
                        The incident is locked for this round. Finish the
                        conference to choose another.
                      </p>
                    )}
                    {room.mode === "rehearsal" && (
                      <p className="muted">
                        Rehearsal uses labeled sample contributions. No Twitch
                        connection is required.
                      </p>
                    )}
                  </div>
                )}
                <div className="setup-finish">
                  <button
                    className="secondary"
                    disabled={disabled || stepIndex === 0}
                    onClick={() => {
                      setReviewingStep(true);
                      setSetupStep(setupSteps[stepIndex - 1]);
                    }}
                  >
                    Back
                  </button>
                  {currentStep !== "incident" ? (
                    <button
                      className="primary"
                      disabled={disabled}
                      onClick={() => {
                        setReviewingStep(false);
                        setSetupStep(nextStep);
                      }}
                    >
                      Next: {stepTitles[nextStep]}
                    </button>
                  ) : (
                    <div className="setup-completion">
                      {!setup?.complete &&
                        !setupReady &&
                        firstIncompleteStep !== "incident" && (
                          <button
                            className="text-button"
                            disabled={disabled}
                            onClick={() => {
                              setReviewingStep(false);
                              setSetupStep(firstIncompleteStep);
                            }}
                          >
                            Still to check: {stepTitles[firstIncompleteStep]}
                          </button>
                        )}
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
                  )}
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
                        {(!setup?.incident_selected || editingIncident) &&
                          incidentPicker}
                        {stage}
                        {room.phase === "briefing" &&
                          creatorSlot === 0 &&
                          setup?.incident_selected &&
                          !editingIncident && (
                            <button
                              className="text-button"
                              onClick={() => setEditingIncident(true)}
                            >
                              Change incident
                            </button>
                          )}
                        {advice}
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
