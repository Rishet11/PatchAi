import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db import AuditLogModel, EdgeModel, NodeModel


PLAN_ARTIFACT = """# Task: Build a REST API for Task Management System

## Architecture Decision
- Framework: FastAPI (Python)
- Database: PostgreSQL with SQLAlchemy ORM
- Auth: JWT tokens
- Deployment: Docker
"""

CODE_ARTIFACT_V1 = """from fastapi import FastAPI
app = FastAPI()

@app.get("/tasks")
async def list_tasks():
    return []

# TODO: auth/login missing
# TODO: PUT/DELETE endpoints missing
"""

REVIEW_ARTIFACT = """## Code Review

- Authentication endpoint missing
- Input schema validation missing
- PUT / DELETE endpoints missing
"""

CODE_ARTIFACT_V2 = """from fastapi import FastAPI, Depends
app = FastAPI()

@app.post("/auth/login")
async def login():
    return {"access_token": "demo", "token_type": "bearer"}

@app.get("/tasks")
async def list_tasks():
    return {"tasks": []}

@app.post("/tasks")
async def create_task():
    return {"id": 1}

@app.put("/tasks/{task_id}")
async def update_task(task_id: int):
    return {"id": task_id}

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: int):
    return None
"""

TEST_ARTIFACT_V1 = """## Test Run Report
6 passed, 2 failed
- PUT /tasks/{id}: 422
- DELETE /tasks/{id}: 422
"""

TEST_ARTIFACT_V2 = """## Final Test Run Report
12 passed, 0 failed
Coverage: 94%
Ready for deployment
"""

EXPRESS_ARTIFACT = """// Alternative Express.js branch
// Branch stalled and is a prune candidate
"""


@dataclass
class RuntimeState:
    execution_id: Optional[str] = None
    task: str = ""
    status: str = "idle"
    started_at: Optional[float] = None
    simulation_task: Optional[asyncio.Task] = None
    evaluator_task: Optional[asyncio.Task] = None
    stop_event: asyncio.Event = field(default_factory=asyncio.Event)
    evaluator_proposals: list[dict[str, Any]] = field(default_factory=list)
    pending_proposal_by_branch: dict[str, str] = field(default_factory=dict)


