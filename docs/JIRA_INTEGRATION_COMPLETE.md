# Jira Integration Implementation Guide

## Overview

This document outlines the complete Jira integration architecture implemented for CogniSim AI, including OAuth authentication, bidirectional sync, webhook support, and AI agent integration.

## Architecture Components

### 1. Core Services

#### JiraAPIClient (`app/services/jira/api_client.py`)
Comprehensive Jira Cloud REST API client with methods for:
- **Projects**: List, get details, statuses, metadata
- **Issues**: Search (JQL), CRUD operations, transitions, comments
- **Boards & Sprints**: List boards, get sprints, sprint issues
- **Metadata**: Issue types, priorities, assignable users, create metadata
- **Webhooks**: Create, list, delete webhooks
- **Utilities**: ADF conversion, server info

#### JiraSyncService (`app/services/jira/sync_service.py`)
Bidirectional synchronization service with:
- **Project Sync**: Sync Jira projects to local database
- **Issue Sync**: Incremental sync with JQL filtering
- **Sprint Sync**: Sync sprint and associated issues
- **Push to Jira**: Create/update issues in Jira from local database
- **Batch Operations**: Push multiple AI-generated stories

#### Token Management (`app/services/jira/token_manager.py`)
OAuth token lifecycle management:
- Automatic token refresh when expired (>50 minutes old)
- Encrypted storage of access/refresh tokens
- Integration with Supabase `integration_credentials` table

### 2. API Routes

#### OAuth Routes (`app/api/routes/jira/oauth.py`)
- `GET /api/jira/oauth/init` - Start OAuth flow
- `GET /api/jira/oauth/callback` - OAuth callback handler
- `GET /api/jira/oauth/status` - Check connection status
- `POST /api/jira/oauth/disconnect` - Disconnect integration

#### Project Routes (`app/api/routes/jira/projects.py`)
- `GET /api/jira/projects/{integration_id}` - List projects
- `GET /api/jira/projects/{integration_id}/{project_key}` - Get project details
- `GET /api/jira/projects/{integration_id}/{project_key}/users` - Get assignable users
- `GET /api/jira/projects/{integration_id}/{project_key}/issue-types`
- `GET /api/jira/projects/{integration_id}/{project_key}/statuses`

#### Board Routes (`app/api/routes/jira/boards.py`)
- `GET /api/jira/boards/{integration_id}` - List boards
- `GET /api/jira/boards/{integration_id}/{board_id}` - Get board details
- `GET /api/jira/boards/{integration_id}/{board_id}/sprints` - Get board sprints
- `GET /api/jira/boards/{integration_id}/sprints/{sprint_id}` - Sprint details
- `GET /api/jira/boards/{integration_id}/sprints/{sprint_id}/issues` - Sprint issues

#### Issue Routes (`app/api/routes/jira/issues.py`)
- `POST /api/jira/issues/{integration_id}/search` - Search issues (JQL)
- `GET /api/jira/issues/{integration_id}/{issue_key}` - Get issue
- `POST /api/jira/issues/{integration_id}/create` - Create issue
- `PUT /api/jira/issues/{integration_id}/{issue_key}` - Update issue
- `DELETE /api/jira/issues/{integration_id}/{issue_key}` - Delete issue
- `GET /api/jira/issues/{integration_id}/{issue_key}/transitions` - Get transitions
- `POST /api/jira/issues/{integration_id}/{issue_key}/transition` - Execute transition
- `POST /api/jira/issues/{integration_id}/{issue_key}/comment` - Add comment
- `POST /api/jira/issues/{integration_id}/push` - Push multiple issues
- `POST /api/jira/issues/{integration_id}/push/{issue_id}` - Push single issue

#### Sync Routes (`app/api/routes/jira/sync.py`)
- `POST /api/jira/sync/{integration_id}/project` - Sync project
- `POST /api/jira/sync/{integration_id}/sprint` - Sync sprint
- `GET /api/jira/sync/{integration_id}/status/{job_id}` - Get sync status
- `GET /api/jira/sync/{integration_id}/jobs` - List sync jobs

