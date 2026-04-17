'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GraphNode, NodeStatus } from '@/lib/types';
import { AGENT_CONFIG, NODE_STATUS_CONFIG, ARTIFACT_ICONS } from '@/lib/constants';
import { AlertTriangle, User } from 'lucide-react';

type AgentNodeData = GraphNode & { [key: string]: unknown };

function StatusDot({ status }: { status: NodeStatus }) {
  const cfg = NODE_STATUS_CONFIG[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div
        className={`status-dot${cfg.pulse ? ' pulse' : ''}`}
        style={{ background: cfg.dotColor, color: cfg.dotColor }}
      />
      <span style={{ color: cfg.color, fontSize: 10, fontWeight: 700 }}>
        {cfg.label}
      </span>
    </div>
  );
}

export const AgentNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as AgentNodeData;
  const agentCfg = AGENT_CONFIG[nodeData.agent];
  const artifactIcon = ARTIFACT_ICONS[nodeData.artifactType];

  const isPruned = nodeData.status === 'pruned';

  return (
    <div
      className={[
        'rf-node',
        selected ? 'selected' : '',
        isPruned ? 'pruned' : '',
        nodeData.humanOverride ? 'human-override' : '',
      ].filter(Boolean).join(' ')}
      style={{
        ['--node-accent' as string]: agentCfg.color,
        ['--node-color' as string]: agentCfg.color,
        borderColor: selected
          ? agentCfg.color
          : nodeData.humanOverride
            ? 'var(--accent-cyan)'
            : undefined,
        opacity: isPruned ? 0.35 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, top: -4 }} />

      {/* Human override badge */}
      {nodeData.humanOverride && (
        <div className="rf-node__human-badge" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <User size={8} /> HUMAN
        </div>
      )}

      {/* Evaluator flag */}
      {nodeData.evaluatorFlag && !isPruned && (
        <div className="rf-node__eval-badge" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <AlertTriangle size={8} /> EVAL
        </div>
      )}

      {/* Header */}
      <div className="rf-node__header">
        <span className="rf-node__agent" style={{ color: agentCfg.color }}>
          {agentCfg.name}
        </span>
      </div>

      {/* Title */}
      <div className="rf-node__title">{nodeData.title}</div>

      {/* Footer */}
      <div className="rf-node__footer">
        <span className="rf-node__artifact">
          <span>{artifactIcon}</span>
          <span style={{ textTransform: 'capitalize' }}>{nodeData.artifactType.replace('_', ' ')}</span>
        </span>
        <StatusDot status={nodeData.status} />
      </div>

      {/* Working shimmer bar */}
      {nodeData.status === 'working' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${agentCfg.color}, transparent)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }} />
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, bottom: -4 }} />
    </div>
  );
});

AgentNode.displayName = 'AgentNode';

export const nodeTypes = {
  agentNode: AgentNode,
};
