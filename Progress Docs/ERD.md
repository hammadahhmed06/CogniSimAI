# System Entity Relationship Diagram (ERD) - CogniSim AI

This document visualizes the database schema and relationships between the core entities in the CogniSim AI system.

## Database Schema

The system uses a relational database (PostgreSQL) with the following structure.

### Diagram

```mermaid
erDiagram
    %% User & Auth
    users {
        uuid id PK
        string email
        string full_name
        string avatar_url
        timestamp created_at
    }

    %% Organization
    workspaces {
        uuid id PK
        string name
        string slug
        uuid owner_id FK
        timestamp created_at
    }

    workspace_members {
        uuid workspace_id FK
        uuid user_id FK
        string role
        string status
    }

    teams {
        uuid id PK
        string name
        uuid workspace_id FK
        timestamp created_at
    }

    team_members {
        uuid team_id FK
        uuid user_id FK
        string role
    }

    %% Project Management
    projects {
        uuid id PK
        string name
        string key
        string type
        string status
        uuid workspace_id FK
        uuid owner_id FK
        timestamp created_at
    }

    sprints {
        uuid id PK
        string name
        string state
        date start_date
        date end_date
        uuid project_id FK
    }

    issues {
        uuid id PK
        string issue_key
        string title
        string status
        string priority
        int story_points
        uuid project_id FK
        uuid sprint_id FK
        uuid owner_id FK "Reporter"
        uuid assignee_id FK
        uuid epic_id FK
    }

    %% AI & Automation
    agent_runs {
        uuid id PK
        string agent_type
        string action
        string status
        jsonb input
        jsonb output
        uuid user_id FK
        uuid epic_id FK
        timestamp started_at
    }

    %% Relationships

    %% User Relationships
    users ||--o{ workspaces : "owns"
    users ||--o{ workspace_members : "has_membership"
    users ||--o{ team_members : "has_membership"
    users ||--o{ projects : "owns"
    users ||--o{ issues : "reports"
    users ||--o{ issues : "assigned_to"
    users ||--o{ agent_runs : "triggers"

    %% Workspace Relationships
    workspaces ||--o{ workspace_members : "contains"
    workspaces ||--o{ projects : "contains"
    workspaces ||--o{ teams : "contains"

    %% Team Relationships
    teams ||--o{ team_members : "contains"

    %% Project Relationships
    projects ||--o{ sprints : "contains"
    projects ||--o{ issues : "contains"

    %% Issue Relationships
    sprints ||--o{ issues : "includes"
    issues |o--o| issues : "parent_epic"

    %% Agent Relationships
    issues ||--o{ agent_runs : "context_for"
```

## Entity Descriptions

### 1. Identity & Access
*   **users:** The central identity table (managed by Supabase Auth).
*   **workspaces:** The highest level of organization. Users can be members of multiple workspaces.
*   **teams:** Sub-groups within a workspace for granular access control.

### 2. Project Management
*   **projects:** Containers for work, following either Scrum or Kanban methodologies.
*   **sprints:** Time-boxed iterations for Scrum projects.
*   **issues:** The core work items. Self-referential relationship allows for Epic -> Story hierarchy.

### 3. AI Operations
*   **agent_runs:** Logs every execution of an AI agent, linking the user's prompt to the resulting artifacts (issues) and performance metrics.