#### Webhook Routes (`app/api/routes/jira/sync.py`)
- `POST /api/jira/sync/{integration_id}/webhook/register` - Register webhook
- `GET /api/jira/sync/{integration_id}/webhook/list` - List webhooks
- `DELETE /api/jira/sync/{integration_id}/webhook/{webhook_id}` - Delete webhook
- `POST /api/jira/sync/webhook/receive` - **Public endpoint for Jira webhooks**
- `GET /api/jira/sync/{integration_id}/webhook/events` - List received events

### 3. Database Schema

#### Tables Created (Migration: `20241207T000000_create_jira_sync_webhook_tables.sql`)

**jira_sync_jobs**
```sql
- id: UUID (PK)
- workspace_id: UUID (FK to workspaces)
- integration_id: UUID (FK to integration_credentials)
- sync_type: VARCHAR ('manual', 'auto', 'initial', 'webhook')
- resource_type: VARCHAR ('project', 'sprint', 'board', 'issues', 'issue', 'epic')
- resource_id: VARCHAR (Jira identifier)
- status: VARCHAR ('in_progress', 'success', 'failed', 'partial')
- items_processed, items_created, items_updated, items_failed: INTEGER
- error_message: TEXT
- started_at, completed_at: TIMESTAMP
- sync_metadata: JSONB
```

**jira_webhooks**
```sql
- id: UUID (PK)
- workspace_id: UUID (FK to workspaces)
- integration_id: UUID (FK to integration_credentials)
- jira_webhook_id: VARCHAR (Jira's webhook ID)
- webhook_name, webhook_url: VARCHAR
- events: TEXT[] (array of event types)
- jql_filter: TEXT (optional JQL filter)
- is_active: BOOLEAN
- last_received_at: TIMESTAMP
```

**jira_webhook_events**
```sql
- id: UUID (PK)
- webhook_id: UUID (FK to jira_webhooks)
- workspace_id: UUID
- event_type: VARCHAR (e.g., 'jira:issue_created')
- issue_key, issue_id: VARCHAR
- payload: JSONB (full webhook payload)
- processed: BOOLEAN
- processed_at: TIMESTAMP
- error_message: TEXT
- received_at: TIMESTAMP
```

### 4. AI Agent Integration

#### Epic Decomposer Jira Mode (`app/agents/epic_decomposer.py`)

**New Function**: `decompose_epic_from_jira()`
- Fetches epic directly from Jira using API client
- Converts Atlassian Document Format (ADF) to plain text
- Decomposes epic using AI agent
- Optionally pushes generated stories back to Jira with epic link

**New API Endpoint**: `POST /api/agents/epic/decompose/jira`
```json
{
  "epic_key": "PROJ-123",
  "integration_id": "uuid",
  "max_stories": 6,
  "user_prompt": "Focus on mobile experience",
  "push_to_jira": true
}
```

**Response**:
```json
{
  "success": true,
  "epic_key": "PROJ-123",
  "stories": [...],
  "quality_score": 8.5,
  "warnings": [],
  "jira_push_results": {
    "success": true,
    "created_count": 6,
    "failed_count": 0,
    "created_stories": [
      {
        "title": "User can view notifications",
        "jira_key": "PROJ-124",
        "jira_url": "https://..."
      }
    ]
  }
}
```

## Webhook Implementation

### Webhook Flow

1. **Registration** (via UI or API):
   ```
   POST /api/jira/sync/{integration_id}/webhook/register
   {
     "project_key": "PROJ",
     "events": ["jira:issue_created", "jira:issue_updated"]
   }
   ```

2. **Jira sends events to**: `https://your-app.com/api/jira/sync/webhook/receive`

3. **Processing**:
   - Event logged in `jira_webhook_events` table
   - Webhook `last_received_at` updated
   - Background task syncs the affected issue

### Supported Events

- `jira:issue_created` - New issue created
- `jira:issue_updated` - Issue fields updated
- `jira:issue_deleted` - Issue deleted
- `comment_created` - New comment added
- `comment_updated` - Comment edited
- `comment_deleted` - Comment removed

### Webhook Security

