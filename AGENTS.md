# Damage Control — Codex working notes

- Backend: Flask/SQLite in `backend/`. Frontend: React/TypeScript in `frontend/`.
- Use uv for Python and the pinned pnpm version for frontend work.
- Run `uv run pytest -q`, `uv run ruff check backend tests`, and `pnpm --dir frontend run build` for application changes.
- Keep unapproved chat contributions and PR advice off public viewer and overlay routes.
- Creator and Moderator have separate credentials and server-enforced permissions. Only creators control statement transitions, mic handoffs, timers and new rounds. Never trust a URL or client role for authorization. Creator pages must not receive the pending inbox.
- New rooms open in creator-only setup, showing one task per step with Back/Next navigation: Twitch authorization first for live rooms, then invite links, page checks and incident selection. Confirmations alone determine link readiness; never add manual share acknowledgments. Each creator enters their own name in the room. Page checks are not presence or live Twitch verification.
- Header, main content, and footer share `.page-frame`. Keep role-specific tools on their own page and supporting controls collapsed.
- OBS and moderator audience previews use the same public card markup and styles. Clear the root background for OBS and avoid viewport-height spacers.
- Rehearsal must remain explicitly labeled. Do not claim real Twitch verification from mocked or rehearsal activity.
