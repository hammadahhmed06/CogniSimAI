# Slack Integration - Phase 2 Complete ✅
## OAuth Flow Implementation

---

## What Was Implemented

### 1. OAuth State Management Model ✅
**File:** `app/models/slack_models.py`

**Added Models:**
- `SlackOAuthStateRecord` - OAuth state tracking with expiration
- Updated `SlackOAuthInitResponse` - Added `expires_at` field
- Updated `SlackOAuthCallbackRequest` - Made `state` required (not optional)

**Purpose:** Track OAuth state parameters for CSRF protection during the authorization flow.

---

### 2. OAuth State Storage Table ✅
**File:** `migrations/sprint4_phase2_oauth_states.sql`

**Table Created:** `slack_oauth_states`

**Columns:**
- `id` (UUID) - Primary key
- `state` (VARCHAR) - Random CSRF token (unique)
- `workspace_id` (UUID) - Workspace being connected
- `user_id` (UUID) - User initiating OAuth
- `redirect_uri` (TEXT) - Optional post-auth redirect
- `created_at` (TIMESTAMPTZ) - When state was created
- `expires_at` (TIMESTAMPTZ) - Expiration time (10 minutes)
- `is_used` (BOOLEAN) - Whether state was consumed
- `used_at` (TIMESTAMPTZ) - When state was used

**Security Features:**
- ✅ RLS policies (users can only see their own states)
- ✅ Unique constraint on state parameter
- ✅ Expiration validation check
- ✅ Auto-cleanup function for expired states

**Status:** ⚠️ **NOT YET APPLIED** - Run in Supabase SQL Editor

---

### 3. OAuth Service ✅
**File:** `app/services/slack/slack_oauth_service.py`

**Class:** `SlackOAuthService`

**Methods:**

#### `generate_authorization_url(workspace_id, user_id, redirect_after_auth)`
- Generates random state token
- Stores state in database (expires in 10 minutes)
- Builds Slack OAuth authorization URL
- Returns: `(authorization_url, state, expires_at)`

#### `validate_state(state, user_id)`
- Looks up state in database
- Validates: user owns it, not expired, not already used
- Marks state as used (prevents replay attacks)
- Returns: `(is_valid, workspace_id, redirect_uri)`

#### `exchange_code_for_token(code, workspace_id)`
- Exchanges OAuth code for access tokens
- Calls Slack's `oauth.v2.access` API
- Extracts bot token, user token, workspace info
- Encrypts tokens before returning
- Returns: `(success, integration_data, error_message)`

**OAuth Scopes Requested:**
- `channels:read` - List public channels
- `chat:write` - Send messages
- `users:read` - List workspace members
- `channels:history` - Read channel messages
- `groups:read` - List private channels
- `im:read` - List DMs
- `mpim:read` - List group DMs
- `team:read` - Read workspace info

**Status:** ✅ Zero compilation errors

---

### 4. OAuth API Endpoints ✅
**File:** `app/api/routes/slack_integration.py`

#### **GET /api/workspaces/{workspace_id}/slack/oauth/init**
- Initiates OAuth flow
- Generates authorization URL
- Returns: `SlackOAuthInitResponse` with URL and state
- Auth: Workspace admin only
- Query params: `redirect_after_auth` (optional)

**Example Response:**
```json
{
  "authorization_url": "https://slack.com/oauth/v2/authorize?client_id=...&state=...&scope=...",
  "state": "random_csrf_token_here",
  "expires_at": "2025-10-04T12:10:00Z"
}
```

#### **GET /api/slack/oauth/callback**
- Handles OAuth callback from Slack
- Validates state parameter (CSRF protection)
- Exchanges code for tokens
- Creates/updates Slack integration in database
- Redirects to frontend with success/error
- Auth: Requires authenticated user
- Query params: `code`, `state`, `error` (optional)

**Flow:**
1. User clicks "Connect to Slack" button
2. Frontend calls `/oauth/init`
3. Frontend redirects user to returned `authorization_url`
4. User authorizes app on Slack
5. Slack redirects to `/oauth/callback?code=...&state=...`
6. Callback validates state, exchanges code
7. Integration created in database
8. User redirected to frontend with success message

**Status:** ✅ Zero compilation errors

---

### 5. Environment Configuration ✅
**Files:**
- `app/core/config.py` - Added `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI`
- `.env.slack.example` - Complete setup guide with instructions

**Required Environment Variables:**
```env
SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here
SLACK_REDIRECT_URI=http://localhost:8000/api/slack/oauth/callback
```

**How to Get:**
1. Go to https://api.slack.com/apps
2. Create new app "From scratch"
3. Name: "CogniSim AI"
4. Add OAuth redirect URL: `http://localhost:8000/api/slack/oauth/callback`
5. Add bot scopes (see list above)
6. Copy Client ID and Client Secret from "Basic Information"

