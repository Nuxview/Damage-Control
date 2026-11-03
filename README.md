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

Open **http://localhost:5000**. Choose **Rehearsal** and create the room. There are no name fields on the landing page; each creator enters their own name when joining. You land on **Room setup** first. Rehearsal includes three explicitly labeled sample contributions; it never connects to Twitch. The moderator can use “Add a sample contribution” for more. No Twitch credentials are needed to play a complete rehearsal round. For solo testing, open the partner and moderator links in separate tabs and confirm those pages; the viewer page is optional.

For frontend development, run `pnpm run dev` in `frontend/` alongside the backend and open the Vite URL. `/api` is proxied to Flask. For Twitch OAuth development, use the built app on port 5000 so the browser cookie and registered callback share one origin.

## Play a round

1. **Briefing:** select one of six fictional incidents, write your own, or approve a viewer's incident.
2. **Opening:** Creator 1 gives the opening statement. The 30-second timer is a cue; it does not force a transition. Passing the mic starts a fresh cue for the next creator. The pause/resume button remains available.
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

New rooms open directly at **Room setup** (`/room/ROOM/setup`), available only to creators. A guided flow shows one participant or task at a time, with Back/Next navigation. Viewers watch the livestream; they do not need to open a separate app page. The first step collects your name and, in live rooms, your own Twitch authorization. Completed tasks are skipped as participants check in; Back lets you review earlier steps. It resumes at the first incomplete step after a refresh. You can continue sharing links while confirmations are pending; the final check still requires everything below:

1. The first step shows **Your name**; save it here, before sharing the room. In live rooms it also shows your own **Connect Twitch** control and whether app credentials were loaded. Connecting Twitch saves your entered name before redirecting. The `.env` client ID/secret identify the application; they do not connect anyone’s account. Each creator must authorize their own account. These controls are also on each creator’s page, so your invited partner can connect without searching setup. The partner joins and authorizes from their own page. Both subscriptions must report **connected** before finishing. Rehearsal skips this step.
2. Share the creator and moderator links. The partner invite selects Creator 2; the host uses Creator 1. Each creator enters **their own name** and presses **Save name & confirm**; the host does this in the first setup step, and the partner does it on their invited page. Confirming the host’s page does not count as the partner arriving. Slots are display preferences, not separate permissions.
3. The moderator presses **I can see the room**. The optional viewer page is not a readiness requirement. The status updates automatically; there is no “I’ve shared this link” checkbox. **Page checked** is a one-time acknowledgment, not ongoing presence or a Twitch chat test. For solo testing, use the creator/moderator **Open … page** links in separate tabs.
4. Write a custom fictional incident, or expand **Browse sample incidents**. Once selected, the editor and sample choices are replaced by the selected incident and a **Change incident** control.
5. Press **Finish setup & enter creator page**, then start the opening statement. The server blocks a new room until both creator check-ins, moderator confirmation and incident selection are complete. Both creators leave onboarding automatically when the host finishes; the partner returns to their own page after Twitch, rather than entering the setup wizard.

After closing a round, **Start next round** keeps the previous incident and opens the incident editor directly in Creator 1’s room. Custom text is prefilled; edit it, use **Reuse previous incident**, or expand the samples. No sample is selected automatically, and opening statements stay blocked until that round’s choice is confirmed. Names, connections and invite checks are retained.

Setup progress survives refreshes and server restarts. Existing rooms remain playable; they are not forced through the new checklist. Open setup to copy a new moderator link: older shared-control invites remain creator credentials and do not acquire moderator restrictions automatically.

### Collaborator and OBS links

Open **Room setup** from the creator page:

- **Private creator invite:** opens the creator page and allows room configuration. Keep it off-stream.
- **Private moderator invite:** opens the moderator page with its own limited credential. Keep it off-stream too. A moderator cannot generate creator invites.
- **Optional viewer link:** opens the read-only public page. It never shows the pending inbox or PR advice. Viewers can submit a page check; game contributions still come through Twitch chat.
- **OBS browser source:** a read-only transparent overlay at `/overlay/ROOM`, under the optional setup disclosure. Set the source to **1920 × 1080**. It uses the same compact audience card as the moderator preview, including both creators, the active spokesperson, approved question, correction status and three most recent pinned claims. Overlay pages and state requests are uncached; a stalled poll is retried, and returning to an active page requests current room state. Unused canvas is transparent; the question is grouped with the incident rather than pushed to the bottom. It never shows pending submissions or PR talking points.

