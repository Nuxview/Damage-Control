# Starter Template

Minimal GitHub template with issue templates, auto-labeling, auto-changelog, and preinstalled agent skills.

## Use this template

Click **Use this template > Create a new repository**.

## Setup

1. Go to **Settings > Actions > General > Workflow permissions**.
2. Select **Read and write permissions** and save. This lets the changelog workflow commit.
3. Optional: add `.github/labeler.yml` to customize PR auto-labeling by changed path.

## What is included

- `.github/workflows/changelog.yml` - prepends a PR summary to `CHANGELOG.md` on merge to `main` or `master`.
- `.github/workflows/labeler.yml` - auto-labels PRs and issues via `actions/labeler`.
- `.github/ISSUE_TEMPLATE/` - bug report and feature request templates.
- `.agents/skills/` - source of truth for agent skills. Symlinked into `skills/` and agent config dirs (`.claude`, `.bob`, etc.). See `SKILLS.md`.
- `CHANGELOG.md` - auto-updated change log.
- `LICENSE` - MIT.

## Skills

See [SKILLS.md](SKILLS.md) for what each skill in `.agents/skills` does and when to use it.

Run `setup-matt-pocock-skills` once per repo before using the engineering skills.

## License

MIT. See [LICENSE](LICENSE).
