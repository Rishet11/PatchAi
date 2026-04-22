'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  ExecutionState,
  GraphNode,
  GraphEdge,
  AgentState,
  PolicyRule,
  Notification,
  EvaluatorProposal,
  SystemStats,
  AuditEntry,
  PolicyEvolution,
} from '@/lib/types';
import { BACKEND_URL, ENABLE_LOCAL_DEMO_FALLBACK, POLICY_RULES_DEFAULT } from '@/lib/constants';
import { socket } from '@/lib/socket';

interface UIState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  activePanel: 'node' | 'agent' | 'policy' | 'audit' | null;
  selectedAgentId: string | null;
  showOnboarding: boolean;
  isDemoRunning: boolean;
  notificationTrayOpen: boolean;
  unreadCount: number;
  graphSearchQuery: string;
}

interface PatchAIStore extends ExecutionState, UIState {
  setupSocketListeners: () => void;
  startExecution: (task: string, options?: { preferBackend?: boolean }) => Promise<boolean>;
  stopExecution: () => Promise<void>;
  pauseExecution: () => void;
  operateNode: (
    nodeId: string,
    operation: string,
    actor?: string,
    data?: Record<string, unknown>
  ) => Promise<{ success: boolean; reason?: string }>;

  addNode: (node: GraphNode) => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  pruneNode: (id: string) => void;
  reviveNode: (id: string) => void;
  addEdge: (edge: GraphEdge) => void;

  selectNode: (id: string | null) => void;
  selectAgent: (id: string | null) => void;
  setActivePanel: (panel: UIState['activePanel']) => void;

  togglePolicy: (id: string) => Promise<void>;
  addPolicy: (text: string) => Promise<void>;

  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  updateAgent: (id: string, updates: Partial<AgentState>) => void;

  addEvaluatorProposal: (proposal: EvaluatorProposal) => void;
  resolveProposal: (id: string, action: 'approved' | 'overridden' | 'snoozed') => Promise<void>;

  addAuditEntry: (entry: Omit<AuditEntry, 'id'>) => void;

  updateStats: (stats: Partial<SystemStats>) => void;

  setShowOnboarding: (show: boolean) => void;
  setDemoRunning: (running: boolean) => void;
  setNotificationTrayOpen: (open: boolean) => void;
  setGraphSearchQuery: (q: string) => void;

  resetState: () => void;
}

const apiUrl = (path: string) => `${BACKEND_URL}${path}`;

const computeStats = (nodes: Record<string, GraphNode>, currentStats: SystemStats): SystemStats => {
  const nodeValues = Object.values(nodes);
  const activeNodes = nodeValues.filter((node) => node.status !== 'pruned').length;
  const prunedNodes = nodeValues.filter((node) => node.status === 'pruned').length;
  const activeBranches = new Set(nodeValues.filter((node) => node.status !== 'pruned').map((node) => node.branchId)).size;
  return {
    ...currentStats,
    totalNodes: nodeValues.length,
    activeNodes,
    prunedNodes,
    activeBranches,
  };
};

const mergeAudit = (auditLog: AuditEntry[], audit: AuditEntry): AuditEntry[] => {
  if (auditLog.find((entry) => entry.id === audit.id)) {
    return auditLog;
  }
  return [audit, ...auditLog].slice(0, 200);
};

const INITIAL_AGENTS: Record<string, AgentState> = {
  planner: {
    id: 'planner',
    role: 'planner',
    name: 'Planner Agent',
    status: 'idle',
    currentNodeId: null,
    totalProposals: 0,
    acceptedProposals: 0,
    rejectedProposals: 0,
    lastActive: Date.now(),
    description: 'Decomposes goals into executable subtasks and creates execution plans',
  },
  coder: {
    id: 'coder',
    role: 'coder',
    name: 'Coder Agent',
    status: 'idle',
    currentNodeId: null,
    totalProposals: 0,
    acceptedProposals: 0,
    rejectedProposals: 0,
    lastActive: Date.now(),
    description: 'Implements features, writes clean code, and fixes bugs',
  },
  reviewer: {
    id: 'reviewer',
    role: 'reviewer',
    name: 'Reviewer Agent',
    status: 'idle',
    currentNodeId: null,
    totalProposals: 0,
    acceptedProposals: 0,
    rejectedProposals: 0,
    lastActive: Date.now(),
    description: 'Reviews code for quality, security, and correctness',
  },
  tester: {
    id: 'tester',
    role: 'tester',
    name: 'Tester Agent',
    status: 'idle',
    currentNodeId: null,
    totalProposals: 0,
    acceptedProposals: 0,
    rejectedProposals: 0,
    lastActive: Date.now(),
    description: 'Writes test suites and runs automated tests',
  },
};

