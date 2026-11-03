# Damage Control — Devpost copy

Copy the project text below. Replace the video link and add a live URL only if the hosted version is actually working. This is a draft, not a completed submission.

## Project name

Damage Control: My Partner Said What?

## Tagline

Two creators. One terrible explanation. Twitch chat asks all the wrong questions.

## Inspiration

I wanted to build something that makes creator collaborations fun for the audience to take part in. A ridiculous opening statement is only the start. The interesting part is watching two people try to keep their stories straight while chat remembers exactly what they said.

That became Damage Control: a fictional press conference where your partner’s explanation becomes your problem too.

## What it does

Two creators choose a fictional incident and take turns defending the same explanation. Twitch viewers act as journalists and terrible PR advisers:

- `!question` submits a question for the press conference.
- `!spin` suggests a talking point for the creators to work into their answers.
- `!incident` pitches another fictional disaster.

A moderator reviews contributions before publishing them. Approved questions appear on the audience display, while PR advice stays private. The moderator pins claims the creators actually make, giving chat material for follow-up questions. Both creators share one official correction, and the original claim remains in the record.

Creators, moderators and viewers each have their own page. The public display can be added to OBS. A room can run several rounds, including custom incidents, and a labeled rehearsal mode lets people try it without Twitch credentials.

## How I built it

I built the project solo with OpenAI Codex, using Python and Flask for the backend, SQLite for room state, and React with TypeScript for the interface. The frontend uses Vite and pnpm; Python dependencies use uv.

The Twitch integration uses OAuth and read-only EventSub chat subscriptions for the two creator accounts. The backend separates creator and moderator permissions and keeps pending contributions and private advice off public routes.

Codex helped turn the idea into the room lifecycle, Twitch adapter, interface and automated tests. I directed the product choices and used playtesting to refine the result: separating participant pages, replacing an overwhelming control room with a guided setup, fixing the two-creator onboarding flow, and making custom incidents work between rounds.

## Challenges I ran into

The main challenge was keeping the setup and controls out of the way of the joke. Early versions put too many tools on the screen and made people repeat steps that were already complete. I changed the flow to follow saved participant readiness, with a different return path for each creator after Twitch authorization.

Another challenge was keeping public and private information separate. The audience should see the approved question and the creators’ commitments, while the moderation queue and PR advice stay private. I added backend permission checks and tests rather than relying on which buttons a page displays.

## Accomplishments I’m proud of

- A complete round built around collaboration, audience questions and callbacks to earlier claims.
- Separate creator, moderator and viewer experiences.
- One shared correction that preserves the original statement.
- A public card shared by the moderator preview and OBS display.
- Custom incidents that stay available between rounds.
- 59 passing backend tests, plus TypeScript, lint and a passing CI production build on the tested app commit.

## What I learned

Playtesting changed the project more than adding features did. Things that looked reasonable in code—asking for both names up front, leaving every setup option visible, or assigning a sample incident to the next round—interrupted the experience when someone actually tried to use it.

Codex was useful throughout that loop: I could describe a specific problem, work through a concrete change, and check that existing game behavior still held.

## What’s next

The next step is longer playtesting with creator pairs and moderators: improving pacing, watching how viewers build on earlier claims, and checking chat and recovery behavior through full broadcasts. I would also improve room ownership and invite management before treating it as a public hosting service.

## Built with

OpenAI Codex, Python, Flask, SQLite, React, TypeScript, Vite, pnpm, uv, Twitch API, OAuth, EventSub, WebSockets, OBS browser source, pytest.

## Links and session ID

- **Code, correct branch:** https://github.com/Nuxview/twitch-codex-hackathon/tree/feat/damage-control-mvp
- **Repository root:** https://github.com/Nuxview/twitch-codex-hackathon
- **Demo video:** PASTE YOUR PUBLIC YOUTUBE URL
- **Live app:** add only after confirming the deployed app works; the repository and local setup instructions are already available.
- **Codex session ID:** `01a1882c-c255-7a13-97d0-d1a788a4d0e6`
- **Tested app commit:** `216473469abc2b80cfcd24b2071bce2895e6e88b`

## Testing instructions for judges

The app is currently on the `feat/damage-control-mvp` branch. If that branch has been merged before submission, the repository root can be used normally.

```bash
git clone --branch feat/damage-control-mvp https://github.com/Nuxview/twitch-codex-hackathon.git
cd twitch-codex-hackathon
uv sync --locked
cd frontend
pnpm install --frozen-lockfile
pnpm run build
cd ..
cp .env.example .env
uv run python -m backend.app
```

Requires Python 3.12+, Node.js 22.12+, uv and the pinned pnpm version. Open http://localhost:5000 and choose Rehearsal. Open the participant links in separate tabs to check in as both creators, the moderator and a viewer. Select an incident, finish setup and play a round. Rehearsal contributions are labeled samples.

For real Twitch chat, follow the README to register an app and configure OAuth. Each creator authorizes their own distinct account; viewers submit commands in Twitch chat. Remote creators must reach the same running backend.

## Last accuracy check — not for pasting

- Keep the description consistent with the recorded demo and final submitted version.
- Do not claim automatic contradiction detection, AI-generated dialogue, built-in video calling, granular per-person accounts or production-scale hosting; those are not implemented.
- Do not describe mock connections or rehearsal samples as real viewer messages.
- The user has confirmed that live chat works. Full broadcast, Shared Chat and recovery testing are still limited; avoid broader reliability claims.
