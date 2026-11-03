# Damage Control — Codex working notes

- Backend: Flask/SQLite in `backend/`. Frontend: React/TypeScript in `frontend/`.
- Use uv for Python and the pinned pnpm version for frontend work.
- Run `uv run pytest -q`, `uv run ruff check backend tests`, and `pnpm --dir frontend run build` for application changes.
- Keep unapproved chat contributions and PR advice off public viewer and overlay routes.
- Creator and Moderator have separate credentials and server-enforced permissions. Only creators control statement transitions, mic handoffs, timers and new rounds. Never trust a URL or client role for authorization. Creator pages must not receive the pending inbox.
- New rooms open in creator-only setup, showing one task per step with Back/Next navigation: the host’s name and own Twitch authorization first, then unfinished invite/check-in tasks and incident selection. Skip completed tasks from persisted room readiness, and keep the partner out of the host setup wizard. Confirmations alone determine link readiness; never add manual share acknowledgments. Each creator’s name/check-in is persisted separately. End onboarding for all participants when setup completes. The viewer page is optional; require only both creators and the moderator for readiness. Page checks are not presence or live Twitch verification.
- Each new round requires explicit incident selection in Creator 1’s room. Preserve custom text, keep sample choices collapsed, and never silently replace custom incidents with samples.
- Header, main content, and footer share `.page-frame`. Keep role-specific tools on their own page and supporting controls collapsed.
- Passing the mic starts a fresh 30-second cue. Keep timer pause/resume visible as a full-size control.
- OBS and moderator audience previews use the same public card markup and styles. Clear the root background for OBS and avoid viewport-height spacers.
- Rehearsal must remain explicitly labeled. Do not claim real Twitch verification from mocked or rehearsal activity.
