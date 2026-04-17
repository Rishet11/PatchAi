// ==========================================
// Patch.AI — Constants & Configuration
// ==========================================

import { AgentRole, NodeStatus, ArtifactType } from './types';

// Lucide icon name mapping — NO emoji strings in this file
export type AgentIconKey = 'ListTodo' | 'Code2' | 'Eye' | 'FlaskConical' | 'Scale' | 'User';
export type ArtifactIconKey = 'ClipboardList' | 'FileCode' | 'FileText' | 'TestTube' | 'Zap' | 'ScrollText' | 'MessageCircle';

export const AGENT_CONFIG: Record<AgentRole, {
  name: string;
  iconKey: AgentIconKey;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  planner: {
    name: 'Planner',
    iconKey: 'ListTodo',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#2563eb',
    description: 'Decomposes goals into executable plans',
  },
  coder: {
    name: 'Coder',
    iconKey: 'Code2',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#16a34a',
    description: 'Implements features and fixes bugs',
  },
  reviewer: {
    name: 'Reviewer',
    iconKey: 'Eye',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#d97706',
    description: 'Reviews code quality and correctness',
  },
  tester: {
    name: 'Tester',
    iconKey: 'FlaskConical',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#dc2626',
    description: 'Writes and runs test suites',
  },
  evaluator: {
    name: 'Evaluator',
    iconKey: 'Scale',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: '#9333ea',
    description: 'Monitors branch quality and proposes pruning',
  },
  human: {
    name: 'Human',
    iconKey: 'User',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: '#0891b2',
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

export const ARTIFACT_ICONS: Record<ArtifactType, ArtifactIconKey> = {
  plan: 'ClipboardList',
  code: 'FileCode',
  review: 'FileText',
  test_report: 'TestTube',
  decision: 'Zap',
  policy: 'ScrollText',
  message: 'MessageCircle',
};

// Helper to get artifact label
export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  plan: 'Plan',
  code: 'Code',
  review: 'Review',
  test_report: 'Test Report',
  decision: 'Decision',
  policy: 'Policy',
  message: 'Message',
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

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://patchai.onrender.com';

export const GRAPH_LAYOUT_OPTIONS = {
  rankdir: 'TB',
  nodesep: 80,
  ranksep: 100,
  edgesep: 40,
};
