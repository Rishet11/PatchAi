"""
Patch.AI Backend — FastAPI + Socket.io Server + SQLite
"""

import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Optional

import socketio
import uvicorn
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db import (
    AsyncSessionLocal,
    AuditLogModel,
    EdgeModel,
    NodeModel,
    PolicyRuleModel,
    get_db,
    init_db,
)
from simulation_engine import SimulationEngine


DEFAULT_POLICY_RULES = [
    {
        "id": "rule-1",
        "text": "Planner must complete before Coder can begin",
        "type": "transition",
        "enabled": True,
        "proposer": "human",
        "timestamp": lambda: time.time() * 1000,
        "category": "Sequencing",
    },
    {
        "id": "rule-2",
        "text": "Branching requires human approval when depth exceeds 3",
        "type": "approval",
        "enabled": True,
        "proposer": "human",
        "timestamp": lambda: time.time() * 1000,
        "category": "Branching",
    },
    {
        "id": "rule-3",
        "text": "Only the Evaluator may propose pruning operations",
        "type": "permission",
        "enabled": True,
        "proposer": "human",
        "timestamp": lambda: time.time() * 1000,
        "category": "Pruning",
    },
    {
        "id": "rule-4",
        "text": "Merging two branches requires human approval",
        "type": "approval",
        "enabled": False,
        "proposer": "human",
        "timestamp": lambda: time.time() * 1000,
        "category": "Merging",
    },
    {
        "id": "rule-5",
        "text": "Coder agent may not access external APIs without approval",
        "type": "permission",
        "enabled": True,
        "proposer": "human",
        "timestamp": lambda: time.time() * 1000,
        "category": "Security",
    },
    {
        "id": "rule-6",
        "text": "Maximum 4 parallel branches allowed per execution",
        "type": "constraint",
        "enabled": True,
        "proposer": "human",
        "timestamp": lambda: time.time() * 1000,
        "category": "Constraints",
    },
]


policy_history: list[dict[str, Any]] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_default_policy_rules()
    yield


app = FastAPI(
    title="Patch.AI API",
    description="Multi-Agent Orchestration Control Plane Backend",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25,
)

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
simulation = SimulationEngine(AsyncSessionLocal, sio)


class NodeOperation(BaseModel):
    nodeId: str
    operation: str  # PRUNE | REVIVE | BRANCH | INJECT | EDIT_ARTIFACT
    actor: str = "human"
    data: Optional[dict[str, Any]] = None


class PolicyOperation(BaseModel):
    ruleId: Optional[str] = None
    action: str  # TOGGLE | ADD | DELETE
    text: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    proposer: str = "human"


class StartExecution(BaseModel):
    task: str


class StopExecution(BaseModel):
    executionId: Optional[str] = None


class ResolveProposal(BaseModel):
    action: str  # approved | overridden | snoozed
    actor: str = "human"


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
    metadata: dict[str, Any] = {}


class SyncEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str
    animated: bool = True


def node_to_dict(node: NodeModel) -> dict[str, Any]:
    return {
        "id": node.id,
        "parentId": node.parentId,
        "agent": node.agent,
        "status": node.status,
        "artifactType": node.artifactType,
        "title": node.title,
        "artifact": node.artifact,
        "contextDelta": node.contextDelta,
        "humanOverride": node.humanOverride,
        "evaluatorFlag": node.evaluatorFlag,
        "timestamp": node.timestamp,
        "depth": node.depth,
        "branchId": node.branchId,
        "metadata": node.metadata_json or {},
    }


def edge_to_dict(edge: EdgeModel) -> dict[str, Any]:
    return {
        "id": edge.id,
        "source": edge.source,
        "target": edge.target,
        "type": edge.type,
        "animated": edge.animated,
    }


def policy_to_dict(policy: PolicyRuleModel) -> dict[str, Any]:
    return {
        "id": policy.id,
        "text": policy.text,
        "type": policy.type,
        "enabled": policy.enabled,
        "proposer": policy.proposer,
        "timestamp": policy.timestamp,
        "category": policy.category,
    }


