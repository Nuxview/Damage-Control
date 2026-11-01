# Damage Control — Codex working notes

- Backend: Flask/SQLite in `backend/`. Frontend: React/TypeScript in `frontend/`.
- Use uv for Python and the pinned pnpm version for frontend work.
- Run `uv run pytest -q`, `uv run ruff check backend tests`, and `pnpm --dir frontend run build` for application changes.
- Keep unapproved chat contributions and PR advice off public viewer and overlay routes.
- Creator, Moderator, and Room setup are workspaces for the same private controls, not separate authorization roles.
- Header, main content, and footer share `.page-frame`. Keep role-specific tools in their workspace and supporting controls collapsed.
- Rehearsal must remain explicitly labeled. Do not claim real Twitch verification from mocked or rehearsal activity.
