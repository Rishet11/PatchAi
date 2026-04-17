'use client';

import React, { useEffect, useRef } from 'react';
import { usePatchAIStore } from '@/store/patchai';
import { Search, X } from 'lucide-react';

export default function GraphSearchBar() {
  const graphSearchQuery = usePatchAIStore(s => s.graphSearchQuery);
  const setGraphSearchQuery = usePatchAIStore(s => s.setGraphSearchQuery);
  const nodes = usePatchAIStore(s => s.nodes);
  const inputRef = useRef<HTMLInputElement>(null);

  const matchCount = graphSearchQuery
    ? Object.values(nodes).filter(n =>
        n.title.toLowerCase().includes(graphSearchQuery.toLowerCase()) ||
        n.agent.toLowerCase().includes(graphSearchQuery.toLowerCase()) ||
        n.artifactType.toLowerCase().includes(graphSearchQuery.toLowerCase()) ||
        n.artifact.toLowerCase().includes(graphSearchQuery.toLowerCase()) ||
        n.branchId.toLowerCase().includes(graphSearchQuery.toLowerCase())
      ).length
    : 0;

  // Escape to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === 'Escape' && tag === 'INPUT') {
        setGraphSearchQuery('');
        inputRef.current?.blur();
      }
      // Ctrl+F or Cmd+F to focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setGraphSearchQuery]);

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      pointerEvents: 'all',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--bg-secondary)',
        border: `1px solid ${graphSearchQuery ? 'var(--accent-indigo)' : 'var(--border-default)'}`,
        borderRadius: 6,
        padding: '5px 10px',
        transition: 'border-color 0.15s',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        minWidth: 220,
      }}>
        <Search size={13} color="var(--text-tertiary)" />
        <input
          ref={inputRef}
          type="text"
          value={graphSearchQuery}
          onChange={e => setGraphSearchQuery(e.target.value)}
          placeholder="Search nodes… (⌘F)"
          style={{
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 12,
            color: 'var(--text-primary)',
            width: 160,
            fontFamily: 'var(--font-sans)',
          }}
        />
        {graphSearchQuery && (
          <>
            <span style={{ fontSize: 10, color: matchCount > 0 ? 'var(--accent-emerald)' : 'var(--accent-red)', fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 2 }}>
              {matchCount} match{matchCount !== 1 ? 'es' : ''}
            </span>
            <button
              onClick={() => setGraphSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-tertiary)', display: 'flex', lineHeight: 1 }}
            >
              <X size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