def audit_to_dict(audit: AuditLogModel) -> dict[str, Any]:
    return {
        "id": audit.id,
        "nodeId": audit.nodeId,
        "operation": audit.operation,
        "actor": audit.actor,
        "timestamp": audit.timestamp,
        "success": audit.success,
        "details": audit.details,
        "policyCheck": audit.policyCheck,
    }


async def seed_default_policy_rules() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(PolicyRuleModel))
        if existing.scalars().first():
            return
        for rule in DEFAULT_POLICY_RULES:
            db.add(
                PolicyRuleModel(
                    id=rule["id"],
                    text=rule["text"],
                    type=rule["type"],
                    enabled=rule["enabled"],
                    proposer=rule["proposer"],
                    timestamp=rule["timestamp"](),
                    category=rule["category"],
                )
            )
        await db.commit()


async def evaluate_policy_for_operation(
    db: AsyncSession, body: NodeOperation, target_node: Optional[NodeModel]
) -> dict[str, Any]:
    enabled_policy_res = await db.execute(
        select(PolicyRuleModel).where(PolicyRuleModel.enabled.is_(True))
    )
    enabled_rules = list(enabled_policy_res.scalars().all())

    violated_rule_ids: list[str] = []
    bypassed_rule_ids: list[str] = []
    reasons: list[str] = []

    for rule in enabled_rules:
        if rule.id == "rule-2" and body.operation == "BRANCH":
            parent_depth = target_node.depth if target_node else 0
            if (parent_depth + 1) > 3 and body.actor != "human":
                violated_rule_ids.append(rule.id)
                reasons.append("branch_depth_gate_requires_human")
        elif rule.id == "rule-3" and body.operation == "PRUNE":
            if body.actor not in {"human", "evaluator"}:
                violated_rule_ids.append(rule.id)
                reasons.append("prune_permission_denied")
        elif rule.id == "rule-6" and body.operation == "BRANCH":
            nodes_res = await db.execute(select(NodeModel))
            active_branches = {
                node.branchId for node in nodes_res.scalars().all() if node.status != "pruned"
            }
            if len(active_branches) >= 4:
                violated_rule_ids.append(rule.id)
                reasons.append("parallel_branch_cap_exceeded")
        else:
            bypassed_rule_ids.append(rule.id)

    return {
        "allowed": len(violated_rule_ids) == 0,
        "violatedRuleIds": violated_rule_ids,
        "bypassedRuleIds": bypassed_rule_ids,
        "reason": ", ".join(reasons) if reasons else "allowed",
    }


async def create_failed_policy_audit(
    db: AsyncSession, body: NodeOperation, policy_eval: dict[str, Any]
) -> dict[str, Any]:
    audit = AuditLogModel(
        id=str(uuid.uuid4()),
        nodeId=body.nodeId,
        operation=body.operation,
        actor=body.actor,
        timestamp=time.time() * 1000,
        success=False,
        details=f"Blocked by policy: {policy_eval['reason']}",
        policyCheck="failed",
    )
    db.add(audit)
    await db.commit()
    audit_payload = audit_to_dict(audit)
    await sio.emit(
        "policy_violation",
        {
            "nodeId": body.nodeId,
            "operation": body.operation,
            "violatedRuleIds": policy_eval["violatedRuleIds"],
            "reason": policy_eval["reason"],
            "audit": audit_payload,
        },
    )
    await sio.emit(
        "node_updated",
        {"nodeId": body.nodeId, "operation": body.operation, "audit": audit_payload},
    )
    return audit_payload


