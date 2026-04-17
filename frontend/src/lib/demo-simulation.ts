'use client';

// ==========================================
// Patch.AI — Demo Simulation Engine
// Scripted multi-agent execution sequence
// that looks realistic and showcases ALL core features
// ==========================================

import { GraphNode, GraphEdge, AgentState, EvaluatorProposal } from '@/lib/types';
import { usePatchAIStore } from '@/store/patchai';

const PLAN_ARTIFACT = `# Task: Build a REST API for Task Management System

## Architecture Decision
- Framework: FastAPI (Python)
- Database: PostgreSQL with SQLAlchemy ORM
- Auth: JWT tokens
- Deployment: Docker + Kubernetes

## Endpoints
1. POST /tasks — Create task
2. GET /tasks — List tasks (with pagination)
3. GET /tasks/{id} — Get task by ID
4. PUT /tasks/{id} — Update task
5. DELETE /tasks/{id} — Delete task
6. POST /auth/login — Authenticate user

## Agent Assignments
- Coder: Implement FastAPI app + models
- Reviewer: Code review (security + quality)
- Tester: Write pytest suite

## Success Criteria
✓ All endpoints return correct HTTP codes
✓ Auth middleware validates JWT
✓ 90%+ test coverage
✓ Response time < 200ms`;

const CODE_ARTIFACT_V1 = `from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
import uvicorn

app = FastAPI(title="Task Management API", version="1.0.0")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Database setup
from database import get_db, engine
from models import Base, Task, User
Base.metadata.create_all(bind=engine)

@app.post("/tasks", status_code=201)
async def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**task_data.dict())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@app.get("/tasks")
async def list_tasks(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    tasks = db.query(Task).offset(skip).limit(limit).all()
    return {"tasks": tasks, "total": db.query(Task).count()}

@app.get("/tasks/{task_id}")
async def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

# TODO: Auth middleware not implemented yet
# TODO: Update/Delete endpoints missing`;

const REVIEW_ARTIFACT = `## Code Review — Coder Agent v1

### Critical Issues 🚨
1. **Authentication NOT implemented** — auth/login endpoint is missing entirely
2. **No input validation** — TaskCreate schema not defined
3. **Missing DELETE/PUT endpoints** — spec requires all 6 endpoints

### Security Issues 🔐
1. JWT verification is missing (oauth2_scheme defined but never used)
2. No rate limiting configured
3. SQL injection risk — raw query parameters not sanitized

### Code Quality 📝
1. Good: Pagination implemented correctly
2. Good: Status codes are correct
3. Missing: Error handling for DB connection failures
4. Missing: Docstrings/OpenAPI descriptions

### Recommendation
Send back to Coder for critical fixes before testing.
Suggest parallel branch: Express.js alternative implementation.

**Verdict: ❌ REQUIRES REVISION**`;

const CODE_ARTIFACT_V2 = `from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uvicorn

# ====== App Setup ======
app = FastAPI(title="Task Management API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"])

SECRET_KEY = "patch-ai-demo-secret"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# ====== Schemas ======
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: int = 1
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None

# ====== Auth ======
def create_access_token(data: dict):
    expires = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.id == payload.get("sub")).first()
        if not user: raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# ====== Endpoints ======
@app.post("/auth/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not pwd_context.verify(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect credentials")
    return {"access_token": create_access_token({"sub": str(user.id)}), "token_type": "bearer"}

@app.post("/tasks", status_code=201)
async def create_task(task: TaskCreate, db: Session = Depends(get_db), user = Depends(get_current_user)):
    db_task = Task(**task.dict(), owner_id=user.id)
    db.add(db_task); db.commit(); db.refresh(db_task)
    return db_task

@app.get("/tasks", response_model=List[dict])
async def list_tasks(skip: int = 0, limit: int = 10, db: Session = Depends(get_db), user = Depends(get_current_user)):
    tasks = db.query(Task).filter(Task.owner_id == user.id).offset(skip).limit(limit).all()
    return {"tasks": tasks, "total": db.query(Task).filter(Task.owner_id == user.id).count()}

@app.get("/tasks/{task_id}")
async def get_task(task_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.owner_id == user.id).first()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.put("/tasks/{task_id}")
async def update_task(task_id: int, updates: TaskUpdate, db: Session = Depends(get_db), user = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.owner_id == user.id).first()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    for k, v in updates.dict(exclude_none=True).items():
        setattr(task, k, v)
    db.commit(); db.refresh(task)
    return task

@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.owner_id == user.id).first()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task); db.commit()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)`;

