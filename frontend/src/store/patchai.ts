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
import { POLICY_RULES_DEFAULT } from '@/lib/constants';

interface UIState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  activePanel: 'node' | 'agent' | 'policy' | 'audit' | null;
  selectedAgentId: string | null;
  showOnboarding: boolean;
  isDemoRunning: boolean;
  notificationTrayOpen: boolean;
  unreadCount: number;
}

interface PatchAIStore extends ExecutionState, UIState {
  // Execution actions
  startExecution: (task: string) => void;
  stopExecution: () => void;
  pauseExecution: () => void;

  // Node actions
  addNode: (node: GraphNode) => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  pruneNode: (id: string) => void;
  reviveNode: (id: string) => void;
  addEdge: (edge: GraphEdge) => void;

  // Selection actions
  selectNode: (id: string | null) => void;
  selectAgent: (id: string | null) => void;
  setActivePanel: (panel: UIState['activePanel']) => void;

  // Policy actions
  togglePolicy: (id: string) => void;
  addPolicy: (text: string) => void;

  // Notification actions
  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Agent actions
  updateAgent: (id: string, updates: Partial<AgentState>) => void;

  // Evaluator actions
  addEvaluatorProposal: (proposal: EvaluatorProposal) => void;
  resolveProposal: (id: string, action: 'approved' | 'overridden' | 'snoozed') => void;

  // Audit
  addAuditEntry: (entry: Omit<AuditEntry, 'id'>) => void;

  // Stats
  updateStats: (stats: Partial<SystemStats>) => void;

  // UI
  setShowOnboarding: (show: boolean) => void;
  setDemoRunning: (running: boolean) => void;
  setNotificationTrayOpen: (open: boolean) => void;

  // Reset
  resetState: () => void;
}

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
};

let notifIdCounter = 0;
let auditIdCounter = 0;

export const usePatchAIStore = create<PatchAIStore>()(
  subscribeWithSelector((set, get) => ({
    ...INITIAL_STATE,
    ...INITIAL_UI,

    startExecution: (task) => set({
      taskDescription: task,
      status: 'running',
      startTime: Date.now(),
    }),

    stopExecution: () => set({ status: 'stopped' }),
    pauseExecution: () => set({ status: 'paused' }),

    addNode: (node) => set((state) => {
      const newNodes = { ...state.nodes, [node.id]: node };
      const activeNodes = Object.values(newNodes).filter(n => n.status !== 'pruned').length;
      const prunedNodes = Object.values(newNodes).filter(n => n.status === 'pruned').length;
      
      // Find unique branch IDs
      const branchIds = new Set(Object.values(newNodes).map(n => n.branchId));
      
      return {
        nodes: newNodes,
        stats: {
          ...state.stats,
          totalNodes: Object.keys(newNodes).length,
          activeNodes,
          prunedNodes,
          activeBranches: branchIds.size,
        },
      };
    }),

    updateNode: (id, updates) => set((state) => ({
      nodes: {
        ...state.nodes,
        [id]: { ...state.nodes[id], ...updates },
      },
    })),

    pruneNode: (id) => set((state) => {
      const updatedNodes = { ...state.nodes };
      // Prune node and all descendants
      const pruneRecursive = (nodeId: string) => {
        if (!updatedNodes[nodeId]) return;
        updatedNodes[nodeId] = { ...updatedNodes[nodeId], status: 'pruned' };
        // Find children
        Object.values(updatedNodes).forEach(n => {
          if (n.parentId === nodeId && n.status !== 'pruned') {
            pruneRecursive(n.id);
          }
        });
      };
      pruneRecursive(id);
      
      const activeNodes = Object.values(updatedNodes).filter(n => n.status !== 'pruned').length;
      const prunedNodes = Object.values(updatedNodes).filter(n => n.status === 'pruned').length;
      
      return {
        nodes: updatedNodes,
        stats: { ...state.stats, activeNodes, prunedNodes, humanInterventions: state.stats.humanInterventions + 1 },
      };
    }),

    reviveNode: (id) => set((state) => {
      const updatedNodes = { ...state.nodes };
      if (updatedNodes[id]) {
        updatedNodes[id] = { ...updatedNodes[id], status: 'completed' };
      }
      const activeNodes = Object.values(updatedNodes).filter(n => n.status !== 'pruned').length;
      const prunedNodes = Object.values(updatedNodes).filter(n => n.status === 'pruned').length;
      
      return {
        nodes: updatedNodes,
        stats: { ...state.stats, activeNodes, prunedNodes, humanInterventions: state.stats.humanInterventions + 1 },
      };
    }),

    addEdge: (edge) => set((state) => ({
      edges: [...state.edges, edge],
    })),

    selectNode: (id) => set({
      selectedNodeId: id,
      activePanel: id ? 'node' : get().activePanel,
    }),

    selectAgent: (id) => set({
      selectedAgentId: id,
      activePanel: id ? 'agent' : get().activePanel,
    }),

    setActivePanel: (panel) => set({ activePanel: panel }),

    togglePolicy: (id) => set((state) => {
      const updatedPolicy = state.policy.map(rule =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      );
      const rule = state.policy.find(r => r.id === id);
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
        stats: { ...state.stats, humanInterventions: state.stats.humanInterventions + 1 },
      };
    }),

    addPolicy: (text) => set((state) => {
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
    }),

    addNotification: (notif) => set((state) => {
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
        stats: {
          ...state.stats,
          pendingProposals: notif.type === 'evaluator_proposal' || notif.type === 'approval_required'
            ? state.stats.pendingProposals + 1
            : state.stats.pendingProposals,
        },
      };
    }),

    markNotificationRead: (id) => set((state) => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

    clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

    updateAgent: (id, updates) => set((state) => ({
      agents: {
        ...state.agents,
        [id]: { ...state.agents[id], ...updates },
      },
    })),

    addEvaluatorProposal: (proposal) => set((state) => ({
      evaluatorProposals: [proposal, ...state.evaluatorProposals],
    })),

    resolveProposal: (id, action) => set((state) => ({
      evaluatorProposals: state.evaluatorProposals.map(p =>
        p.id === id ? { ...p, status: action } : p
      ),
      stats: {
        ...state.stats,
        pendingProposals: Math.max(0, state.stats.pendingProposals - 1),
        humanInterventions: state.stats.humanInterventions + 1,
      },
    })),

    addAuditEntry: (entry) => set((state) => {
      const id = `audit-${++auditIdCounter}`;
      return {
        auditLog: [{ ...entry, id }, ...state.auditLog].slice(0, 200),
      };
    }),

    updateStats: (stats) => set((state) => ({
      stats: { ...state.stats, ...stats },
    })),

    setShowOnboarding: (show) => set({ showOnboarding: show }),
    setDemoRunning: (running) => set({ isDemoRunning: running }),
    setNotificationTrayOpen: (open) => set({ notificationTrayOpen: open }),

    resetState: () => set({
      ...INITIAL_STATE,
      ...INITIAL_UI,
      showOnboarding: false,
    }),
  }))
);
