'use client';

import React, { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { usePatchAIStore } from '@/store/patchai';
import { AGENT_CONFIG, ARTIFACT_ICONS } from '@/lib/constants';
import { GraphNode } from '@/lib/types';
import {
  Scissors, Sprout, GitBranch, Copy, Pencil, Save, X,
  Clock, Hash, Tag
} from 'lucide-react';

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

function getMonacoLanguage(node: GraphNode): string {
  if (node.artifactType === 'code') {
    if (node.artifact.includes('const ') || node.artifact.includes('require(')) return 'javascript';
    return 'python';
  }
  return 'markdown';
}

export default function NodeDetailPanel() {
  const selectedNodeId = usePatchAIStore(s => s.selectedNodeId);
  const nodes = usePatchAIStore(s => s.nodes);
  const pruneNode = usePatchAIStore(s => s.pruneNode);
  const reviveNode = usePatchAIStore(s => s.reviveNode);
  const updateNode = usePatchAIStore(s => s.updateNode);
  const addNode = usePatchAIStore(s => s.addNode);
  const addEdge = usePatchAIStore(s => s.addEdge);
  const addAuditEntry = usePatchAIStore(s => s.addAuditEntry);
  const addNotification = usePatchAIStore(s => s.addNotification);
  const auditLog = usePatchAIStore(s => s.auditLog);

  const [isEditing, setIsEditing] = useState(false);
  const [editedArtifact, setEditedArtifact] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  const node: GraphNode | undefined = selectedNodeId ? nodes[selectedNodeId] : undefined;

  const handleStartEdit = useCallback(() => {
    if (!node) return;
    setEditedArtifact(node.artifact);
    setIsEditing(true);
  }, [node]);

  const handleSave = useCallback(() => {
    if (!node) return;
    const originalLen = node.artifact.length;
    const newLen = editedArtifact.length;
    updateNode(node.id, { artifact: editedArtifact, humanOverride: true });
    addAuditEntry({
      nodeId: node.id,
      operation: 'EDIT_ARTIFACT',
      actor: 'human',
      success: true,
      details: `Human edited artifact — ${originalLen > newLen ? `removed ${originalLen - newLen}` : `added ${newLen - originalLen}`} chars`,
      policyCheck: 'bypassed',
      timestamp: Date.now(),
    });
    addNotification({
      type: 'info',
      title: 'Artifact Modified',
      message: 'Downstream nodes may need re-evaluation. Human override flag set.',
    });
    setIsEditing(false);
  }, [node, editedArtifact, updateNode, addAuditEntry, addNotification]);

  const handleCancelEdit = useCallback(() => setIsEditing(false), []);

  const handleCopyId = useCallback(() => {
    if (!node) return;
    navigator.clipboard.writeText(node.id).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    });
  }, [node]);

  const handlePrune = useCallback(() => {
    if (!node) return;
    pruneNode(node.id);
    addAuditEntry({ nodeId: node.id, operation: 'PRUNE', actor: 'human', success: true, details: 'Human operator pruned node', policyCheck: 'passed', timestamp: Date.now() });
    addNotification({ type: 'info', title: 'Node Pruned', message: `Branch pruned at ${node.title}` });
  }, [node, pruneNode, addAuditEntry, addNotification]);

  const handleRevive = useCallback(() => {
    if (!node) return;
    reviveNode(node.id);
    addAuditEntry({ nodeId: node.id, operation: 'REVIVE', actor: 'human', success: true, details: 'Human operator revived node', policyCheck: 'passed', timestamp: Date.now() });
    addNotification({ type: 'success', title: 'Node Revived', message: `Branch revived at ${node.title}` });
  }, [node, reviveNode, addAuditEntry, addNotification]);

  const handleBranch = useCallback(() => {
    if (!node) return;
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
    addNotification({ type: 'success', title: 'Branch Created', message: 'New human override branch created.' });
  }, [node, addNode, addEdge, addAuditEntry, addNotification]);

  if (!node) {
    return (
      <div className="empty-state" style={{ padding: 24 }}>
        <div className="empty-state__icon" style={{ fontSize: 28, opacity: 0.3 }}>
          <Hash size={32} strokeWidth={1.5} />
        </div>
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
  const language = getMonacoLanguage(node);

  return (
    <div className="node-detail animate-slide-up">
      {/* Metadata */}
      <div className="node-detail__meta">
        <div className="node-detail__id" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Hash size={10} />
          {node.id} · Depth: {node.depth} · Branch: {node.branchId}
        </div>
        <div className="node-detail__title">{node.title}</div>
        <div className="node-detail__tags">
          <span className="tag tag-agent" style={{ background: `${agentCfg.bgColor}`, color: agentCfg.color, borderColor: `${agentCfg.color}40` }}>
            {agentCfg.name}
          </span>
          <span className="tag tag-artifact">
            {artifactIcon} {node.artifactType.replace('_', ' ')}
          </span>
          {node.humanOverride && (
            <span className="badge badge-cyan" style={{ fontSize: 10 }}>HUMAN OVERRIDE</span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 2 }}>
            <Clock size={10} />
            {formatTime(node.timestamp)}
          </span>
        </div>
      </div>

      {/* Artifact Viewer / Editor */}
      <div className="artifact-viewer" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="artifact-viewer__header">
          <span className="artifact-viewer__label">
            <Tag size={10} style={{ display: 'inline', marginRight: 4 }} />
            {node.artifactType.replace('_', ' ')} · {language}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {isEditing ? (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                >
                  <Save size={11} /> Save
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleCancelEdit}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                >
                  <X size={11} /> Cancel
                </button>
              </>
            ) : (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleStartEdit}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
              >
                <Pencil size={11} /> Edit
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <Editor
            height="100%"
            defaultLanguage={language}
            language={language}
            value={isEditing ? editedArtifact : node.artifact}
            onChange={(val) => isEditing && setEditedArtifact(val || '')}
            theme="vs-dark"
            options={{
              readOnly: !isEditing,
              fontSize: 12,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 10, bottom: 10 },
              renderLineHighlight: isEditing ? 'all' : 'none',
              scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineDecorationsWidth: 8,
              glyphMargin: false,
              folding: false,
              contextmenu: false,
            }}
          />
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

      {/* Node Audit */}
      {nodeAudit.length > 0 && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontWeight: 700 }}>
            Node Operations
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
          <button className="btn btn-danger btn-sm" onClick={handlePrune} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Scissors size={12} /> Prune
          </button>
        ) : (
          <button className="btn btn-success btn-sm" onClick={handleRevive} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sprout size={12} /> Revive
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={handleBranch} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <GitBranch size={12} /> Branch From Here
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleCopyId}
          style={{ marginLeft: 'auto', fontSize: 10, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Copy size={11} /> {copyFeedback ? 'Copied!' : 'Copy ID'}
        </button>
      </div>
    </div>
  );
}
