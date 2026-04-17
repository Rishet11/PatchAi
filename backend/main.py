"""
Patch.AI Backend — FastAPI + Socket.io Server
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import uvicorn
import json
import time
import uuid
from typing import Optional
from pydantic import BaseModel

# ─── App Setup ────────────────────────────────────────────────
app = FastAPI(
    title="Patch.AI API",
    description="Multi-Agent Orchestration Control Plane Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.io with CORS
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25,
)

# ASGI combined app
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


# ─── In-Memory State ──────────────────────────────────────────
STATE = {
    "nodes": {},
    "edges": [],
    "agents": {},
    "policy": [],
    "audit_log": [],
    "status": "idle",
    "task": "",
}


# ─── Pydantic Models ──────────────────────────────────────────
class NodeOperation(BaseModel):
    nodeId: str
    operation: str  # PRUNE | REVIVE | BRANCH | EDIT_ARTIFACT
    actor: str = "human"
    data: Optional[dict] = None


class PolicyOperation(BaseModel):
    ruleId: Optional[str] = None
    action: str  # TOGGLE | ADD | DELETE
    text: Optional[str] = None


class StartExecution(BaseModel):
    task: str


# ─── REST Endpoints ───────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Patch.AI Backend Online", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"healthy": True, "timestamp": time.time()}


@app.get("/state")
def get_state():
    return STATE


@app.post("/execution/start")
async def start_execution(body: StartExecution):
    STATE["status"] = "running"
    STATE["task"] = body.task
    STATE["nodes"] = {}
    STATE["edges"] = []
    STATE["audit_log"] = []
    await sio.emit("execution_started", {"task": body.task})
    return {"success": True, "executionId": str(uuid.uuid4())}


@app.post("/execution/stop")
async def stop_execution():
    STATE["status"] = "stopped"
    await sio.emit("execution_stopped", {})
    return {"success": True}


@app.post("/nodes/operation")
async def node_operation(body: NodeOperation):
    nodeId = body.nodeId
    op = body.operation

    audit_entry = {
        "id": str(uuid.uuid4()),
        "nodeId": nodeId,
        "operation": op,
        "actor": body.actor,
        "timestamp": time.time() * 1000,
        "success": True,
        "details": f"{body.actor} performed {op} on {nodeId}",
        "policyCheck": "passed",
    }

    if op == "PRUNE":
        if nodeId in STATE["nodes"]:
            STATE["nodes"][nodeId]["status"] = "pruned"
        audit_entry["details"] = f"Human pruned node {nodeId}"

    elif op == "REVIVE":
        if nodeId in STATE["nodes"]:
            STATE["nodes"][nodeId]["status"] = "completed"
        audit_entry["details"] = f"Human revived node {nodeId}"

    elif op == "BRANCH":
        branch_id = f"node-human-{int(time.time() * 1000)}"
        parent = STATE["nodes"].get(nodeId, {})
        STATE["nodes"][branch_id] = {
            "id": branch_id,
            "parentId": nodeId,
            "agent": "human",
            "status": "active",
            "artifactType": "decision",
            "title": "Human Override Branch",
            "artifact": "# Human Override\n\nOperator created a new execution branch.",
            "contextDelta": "Human branch from " + nodeId,
            "humanOverride": True,
            "evaluatorFlag": False,
            "timestamp": time.time() * 1000,
            "depth": parent.get("depth", 0) + 1,
            "branchId": f"branch-human-{int(time.time())}",
            "metadata": {},
        }
        STATE["edges"].append({
            "id": f"e-{nodeId}-{branch_id}",
            "source": nodeId,
            "target": branch_id,
            "type": "human",
            "animated": True,
        })
        audit_entry["details"] = f"Human created branch from {nodeId} → {branch_id}"

    STATE["audit_log"].insert(0, audit_entry)
    await sio.emit("node_updated", {"nodeId": nodeId, "operation": op, "audit": audit_entry})
    return {"success": True, "audit": audit_entry}


@app.post("/policy/operation")
async def policy_operation(body: PolicyOperation):
    if body.action == "TOGGLE" and body.ruleId:
        for rule in STATE["policy"]:
            if rule["id"] == body.ruleId:
                rule["enabled"] = not rule["enabled"]
                await sio.emit("policy_updated", {"rule": rule})
                break

    elif body.action == "ADD" and body.text:
        new_rule = {
            "id": str(uuid.uuid4()),
            "text": body.text,
            "type": "constraint",
            "enabled": True,
            "proposer": "human",
            "timestamp": time.time() * 1000,
            "category": "Custom",
        }
        STATE["policy"].append(new_rule)
        await sio.emit("policy_updated", {"rule": new_rule, "action": "added"})

    return {"success": True}


# ─── Socket.io Events ─────────────────────────────────────────
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    # Send current state to newly connected client
    await sio.emit("state_sync", STATE, to=sid)


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")


@sio.event
async def ping(sid, data):
    await sio.emit("pong", {"timestamp": time.time()}, to=sid)


# ─── Main ─────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
