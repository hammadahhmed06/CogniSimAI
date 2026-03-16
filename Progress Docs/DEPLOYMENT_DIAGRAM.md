# System Deployment Diagram - CogniSim AI

This document illustrates the physical deployment of the CogniSim AI system, mapping software artifacts to their execution environments and hardware nodes.

## Deployment Architecture

The system utilizes a cloud-native deployment strategy, leveraging serverless frontend hosting (Vercel), containerized backend services (Hugging Face), and managed database services (Supabase).

### Diagram

```mermaid
flowchart TB
    %% Styling for Nodes
    classDef device fill:#fff,stroke:#333,stroke-width:2px;
    classDef env fill:#f9f9f9,stroke:#666,stroke-width:1px,stroke-dasharray: 5 5;
    classDef artifact fill:#e1f5fe,stroke:#0277bd,stroke-width:1px;

    %% Client Device
    subgraph Client_Device [<<device>> User Workstation]
        direction TB
        subgraph Browser_Env [<<execution environment>> Web Browser]
            Client_App(<<artifact>>\nReact SPA)
        end
    end

    %% Frontend Server (Vercel)
    subgraph Vercel_Cloud [<<device>> Vercel Cloud]
        direction TB
        subgraph CDN_Env [<<execution environment>> Edge Network]
            Static_Assets(<<artifact>>\nBuild Assets\nJS/CSS)
        end
    end

    %% Backend Server (Hugging Face)
    subgraph HF_Cloud [<<device>> Hugging Face Spaces]
        direction TB
        subgraph Docker_Env [<<execution environment>> Docker Container]
            API_Server(<<artifact>>\nFastAPI Server)
            Agent_Runtime(<<artifact>>\nAgent Orchestrator)
        end
    end

    %% Database Server (Supabase)
    subgraph Supabase_Cloud [<<device>> Supabase Cloud]
        direction TB
        subgraph DB_Env [<<execution environment>> PostgreSQL Server]
            Primary_DB(<<artifact>>\nRelational DB)
            Vector_DB(<<artifact>>\npgvector Store)
        end
    end

    %% External Services
    subgraph External_Cloud [<<device>> External API Providers]
        direction TB
        OpenAI_API(<<artifact>>\nLLM Service)
        Jira_Cloud(<<artifact>>\nJira Cloud)
    end

    %% Connections
    Browser_Env -- HTTPS/WSS --> CDN_Env
    Browser_Env -- HTTPS/JSON --> API_Server
    API_Server -- SQL/TCP --> DB_Env
    Agent_Runtime -- HTTPS --> OpenAI_API
    API_Server -- HTTPS --> Jira_Cloud

    %% Apply Styles
    class Client_Device,Vercel_Cloud,HF_Cloud,Supabase_Cloud,External_Cloud device;
    class Browser_Env,CDN_Env,Docker_Env,DB_Env env;
    class Client_App,Static_Assets,API_Server,Agent_Runtime,Primary_DB,Vector_DB,OpenAI_API,Jira_Cloud artifact;
```

## Node Descriptions

### 1. User Workstation
*   **Device:** The end-user's computer or mobile device.
*   **Execution Environment:** Modern Web Browser (Chrome, Firefox, Edge).
*   **Artifact:** **React SPA**, the client-side application code running locally.

### 2. Vercel Cloud (Frontend Host)
*   **Device:** Vercel's global content delivery network.
*   **Execution Environment:** Edge Network.
*   **Artifact:** **Build Assets**, the static JavaScript, CSS, and HTML files served to the client.

### 3. Hugging Face Spaces (Backend Host)
*   **Device:** Cloud infrastructure provided by Hugging Face.
*   **Execution Environment:** Docker Container (Python 3.10 Runtime).
*   **Artifacts:**
    *   **FastAPI Server:** The main API gateway handling requests.
    *   **Agent Orchestrator:** The Python logic controlling AI workflows.

### 4. Supabase Cloud (Database Host)
*   **Device:** Managed database infrastructure.
*   **Execution Environment:** PostgreSQL Server.
*   **Artifacts:**
    *   **Relational DB:** Stores users, projects, and issues.
    *   **pgvector Store:** Stores high-dimensional vector embeddings for AI.

### 5. External API Providers
*   **LLM Service:** External AI model providers (e.g., OpenAI, Anthropic) accessed via API.
*   **Jira Cloud:** The external issue tracking system integrated via REST API.
