# CogniSim AI

**AI-Powered Project Management Platform with Multi-Agent Orchestration**

A full-stack, production-grade platform that uses **8 specialized AI agents** (powered by Google Gemini + OpenAI Agents SDK) to automate the cognitive overhead of Agile Product Ownership — from decomposing epics into user stories to generating enterprise PRDs — while keeping humans in the loop at every decision point.

`React 19` · `TypeScript` · `FastAPI` · `Python 3.11` · `Supabase PostgreSQL` · `Gemini 2.5 Flash` · `OpenAI Agents SDK` · `Docker` · `~74K LOC`

---

**Product Owners waste ~60% of their time** on admin: writing stories, estimating effort, grooming backlogs, syncing Jira, generating reports. CogniSim AI automates these tasks with specialized AI agents — each producing structured, quality-scored outputs — while the human reviews, edits, and approves every artifact before it's committed.

## What It Does

### 8 Specialized AI Agents

| Agent | What It Does | Output |
|-------|-------------|--------|
| **Epic Decomposer** | Breaks down large epics into implementable user stories | 3-12 stories with Given/When/Then acceptance criteria, risk flags |
| **PRD Discovery Agent** | Analyzes market context and validates problem statements | Executive summary with vision, objectives, success metrics |
| **Personas Agent** | Generates detailed user personas from target audience data | 2-6 personas with goals, pain points, use cases |
| **Feature Spec Agent** | Defines features with priorities and acceptance criteria | 3-25 features (P0-P3) with effort estimates and dependencies |
| **Technical Agent** | Produces architecture recommendations and API specs | Tech stack, integrations, performance SLAs, security requirements |
| **Risk Assessment Agent** | Identifies technical, business, and operational risks | 5-10 categorized risks with mitigation strategies |
| **Timeline Agent** | Creates phased implementation plans | 3-5 phases with milestones, deliverables, critical path |
| **Coherence Agent** | Cross-validates all PRD sections for consistency | Quality score (0-100) with specific improvement suggestions |

All outputs are drafts — users review, edit, and approve before anything touches the database.

### Project Management

- **Workspaces & Projects** — Multi-workspace support with role-based access (owner/admin/member/viewer)
- **Kanban Boards** — Drag-and-drop issue management with custom status columns
- **Sprint Planning** — Backlog grooming, sprint creation, velocity tracking
- **Real-Time Dashboard** — KPIs, burndown charts, team performance analytics
- **Team Management** — Invite via email/link, role assignment, team analytics

### Integrations

- **Jira** — OAuth 2.0, bidirectional sync, webhooks, JQL search, bulk story push-back, conflict resolution UI
- **Slack** — OAuth, channel notifications, thread-based context gathering for PRD generation
- **GitHub** — App installation, repo discovery, Projects V2 sync, HMAC-256 webhook verification

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                                 │
│   React 19 · TypeScript 5.9 · Tailwind CSS · shadcn/ui          │
│   51 pages · 70+ components · Code-split · Vercel Edge CDN      │
├─────────────────────────────────────────────────────────────────┤
│                      API LAYER                                   │
│   FastAPI · 60+ endpoints · JWT Auth · SSE Streaming             │
│   RBAC (4-tier) · Rate Limiting · Feature Flags                  │
│   Hugging Face Spaces (Docker) / Railway                         │
├─────────────────────────────────────────────────────────────────┤
│                 AI ORCHESTRATION LAYER                            │
│   OpenAI Agents SDK → Gemini 2.0/2.5 Flash                      │
│   Structured Pydantic outputs · Input guardrails · Tool calling  │
│   JSON repair pipeline (3-layer fallback for LLM reliability)    │
├─────────────────────────────────────────────────────────────────┤
│                     DATA LAYER                                   │
│   Supabase PostgreSQL · Row-Level Security · pgvector            │
│   AES-256 encrypted credential vault · JSONB agent artifacts     │
└─────────────────────────────────────────────────────────────────┘
```

**Data Flow:** Browser → Vercel CDN → FastAPI (JWT validated) → Agent Orchestrator → Gemini LLM → Structured Output → SSE Stream → React UI

---

## Tech Stack

**Frontend:** React 19 · TypeScript 5.9 · Vite (SWC) · Tailwind CSS · shadcn/ui · React Query v5 · React Router v6 · Recharts · @dnd-kit · Zod

**Backend:** Python 3.11 · FastAPI · Uvicorn · Pydantic v2 · SlowAPI · HTTPX · FPDF2

**AI/ML:** OpenAI Agents SDK · Google Gemini 2.0/2.5 Flash · Cosine similarity dedup

**Database:** Supabase PostgreSQL · Row-Level Security · pgvector · JSONB artifacts

**Security:** Supabase Auth (PKCE) · JWT · AES-256 encryption · HMAC-256 webhooks · CORS · Rate limiting

**Integrations:** Jira Cloud (OAuth + sync + webhooks) · Slack (OAuth + events) · GitHub App (JWT + GraphQL) · Brave Search · Gmail SMTP

**Infra:** Vercel (CDN) · HF Spaces / Railway (Docker) · Python 3.11-slim non-root container

**Testing:** Pytest + pytest-asyncio · Vitest

---

## Hard Engineering Problems Solved

| Problem | Solution |
|---------|----------|
| **LLM outputs aren't valid JSON** — complex schemas + token limits = truncated/malformed responses | 3-layer repair pipeline: direct parse → auto-close truncated brackets → regex extraction of complete array items. Plus `output_type` schema-constrained decoding. |
| **6-agent pipeline coordination** — any agent failure must not crash the pipeline | Typed Pydantic outputs per agent, fallback stub generators, partial delivery (4/6 succeed → 4 sections + warnings), 7th Coherence Agent cross-validates. |
| **30-60s AI operations** — users can't stare at a spinner | `AsyncGenerator` SSE endpoints stream progress events (`run_created` → `progress` → `section_complete` → `result`). Frontend renders sections as they arrive. |
| **Bidirectional Jira sync** — two schemas, custom fields, conflict risk | JQL incremental sync, upsert on `jira_issue_key`, HMAC-verified webhooks, dedicated conflict resolution UI. |
| **Agent input safety** — junk input wastes tokens and hallucinates | `@input_guardrail` runs validation in parallel with agent. Tripwire aborts before token consumption. Zero latency on happy path. |

---

## Codebase Stats

| Metric | Count |
|--------|-------|
| **Total Lines of Code** | ~74,000 |
| **Frontend (TS/TSX)** | ~46,500 LOC · 251 files |
| **Backend (Python)** | ~27,400 LOC · 80+ files |
| **Pages** | 51 (all lazy-loaded) |
| **Components** | 70+ custom + 48 shadcn/ui |
| **API Endpoints** | 60+ |
| **AI Agents** | 8 (1 decomposer + 6 PRD + 1 coherence) |
| **Database Tables** | 20+ |
| **Test Modules** | 20+ |
| **Pydantic Models** | 50+ |

---

## Project Structure

```
CogniSim-AI/
├── frontend/                        # React 19 SPA
│   └── src/
│       ├── pages/                   # 51 lazy-loaded pages
│       ├── components/              # 70+ components (prd/, dashboard/, agent/, ui/)
│       ├── contexts/                # Auth, Workspace, Project, Team contexts
│       ├── hooks/                   # 8 custom hooks
│       └── lib/api/                 # 20 API service modules
│
├── cognisim_ai_backend/             # FastAPI Backend
│   └── app/
│       ├── agents/                  # AI agents (epic_decomposer, prd_generator, prd_tools)
│       ├── api/routes/              # 12 route modules (agents, prd, projects, jira/, github/, slack/)
│       ├── models/                  # 50+ Pydantic models
│       ├── services/                # Jira, Slack, GitHub, email, embeddings, notifications
│       └── core/                    # Config (Pydantic BaseSettings), auth dependencies
│
├── docs/                            # Integration setup guides
├── Progress Docs/                   # UML diagrams, SRS, use cases
└── PROJECT_SHOWCASE.md              # Detailed technical documentation
```

---

## Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Python 3.11+**
- **Supabase project** (free tier works)

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local    # Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev                    # → http://localhost:8080
```

