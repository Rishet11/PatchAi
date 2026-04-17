'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePatchAIStore } from '@/store/patchai';
import { AGENT_CONFIG } from '@/lib/constants';
import { AgentIcon } from '@/lib/icons';
import { AgentState } from '@/lib/types';
import { Zap, Send, ChevronDown, ChevronUp, MessageCircle, Scale } from 'lucide-react';

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

// Scripted agent replies per role — realistic but fast
const AGENT_REPLIES: Record<string, string[]> = {
  planner: [
    'Understood. Revising the execution plan to incorporate your directive.',
    'Acknowledged. Decomposing the new constraint into subtasks.',
    'Noted. Updating the task sequence and dependencies accordingly.',
  ],
  coder: [
    'Got it. Applying the change and running a local diff to check for regressions.',
    'Acknowledged. Refactoring the affected module now.',
    'Understood. Switching implementation strategy as directed.',
  ],
  reviewer: [
    'Reviewing the annotated section. Will flag any quality issues.',
    'Understood. Adjusting my review criteria based on your input.',
    'Noted. Re-examining the artifact with your constraint in mind.',
  ],
  tester: [
    'Running the targeted test harness against the specified condition.',
    'Understood. Expanding test coverage to the area you specified.',
    'Acknowledged. Isolating the failure mode and reporting.',
  ],
  evaluator: [
    'Recalibrating heuristic weights based on your override.',
    'Noted. Suspending the prune proposal for this branch.',
    'Acknowledged. Adjusting confidence threshold per your directive.',
  ],
  human: [
    'Directive received.',
  ],
};

function getReply(role: string): string {
  const replies = AGENT_REPLIES[role] || ['Acknowledged.'];
  return replies[Math.floor(Math.random() * replies.length)];
}

interface ChatMessage {
  id: string;
  role: 'human' | 'agent';
  content: string;
  timestamp: number;
}

