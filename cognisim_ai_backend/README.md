---
title: CogniSimAI Backend
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# CogniSim AI — Backend Setup Guide

Complete setup and development reference for the FastAPI backend application.

---

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| **Python** | 3.11+ | `python --version` |
| **pip** | Latest | `pip --version` |
| **Git** | Any | `git --version` |

You also need:
- A **Supabase project** — [supabase.com](https://supabase.com) (free tier works)
- A **Gemini API key** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (free tier available)

---

## Installation

```bash
# From the repository root
cd cognisim_ai_backend

# Create a virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\activate          # Windows PowerShell
# source .venv/bin/activate     # macOS / Linux

# Install all dependencies
pip install -r requirements.txt
```

---

## Environment Variables

Create a `.env` file in the **parent directory** of `cognisim_ai_backend/` (repository root):

```env
# ============================================================
#  REQUIRED — Core Services
# ============================================================

# Supabase (Settings → API in your Supabase dashboard)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# AI Model — at least one is required
GEMINI_API_KEY=your-gemini-api-key
# OPENROUTER_API_KEY=your-openrouter-key        # Optional: primary model provider

# CORS — comma-separated frontend origins
CORS_ORIGINS=http://localhost:8080,http://localhost:8081

# Frontend URL — used for OAuth redirect URIs
FRONTEND_URL=http://localhost:8080

# ============================================================
#  OPTIONAL — Integrations (features disabled if not set)
# ============================================================

# Jira OAuth (Atlassian Developer Console → OAuth 2.0 app)
JIRA_OAUTH_CLIENT_ID=your-jira-client-id
JIRA_OAUTH_CLIENT_SECRET=your-jira-client-secret
JIRA_OAUTH_REDIRECT_URI=http://localhost:8000/api/jira/oauth/callback

# Slack OAuth (api.slack.com → Your Apps → OAuth & Permissions)
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:8000/api/slack/oauth/callback
SLACK_SIGNING_SECRET=your-slack-signing-secret

# GitHub App (Settings → Developer → GitHub Apps)
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=cognisim-ai
GITHUB_APP_PRIVATE_KEY_PEM="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Encryption — for OAuth credential storage (auto-generates in DEV_MODE)
ENCRYPTION_SECRET_KEY=your-32-char-secret-key
ENCRYPTION_SALT=your-salt-string

# Email Notifications (Gmail App Password, not regular password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@cognisimai.com

# Redis (optional — for caching)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# ============================================================
#  DEVELOPMENT
# ============================================================

# Set to true for development (relaxes validation, uses simple encoding)
DEV_MODE=true

# Team quotas
TEAM_DAILY_RUN_LIMIT=100
```

> **Note:** The `.env` file is loaded from the parent directory of `cognisim_ai_backend/`. This is configured in `app/core/config.py` using Pydantic BaseSettings.

---

## Running the Server

```bash
# Development mode (auto-reload enabled)
python run_server.py
```

The server starts at **http://localhost:8000** with:
- **Auto-reload** on file changes
- **Interactive API docs** at http://localhost:8000/docs (Swagger UI)
- **Alternative docs** at http://localhost:8000/redoc

**Health check:** `GET http://localhost:8000/health`

---

## Running Tests

```bash
# Run all tests
python -m pytest tests/

# Run with verbose output
python -m pytest tests/ -v

# Run a specific test file
python -m pytest tests/test_json_repair.py -v

# Run via test runner script
python tests/run_tests.py
```

**Test modules (20+):**

| Test File | What It Validates |
|-----------|-------------------|
| `test_api_endpoints.py` | API route registration and response codes |
| `test_authenticated_apis.py` | Auth-protected endpoint behavior |
| `test_epic_decomposer_utils.py` | Story normalization, dedup, quality scoring |
| `test_json_repair.py` | 3-layer JSON repair pipeline |
| `test_validation_layer.py` | Input validation and guardrails |
| `test_prd_tolerance.py` | PRD output tolerance and fallback |
| `test_prd_save_quality_score_mapping.py` | Quality score persistence |
| `test_prd_audit_log_payload.py` | Audit trail correctness |
| `test_prd_export_pdf.py` | PDF export generation |
| `test_features_out_of_scope_coercion.py` | Feature scope boundary rules |
| `test_timeline_dependencies_coercion.py` | Timeline dependency validation |
| `test_token_encryption.py` | AES-256 encryption round-trip |
| `test_github_webhook_security.py` | HMAC-256 signature verification |
| `test_email_invitation.py` | Email sending and template rendering |
| `test_invite_accept_flow.py` | Invitation acceptance workflow |
| `test_prompt_variants.py` | Agent prompt A/B testing |
| `test_migration_script.py` | Database migration validation |
| `test_issues_exclude_archived.py` | Archived issue filtering |
| `test_prd_run_update.py` | PRD run state transitions |
| `test_smtp_quick.py` | SMTP connection validation |

---

## Project Structure

```
cognisim_ai_backend/
├── run_server.py                   # Uvicorn entry point (localhost:8000, reload)
├── Dockerfile                      # Docker image (Python 3.11-slim, port 7860)
├── requirements.txt                # Python dependencies (22 packages)
│
├── app/
│   ├── main.py                     # FastAPI app init, middleware, route registration
│   │
│   ├── core/
│   │   ├── config.py               # Pydantic BaseSettings — all env vars, validation
│   │   └── dependencies.py         # Auth guards, RBAC factories, Supabase client
│   │
│   ├── agents/                     # AI Agent implementations
│   │   ├── epic_decomposer.py      # Epic→Stories agent (OpenAI Agents SDK + Gemini)
│   │   ├── prd_generator.py        # 6-agent PRD pipeline + coherence validation
│   │   └── prd_tools.py            # Agent tools (@function_tool): Jira, Slack, Web, dedup
│   │
│   ├── api/routes/                 # API endpoints (12 route modules, 60+ endpoints)
│   │   ├── agents.py               # /api/agents/* — decompose, stream, runs, quota
│   │   ├── prd.py                  # /api/prd/* — generate, stream, CRUD, approve, regenerate
│   │   ├── projects.py             # /api/projects/* — CRUD, metrics, access control
│   │   ├── workspaces.py           # /api/workspaces/* — CRUD, members, invitations
│   │   ├── integrations.py         # /api/integrations/* — status, disconnect
│   │   ├── jira/                   # Jira integration routes
│   │   │   ├── oauth.py            # OAuth init, callback, status, disconnect
│   │   │   ├── projects.py         # Jira project listing, details
│   │   │   ├── boards.py           # Boards, sprints
│   │   │   ├── issues.py           # Issue CRUD, search, push, transitions
│   │   │   └── sync.py             # Sync triggers, webhooks, status
│   │   ├── github/                 # GitHub App routes
│   │   │   └── app.py              # Install URL, status, repos, webhooks
│   │   └── slack/                  # Slack routes
│   │       └── oauth.py            # OAuth init, callback, channels
│   │
│   ├── models/                     # Pydantic models (50+)
│   │   ├── prd_models.py           # PRDInput, PRDOutput, all section models, enums
│   │   ├── agent_config_models.py  # Agent configuration schemas
│   │   └── __init__.py
│   │
│   └── services/                   # Business logic layer
│       ├── jira/                   # JiraAPIClient, SyncService, TokenManager
│       ├── slack/                  # SlackOAuthService, event handlers
│       ├── github/                 # GitHub App client, webhook processor
│       ├── email_service.py        # Gmail SMTP (branded HTML templates)
│       ├── feature_flags.py        # In-memory flag cache from DB
│       ├── embeddings.py           # Vector embeddings, cosine similarity
│       ├── tokenizer.py            # Token counting and estimation
│       ├── notifications.py        # Event-driven notification bus
│       └── events/                 # Event bus (PRD_COMPLETED, AGENT_RUN_COMPLETED)
│
├── supabase/
│   └── migrations/                 # SQL migration files
│
└── tests/                          # 20+ test modules (pytest)
    ├── run_tests.py                # Test runner script
    ├── test_json_repair.py
    ├── test_token_encryption.py
    └── ...
```

---

## API Endpoints Reference

### AI Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agents/epic/decompose` | Decompose epic into user stories (sync) |
| `POST` | `/api/agents/epic/decompose/stream` | SSE streaming decomposition with progress events |
| `GET` | `/api/agents/runs` | List agent runs for current user + team |
| `GET` | `/api/agents/runs/{run_id}` | Detailed run (output, tokens, quality) |
| `GET` | `/api/agents/team_quota` | Daily runs used/limit/remaining |

### PRD Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/prd/generate` | Generate PRD (sync, ~30-60s) |
| `POST` | `/api/prd/generate/stream` | SSE streaming PRD generation |
| `GET` | `/api/prd` | List PRDs (paginated, filterable) |
| `GET` | `/api/prd/{prd_id}` | Full PRD document |
| `PATCH` | `/api/prd/{prd_id}` | Update title, status, or sections |
| `DELETE` | `/api/prd/{prd_id}` | Soft delete (archive) |
| `POST` | `/api/prd/{prd_id}/sections/{section}/regenerate` | Regenerate single section with feedback |
| `POST` | `/api/prd/{prd_id}/approve` | Mark PRD as approved |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/projects` | Create project (scrum/kanban) |
| `GET` | `/api/projects` | List projects in workspace |
| `GET` | `/api/projects/{id}` | Project detail with item counts |
| `PATCH` | `/api/projects/{id}` | Update name, description, status |
| `GET` | `/api/projects/{id}/metrics/summary` | WIP, velocity, cycle time |

### Workspaces & Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/workspaces` | Create workspace |
| `GET` | `/api/workspaces` | List user's workspaces |
| `GET` | `/api/workspaces/{id}/members` | List members |
| `POST` | `/api/workspaces/{id}/members/invite` | Email invitation |
| `POST` | `/api/workspaces/{id}/invite-link` | Shareable invite link (1-30 day expiry) |

### Jira Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/jira/oauth/init` | Start OAuth 2.0 flow |
| `GET` | `/api/jira/oauth/callback` | OAuth callback handler |
| `GET` | `/api/jira/oauth/status` | Connection status |
| `POST` | `/api/jira/oauth/disconnect` | Revoke and delete tokens |
| `GET` | `/api/jira/projects/{integration_id}` | List Jira projects |
| `POST` | `/api/jira/issues/{integration_id}/search` | JQL search |
| `POST` | `/api/jira/issues/{integration_id}/push` | Push issues to Jira |
| `POST` | `/api/jira/sync/{integration_id}/project` | Sync Jira project |
| `POST` | `/api/jira/sync/webhook/receive` | Jira webhook receiver |

### GitHub Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workspaces/{id}/github/status` | GitHub App connection status |
| `GET` | `/api/workspaces/{id}/github/install-url` | GitHub App installation URL |
| `GET` | `/api/workspaces/{id}/github/repos` | List accessible repos |
| `POST` | `/api/github/webhooks` | GitHub webhook handler (HMAC-256) |

### Slack Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/slack/oauth/init` | Start Slack OAuth |
| `GET` | `/api/slack/oauth/callback` | OAuth callback |
| `GET` | `/api/slack/status` | Connection status |

---

## Authentication & Authorization

**Authentication flow:**
1. Frontend obtains JWT from Supabase Auth
2. Sends `Authorization: Bearer {token}` header
3. `get_current_user()` dependency validates via `supabase.auth.get_user(token)`
4. Returns `UserModel(id, email)` — or raises HTTP 401

**RBAC (4 tiers):**

| Level | Roles | Enforcement |
|-------|-------|-------------|
| **Workspace** | owner, admin, member, viewer | `workspace_role_required()` |
| **Team** | owner, admin, member, viewer | `team_role_required()` |
| **Project** | admin, editor, viewer | Per-team access grants |
| **Feature** | feature_flags table | `feature_enabled()` dependency |

---

## Docker Deployment

```bash
# Build the image
docker build -t cognisim-backend .

# Run locally
docker run -p 7860:7860 --env-file ../.env cognisim-backend
```

**Dockerfile details:**
- Base: `python:3.11-slim`
- Non-root user: `user` (UID 1000) — required by Hugging Face Spaces
- Port: `7860` (HF Spaces standard)
- Server: `uvicorn app.main:app --host 0.0.0.0 --port 7860`

### Deploy to Hugging Face Spaces

1. Create a Space at [huggingface.co/new-space](https://huggingface.co/new-space) with SDK: **Docker**
2. Push code: `git push hf main`
3. Set secrets in Space Settings (all env vars from above)
4. Space auto-builds and deploys

### Deploy to Railway

1. Create project at [railway.app](https://railway.app)
2. Connect GitHub repo
3. Set root directory to `cognisim_ai_backend`
4. Add environment variables
5. Railway auto-detects Dockerfile and deploys

---

## Database Schema

Core tables managed in Supabase (migrations in `supabase/migrations/`):

```
users, workspaces, workspace_members, teams, team_members,
projects, sprints, issues (items), project_activity,
agent_runs, agent_run_items, prd_documents, prd_audit_log,
integration_credentials, github_installations, slack_integrations,
feature_flags
```

All tables use **Row-Level Security (RLS)** policies. OAuth tokens are **AES-256 encrypted** at rest.

---

## Dependencies

```
fastapi              # Web framework
uvicorn[standard]    # ASGI server
pydantic-settings    # Env var management
supabase             # Database + auth client
openai-agents        # AI agent framework
openai               # OpenAI-compatible API client
cryptography         # AES-256 credential encryption
slowapi              # Rate limiting
httpx                # Async HTTP client
slack-sdk            # Slack API client
jira                 # Jira API client
fpdf2                # PDF generation
PyJWT                # JWT handling
pytest               # Testing
pytest-asyncio       # Async test support
python-dotenv        # .env loading
sqlalchemy           # ORM (migrations)
psycopg2-binary      # PostgreSQL driver
passlib[bcrypt]      # Password hashing
python-jose          # JWT utilities
alembic              # Database migrations
```