### Backend
```bash
cd cognisim_ai_backend
python -m venv .venv
.venv\Scripts\activate         # Windows  (source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
# Create .env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
python run_server.py           # → http://localhost:8000
```

> See [frontend/README.md](frontend/README.md) and [cognisim_ai_backend/README.md](cognisim_ai_backend/README.md) for complete setup guides.

---

## Key API Endpoints

| Category | Endpoint | Description |
|----------|----------|-------------|
| **AI Agents** | `POST /api/agents/epic/decompose/stream` | SSE streaming epic decomposition |
| **PRD** | `POST /api/prd/generate/stream` | SSE streaming PRD generation (6 agents) |
| **PRD** | `POST /api/prd/{id}/sections/{section}/regenerate` | Regenerate individual section |
| **Projects** | `GET/POST /api/projects` | Project CRUD with workspace scoping |
| **Jira** | `POST /api/jira/sync/{id}/project` | Bidirectional Jira sync |
| **GitHub** | `POST /api/github/webhooks` | HMAC-verified webhook handler |
| **Workspaces** | `POST /api/workspaces/{id}/members/invite` | Email + token invitations |

60+ endpoints total — run the backend and visit `/docs` for the full Swagger UI.

---

## Deployment

| Component | Platform | Configuration |
|-----------|----------|--------------|
| **Frontend** | Vercel | Auto-deploy on `git push`; Edge CDN; preview deployments per PR |
| **Backend** | Hugging Face Spaces / Railway | Docker container (Python 3.11-slim); port 7860 (HF) or 8000 (Railway) |
| **Database** | Supabase | Managed PostgreSQL with RLS; migrations in `supabase/migrations/` |

---

## Documentation

| Document | What It Covers |
|----------|---------------|
| [PROJECT_SHOWCASE.md](PROJECT_SHOWCASE.md) | Full technical deep-dive (architecture, algorithms, DB schema, all endpoints) |
| [cognisim_ai_backend/PRD.md](cognisim_ai_backend/PRD.md) | Product Requirements Document — vision, personas, agents spec, risk assessment |
| [Progress Docs/](Progress%20Docs/) | UML diagrams (ERD, sequence, activity, component, deployment, class), SRS, use cases |
| [docs/](docs/) | Integration setup guides (Jira, GitHub, Slack, Hugging Face) |

---

## Roadmap

- [ ] Story Estimation Agent — AI-powered story points with confidence scores
- [ ] Backlog Prioritization Agent — Value-effort-risk scoring with Monte Carlo simulation
- [ ] Sprint Planning Agent — Capacity-aware sprint composition
- [ ] PRD → Backlog Pipeline — Auto-convert approved PRD features to issues
- [ ] Collaborative Review — Threaded comments, reviewer assignment, approval workflow
- [ ] Voice Command Interface — Voice-driven project management
- [ ] Multi-Model Cascade — Fast model first, quality model fallback

---

## License

MIT
