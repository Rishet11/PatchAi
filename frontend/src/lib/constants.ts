// ==========================================
// Patch.AI — Constants & Configuration
// ==========================================

import { AgentRole, NodeStatus, ArtifactType } from './types';

export const AGENT_CONFIG: Record<AgentRole, {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  description: string;
}> = {
  planner: {
    name: 'Planner',
    icon: '🧠',
    color: '#818cf8',
    bgColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    description: 'Decomposes goals into executable plans',
  },
  coder: {
    name: 'Coder',
    icon: '💻',
    color: '#34d399',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    description: 'Implements features and fixes bugs',
  },
  reviewer: {
    name: 'Reviewer',
    icon: '🔍',
    color: '#fbbf24',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    description: 'Reviews code quality and correctness',
  },
  tester: {
    name: 'Tester',
    icon: '🧪',
    color: '#f87171',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    description: 'Writes and runs test suites',
  },
  evaluator: {
    name: 'Evaluator',
    icon: '⚖️',
    color: '#c084fc',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    description: 'Monitors branch quality and proposes pruning',
  },
  human: {
    name: 'Human',
    icon: '👤',
    color: '#22d3ee',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.5)',
    description: 'Human operator intervention',
  },
};

export const NODE_STATUS_CONFIG: Record<NodeStatus, {
  label: string;
  color: string;
  dotColor: string;
  pulse: boolean;
}> = {
  active: { label: 'Active', color: '#22d3ee', dotColor: '#22d3ee', pulse: false },
  working: { label: 'Working', color: '#fbbf24', dotColor: '#fbbf24', pulse: true },
  completed: { label: 'Completed', color: '#34d399', dotColor: '#34d399', pulse: false },
  pruned: { label: 'Pruned', color: '#6b7280', dotColor: '#6b7280', pulse: false },
  error: { label: 'Error', color: '#f87171', dotColor: '#f87171', pulse: true },
  waiting: { label: 'Waiting', color: '#fbbf24', dotColor: '#fbbf24', pulse: true },
};

export const ARTIFACT_ICONS: Record<ArtifactType, string> = {
  plan: '📋',
  code: '📄',
  review: '📝',
  test_report: '🧾',
  decision: '⚡',
  policy: '📜',
  message: '💬',
};

export const POLICY_RULES_DEFAULT = [
  {
    id: 'rule-1',
    text: 'Planner must complete before Coder can begin',
    type: 'transition' as const,
    enabled: true,
    proposer: 'human' as const,
    timestamp: Date.now() - 3600000,
    category: 'Sequencing',
  },
  {
    id: 'rule-2',
    text: 'Branching requires human approval when depth exceeds 3',
    type: 'approval' as const,
    enabled: true,
    proposer: 'human' as const,
    timestamp: Date.now() - 3600000,
    category: 'Branching',
  },
  {
    id: 'rule-3',
    text: 'Only the Evaluator may propose pruning operations',
    type: 'permission' as const,
    enabled: true,
    proposer: 'human' as const,
    timestamp: Date.now() - 3600000,
    category: 'Pruning',
  },
  {
    id: 'rule-4',
    text: 'Merging two branches requires human approval',
    type: 'approval' as const,
    enabled: false,
    proposer: 'human' as const,
    timestamp: Date.now() - 3600000,
    category: 'Merging',
  },
  {
    id: 'rule-5',
    text: 'Coder agent may not access external APIs without approval',
    type: 'permission' as const,
    enabled: true,
    proposer: 'human' as const,
    timestamp: Date.now() - 3600000,
    category: 'Security',
  },
  {
    id: 'rule-6',
    text: 'Maximum 4 parallel branches allowed per execution',
    type: 'constraint' as const,
    enabled: true,
    proposer: 'human' as const,
    timestamp: Date.now() - 3600000,
    category: 'Constraints',
  },
];

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const GRAPH_LAYOUT_OPTIONS = {
  rankdir: 'TB',
  nodesep: 80,
  ranksep: 100,
  edgesep: 40,
};
