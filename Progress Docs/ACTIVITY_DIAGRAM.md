# System Activity Diagram - CogniSim AI

This document illustrates the end-to-end workflow of the CogniSim AI system, showing how different actors interact to achieve key objectives.

## Activity Flow

The diagram uses swimlanes to distinguish between the **User**, the **System** (Frontend/Backend), the **AI Agent**, and **External Services**.

### Diagram

```mermaid
flowchart TB
    %% Swimlanes as Subgraphs
    subgraph User_Lane [User]
        direction TB
        Start((Start))
        Login_Action[Enter Credentials]
        Select_Proj[Select Workspace & Project]
        
        %% User Decisions
        Decide_Action{Choose Action}
        Manual_Task[Create Issue Manually]
        AI_Request[Request Epic Decomposition]
        Sync_Request[Trigger Jira Sync]
        Logout_Action[Logout]
        End((End))
    end

    subgraph System_Lane [CogniSim System]
        direction TB
        Auth_Check{Valid?}
        Load_Dash[Load Dashboard]
        Save_Issue[Save Issue to DB]
        Display_Results[Display Generated Stories]
        Update_Local[Update Local Database]
    end

    subgraph AI_Lane [AI Agent]
        direction TB
        Analyze_Req[Analyze Requirements]
        Gen_Stories[Generate User Stories]
    end

    subgraph External_Lane [External Services]
        direction TB
        Fetch_Data[Fetch External Issues]
        Push_Data[Push Updates]
    end

    %% Flow Connections
    Start --> Login_Action
    Login_Action --> Auth_Check
    
    %% Auth Flow
    Auth_Check -- No --> Login_Action
    Auth_Check -- Yes --> Select_Proj
    Select_Proj --> Load_Dash
    Load_Dash --> Decide_Action

    %% Action: Manual Issue
    Decide_Action -- Manage Backlog --> Manual_Task
    Manual_Task --> Save_Issue
    Save_Issue --> Decide_Action

    %% Action: AI Assistance
    Decide_Action -- AI Assist --> AI_Request
    AI_Request --> Analyze_Req
    Analyze_Req --> Gen_Stories
    Gen_Stories --> Display_Results
    Display_Results --> Save_Issue

    %% Action: Integration
    Decide_Action -- Sync Data --> Sync_Request
    Sync_Request --> Fetch_Data
    Fetch_Data --> Update_Local
    Update_Local --> Push_Data
    Push_Data --> Decide_Action

    %% Logout
    Decide_Action -- Quit --> Logout_Action
    Logout_Action --> End
```

## Workflow Description

1.  **Authentication:** The user starts by logging in. The system validates credentials.
2.  **Initialization:** Upon success, the user selects a workspace and project, loading the dashboard.
3.  **Main Loop:** The user can perform three primary types of actions:
    *   **Manual Management:** Creating and editing issues directly.
    *   **AI Assistance:** Requesting the AI Agent to decompose epics or estimate points. The AI processes this and returns structured data to the system.
    *   **Integrations:** Triggering synchronization with external tools like Jira. The system fetches and pushes data to keep both sides in sync.
4.  **Termination:** The user logs out to end the session.
