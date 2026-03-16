# CogniSim AI — Comprehensive Project Documentation

> **Version:** 1.3.0 | **Last Updated:** March 2026 | **Status:** Production (Live)

---

## Table of Contents

1. [Project Basics](#1-project-basics)
2. [System Design](#2-system-design)
3. [Engineering Depth](#3-engineering-depth)
4. [Impact & Usage](#4-impact--usage)
5. [Codebase & Development](#5-codebase--development)
6. [Product Thinking](#6-product-thinking)
7. [GitHub Showcase](#7-github-showcase)

---

## 1. Project Basics

### Project Name

**CogniSim AI** — Intelligent Project Management Platform with Multi-Agent AI Orchestration

### Project Overview

CogniSim AI is an enterprise-grade, AI-augmented project management platform that leverages a **multi-agent orchestration architecture** to automate the cognitive overhead of Agile Product Ownership. The system deploys specialized AI agents — built on Google Gemini LLMs via the OpenAI Agents SDK — to decompose epics into user stories, generate Product Requirement Documents (PRDs), and integrate bi-directionally with Jira, Slack, and GitHub. The platform features a full-stack React 19 + FastAPI architecture with real-time streaming via Server-Sent Events (SSE), Supabase PostgreSQL with Row-Level Security, and cloud-native deployment across Vercel and Hugging Face Spaces.

### Problem Statement

Product Owners in Agile environments spend **~60% of their time on administrative tasks** — writing stories, estimating effort, managing backlogs, syncing tools, and generating reports. This administrative burden compounds as team size and project complexity grow, creating bottlenecks that reduce strategic decision-making capacity by over 40%. Existing tools (Jira, Linear, Asana) provide issue tracking but lack intelligent automation — they are passive systems that require manual input for every artifact.

CogniSim AI transforms the Product Owner role from **administrative coordinator to strategic leader** by delegating repetitive cognitive tasks to specialized AI agents while maintaining full human-in-the-loop control over every decision.

### Target Users

| Persona | Role | Primary Pain Point | How CogniSim Helps |
|---------|------|--------------------|---------------------|
| **Sarah** | Senior Product Owner | Manages 3+ teams; drowning in admin overhead | AI agents handle story writing, estimation, and backlog grooming |
| **Michael** | Agile Coach | Needs cross-team visibility and data-driven coaching | Automated reports, velocity analytics, sprint predictability metrics |
| **David** | Engineering Director | Requires high-level progress updates without micromanaging | Real-time dashboards, AI-generated status reports |
| **Dev Teams** | Engineers & QA | Poorly written stories with vague acceptance criteria | Structured stories with Given/When/Then criteria and risk flags |

---

## 2. System Design

### High-Level Architecture

CogniSim AI follows a **four-layer distributed architecture** with strict separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  React 19 SPA (Vite + TypeScript + Tailwind CSS + shadcn/ui)        │
│  Deployed: Vercel Edge Network | CDN-cached static assets            │
├─────────────────────────────────────────────────────────────────────┤
│                        API LAYER                                     │
│  FastAPI (Python 3.11) — RESTful + SSE Streaming                    │
│  Auth: JWT (Supabase) | Rate Limiting: SlowAPI | CORS               │
│  Deployed: Hugging Face Spaces (Docker) / Railway                    │
├─────────────────────────────────────────────────────────────────────┤
│                     AI ORCHESTRATION LAYER                           │
│  OpenAI Agents SDK → Gemini 2.0/2.5 Flash (via OpenAI-compat API)  │
│  Agents: Epic Decomposer | PRD Generator (6 sub-agents)             │
│  Tools: Jira Context | Slack Threads | Web Search | Codebase Analysis│
├─────────────────────────────────────────────────────────────────────┤
│                      DATA LAYER                                      │
│  Supabase PostgreSQL — Row-Level Security | pgvector | Realtime      │
│  Encrypted credential storage (AES-256) | JSONB for agent artifacts  │
└─────────────────────────────────────────────────────────────────────┘
```

**Request Flow:**
1. User interacts with React SPA → Vite dev proxy or Vercel Edge routes API calls
2. FastAPI validates JWT (Supabase `auth.get_user()`) and enforces RBAC
3. Business logic executes; AI agent requests stream results via SSE
4. Supabase PostgreSQL persists data with RLS policies; encrypted tokens for integrations

### Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Frontend Framework** | React | 19.2.1 | Concurrent rendering, Suspense for lazy loading, RSC-ready |
| **Build Tool** | Vite | 5.4.1 | Sub-second HMR, ESBuild minification, SWC plugin for React |
| **Language** | TypeScript | 5.9.2 | Type safety across 251 source files; strict mode enabled |
| **Styling** | Tailwind CSS + shadcn/ui | 3.4.11 | Utility-first CSS with 48 pre-built Radix UI components |
| **State Management** | React Query (TanStack) | 5.56.2 | Server-state caching, automatic refetching, optimistic updates |
| **Client Routing** | React Router | 6.26.2 | Nested routing with lazy-loaded code-split pages |
| **Backend Framework** | FastAPI | 0.104+ | Async-first, automatic OpenAPI docs, Pydantic v2 validation |
| **Backend Language** | Python | 3.11 | Native async/await, type hints, match statements |
| **AI/ML SDK** | OpenAI Agents SDK | Latest | Structured agent outputs, input guardrails, tool calling |
| **LLM Provider** | Google Gemini 2.0/2.5 Flash | — | Low latency, high throughput, OpenAI-compatible API |
| **Database** | PostgreSQL (Supabase) | 15+ | RLS policies, JSONB, pgvector extension, realtime subscriptions |
| **Authentication** | Supabase Auth + JWT | — | PKCE OAuth flow, session management, social auth |
| **Encryption** | AES-256 (cryptography lib) | — | Secret key + salt for OAuth credential storage |
| **Rate Limiting** | SlowAPI | — | Per-endpoint rate limits, IP-based throttling |
| **Containerization** | Docker | — | Python 3.11-slim, non-root user, HF Spaces compatible |
| **Frontend Hosting** | Vercel | — | Edge network, automatic CI/CD, preview deployments |
| **Backend Hosting** | Hugging Face Spaces / Railway | — | Docker containers, GPU-optional, auto-scaling |
| **Charts** | Recharts | 2.15.4 | React-native charting for burndown, velocity, analytics |
| **Drag & Drop** | @dnd-kit | Latest | Accessible DnD for Kanban boards, backlog reordering |
| **Forms** | React Hook Form + Zod | 7.53.0 / 3.25 | Schema-validated forms with resolver pattern |
| **Icons** | Lucide React | 0.462.0 | 460+ tree-shakeable SVG icons |
| **PDF Export** | FPDF2 | — | Server-side PRD export to PDF |

### Key Technical Features

1. **Multi-Agent AI Orchestration** — 7 specialized agents (1 epic decomposer + 6 PRD sub-agents) coordinated via the OpenAI Agents SDK with structured Pydantic outputs and input guardrails
2. **Real-Time Streaming (SSE)** — Epic decomposition and PRD generation stream progress events to the frontend via `AsyncGenerator`-backed Server-Sent Events
3. **Bidirectional Jira Sync** — OAuth 2.0 flow with encrypted token storage, JQL-based incremental sync, webhook event processing, and automatic story push-back
4. **Enterprise PRD Generator** — 6-agent pipeline (Discovery → Personas → Features → Technical → Risks → Timeline) with a 7th Coherence Agent for cross-validation
5. **Role-Based Access Control (RBAC)** — Four-tier authorization (Workspace → Team → Project → Issue) enforced at both API and database layers
6. **Encrypted Credential Vault** — AES-256 encryption with dedicated secret key and salt for all OAuth tokens (Jira, Slack, GitHub)
7. **Feature Flag System** — In-memory cached flags loaded from database on startup for runtime feature toggling
8. **Human-in-the-Loop AI** — All AI outputs are presented as drafts; users review, edit, and explicitly commit before any database mutations

### System Design Decisions

| Decision | Choice Made | Alternatives Considered | Rationale |
|----------|------------|------------------------|-----------|
| **LLM Provider** | Gemini via OpenAI-compat API | Direct OpenAI GPT-4, Anthropic Claude | Cost-effective ($0 for Flash tier), low latency, structured output support, vendor flexibility via adapter pattern |
| **Agent Framework** | OpenAI Agents SDK | LangChain, CrewAI, AutoGen | First-class structured outputs (`output_type`), built-in guardrails (`@input_guardrail`), native streaming support, minimal abstraction overhead |
| **Database** | Supabase PostgreSQL | Firebase, PlanetScale, raw PostgreSQL | Built-in auth, RLS policies, realtime subscriptions, pgvector for embeddings, managed infrastructure, generous free tier |
| **Frontend State** | React Query + Context API | Redux, Zustand, MobX | Server-state-first approach eliminates boilerplate; Context for auth/workspace avoids unnecessary re-renders |
| **Streaming Protocol** | Server-Sent Events (SSE) | WebSockets, Long Polling | Unidirectional server→client streaming is sufficient for agent progress; simpler than WebSocket, auto-reconnect built-in |
| **Styling** | Tailwind + shadcn/ui | Material UI, Chakra UI, Ant Design | Zero-runtime CSS, copy-paste component ownership, full customization without fighting library abstractions |
| **Backend Hosting** | HF Spaces + Railway | AWS Lambda, GCP Cloud Run, Render | Free Docker hosting on HF, Railway for production; avoids cold-start issues of serverless for long-running AI inference |
| **OAuth Token Storage** | AES-256 in Supabase | Vault, AWS KMS | Pragmatic for current scale; encryption at rest with separate key management; upgradeable to KMS in production |

---

## 3. Engineering Depth

### Hard Engineering Challenges Solved

#### 1. Structured Output Enforcement from LLMs
LLMs produce non-deterministic outputs; extracting valid JSON conforming to complex Pydantic schemas (e.g., `PRDOutput` with 6 nested sections, 25+ features, each with typed fields) is fundamentally unreliable.

**Solution:** Three-layer fallback parsing pipeline:
- **Layer 1:** Direct `json.loads()` on cleaned output (strip code fences, trailing commas)
- **Layer 2:** `repair_truncated_json()` — detects unclosed brackets/braces from token-limit truncation and auto-closes them
- **Layer 3:** `extract_partial_array()` — recovers complete array items from incomplete responses using regex boundary detection

Combined with the OpenAI Agents SDK `output_type` parameter for schema-level enforcement and Pydantic validation for field-level constraints.

#### 2. Multi-Agent Pipeline Coordination
The PRD generator orchestrates 6 independent agents sequentially, where each agent's output feeds into subsequent agents' context. Failure of any agent must not crash the pipeline.

**Solution:**
- Each agent returns typed Pydantic models (`ExecutiveSummary`, `PersonasOutput`, `FeaturesOutput`, etc.)
- `create_fallback_*()` stub generators produce valid-but-minimal outputs when an agent fails
- Partial results are always returned — if 4/6 agents succeed, those 4 sections are delivered with warnings
- A 7th **Coherence Agent** cross-validates all sections for consistency (persona↔feature mapping, timeline↔feature dependencies)

#### 3. Bidirectional Jira Sync Without Data Loss
Two-way sync between CogniSim's internal schema and Jira's API (different field models, custom fields, statuses) creates conflict potential.

**Solution:**
- **JQL-based incremental sync** — only fetch issues modified since last sync timestamp
- **Upsert strategy** — match on `jira_issue_key` to avoid duplicates
- **Field mapping layer** — configurable mapping between Jira custom fields and internal schema
- **Conflict resolution UI** — dedicated `/dashboard/jira-conflicts` page for human resolution
- **Webhook-driven push** — HMAC-256 verified webhooks trigger immediate sync on Jira-side changes
- **ADF (Atlassian Document Format)** support for rich text round-tripping

#### 4. Real-Time Streaming for Long-Running AI Operations
Epic decomposition takes 5-15s; PRD generation takes 30-60s. HTTP timeouts and poor UX from loading spinners are unacceptable.

**Solution:**
- `AsyncGenerator`-based SSE endpoints (`/api/agents/epic/decompose/stream`, `/api/prd/generate/stream`)
- Structured event protocol: `run_created` → `progress` (with percentage) → `section_complete` → `result`
- Frontend `EventSource` consumption with progress bars and section-by-section rendering
- Fallback to synchronous endpoints if SSE connection fails

#### 5. Input Guardrails for Agent Safety
Users can submit arbitrary text to AI agents; junk input wastes tokens and produces hallucinated outputs.

**Solution:**
- `@input_guardrail` decorator (OpenAI Agents SDK primitive) runs validation **in parallel** with agent execution
- **Tripwire mechanism** — if guardrail fails, agent execution is aborted before token consumption
- Validation rules: minimum 20 characters, non-greeting detection, epic-content heuristics
- Guardrail runs concurrently, adding zero latency to the happy path

### Algorithms & AI Techniques

| Technique | Implementation | Purpose |
|-----------|---------------|---------|
| **Multi-Agent Orchestration** | 7 agents (1 decomposer + 6 PRD agents) via OpenAI Agents SDK `Runner.run()` | Decompose complex tasks into specialized sub-problems |
| **Structured LLM Outputs** | Pydantic `output_type` on Agent definition → schema-constrained decoding | Enforce valid JSON conforming to domain models |
| **Input Guardrails** | `@input_guardrail` with tripwire abort | Reject invalid inputs before token consumption |
| **JSON Repair Pipeline** | 3-step fallback: direct parse → truncation repair → partial array extraction | Handle LLM response truncation from token limits |
| **Cosine Similarity Deduplication** | Embedding-based similarity (threshold 0.85) via `check_requirement_duplicates()` | Detect duplicate stories across existing backlog |
| **Quality Scoring (Epic)** | Weighted composite: story count match (30%) + AC density (40%) + completeness (20%) + warning penalty (10%) | Quantify decomposition output quality |
| **Quality Scoring (PRD)** | Composite of structure, completeness, and LLM alignment → 0-100 score | Quantify PRD generation quality |
| **Context Enrichment** | Parallel fetch from Jira (epics, child issues, comments), Slack (channel threads), Web (Brave/SerpAPI) | Ground AI agents in real project data |
| **Token Estimation** | Character-based heuristic (len/4 fallback) + actual token counting | Track usage for quota enforcement and cost estimation |

### Performance Optimizations

| Optimization | Layer | Impact |
|-------------|-------|--------|
| **Code Splitting** | Frontend | 51 pages lazy-loaded via `React.lazy()` + `Suspense`; vendor/router/auth chunks separated |
| **Vite SWC Compiler** | Frontend Build | 10-20x faster compilation vs Babel via `@vitejs/plugin-react-swc` |
| **ESBuild Minification** | Frontend Build | Sub-second minification; tree-shaking eliminates dead code |
| **React Query Caching** | Frontend | Automatic cache invalidation, stale-while-revalidate, deduplication of concurrent requests |
| **SSE Streaming** | API | Progressive rendering; user sees results in <3s instead of waiting 30-60s for full response |
| **Async FastAPI** | Backend | Non-blocking I/O for all database queries, HTTP clients, and agent invocations |
| **Parallel Context Enrichment** | AI Layer | Jira, Slack, and Web searches execute concurrently via `asyncio.gather()` |
| **In-Memory Feature Flags** | Backend | Zero-latency flag checks; flags loaded from DB once on startup |
| **Incremental Jira Sync** | Integration | JQL time-filtered queries fetch only changed issues, not full project |
| **Rate Limiting (SlowAPI)** | API | Prevents abuse; configurable per-endpoint (e.g., `/api/profile`: 10/minute) |
| **Vercel Edge Network** | Deployment | CDN-cached static assets; <1.5s first contentful paint globally |
| **Docker Layer Caching** | Deployment | Requirements installed before code copy; rebuilds skip dependency layer |

---

## 4. Impact & Usage

### Real Users & Adoption

CogniSim AI is deployed as a **live production application** accessible at:
- **Frontend:** Hosted on Vercel with global CDN distribution
- **Backend API:** Hosted on Hugging Face Spaces (Docker) and Railway

The platform is designed for Product Owners, Scrum Masters, Agile Coaches, and Engineering Managers. The system supports **100 concurrent users** with **50 AI requests/day per user** as baseline capacity.

### Deployment Architecture

```
┌──────────────┐     HTTPS/CDN      ┌──────────────────┐
│  User Browser │ ◄──────────────── │  Vercel Edge CDN  │
│  (React SPA)  │                    │  (Static Assets)  │
└──────┬───────┘                    └──────────────────┘
       │ HTTPS/JSON
       ▼
┌──────────────────────────────────┐
│  Hugging Face Spaces / Railway    │
│  ┌────────────────────────────┐  │
│  │ Docker Container            │  │
│  │ ├─ FastAPI + Uvicorn       │  │
│  │ ├─ Agent Orchestrator      │  │
│  │ └─ Background Workers      │  │
│  └────────────────────────────┘  │
└──────┬──────────┬────────────────┘
       │ SQL/TCP  │ HTTPS
       ▼          ▼
┌─────────────┐  ┌─────────────────────┐
│  Supabase    │  │  External Services   │
│  PostgreSQL  │  │  ├─ Gemini API       │
│  + pgvector  │  │  ├─ Jira Cloud API   │
│  + Realtime  │  │  ├─ Slack API        │
│  + Auth      │  │  ├─ GitHub API       │
└─────────────┘  │  ├─ Brave Search API  │
                 │  └─ Gmail SMTP        │
                 └─────────────────────┘
```

**CI/CD Pipeline:**
- **Frontend:** Vercel auto-deploys on `git push` to main branch; preview deployments for PRs
- **Backend:** Docker build + push to HF Spaces / Railway; Dockerfile-based reproducible builds
- **Database Migrations:** SQL migration files in `supabase/migrations/` applied via Supabase Dashboard

### Performance Metrics

| Metric | Target | Achieved |
|--------|--------|----------|
| **Frontend First Contentful Paint** | < 1.5s | < 1.5s via Vercel Edge + code splitting |
| **API Response (simple CRUD)** | < 500ms | < 300ms for project/issue endpoints |
| **Epic Decomposition (streaming)** | First event < 3s | ~2-3s for `run_created` event |
| **Epic Decomposition (total)** | < 15s | 5-15s depending on story count |
| **PRD Generation (total)** | < 90s | 30-60s for full 6-section document |
| **Jira Sync Latency** | < 30s for webhook events | < 30s bidirectional sync |
| **Quality Score (Epic Agent)** | > 0.8 | 1.0 in test runs (perfect story count match) |
| **PRD Quality Score** | > 70/100 | 70-95 depending on input quality |
| **Uptime Target** | 99.5% during business hours | Managed by Vercel (99.99% SLA) + HF Spaces |
| **Concurrent Users** | 100 | Supported via async FastAPI + rate limiting |
| **Daily AI Runs per Team** | Configurable (default 100) | Enforced via team quota system |

---

## 5. Codebase & Development

### Codebase Size

| Metric | Count |
|--------|-------|
| **Total Lines of Code** | **~74,000 LOC** |
| **Frontend (TypeScript/TSX)** | ~46,500 LOC across 251 files |
| **Backend (Python)** | ~27,400 LOC across 80+ files |
| **Frontend Pages** | 51 pages (all lazy-loaded) |
| **Frontend Components** | 70+ custom components + 48 shadcn/ui primitives |
| **Frontend Hooks** | 8 custom hooks |
| **Frontend API Services** | 20 service modules |
| **Frontend Contexts** | 4 (Auth, Workspace, Project, Team) |
| **Backend API Routes** | 60+ endpoints across 12 route modules |
| **Backend Services** | 15+ service modules |
| **Backend AI Agents** | 7 agents (1 decomposer + 6 PRD sub-agents) |
| **Backend Models** | 50+ Pydantic models |
| **Database Tables** | 20+ tables (core + agent + integration + feature flags) |
| **Test Files** | 20+ test modules |
| **Documentation Files** | 15+ markdown files |

### Project Structure & Architecture Pattern

```
Fyp/
├── frontend/                          # React 19 SPA (Vite + TypeScript)
│   └── src/
│       ├── App.tsx                    # Route definitions (51 routes)
│       ├── pages/                     # 51 lazy-loaded page components
│       │   ├── Dashboard.tsx          # Main dashboard with KPIs
│       │   ├── EpicDecomposer.tsx     # AI epic decomposition UI
│       │   ├── PRDGenerator.tsx       # PRD generation wizard
│       │   ├── ProjectBoard.tsx       # Kanban board (DnD)
│       │   ├── ProjectBacklog.tsx     # Sprint backlog management
│       │   └── ...                    # 46 more pages
│       ├── components/                # 70+ reusable components
│       │   ├── prd/                   # 15 PRD-specific components
│       │   ├── dashboard/             # 7 dashboard widgets
│       │   ├── issues/                # Issue management components
│       │   ├── agent/                 # Agent UI components
│       │   └── ui/                    # 48 shadcn/ui primitives
│       ├── contexts/                  # 4 React contexts
│       │   ├── AuthContext.tsx         # Supabase auth state
│       │   ├── WorkspaceContext.tsx    # Multi-workspace management
│       │   └── ProjectContext.tsx      # Project-scoped data
│       ├── hooks/                     # 8 custom hooks
│       ├── lib/
│       │   ├── api/                   # 20 API service modules
│       │   │   ├── client.ts          # Fetch wrapper + auth injection
│       │   │   ├── projectService.ts
│       │   │   ├── prdService.ts      # SSE streaming consumer
│       │   │   └── ...
│       │   └── supabase/              # Supabase client + auth
│       └── constants/                 # Type enums, chart colors
│
├── cognisim_ai_backend/               # FastAPI Backend (Python 3.11)
│   ├── app/
│   │   ├── main.py                   # FastAPI app init, middleware, routes
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic BaseSettings (env vars)
│   │   │   └── dependencies.py       # Auth guards, RBAC factories
│   │   ├── agents/
│   │   │   ├── epic_decomposer.py    # Epic→Stories agent (OpenAI SDK)
│   │   │   ├── prd_generator.py      # 6-agent PRD pipeline
│   │   │   └── prd_tools.py          # Agent tools (Jira, Slack, Web)
│   │   ├── api/routes/               # 12 route modules, 60+ endpoints
│   │   │   ├── agents.py             # /api/agents/* endpoints
│   │   │   ├── prd.py                # /api/prd/* endpoints  
│   │   │   ├── projects.py           # /api/projects/* endpoints
│   │   │   ├── workspaces.py         # /api/workspaces/* endpoints
│   │   │   ├── jira/                 # Jira OAuth, sync, webhooks
│   │   │   ├── github/               # GitHub App, webhooks, repos
│   │   │   └── slack/                # Slack OAuth, channels
│   │   ├── models/                   # 50+ Pydantic models
│   │   │   ├── prd_models.py         # PRD domain models
│   │   │   └── agent_config_models.py
│   │   └── services/                 # Business logic layer
│   │       ├── jira/                 # JiraAPIClient, SyncService, TokenManager
│   │       ├── slack/                # SlackOAuthService, event handlers
│   │       ├── github/               # GitHub App client, webhook processor
│   │       ├── email_service.py      # Gmail SMTP notifications
│   │       ├── feature_flags.py      # Runtime feature toggling
│   │       ├── embeddings.py         # Vector similarity (dedup)
│   │       └── notifications.py      # Event-driven notification bus
│   ├── tests/                        # 20+ test modules
│   ├── supabase/migrations/          # SQL migration files
│   ├── Dockerfile                    # Python 3.11-slim, non-root
│   └── requirements.txt              # 25+ Python dependencies
│
├── docs/                              # Integration setup guides
│   ├── GITHUB_ENV_SETUP_GUIDE.md
│   ├── JIRA_INTEGRATION_COMPLETE.md
│   ├── SLACK_APP_SETUP_GUIDE.md
│   └── HUGGINGFACE_QUICKSTART.md
│
└── PROJECT_SHOWCASE.md                # ← This document
```

**Architecture Patterns:**
- **Frontend:** Component-Based Architecture with Context API for cross-cutting state + React Query for server state
- **Backend:** Layered Architecture (Routes → Services → Models → Database) with Dependency Injection via FastAPI `Depends()`
- **AI Layer:** Multi-Agent Pipeline Pattern with structured tool calling
- **Integration Layer:** Adapter Pattern for external services (Jira, Slack, GitHub) with encrypted credential vaults

### Testing Strategy

| Test Category | Count | Location | Framework |
|---------------|-------|----------|-----------|
| **API Endpoint Tests** | 3 files | `tests/test_api_endpoints.py`, `test_authenticated_apis.py` | pytest + httpx |
| **Agent Unit Tests** | 3 files | `tests/test_epic_decomposer_utils.py`, `test_prompt_variants.py`, `test_prd_*` | pytest |
| **Integration Validations** | 4 files | `tests/test_email_invitation.py`, `test_github_webhook_security.py`, `test_invite_accept_flow.py` | pytest |
| **Data Integrity Tests** | 5 files | `tests/test_json_repair.py`, `test_validation_layer.py`, `test_features_out_of_scope_coercion.py`, `test_timeline_dependencies_coercion.py` | pytest |
| **Security Tests** | 2 files | `tests/test_token_encryption.py`, `test_github_webhook_security.py` | pytest |
| **Migration Tests** | 1 file | `tests/test_migration_script.py` | pytest |
| **Frontend Tests** | — | `vitest` configured (`npm run test`) | Vitest |

**Test runner:** `python tests/run_tests.py` (backend) | `npm run test` (frontend)

**Test coverage areas:**
- JSON repair pipeline validation (truncated LLM outputs)
- Webhook HMAC-256 signature verification
- OAuth token encryption/decryption round-trip
- PRD quality score mapping accuracy
- Feature-to-issue coercion rules
- Input validation layer correctness
- Agent prompt variant A/B testing

---

## 6. Product Thinking

### Future Roadmap & Planned Features

#### Phase 1: Advanced AI Agents (Next)
| Feature | Description | Status |
|---------|------------|--------|
| **Story Estimation Agent** | AI-powered story point estimation with confidence scores and historical calibration | Planned |
| **Backlog Prioritization Agent** | Value-effort-risk scoring with transparent reasoning and Monte Carlo simulation | Planned |
| **Sprint Planning Agent** | Capacity-aware sprint composition with dependency-respecting scheduling | Planned |
| **Reporting Agent** | Automated sprint reports, burndown charts, stakeholder-tailored summaries | Planned |

#### Phase 2: Enterprise PRD System (In Progress)
| Feature | Description | Status |
|---------|------------|--------|
| **Inline Section Editing** | Markdown editor for individual PRD sections with auto-versioning | In Progress |
| **Version History & Diff Viewer** | Timeline sidebar with side-by-side diff comparison | In Progress |
| **PRD → Backlog Pipeline** | Feature-to-issue conversion with priority and effort mapping | Planned |
| **Jira Export** | Create Jira epic + child stories directly from approved PRD | Planned |
| **Collaborative Review Workflow** | Threaded comments, reviewer assignment, approval workflow (6 status states) | Planned |
| **Template Gallery** | Pre-built PRD templates by industry/domain with custom template builder | Planned |

#### Phase 3: Advanced Interfaces
| Feature | Description | Status |
|---------|------------|--------|
| **Conversational AI Interface** | Natural language chat for agent invocation | Planned |
| **Voice Command Execution** | Voice-driven project management actions | Planned |
| **Real-Time Dashboard** | WebSocket-powered live metrics and notifications | Partial |

#### Phase 4: Scale & Enterprise
| Feature | Description | Status |
|---------|------------|--------|
| **Multi-Model Cascade** | Fast model first → quality model fallback on validation failure | Planned |
| **Prompt Versioning & A/B Testing** | `prompt_version` column per agent run for comparative analysis | Planned |
| **Cost & Token Telemetry** | Per-model cost instrumentation with project-level quotas | Partial |
| **GitHub Projects V2 Bidirectional Sync** | Full two-way sync with GitHub Projects boards | In Progress |

### What Makes This Project Unique

1. **Multi-Agent Orchestration, Not Just Chat** — Unlike ChatGPT wrappers or Copilot-style autocomplete, CogniSim deploys **specialized agents** with typed inputs/outputs, domain-specific tools, and quality-scored results. The PRD generator coordinates 7 agents in a pipeline; each agent has a distinct role and structured output schema.

2. **Human-in-the-Loop by Design** — AI outputs are always drafts. Users review, edit, and explicitly commit. No autonomous database mutations. This builds trust and ensures quality while maintaining the speed advantage of AI generation.

3. **Production Integration Depth** — Bidirectional Jira sync with OAuth, webhook-driven updates, conflict resolution UI, and ADF support. Not a toy integration — it handles real enterprise Jira instances with custom fields, transitions, and board configurations.

4. **Enterprise-Grade PRD Generation** — 6 specialized agents produce a complete PRD (executive summary, personas, features with acceptance criteria, technical requirements, risk assessment, timeline) — then a 7th Coherence Agent cross-validates everything. Each section has a quality score (0-100).

5. **Structured Output Engineering** — Robust 3-layer JSON repair pipeline handles LLM non-determinism, token-limit truncation, and schema violations. This is the unsexy but critical engineering that makes AI features reliable in production.

6. **Full-Stack Production System** — Not a prototype or demo. 74K+ LOC, 51 pages, 60+ API endpoints, 20+ database tables, encrypted credential storage, rate limiting, RBAC, feature flags, and cloud deployment across Vercel + HF Spaces.

---

## 7. GitHub Showcase

### Architecture Diagram

```
                    ┌─────────────────────────────┐
                    │         USER BROWSER          │
                    │    React 19 + TypeScript SPA   │
                    └──────────────┬──────────────┘
                                   │ HTTPS
                    ┌──────────────▼──────────────┐
                    │        VERCEL EDGE CDN        │
                    │  Static Assets + API Proxy    │
                    └──────────────┬──────────────┘
                                   │ HTTPS/JSON
                    ┌──────────────▼──────────────┐
                    │      FASTAPI BACKEND          │
                    │  ┌─────────────────────────┐  │
                    │  │     API Routes (60+)     │  │
                    │  │  Auth │ Projects │ Agents│  │
                    │  ├─────────────────────────┤  │
                    │  │    Service Layer          │  │
                    │  │  Jira │ Slack │ GitHub    │  │
                    │  ├─────────────────────────┤  │
                    │  │   AI Agent Orchestrator   │  │
                    │  │  Epic Decomposer (1 agent)│ │
                    │  │  PRD Generator (7 agents) │  │
                    │  └─────────────────────────┘  │
                    └───┬──────────┬──────────┬────┘
                        │          │          │
              ┌─────────▼──┐  ┌───▼────┐  ┌──▼──────────┐
              │  Supabase   │  │ Gemini │  │  External    │
              │ PostgreSQL  │  │  LLM   │  │  Services    │
              │ + pgvector  │  │  API   │  │ Jira│Slack│GH│
              │ + RLS       │  │        │  │ Brave│SMTP  │
              └────────────┘  └────────┘  └─────────────┘
```

### Documentation

| Document | Description |
|----------|------------|
| [PROJECT_SHOWCASE.md](PROJECT_SHOWCASE.md) | This comprehensive project documentation |
| [cognisim_ai_backend/PRD.md](cognisim_ai_backend/PRD.md) | Full Product Requirements Document (2000+ lines) |
| [cognisim_ai_backend/README.md](cognisim_ai_backend/README.md) | Backend API documentation with endpoint reference |
| [frontend/README.md](frontend/README.md) | Frontend setup, architecture, and development guide |
| [docs/JIRA_INTEGRATION_COMPLETE.md](docs/JIRA_INTEGRATION_COMPLETE.md) | Jira integration architecture and API reference |
| [docs/GITHUB_ENV_SETUP_GUIDE.md](docs/GITHUB_ENV_SETUP_GUIDE.md) | GitHub App configuration guide |
| [docs/SLACK_APP_SETUP_GUIDE.md](docs/SLACK_APP_SETUP_GUIDE.md) | Slack OAuth integration setup |
| [docs/HUGGINGFACE_QUICKSTART.md](docs/HUGGINGFACE_QUICKSTART.md) | Deployment guide for HF Spaces |

### Database Schema (Core Tables)

```sql
-- Core Entities
users (id, email, full_name, avatar_url, created_at)
workspaces (id, name, slug, owner_id FK, created_at)
workspace_members (workspace_id FK, user_id FK, role, status)
projects (id, name, key, type, status, workspace_id FK, owner_id FK)
issues (id, issue_key, title, status, priority, story_points, 
        project_id FK, sprint_id FK, assignee_id FK, epic_id FK)
sprints (id, name, state, start_date, end_date, project_id FK)
teams (id, name, workspace_id FK)
team_members (team_id FK, user_id FK, role)

-- AI Agent Artifacts
agent_runs (id, user_id FK, team_id, agent_type, status, 
            input JSONB, output JSONB, quality_score, 
            input_tokens, output_tokens, cost_usd_estimate)
agent_run_items (run_id FK, item_index, title, 
                 acceptance_criteria, created_issue_id FK)
prd_documents (id, workspace_id FK, user_id FK, title, status,
               problem_statement, sections JSONB, quality_score)
prd_audit_log (prd_id FK, action, details JSONB, user_id FK)

-- Integration Credentials (AES-256 Encrypted)
integration_credentials (id, user_id FK, provider, 
                         encrypted_access_token, encrypted_refresh_token)
github_installations (id, workspace_id FK, installation_id, account_login)
slack_integrations (id, workspace_id FK, team_id, channel_mappings JSONB)

-- Runtime Configuration
feature_flags (name, is_enabled)
project_activity (id, project_id FK, action, details JSONB)
```

### Key API Endpoints Summary

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Auth** | `/api/profile` | GET | Current user profile |
| **Projects** | `/api/projects` | GET/POST | List & create projects |
| **Issues** | `/api/issues` | GET/POST/PATCH | Issue CRUD + reorder |
| **Epic Decomposer** | `/api/agents/epic/decompose` | POST | Generate stories from epic |
| **Epic Decomposer** | `/api/agents/epic/decompose/stream` | POST | SSE streaming decomposition |
| **Agent Runs** | `/api/agents/runs` | GET | List agent run history |
| **Team Quota** | `/api/agents/team_quota` | GET | Daily AI usage quota |
| **PRD Generate** | `/api/prd/generate/stream` | POST | SSE streaming PRD generation |
| **PRD CRUD** | `/api/prd/{id}` | GET/PATCH/DELETE | PRD management |
| **PRD Sections** | `/api/prd/{id}/sections/{section}/regenerate` | POST | Regenerate individual section |
| **PRD Approve** | `/api/prd/{id}/approve` | POST | Mark PRD as approved |
| **Workspaces** | `/api/workspaces` | GET/POST | Workspace management |
| **Members** | `/api/workspaces/{id}/members/invite` | POST | Email + token invitations |
| **Jira OAuth** | `/api/jira/oauth/init` | GET | Start Jira OAuth flow |
| **Jira Sync** | `/api/jira/sync/{id}/project` | POST | Sync Jira project |
| **Jira Webhook** | `/api/jira/sync/webhook/receive` | POST | Jira webhook receiver |
| **GitHub Status** | `/api/workspaces/{id}/github/status` | GET | GitHub App connection |
| **GitHub Webhook** | `/api/github/webhooks` | POST | GitHub event handler |
| **Slack OAuth** | `/api/slack/oauth/init` | GET | Start Slack OAuth flow |

---

> **Built by:** CogniSim AI Team | **Stack:** React 19 + FastAPI + Gemini + Supabase | **LOC:** ~74,000
