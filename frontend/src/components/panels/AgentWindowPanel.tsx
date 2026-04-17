'use client';

import React from 'react';
import { usePatchAIStore } from '@/store/patchai';
import { AGENT_CONFIG } from '@/lib/constants';
import { AgentState } from '@/lib/types';

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return 'a while ago';
}

const STATUS_CLASS: Record<AgentState['status'], string> = {
  idle: 'agent-status--idle',
  working: 'agent-status--working',
  waiting_for_approval: 'agent-status--waiting_for_approval',
  pruned: 'agent-status--idle',
  finished: 'agent-status--finished',
  error: 'agent-status--error',
};

const STATUS_LABELS: Record<AgentState['status'], string> = {
  idle: 'Idle',
  working: 'Working',
  waiting_for_approval: 'Waiting',
  pruned: 'Pruned',
  finished: 'Finished',
  error: 'Error',
};

export default function AgentWindowPanel() {
  const agents = usePatchAIStore(s => s.agents);
  const selectAgent = usePatchAIStore(s => s.selectAgent);
  const selectedAgentId = usePatchAIStore(s => s.selectedAgentId);
  const selectNode = usePatchAIStore(s => s.selectNode);
  const setActivePanel = usePatchAIStore(s => s.setActivePanel);

  const agentList: AgentState[] = ['planner', 'coder', 'reviewer', 'tester'].map(id => agents[id]).filter(Boolean);

  return (
    <div className="panel-content" style={{ padding: '12px 10px' }}>
      {agentList.map(agent => {
        const cfg = AGENT_CONFIG[agent.role];
        const isSelected = selectedAgentId === agent.id;
        const acceptRate = agent.totalProposals > 0
          ? Math.round((agent.acceptedProposals / agent.totalProposals) * 100)
          : 0;

        return (
          <div
            key={agent.id}
            className={`agent-card${isSelected ? ' active' : ''}`}
            onClick={() => { selectAgent(agent.id); setActivePanel('agent'); }}
          >
            {/* Header */}
            <div className="agent-card__header">
              <div
                className="agent-avatar"
                style={{ background: cfg.bgColor, border: `1px solid ${cfg.color}40` }}
              >
                {cfg.icon}
              </div>
              <div>
                <div className="agent-card__name">{agent.name}</div>
                <div className="agent-card__role" style={{ color: cfg.color }}>{cfg.name}</div>
              </div>
              <span className={`agent-status-badge ${STATUS_CLASS[agent.status]}`}>
                {agent.status === 'working' && '⚡ '}
                {STATUS_LABELS[agent.status]}
              </span>
            </div>

            {/* Current node */}
            {agent.currentNodeId && (
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 6,
                  padding: '5px 10px',
                  marginBottom: 8,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  selectNode(agent.currentNodeId);
                  setActivePanel('node');
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>current:</span>
                <span style={{ color: cfg.color, fontWeight: 600 }}>{agent.currentNodeId}</span>
              </div>
            )}

            {/* Stats */}
            <div className="agent-stats">
              <div className="agent-stat">
                <div className="agent-stat__value">{agent.totalProposals}</div>
                <div className="agent-stat__label">Proposals</div>
              </div>
              <div className="agent-stat">
                <div className="agent-stat__value" style={{ color: 'var(--accent-emerald)' }}>
                  {agent.acceptedProposals}
                </div>
                <div className="agent-stat__label">Accepted</div>
              </div>
              <div className="agent-stat">
                <div className="agent-stat__value" style={{ color: acceptRate >= 80 ? 'var(--accent-emerald)' : acceptRate >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                  {agent.totalProposals > 0 ? `${acceptRate}%` : '—'}
                </div>
                <div className="agent-stat__label">Accept Rate</div>
              </div>
            </div>

            {/* Working indicator */}
            {agent.status === 'working' && (
              <div style={{ marginTop: 8 }}>
                <div className="progress-bar">
                  <div
                    className="progress-bar__fill"
                    style={{
                      width: '60%',
                      animation: 'progressAnim 1.5s ease-in-out infinite alternate',
                      background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Evaluator status */}
      <div style={{
        background: 'rgba(168, 85, 247, 0.08)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        borderRadius: 10,
        padding: 12,
        marginTop: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>{AGENT_CONFIG.evaluator.icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Evaluator</div>
            <div style={{ fontSize: 10, color: 'var(--accent-violet)', fontWeight: 600 }}>Heuristic Engine</div>
          </div>
          <span className="agent-status-badge" style={{ marginLeft: 'auto', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-violet)' }}>
            Monitoring
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Monitors branch quality using 5 heuristics. Can propose pruning — human retains override authority.
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <div className="agent-stat" style={{ flex: 1, background: 'var(--bg-elevated)' }}>
            <div className="agent-stat__value" style={{ fontSize: 14, color: 'var(--accent-violet)' }}>94</div>
            <div className="agent-stat__label">Score</div>
          </div>
          <div className="agent-stat" style={{ flex: 1, background: 'var(--bg-elevated)' }}>
            <div className="agent-stat__value" style={{ fontSize: 14 }}>
              {usePatchAIStore.getState().evaluatorProposals.length}
            </div>
            <div className="agent-stat__label">Proposals</div>
          </div>
          <div className="agent-stat" style={{ flex: 1, background: 'var(--bg-elevated)' }}>
            <div className="agent-stat__value" style={{ fontSize: 14, color: 'var(--accent-emerald)' }}>5</div>
            <div className="agent-stat__label">Heuristics</div>
          </div>
        </div>
      </div>
    </div>
  );
}
