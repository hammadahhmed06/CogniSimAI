# System Sequence Diagrams - CogniSim AI

This document provides detailed sequence flows for the core modules of the CogniSim AI system. Each section includes a visual diagram and a step-by-step textual description of the interaction.

## 1. Authentication System

This flow details the complete lifecycle of user authentication, including login, session establishment, and token management.

### Sequence Flow Description
1.  **User Action:** The user enters their email and password on the login page.
2.  **Frontend Validation:** The React frontend validates the input format (e.g., valid email).
3.  **Authentication Request:** The frontend sends a `signInWithPassword` request to the Supabase Auth service.
4.  **Verification:** Supabase Auth verifies the credentials against the secure user registry.
    *   *Alt Path:* If invalid, an error is returned, and the user is notified.
5.  **Session Creation:** Upon success, Supabase generates an Access Token (JWT) and a Refresh Token.
6.  **Token Storage:** The frontend stores these tokens securely (e.g., in local storage or cookies).
7.  **State Update:** The global Auth Context is updated with the user's profile.
8.  **Navigation:** The user is redirected to the Dashboard.
9.  **Session Refresh (Background):** As the user interacts, the client automatically refreshes the token before it expires.

### Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend (React)
    participant Auth as Supabase Auth
    participant DB as Database (PostgreSQL)

    User->>FE: Enter Email & Password
    User->>FE: Click "Login"
    
    rect rgb(240, 248, 255)
        note right of FE: Authentication Phase
        FE->>FE: Validate Input Format
        FE->>Auth: signInWithPassword(email, password)
        activate Auth
        Auth->>DB: Verify Credentials
        
        alt Invalid Credentials
            DB-->>Auth: Failure
            Auth-->>FE: Error (401 Unauthorized)
            FE->>User: Show "Invalid Email/Password"
        else Valid Credentials
            DB-->>Auth: Success
            Auth-->>Auth: Generate JWT & Refresh Token
            Auth-->>FE: Return Session Object
        end
        deactivate Auth
    end

    rect rgb(240, 255, 240)
        note right of FE: Session Establishment
        FE->>FE: Store Tokens Securely
        FE->>FE: Update AuthContext State
        FE->>User: Redirect to /dashboard
    end

    rect rgb(255, 250, 240)
        note right of FE: Background Maintenance
        loop Every 50 minutes
            FE->>Auth: Refresh Session
            Auth-->>FE: New Access Token
        end
    end
```

---

## 2. Workspace & Project Management

This flow illustrates how a user creates a new organizational environment (Workspace) and initializes a Project within it.

### Sequence Flow Description
1.  **Create Workspace:** The user requests to create a new Workspace (e.g., "Engineering").
2.  **Backend Processing:** The API creates the workspace and automatically assigns the creator as the "Workspace Owner".
3.  **Context Switch:** The frontend updates the active workspace context.
4.  **Create Project:** Inside the workspace, the user creates a new Project (e.g., "Mobile App").
5.  **Validation:** The system checks if the Project Key (e.g., "MOB") is unique within the workspace.
6.  **Initialization:** The system creates the project and initializes default settings (e.g., default workflow states like Todo, In Progress).
7.  **Navigation:** The user is taken to the new project's backlog.

### Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant API as Backend API
    participant DB as Database

    box "Organization Setup" #f9f9f9
        participant FE
        participant API
        participant DB
    end

    %% Workspace Creation
    User->>FE: Click "Create Workspace"
    FE->>User: Show Modal
    User->>FE: Enter Name ("Engineering") & Submit
    FE->>API: POST /api/workspaces
    activate API
    API->>DB: Insert Workspace Record
    API->>DB: Link User as OWNER
    DB-->>API: Success
    API-->>FE: Return Workspace Object
    deactivate API
    FE->>FE: Set Active Workspace Context

    %% Project Creation
    User->>FE: Click "New Project"
    User->>FE: Enter Name ("Mobile App") & Key ("MOB")
    FE->>API: POST /api/projects
    activate API
    API->>DB: Check Key Uniqueness
    
    alt Key Exists
        DB-->>API: Duplicate Found
        API-->>FE: Error "Key already taken"
        FE->>User: Show Error Message
    else Key Unique
        API->>DB: Insert Project Record
        API->>DB: Create Default Workflow States
        DB-->>API: Success
        API-->>FE: Return Project Object
    end
    deactivate API

    FE->>User: Redirect to Project Backlog
```

