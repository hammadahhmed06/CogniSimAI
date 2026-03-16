# GitHub Integration `.env` Setup Guide

This guide explains exactly how to obtain and configure the environment variables required for the GitHub App integration in CogniSim AI.

## 1) Prerequisites

- A GitHub account with permission to create/install a GitHub App
- Running backend (`cognisim_ai_backend`) and frontend (`frontend`)
- Publicly reachable backend URL for production webhooks/callbacks

---

## 2) Create the GitHub App

1. Go to **GitHub → Settings → Developer settings → GitHub Apps**.
2. Click **New GitHub App**.
3. Fill in these fields exactly:

### Basic Information
| Field | Value |
|-------|-------|
| **GitHub App name** | `cognisim-ai` |
| **Description** | `CogniSim AI` |
| **Homepage URL** | `http://localhost:8080` |

### Identifying and authorizing users
| Field | Value |
|-------|-------|
| **Callback URL** | _(leave blank for local dev)_ |
| **Expire user authorization tokens** | ✅ Checked |
| **Request user authorization (OAuth) during installation** | ❌ Unchecked |
| **Enable Device Flow** | ❌ Unchecked |

### Post installation
| Field | Value |
|-------|-------|
| **Setup URL** | `http://localhost:8000/api/github/app/setup/callback` |
| **Redirect on update** | ❌ Unchecked |

### Webhook
| Field | Value |
|-------|-------|
| **Active** | ✅ Checked |
| **Webhook URL** | `http://localhost:8000/api/github/webhooks` (local dev — use ngrok URL or smee.io proxy for real webhook delivery) |
| **Webhook secret** | Paste: `LXQKycUDTBz0Yb8V4ciAjbE/2ZCRclhBxniKON1v+OQ=` (same value goes in `.env`) |

### Repository Permissions
| Permission | Access |
|-----------|--------|
| **Issues** | Read & write |
| **Metadata** | Read-only |
| **Projects** | **Read & write** (required for Projects v2 bidirectional sync — add items, update fields, delete items) |

### Organization Permissions
| Permission | Access |
|-----------|--------|
| **Projects** | **Read & write** (required for org-level Projects v2) |

### Subscribe to events
| Event | Required for |
|-------|-------------|
| ✅ **Issues** | Bidirectional issue sync |
| ✅ **Projects v2 item** | Bidirectional project field sync |

### Installation target
| Option | Value |
|--------|-------|
| **Only on this account** | ✅ Selected (for local dev) |

4. Click **Create GitHub App**.

> **⚠️ Local webhook delivery**: GitHub cannot reach `localhost`. For local development, use [smee.io](https://smee.io) or [ngrok](https://ngrok.com) to proxy webhook events. Alternatively, rely on manual sync via the UI — webhooks are only needed for real-time push from GitHub.

---

## 3) Get values for backend `.env`

After creating the app, you'll land on the app's settings page. Collect these values:

| Where to find it | `.env` variable |
|-----------------|----------------|
| App settings page → **App ID** (numeric, near the top) | `GITHUB_APP_ID` |
| URL slug — the app URL is `github.com/apps/<slug>` | `GITHUB_APP_SLUG` |
| App settings → **Private keys** → click **Generate a private key** → downloads a `.pem` file | `GITHUB_APP_PRIVATE_KEY_PEM` |
| The secret you entered in webhook config | `GITHUB_WEBHOOK_SECRET` |

`FRONTEND_URL` is already set to `http://localhost:8080` in your `.env`.

### Required backend env keys

Add these to `cognisim_ai_backend/.env`:

```env
# GitHub App (required)
GITHUB_APP_ID=<paste numeric App ID here>
GITHUB_APP_SLUG=cognisim-ai
GITHUB_APP_PRIVATE_KEY_PEM="-----BEGIN RSA PRIVATE KEY-----\nMIIE...paste full key with \n line breaks...\n-----END RSA PRIVATE KEY-----\n"
GITHUB_WEBHOOK_SECRET=LXQKycUDTBz0Yb8V4ciAjbE/2ZCRclhBxniKON1v+OQ=
```

### Optional backend env keys (defaults are GitHub.com)

```env
GITHUB_API_BASE_URL=https://api.github.com
GITHUB_GRAPHQL_URL=https://api.github.com/graphql
GITHUB_WEB_BASE_URL=https://github.com
```

---

## 4) Private key formatting notes

`GITHUB_APP_PRIVATE_KEY_PEM` can be set in either style:

1. Single-line quoted value with `\n` line breaks (recommended for `.env` files)
2. Multi-line raw PEM if your env loader supports it

If token creation fails, the PEM format is usually the first thing to verify.

---

## 5) Install the app to account/org

1. Open the app install page:
   - `https://github.com/apps/<your-app-slug>/installations/new`
2. Install to your user or organization.
3. Choose repository access (all or selected).

---

## 6) Frontend env requirements

The frontend must be able to call backend APIs.

```env
VITE_API_URL=http://localhost:8000
# Optional if your app uses this key in your environment
VITE_API_BASE_URL=http://localhost:8000
```

---

## 7) Quick verification checklist

- `GET /api/workspaces/{workspace_id}/github/status` returns connected after install
- `GET /api/workspaces/{workspace_id}/github/install-url` returns a valid URL
- GitHub webhook deliveries show HTTP 200 at `/api/github/webhooks`
- Repo refresh works via `/api/workspaces/{workspace_id}/github/repos/refresh`
- Projects v2 discovery works via `GET /api/workspaces/{workspace_id}/github/projects-v2?owner_login=<login>&owner_type=user`
- Project fields endpoint returns field definitions after linking

---

## 8) Security best practices

- Never commit real `.env` secrets to Git
- Rotate `GITHUB_WEBHOOK_SECRET` if leaked
- Regenerate GitHub App private key if compromised
- Restrict app permissions to least privilege
