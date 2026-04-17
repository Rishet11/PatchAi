'use client';

import React from 'react';
import { usePatchAIStore } from '@/store/patchai';
import {
  Check, Send, Scissors, Sprout, Pencil, ScrollText,
  GitBranch, GitMerge, MessageCircle, RefreshCw, Wrench,
  Zap, AlertTriangle
} from 'lucide-react';
import { OperationType } from '@/lib/types';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const POLICY_CHECK_STYLES: Record<string, { bg: string; color: string }> = {
  passed: { bg: 'var(--accent-emerald-dim)', color: 'var(--accent-emerald)' },
  bypassed: { bg: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)' },
  failed: { bg: 'var(--accent-red-dim)', color: 'var(--accent-red)' },
};

const OP_CONFIG: Record<string, { Icon: React.ElementType; color: string }> = {
  APPLY:          { Icon: Check,          color: 'var(--accent-emerald)' },
  PROPOSE:        { Icon: Send,           color: 'var(--accent-indigo-light)' },
  PRUNE:          { Icon: Scissors,       color: 'var(--accent-red)' },
  REVIVE:         { Icon: Sprout,         color: 'var(--accent-emerald)' },
  INJECT:         { Icon: Zap,            color: 'var(--accent-cyan)' },
  EDIT_ARTIFACT:  { Icon: Pencil,         color: 'var(--accent-amber)' },
  UPDATE_POLICY:  { Icon: ScrollText,     color: 'var(--accent-violet)' },
  BRANCH:         { Icon: GitBranch,      color: 'var(--accent-cyan)' },
  MERGE:          { Icon: GitMerge,       color: 'var(--accent-indigo-light)' },
  DIRECT_CHAT:    { Icon: MessageCircle,  color: 'var(--accent-cyan)' },
  REASSIGN_AGENT: { Icon: RefreshCw,      color: 'var(--accent-amber)' },
};

export default function AuditLogPanel() {
  const auditLog = usePatchAIStore(s => s.auditLog);

  return (
    <div className="panel-content" style={{ padding: '8px 10px' }}>
      {auditLog.length === 0 ? (
        <div className="empty-state" style={{ height: 200 }}>
          <div className="empty-state__icon" style={{ display: 'flex', justifyContent: 'center', opacity: 0.3 }}>
            <ScrollText size={32} strokeWidth={1.5} />
          </div>
          <div className="empty-state__title">No audit entries</div>
          <div className="empty-state__description">All operations will be logged here with full provenance</div>
        </div>
      ) : (
        auditLog.map(entry => {
          const opCfg = OP_CONFIG[entry.operation as keyof typeof OP_CONFIG] || { Icon: Wrench, color: 'var(--text-secondary)' };
          const { Icon } = opCfg;
          const policyStyle = entry.policyCheck ? POLICY_CHECK_STYLES[entry.policyCheck] : null;

          return (
            <div key={entry.id} className="audit-entry">
              <div
                className="audit-entry__icon"
                style={{ background: `${opCfg.color}20`, border: `1px solid ${opCfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon size={13} color={opCfg.color} strokeWidth={2} />
              </div>
              <div className="audit-entry__body">
                <div className="audit-entry__op" style={{ color: opCfg.color }}>
                  {entry.operation}
                  {policyStyle && (
                    <span style={{
                      marginLeft: 8, fontSize: 9, fontFamily: 'var(--font-sans)',
                      padding: '1px 5px', borderRadius: 4,
                      background: policyStyle.bg, color: policyStyle.color,
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
