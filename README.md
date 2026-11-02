# Damage Control

**My Partner Said What?** Two creators defend one increasingly ridiculous explanation while their Twitch communities play journalists and terrible PR advisers.

A playable Flask + React/TypeScript MVP built with OpenAI Codex. No runtime AI, paid model account, Affiliate status, or Twitch Extension is required.

## Run locally

Requires Python 3.12+, [uv](https://docs.astral.sh/uv/), Node.js 22.12+, and pnpm 12.9.1 (pinned in `frontend/package.json`).

```bash
uv sync --locked
cd frontend
pnpm install --frozen-lockfile
pnpm run build
cd ..
cp .env.example .env
uv run python -m backend.app
```

Open **http://localhost:5000**. Choose **Rehearsal**, enter two names, and create the room. You land on **Room setup** first. Rehearsal includes three explicitly labeled sample contributions; it never connects to Twitch. The moderator can use “Add a sample contribution” for more. No Twitch credentials are needed to play a complete rehearsal round. For solo testing, open each participant link in a separate tab and confirm each page.

For frontend development, run `pnpm run dev` in `frontend/` alongside the backend and open the Vite URL. `/api` is proxied to Flask. For Twitch OAuth development, use the built app on port 5000 so the browser cookie and registered callback share one origin.

## Play a round

1. **Briefing:** select one of six fictional incidents, write your own, or approve a viewer's incident.
2. **Opening:** Creator 1 gives the opening statement. The 30-second timer is a cue; it does not force a transition.
3. **Questions:** approve journalist questions for the audience display. Approve PR talking points for the private creator/adviser panel. Pass the mic between creators.
4. **You said…:** the moderator pins a faithful summary of what was actually said. One shared correction can change a claim; its original is retained in the record.
5. **Closing:** deliver one explanation that fits the record. Close the conference, then start the next round.

Keep voice/video in your usual call or Twitch Stream Together. Damage Control does not capture cameras, microphones, or stream footage. The moderator reviews contributions and records claims while the creators handle the performance.

Each participant gets a dedicated page, with no role-switching tabs:

- **Creator** (`/room/ROOM`): the situation, current question, approved private advice, performance controls, and the claim record. Creators can also configure the room and share invites. Pending contributions never reach this page’s API response.
- **Moderator** (`/moderator/ROOM`): the press inbox, publishing controls, claim entry and correction. Statement transitions, mic handoffs, timers and new rounds are creator-only. Moderators see no performance controls and the server rejects those actions. Moderators have a separate credential and cannot fetch creator invites, edit setup, or connect/disconnect Twitch accounts.
- **Viewer** (`/view/ROOM`): approved public content and chat instructions. This route ignores saved private credentials, even in the creator’s browser.

Permissions are enforced by the backend, not by the page URL. Both creators share the creator credential; this MVP does not assign permissions to individual people or creator slots.

### Set up the room before performing

New rooms open directly at **Room setup** (`/room/ROOM/setup`), available only to creators. A guided flow shows one participant or task at a time, with Back/Next navigation. It resumes at the first incomplete step after a refresh. You can continue sharing links while confirmations are pending; the final check still requires everything below:

1. Copy and share the creator, moderator, and viewer links. Tick **I’ve shared this link** after sending each one; copying alone does not mark it shared.
2. Ask your partner, moderator, and one viewer to press **I can see the room** on their respective pages. The checklist updates automatically. **Page checked** records a one-time confirmation, not ongoing presence or a successful Twitch chat test. For a solo rehearsal, use the **Open … page** links in separate tabs and confirm all three.
3. In live rooms, each creator connects their own Twitch account. Both channel subscriptions must report **connected** before setup can finish. Rehearsal uses labeled sample contributions instead.
4. Explicitly choose the fictional incident the creators will defend, or write your own.
5. Press **Finish setup & enter creator page**. Then start the opening statement. The server blocks advancing a new room before setup is complete.

Setup progress survives refreshes and server restarts. Existing rooms remain playable; they are not forced through the new checklist. Open setup to copy a new moderator link: older shared-control invites remain creator credentials and do not acquire moderator restrictions automatically.

### Collaborator and OBS links

Open **Room setup** from the creator page:

- **Private creator invite:** opens the creator page and allows room configuration. Keep it off-stream.
- **Private moderator invite:** opens the moderator page with its own limited credential. Keep it off-stream too. A moderator cannot generate creator invites.
- **Viewer link:** opens the read-only public page. It never shows the pending inbox or PR advice. Viewers can submit a page check; game contributions still come through Twitch chat.
- **OBS browser source:** a read-only transparent overlay at `/overlay/ROOM`, under the optional setup disclosure. Set the source to **1920 × 1080**. It shows the incident, active spokesperson, approved question, correction status, and three most recent pinned claims. It never shows pending submissions or PR talking points.

Private credentials travel in URL fragments and are saved separately by role in that browser’s local storage. Never show private pages or invites on-stream. Treat invite links as credentials, not individual identities.

Both creators need to reach the **same running backend**. A localhost URL on your computer is not accessible from your partner's computer. For remote play, run one instance on an HTTPS host or behind your own authenticated/private networking setup, set `APP_BASE_URL` to its public HTTPS origin, and share links from that origin. No hosting service has been provisioned by this repository.

## Connect real Twitch chat

1. Register a **confidential** application in the [Twitch developer console](https://dev.twitch.tv/console/apps). Enable 2FA on the owning account as Twitch requires.
2. Register the exact redirect URL `http://localhost:5000/api/twitch/callback` for local testing, or `https://YOUR-HOST/api/twitch/callback` for a hosted instance.
3. Set `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `APP_BASE_URL` in `.env`, then restart the server.
4. Create a **Live with Twitch** room. Each creator opens the private invite in their own browser and connects their own account in the matching creator slot. The second slot requires a different Twitch account.
5. Wait for the channel statuses to say **connected**. Then have viewers type:

```text
!incident Your zoo insists it has no animals. Something has just escaped.
!question If there are no animals, what just escaped?
!spin Describe the escape as a successful outdoor expansion.
```

Commands are case-insensitive; text must be 1–280 characters. Each Twitch user can contribute once every 10 seconds across both connected channels. At most 100 pending contributions are retained. Ordinary chat is ignored. Approved content is rendered as text, never HTML.

The bridge uses authorization-code OAuth, the read-only `user:read:chat` scope, and an own-channel `channel.chat.message` EventSub WebSocket subscription for each creator. Tokens are validated at connection and at least hourly, refreshed before expiry, and held **only in server memory**. A server restart requires reconnecting Twitch; room state remains in SQLite. A creator's most recent connection replaces that same account's older connection in another room.

Shared Chat messages forwarded from another source channel are ignored by that destination connection; original-source events and message IDs prevent duplicate contributions. Network interruptions are visible and pause the running cue timer. After reconnecting, explicitly resume the timer. Twitch does not replay messages lost during an outage.

**Live verification still required:** the provider adapter is implemented and tested with controlled fixtures. It has not yet been authorized against real Twitch accounts or used in a real broadcast. Rehearsal footage must not be represented as a Twitch playtest.

Primary references: [Twitch OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/), [chat subscriptions](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage), [WebSocket lifecycle](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/).

## Checks

```bash
uv run pytest -q
uv run ruff check backend tests
cd frontend && pnpm run build
```

Tests cover the round lifecycle, moderation/public privacy, concurrent correction attempts, persistence, authorization, OAuth state binding, command parsing, contribution limits, Shared Chat deduplication, role permissions, legacy-room compatibility, setup completion, and explicit page checks. TypeScript is checked as part of the frontend build.

## Hosting and limits

Run **one Python process** with a persistent disk for `DAMAGE_CONTROL_DB`; SQLite mutations are serialized inside the process. The built-in entry point uses Waitress, binds to loopback by default, and disables Flask's development reloader. To listen behind an HTTPS reverse proxy:

```bash
HOST=0.0.0.0 PORT=5000 uv run python -m backend.app
```

This is a small-group hackathon MVP, not a public room-hosting service. Rooms are limited to 100 per database; inboxes to 100 pending items; claims to 12 per round. No account system, per-person permissions, automatic content moderation, private-link rotation, or multi-worker coordination is implemented. Keep creator and moderator links private; review viewer content before publishing. Back up the SQLite database before changing or clearing it. No telemetry is sent.

Room state includes approved and pending contributions, author display names, source channels, and a bounded recent message-ID/cooldown window. `.env`, SQLite files, and build/dependency directories are ignored by Git. Do not commit Twitch secrets or real audience data.

## Demo and submission

See [docs/DEMO.md](docs/DEMO.md) for a short recording plan and what remains before submission. Build session: `01a1882c-c255-7a13-97d0-d1a788a4d0e6`. Confirm the session ID in Codex before submitting; no demo footage, live claims, or submission has been fabricated.

MIT licensed. Codex repository guidance is in `AGENTS.md`; unused template skills, other-agent configurations, and starter-only automation have been removed.
