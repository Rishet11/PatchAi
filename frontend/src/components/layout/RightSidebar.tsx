'use client';

import React from 'react';
import { usePatchAIStore } from '@/store/patchai';
import NodeDetailPanel from '@/components/panels/NodeDetailPanel';
import AgentWindowPanel from '@/components/panels/AgentWindowPanel';
import PolicyWindowPanel from '@/components/panels/PolicyWindowPanel';
import AuditLogPanel from '@/components/panels/AuditLogPanel';

const TABS = [
  { id: 'node' as const, label: 'Node', icon: '🔍' },
  { id: 'agent' as const, label: 'Agents', icon: '🤖' },
  { id: 'policy' as const, label: 'Policy', icon: '📜' },
  { id: 'audit' as const, label: 'Audit', icon: '📋' },
];

export default function RightSidebar() {
  const activePanel = usePatchAIStore(s => s.activePanel);
  const setActivePanel = usePatchAIStore(s => s.setActivePanel);
  const evaluatorProposals = usePatchAIStore(s => s.evaluatorProposals);
  const pendingProposals = evaluatorProposals.filter(p => p.status === 'pending').length;

  // Default to 'agent' tab if nothing is selected
  const currentTab = activePanel || 'agent';

  return (
    <>
      {/* Sidebar Tabs */}
      <div className="sidebar-tabs" style={{ padding: '8px 6px 0' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`sidebar-tab${currentTab === tab.id ? ' active' : ''}`}
            onClick={() => setActivePanel(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'policy' && pendingProposals > 0 && (
              <span style={{
                background: 'var(--accent-amber)',
                color: '#000',
                borderRadius: '50%',
                width: 14,
                height: 14,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 800,
              }}>
                {pendingProposals}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {currentTab === 'node' && <NodeDetailPanel />}
        {currentTab === 'agent' && <AgentWindowPanel />}
        {currentTab === 'policy' && <PolicyWindowPanel />}
        {currentTab === 'audit' && <AuditLogPanel />}
      </div>
    </>
  );
}
