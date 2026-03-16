# System Class Diagram - CogniSim AI

This document details the object-oriented structure of the system's data models, derived from the Pydantic schemas and database tables.

## Class Structure

The diagram highlights the core entities: **Users**, **Workspaces**, **Projects**, **Issues**, and **AI Agents**.

### Diagram

```mermaid
classDiagram
    direction TB

    %% Core Entities
    class User {
        +UUID id
        +String email
        +String full_name
        +String avatar_url
        +DateTime created_at
    }

    class Workspace {
        +UUID id
        +String name
        +String slug
        +UUID owner_id
        +DateTime created_at
    }

    class Project {
        +UUID id
        +String name
        +String key
        +ProjectType type
        +String status
        +UUID workspace_id
        +UUID owner_id
        +DateTime created_at
    }

    class Issue {
        +UUID id
        +String issue_key
        +String title
        +String description
        +String status
        +String priority
        +String type
        +Int story_points
        +UUID project_id
        +UUID assignee_id
        +UUID reporter_id
        +UUID epic_id
        +UUID sprint_id
    }

    class Sprint {
        +UUID id
        +String name
        +String goal
        +String state
        +Date start_date
        +Date end_date
        +UUID project_id
    }

    class Team {
        +UUID id
        +String name
        +UUID workspace_id
    }

    class AgentRun {
        +UUID id
        +String agent_type
        +String action
        +String status
        +JSON input
        +JSON output
        +UUID user_id
        +UUID epic_id
        +DateTime started_at
    }

    %% Relationships
    
    %% User Relationships
    User "1" -- "*" Workspace : owns
    User "1" -- "*" Project : owns
    User "1" -- "*" Issue : reports
    User "1" -- "*" Issue : assigned_to
    User "1" -- "*" AgentRun : triggers
    User "*" -- "*" Team : member_of

    %% Workspace Relationships
    Workspace "1" *-- "*" Project : contains
    Workspace "1" *-- "*" Team : contains

    %% Project Relationships
    Project "1" *-- "*" Issue : contains
    Project "1" *-- "*" Sprint : contains

    %% Issue Relationships
    Issue "*" -- "1" Sprint : belongs_to
    Issue "*" -- "0..1" Issue : parent_epic
    
    %% Agent Relationships
    AgentRun "0..1" -- "1" Issue : operates_on_epic
    AgentRun "1" -- "*" Issue : creates_issues

    %% Team Relationships
    Team "*" -- "*" Project : access_granted
```

## Class Descriptions

### 1. Core Entities
*   **User:** Represents a registered system user.
*   **Workspace:** The top-level container for all resources (projects, teams). A user can belong to multiple workspaces.
*   **Project:** A specific initiative (Scrum or Kanban) containing issues and sprints.

### 2. Work Items
*   **Issue:** The fundamental unit of work (Task, Bug, Story, Epic). It has a lifecycle (status) and estimation (story points).
*   **Sprint:** A time-boxed iteration in a Scrum project containing a subset of issues.

### 3. Organization
*   **Team:** A group of users within a workspace. Teams can be granted access to specific projects.

### 4. AI & Automation
*   **AgentRun:** A record of an AI agent's execution. It links the user's request (input) to the generated results (output) and any artifacts created (e.g., new issues).