async def apply_node_operation(
    db: AsyncSession, body: NodeOperation, policy_eval: dict[str, Any]
) -> dict[str, Any]:
    node = await db.get(NodeModel, body.nodeId)
    operation = body.operation.upper()
    changed_nodes: list[NodeModel] = []
    new_node: Optional[NodeModel] = None
    new_edge: Optional[EdgeModel] = None
    details = f"{body.actor} performed {operation} on {body.nodeId}"

    if operation == "PRUNE":
        nodes_res = await db.execute(select(NodeModel))
        all_nodes = list(nodes_res.scalars().all())
        children_by_parent: dict[Optional[str], list[NodeModel]] = {}
        for item in all_nodes:
            children_by_parent.setdefault(item.parentId, []).append(item)

        stack = [body.nodeId]
        while stack:
            current_id = stack.pop()
            current = next((item for item in all_nodes if item.id == current_id), None)
            if not current:
                continue
            current.status = "pruned"
            changed_nodes.append(current)
            for child in children_by_parent.get(current_id, []):
                stack.append(child.id)
        details = f"{body.actor} pruned node {body.nodeId} and descendants"

    elif operation == "REVIVE":
        if node:
            node.status = "completed"
            changed_nodes.append(node)
            details = f"{body.actor} revived node {body.nodeId}"

    elif operation == "BRANCH":
        parent_depth = node.depth if node else 0
        branch_node_id = f"node-{body.actor}-{int(time.time() * 1000)}"
        new_node = NodeModel(
            id=branch_node_id,
            parentId=body.nodeId,
            agent="human" if body.actor == "human" else body.actor,
            status="active",
            artifactType="decision",
            title="Human Override Branch",
            artifact="# Human Override\n\nOperator created a new execution branch.",
            contextDelta=f"Branch created from {body.nodeId}",
            humanOverride=body.actor == "human",
            evaluatorFlag=False,
            timestamp=time.time() * 1000,
            depth=parent_depth + 1,
            branchId=f"branch-{body.actor}-{int(time.time())}",
            metadata_json=body.data or {},
        )
        db.add(new_node)
        new_edge = EdgeModel(
            id=f"e-{body.nodeId}-{branch_node_id}",
            source=body.nodeId,
            target=branch_node_id,
            type="human",
            animated=True,
        )
        db.add(new_edge)
        details = f"{body.actor} created branch from {body.nodeId} to {branch_node_id}"

    elif operation == "INJECT":
        if node:
            inject_id = f"node-{body.actor}-{int(time.time() * 1000)}"
            new_node = NodeModel(
                id=inject_id,
                parentId=node.parentId,
                agent="human" if body.actor == "human" else body.actor,
                status="active",
                artifactType="decision",
                title="Injected Human Directive",
                artifact="# Injected Directive\n\nHuman injected an alternate sibling node.",
                contextDelta=f"Injected sibling node alongside {body.nodeId}",
                humanOverride=True,
                evaluatorFlag=False,
                timestamp=time.time() * 1000,
                depth=node.depth,
                branchId=node.branchId,
                metadata_json={"injectedFrom": body.nodeId, **(body.data or {})},
            )
            db.add(new_node)
            if node.parentId:
                new_edge = EdgeModel(
                    id=f"e-{node.parentId}-{inject_id}",
                    source=node.parentId,
                    target=inject_id,
                    type="human",
                    animated=True,
                )
                db.add(new_edge)
            details = f"{body.actor} injected sibling node for {body.nodeId}"

    elif operation == "EDIT_ARTIFACT":
        new_artifact = (body.data or {}).get("artifact")
        if node and isinstance(new_artifact, str):
            node.artifact = new_artifact
            node.humanOverride = True
            changed_nodes.append(node)
            details = f"{body.actor} edited artifact on {body.nodeId}"

    policy_check = "passed"
    if policy_eval["bypassedRuleIds"]:
        policy_check = "bypassed"
        details = f"{details} | not_evaluable_mvp: {','.join(policy_eval['bypassedRuleIds'])}"

    audit = AuditLogModel(
        id=str(uuid.uuid4()),
        nodeId=body.nodeId if operation != "BRANCH" else (new_node.id if new_node else body.nodeId),
        operation=operation,
        actor=body.actor,
        timestamp=time.time() * 1000,
        success=True,
        details=details,
        policyCheck=policy_check,
    )
    db.add(audit)
    await db.commit()

    if changed_nodes:
        for changed in changed_nodes:
            await sio.emit("remote_node_updated", node_to_dict(changed))
    if new_node:
        await sio.emit("remote_node_updated", node_to_dict(new_node))
    if new_edge:
        await sio.emit("remote_edge_added", edge_to_dict(new_edge))

    audit_payload = audit_to_dict(audit)
    await sio.emit(
        "node_updated",
        {
            "nodeId": body.nodeId,
            "operation": operation,
            "audit": audit_payload,
        },
    )

    return {
        "success": True,
        "audit": audit_payload,
        "updatedNodes": [node_to_dict(item) for item in changed_nodes],
        "newNode": node_to_dict(new_node) if new_node else None,
        "newEdge": edge_to_dict(new_edge) if new_edge else None,
    }


