"""
Patch.AI Backend — FastAPI + Socket.io Server + SQLite
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import socketio
import uvicorn
import time
import uuid
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from db import init_db, get_db, NodeModel, EdgeModel, PolicyRuleModel, AuditLogModel

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on startup
    await init_db()
    yield
    # Cleanup on shutdown

# ─── App Setup ────────────────────────────────────────────────
app = FastAPI(
    title="Patch.AI API",
    description="Multi-Agent Orchestration Control Plane Backend",
    version="1.0.0",
    lifespan=lifespan
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

class SyncNode(BaseModel):
    id: str
    parentId: Optional[str] = None
    agent: str
    status: str
    artifactType: str
    title: str
    artifact: str
    contextDelta: str
    humanOverride: bool = False
    evaluatorFlag: bool = False
    timestamp: float
    depth: int
    branchId: str
    metadata: dict = {}

class SyncEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str
    animated: bool = True

# ─── REST Endpoints ───────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Patch.AI Backend Online", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"healthy": True, "timestamp": time.time()}

@app.get("/state")
async def get_state(db: AsyncSession = Depends(get_db)):
    nodes_res = await db.execute(select(NodeModel))
    edges_res = await db.execute(select(EdgeModel))
    audit_res = await db.execute(select(AuditLogModel).order_by(AuditLogModel.timestamp.desc()))
    policy_res = await db.execute(select(PolicyRuleModel))
    
    nodes = {n.id: {
        "id": n.id, "parentId": n.parentId, "agent": n.agent, "status": n.status,
        "artifactType": n.artifactType, "title": n.title, "artifact": n.artifact,
        "contextDelta": n.contextDelta, "humanOverride": n.humanOverride,
        "evaluatorFlag": n.evaluatorFlag, "timestamp": n.timestamp, "depth": n.depth,
        "branchId": n.branchId, "metadata": n.metadata_json
    } for n in nodes_res.scalars().all()}
    
    edges = [{"id": e.id, "source": e.source, "target": e.target, "type": e.type, "animated": e.animated} for e in edges_res.scalars().all()]
    policy = [{"id": p.id, "text": p.text, "type": p.type, "enabled": p.enabled, "proposer": p.proposer, "timestamp": p.timestamp, "category": p.category} for p in policy_res.scalars().all()]
    audit_log = [{"id": a.id, "nodeId": a.nodeId, "operation": a.operation, "actor": a.actor, "timestamp": a.timestamp, "success": a.success, "details": a.details, "policyCheck": a.policyCheck} for a in audit_res.scalars().all()]

    return {
        "nodes": nodes,
        "edges": edges,
        "agents": {},
        "policy": policy,
        "audit_log": audit_log,
        "status": "idle",
        "task": ""
    }

@app.post("/sync/node")
async def sync_node(node: SyncNode, db: AsyncSession = Depends(get_db)):
    db_node = await db.get(NodeModel, node.id)
    if not db_node:
        db_node = NodeModel(
            id=node.id, parentId=node.parentId, agent=node.agent, status=node.status,
            artifactType=node.artifactType, title=node.title, artifact=node.artifact,
            contextDelta=node.contextDelta, humanOverride=node.humanOverride,
            evaluatorFlag=node.evaluatorFlag, timestamp=node.timestamp, depth=node.depth,
            branchId=node.branchId, metadata_json=node.metadata
        )
        db.add(db_node)
    else:
        for k, v in node.model_dump().items():
            if k == "metadata":
                db_node.metadata_json = v
            else:
                setattr(db_node, k, v)
    await db.commit()
    await sio.emit("remote_node_updated", node.model_dump())
    return {"success": True}

@app.post("/sync/edge")
async def sync_edge(edge: SyncEdge, db: AsyncSession = Depends(get_db)):
    db_edge = await db.get(EdgeModel, edge.id)
    if not db_edge:
        db_edge = EdgeModel(**edge.model_dump())
        db.add(db_edge)
        await db.commit()
        await sio.emit("remote_edge_added", edge.model_dump())
    return {"success": True}

@app.post("/nodes/operation")
async def node_operation(body: NodeOperation, db: AsyncSession = Depends(get_db)):
    nodeId = body.nodeId
    op = body.operation

    audit_entry = AuditLogModel(
        id=str(uuid.uuid4()),
        nodeId=nodeId,
        operation=op,
        actor=body.actor,
        timestamp=time.time() * 1000,
        success=True,
        details=f"{body.actor} performed {op} on {nodeId}",
        policyCheck="passed"
    )

    db_node = await db.get(NodeModel, nodeId)

    if op == "PRUNE":
        if db_node:
            db_node.status = "pruned"
        audit_entry.details = f"Human pruned node {nodeId}"

    elif op == "REVIVE":
        if db_node:
            db_node.status = "completed"
        audit_entry.details = f"Human revived node {nodeId}"

    elif op == "BRANCH":
        branch_id = f"node-human-{int(time.time() * 1000)}"
        new_node = NodeModel(
            id=branch_id,
            parentId=nodeId,
            agent="human",
            status="active",
            artifactType="decision",
            title="Human Override Branch",
            artifact="# Human Override\n\nOperator created a new execution branch.",
            contextDelta="Human branch from " + nodeId,
            humanOverride=True,
            evaluatorFlag=False,
            timestamp=time.time() * 1000,
            depth=(db_node.depth if db_node else 0) + 1,
            branchId=f"branch-human-{int(time.time())}",
            metadata_json={}
        )
        db.add(new_node)
        new_edge = EdgeModel(
            id=f"e-{nodeId}-{branch_id}",
            source=nodeId,
            target=branch_id,
            type="human",
            animated=True
        )
        db.add(new_edge)
        audit_entry.details = f"Human created branch from {nodeId} → {branch_id}"

    db.add(audit_entry)
    await db.commit()
    
    # Broadcast to all clients
    audit_dict = {"id": audit_entry.id, "nodeId": audit_entry.nodeId, "operation": audit_entry.operation, "actor": audit_entry.actor, "timestamp": audit_entry.timestamp, "success": audit_entry.success, "details": audit_entry.details, "policyCheck": audit_entry.policyCheck}
    await sio.emit("node_updated", {"nodeId": nodeId, "operation": op, "audit": audit_dict})
    return {"success": True, "audit": audit_dict}


# ─── Socket.io Events ─────────────────────────────────────────
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    # Cannot easily inject DB session here as it's not a FastAPI route, but clients will poll /state anyway or we can fetch it.
    await sio.emit("connected", {"sid": sid}, to=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def ping(sid, data):
    await sio.emit("pong", {"timestamp": time.time()}, to=sid)

# ─── Main ─────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main_rewrite:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
