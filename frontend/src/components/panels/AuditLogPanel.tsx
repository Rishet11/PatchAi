'use client';

import React from 'react';
import { usePatchAIStore } from '@/store/patchai';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const OP_CONFIG: Record<string, { icon: string; color: string }> = {
  APPLY: { icon: '✅', color: 'var(--accent-emerald)' },
  PROPOSE: { icon: '📤', color: 'var(--accent-indigo-light)' },
  PRUNE: { icon: '✂️', color: 'var(--accent-red)' },
  REVIVE: { icon: '🌱', color: 'var(--accent-emerald)' },
  INJECT: { icon: '💉', color: 'var(--accent-cyan)' },
  EDIT_ARTIFACT: { icon: '✏️', color: 'var(--accent-amber)' },
  UPDATE_POLICY: { icon: '📜', color: 'var(--accent-violet)' },
  BRANCH: { icon: '🌿', color: 'var(--accent-cyan)' },
  MERGE: { icon: '🔀', color: 'var(--accent-indigo-light)' },
  DIRECT_CHAT: { icon: '💬', color: 'var(--accent-cyan)' },
  REASSIGN_AGENT: { icon: '🔄', color: 'var(--accent-amber)' },
};

export default function AuditLogPanel() {
  const auditLog = usePatchAIStore(s => s.auditLog);

  return (
    <div className="panel-content" style={{ padding: '8px 10px' }}>
      {auditLog.length === 0 ? (
        <div className="empty-state" style={{ height: 200 }}>
          <div className="empty-state__icon">📋</div>
          <div className="empty-state__title">No audit entries</div>
          <div className="empty-state__description">All operations will be logged here with full provenance</div>
        </div>
      ) : (
        auditLog.map(entry => {
          const opCfg = OP_CONFIG[entry.operation] || { icon: '🔧', color: 'var(--text-secondary)' };
          return (
            <div key={entry.id} className="audit-entry">
              <div
                className="audit-entry__icon"
                style={{ background: `${opCfg.color}20`, border: `1px solid ${opCfg.color}30` }}
              >
                {opCfg.icon}
              </div>
              <div className="audit-entry__body">
                <div className="audit-entry__op" style={{ color: opCfg.color }}>
                  {entry.operation}
                  {entry.policyCheck && (
                    <span style={{
                      marginLeft: 8,
                      fontSize: 9,
                      fontFamily: 'var(--font-sans)',
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: entry.policyCheck === 'passed' ? 'var(--accent-emerald-dim)' : entry.policyCheck === 'bypassed' ? 'var(--accent-cyan-dim)' : 'var(--accent-red-dim)',
                      color: entry.policyCheck === 'passed' ? 'var(--accent-emerald)' : entry.policyCheck === 'bypassed' ? 'var(--accent-cyan)' : 'var(--accent-red)',
                    }}>
                      {entry.policyCheck}
                    </span>
                  )}
                </div>
                <div className="audit-entry__detail">
                  <span style={{ color: 'var(--accent-indigo-light)', fontWeight: 600 }}>{entry.actor}</span>
                  {entry.nodeId && <span style={{ color: 'var(--text-tertiary)' }}> · {entry.nodeId.substring(0, 16)}</span>}
                  <br />
                  {entry.details}
                </div>
              </div>
              <div className="audit-entry__time">{formatTime(entry.timestamp)}</div>
            </div>
          );
        })
      )}
    </div>
  );
}
