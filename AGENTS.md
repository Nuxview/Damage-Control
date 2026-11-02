# Damage Control — Codex working notes

- Backend: Flask/SQLite in `backend/`. Frontend: React/TypeScript in `frontend/`.
- Use uv for Python and the pinned pnpm version for frontend work.
- Run `uv run pytest -q`, `uv run ruff check backend tests`, and `pnpm --dir frontend run build` for application changes.
- Keep unapproved chat contributions and PR advice off public viewer and overlay routes.
- Creator and Moderator have separate credentials and server-enforced permissions. Only creators control statement transitions, mic handoffs, timers and new rounds. Never trust a URL or client role for authorization. Creator pages must not receive the pending inbox.
- New rooms open in creator-only setup, showing one participant/task per step with Back/Next navigation: share links, collect explicit page checks, choose an incident, then finish setup before advancing. Page checks are not presence or live Twitch verification.
- Header, main content, and footer share `.page-frame`. Keep role-specific tools on their own page and supporting controls collapsed.
- Rehearsal must remain explicitly labeled. Do not claim real Twitch verification from mocked or rehearsal activity.
