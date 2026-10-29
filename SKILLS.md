# Skills

Source of truth: `.agents/skills/`. The same folders are symlinked into `skills/` and each agent config dir (`.claude`, `.bob`, `.devin`, etc.), so updating `.agents/skills` updates all of them. `skills-lock.json` records each skill's upstream source.

Run `setup-matt-pocock-skills` once per repo before using the engineering skills (code-review, tdd, triage, etc.).

## Engineering

- **code-review** - Reviews the diff since a fixed point on two axes: Standards and Spec, via parallel sub-agents. Use when asked to review a branch, PR, or work in progress.
- **codebase-design** - Shared vocabulary for deep modules (module, interface, depth, seam, adapter). Use when designing interfaces, placing seams, or restructuring code.
- **diagnosing-bugs** - Structured loop for hard bugs and perf regressions: build a pass/fail signal first, then bisect and test hypotheses. Use for broken, failing, or slow behavior.
- **tdd** - Red-green test-first loop with seam selection and anti-patterns. Use when building features or fixing bugs test-first.
- **triage** - Moves issues and external PRs through bug/enhancement triage roles and writes agent-ready briefs. Use to categorize, verify, and prep issues for implementation.
- **domain-modeling** - Builds the project glossary and ADRs. Use when defining terms or recording architecture decisions.
- **improve-codebase-architecture** - Scans hot spots for shallow modules, reports deepening opportunities as HTML, then grills the pick. Use to reduce friction and improve testability.
- **setup-matt-pocock-skills** - One-time per-repo setup: issue tracker, triage labels, glossary/ADR layout. Run before first use of the other engineering skills.
- **vercel-react-best-practices** - 70 Vercel React/Next.js performance rules (waterfalls, bundle, server, client). Use when writing, reviewing, or refactoring React/Next.js.
- **web-design-guidelines** - Reviews UI code against the Vercel Web Interface Guidelines. Use when asked to audit accessibility, UX, or interface compliance.

## Frontend and UI

- **design-taste-frontend** - Anti-slop art direction for public pages: deals researched directions, enforces a house style, screenshots at three widths. Use for landing, marketing, portfolio, or hero pages. Not for dashboards.
- **frontend-design** - Opinionated visual identity for new or reshaped UI. Use when the brief needs distinctive palette, type, and layout rather than a template look.
- **ui-taste** - Playbook workflow for layout, hierarchy, and polish of web and iOS screens. Use to build, redesign, critique, or review app UI.

## Automation and discovery

- **agent-browser** - CLI for browser and Electron app automation (navigate, click, fill, screenshot, scrape). Use for web testing, QA, dogfooding, or driving desktop apps like VS Code and Slack.
- **find-skills** - Finds and installs skills from the open ecosystem via `npx skills`. Use when asked how to do something that may already have a skill.

## Planning and learning

- **grill-me** - Relentless interview to sharpen a plan or design. Use before implementing to expose gaps.
- **grill-with-docs** - Same interview, plus writes ADRs and glossary entries as it goes. Use when the plan should also produce decisions and terms.
- **handoff** - Compacts the current conversation into a handoff doc for the next agent. Use at session end or context switch.
- **teach** - Multi-session teaching workspace with mission, lessons, and learning records. Use when learning a topic over time.
