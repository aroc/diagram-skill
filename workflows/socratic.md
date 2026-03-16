# Socratic / Conceptual Workflow

Use this workflow when the user wants to diagram a concept, idea, or system — not necessarily derived from code in the current project.

## Conversational Loop

The flow is iterative. Each round follows this pattern:

1. **Ask** a few focused questions to deepen your understanding of what the user wants to visualize
2. **Summarize** what the diagram would contain so far in plain language (e.g., "So far I'd draw 3 groups — Frontend, Backend, Storage — with 8 nodes and data flowing top-to-bottom. The main flow goes from User → API Gateway → Services → Database...")
3. **Check in**: "Does this capture it? Want to clarify or add anything, or are you ready for me to generate the diagram?"
4. If the user clarifies or adds detail → loop back to step 1 with follow-up questions
5. If the user says ready → proceed to **Write the JSON File** (back in the shared steps)

## Question Areas

Cover these areas, adapting the order to the conversation:

- **Scope & purpose**: What are you trying to visualize? What is this diagram for?
- **Components**: What are the main components, actors, or entities?
- **Groupings**: Are there natural groupings or layers? (e.g., frontend/backend, input/processing/output)
- **Relationships**: How do components connect? What flows between them? (data, requests, events, dependencies)
- **Direction**: Is the flow hierarchical (top-to-bottom) or sequential (left-to-right)?

## Guidelines

- Adapt based on answers — skip questions the user already answered
- If the user provides lots of detail upfront, jump straight to a summary and ask if they're ready
- **Always offer the summary checkpoint before generating** — never generate without user confirmation
- Start simple (8-15 nodes) and offer to add detail in later iterations
- Use the user's own terminology for node and group labels
- For iteration on conceptual diagrams, ask what the user wants to change rather than re-running the full questioning flow

## Conceptual Diagram Patterns

### Process / Workflow
A sequential pipeline — use `"RIGHT"` direction.

```json
{
  "direction": "RIGHT",
  "groups": [
    { "id": "build", "label": "Build", "children": ["compile", "test"] },
    { "id": "deploy", "label": "Deploy", "children": ["staging", "prod"] }
  ],
  "nodes": [
    { "id": "commit", "label": "Git Commit" },
    { "id": "compile", "label": "Compile" },
    { "id": "test", "label": "Run Tests" },
    { "id": "staging", "label": "Deploy Staging" },
    { "id": "prod", "label": "Deploy Prod" }
  ],
  "edges": [
    { "from": "commit", "to": "compile", "label": "trigger" },
    { "from": "compile", "to": "test" },
    { "from": "test", "to": "staging", "label": "on pass" },
    { "from": "staging", "to": "prod", "label": "promote" }
  ]
}
```

### System Context
A high-level view of a system and its external actors/dependencies.

```json
{
  "direction": "DOWN",
  "groups": [
    { "id": "internal", "label": "Our System", "children": ["api", "worker", "db"] },
    { "id": "external", "label": "External", "children": ["payment", "email"] }
  ],
  "nodes": [
    { "id": "user", "label": "End User" },
    { "id": "api", "label": "API Server" },
    { "id": "worker", "label": "Background Worker" },
    { "id": "db", "label": "Database" },
    { "id": "payment", "label": "Stripe" },
    { "id": "email", "label": "SendGrid" }
  ],
  "edges": [
    { "from": "user", "to": "api", "label": "HTTP" },
    { "from": "api", "to": "db", "label": "queries" },
    { "from": "api", "to": "worker", "label": "enqueue" },
    { "from": "worker", "to": "payment", "label": "charge" },
    { "from": "worker", "to": "email", "label": "send" }
  ]
}
```

### Decision Flow
A branching diagram showing decision points and outcomes.

```json
{
  "direction": "DOWN",
  "nodes": [
    { "id": "req", "label": "Incoming Request" },
    { "id": "auth", "label": "Authenticated?" },
    { "id": "role", "label": "Check Role" },
    { "id": "allow", "label": "Allow Access" },
    { "id": "deny", "label": "Deny 403" },
    { "id": "login", "label": "Redirect to Login" }
  ],
  "edges": [
    { "from": "req", "to": "auth" },
    { "from": "auth", "to": "role", "label": "yes" },
    { "from": "auth", "to": "login", "label": "no" },
    { "from": "role", "to": "allow", "label": "admin" },
    { "from": "role", "to": "deny", "label": "guest" }
  ]
}
```
