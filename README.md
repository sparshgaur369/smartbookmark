## Project Architecture

### 1. Website Architecture

The application is built using Next.js (App Router), React, Tailwind CSS, and Supabase for backend services (Auth and PostgreSQL database). 

```mermaid
     graph TD
        classDef client fill:#e1f5fe,stroke:#01579b,color:#000
        classDef server fill:#fff3e0,stroke:#e65100,color:#000
        classDef external fill:#f3e5f5,stroke:#4a148c,color:#000
        classDef db fill:#e8f5e9,stroke:#1b5e20,color:#000

        subgraph Frontend [Client Side - Next.js]
            UI[React Components]:::client
            State[React State & Hooks]:::client
            ChatBox[ChatBox Component]:::client
            RealtimeClient[Supabase Realtime Sub]:::client
        end

        subgraph Backend [Server Side - Next.js App Router]
            ChatAPI[POST /api/chat Route]:::server
            Auth[Supabase Auth SSR]:::server
        end

        subgraph ExternalServices [External Services]
            SupabaseDB[(Supabase PostgreSQL)]:::db
            OpenAI[OpenAI API]:::external
        end

        UI --> |User Interactions| State
        State <--> |Props & Callbacks| ChatBox
        ChatBox --> |HTTP POST Messages| ChatAPI
        RealtimeClient <--> |WebSocket| SupabaseDB
        RealtimeClient --> |Dispatch UI Updates| State
        
        ChatAPI --> |Function Calling / LLM| OpenAI
        ChatAPI --> |CRUD Operations| SupabaseDB
        Auth <--> |Session Validation| SupabaseDB
 ```

---

## Challenges & Solutions

### Implementing the UI-Controlling Chatbot

**The Problem:**
Initially, we attempted to implement the AI chatbot using Vercel's AI SDK `streamText` function and defining tools with `zod` schemas for strict type validation. However, this approach led to persistent schema mismatch errors. The AI model's output or the SDK's internal parsing would frequently fail with `Invalid schema for function 'addBookmark': schema must be a JSON Schema of 'type:
    "object"', got 'type: "None"'`. This prevented the AI from reliably executing tools to update the UI (like adding or deleting bookmarks).

**The Solution:**
    To resolve this, we pivoted to a more robust, standard approach using the plain OpenAI function calling format and direct tool execution, bypassing the `steamText` and `zod` schema complexities that were causing conflicts:

1. **Plain Function Calling Format:** Instead of relying on `zod` to generate the JSON schema for tools, we manually defined the `TOOLS` array using the exact JSON Schema required by the OpenAI API.
    2. **Direct OpenAI Integration:** We replaced the higher-level SDK wrapper with a direct `fetch` call to the `https://api.openai.com/v1/chat/completions` endpoint.
    3. **Manual Tool Execution Loop:** We implemented a custom loop in the `/api/chat/route.ts` API route. This loop sends the conversation to OpenAI. If OpenAI responds with a `tool_calls` request, our backend intercepts it, parses the arguments (which are now reliably formatted based on our explicit JSON schema), executes the corresponding Supabase database operation, appends the tool result to the conversation history, and sends it back to OpenAI for a final natural language response.

    This change completely eliminated the Zod schema errors, providing a stable, reliable mechanism for the AI Chatbot to control the application's state via backend function execution, which then seamlessly updates the frontend UI via Supabase Real-time subscriptions.