function AgentChatPanel({ agent, onClose }: { agent: AgentState; onClose: () => void }) {
  const cfg = AGENT_CONFIG[agent.role];
  const addAuditEntry = usePatchAIStore(s => s.addAuditEntry);
  const addNotification = usePatchAIStore(s => s.addNotification);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'agent',
      content: `You are connected to the ${cfg.name} agent. Send a direct instruction and I will incorporate it into my current execution context.`,
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;

    const humanMsg: ChatMessage = { id: `h-${Date.now()}`, role: 'human', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, humanMsg]);
    setInput('');
    setIsTyping(true);

    addAuditEntry({
      nodeId: agent.currentNodeId || agent.id,
      operation: 'DIRECT_CHAT',
      actor: 'human',
      success: true,
      details: `Direct instruction to ${cfg.name}: "${text.substring(0, 60)}${text.length > 60 ? '…' : ''}"`,
      policyCheck: 'passed',
      timestamp: Date.now(),
    });

    setTimeout(() => {
      const reply = getReply(agent.role);
      const agentMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'agent', content: reply, timestamp: Date.now() };
      setMessages(prev => [...prev, agentMsg]);
      setIsTyping(false);
      addNotification({ type: 'info', title: `${cfg.name} responded`, message: reply });
    }, 800 + Math.random() * 700);
  };

  return (
    <div style={{
      marginTop: 10,
      border: `1px solid ${cfg.color}30`,
      borderRadius: 8,
      background: 'var(--bg-tertiary)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 260,
    }}>
      {/* Chat header */}
      <div style={{
        padding: '7px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
      }}>
        <MessageCircle size={11} color={cfg.color} />
        <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Direct Channel — {cfg.name}
        </span>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, lineHeight: 1 }}>
          <ChevronUp size={13} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.role === 'human' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '6px 10px',
              borderRadius: msg.role === 'human' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
              background: msg.role === 'human' ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
              border: msg.role === 'agent' ? `1px solid ${cfg.color}30` : 'none',
              fontSize: 11,
              lineHeight: 1.5,
              color: msg.role === 'human' ? '#fff' : 'var(--text-secondary)',
            }}>
              {msg.content}
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {msg.role === 'human' ? 'Operator' : cfg.name} · {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ fontSize: 10, color: cfg.color, fontStyle: 'italic' }}>{cfg.name} is responding…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '6px 8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 6, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={`Instruct ${cfg.name}…`}
          style={{
            flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 6, padding: '5px 8px', fontSize: 11, color: 'var(--text-primary)',
            outline: 'none', fontFamily: 'var(--font-sans)',
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || isTyping}
          style={{
            background: cfg.color, border: 'none', borderRadius: 6,
            padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            opacity: !input.trim() || isTyping ? 0.4 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <Send size={12} color="#000" />
        </button>
      </div>
    </div>
  );
}

export default function AgentWindowPanel() {
  const agents = usePatchAIStore(s => s.agents);
  const selectAgent = usePatchAIStore(s => s.selectAgent);
  const selectedAgentId = usePatchAIStore(s => s.selectedAgentId);
  const evaluatorProposals = usePatchAIStore(s => s.evaluatorProposals);
  const selectNode = usePatchAIStore(s => s.selectNode);
  const setActivePanel = usePatchAIStore(s => s.setActivePanel);

  const [openChatId, setOpenChatId] = useState<string | null>(null);

  const agentList: AgentState[] = ['planner', 'coder', 'reviewer', 'tester'].map(id => agents[id]).filter(Boolean);

  return (
    <div className="panel-content" style={{ padding: '12px 10px' }}>
      {agentList.map(agent => {
        const cfg = AGENT_CONFIG[agent.role];
        const isSelected = selectedAgentId === agent.id;
        const isChatOpen = openChatId === agent.id;
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
                style={{ background: cfg.bgColor, border: `1px solid ${cfg.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <AgentIcon iconKey={cfg.iconKey} size={14} color={cfg.color} strokeWidth={1.5} />
              </div>
              <div>
                <div className="agent-card__name">{agent.name}</div>
                <div className="agent-card__role" style={{ color: cfg.color }}>{cfg.name}</div>
              </div>
              <span className={`agent-status-badge ${STATUS_CLASS[agent.status]}`} style={{ marginLeft: 'auto' }}>
                {agent.status === 'working' && <Zap size={10} style={{ display: 'inline', marginRight: 3 }} />}
                {STATUS_LABELS[agent.status]}
              </span>
            </div>

            {/* Current node */}
            {agent.currentNodeId && (
              <div
                style={{
                  background: 'var(--bg-elevated)', borderRadius: 6,
                  padding: '5px 10px', marginBottom: 8, fontSize: 11,
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onClick={(e) => { e.stopPropagation(); selectNode(agent.currentNodeId); setActivePanel('node'); }}
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
                <div className="agent-stat__value" style={{ color: 'var(--accent-emerald)' }}>{agent.acceptedProposals}</div>
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
                      width: `${Math.min(95, (agent.acceptedProposals / Math.max(agent.totalProposals, 1)) * 100 + 30)}%`,
                      background: cfg.color,
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Direct chat toggle button */}
            {isSelected && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); setOpenChatId(isChatOpen ? null : agent.id); }}
                style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11 }}
              >
                <MessageCircle size={12} />
                {isChatOpen ? 'Close Channel' : 'Open Direct Channel'}
                {isChatOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}

            {/* Inline chat panel */}
            {isSelected && isChatOpen && (
              <AgentChatPanel agent={agent} onClose={() => setOpenChatId(null)} />
            )}
          </div>
        );
      })}

      {/* Evaluator card */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 6, padding: 12, marginTop: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={14} color="#a855f7" strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Evaluator</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>Heuristic Engine</div>
          </div>
          <span className="agent-status-badge" style={{ marginLeft: 'auto', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            Monitoring
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Monitors branch quality using 5 heuristics. Can propose pruning — human retains override authority.
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <div className="agent-stat" style={{ flex: 1, background: 'var(--bg-elevated)' }}>
            <div className="agent-stat__value" style={{ fontSize: 14, color: 'var(--accent-violet)' }}>
              {/* Dynamic: quality score based on ratio of completed to total nodes */}
              {(() => {
                const s = usePatchAIStore.getState();
                const nodes = Object.values(s.nodes);
                if (nodes.length === 0) return 100;
                const pruned = nodes.filter(n => n.status === 'pruned').length;
                const pending = s.evaluatorProposals.filter(p => p.status === 'pending').length;
                return Math.max(40, 100 - Math.round((pruned / nodes.length) * 40) - (pending * 8));
              })()}
            </div>
            <div className="agent-stat__label">Score</div>
          </div>
          <div className="agent-stat" style={{ flex: 1, background: 'var(--bg-elevated)' }}>
            <div className="agent-stat__value" style={{ fontSize: 14 }}>{evaluatorProposals.length}</div>
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
