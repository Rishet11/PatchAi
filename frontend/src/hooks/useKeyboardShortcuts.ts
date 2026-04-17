'use client';

import { useEffect } from 'react';
import { usePatchAIStore } from '@/store/patchai';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      // Don't fire shortcuts when typing in inputs
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const store = usePatchAIStore.getState();

      // Escape — close context menu, deselect node, close notification tray
      if (e.key === 'Escape') {
        store.setNotificationTrayOpen(false);
        if (store.selectedNodeId) {
          store.selectNode(null);
        }
      }

      // 1-4 — switch sidebar tabs
      if (e.key === '1') store.setActivePanel('node');
      if (e.key === '2') store.setActivePanel('agent');
      if (e.key === '3') store.setActivePanel('policy');
      if (e.key === '4') store.setActivePanel('audit');

      // B — branch from selected node
      if (e.key === 'b' || e.key === 'B') {
        const nodeId = store.selectedNodeId;
        const node = nodeId ? store.nodes[nodeId] : null;
        if (!node) return;
        const branchId = `node-human-${Date.now()}`;
        store.addNode({
          id: branchId,
          parentId: node.id,
          agent: 'human',
          status: 'active',
          artifactType: 'decision',
          title: 'Human Branch (Keyboard)',
          artifact: '# Human Override Decision\n\nOperator created a branch via keyboard shortcut (B).',
          contextDelta: 'Human branch via keyboard shortcut',
          humanOverride: true,
          evaluatorFlag: false,
          timestamp: Date.now(),
          depth: node.depth + 1,
          branchId: `branch-human-${Date.now()}`,
          metadata: { humanOverride: true },
        });
        store.addEdge({ id: `e-${node.id}-${branchId}`, source: node.id, target: branchId, type: 'human', animated: true });
        store.addAuditEntry({ nodeId: branchId, operation: 'BRANCH', actor: 'human', success: true, details: 'Keyboard shortcut: B to branch', policyCheck: 'bypassed', timestamp: Date.now() });
        store.addNotification({ type: 'success', title: 'Branch Created', message: 'Human branch created via keyboard (B).' });
      }

      // Delete / Backspace — prune selected node
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const nodeId = store.selectedNodeId;
        const node = nodeId ? store.nodes[nodeId] : null;
        if (!node) return;
        if (node.status === 'pruned') return; // already pruned
        store.pruneNode(node.id);
        store.addAuditEntry({ nodeId: node.id, operation: 'PRUNE', actor: 'human', success: true, details: 'Keyboard shortcut: Delete to prune', policyCheck: 'passed', timestamp: Date.now() });
        store.addNotification({ type: 'info', title: 'Node Pruned', message: `Node pruned via keyboard (Delete).` });
      }

      // Ctrl+E / Cmd+E — trigger Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        const state = store;
        const snapshot = {
          id: state.id,
          taskDescription: state.taskDescription,
          status: state.status,
          startTime: state.startTime,
          nodes: state.nodes,
          edges: state.edges,
          agents: state.agents,
          policy: state.policy,
          policyHistory: state.policyHistory,
          auditLog: state.auditLog,
          notifications: state.notifications,
          evaluatorProposals: state.evaluatorProposals,
          stats: state.stats,
        };
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patchai-snapshot-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
