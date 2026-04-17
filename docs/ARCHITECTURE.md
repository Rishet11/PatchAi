# Patch.AI — Architecture Reference

## System Overview

Patch.AI is a two-tier application: a Next.js frontend that serves as the orchestration control plane, and a FastAPI backend that provides state persistence and a WebSocket event bus.

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                     │
│  Next.js 16 (App Router) · TypeScript · React 19        │
│                                                         │
│  /               → Landing page & feature overview      │
│  /dashboard      → Full control plane UI                │
│                                                         │
│  ┌─────────────────┐   ┌──────────────────────────────┐ │
│  │  State Graph     │   │      Right Sidebar           │ │
│  │  (React Flow)    │   │  Node Detail (Monaco editor) │ │
│  │                 │   │  Agent Window (direct chat)   │ │
│  │  - DAG of all   │   │  Policy Window               │ │
│  │    agent nodes  │   │  Audit Log                   │ │
│  │  - Live layout  │   └──────────────────────────────┘ │
│  │  - Search/filter│                                    │
│  │  - Context menu │   ┌──────────────────────────────┐ │
│  └─────────────────┘   │  Global Status Bar           │ │
│                        │  - Task input                │ │
│  Zustand store         │  - Stats counters            │ │
│  (single source of     │  - Export / Import           │ │
│   truth for all state) │  - Notification tray         │ │
│                        └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
              │ REST + WebSocket (Socket.io)
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Render)                      │
│  FastAPI + python-socketio · Python 3.9+                │
│                                                         │
│  State: In-memory dict (fast, suitable for demo)        │
│  Endpoints:                                             │
│    GET  /health          → Service health check         │
│    GET  /state           → Full simulation state        │
│    POST /node/prune      → Prune a node                 │
│    POST /node/revive     → Revive a pruned node         │
│    POST /node/branch     → Branch from a node           │
│    POST /policy/toggle   → Toggle a policy rule         │
│    POST /policy/add      → Add a new rule               │
│    GET  /state/export    → Download state snapshot JSON │
│    POST /state/import    → Restore from snapshot        │
│                                                         │
│  WebSocket events emitted:                              │
│    state_sync     → Full state replacement              │
│    node_updated   → Single node delta                   │
│    policy_updated → Policy rule change                  │
│    clients_count  → Active operator count               │
└─────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Directory Structure

```
frontend/src/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   ├── page.tsx                # Landing page (/)
│   ├── dashboard/
│   │   └── page.tsx            # Full control plane (/dashboard)
│   └── globals.css             # Complete design system (1400+ lines)
├── components/
│   ├── graph/
│   │   ├── StateGraphView.tsx  # React Flow canvas + context menu
│   │   ├── AgentNode.tsx       # Custom node component
│   │   ├── ContextMenu.tsx     # Right-click menu (Prune/Revive/Branch/Inject/Inspect)
│   │   └── GraphSearchBar.tsx  # Floating search/filter bar (Cmd+F)
│   ├── panels/
│   │   ├── NodeDetailPanel.tsx # Monaco editor + inline editing + node ops
│   │   ├── AgentWindowPanel.tsx# Agent list + direct chat channel
│   │   ├── PolicyWindowPanel.tsx# Policy rules + evaluator proposals + history
│   │   └── AuditLogPanel.tsx   # Full operation audit trail
│   └── layout/
│       ├── GlobalStatusBar.tsx # Top bar (task input, stats, export/import)
│       ├── RightSidebar.tsx    # Tab container with Framer Motion transitions
│       └── OnboardingOverlay.tsx# First-load overlay with AnimatePresence
├── store/
│   └── patchai.ts              # Zustand store (entire app state)
├── lib/
│   ├── types.ts                # All TypeScript interfaces
│   ├── constants.ts            # AGENT_CONFIG, ARTIFACT_ICONS (no emoji)
│   ├── icons.tsx               # Lucide icon renderer (AgentIcon, ArtifactIcon)
│   ├── demo-simulation.ts      # 15-step scripted demo engine
│   └── graph-layout.ts         # dagre auto-layout wrapper
└── hooks/
    └── useKeyboardShortcuts.ts # Global keyboard handler
```

### State Shape (Zustand)

