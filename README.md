# Patch.AI

> **An execution state graph and control plane for multi-agent workflows.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-patch--ai.vercel.app-6366f1?style=for-the-badge)](https://patch-ai.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

---

## Motivation

Patch.AI treats a multi-agent system's execution history as a mutable state graph. It addresses a core observability issue in current agent orchestration: operators lack visibility into autonomous processes and cannot directly modify execution traces at runtime without implementing rigid checkpoints or breakpoints.

### Problem Statement

When operating multi-agent systems, developers typically encounter two structural limitations:

| Paradigm | Tools | Limitation |
|----------|-------|------------|
| **Pre-compiled graphs** | LangGraph, CrewAI | Workflows are static; unable to mutate execution branches dynamically. |
| **Autonomous execution** | OpenAI Agents SDK, AutoGen | Lack of granular operational visibility constraints real-time intervention. |

Neither approach exposes the execution trace as an editable state object.

### Interface Overview

Patch.AI implements five core views to solve this:

1. **State Graph Viewer**: Directed acyclic graph visualization of the execution history.
2. **Node Inspector**: Interface to inspect output artifacts, state context deltas, and audit logs per node.
3. **Agent Manager**: Overview of agent statuses, process tracking, and interrupt controls.
4. **Policy Configuration**: Runtime toggle controls for workflow governance and intervention heuristics.
5. **Audit Trail**: Immutable record of all graph operations and policy validations.

### Capabilities

- **Arbitrary Intervention**: Operators can prune, revive, or branch execution from any node during runtime.
- **Dynamic Governance**: Workflow policies can be mutated mid-execution with corresponding audit logging.
- **Heuristic Pruning**: The evaluation layer flags stalling branches for culling, maintaining operator override precedence.
- **Delta Context Tracking**: Graph nodes store incremental context deltas rather than full state, optimizing retrieval.

---

## Live Application

**[→ Access deployment](https://patch-ai.vercel.app)**

Click "Start Demo" in the navigation bar to output a simulated multi-agent execution trace. 

**Default Scenario**: Building an API
- Planner agent produces architectural specification.
- Coder agent implements endpoint logic.
- Reviewer agent flags issues and initiates a parallel execution branch.
- Evaluator heuristic flags a stalling branch for manual pruning.
- Tester agent executes the validation suite.

---

## Technical Stack

### Client
| Dependency | Implementation |
|-----------|---------|
| **Next.js 15** | Application routing |
| **@xyflow/react** | Graph visualization wrapper |
| **Zustand** | Global state management |
| **Dagre** | Directed graph auto-layout algorithms |

### Server
| Dependency | Implementation |
|-----------|---------|
| **FastAPI** | REST controllers |
| **python-socketio** | WebSocket event handling |
| **SQLAlchemy** | Database ORM |
| **SQLite** | State persistence |
| **Pydantic** | Schema validation |

---

## Local Development

### Requirements
- Node.js >= 18.0
- Python >= 3.9

### Client Setup
```bash
cd frontend
npm install
npm run dev
# Active on port 3000
```

### Server Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
# Active on port 8000
```

### Configuration
```env
# frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## System Architecture

```text
┌─────────────────────────────────────────────────────┐
│                    CLIENT                           │
│  Graph View │ Node Inspector │ Agent Map │ Policy │
│                 Zustand Store                       │
└────────────────────┬────────────────────────────────┘
                     │ HTTP + WSS
┌────────────────────┴────────────────────────────────┐
│                    SERVER                           │
│  State Graph Owner (SGO) — Policy Enforcement       │
│  Task Simulator — Demo execution handler            │
│  Heuristic Evaluator — Quality metric thresholding  │
│  SQLite Db — Persistence layer                      │
└─────────────────────────────────────────────────────┘
```

The **State Graph Owner (SGO)** acts as the definitive policy enforcer. All state mutations are validated against the current SGO ruleset and written to the audit log prior to execution.

## License

MIT License — see [LICENSE](LICENSE)
