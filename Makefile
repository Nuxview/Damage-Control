.PHONY: setup build run test
setup:
	uv sync --locked
	npm --prefix frontend ci
build:
	npm --prefix frontend run build
run:
	uv run python -m backend.app
test:
	uv run pytest -q
	uv run ruff check backend tests
	npm --prefix frontend run build
