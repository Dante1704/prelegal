# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are catalogued in `data/templates/index.json` (6 templates: NDA, employment contract, service agreement, independent contractor agreement, residential lease agreement, letter of intent).

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project is packaged into a Docker container (multi-stage build: Node 20 builds the frontend, Python 3.12 serves everything).  
The backend is in `backend/` — a uv project using FastAPI, SQLModel, bcrypt, and python-jose.  
The frontend is in `frontend/` — Next.js with `output: "export"` (static build), served by FastAPI from the `backend/static/` directory.  
The database uses SQLite, created fresh each time the Docker container starts (users table with signup/signin, JWT auth).  
There are scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

### Done
- **SCRUM-6**: 6 legal document templates in `data/templates/` with `index.json` catalogue
- **SCRUM-7**: Next.js frontend — Mutual NDA creator with form, live preview, and PDF download (`frontend/components/NdaCreator.tsx`)
- **SCRUM-8**: FastAPI backend with SQLite auth (signup/signin, JWT), Docker container, start/stop scripts, frontend auth pages (sign-in, sign-up, sign-out, `AuthGate`)
- **SCRUM-9**: AI chat for Mutual NDA — `/api/chat` endpoint (`backend/chat.py`) using LiteLLM + Cerebras with structured outputs; `frontend/components/NdaChat.tsx` replaces the form panel and populates the live preview from extracted fields
- **SCRUM-10**: Expanded chat to all 6 templates. Two-stage chat (`backend/chat.py`): selection stage picks one of the supported templates (or suggests the closest if the user asks for something unsupported), then filling stage gathers field values. New `/api/templates` and `/api/templates/{id}` endpoints (`backend/templates.py`) serve `data/templates/*.json` as the single source of truth. Frontend renamed to `DocumentChat`/`DocumentCreator`; `frontend/lib/templates.ts` fetches templates at runtime.

### Not yet implemented
- Document persistence (saving/loading drafts)
