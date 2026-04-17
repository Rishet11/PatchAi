'use client';

import React from 'react';
import { usePatchAIStore } from '@/store/patchai';
import { AGENT_CONFIG, ARTIFACT_ICONS } from '@/lib/constants';
import { GraphNode } from '@/lib/types';

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

export default function NodeDetailPanel() {
  const selectedNodeId = usePatchAIStore(s => s.selectedNodeId);
  const nodes = usePatchAIStore(s => s.nodes);
  const pruneNode = usePatchAIStore(s => s.pruneNode);
  const reviveNode = usePatchAIStore(s => s.reviveNode);
  const addNode = usePatchAIStore(s => s.addNode);
  const addEdge = usePatchAIStore(s => s.addEdge);
  const addAuditEntry = usePatchAIStore(s => s.addAuditEntry);
  const addNotification = usePatchAIStore(s => s.addNotification);
  const auditLog = usePatchAIStore(s => s.auditLog);

  const node: GraphNode | undefined = selectedNodeId ? nodes[selectedNodeId] : undefined;

  if (!node) {
    return (
      <div className="empty-state" style={{ padding: 24 }}>
        <div className="empty-state__icon">🔍</div>
        <div className="empty-state__title">No node selected</div>
        <div className="empty-state__description">
          Click any node in the graph to inspect its artifact, metadata, and available operations
        </div>
      </div>
    );
  }

  const agentCfg = AGENT_CONFIG[node.agent];
  const artifactIcon = ARTIFACT_ICONS[node.artifactType];
  const nodeAudit = auditLog.filter(e => e.nodeId === node.id);

  const isCode = node.artifactType === 'code';
  const isMarkdown = ['plan', 'review', 'test_report', 'decision', 'policy'].includes(node.artifactType);

  const handlePrune = () => {
    pruneNode(node.id);
    addAuditEntry({ nodeId: node.id, operation: 'PRUNE', actor: 'human', success: true, details: 'Human operator pruned node', policyCheck: 'passed', timestamp: Date.now() });
    addNotification({ type: 'info', title: 'Node Pruned', message: `Branch pruned at ${node.title}` });
  };

  const handleRevive = () => {
    reviveNode(node.id);
    addAuditEntry({ nodeId: node.id, operation: 'REVIVE', actor: 'human', success: true, details: 'Human operator revived node', policyCheck: 'passed', timestamp: Date.now() });
    addNotification({ type: 'success', title: '✨ Node Revived', message: `Branch revived at ${node.title}` });
  };

  const handleBranch = () => {
    const branchId = `node-human-${Date.now()}`;
    addNode({
      id: branchId,
      parentId: node.id,
      agent: 'human',
      status: 'active',
      artifactType: 'decision',
      title: 'Human Override Decision',
      artifact: '# Human Override\n\nOperator created a new execution branch from this point.\n\nThis node represents a human_override intervention in the live execution graph.',
      contextDelta: 'Human operator created branch from panel',
      humanOverride: true,
      evaluatorFlag: false,
      timestamp: Date.now(),
      depth: node.depth + 1,
      branchId: `branch-human-${Date.now()}`,
      metadata: { humanOverride: true },
    });
    addEdge({ id: `e-${node.id}-${branchId}`, source: node.id, target: branchId, type: 'human', animated: true });
    addAuditEntry({ nodeId: branchId, operation: 'BRANCH', actor: 'human', success: true, details: 'Human branched from panel', policyCheck: 'bypassed', timestamp: Date.now() });
    addNotification({ type: 'success', title: '🌿 Branch Created', message: 'New human override branch created.' });
  };

  return (
    <div className="node-detail animate-slide-up">
      {/* Metadata */}
      <div className="node-detail__meta">
        <div className="node-detail__id">
          ID: {node.id} · Depth: {node.depth} · Branch: {node.branchId}
        </div>
        <div className="node-detail__title">{node.title}</div>
        <div className="node-detail__tags">
          <span className="tag tag-agent" style={{ background: `${agentCfg.bgColor}`, color: agentCfg.color, borderColor: `${agentCfg.color}40` }}>
            {agentCfg.icon} {agentCfg.name}
          </span>
          <span className="tag tag-artifact">
            {artifactIcon} {node.artifactType.replace('_', ' ')}
          </span>
          {node.humanOverride && (
            <span className="badge badge-cyan" style={{ fontSize: 10 }}>HUMAN OVERRIDE</span>
          )}
          <span style={{
            fontSize: 10, color: 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', gap: 4, marginLeft: 2,
          }}>
            ⏱ {formatTime(node.timestamp)}
          </span>
        </div>
      </div>

      {/* Artifact Viewer */}
      <div className="artifact-viewer">
        <div className="artifact-viewer__header">
          <span className="artifact-viewer__label">
            {artifactIcon} Artifact — {node.artifactType.replace('_', ' ')}
          </span>
        </div>
        <div
          className="artifact-content"
          style={{
            fontFamily: isCode ? 'var(--font-mono)' : 'var(--font-sans)',
            fontSize: isCode ? 11 : 12,
            color: isCode ? '#a5b4fc' : 'var(--text-secondary)',
          }}
        >
          {node.artifact}
        </div>
      </div>

      {/* Context Delta */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontWeight: 700 }}>
          Context Delta
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
          {node.contextDelta}
        </div>
      </div>

      {/* Audit (this node) */}
      {nodeAudit.length > 0 && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontWeight: 700 }}>
            Node Audit Log
          </div>
          {nodeAudit.slice(0, 3).map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-indigo-light)', fontFamily: 'var(--font-mono)' }}>
                {entry.operation}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', flex: 1 }}>
                {entry.details}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="node-actions">
        {node.status !== 'pruned' ? (
          <button className="btn btn-danger btn-sm" onClick={handlePrune}>
            ✂️ Prune
          </button>
        ) : (
          <button className="btn btn-success btn-sm" onClick={handleRevive}>
            🌱 Revive
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={handleBranch}>
          🌿 Branch From Here
        </button>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 10 }}>
          📋 Copy ID
        </button>
      </div>
    </div>
  );
}