---

## 3. Integrations (Jira)

This flow demonstrates the OAuth 2.0 handshake to connect a Jira account and the subsequent data synchronization.

### Sequence Flow Description
1.  **Initiate Connection:** User clicks "Connect Jira".
2.  **OAuth Redirect:** The system redirects the user to Atlassian's authorization server.
3.  **User Authorization:** User logs in to Jira and grants permission to CogniSim AI.
4.  **Callback:** Atlassian redirects back to CogniSim with an authorization code.
5.  **Token Exchange:** The backend exchanges the code for an Access Token and Refresh Token.
6.  **Credential Storage:** Tokens are encrypted and stored in the database.
7.  **Data Sync:** The system fetches projects and issues from Jira and maps them to CogniSim's internal structure.

### Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant API as Backend API
    participant Jira as Atlassian (Jira)
    participant DB as Database

    %% OAuth Flow
    User->>FE: Click "Connect Jira"
    FE->>API: GET /api/integrations/jira/auth-url
    API-->>FE: Return Authorization URL
    FE->>Jira: Redirect User to Atlassian
    User->>Jira: Grant Permissions
    Jira->>FE: Redirect to /callback?code=XYZ
    
    FE->>API: POST /api/integrations/jira/exchange
    activate API
    API->>Jira: Exchange Code for Tokens
    Jira-->>API: Access & Refresh Tokens
    API->>API: Encrypt Tokens
    API->>DB: Store Integration Credentials
    API-->>FE: Connection Success
    deactivate API

    %% Sync Flow
    note over API, Jira: Asynchronous Synchronization
    API->>Jira: Fetch Projects & Issues
    activate API
    Jira-->>API: JSON Data
    API->>API: Map Jira Fields to Internal Schema
    API->>DB: Upsert Issues (Sync)
    deactivate API
    FE->>User: Show Synced Items in Backlog
```

---

## 4. AI Modules (Epic Decomposition)

This flow details the complex interaction of the "Epic Architect" agent, which breaks down large requirements into executable user stories.

### Sequence Flow Description
1.  **Trigger:** User selects an Epic and provides optional guidance (e.g., "Focus on security").
2.  **Agent Initialization:** The backend initializes the AI Agent with the Epic's context.
3.  **Analysis Phase:** The Agent uses an LLM to analyze the requirements, identifying user personas and acceptance criteria.
4.  **Generation Phase:** The Agent iteratively generates User Stories.
5.  **Streaming:** Results are streamed to the frontend in real-time (Server-Sent Events) so the user sees progress.
6.  **Human Review:** The user reviews the drafts, edits if necessary, and selects stories to keep.
7.  **Commit:** The selected stories are saved to the database as official backlog items.

### Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant API as Backend API
    participant Agent as AI Agent (Python)
    participant LLM as LLM Service
    participant DB as Database

    User->>FE: Select Epic & Prompt "Focus on Security"
    FE->>API: POST /api/agents/decompose (Stream)
    activate API
    API->>Agent: Start Decomposition Run
    activate Agent
    
    Agent->>DB: Fetch Epic Title & Description
    DB-->>Agent: Return Data
    
    note right of Agent: Phase 1: Analysis
    Agent->>LLM: Prompt: "Analyze this Epic..."
    LLM-->>Agent: Insights (Personas, Risks)
    Agent-->>API: Stream Insights
    API-->>FE: Update UI (Insights Tab)

    note right of Agent: Phase 2: Generation
    loop For each logical component
        Agent->>LLM: Prompt: "Generate stories for..."
        LLM-->>Agent: Story Draft (JSON)
        Agent->>Agent: Validate Format
        Agent-->>API: Stream Story Draft
        API-->>FE: Add Story to List
    end
    deactivate Agent
    deactivate API

    note over User, FE: Human-in-the-Loop Review
    User->>FE: Edit Story #2
    User->>FE: Select All & Click "Commit"
    
    FE->>API: POST /api/issues/batch
    activate API
    API->>DB: Insert Stories as "Todo"
    DB-->>API: Success
    API-->>FE: 200 OK
    deactivate API
    FE->>User: Show Success Toast
```