---

## Architecture Diagram

```
┌──────────────┐
│   Frontend   │
│              │
│  [Connect    │
│   to Slack]  │
└──────┬───────┘
       │ 1. GET /oauth/init
       ▼
┌──────────────────────────────────────┐
│  Backend: SlackOAuthService          │
│                                      │
│  generate_authorization_url()        │
│  - Create random state               │
│  - Store in slack_oauth_states table│
│  - Build Slack OAuth URL             │
└──────┬───────────────────────────────┘
       │ 2. Return authorization_url
       ▼
┌──────────────┐
│   Frontend   │  ────────────┐
│              │              │
│  Redirect    │              │ 3. Redirect user
│  user to     │              │    to Slack
│  Slack       │              │
└──────────────┘              │
                              ▼
                    ┌─────────────────┐
                    │  Slack OAuth    │
                    │                 │
                    │  User authorizes│
                    │  app in their   │
                    │  workspace      │
                    └────────┬────────┘
                             │ 4. Redirect with code
                             ▼
                ┌────────────────────────────────┐
                │  Backend: /oauth/callback      │
                │                                │
                │  1. validate_state()           │
                │     - Check CSRF token         │
                │     - Verify not expired       │
                │     - Mark as used             │
                │                                │
                │  2. exchange_code_for_token()  │
                │     - Call Slack OAuth API     │
                │     - Get bot + user tokens    │
                │     - Encrypt tokens           │
                │                                │
                │  3. Save to database           │
                │     - Insert/update            │
                │       slack_integrations       │
                └────────┬───────────────────────┘
                         │ 5. Redirect to frontend
                         ▼
                ┌──────────────────┐
                │   Frontend       │
                │                  │
                │  Show success    │
                │  "Slack          │
                │   Connected!"    │
                └──────────────────┘
```

---

## Security Features

1. **CSRF Protection**
   - Random state token generated per OAuth flow
   - Stored in database with user + workspace binding
   - Validated on callback
   - Single-use (marked as `is_used` after consumption)

2. **State Expiration**
   - States expire after 10 minutes
   - Database constraint prevents old states from being used
   - Auto-cleanup function removes expired states

3. **Token Encryption**
   - Bot and user tokens encrypted at rest
   - Reuses existing encryption service
   - Never returned to frontend unencrypted

4. **User Authorization**
   - Only workspace admins can initiate OAuth
   - State tied to specific user ID
   - Callback validates current user matches state owner

5. **Database RLS Policies**
   - Users can only see their own OAuth states
   - Workspace members can view integrations
   - Admins can modify integrations

---

## Testing Steps

### 1. Apply Migration

Go to **Supabase Dashboard → SQL Editor**:

```sql
-- Copy entire content of migrations/sprint4_phase2_oauth_states.sql
-- Paste and execute
```

Verify table created:
```sql
SELECT * FROM slack_oauth_states;
```

### 2. Configure Environment Variables

Copy `.env.slack.example` values to main `.env` file:

```env
SLACK_CLIENT_ID=123456789.123456789
SLACK_CLIENT_SECRET=abc123def456...
SLACK_REDIRECT_URI=http://localhost:8000/api/slack/oauth/callback
```

### 3. Create Slack App

**Go to:** https://api.slack.com/apps

**Steps:**
1. Click "Create New App" → "From scratch"
2. App Name: "CogniSim AI"
3. Pick your development workspace
4. Click "Create App"

**Configure OAuth & Permissions:**
1. In sidebar: "OAuth & Permissions"
2. Under "Redirect URLs", click "Add New Redirect URL"
3. Enter: `http://localhost:8000/api/slack/oauth/callback`
4. Click "Add"
5. Click "Save URLs"

**Add Bot Scopes:**
Scroll to "Scopes" → "Bot Token Scopes"

Add these scopes:
- `channels:read`
- `chat:write`
- `users:read`
- `channels:history`
- `groups:read`
- `im:read`
- `mpim:read`
- `team:read`

**Get Credentials:**
1. In sidebar: "Basic Information"
2. Scroll to "App Credentials"
3. Copy "Client ID"
4. Click "Show" on "Client Secret"
5. Copy "Client Secret"
6. Paste into `.env` file

### 4. Restart Backend

```powershell
# Stop backend (Ctrl+C if running)
cd cognisim_ai_backend
.venv\Scripts\activate
python run_server.py
```

Backend should start on: `http://localhost:8000`

### 5. Test OAuth Flow

#### Step 1: Initiate OAuth
**Endpoint:** `GET /api/workspaces/{workspace_id}/slack/oauth/init`