@app.get("/")
def root():
    return {"status": "Patch.AI Backend Online", "version": "1.1.0"}


@app.get("/health")
def health():
    return {"healthy": True, "timestamp": time.time()}


@app.get("/state")
async def get_state(db: AsyncSession = Depends(get_db)):
    nodes_res = await db.execute(select(NodeModel))
    edges_res = await db.execute(select(EdgeModel))
    audit_res = await db.execute(select(AuditLogModel).order_by(AuditLogModel.timestamp.desc()))
    policy_res = await db.execute(select(PolicyRuleModel))
    runtime = simulation.snapshot()

    nodes = {node.id: node_to_dict(node) for node in nodes_res.scalars().all()}
    edges = [edge_to_dict(edge) for edge in edges_res.scalars().all()]
    policy = [policy_to_dict(rule) for rule in policy_res.scalars().all()]
    audit_log = [audit_to_dict(audit) for audit in audit_res.scalars().all()]

    return {
        "nodes": nodes,
        "edges": edges,
        "agents": {},
        "policy": policy,
        "policyHistory": policy_history,
        "audit_log": audit_log,
        "status": runtime["status"],
        "task": runtime["task"],
        "executionId": runtime["executionId"],
        "startedAt": runtime["startedAt"],
        "evaluator_proposals": runtime["evaluator_proposals"],
    }


@app.post("/execution/start")
async def start_execution(body: StartExecution, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(EdgeModel))
    await db.execute(delete(NodeModel))
    await db.execute(delete(AuditLogModel))
    await db.commit()

    result = await simulation.start(body.task)
    await sio.emit("execution_status", result)
    return result


@app.post("/execution/stop")
async def stop_execution(body: StopExecution):
    _ = body.executionId
    result = await simulation.stop("stopped")
    return result


@app.post("/sync/node")
async def sync_node(node: SyncNode, db: AsyncSession = Depends(get_db)):
    db_node = await db.get(NodeModel, node.id)
    if not db_node:
        db_node = NodeModel(
            id=node.id,
            parentId=node.parentId,
            agent=node.agent,
            status=node.status,
            artifactType=node.artifactType,
            title=node.title,
            artifact=node.artifact,
            contextDelta=node.contextDelta,
            humanOverride=node.humanOverride,
            evaluatorFlag=node.evaluatorFlag,
            timestamp=node.timestamp,
            depth=node.depth,
            branchId=node.branchId,
            metadata_json=node.metadata,
        )
        db.add(db_node)
    else:
        db_node.parentId = node.parentId
        db_node.agent = node.agent
        db_node.status = node.status
        db_node.artifactType = node.artifactType
        db_node.title = node.title
        db_node.artifact = node.artifact
        db_node.contextDelta = node.contextDelta
        db_node.humanOverride = node.humanOverride
        db_node.evaluatorFlag = node.evaluatorFlag
        db_node.timestamp = node.timestamp
        db_node.depth = node.depth
        db_node.branchId = node.branchId
        db_node.metadata_json = node.metadata
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
    if body.operation.upper() not in {"PRUNE", "REVIVE", "BRANCH", "INJECT", "EDIT_ARTIFACT"}:
        return JSONResponse(
            status_code=400,
            content={"success": False, "reason": f"unsupported operation: {body.operation}"},
        )
    target_node = await db.get(NodeModel, body.nodeId)
    policy_eval = await evaluate_policy_for_operation(db, body, target_node)
    if not policy_eval["allowed"]:
        audit_payload = await create_failed_policy_audit(db, body, policy_eval)
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "reason": policy_eval["reason"],
                "violatedRuleIds": policy_eval["violatedRuleIds"],
                "audit": audit_payload,
            },
        )
    return await apply_node_operation(db, body, policy_eval)


