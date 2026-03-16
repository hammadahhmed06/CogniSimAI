# CogniSim AI — Frontend Setup Guide

Complete setup and development reference for the React frontend application.

---

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| **Node.js** | 18+ | `node -v` |
| **npm** | 9+ | `npm -v` |
| **Git** | Any | `git --version` |

You also need a **Supabase project** — create one at [supabase.com](https://supabase.com) (free tier is fine).

---

## Installation

```bash
# From the repository root
cd frontend

# Install all dependencies
npm install
```

---

## Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# Required — Supabase connection
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional — Override backend API URL (defaults to http://localhost:8000 via Vite proxy)
VITE_API_URL=http://localhost:8000
```

**Where to find these values:**
1. Go to your Supabase project → **Settings** → **API**
2. Copy the **Project URL** → `VITE_SUPABASE_URL`
3. Copy the **anon / public** key → `VITE_SUPABASE_ANON_KEY`

---

## Development Server

```bash
npm run dev
```

The app starts at **http://localhost:8080** with:
- **Hot Module Replacement (HMR)** via SWC compiler (sub-second updates)
- **API Proxy** — all `/api/*` requests are proxied to `VITE_API_URL` (default `http://localhost:8000`) to avoid CORS in development
- **Component Tagger** — lovable-tagger enabled in dev mode for debugging

> The backend must be running at `http://localhost:8000` for API features to work. See [cognisim_ai_backend/README.md](../cognisim_ai_backend/README.md).

---

## All npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 8080 with HMR |
| `npm run build` | Production build (TypeScript check + Vite build + ESBuild minification) |
| `npm run build:dev` | Development build (no minification, source maps) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint with react-hooks and react-refresh rules |
| `npm run test` | Run Vitest test suite (single run) |
| `npm run test:watch` | Run Vitest in watch mode |

---

## Project Structure

```
frontend/
├── index.html                      # SPA entry point
├── vite.config.ts                  # Vite config (proxy, SWC, code splitting)
├── tailwind.config.ts              # Tailwind theme (CogniSim brand colors)
├── tsconfig.json                   # TypeScript strict mode, path aliases
├── package.json                    # Dependencies and scripts
│
├── public/                         # Static assets (robots.txt, sitemap)
│
└── src/
    ├── main.tsx                    # React root + providers
    ├── App.tsx                     # Route definitions (51 routes)
    │
    ├── pages/                      # 51 page components (all lazy-loaded)
    │   ├── Dashboard.tsx           # Main dashboard with KPIs and widgets
    │   ├── EpicDecomposer.tsx      # AI epic decomposition interface
    │   ├── PRDGenerator.tsx        # PRD generation wizard
    │   ├── PRDList.tsx             # PRD management list
    │   ├── ProjectBoard.tsx        # Kanban board (drag-and-drop)
    │   ├── ProjectBacklog.tsx      # Sprint backlog management
    │   ├── ProjectReports.tsx      # Analytics and charts
    │   ├── DashboardIntegrations.tsx # Jira/Slack/GitHub setup
    │   ├── JiraSettings.tsx        # Jira OAuth and sync config
    │   ├── Workspaces.tsx          # Multi-workspace management
    │   └── ...                     # 41 more pages
    │
    ├── components/                 # 70+ reusable components
    │   ├── prd/                    # 15 PRD components (input, progress, review, export, editor)
    │   ├── dashboard/              # 7 dashboard widgets (insights, activity, quick actions)
    │   ├── agent/                  # Agent UI (quality badges, metrics, duplicate warnings)
    │   ├── issues/                 # Issue management (create dialog, board card, assignee picker)
    │   ├── layout/                 # Layouts (DashboardLayout, ProjectPageLayout, Navbar)
    │   └── ui/                     # 48 shadcn/ui Radix primitives (dialog, table, form, etc.)
    │
    ├── contexts/                   # React Context providers
    │   ├── AuthContext.tsx          # Supabase auth state + signOut
    │   ├── WorkspaceContext.tsx     # Multi-workspace with localStorage persistence
    │   └── ProjectContext.tsx       # URL-derived project data with React Query
    │
    ├── hooks/                      # 8 custom hooks
    │   ├── useAuth.ts              # Auth context consumer
    │   ├── useTeam.ts              # Team context consumer
    │   ├── useBulkOperations.ts    # Bulk operation state tracking
    │   ├── useSyncStatus.ts        # Jira sync polling + WebSocket
    │   └── use-mobile.tsx          # Responsive breakpoint detection
    │
    ├── lib/
    │   ├── api/                    # 20 API service modules
    │   │   ├── client.ts           # Fetch wrapper (auth token + workspace/team headers)
    │   │   ├── projectService.ts   # /api/projects endpoints
    │   │   ├── issuesService.ts    # /api/issues endpoints
    │   │   ├── prdService.ts       # /api/prd endpoints (SSE streaming)
    │   │   ├── agentService.ts     # /api/agents endpoints (SSE streaming)
    │   │   ├── jiraService.ts      # /api/jira endpoints (OAuth, sync, search)
    │   │   ├── slackService.ts     # /api/slack endpoints
    │   │   ├── githubService.ts    # /api/github endpoints
    │   │   ├── workspaceService.ts # /api/workspaces endpoints
    │   │   ├── teamService.ts      # /api/teams endpoints
    │   │   └── ...                 # 10 more service modules
    │   ├── supabase/
    │   │   ├── client.ts           # Supabase JS init (PKCE auth flow)
    │   │   └── auth.ts             # signUp, signIn, signOut, resetPassword
    │   └── utils.ts                # cn() — clsx + tailwind-merge helper
    │
    ├── constants/                  # issueStatus.ts, chartColors.ts
    └── data/                       # blogPosts.ts (static content)
```

---

## Routing Architecture

All 51 pages are **lazy-loaded** with `React.lazy()` + `Suspense` for code-splitting. The context hierarchy wraps all routes:

```
QueryClientProvider (React Query)
  └── AuthProvider (Supabase session)
       └── WorkspaceProvider (multi-workspace + localStorage)
            └── TeamProvider (team switching)
                 └── Routes
```

**Public routes:** `/`, `/features`, `/pricing`, `/auth/login`, `/auth/signup`, etc.

**Protected routes (require authentication):**
- `/dashboard` — Main hub
- `/dashboard/projects/:projectId/board` — Kanban
- `/dashboard/projects/:projectId/backlog` — Sprint backlog
- `/dashboard/agents/epic-decomposer` — AI epic decomposer
- `/dashboard/agents/prd-generator` — AI PRD generator
- `/dashboard/prds` — PRD list
- `/dashboard/integrations` — Jira/Slack/GitHub
- `/dashboard/workspaces` — Workspace management
- `/account-settings`, `/notifications`, `/subscription`

---

## State Management

| Concern | Solution | Persistence |
|---------|----------|-------------|
| **Auth state** | `AuthContext` (Supabase `onAuthStateChange`) | Session cookies |
| **Workspace** | `WorkspaceContext` + React Query | `localStorage.activeWorkspaceId` |
| **Team** | `TeamProvider` + React Query | `localStorage.currentTeamId` |
| **Project data** | `ProjectContext` (URL-derived) + React Query | Server cache |
| **Server state** | React Query v5 (TanStack) | In-memory cache with stale-while-revalidate |
| **Forms** | React Hook Form + Zod schemas | Component state |

---

## API Communication

All API calls go through `src/lib/api/client.ts` which:
1. Automatically injects `Authorization: Bearer {token}` from Supabase session
2. Adds `X-Workspace-Id` and `X-Team-Id` headers from context
3. Handles 401 responses with automatic token refresh
4. Emits `authFailure` events for session expiry

**SSE Streaming** (for AI endpoints):
- `prdService.ts` and `agentService.ts` consume SSE via `EventSource`
- Progress events update UI progressively (section-by-section rendering)

---

## UI Component Library

48 **shadcn/ui** components (Radix UI primitives) in `src/components/ui/`:

`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`, `toggle-group`, `tooltip`

---

## Build & Production

```bash
# Production build
npm run build

# Output → dist/ folder
# Deploy dist/ to any static hosting (Vercel, Netlify, Cloudflare Pages)
```

**Build optimizations configured in vite.config.ts:**
- **Manual chunk splitting**: vendor (react/react-dom), router (react-router-dom), auth (@supabase/supabase-js)
- **ESBuild minification** with tree-shaking
- **Asset hashing**: `[name]-[hash].[ext]`
- **Source maps**: dev mode only
- **Target**: `esnext`

---

## Deployment to Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Set framework preset to **Vite**
4. Set root directory to `frontend`
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` → your deployed backend URL
6. Deploy — Vercel auto-builds on every push

---

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2.1 | UI framework |
| typescript | 5.9.2 | Type safety |
| vite | 5.4.1 | Build tool + dev server |
| tailwindcss | 3.4.11 | Utility-first CSS |
| @tanstack/react-query | 5.56.2 | Server state management |
| @tanstack/react-table | 8.21.3 | Data tables |
| react-router-dom | 6.26.2 | Client routing |
| @supabase/supabase-js | 2.53.0 | Auth + database client |
| react-hook-form | 7.53.0 | Form state management |
| zod | 3.25.76 | Schema validation |
| recharts | 2.15.4 | Charts and analytics |
| @dnd-kit/core | 6.3.1 | Drag-and-drop |
| framer-motion | 12.6.2 | Animations |
| lucide-react | 0.462.0 | 460+ icons |
| sonner | 1.7.4 | Toast notifications |
| cmdk | 1.0.4 | Command palette |
| date-fns | 3.6.0 | Date utilities |
