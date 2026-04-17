'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GraphNode } from '@/lib/types';
import { Split, User } from 'lucide-react';

type NodeData = GraphNode & { [key: string]: unknown };

export const DecisionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NodeData;
  const isPruned = nodeData.status === 'pruned';
  const color = 'var(--accent-cyan)';

  return (
    <div
      className={['rf-node', selected ? 'selected' : '', isPruned ? 'pruned' : ''].filter(Boolean).join(' ')}
      style={{
        ['--node-accent' as string]: color,
        ['--node-color' as string]: color,
        borderColor: selected ? color : 'var(--border-default)',
        opacity: isPruned ? 0.35 : 1,
        borderRadius: 24, // Makes it a pill shape for distinct visual processing
        padding: '12px 16px',
        borderStyle: 'dashed',
        borderWidth: 2,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, top: -4 }} />

      {nodeData.humanOverride && (
        <div className="rf-node__human-badge" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <User size={8} /> HUMAN
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ background: 'var(--accent-cyan-dim)', padding: 6, borderRadius: '50%' }}>
          <Split size={14} color={color} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          {nodeData.title}
        </div>
      </div>
      
      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
        Awaiting human input or automatic heuristic branch evaluation.
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, bottom: -4 }} />
    </div>
  );
});

DecisionNode.displayName = 'DecisionNode';
