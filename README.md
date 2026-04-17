# Patch.AI

> **Real-Time Multi-Agent Orchestration Control Plane**
> 
> *Built for HackDUCS Hackathon — Sankalan 2026, Dept. of Computer Science, University of Delhi*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-frontend--two--jet--32.vercel.app-6366f1?style=for-the-badge)](https://frontend-two-jet-32.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

---

## 🧠 What is Patch.AI?

**Patch.AI is the first platform that treats a multi-agent AI system's execution history as a live, mutable state graph** — a first-class artifact that the human operator can inspect, edit, branch, prune, and reshape at any node, at any time, during live execution.

### The Problem

Today, when you run multiple AI agents together (one writes code, another reviews, another tests), you face a fundamental choice:

| Option | Tools | Problem |
|--------|-------|---------|
| **Pre-compile graphs** | LangGraph, CrewAI | Can't modify during live execution |
| **Let agents decide** | OpenAI Agents SDK, AutoGen | Zero visibility or control |

Neither option lets you treat the **execution trace itself as editable, living state**.

### The Solution

Patch.AI fills this gap with **five integrated views**:

1. 🕸️ **Live State Graph** — Real-time directed graph of the entire execution history
2. 🔍 **Node Detail Panel** — Inspect any node's artifact, context delta, and audit log
3. 🤖 **Agent Window** — Monitor all agents, chat with them directly, force stop/restart
4. 📜 **Workflow Policy Window** — Live governance rules with toggle controls and evolution history
5. 📋 **Audit Log** — Immutable, timestamped record of every operation with policy check results

### Key Differentiators

- **Any-node, any-time HITL**: Not breakpoints — surgical intervention anywhere, live
- **Mutable workflow policy**: Governance rules that evolve at runtime with full audit trail
- **Evaluator-driven pruning**: AI evaluator proposes branch culling; human retains override authority
- **Branch revival**: Revive any pruned branch at any time — a primitive that exists nowhere else
- **Incremental context graph**: Each node stores only a delta, enabling efficient retrieval and perfect auditability

---

## 🚀 Live Demo

**[→ Open Patch.AI Dashboard](https://frontend-two-jet-32.vercel.app)**

Click **"▶ Start Demo"** in the top bar to watch a complete multi-agent coding workflow unfold in real-time.

**Demo Scenario**: "Build a REST API for Task Management"
- 🧠 Planner → produces API architecture
- 💻 Coder → implements FastAPI endpoints (v1 → v2)
- 🔍 Reviewer → reviews code, opens parallel branch
- ⚖️ Evaluator → proposes pruning the stalling branch
- 🧪 Tester → runs tests, finds failures, fixes them
- **You can intervene at any point**: prune, revive, branch, edit

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 15** (App Router) | React framework |
| **React Flow** (`@xyflow/react`) | Interactive graph visualization |
| **Zustand** | State management |
| **Dagre** | Auto-layout for DAG graphs |
| **Framer Motion** | Animations |
| **Inter + JetBrains Mono** | Typography |

### Backend
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | REST API server |
| **Socket.io** (python-socketio) | Real-time WebSocket events |
| **SQLAlchemy + SQLite** | State persistence |
| **Pydantic** | Data validation |
| **Uvicorn** | ASGI server |

---

## 🏃‍♂️ Running Locally

### Prerequisites
- Node.js 18+ (`node --version`)
- Python 3.9+ (`python3 --version`)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
# → http://localhost:8000
```

### Environment Variables (optional)
```env
# frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## 📁 Project Structure

```
patch-ai/
├── frontend/                  # Next.js app
│   └── src/
│       ├── app/               # App router pages + global CSS
│       ├── components/
│       │   ├── graph/         # React Flow graph + custom nodes
│       │   ├── panels/        # Node, Agent, Policy, Audit panels
│       │   └── layout/        # StatusBar, Sidebar, Onboarding
│       ├── store/             # Zustand global state store
│       └── lib/               # Types, constants, simulation engine
│
├── backend/                   # FastAPI server
│   ├── main.py                # API endpoints + Socket.io server
│   └── requirements.txt
│
└── README.md
```

---

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  Live State Graph │ Node Panel │ Agent Win │ Policy  │
│          Zustand State Store (real-time)             │
└────────────────────┬────────────────────────────────┘
                     │ REST + WebSocket
┌────────────────────┴────────────────────────────────┐
│                    BACKEND                           │
│  State Graph Owner (SGO) — Policy Enforcement        │
│  Agent Simulator — Scripted demo execution           │
│  Heuristic Evaluator — Branch quality monitoring     │
│  SQLite — Audit log + state persistence              │
└─────────────────────────────────────────────────────┘
```

The **State Graph Owner (SGO)** is a deterministic, non-intelligent policy enforcement component — every state change goes through it, and every decision is logged. This design provides a clean, auditable governance layer.

---

## 🏆 Hackathon

This project was built for **HackDUCS — Sankalan 2026**, organized by the Department of Computer Science, University of Delhi.

- **Domain**: AI/ML + Open Innovation
- **Team**: Patch.AI
- **Built After**: April 15, 2026 ✅

---

## 📄 License

MIT License — see [LICENSE](LICENSE)