const INITIAL_STATS: SystemStats = {
  totalNodes: 0,
  activeNodes: 0,
  prunedNodes: 0,
  activeBranches: 0,
  pendingProposals: 0,
  humanInterventions: 0,
  uptime: 0,
  evaluatorScore: 94,
};

const INITIAL_STATE: ExecutionState = {
  id: 'exec-1',
  taskDescription: '',
  status: 'idle',
  startTime: null,
  nodes: {},
  edges: [],
  agents: INITIAL_AGENTS,
  policy: POLICY_RULES_DEFAULT,
  policyHistory: [],
  auditLog: [],
  notifications: [],
  evaluatorProposals: [],
  stats: INITIAL_STATS,
};

const INITIAL_UI: UIState = {
  selectedNodeId: null,
  hoveredNodeId: null,
  activePanel: null,
  selectedAgentId: null,
  showOnboarding: true,
  isDemoRunning: false,
  notificationTrayOpen: false,
  unreadCount: 0,
  graphSearchQuery: '',
};

let notifIdCounter = 0;
let auditIdCounter = 0;

export const usePatchAIStore = create<PatchAIStore>()(
  subscribeWithSelector((set, get) => ({
    ...INITIAL_STATE,
    ...INITIAL_UI,

    startExecution: async (task, options) => {
      const preferBackend = options?.preferBackend !== false;
      set({
        taskDescription: task,
        status: 'running',
        startTime: Date.now(),
        isDemoRunning: true,
      });

      if (!preferBackend) {
        return false;
      }

      try {
        const response = await fetch(apiUrl('/execution/start'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task }),
        });

        if (!response.ok) {
          throw new Error('failed_to_start_execution');
        }

        const data = await response.json();
        set({
          id: data.executionId || get().id,
          taskDescription: task,
          status: data.status || 'running',
          startTime: data.startedAt || Date.now(),
          isDemoRunning: data.status === 'running',
        });
        return true;
      } catch {
        if (!ENABLE_LOCAL_DEMO_FALLBACK) {
          set({ status: 'stopped', isDemoRunning: false });
        }
        return false;
      }
    },

    stopExecution: async () => {
      try {
        await fetch(apiUrl('/execution/stop'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ executionId: get().id }),
        });
      } catch {
        // no-op; local state still updates
      } finally {
        set({ status: 'stopped', isDemoRunning: false });
      }
    },

    pauseExecution: () => set({ status: 'paused' }),

    operateNode: async (nodeId, operation, actor = 'human', data) => {
      try {
        const response = await fetch(apiUrl('/nodes/operation'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId, operation, actor, data }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          if (payload.audit) {
            set((state) => ({ auditLog: mergeAudit(state.auditLog, payload.audit) }));
          }
          if (payload.reason) {
            get().addNotification({
              type: 'approval_required',
              title: 'Policy Blocked Operation',
              message: payload.reason,
            });
          }
          return { success: false, reason: payload.reason || 'Operation blocked' };
        }

        set((state) => {
          const nextNodes = { ...state.nodes };
          for (const updated of payload.updatedNodes || []) {
            nextNodes[updated.id] = updated;
          }
          if (payload.newNode) {
            nextNodes[payload.newNode.id] = payload.newNode;
          }

          let nextEdges = state.edges;
          if (payload.newEdge && !state.edges.find((edge) => edge.id === payload.newEdge.id)) {
            nextEdges = [...state.edges, payload.newEdge];
          }

          return {
            nodes: nextNodes,
            edges: nextEdges,
            auditLog: payload.audit ? mergeAudit(state.auditLog, payload.audit) : state.auditLog,
            stats: computeStats(nextNodes, {
              ...state.stats,
              humanInterventions: state.stats.humanInterventions + 1,
            }),
          };
        });
        return { success: true };
      } catch {
        if (!ENABLE_LOCAL_DEMO_FALLBACK) {
          return { success: false, reason: 'backend_unreachable' };
        }

        if (operation === 'PRUNE') {
          get().pruneNode(nodeId);
        } else if (operation === 'REVIVE') {
          get().reviveNode(nodeId);
        } else if (operation === 'BRANCH') {
          const source = get().nodes[nodeId];
          if (source) {
            const branchId = `node-human-${Date.now()}`;
            get().addNode({
              id: branchId,
              parentId: source.id,
              agent: 'human',
              status: 'active',
              artifactType: 'decision',
              title: 'Human Override Branch',
              artifact: '# Human Override\n\nOperator created a new execution branch.',
              contextDelta: `Branch created from ${source.id}`,
              humanOverride: true,
              evaluatorFlag: false,
              timestamp: Date.now(),
              depth: source.depth + 1,
              branchId: `branch-human-${Date.now()}`,
              metadata: data || {},
            });
            get().addEdge({
              id: `e-${source.id}-${branchId}`,
              source: source.id,
              target: branchId,
              type: 'human',
              animated: true,
            });
          }
        } else if (operation === 'INJECT') {
          const source = get().nodes[nodeId];
          if (source) {
            const injectId = `node-human-${Date.now()}`;
            get().addNode({
              id: injectId,
              parentId: source.parentId,
              agent: 'human',
              status: 'active',
              artifactType: 'decision',
              title: 'Injected Human Directive',
              artifact: '# Injected Directive\n\nHuman injected an alternate sibling node.',
              contextDelta: `Injected sibling node alongside ${source.id}`,
              humanOverride: true,
              evaluatorFlag: false,
              timestamp: Date.now(),
              depth: source.depth,
              branchId: source.branchId,
              metadata: { injectedFrom: source.id, ...(data || {}) },
            });
            if (source.parentId) {
              get().addEdge({
                id: `e-${source.parentId}-${injectId}`,
                source: source.parentId,
                target: injectId,
                type: 'human',
                animated: true,
              });
            }
          }
        } else if (operation === 'EDIT_ARTIFACT') {
          const nextArtifact = data?.artifact;
          if (typeof nextArtifact === 'string') {
            get().updateNode(nodeId, { artifact: nextArtifact, humanOverride: true });
          }
        }
        return { success: true };
      }
    },

    addNode: (node) => {
      fetch(apiUrl('/sync/node'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node),
      }).catch(() => {});

      set((state) => {
        const newNodes = { ...state.nodes, [node.id]: node };
        return {
          nodes: newNodes,
          stats: computeStats(newNodes, state.stats),
        };
      });
    },

    updateNode: (id, updates) =>
      set((state) => {
        if (!state.nodes[id]) return state;
        const nodes = {
          ...state.nodes,
          [id]: { ...state.nodes[id], ...updates },
        };
        return { nodes, stats: computeStats(nodes, state.stats) };
      }),

    pruneNode: (id) =>
      set((state) => {
        const updatedNodes = { ...state.nodes };
        const pruneRecursive = (nodeId: string) => {
          if (!updatedNodes[nodeId]) return;
          updatedNodes[nodeId] = { ...updatedNodes[nodeId], status: 'pruned' };
          Object.values(updatedNodes).forEach((node) => {
            if (node.parentId === nodeId && node.status !== 'pruned') {
              pruneRecursive(node.id);
            }
          });
        };
        pruneRecursive(id);
        return {
          nodes: updatedNodes,
          stats: computeStats(updatedNodes, {
            ...state.stats,
            humanInterventions: state.stats.humanInterventions + 1,
          }),
        };
      }),

    reviveNode: (id) =>
      set((state) => {
        const updatedNodes = { ...state.nodes };
        if (updatedNodes[id]) {
          updatedNodes[id] = { ...updatedNodes[id], status: 'completed' };
        }
        return {
          nodes: updatedNodes,
          stats: computeStats(updatedNodes, {
            ...state.stats,
            humanInterventions: state.stats.humanInterventions + 1,
          }),
        };
      }),

    addEdge: (edge) => {
      fetch(apiUrl('/sync/edge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edge),
      }).catch(() => {});

      set((state) => {
        if (state.edges.find((existing) => existing.id === edge.id)) return state;
        return { edges: [...state.edges, edge] };
      });
    },

    selectNode: (id) =>
      set({
        selectedNodeId: id,
        activePanel: id ? 'node' : get().activePanel,
      }),

    selectAgent: (id) =>
      set({
        selectedAgentId: id,
        activePanel: id ? 'agent' : get().activePanel,
      }),

    setActivePanel: (panel) => set({ activePanel: panel }),

    togglePolicy: async (id) => {
      try {
        const response = await fetch(apiUrl('/policy/operation'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'TOGGLE', ruleId: id }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) return;
        set((state) => ({
          policy: payload.policy || state.policy,
          policyHistory: payload.policyHistory || state.policyHistory,
          stats: { ...state.stats, humanInterventions: state.stats.humanInterventions + 1 },
        }));
      } catch {
        if (!ENABLE_LOCAL_DEMO_FALLBACK) return;
        set((state) => {
          const updatedPolicy = state.policy.map((rule) =>
            rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
          );
          const rule = state.policy.find((policyRule) => policyRule.id === id);
          const evolution: PolicyEvolution = {
            id: `evo-${Date.now()}`,
            ruleId: id,
            ruleText: rule?.text || '',
            action: 'toggled',
            proposer: 'human',
            timestamp: Date.now(),
            approvedBy: 'human',
          };
          return {
            policy: updatedPolicy,
            policyHistory: [evolution, ...state.policyHistory],
          };
        });
      }
    },

    addPolicy: async (text) => {
      try {
        const response = await fetch(apiUrl('/policy/operation'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ADD', text }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) return;
        set((state) => ({
          policy: payload.policy || state.policy,
          policyHistory: payload.policyHistory || state.policyHistory,
        }));
      } catch {
        if (!ENABLE_LOCAL_DEMO_FALLBACK) return;
        set((state) => {
          const newRule: PolicyRule = {
            id: `rule-${Date.now()}`,
            text,
            type: 'constraint',
            enabled: true,
            proposer: 'human',
            timestamp: Date.now(),
            category: 'Custom',
          };
          const evolution: PolicyEvolution = {
            id: `evo-${Date.now()}`,
            ruleId: newRule.id,
            ruleText: text,
            action: 'added',
            proposer: 'human',
            timestamp: Date.now(),
            approvedBy: 'human',
          };
          return {
            policy: [...state.policy, newRule],
            policyHistory: [evolution, ...state.policyHistory],
          };
        });
      }
    },

    addNotification: (notif) =>
      set((state) => {
        const id = `notif-${++notifIdCounter}`;
        const newNotif: Notification = {
          ...notif,
          id,
          timestamp: Date.now(),
          read: false,
        };
        return {
          notifications: [newNotif, ...state.notifications].slice(0, 50),
          unreadCount: state.unreadCount + 1,
        };
      }),

    markNotificationRead: (id) =>
      set((state) => ({
        notifications: state.notifications.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        ),
        unreadCount: Math.max(
          0,
          state.notifications.filter((notif) => !notif.read && notif.id !== id).length
        ),
      })),

    clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

    updateAgent: (id, updates) =>
      set((state) => ({
        agents: {
          ...state.agents,
          [id]: { ...state.agents[id], ...updates },
        },
      })),

    addEvaluatorProposal: (proposal) =>
      set((state) => {
        if (state.evaluatorProposals.find((item) => item.id === proposal.id)) return state;
        const evaluatorProposals = [proposal, ...state.evaluatorProposals];
        return {
          evaluatorProposals,
          stats: { ...state.stats, pendingProposals: evaluatorProposals.filter((item) => item.status === 'pending').length },
        };
      }),

    resolveProposal: async (id, action) => {
      try {
        const response = await fetch(apiUrl(`/evaluator/proposals/${id}/resolve`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, actor: 'human' }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) return;
      } catch {
        if (!ENABLE_LOCAL_DEMO_FALLBACK) return;
      }

      set((state) => {
        const evaluatorProposals = state.evaluatorProposals.map((proposal) =>
          proposal.id === id ? { ...proposal, status: action } : proposal
        );
        return {
          evaluatorProposals,
          stats: {
            ...state.stats,
            pendingProposals: evaluatorProposals.filter((proposal) => proposal.status === 'pending').length,
            humanInterventions: state.stats.humanInterventions + 1,
          },
        };
      });
    },

    addAuditEntry: (entry) =>
      set((state) => {
        const id = `audit-${++auditIdCounter}`;
        return {
          auditLog: [{ ...entry, id }, ...state.auditLog].slice(0, 200),
        };
      }),

    updateStats: (stats) =>
      set((state) => ({
        stats: { ...state.stats, ...stats },
      })),

    setShowOnboarding: (show) => set({ showOnboarding: show }),
    setDemoRunning: (running) => set({ isDemoRunning: running }),
    setNotificationTrayOpen: (open) => set({ notificationTrayOpen: open }),
    setGraphSearchQuery: (q) => set({ graphSearchQuery: q }),

    resetState: () =>
      set({
        ...INITIAL_STATE,
        ...INITIAL_UI,
        showOnboarding: false,
      }),

    setupSocketListeners: () => {
      socket.off('connect');
      socket.off('remote_node_updated');
      socket.off('remote_edge_added');
      socket.off('node_updated');
      socket.off('execution_status');
      socket.off('evaluator_proposal');
      socket.off('policy_violation');
      socket.off('policy_updated');
      socket.off('evaluator_proposal_resolved');

      socket.connect();

      socket.on('connect', () => {
        fetch(apiUrl('/state'))
          .then((response) => response.json())
          .then((data) => {
            const incomingNodes = data.nodes || {};
            const incomingEdges = data.edges || [];
            const incomingProposals = data.evaluator_proposals || [];
            set((state) => ({
              id: data.executionId || state.id,
              nodes: incomingNodes,
              edges: incomingEdges,
              auditLog: data.audit_log || [],
              policy: data.policy || POLICY_RULES_DEFAULT,
              policyHistory: data.policyHistory || [],
              evaluatorProposals: incomingProposals,
              status: data.status || state.status,
              taskDescription: data.task || state.taskDescription,
              startTime: data.startedAt || state.startTime,
              isDemoRunning: data.status === 'running',
              stats: computeStats(incomingNodes, {
                ...state.stats,
                pendingProposals: incomingProposals.filter(
                  (proposal: EvaluatorProposal) => proposal.status === 'pending'
                ).length,
              }),
            }));
          })
          .catch(() => {});
      });

      socket.on('remote_node_updated', (node: GraphNode) => {
        set((state) => {
          const nodes = { ...state.nodes, [node.id]: node };
          return { nodes, stats: computeStats(nodes, state.stats) };
        });
      });

      socket.on('remote_edge_added', (edge: GraphEdge) => {
        set((state) => {
          if (state.edges.find((item) => item.id === edge.id)) return state;
          return { edges: [...state.edges, edge] };
        });
      });

      socket.on('node_updated', ({ audit }) => {
        if (!audit) return;
        set((state) => ({ auditLog: mergeAudit(state.auditLog, audit) }));
      });

      socket.on('execution_status', (payload) => {
        set((state) => ({
          id: payload.executionId || state.id,
          status: payload.status || state.status,
          taskDescription: payload.task || state.taskDescription,
          startTime: payload.startedAt || state.startTime,
          isDemoRunning: payload.status === 'running',
        }));
      });

      socket.on('evaluator_proposal', (proposal: EvaluatorProposal) => {
        get().addEvaluatorProposal(proposal);
        get().addNotification({
          type: 'evaluator_proposal',
          title: 'Evaluator Proposal',
          message: proposal.rationale,
        });
      });

      socket.on('policy_violation', ({ reason, audit }) => {
        if (audit) {
          set((state) => ({ auditLog: mergeAudit(state.auditLog, audit) }));
        }
        if (reason) {
          get().addNotification({
            type: 'approval_required',
            title: 'Policy Violation',
            message: reason,
          });
        }
      });

      socket.on('policy_updated', ({ policy, historyEntry }) => {
        set((state) => ({
          policy: policy || state.policy,
          policyHistory: historyEntry ? [historyEntry, ...state.policyHistory] : state.policyHistory,
        }));
      });

      socket.on('evaluator_proposal_resolved', ({ proposal }) => {
        if (!proposal) return;
        set((state) => {
          const evaluatorProposals = state.evaluatorProposals.map((item) =>
            item.id === proposal.id ? { ...item, status: proposal.status } : item
          );
          return {
            evaluatorProposals,
            stats: {
              ...state.stats,
              pendingProposals: evaluatorProposals.filter((item) => item.status === 'pending').length,
            },
          };
        });
      });
    },
  }))
);
