# Complete Slack App Setup Guide
## Official Documentation-Based Tutorial

**Reference:** https://api.slack.com/authentication/oauth-v2

---

## Prerequisites

✅ You must have a Slack workspace (free or paid)
✅ You must be an admin or have permission to install apps
✅ Migrations applied to Supabase (`sprint4_slack_integration.sql` and `sprint4_phase2_oauth_states.sql`)

---

## Part 1: Create Your Slack App

### Step 1: Go to Slack API Portal

🔗 **URL:** https://api.slack.com/apps

Click **"Create New App"**

![Create App Button](https://a.slack-edge.com/80588/img/api/app-create-button.png)

---

### Step 2: Choose Creation Method

You'll see two options:

1. **"From scratch"** ← Choose this one ✅
2. "From an app manifest"

Click **"From scratch"**

**Why?** We'll configure the app step-by-step to understand each setting.

---

### Step 3: Name Your App

**App Name:** `CogniSim AI` (or your preferred name)

**Pick a workspace to develop your app in:** Select your Slack workspace from dropdown

Click **"Create App"**

✅ Your app is now created! You'll be redirected to the app settings page.

---

## Part 2: Configure OAuth & Permissions

### Step 4: Add Redirect URL

In the left sidebar, click **"OAuth & Permissions"**

Scroll to the section: **"Redirect URLs"**

Click **"Add New Redirect URL"**

**Enter this URL exactly:**
```
http://localhost:8000/api/slack/oauth/callback
```

Click **"Add"**

Click **"Save URLs"**

✅ Redirect URL added!

**Why this matters:** This tells Slack where to send users after they authorize your app.

**For Production:** Later, add your production URL like:
```
https://api.yourdomain.com/api/slack/oauth/callback
```

---

### Step 5: Add Bot Token Scopes

Still on the **"OAuth & Permissions"** page, scroll down to **"Scopes"**

Under the section **"Bot Token Scopes"**, click **"Add an OAuth Scope"**

Add these scopes one by one:

#### Required Scopes:

| Scope | Description | Why We Need It |
|-------|-------------|----------------|
| `channels:read` | View basic information about public channels | List channels for team selection |
| `chat:write` | Send messages as @CogniSim AI | Send notifications to channels |
| `users:read` | View people in a workspace | List workspace members |
| `team:read` | View workspace name and details | Get workspace info |

#### Recommended Scopes:

| Scope | Description | Why We Need It |
|-------|-------------|----------------|
| `channels:history` | View messages in public channels | Read channel history (future feature) |
| `groups:read` | View basic info about private channels | List private channels |
| `im:read` | View basic info about direct messages | Enable DM support (future) |
| `mpim:read` | View basic info about group DMs | Enable group DM support (future) |

**How to add:**
1. Click "Add an OAuth Scope"
2. Search for scope name (e.g., "channels:read")
3. Click on it
4. Repeat for all scopes

✅ All scopes added!

**Official Docs:** https://api.slack.com/scopes

---

### Step 6: Get Your OAuth Credentials

In the left sidebar, click **"Basic Information"**

Scroll to the section: **"App Credentials"**

You'll see:
- **Client ID:** `123456789.123456789` (your actual ID will be different)
- **Client Secret:** `••••••••••••••••••••` (hidden by default)

**Actions:**

1. **Copy Client ID**
   - Click the "Copy" button next to Client ID
   - Save it somewhere safe

2. **Copy Client Secret**
   - Click **"Show"** next to Client Secret
   - Click the "Copy" button
   - Save it somewhere safe (keep it secret!)

⚠️ **IMPORTANT:** Never commit Client Secret to Git! Keep it in `.env` only.

---

## Part 3: Configure Your Backend

### Step 7: Update `.env` File

Open your `.env` file in `cognisim_ai_backend/` folder

Add these lines (replace with your actual values):

```env
# Slack OAuth Configuration
SLACK_CLIENT_ID=123456789.123456789
SLACK_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr
SLACK_REDIRECT_URI=http://localhost:8000/api/slack/oauth/callback
```

**Example with real values:**
```env
SLACK_CLIENT_ID=1234567890.9876543210
SLACK_CLIENT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
SLACK_REDIRECT_URI=http://localhost:8000/api/slack/oauth/callback
```

Save the file.

---

### Step 8: Restart Backend

Stop your backend (Ctrl+C) and restart:

```powershell
cd cognisim_ai_backend
.venv\Scripts\activate
python run_server.py
```

✅ Backend should start without errors

**Check logs for:**
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://localhost:8000 (Press CTRL+C to quit)
```

**If you see warnings about Slack OAuth not configured:**
- Check your `.env` file has the correct variable names
- Ensure no extra spaces around `=`
- Restart backend again

---

## Part 4: Test OAuth Flow

### Step 9: Get Your Workspace ID

**Option A: From Supabase Dashboard**

1. Go to Supabase Dashboard → Table Editor
2. Open `workspaces` table
3. Find your workspace
4. Copy the `id` column value (UUID format)

**Option B: Via API**

Visit: http://localhost:8000/docs

1. Expand `GET /api/profile`
2. Click "Try it out"
3. Click "Execute"
4. Your response will show your workspaces
5. Copy a workspace ID

Example workspace ID: `a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6`

---

### Step 10: Initiate OAuth Flow

**Go to Swagger UI:** http://localhost:8000/docs

**Find endpoint:** `GET /api/workspaces/{workspace_id}/slack/oauth/init`

**Steps:**

1. Click to expand the endpoint
2. Click **"Try it out"**
3. **workspace_id:** Paste your workspace ID
4. Click **"Execute"**

**Expected Response (200):**
```json
{
  "authorization_url": "https://slack.com/oauth/v2/authorize?client_id=123...&scope=channels:read,chat:write,...&state=random_token_here&redirect_uri=http://localhost:8000/api/slack/oauth/callback",
  "state": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop",
  "expires_at": "2025-10-04T12:10:00.000Z"
}
```

**If you get errors:**

| Error | Solution |
|-------|----------|
| `404 Not Found` | Check workspace_id is correct |
| `403 Forbidden` | You need to be workspace admin |
| `500 Internal Server Error` | Check backend logs, verify .env config |
| `Slack OAuth configuration missing` | .env file not loaded, restart backend |

---

### Step 11: Authorize App on Slack

**Copy the `authorization_url` from the response**

**Paste it in your browser and press Enter**

You'll be redirected to Slack:

**You'll see a page like:**
```
┌────────────────────────────────────────────┐
│  CogniSim AI is requesting permission     │
│  to access the Your Workspace workspace   │
│                                            │
│  This app would like to:                  │
│  • View basic information about public    │
│    channels in a workspace                │
│  • Send messages as @CogniSim AI          │
│  • View people in a workspace             │
│  • View the workspace's name, domain,     │
│    and icon                                │
│  • (... other scopes ...)                 │
│                                            │
│  [Allow]                    [Cancel]      │
└────────────────────────────────────────────┘
```

**Click "Allow"** ✅

---

### Step 12: Callback & Integration Creation (Automatic)

After clicking "Allow", Slack will redirect you to:

```
http://localhost:8000/api/slack/oauth/callback?code=...&state=...
```

**What happens automatically:**

1. ✅ Backend validates the `state` parameter (CSRF protection)
2. ✅ Backend exchanges `code` for access tokens
3. ✅ Slack returns bot token + workspace info
4. ✅ Backend encrypts tokens
5. ✅ Backend saves integration to database
6. ✅ You're redirected to frontend

**You'll be redirected to:**
```
http://localhost:8080/dashboard/integrations?slack_success=true
```

**If frontend page doesn't exist yet, you'll see a 404 - that's OK!** ✅

**The integration was still created successfully in the database.**

---

### Step 13: Verify Integration Created

**Go back to Swagger UI:** http://localhost:8000/docs

**Find endpoint:** `GET /api/workspaces/{workspace_id}/slack`

**Steps:**

1. Click to expand
2. Click "Try it out"
3. **workspace_id:** Same ID as before
4. Click "Execute"

**Expected Response (200):**
```json
{
  "id": "uuid-of-integration",
  "workspace_id": "your-workspace-id",
  "slack_workspace_id": "T01234ABCDE",
  "slack_workspace_name": "Your Workspace Name",
  "slack_team_id": "T01234ABCDE",
  "bot_user_id": "U0123ZABCDE",
  "bot_token": "***ENCRYPTED***",
  "default_channel_id": null,
  "default_channel_name": null,
  "notifications_enabled": true,
  "slash_commands_enabled": false,
  "webhook_url": null,
  "scopes": [
    "channels:read",
    "chat:write",
    "users:read",
    "team:read",
    "channels:history",
    "groups:read",
    "im:read",
    "mpim:read"
  ],
  "installed_by": "your-user-id",
  "is_active": true,
  "last_sync_at": "2025-10-04T12:00:00.000Z",
  "created_at": "2025-10-04T12:00:00.000Z",
  "updated_at": "2025-10-04T12:00:00.000Z"
}
```

✅ **Success!** Your Slack integration is active!

---

### Step 14: Test Connection

**Find endpoint:** `POST /api/workspaces/{workspace_id}/slack/test`

**Steps:**

1. Click to expand
2. Click "Try it out"
3. **workspace_id:** Same ID
4. Click "Execute"

**Expected Response (200):**
```json
{
  "is_connected": true,
  "workspace_id": "your-workspace-id",
  "notifications_enabled": true,
  "slash_commands_enabled": false
}
```

✅ **Connection test successful!**

---

### Step 15: List Slack Channels

**Find endpoint:** `GET /api/workspaces/{workspace_id}/slack/channels`

**Steps:**

1. Click to expand
2. Click "Try it out"
3. **workspace_id:** Same ID
4. Click "Execute"

**Expected Response (200):**
```json
[
  {
    "id": "C01234ABCDE",
    "name": "general",
    "is_channel": true,
    "is_private": false,
    "is_archived": false,
    "num_members": 5
  },
  {
    "id": "C56789FGHIJ",
    "name": "random",
    "is_channel": true,
    "is_private": false,
    "is_archived": false,
    "num_members": 5
  }
]
```

✅ **Successfully fetched channels from Slack!**

---

### Step 16: Configure Team Channel (Optional)

If you have teams set up, you can configure which Slack channel each team uses.

**Get a team ID from your database:**
1. Go to Supabase → `teams` table
2. Copy a team `id`

**Find endpoint:** `PATCH /api/teams/{team_id}/slack/config`

**Request Body:**
```json
{
  "channel_id": "C01234ABCDE",
  "channel_name": "#general",
  "notifications_enabled": true,
  "mention_team_on_critical": true
}
```

Click "Execute"

✅ Team channel configured!

---

### Step 17: Send Test Notification

**Find endpoint:** `POST /api/teams/{team_id}/slack/notify`

**Request Body:**
```json
{
  "channel_id": "C01234ABCDE",
  "message": "🚀 Hello from CogniSim AI! This is a test notification.",
  "username": "CogniSim Bot",
  "icon_emoji": ":rocket:"
}
```

Click "Execute"

**Expected Response (200):**
```json
{
  "success": true,
  "message_ts": "1696424400.123456",
  "channel_id": "C01234ABCDE",
  "error": null
}
```

**Check your Slack workspace!** You should see the message appear in the channel! 🎉

---

## Part 5: Troubleshooting

### Issue: "Invalid client_id"

**Solution:**
- Check `SLACK_CLIENT_ID` in `.env` matches exactly from Slack app settings
- No extra spaces or quotes
- Restart backend after changing `.env`

---

### Issue: "Invalid state parameter"

**Solution:**
- State expired (10 minutes max)
- Generate new authorization URL
- Complete OAuth flow within 10 minutes

---

### Issue: "Token exchange failed"

**Solutions:**
- Check `SLACK_CLIENT_SECRET` is correct
- Check redirect URI in `.env` matches Slack app settings exactly:
  - Slack App: `http://localhost:8000/api/slack/oauth/callback`
  - .env: `SLACK_REDIRECT_URI=http://localhost:8000/api/slack/oauth/callback`
- Check backend logs for detailed error

---

### Issue: "missing_scope" error

**Solution:**
- Go to Slack App → OAuth & Permissions
- Add the missing scope
- **Important:** Reinstall the app to workspace:
  1. Go to "Install App" in sidebar
  2. Click "Reinstall to Workspace"
  3. Authorize again

---

### Issue: Message not appearing in Slack

**Solutions:**
- Check bot is in the channel:
  1. Go to Slack channel
  2. Type `/invite @CogniSim AI`
  3. Try sending message again
- Check channel ID is correct (use GET /channels endpoint)
- Check integration is active (GET /workspaces/{id}/slack)

---

### Issue: Backend errors on startup

**Check backend logs for:**

```
ValueError: Slack OAuth configuration missing
```

**Solution:** Add Slack OAuth vars to `.env` and restart

---

## Part 6: Enable Events, Commands & Interactivity

These features power real-time event listening, the `/cognisim` slash command, and interactive buttons/modals in Slack messages.

> **Important:** For local development, you need a public URL. Use [ngrok](https://ngrok.com/) to tunnel your local server:
> ```bash
> ngrok http 8000
> ```
> Copy the `https://xxxx.ngrok-free.app` URL — you'll use it below.

### Step 16: Add Signing Secret to `.env`

1. Go to Slack App → **"Basic Information"**
2. Under **"App Credentials"**, find **Signing Secret**
3. Click **"Show"** and copy it
4. Add to your `.env`:

```env
SLACK_SIGNING_SECRET=your_signing_secret_here
```

This is used to verify that incoming webhooks/events actually come from Slack (HMAC-SHA256 signature verification).

---

### Step 17: Enable Event Subscriptions

1. Go to Slack App → **"Event Subscriptions"**
2. Toggle **"Enable Events"** to ON
3. **Request URL:** Enter `https://YOUR_DOMAIN/api/slack/events`
   - For local dev: `https://xxxx.ngrok-free.app/api/slack/events`
   - Slack will send a challenge request — your backend handles it automatically
4. Under **"Subscribe to bot events"**, click **"Add Bot User Event"** and add:

| Event | Description |
|-------|-------------|
| `app_mention` | When someone @mentions your bot |
| `message.channels` | Messages in public channels the bot is in |
| `channel_created` | When a new channel is created |
| `member_joined_channel` | When someone joins a channel |
| `reaction_added` | When a reaction is added to a message |

5. Click **"Save Changes"**

---

### Step 18: Create Slash Command

1. Go to Slack App → **"Slash Commands"**
2. Click **"Create New Command"**
3. Fill in:

| Field | Value |
|-------|-------|
| Command | `/cognisim` |
| Request URL | `https://YOUR_DOMAIN/api/slack/commands` |
| Short Description | `CogniSim AI project assistant` |
| Usage Hint | `[help\|status\|projects\|stories <project>]` |

4. Click **"Save"**

**Available subcommands:**
- `/cognisim help` — Shows command reference
- `/cognisim status` — Workspace stats (projects, issues, members)
- `/cognisim projects` — Lists recent projects
- `/cognisim stories <project>` — Lists recent stories for a project

---

### Step 19: Enable Interactivity

1. Go to Slack App → **"Interactivity & Shortcuts"**
2. Toggle **"Interactivity"** to ON
3. **Request URL:** `https://YOUR_DOMAIN/api/slack/interactive`
4. Click **"Save Changes"**

This enables:
- Button clicks in notification messages (View PRD, Approve, Reject)
- Modal submissions (Create PRD from Slack)
- Message shortcuts

---

### Step 20: Add Additional Bot Scopes

With events and commands enabled, add these scopes (in addition to the original ones):

Go to **"OAuth & Permissions"** → **"Bot Token Scopes"** → Add:

| Scope | Needed For |
|-------|------------|
| `commands` | Slash commands |
| `app_mentions:read` | Listening to @mentions |
| `channels:history` | Reading channel message history |
| `reactions:read` | Reading reactions |
| `chat:write` | Sending messages / notifications |

After adding scopes, you need to **reinstall the app** to your workspace:
1. Go to **"Install App"** in the sidebar
2. Click **"Reinstall to Workspace"**
3. Click **"Allow"**

---

### Step 21: Run Database Migration

Apply the notifications table migration:

```sql
-- Run in your Supabase SQL Editor or via CLI:
-- File: supabase/migrations/20260224T000000_create_notifications_table.sql
```

This creates the `notifications` table used by the in-app notification centre.

---

## Part 7: Test the Full Integration

### Test 1: Verify Backend Starts

```bash
cd cognisim_ai_backend
python run_server.py
```

Check the logs for:
```
INFO: NotificationService initialised – handlers registered
```

### Test 2: OAuth Flow (Frontend)

1. Start both frontend and backend
2. Go to **Dashboard → Integrations**
3. Click **Connect** on the Slack card
4. Authorize the app on Slack
5. You should be redirected back with a success toast
6. The Slack card should show "Connected" with workspace info

### Test 3: Slash Command

In Slack, type:
```
/cognisim help
```
You should see a rich Block Kit response with available commands.

### Test 4: Event Subscription

In a channel where the bot is invited, type:
```
@CogniSim AI status
```
The bot should reply with workspace statistics.

### Test 5: Notifications

1. Go to **Dashboard → Integrations → Slack → Settings**
2. Under **Notifications** tab, enter a test message
3. Select a channel and click **Send Test**
4. Check the Slack channel for the message

### Test 6: In-App Notifications

1. Generate a PRD (this triggers `PRD_COMPLETED` event)
2. Go to **Dashboard → Notifications**
3. You should see a new "PRD Generated" notification

### Test 7: Interactive Buttons

When a PRD completion notification is sent to Slack, it includes buttons:
- **View** — Shows PRD summary as an ephemeral message
- **Approve** / **Reject** — Updates PRD status

---

## Part 8: Verification Checklist (Updated)

**Slack App Configuration:**
- [ ] Slack app created on api.slack.com
- [ ] OAuth redirect URL added (`http://localhost:8000/api/slack/oauth/callback`)
- [ ] Bot scopes added (see table below)
- [ ] Client ID, Client Secret, and Signing Secret copied
- [ ] Event Subscriptions enabled with Request URL
- [ ] Slash Command `/cognisim` created
- [ ] Interactivity enabled with Request URL

**Environment Variables (`.env`):**
- [ ] `SLACK_CLIENT_ID` set
- [ ] `SLACK_CLIENT_SECRET` set
- [ ] `SLACK_REDIRECT_URI` set
- [ ] `SLACK_SIGNING_SECRET` set

**Backend:**
- [ ] Backend starts without errors
- [ ] `NotificationService initialised` log appears
- [ ] Notifications DB migration applied

**Testing:**
- [ ] OAuth flow works (connect from frontend)
- [ ] Integration shows as connected in dashboard
- [ ] Connection test passes (`POST /slack/test`)
- [ ] Channels listed (`GET /slack/channels`)
- [ ] `/cognisim help` works in Slack
- [ ] `@CogniSim AI status` works in Slack
- [ ] Test notification sent from Settings page
- [ ] In-app notifications appear after PRD generation
- [ ] Interactive buttons in Slack work (View/Approve/Reject)

---

## Quick Reference Card

### Slack App URLs

| Purpose | URL |
|---------|-----|
| Manage Apps | https://api.slack.com/apps |
| Your App Settings | https://api.slack.com/apps/YOUR_APP_ID |
| OAuth Scopes Docs | https://api.slack.com/scopes |
| OAuth Guide | https://api.slack.com/authentication/oauth-v2 |
| API Methods | https://api.slack.com/methods |

### Backend API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/workspaces/{id}/slack/oauth/init` | GET | Start OAuth flow |
| `/api/slack/oauth/callback` | GET | OAuth callback (automatic) |
| `/api/workspaces/{id}/slack` | GET | Get integration details |
| `/api/workspaces/{id}/slack/test` | POST | Test connection |
| `/api/workspaces/{id}/slack/channels` | GET | List channels |
| `/api/teams/{id}/slack/config` | PATCH | Configure team channel |
| `/api/teams/{id}/slack/notify` | POST | Send notification |
| `/api/slack/events` | POST | Slack Events API (webhook) |
| `/api/slack/commands` | POST | Slash command handler |
| `/api/slack/interactive` | POST | Interactive component handler |
| `/api/notifications` | GET | List in-app notifications |
| `/api/notifications/unread-count` | GET | Unread badge counter |
| `/api/notifications/{id}/read` | PATCH | Mark notification as read |
| `/api/notifications/read-all` | POST | Mark all as read |
| `/api/notifications/{id}` | DELETE | Delete a notification |

### Environment Variables

```env
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_REDIRECT_URI=http://localhost:8000/api/slack/oauth/callback
SLACK_SIGNING_SECRET=your_signing_secret_here
```

---

## Support & Resources

**Official Slack Documentation:**
- 📘 OAuth Guide: https://api.slack.com/authentication/oauth-v2
- 📘 Scopes: https://api.slack.com/scopes
- 📘 API Methods: https://api.slack.com/methods
- 📘 Block Kit Builder: https://app.slack.com/block-kit-builder

**Community:**
- Slack Community: https://slackcommunity.com
- Stack Overflow: https://stackoverflow.com/questions/tagged/slack-api

---

**Status:** 🎉 **Setup Complete!**

Your Slack integration is now fully functional. You can:
- ✅ Connect workspaces via OAuth
- ✅ List channels
- ✅ Send notifications
- ✅ Configure team channels

**Next Steps:**
- Implement webhook handlers (Phase 3)
- Build frontend UI (Phase 4)
- Add more notification features
