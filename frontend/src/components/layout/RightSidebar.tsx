'use client';

import React from 'react';
import { usePatchAIStore } from '@/store/patchai';
import { AnimatePresence, motion, type Variants, type Easing } from 'framer-motion';
import NodeDetailPanel from '@/components/panels/NodeDetailPanel';
import AgentWindowPanel from '@/components/panels/AgentWindowPanel';
import PolicyWindowPanel from '@/components/panels/PolicyWindowPanel';
import AuditLogPanel from '@/components/panels/AuditLogPanel';
import { Hash, Bot, ScrollText, ClipboardList } from 'lucide-react';

const TABS = [
  { id: 'node' as const, label: 'Node', Icon: Hash },
  { id: 'agent' as const, label: 'Agents', Icon: Bot },
  { id: 'policy' as const, label: 'Policy', Icon: ScrollText },
  { id: 'audit' as const, label: 'Audit', Icon: ClipboardList },
];

const easeOut: Easing = 'easeOut';
const easeIn: Easing = 'easeIn';

const panelVariants: Variants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.15, ease: easeOut } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.1, ease: easeIn } },
};

export default function RightSidebar() {
  const activePanel = usePatchAIStore(s => s.activePanel);
  const setActivePanel = usePatchAIStore(s => s.setActivePanel);
  const evaluatorProposals = usePatchAIStore(s => s.evaluatorProposals);
  const pendingProposals = evaluatorProposals.filter(p => p.status === 'pending').length;

  const currentTab = activePanel || 'agent';

  return (
    <>
      {/* Sidebar Tabs */}
      <div className="sidebar-tabs" style={{ padding: '8px 6px 0' }}>
        {TABS.map(tab => {
          const { Icon } = tab;
          return (
            <button
              key={tab.id}
              className={`sidebar-tab${currentTab === tab.id ? ' active' : ''}`}
              onClick={() => setActivePanel(tab.id)}
              title={`${tab.label} (shortcut: ${TABS.indexOf(tab) + 1})`}
            >
              <Icon size={12} strokeWidth={2} />
              <span>{tab.label}</span>
              {tab.id === 'policy' && pendingProposals > 0 && (
                <span style={{
                  background: 'var(--accent-amber)',
                  color: '#000',
                  borderRadius: '50%',
                  width: 14, height: 14,
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
          );
        })}
      </div>

      {/* Animated Panel Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            {currentTab === 'node' && <NodeDetailPanel />}
            {currentTab === 'agent' && <AgentWindowPanel />}
            {currentTab === 'policy' && <PolicyWindowPanel />}
            {currentTab === 'audit' && <AuditLogPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
