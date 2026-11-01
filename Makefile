.PHONY: setup build run test
setup:
	uv sync --locked
	pnpm --dir frontend install --frozen-lockfile
build:
	pnpm --dir frontend run build
run:
	uv run python -m backend.app
test:
	uv run pytest -q
	uv run ruff check backend tests
	pnpm --dir frontend run build