```typescript
// Execution state (persisted in export/import)
{
  id: string                         // Session ID
  taskDescription: string
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'completed'
  startTime: number | null
  nodes: Record<string, GraphNode>   // Keyed by node ID
  edges: GraphEdge[]
  agents: Record<string, AgentState>
  policy: PolicyRule[]
  policyHistory: PolicyEvolution[]
  auditLog: AuditEntry[]
  notifications: Notification[]
  evaluatorProposals: EvaluatorProposal[]
  stats: SystemStats
}

// UI state (not exported)
{
  selectedNodeId: string | null
  hoveredNodeId: string | null
  activePanel: 'node' | 'agent' | 'policy' | 'audit' | null
  selectedAgentId: string | null
  showOnboarding: boolean
  isDemoRunning: boolean
  notificationTrayOpen: boolean
  unreadCount: number
  graphSearchQuery: string
}
```

### Human Intervention Operations

| Operation | Trigger | Audit Entry | Policy Check |
|-----------|---------|-------------|--------------|
| `PRUNE` | Panel button / Context menu / Delete key | Yes | passed |
| `REVIVE` | Panel button / Context menu | Yes | passed |
| `BRANCH` | Panel button / Context menu / B key | Yes | bypassed |
| `INJECT` | Context menu → Inject Sibling Node | Yes | bypassed |
| `DIRECT_CHAT` | Agent panel → Open Direct Channel → Send | Yes | passed |
| `EDIT_ARTIFACT` | Node Detail → Edit → Save | Yes | bypassed |
| `UPDATE_POLICY` | Policy Window → Add Rule / Toggle | Yes | passed |
| `APPLY` (proposal) | Policy Window → Approve Prune | Yes | passed |

### Demo Simulation

`demo-simulation.ts` contains 15 pre-scripted steps that fire over ~90 seconds using `setTimeout`. It directly calls Zustand store actions — no network requests. This design choice allows the demo to work with zero backend dependency, making it robust for live judging situations.

Steps:
1. Planner produces API specification
2. Planner marks task complete
3. Coder begins implementation
4. Reviewer starts parallel review
5. Reviewer branches into alternative approach
6. Coder v1 completes
7. Reviewer flags issue
8. Coder v2 begins
9. Evaluator proposes pruning stalled branch
10. Coder v2 completes
11. Tester begins
12. Test failures detected
13. Coder v3 fixes failures
14. All tests pass
15. Execution completes

---

## Backend Architecture

### API Endpoints

```python
# main.py — FastAPI app

GET  /health           # {"status": "ok", "timestamp": ...}
GET  /state            # Full execution STATE dict
POST /node/prune       # Body: {"node_id": str}
POST /node/revive      # Body: {"node_id": str}
POST /node/branch      # Body: {"from_node_id": str, "instruction": str}
POST /policy/toggle    # Body: {"rule_id": str}
POST /policy/add       # Body: {"text": str, "type": str}
GET  /state/export     # Download full STATE as JSON
POST /state/import     # Body: full STATE dict → broadcast state_sync
```

### WebSocket Events

```
Client → Server         Server → All Clients
─────────────────       ─────────────────────
connect                 clients_count (int)
disconnect              state_sync (full state)
                        node_updated (node delta)
                        policy_updated (rule delta)
```

### Data Persistence

The backend currently uses an in-memory Python dictionary for all state. This is intentional for the hackathon — it eliminates the SQLite setup overhead and makes the service stateless, which is appropriate for a demo environment. For production, the `STATE` dict would be serialized to SQLite using the already-installed `sqlalchemy` and `aiosqlite` packages.

---

## Deployment

| Service | Provider | URL |
|---------|----------|-----|
| Frontend | Vercel | `https://frontend-two-jet-32.vercel.app` |
| Backend | Render | `https://patchai.onrender.com` |
| Source | GitHub | `https://github.com/Rishet11/PatchAi` |

Build command (frontend): `npm run build`
Start command (backend): `uvicorn main:app --host 0.0.0.0 --port 8000`

---

## Key Design Decisions

**Why client-side simulation?**
The demo is entirely self-contained in `demo-simulation.ts`. This means: (a) it works even if the Render backend is cold-starting, (b) it is fully deterministic and repeatable for judging, (c) no latency jitter from network calls.

**Why Zustand over Redux?**
Zustand has ~1000x less boilerplate. With `subscribeWithSelector`, components only re-render when their specific slices change — critical for performance with real-time graph updates.

**Why Monaco Editor for artifacts?**
Every other tool in this space shows agent output as unformatted text. Monaco gives genuine VS Code syntax highlighting and inline editing with the same weight as an IDE — which makes the "edit a live AI agent's output" demo moment land properly.

**Why no glassmorphism?**
The design system is deliberately flat and monochromatic. Glassmorphism is a visual shortcut that signals AI-generated UI to experienced observers. The current brutalist, high-contrast palette reads as intentional and human-authored.