- Webhooks are scoped to workspace + integration
- JQL filters can limit which issues trigger webhooks
- Events are logged for audit trail
- Failed processing retries can be implemented

## Sync Strategies

### 1. Manual Sync (User-Initiated)
- User clicks "Sync Now" button
- Creates sync job with `sync_type='manual'`
- Syncs entire project or sprint

### 2. Webhook Sync (Real-Time)
- Jira sends event immediately when issue changes
- Minimal latency (<1 second typically)
- Only syncs affected issue
- Creates sync job with `sync_type='webhook'`

### 3. Incremental Sync (Recommended for large projects)
- Use JQL with `updated >= '2024-12-01'`
- Only syncs issues modified since last sync
- Store last sync timestamp in `sync_metadata`

## Environment Variables Required

```bash
# Already configured for OAuth
JIRA_CLIENT_ID=your_client_id
JIRA_CLIENT_SECRET=your_client_secret
JIRA_REDIRECT_URI=https://your-app.com/api/jira/oauth/callback

# New: Public URL for webhooks
PUBLIC_URL=https://your-app.com  # For HuggingFace/Vercel deployment
```

## Frontend Integration Tasks (TODO)

### 1. Update `lib/api/jiraService.ts`
Add methods for:
- Sync operations (`syncProject`, `syncSprint`, `getSyncStatus`)
- Issue operations (`searchIssues`, `createIssue`, `pushToJira`)
- Webhook management (`registerWebhook`, `listWebhooks`, `deleteWebhook`)

### 2. Update `IntegrationsPage.tsx`
- Replace mock OAuth with real flow using `integrationService.initJiraOAuth()`
- Add "Sync Now" buttons per project
- Display sync status (last synced, items synced)
- Show webhook status indicator (active/inactive)
- Add webhook registration UI

### 3. Create `PushToJiraModal.tsx`
- Component for reviewing AI-generated stories before pushing
- Preview: Title, description, acceptance criteria
- Checkbox selection for which stories to push
- Epic link selection
- Push button with progress indicator

### 4. Update `EpicDecomposer.tsx`
- Add "Fetch from Jira" button/mode
- Epic picker from Jira (dropdown of epics)
- "Push to Jira" button after generation
- Show Jira keys for pushed stories

## Usage Examples

### Example 1: Sync a Project
```python
from app.services.jira import JiraOAuthManager, JiraAPIClient, JiraSyncService

oauth_manager = JiraOAuthManager()
access_token, cloud_id = await oauth_manager.ensure_valid_token(integration_id, workspace_id)
client = JiraAPIClient(access_token, cloud_id)
sync_service = JiraSyncService(client, workspace_id, integration_id)

result = await sync_service.sync_project("PROJ", include_issues=True)
print(f"Synced {result['items_processed']} items")
```

### Example 2: Search Issues with JQL
```python
client = JiraAPIClient(access_token, cloud_id)
result = await client.search_issues(
    jql="project = PROJ AND type = Story AND status = 'To Do'",
    max_results=50
)
for issue in result["issues"]:
    print(issue["key"], issue["fields"]["summary"])
```

### Example 3: Push AI Stories to Jira
```python
sync_service = JiraSyncService(client, workspace_id, integration_id)
result = await sync_service.push_multiple_issues_to_jira(
    issue_ids=["uuid1", "uuid2", "uuid3"],
    link_to_epic="PROJ-100"
)
print(f"Created {result['created_count']} stories in Jira")
```

### Example 4: Register Webhook
```python
client = JiraAPIClient(access_token, cloud_id)
webhook_data = {
    "name": "CogniSim Sync",
    "url": "https://your-app.com/api/jira/sync/webhook/receive",
    "events": ["jira:issue_created", "jira:issue_updated"],
    "filters": {
        "issue-related-events-section": "project = PROJ"
    }
}
webhook = await client.create_webhook(webhook_data)
print(f"Webhook registered: {webhook['id']}")
```

## Testing Checklist

