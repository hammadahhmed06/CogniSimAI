# System Component Diagram - CogniSim AI

This document illustrates the high-level architectural components of the CogniSim AI system and their interdependencies.

## Component Architecture

The system follows a modern microservices-inspired architecture, separating concerns between the client interface, business logic API, data persistence, and specialized AI services.

### Diagram

```mermaid
classDiagram
    direction TB

    %% Component Definitions
    class Frontend_App {
        <<component>>
    }
    class Backend_API {
        <<component>>
    }
    class Database {
        <<component>>
    }
    class AI_Engine {
        <<component>>
        Agent Orchestrator
    }
    class External_Jira {
        <<component>>
    }

    %% Interface Definitions (The "Lollipops")
    class Authentication {
        <<interface>>
    }
    class ProjectData {
        <<interface>>
    }
    class DataAccess {
        <<interface>>
    }
    class AI_Inference {
        <<interface>>
        LLM
    }
    class SyncAPI {
        <<interface>>
    }

    %% Relationships using Ball-and-Socket Syntax
    %% Backend PROVIDES Authentication (Ball)
    Backend_API --() Authentication
    %% Frontend REQUIRES Authentication (Socket)
    Frontend_App ..> Authentication

    %% Backend PROVIDES ProjectData (Ball)
    Backend_API --() ProjectData
    %% Frontend REQUIRES ProjectData (Socket)
    Frontend_App ..> ProjectData

    %% Database PROVIDES DataAccess (Ball)
    Database --() DataAccess
    %% Backend REQUIRES DataAccess (Socket)
    Backend_API ..> DataAccess

    %% AI_Engine PROVIDES AI_Inference (Ball)
    AI_Engine --() AI_Inference
    %% Backend REQUIRES AI_Inference (Socket)
    Backend_API ..> AI_Inference

    %% External_Jira PROVIDES SyncAPI (Ball)
    External_Jira --() SyncAPI
    %% Backend REQUIRES SyncAPI (Socket)
    Backend_API ..> SyncAPI

    %% Internal AI Dependencies
    AI_Engine ..> DataAccess
```

## Component Descriptions

### 1. Components
*   **Frontend_App:** The client-side application handling user interaction.
*   **Backend_API:** The central server managing business logic and security.
*   **Database:** The persistent storage for structured data and vector embeddings.
*   **AI_Engine:** The subsystem responsible for decomposing epics and generating content.
*   **External_Jira:** The third-party system integrated for issue synchronization.

### 2. Interfaces (Connectors)
*   **I_Auth:** The contract for user identification and session management.
*   **I_ProjectAPI:** The set of endpoints for creating and managing projects/issues.
*   **I_DataQuery:** The protocol for reading/writing to the database.
*   **I_Inference:** The interface for sending prompts to the LLM and receiving responses.
*   **I_Integration:** The API contract for syncing data with external tools.