**Headers:**
```
Authorization: Bearer your_jwt_token_here
X-Workspace-Id: your_workspace_id_here
```

**Response:**
```json
{
  "authorization_url": "https://slack.com/oauth/v2/authorize?client_id=123...&state=abc...&scope=...",
  "state": "random_state_token",
  "expires_at": "2025-10-04T12:10:00Z"
}
```

#### Step 2: Authorize on Slack
1. Copy the `authorization_url` from response
2. Open in browser
3. You'll see Slack authorization page
4. Click "Allow" to authorize the app

#### Step 3: Callback (Automatic)
- Slack redirects to `/api/slack/oauth/callback?code=...&state=...`
- Backend validates state
- Backend exchanges code for tokens
- Backend creates integration
- Backend redirects to frontend with success

#### Step 4: Verify Integration Created
**Endpoint:** `GET /api/workspaces/{workspace_id}/slack`

**Expected Response:**
```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "slack_workspace_id": "T0123456789",
  "slack_workspace_name": "Your Workspace",
  "bot_user_id": "U0123456789",
  "is_active": true,
  "scopes": ["channels:read", "chat:write", ...],
  ...
}
```

#### Step 5: Test Connection
**Endpoint:** `POST /api/workspaces/{workspace_id}/slack/test`

**Expected:**
```json
{
  "is_connected": true,
  "workspace_id": "uuid",
  "notifications_enabled": true,
  "slash_commands_enabled": false
}
```

---

## Files Created/Modified

```
cognisim_ai_backend/
├── migrations/
│   ├── sprint4_slack_integration.sql              ← Phase 1
│   └── sprint4_phase2_oauth_states.sql            ← NEW (Phase 2)
├── app/
│   ├── models/
│   │   └── slack_models.py                        ← UPDATED (added OAuth models)
│   ├── core/
│   │   └── config.py                              ← UPDATED (Slack OAuth env vars)
│   ├── services/
│   │   └── slack/
│   │       ├── __init__.py                        ← UPDATED (export OAuth service)
│   │       ├── slack_client.py                    ← Phase 1
│   │       └── slack_oauth_service.py             ← NEW (Phase 2)
│   └── api/
│       └── routes/
│           └── slack_integration.py               ← UPDATED (added OAuth endpoints)
└── .env.slack.example                             ← NEW (setup guide)
```

---

## Verification Checklist

**Phase 1 (Prerequisites):**
- [x] Phase 1 migration applied (`sprint4_slack_integration.sql`)
- [x] Slack SDK installed (`pip install slack-sdk`)
- [x] Backend running on localhost:8000

**Phase 2:**
- [x] OAuth state model created
- [x] OAuth state table migration created
- [x] OAuth service created (3 methods)
- [x] OAuth endpoints created (init + callback)
- [x] Environment variables added to config
- [x] Zero compilation errors
- [ ] Phase 2 migration applied (`sprint4_phase2_oauth_states.sql`)
- [ ] Slack app created on api.slack.com
- [ ] OAuth credentials added to .env
- [ ] Backend restarted with new config
- [ ] OAuth flow tested end-to-end
- [ ] Integration created via OAuth
- [ ] Connection tested

---

## Comparison: Manual vs OAuth

### Before (Phase 1 - Manual Token Entry):
```json
POST /api/workspaces/{id}/slack
{
  "slack_workspace_id": "T0123...",
  "bot_access_token": "xoxb-manually-copied-token",
  "scopes": ["manually", "entered", "list"],
  ...
}
```

### After (Phase 2 - OAuth Flow):
```
1. GET /api/workspaces/{id}/slack/oauth/init
2. User clicks authorization URL
3. User authorizes on Slack
4. Callback creates integration automatically
5. ✅ Done!
```

**Benefits:**
- ✅ No manual token copying
- ✅ Better UX (one-click authorization)
- ✅ Automatic workspace metadata extraction
- ✅ Correct scopes guaranteed
- ✅ CSRF protection built-in
- ✅ Tokens encrypted automatically

---

## What's Next

### Phase 3 (Webhooks - Day 5):
- Webhook endpoint for Slack events
- URL verification challenge handler
- Event type routing (message, channel_created, etc.)
- Slash command handler (`/cognisim`)
- Interactive component handler (buttons, select menus)

### Phase 4 (Frontend - Days 6-7):
- Slack integration settings page
- "Connect to Slack" button (calls `/oauth/init`)
- Team channel selector dropdown
- Send test notification UI
- Webhook event logs viewer
- Integration health status dashboard

---

**Status:** ✅ **Phase 2 Complete - OAuth Flow Ready**

All code written, compiled with zero errors. Just need to:
1. Apply Phase 2 migration
2. Create Slack app
3. Add OAuth credentials to .env
4. Test the flow!