@app.post("/policy/operation")
async def policy_operation(body: PolicyOperation, db: AsyncSession = Depends(get_db)):
    action = body.action.upper()
    history_entry = None

    if action == "TOGGLE":
        if not body.ruleId:
            return JSONResponse(status_code=400, content={"success": False, "reason": "ruleId required"})
        rule = await db.get(PolicyRuleModel, body.ruleId)
        if not rule:
            return JSONResponse(status_code=404, content={"success": False, "reason": "rule not found"})
        rule.enabled = not rule.enabled
        rule.timestamp = time.time() * 1000
        history_entry = {
            "id": f"evo-{int(time.time() * 1000)}",
            "ruleId": rule.id,
            "ruleText": rule.text,
            "action": "toggled",
            "proposer": body.proposer,
            "timestamp": time.time() * 1000,
            "approvedBy": body.proposer,
        }

    elif action == "ADD":
        if not body.text:
            return JSONResponse(status_code=400, content={"success": False, "reason": "text required"})
        new_rule = PolicyRuleModel(
            id=f"rule-{int(time.time() * 1000)}",
            text=body.text,
            type=body.type or "constraint",
            enabled=True,
            proposer=body.proposer,
            timestamp=time.time() * 1000,
            category=body.category or "Custom",
        )
        db.add(new_rule)
        history_entry = {
            "id": f"evo-{int(time.time() * 1000)}",
            "ruleId": new_rule.id,
            "ruleText": new_rule.text,
            "action": "added",
            "proposer": body.proposer,
            "timestamp": time.time() * 1000,
            "approvedBy": body.proposer,
        }

    elif action == "DELETE":
        if not body.ruleId:
            return JSONResponse(status_code=400, content={"success": False, "reason": "ruleId required"})
        rule = await db.get(PolicyRuleModel, body.ruleId)
        if not rule:
            return JSONResponse(status_code=404, content={"success": False, "reason": "rule not found"})
        history_entry = {
            "id": f"evo-{int(time.time() * 1000)}",
            "ruleId": rule.id,
            "ruleText": rule.text,
            "action": "deleted",
            "proposer": body.proposer,
            "timestamp": time.time() * 1000,
            "approvedBy": body.proposer,
        }
        await db.delete(rule)

    else:
        return JSONResponse(status_code=400, content={"success": False, "reason": "unsupported action"})

    await db.commit()
    if history_entry:
        policy_history.insert(0, history_entry)

    policy_res = await db.execute(select(PolicyRuleModel))
    policy = [policy_to_dict(rule) for rule in policy_res.scalars().all()]
    payload = {"policy": policy, "historyEntry": history_entry}
    await sio.emit("policy_updated", payload)
    return {
        "success": True,
        "policy": policy,
        "policyHistory": policy_history,
        "historyEntry": history_entry,
    }


@app.post("/evaluator/proposals/{proposal_id}/resolve")
async def resolve_evaluator_proposal(
    proposal_id: str, body: ResolveProposal, db: AsyncSession = Depends(get_db)
):
    action = body.action.lower()
    proposal = await simulation.resolve_proposal(proposal_id, action)
    if not proposal:
        return JSONResponse(status_code=404, content={"success": False, "reason": "proposal not found"})

    operation_result = None
    if action == "approved":
        op = NodeOperation(nodeId=proposal["targetNodeId"], operation="PRUNE", actor="evaluator")
        policy_eval = await evaluate_policy_for_operation(db, op, await db.get(NodeModel, op.nodeId))
        if policy_eval["allowed"]:
            operation_result = await apply_node_operation(db, op, policy_eval)
    elif action == "overridden":
        op = NodeOperation(nodeId=proposal["targetNodeId"], operation="REVIVE", actor=body.actor)
        policy_eval = await evaluate_policy_for_operation(db, op, await db.get(NodeModel, op.nodeId))
        if policy_eval["allowed"]:
            operation_result = await apply_node_operation(db, op, policy_eval)

    await sio.emit("evaluator_proposal_resolved", {"proposal": proposal, "action": action})
    return {"success": True, "proposal": proposal, "operationResult": operation_result}


@sio.event
async def connect(sid, environ):
    _ = environ
    await sio.emit("connected", {"sid": sid}, to=sid)


@sio.event
async def disconnect(sid):
    _ = sid


@sio.event
async def ping(sid, data):
    _ = data
    await sio.emit("pong", {"timestamp": time.time()}, to=sid)


if __name__ == "__main__":
    uvicorn.run(
        "main:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