### Backend Tests
- [ ] OAuth flow (init, callback, token refresh)
- [ ] Project sync (with and without issues)
- [ ] Issue CRUD operations
- [ ] JQL search with various queries
- [ ] Sprint sync
- [ ] Webhook registration and event processing
- [ ] Push to Jira (single and batch)
- [ ] Epic decomposer Jira mode
- [ ] Token auto-refresh on expiry
- [ ] Error handling for invalid credentials

### Integration Tests
- [ ] Full sync flow: OAuth → Sync Project → List Issues
- [ ] AI Agent flow: Fetch Epic from Jira → Decompose → Push Stories
- [ ] Webhook flow: Register → Trigger in Jira → Receive Event → Sync Issue
- [ ] Incremental sync with `since` parameter

### Frontend Tests
- [ ] OAuth initiation and callback handling
- [ ] Sync button triggers sync job
- [ ] Sync status polling and display
- [ ] Webhook status indicators
- [ ] Push to Jira modal workflow
- [ ] Error handling and user feedback

## Deployment Notes

### HuggingFace Spaces
- Public URL: `https://[your-space].hf.space`
- Set `PUBLIC_URL` environment variable
- Webhooks will be sent to this URL

### Vercel Frontend
- Frontend deployed separately
- Backend webhook endpoint must be accessible
- CORS configured for Vercel domain

### Database Migration
```bash
# Run the migration
psql $DATABASE_URL -f supabase/migrations/20241207T000000_create_jira_sync_webhook_tables.sql
```

## Security Considerations

1. **Token Storage**: All tokens encrypted at rest using `app/services/jira/credential_helpers.py`
2. **Webhook Validation**: Consider adding HMAC signature verification (Jira supports this)
3. **Rate Limiting**: Implement rate limits on sync endpoints to prevent abuse
4. **Workspace Isolation**: All operations scoped to workspace_id to prevent cross-workspace access
5. **OAuth Scopes**: Request minimal required scopes:
   - `read:jira-user` - User profile
   - `read:jira-work` - Read issues, projects
   - `write:jira-work` - Create/update issues
   - `offline_access` - Refresh tokens

## Performance Optimization

1. **Pagination**: All list operations use pagination (default 50-100 items per page)
2. **Field Filtering**: Only fetch required fields in JQL queries
3. **Incremental Sync**: Use `updated >= date` in JQL to avoid full scans
4. **Background Processing**: Webhook events processed asynchronously
5. **Caching**: Consider caching project metadata and issue types (low change frequency)

## Monitoring & Observability

### Metrics to Track
- Sync job success/failure rates
- Webhook event processing latency
- Token refresh frequency
- API error rates by endpoint
- Daily sync job count per workspace

### Logging
- All sync operations logged with job_id for tracing
- Webhook events logged in database for audit
- API errors logged with context (issue key, operation type)

## Future Enhancements

1. **Bidirectional Comments**: Sync comments between Jira and CogniSim
2. **Status Mapping**: Map Jira workflow states to CogniSim statuses
3. **Attachments**: Sync file attachments
4. **Custom Fields**: Support custom Jira fields
5. **Bulk Operations**: Batch create/update multiple issues
6. **Conflict Resolution**: Handle concurrent updates from both systems
7. **Multi-Site Support**: Support users with multiple Atlassian sites

## Support & Troubleshooting

### Common Issues

**Issue**: Token expired errors
**Solution**: Check `last_tested_at` in `integration_credentials`, ensure refresh token valid

**Issue**: Webhook not receiving events
**Solution**: Verify PUBLIC_URL environment variable, check Jira webhook settings, test with Jira webhook tester

**Issue**: Sync job stuck in "in_progress"
**Solution**: Check `jira_sync_jobs` table, look for error_message, implement timeout mechanism

**Issue**: ADF conversion losing formatting
**Solution**: Enhance `_extract_text_from_adf()` to handle more node types (tables, code blocks, etc.)

## API Documentation

Full OpenAPI/Swagger documentation available at:
- Development: `http://localhost:8000/docs`
- Production: `https://your-app.com/docs`

Search for "jira" in the Swagger UI to see all Jira-related endpoints.

---

**Last Updated**: December 7, 2024
**Version**: 1.0
**Maintained by**: CogniSim AI Team
