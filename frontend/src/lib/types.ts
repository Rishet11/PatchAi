// ==========================================
// Patch.AI — Core Type Definitions
// ==========================================

export type AgentRole = 'planner' | 'coder' | 'reviewer' | 'tester' | 'evaluator' | 'human';

export type NodeStatus = 'active' | 'working' | 'completed' | 'pruned' | 'error' | 'waiting';

export type ArtifactType = 'plan' | 'code' | 'review' | 'test_report' | 'decision' | 'policy' | 'message';

export type OperationType =
  | 'PROPOSE'
  | 'APPLY'
  | 'PRUNE'
  | 'REVIVE'
  | 'INJECT'
  | 'EDIT_ARTIFACT'
  | 'UPDATE_POLICY'
  | 'REASSIGN_AGENT'
  | 'BRANCH'
  | 'MERGE'
  | 'DIRECT_CHAT';

export interface GraphNode {
  id: string;
  parentId: string | null;
  agent: AgentRole;
  status: NodeStatus;
  artifactType: ArtifactType;
  title: string;
  artifact: string;
  contextDelta: string;
  humanOverride: boolean;
  evaluatorFlag: boolean;
  timestamp: number;
  depth: number;
  branchId: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'default' | 'branch' | 'merge' | 'human';
  animated: boolean;
}

export interface PolicyRule {
  id: string;
  text: string;
  type: 'transition' | 'approval' | 'permission' | 'constraint';
  enabled: boolean;
  proposer: AgentRole | 'human';
  timestamp: number;
  category: string;
}

export interface PolicyEvolution {
  id: string;
  ruleId: string;
  ruleText: string;
  action: 'added' | 'modified' | 'toggled' | 'deleted';
  proposer: string;
  timestamp: number;
  approvedBy?: string;
}

export interface AgentState {
  id: string;
  role: AgentRole;
  name: string;
  status: 'idle' | 'working' | 'waiting_for_approval' | 'pruned' | 'finished' | 'error';
  currentNodeId: string | null;
  totalProposals: number;
  acceptedProposals: number;
  rejectedProposals: number;
  lastActive: number;
  description: string;
}

export interface AuditEntry {
  id: string;
  nodeId: string | null;
  operation: OperationType;
  actor: AgentRole | 'human' | 'evaluator' | 'sgo';
  timestamp: number;
  success: boolean;
  details: string;
  policyCheck?: 'passed' | 'failed' | 'bypassed';
}

export interface EvaluatorProposal {
  id: string;
  type: 'prune' | 'warning';
  targetNodeId: string;
  targetBranchId: string;
  rationale: string;
  confidence: number;
  heuristic: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'overridden' | 'snoozed';
}

export interface SystemStats {
  totalNodes: number;
  activeNodes: number;
  prunedNodes: number;
  activeBranches: number;
  pendingProposals: number;
  humanInterventions: number;
  uptime: number;
  evaluatorScore: number;
}

export interface Notification {
  id: string;
  type: 'evaluator_proposal' | 'agent_error' | 'policy_proposal' | 'approval_required' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionData?: Record<string, unknown>;
}

export interface ExecutionState {
  id: string;
  taskDescription: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'stopped';
  startTime: number | null;
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
  agents: Record<string, AgentState>;
  policy: PolicyRule[];
  policyHistory: PolicyEvolution[];
  auditLog: AuditEntry[];
  notifications: Notification[];
  evaluatorProposals: EvaluatorProposal[];
  stats: SystemStats;
}