Private credentials travel in URL fragments and are saved separately by role in that browser’s local storage. Never show private pages or invites on-stream. Treat invite links as credentials, not individual identities.

Both creators need to reach the **same running backend**. A localhost URL on your computer is not accessible from your partner's computer. For remote play, run one instance on an HTTPS host or behind your own authenticated/private networking setup, set `APP_BASE_URL` to its public HTTPS origin, and share links from that origin. No hosting service has been provisioned by this repository.

## Connect real Twitch chat

1. Register a **confidential** application in the [Twitch developer console](https://dev.twitch.tv/console/apps). Enable 2FA on the owning account as Twitch requires.
2. Register the exact redirect URL `http://localhost:5000/api/twitch/callback` for local testing, or `https://YOUR-HOST/api/twitch/callback` for a hosted instance.
3. Set `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `APP_BASE_URL` in the repository-root `.env`, then start the server. The app reads this explicit path regardless of the launch directory and accepts UTF-8 files with or without a Windows BOM. Existing process environment values retain precedence.
4. Create a **Live with Twitch** room. **Connect Twitch** appears in the first setup step and on creator pages. Click it to authorize your account; filling `.env` alone leaves the count at `0/2`. Each invited creator authorizes in their own browser, in their own slot. The second slot requires a different Twitch account. Open the app at the exact `APP_BASE_URL` origin before connecting, so the callback retains that browser’s room credentials.
5. Wait for the channel statuses to say **connected**. Then have viewers type:

```text
!incident Your zoo insists it has no animals. Something has just escaped.
!question If there are no animals, what just escaped?
!spin Describe the escape as a successful outdoor expansion.
```

Commands are case-insensitive; text must be 1–280 characters. Each Twitch user can contribute once every 10 seconds across both connected channels. At most 100 pending contributions are retained. Ordinary chat is ignored. Approved content is rendered as text, never HTML.

The bridge uses authorization-code OAuth, the read-only `user:read:chat` scope, and an own-channel `channel.chat.message` EventSub WebSocket subscription for each creator. Tokens are validated at connection and at least hourly, refreshed before expiry, and held **only in server memory**. A server restart requires reconnecting Twitch; room state remains in SQLite. A creator's most recent connection replaces that same account's older connection in another room.

Shared Chat messages forwarded from another source channel are ignored by that destination connection; original-source events and message IDs prevent duplicate contributions. Network interruptions are visible and pause the running cue timer. After reconnecting, use Resume timer or pass the mic to start a fresh cue. Twitch does not replay messages lost during an outage.

**Live verification still required:** the provider adapter is implemented and tested with controlled fixtures. The creator has reported both accounts connected and live chat working. Automated connection tests use controlled fixtures; Shared Chat, longer broadcasts and recovery still need end-to-end verification on the recording setup. Rehearsal footage must not be represented as a Twitch playtest.

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

See [docs/FINISHING.md](docs/FINISHING.md) for the remaining work, [docs/DEMO.md](docs/DEMO.md) for a local-recording and editing run sheet, and [docs/SOCIAL-DRAFTS.md](docs/SOCIAL-DRAFTS.md) for draft reflections on the first solo Devpost hackathon. Hosting follows the demo and write-ups. The video and hosted link will be added after they are reviewed and published.

The original hackathon submission window was missed. A reopening is unconfirmed; [docs/SUBMISSION.md](docs/SUBMISSION.md) is retained as draft project copy. Codex build session: `01a1882c-c255-7a13-97d0-d1a788a4d0e6`.

MIT licensed. Codex repository guidance is in `AGENTS.md`; unused template skills, other-agent configurations, and starter-only automation have been removed.