const TEST_ARTIFACT_V1 = `## Test Run Report — v1 (Coder v2 code)

**Test Suite: pytest tests/ -v**
**Timestamp:** ${new Date().toISOString()}

\`\`\`
============================= test session starts ==============================
tests/test_auth.py::test_login_success                 PASSED    [ 14%]
tests/test_auth.py::test_login_invalid_credentials     PASSED    [ 28%]
tests/test_auth.py::test_token_expiry                  PASSED    [ 42%]
tests/test_tasks.py::test_create_task                  PASSED    [ 57%]
tests/test_tasks.py::test_list_tasks_pagination        PASSED    [ 71%]
tests/test_tasks.py::test_get_task_not_found           PASSED    [ 85%]
tests/test_tasks.py::test_update_task                  FAILED    [ 92%]
tests/test_tasks.py::test_delete_task                  FAILED    [100%]

=============================== FAILURES =======================================
FAILED tests/test_tasks.py::test_update_task - AssertionError: 422 != 200
FAILED tests/test_tasks.py::test_delete_task - AssertionError: 422 != 204

============================== short test summary ==============================
FAILED tests/test_tasks.py::test_update_task
FAILED tests/test_tasks.py::test_delete_task

6 passed, 2 failed in 3.47s
\`\`\`

**Coverage: 75%** — Below 90% target
**Issues Found:**
- PUT /tasks/{id} — Pydantic validation error on partial update
- DELETE /tasks/{id} — Auth header not passed in test fixture

**Verdict: ⚠️ PARTIAL PASS — 2 tests failing**`;

const TEST_ARTIFACT_V2 = `## Test Run Report — v2 (Final)

**Test Suite: pytest tests/ -v --cov=app**
**Timestamp:** ${new Date().toISOString()}

\`\`\`
============================= test session starts ==============================
tests/test_auth.py::test_login_success                 PASSED    [ 10%]
tests/test_auth.py::test_login_invalid_credentials     PASSED    [ 20%]
tests/test_auth.py::test_token_expiry                  PASSED    [ 30%]
tests/test_auth.py::test_refresh_token                 PASSED    [ 40%]
tests/test_tasks.py::test_create_task                  PASSED    [ 50%]
tests/test_tasks.py::test_list_tasks_pagination        PASSED    [ 60%]
tests/test_tasks.py::test_get_task                     PASSED    [ 70%]
tests/test_tasks.py::test_get_task_not_found           PASSED    [ 75%]
tests/test_tasks.py::test_update_task                  PASSED    [ 80%]
tests/test_tasks.py::test_delete_task                  PASSED    [ 90%]
tests/test_tasks.py::test_unauthorized_access          PASSED    [ 95%]
tests/test_tasks.py::test_cross_user_isolation         PASSED    [100%]

============================== 12 passed in 4.82s ==============================
\`\`\`

**Coverage: 94%** ✅ Exceeds 90% target
**Performance:**
- Average response time: 47ms ✅ (target < 200ms)
- P95 response time: 112ms ✅

**Security Tests:**
- JWT forgery attempt: BLOCKED ✅
- SQL injection attempt: BLOCKED ✅ 
- Unauthorized cross-user access: BLOCKED ✅

**Verdict: ✅ ALL TESTS PASS — Ready for deployment**`;

