'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GraphNode } from '@/lib/types';
import { AlertOctagon } from 'lucide-react';

type NodeData = GraphNode & { [key: string]: unknown };

export const ErrorNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NodeData;
  const isPruned = nodeData.status === 'pruned';
  const color = 'var(--accent-red)';

  return (
    <div
      className={['rf-node', selected ? 'selected' : '', isPruned ? 'pruned' : ''].filter(Boolean).join(' ')}
      style={{
        ['--node-accent' as string]: color,
        ['--node-color' as string]: color,
        borderColor: color,
        opacity: isPruned ? 0.35 : 1,
        background: 'rgba(220, 38, 38, 0.1)',
        padding: '12px 14px',
        boxShadow: selected ? `0 0 0 2px ${color}` : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, top: -4 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <AlertOctagon size={18} color={color} />
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Execution Halted
        </div>
      </div>
      
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        {nodeData.title}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, bottom: -4 }} />
    </div>
  );
});

ErrorNode.displayName = 'ErrorNode';