class SimulationEngine:
    def __init__(self, session_factory: Any, sio: Any):
        self._session_factory = session_factory
        self._sio = sio
        self._runtime = RuntimeState()
        self._lock = asyncio.Lock()

    def snapshot(self) -> dict[str, Any]:
        return {
            "executionId": self._runtime.execution_id,
            "task": self._runtime.task,
            "status": self._runtime.status,
            "startedAt": self._runtime.started_at,
            "evaluator_proposals": self._runtime.evaluator_proposals,
        }

    async def start(self, task: str) -> dict[str, Any]:
        async with self._lock:
            await self._stop_locked("restarted")

            self._runtime.execution_id = f"exec-{int(time.time() * 1000)}"
            self._runtime.task = task
            self._runtime.status = "running"
            self._runtime.started_at = time.time() * 1000
            self._runtime.stop_event = asyncio.Event()
            self._runtime.evaluator_proposals = []
            self._runtime.pending_proposal_by_branch = {}

            execution_id = self._runtime.execution_id
            self._runtime.simulation_task = asyncio.create_task(self._run_simulation(execution_id))
            self._runtime.evaluator_task = asyncio.create_task(self._run_evaluator(execution_id))

        await self._emit_execution_status()
        return {
            "success": True,
            "executionId": self._runtime.execution_id,
            "status": self._runtime.status,
            "startedAt": self._runtime.started_at,
        }

    async def stop(self, reason: str = "stopped") -> dict[str, Any]:
        async with self._lock:
            await self._stop_locked(reason)
        await self._emit_execution_status()
        return {"success": True, "status": self._runtime.status}

    async def _stop_locked(self, reason: str) -> None:
        had_running_task = bool(self._runtime.simulation_task or self._runtime.evaluator_task)
        self._runtime.stop_event.set()

        for task in [self._runtime.simulation_task, self._runtime.evaluator_task]:
            if task and not task.done():
                task.cancel()

        for task in [self._runtime.simulation_task, self._runtime.evaluator_task]:
            if task:
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                except Exception:
                    pass

        self._runtime.simulation_task = None
        self._runtime.evaluator_task = None
        if had_running_task:
            self._runtime.status = "stopped" if reason != "completed" else "completed"
        elif self._runtime.status not in {"completed", "running"}:
            self._runtime.status = "idle"

    async def resolve_proposal(self, proposal_id: str, action: str) -> Optional[dict[str, Any]]:
        for proposal in self._runtime.evaluator_proposals:
            if proposal["id"] == proposal_id:
                proposal["status"] = action
                branch_id = proposal.get("targetBranchId")
                if branch_id and branch_id in self._runtime.pending_proposal_by_branch:
                    self._runtime.pending_proposal_by_branch.pop(branch_id, None)
                return proposal
        return None

    async def _wait_or_stop(self, delay_s: float) -> bool:
        try:
            await asyncio.wait_for(self._runtime.stop_event.wait(), timeout=delay_s)
            return True
        except asyncio.TimeoutError:
            return False

    async def _run_simulation(self, execution_id: str) -> None:
        try:
            steps = [
                (0.8, lambda: self._planner_step()),
                (2.0, lambda: self._coder_v1_step()),
                (3.0, lambda: self._review_step()),
                (2.5, lambda: self._branch_and_coder_v2_step()),
                (2.5, lambda: self._tester_v1_step()),
                (2.5, lambda: self._coder_fix_step()),
                (2.5, lambda: self._tester_final_step()),
            ]

            for delay_s, step in steps:
                if await self._wait_or_stop(delay_s):
                    return
                if execution_id != self._runtime.execution_id:
                    return
                await step()

            if execution_id == self._runtime.execution_id and not self._runtime.stop_event.is_set():
                self._runtime.status = "completed"
                self._runtime.stop_event.set()
                await self._emit_execution_status()
        except asyncio.CancelledError:
            return
        except Exception:
            self._runtime.status = "error"
            self._runtime.stop_event.set()
            await self._emit_execution_status()

    async def _run_evaluator(self, execution_id: str) -> None:
        try:
            while not self._runtime.stop_event.is_set():
                if await self._wait_or_stop(5):
                    return
                if execution_id != self._runtime.execution_id:
                    return
                await self._evaluate_stalled_branches()
        except asyncio.CancelledError:
            return

    async def _evaluate_stalled_branches(self) -> None:
        now_ms = time.time() * 1000
        async with self._session_factory() as db:
            node_res = await db.execute(select(NodeModel))
            nodes = [node for node in node_res.scalars().all() if node.status != "pruned"]

        if not nodes:
            return

        branch_stats: dict[str, dict[str, Any]] = {}
        for node in nodes:
            stat = branch_stats.setdefault(
                node.branchId,
                {"max_depth": -1, "latest_ts": 0.0, "latest_node_id": None},
            )
            stat["max_depth"] = max(stat["max_depth"], node.depth)
            if node.timestamp >= stat["latest_ts"]:
                stat["latest_ts"] = node.timestamp
                stat["latest_node_id"] = node.id

        fastest_depth = max(stat["max_depth"] for stat in branch_stats.values())

        for branch_id, stat in branch_stats.items():
            if branch_id == "main":
                continue
            if branch_id in self._runtime.pending_proposal_by_branch:
                continue

            stalled_ms = now_ms - stat["latest_ts"]
            depth_lag = fastest_depth - stat["max_depth"]
            if stalled_ms < 45_000 or depth_lag < 2:
                continue

            proposal_id = f"eval-{uuid.uuid4()}"
            proposal = {
                "id": proposal_id,
                "type": "prune",
                "targetNodeId": stat["latest_node_id"],
                "targetBranchId": branch_id,
                "rationale": "Branch stalled for >=45s and lags active branch depth by >=2.",
                "confidence": 0.79,
                "heuristic": "stalled_branch_depth_lag",
                "timestamp": now_ms,
                "status": "pending",
            }
            self._runtime.evaluator_proposals.insert(0, proposal)
            self._runtime.pending_proposal_by_branch[branch_id] = proposal_id
            await self._sio.emit("evaluator_proposal", proposal)

    async def _planner_step(self) -> None:
        planner = await self._upsert_node(
            {
                "id": "node-1",
                "parentId": None,
                "agent": "planner",
                "status": "completed",
                "artifactType": "plan",
                "title": "API Architecture Plan",
                "artifact": PLAN_ARTIFACT,
                "contextDelta": "Planner decomposed the task into architecture and endpoints.",
                "humanOverride": False,
                "evaluatorFlag": False,
                "timestamp": time.time() * 1000,
                "depth": 0,
                "branchId": "main",
                "metadata": {},
            }
        )
        await self._add_audit("node-1", "APPLY", "planner", "Planner produced architecture plan", "passed")
        await self._sio.emit("remote_node_updated", planner)

    async def _coder_v1_step(self) -> None:
        node = await self._upsert_node(
            {
                "id": "node-2",
                "parentId": "node-1",
                "agent": "coder",
                "status": "completed",
                "artifactType": "code",
                "title": "FastAPI Implementation v1",
                "artifact": CODE_ARTIFACT_V1,
                "contextDelta": "Initial implementation without complete auth and endpoints.",
                "humanOverride": False,
                "evaluatorFlag": False,
                "timestamp": time.time() * 1000,
                "depth": 1,
                "branchId": "main",
                "metadata": {},
            }
        )
        edge = await self._add_edge("node-1", "node-2", "default")
        await self._add_audit("node-2", "APPLY", "coder", "Initial FastAPI implementation submitted", "passed")
        await self._sio.emit("remote_node_updated", node)
        await self._sio.emit("remote_edge_added", edge)

    async def _review_step(self) -> None:
        node = await self._upsert_node(
            {
                "id": "node-3",
                "parentId": "node-2",
                "agent": "reviewer",
                "status": "completed",
                "artifactType": "review",
                "title": "Code Review — Issues Found",
                "artifact": REVIEW_ARTIFACT,
                "contextDelta": "Reviewer requested revision and suggested alternate branch.",
                "humanOverride": False,
                "evaluatorFlag": False,
                "timestamp": time.time() * 1000,
                "depth": 2,
                "branchId": "main",
                "metadata": {},
            }
        )
        edge = await self._add_edge("node-2", "node-3", "default")
        await self._add_audit("node-3", "APPLY", "reviewer", "Reviewer identified critical gaps", "passed")
        await self._sio.emit("remote_node_updated", node)
        await self._sio.emit("remote_edge_added", edge)

    async def _branch_and_coder_v2_step(self) -> None:
        stale_ts = (time.time() * 1000) - 60_000
        branch_node = await self._upsert_node(
            {
                "id": "node-4b",
                "parentId": "node-2",
                "agent": "coder",
                "status": "working",
                "artifactType": "code",
                "title": "Express.js Alternative",
                "artifact": EXPRESS_ARTIFACT,
                "contextDelta": "Reviewer-created alternate implementation branch.",
                "humanOverride": False,
                "evaluatorFlag": True,
                "timestamp": stale_ts,
                "depth": 2,
                "branchId": "branch-express",
                "metadata": {},
            }
        )
        branch_edge = await self._add_edge("node-2", "node-4b", "branch")
        await self._add_audit("node-4b", "BRANCH", "reviewer", "Reviewer proposed Express.js branch", "passed")

        main_node = await self._upsert_node(
            {
                "id": "node-4",
                "parentId": "node-3",
                "agent": "coder",
                "status": "completed",
                "artifactType": "code",
                "title": "FastAPI v2 — Auth + Full Endpoints",
                "artifact": CODE_ARTIFACT_V2,
                "contextDelta": "Coder fixed auth and completed endpoint coverage.",
                "humanOverride": False,
                "evaluatorFlag": False,
                "timestamp": time.time() * 1000,
                "depth": 3,
                "branchId": "main",
                "metadata": {},
            }
        )
        main_edge = await self._add_edge("node-3", "node-4", "default")
        await self._add_audit("node-4", "APPLY", "coder", "FastAPI v2 submitted", "passed")

        await self._sio.emit("remote_node_updated", branch_node)
        await self._sio.emit("remote_edge_added", branch_edge)
        await self._sio.emit("remote_node_updated", main_node)
        await self._sio.emit("remote_edge_added", main_edge)

    async def _tester_v1_step(self) -> None:
        node = await self._upsert_node(
            {
                "id": "node-5",
                "parentId": "node-4",
                "agent": "tester",
                "status": "completed",
                "artifactType": "test_report",
                "title": "Test Run — 2 Failures",
                "artifact": TEST_ARTIFACT_V1,
                "contextDelta": "Tester found failures in PUT and DELETE paths.",
                "humanOverride": False,
                "evaluatorFlag": False,
                "timestamp": time.time() * 1000,
                "depth": 4,
                "branchId": "main",
                "metadata": {},
            }
        )
        edge = await self._add_edge("node-4", "node-5", "default")
        await self._add_audit("node-5", "APPLY", "tester", "Tester reported 2 failures", "passed")
        await self._sio.emit("remote_node_updated", node)
        await self._sio.emit("remote_edge_added", edge)

    async def _coder_fix_step(self) -> None:
        node = await self._upsert_node(
            {
                "id": "node-6",
                "parentId": "node-5",
                "agent": "coder",
                "status": "completed",
                "artifactType": "code",
                "title": "Fix: Validation + Fixtures",
                "artifact": "Fixed fixture auth headers and partial update validation.",
                "contextDelta": "Coder resolved test fixture + validation defects.",
                "humanOverride": False,
                "evaluatorFlag": False,
                "timestamp": time.time() * 1000,
                "depth": 5,
                "branchId": "main",
                "metadata": {},
            }
        )
        edge = await self._add_edge("node-5", "node-6", "default")
        await self._add_audit("node-6", "APPLY", "coder", "Coder fixed failing tests", "passed")
        await self._sio.emit("remote_node_updated", node)
        await self._sio.emit("remote_edge_added", edge)

    async def _tester_final_step(self) -> None:
        node = await self._upsert_node(
            {
                "id": "node-7",
                "parentId": "node-6",
                "agent": "tester",
                "status": "completed",
                "artifactType": "test_report",
                "title": "All Tests Pass — 94% Coverage",
                "artifact": TEST_ARTIFACT_V2,
                "contextDelta": "Final validation succeeded; deployment ready.",
                "humanOverride": False,
                "evaluatorFlag": False,
                "timestamp": time.time() * 1000,
                "depth": 6,
                "branchId": "main",
                "metadata": {},
            }
        )
        edge = await self._add_edge("node-6", "node-7", "default")
        await self._add_audit("node-7", "APPLY", "tester", "All tests passing with 94% coverage", "passed")
        await self._sio.emit("remote_node_updated", node)
        await self._sio.emit("remote_edge_added", edge)

    async def _upsert_node(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with self._session_factory() as db:
            db_node = await db.get(NodeModel, payload["id"])
            if not db_node:
                db_node = NodeModel(
                    id=payload["id"],
                    parentId=payload["parentId"],
                    agent=payload["agent"],
                    status=payload["status"],
                    artifactType=payload["artifactType"],
                    title=payload["title"],
                    artifact=payload["artifact"],
                    contextDelta=payload["contextDelta"],
                    humanOverride=payload["humanOverride"],
                    evaluatorFlag=payload["evaluatorFlag"],
                    timestamp=payload["timestamp"],
                    depth=payload["depth"],
                    branchId=payload["branchId"],
                    metadata_json=payload["metadata"],
                )
                db.add(db_node)
            else:
                db_node.parentId = payload["parentId"]
                db_node.agent = payload["agent"]
                db_node.status = payload["status"]
                db_node.artifactType = payload["artifactType"]
                db_node.title = payload["title"]
                db_node.artifact = payload["artifact"]
                db_node.contextDelta = payload["contextDelta"]
                db_node.humanOverride = payload["humanOverride"]
                db_node.evaluatorFlag = payload["evaluatorFlag"]
                db_node.timestamp = payload["timestamp"]
                db_node.depth = payload["depth"]
                db_node.branchId = payload["branchId"]
                db_node.metadata_json = payload["metadata"]
            await db.commit()

        return payload

    async def _add_edge(self, source: str, target: str, edge_type: str) -> dict[str, Any]:
        edge_id = f"e-{source}-{target}"
        payload = {
            "id": edge_id,
            "source": source,
            "target": target,
            "type": edge_type,
            "animated": edge_type != "default",
        }
        async with self._session_factory() as db:
            db_edge = await db.get(EdgeModel, edge_id)
            if not db_edge:
                db.add(
                    EdgeModel(
                        id=edge_id,
                        source=source,
                        target=target,
                        type=edge_type,
                        animated=edge_type != "default",
                    )
                )
                await db.commit()
        return payload

    async def _add_audit(self, node_id: Optional[str], operation: str, actor: str, details: str, policy_check: str) -> None:
        audit = {
            "id": str(uuid.uuid4()),
            "nodeId": node_id,
            "operation": operation,
            "actor": actor,
            "timestamp": time.time() * 1000,
            "success": True,
            "details": details,
            "policyCheck": policy_check,
        }
        async with self._session_factory() as db:
            db.add(
                AuditLogModel(
                    id=audit["id"],
                    nodeId=audit["nodeId"],
                    operation=audit["operation"],
                    actor=audit["actor"],
                    timestamp=audit["timestamp"],
                    success=audit["success"],
                    details=audit["details"],
                    policyCheck=audit["policyCheck"],
                )
            )
            await db.commit()
        await self._sio.emit("node_updated", {"nodeId": node_id, "operation": operation, "audit": audit})

    async def _emit_execution_status(self) -> None:
        await self._sio.emit(
            "execution_status",
            {
                "executionId": self._runtime.execution_id,
                "status": self._runtime.status,
                "task": self._runtime.task,
                "startedAt": self._runtime.started_at,
            },
        )