const EXPRESS_CODE_ARTIFACT = `// Alternative: Express.js Implementation
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SECRET = process.env.JWT_SECRET || 'patch-ai-secret';

// Middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!rows[0] || !await bcrypt.compare(password, rows[0].password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId: rows[0].id }, SECRET, { expiresIn: '30m' });
  res.json({ access_token: token, token_type: 'bearer' });
});

// Note: This branch was PRUNED by evaluator (stalling, FastAPI branch advancing faster)
// Branch can be revived if FastAPI approach fails
module.exports = app;`;

type SimStep = {
  delay: number;
  action: () => void;
};

export class DemoSimulation {
  private store = usePatchAIStore.getState;
  private set = usePatchAIStore.setState;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private startTime = Date.now();

  private node(id: string, parentId: string | null, agent: GraphNode['agent'], title: string, artifactType: GraphNode['artifactType'], artifact: string, branchId = 'main', depth = 0, overrides: Partial<GraphNode> = {}): GraphNode {
    return {
      id,
      parentId,
      agent,
      status: 'working',
      artifactType,
      title,
      artifact,
      contextDelta: artifact.substring(0, 120) + '...',
      humanOverride: false,
      evaluatorFlag: false,
      timestamp: Date.now(),
      depth,
      branchId,
      metadata: {},
      ...overrides,
    };
  }

  private edge(source: string, target: string, type: GraphEdge['type'] = 'default'): GraphEdge {
    return {
      id: `e-${source}-${target}`,
      source,
      target,
      type,
      animated: type !== 'default',
    };
  }

  private schedule(steps: SimStep[]) {
    steps.forEach(({ delay, action }) => {
      const timer = setTimeout(action, delay);
      this.timers.push(timer);
    });
  }

