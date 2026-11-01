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

Open **http://localhost:5000**. Choose **Rehearsal**, enter two names, and open the studio. Rehearsal includes three explicitly labeled sample contributions; it never connects to Twitch. Use “Add a sample contribution” for more. No credentials are needed to play a complete rehearsal round.

For frontend development, run `pnpm run dev` in `frontend/` alongside the backend and open the Vite URL. `/api` is proxied to Flask. For Twitch OAuth development, use the built app on port 5000 so the browser cookie and registered callback share one origin.

## Play a round

1. **Briefing:** select one of six fictional incidents, write your own, or approve a viewer's incident.
2. **Opening:** Creator 1 gives the opening statement. The 30-second timer is a cue; it does not force a transition.
3. **Questions:** approve journalist questions for the audience display. Approve PR talking points for the private creator/adviser panel. Pass the mic between creators.
4. **You said…:** a host or moderator pins a faithful summary of what was actually said. One shared correction can change a claim; its original is retained in the record.
5. **Closing:** deliver one explanation that fits the record. Close the conference, then start the next round.

Keep voice/video in your usual call or Twitch Stream Together. Damage Control does not capture cameras, microphones, or stream footage. A moderator can run the controls while both creators perform.

### Collaborator and OBS links

Open **Invite & overlay** in the studio:

- **Private creator invite:** gives your partner/moderator full room controls. The secret is carried in the URL fragment, then stored in that browser's local storage. Never show this link or the creator studio on-stream. In this MVP all invited controllers have the same permissions.
- **OBS browser source:** a read-only transparent overlay at `/overlay/ROOM`. Set the source to **1920 × 1080**. It shows the incident, active spokesperson, approved question, correction status, and three most recent pinned claims. It never shows pending submissions or PR talking points.

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

Tests cover the round lifecycle, moderation/public privacy, concurrent correction attempts, persistence, authorization, OAuth state binding, command parsing, contribution limits, and Shared Chat deduplication. TypeScript is checked as part of the frontend build.

## Hosting and limits

Run **one Python process** with a persistent disk for `DAMAGE_CONTROL_DB`; SQLite mutations are serialized inside the process. The built-in entry point uses Waitress, binds to loopback by default, and disables Flask's development reloader. To listen behind an HTTPS reverse proxy:

```bash
HOST=0.0.0.0 PORT=5000 uv run python -m backend.app
```

This is a small-group hackathon MVP, not a public room-hosting service. Rooms are limited to 100 per database; inboxes to 100 pending items; claims to 12 per round. No account system, granular moderator roles, automatic content moderation, private-link rotation, or multi-worker coordination is implemented. Keep creator links private; review viewer content before publishing. Back up the SQLite database before changing or clearing it. No telemetry is sent.

Room state includes approved and pending contributions, author display names, source channels, and a bounded recent message-ID/cooldown window. `.env`, SQLite files, and build/dependency directories are ignored by Git. Do not commit Twitch secrets or real audience data.

## Demo and submission

See [docs/DEMO.md](docs/DEMO.md) for a short recording plan and what remains before submission. Build session: `01a1882c-c255-7a13-97d0-d1a788a4d0e6`. Confirm the session ID in Codex before submitting; no demo footage, live claims, or submission has been fabricated.

MIT licensed; original starter-template license and agent skills are preserved.
