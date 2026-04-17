'use client';

import React, { useEffect, useRef } from 'react';
import { GraphNode } from '@/lib/types';
import { AGENT_CONFIG } from '@/lib/constants';
import { Search, Scissors, Sprout, GitBranch, User, Cpu } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  node: GraphNode | undefined;
  onPrune: (id: string) => void;
  onRevive: (id: string) => void;
  onBranch: (id: string) => void;
  onInspect: (id: string) => void;
  onClose: () => void;
}

export function ContextMenu({
  x, y, nodeId, node, onPrune, onRevive, onBranch, onInspect, onClose
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isPruned = node?.status === 'pruned';
  const agentCfg = node ? AGENT_CONFIG[node.agent] : null;

  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 280);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!node) return null;

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={e => e.stopPropagation()}
    >
      {/* Node info header */}
      <div style={{
        padding: '8px 12px 6px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={14} color={agentCfg?.color} strokeWidth={1.5} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              {node.title}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
              {agentCfg?.name} · {node.artifactType}
            </div>
          </div>
        </div>
      </div>

      {/* Inspect */}
      <button className="context-menu__item" onClick={() => onInspect(nodeId)}>
        <Search size={14} strokeWidth={1.5} />
        <span>Inspect Node</span>
      </button>

      <div className="context-menu__divider" />

      {/* Prune / Revive */}
      {!isPruned ? (
        <button className="context-menu__item danger" onClick={() => onPrune(nodeId)}>
          <Scissors size={14} strokeWidth={1.5} />
          <span>Prune Branch</span>
        </button>
      ) : (
        <button className="context-menu__item success" onClick={() => onRevive(nodeId)}>
          <Sprout size={14} strokeWidth={1.5} />
          <span>Revive Branch</span>
        </button>
      )}

      {/* Branch from here */}
      <button className="context-menu__item" onClick={() => onBranch(nodeId)}>
        <GitBranch size={14} strokeWidth={1.5} />
        <span>Branch From Here</span>
      </button>

      <div className="context-menu__divider" />

      {/* Node metadata */}
      <div style={{ padding: '6px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          padding: '2px 6px', background: 'var(--bg-elevated)',
          borderRadius: 4, fontSize: 10, color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {nodeId}
        </span>
        {node.humanOverride && (
          <span style={{
            padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--accent-cyan-dim)', borderRadius: 4,
            fontSize: 10, color: 'var(--accent-cyan)',
          }}>
            <User size={10} /> human override
          </span>
        )}
      </div>
    </div>
  );
}