  stop() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  run() {
    const store = usePatchAIStore;
    this.startTime = Date.now();

    this.schedule([
      // ─── Step 1: Start execution ─────────────────────────────────────
      {
        delay: 500,
        action: () => {
          store.getState().startExecution('Build a REST API for a Task Management System');
          store.getState().addNotification({
            type: 'info',
            title: 'Execution Started',
            message: 'Planner agent is analyzing the task...',
          });
          store.getState().updateAgent('planner', { status: 'working', lastActive: Date.now() });
        },
      },

      // ─── Step 2: Planner produces plan ───────────────────────────────
      {
        delay: 2000,
        action: () => {
          const node = this.node('node-1', null, 'planner', 'API Architecture Plan', 'plan', PLAN_ARTIFACT, 'main', 0);
          store.getState().addNode({ ...node, status: 'completed' });
          store.getState().updateAgent('planner', { status: 'finished', currentNodeId: 'node-1', totalProposals: 1, acceptedProposals: 1 });
          store.getState().updateAgent('coder', { status: 'working' });
          store.getState().addAuditEntry({ nodeId: 'node-1', operation: 'APPLY', actor: 'planner', success: true, details: 'Planner produced API architecture plan', policyCheck: 'passed', timestamp: Date.now() });
          store.getState().addNotification({ type: 'success', title: 'Planner Complete', message: 'API architecture plan ready. Coder agent starting...' });
        },
      },

      // ─── Step 3: Coder V1 ────────────────────────────────────────────
      {
        delay: 4500,
        action: () => {
          const node = this.node('node-2', 'node-1', 'coder', 'FastAPI Implementation v1', 'code', CODE_ARTIFACT_V1, 'main', 1);
          store.getState().addNode(node);
          store.getState().addEdge(this.edge('node-1', 'node-2'));
          store.getState().updateAgent('coder', { currentNodeId: 'node-2', totalProposals: 1 });
        },
      },

      // ─── Step 4: Coder v1 completes ──────────────────────────────────
      {
        delay: 6500,
        action: () => {
          store.getState().updateNode('node-2', { status: 'completed' });
          store.getState().updateAgent('coder', { acceptedProposals: 1 });
          store.getState().updateAgent('reviewer', { status: 'working' });
          store.getState().addAuditEntry({ nodeId: 'node-2', operation: 'APPLY', actor: 'coder', success: true, details: 'Initial FastAPI implementation submitted', policyCheck: 'passed', timestamp: Date.now() });
        },
      },

      // ─── Step 5: Reviewer starts review ──────────────────────────────
      {
        delay: 8500,
        action: () => {
          const node = this.node('node-3', 'node-2', 'reviewer', 'Code Review — Issues Found', 'review', REVIEW_ARTIFACT, 'main', 2);
          store.getState().addNode(node);
          store.getState().addEdge(this.edge('node-2', 'node-3'));
          store.getState().updateAgent('reviewer', { currentNodeId: 'node-3', totalProposals: 1 });
        },
      },

      // ─── Step 6: Reviewer proposes BRANCH (Express.js alternative) ───
      {
        delay: 10500,
        action: () => {
          store.getState().updateNode('node-3', { status: 'completed' });
          store.getState().updateAgent('reviewer', { acceptedProposals: 1, status: 'working' });
          // Start Express.js branch
          const branchNode = this.node('node-4b', 'node-2', 'coder', 'Express.js Alternative', 'code', EXPRESS_CODE_ARTIFACT, 'branch-express', 2, {});
          store.getState().addNode(branchNode);
          store.getState().addEdge(this.edge('node-2', 'node-4b', 'branch'));
          store.getState().addAuditEntry({ nodeId: 'node-4b', operation: 'BRANCH', actor: 'reviewer', success: true, details: 'Reviewer proposed parallel Express.js implementation branch', policyCheck: 'passed', timestamp: Date.now() });
          store.getState().addNotification({ type: 'info', title: 'Branch Created', message: 'Reviewer opened parallel Express.js alternative branch' });
        },
      },

      // ─── Step 7: Coder fixes issues (main branch) ────────────────────
      {
        delay: 12500,
        action: () => {
          const node = this.node('node-4', 'node-3', 'coder', 'FastAPI v2 — Auth + Full Endpoints', 'code', CODE_ARTIFACT_V2, 'main', 3);
          store.getState().addNode(node);
          store.getState().addEdge(this.edge('node-3', 'node-4'));
          store.getState().updateAgent('coder', { currentNodeId: 'node-4', totalProposals: 2 });
          store.getState().updateAgent('reviewer', { status: 'idle' });
        },
      },

      // ─── Step 8: Coder v2 completes ──────────────────────────────────
      {
        delay: 15500,
        action: () => {
          store.getState().updateNode('node-4', { status: 'completed' });
          store.getState().updateAgent('coder', { acceptedProposals: 2 });
          store.getState().updateAgent('tester', { status: 'working' });
          store.getState().addAuditEntry({ nodeId: 'node-4', operation: 'APPLY', actor: 'coder', success: true, details: 'FastAPI v2 with complete auth and all endpoints submitted', policyCheck: 'passed', timestamp: Date.now() });
        },
      },

      // ─── Step 9: Express branch stalls → Evaluator proposal ──────────
      {
        delay: 17000,
        action: () => {
          store.getState().updateNode('node-4b', { status: 'error', evaluatorFlag: true });
          const proposal: EvaluatorProposal = {
            id: 'eval-1',
            type: 'prune',
            targetNodeId: 'node-4b',
            targetBranchId: 'branch-express',
            rationale: 'Express.js branch has stalled for 8 minutes with no new proposals. Main FastAPI branch is at depth 3 and advancing rapidly. Resource allocation suggests pruning this branch.',
            confidence: 0.79,
            heuristic: 'Progress stall + comparative branch velocity',
            timestamp: Date.now(),
            status: 'pending',
          };
          store.getState().addEvaluatorProposal(proposal);
          store.getState().addNotification({
            type: 'evaluator_proposal',
            title: '⚖️ Evaluator Proposal',
            message: 'Express.js branch stalling — 79% confidence prune recommended',
            actionData: { proposalId: 'eval-1', nodeId: 'node-4b' },
          });
          store.getState().updateStats({ pendingProposals: 1 });
        },
      },

      // ─── Step 10: Tester runs tests (partial fail) ───────────────────
      {
        delay: 18000,
        action: () => {
          const node = this.node('node-5', 'node-4', 'tester', 'Test Run — 2 Failures', 'test_report', TEST_ARTIFACT_V1, 'main', 4);
          store.getState().addNode(node);
          store.getState().addEdge(this.edge('node-4', 'node-5'));
          store.getState().updateAgent('tester', { currentNodeId: 'node-5', totalProposals: 1 });
        },
      },

      // ─── Step 11: Tester reports failures ────────────────────────────
      {
        delay: 21000,
        action: () => {
          store.getState().updateNode('node-5', { status: 'completed' });
          store.getState().updateAgent('tester', { acceptedProposals: 1 });
          store.getState().updateAgent('coder', { status: 'working' });
          store.getState().addNotification({ type: 'approval_required', title: 'Tests Failing', message: '2 test failures in PUT/DELETE endpoints — Coder working on fix' });
        },
      },

      // ─── Step 12: Coder fixes test failures ──────────────────────────
      {
        delay: 23000,
        action: () => {
          const node = this.node('node-6', 'node-5', 'coder', 'Fix: Test Fixture + Pydantic Validation', 'code', '# Test fixture fix\n@pytest.fixture\ndef auth_headers(client, test_user):\n    resp = client.post("/auth/login", data={"username": test_user.email, "password": "testpass"})\n    token = resp.json()["access_token"]\n    return {"Authorization": f"Bearer {token}"}\n\n# Pydantic v2 partial update fix\nclass TaskUpdate(BaseModel):\n    model_config = ConfigDict(extra="ignore")\n    title: Optional[str] = None\n    description: Optional[str] = None\n    completed: Optional[bool] = None\n\n    @model_validator(mode="before")\n    def at_least_one_field(cls, v):\n        if not any(v.values()):\n            raise ValueError("At least one field required")\n        return v', 'main', 5);
          store.getState().addNode(node);
          store.getState().addEdge(this.edge('node-5', 'node-6'));
          store.getState().updateAgent('coder', { currentNodeId: 'node-6', totalProposals: 3 });
          store.getState().addAuditEntry({ nodeId: 'node-6', operation: 'APPLY', actor: 'coder', success: true, details: 'Fixed test fixture auth headers and Pydantic v2 partial update validation', policyCheck: 'passed', timestamp: Date.now() });
        },
      },

      // ─── Step 13: Coder fix completes ────────────────────────────────
      {
        delay: 26000,
        action: () => {
          store.getState().updateNode('node-6', { status: 'completed' });
          store.getState().updateAgent('coder', { acceptedProposals: 3 });
          store.getState().updateAgent('tester', { status: 'working' });
        },
      },

      // ─── Step 14: Final test run — ALL PASS ──────────────────────────
      {
        delay: 28000,
        action: () => {
          const node = this.node('node-7', 'node-6', 'tester', '✅ All Tests Pass — 94% Coverage', 'test_report', TEST_ARTIFACT_V2, 'main', 6);
          store.getState().addNode({ ...node, status: 'working' });
          store.getState().addEdge(this.edge('node-6', 'node-7'));
          store.getState().updateAgent('tester', { currentNodeId: 'node-7', totalProposals: 2 });
        },
      },

      // ─── Step 15: Final completion ────────────────────────────────────
      {
        delay: 31000,
        action: () => {
          store.getState().updateNode('node-7', { status: 'completed' });
          store.getState().updateAgent('tester', { acceptedProposals: 2, status: 'finished' });
          store.getState().addNotification({
            type: 'success',
            title: '🎉 Execution Complete',
            message: 'All 12 tests passing. 94% coverage. API ready for deployment.',
          });
          store.getState().addAuditEntry({ nodeId: 'node-7', operation: 'APPLY', actor: 'tester', success: true, details: 'All 12 tests passing, 94% coverage achieved', policyCheck: 'passed', timestamp: Date.now() });
          store.setState({ status: 'completed' });
          store.getState().setDemoRunning(false);
        },
      },
    ]);
  }
}

export const demoSim = new DemoSimulation();
