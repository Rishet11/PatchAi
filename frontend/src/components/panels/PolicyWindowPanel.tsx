'use client';

import React, { useState } from 'react';
import { usePatchAIStore } from '@/store/patchai';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const TYPE_ICONS: Record<string, string> = {
  transition: '🔀',
  approval: '✅',
  permission: '🔐',
  constraint: '⛔',
};

export default function PolicyWindowPanel() {
  const policy = usePatchAIStore(s => s.policy);
  const policyHistory = usePatchAIStore(s => s.policyHistory);
  const evaluatorProposals = usePatchAIStore(s => s.evaluatorProposals);
  const togglePolicy = usePatchAIStore(s => s.togglePolicy);
  const addPolicy = usePatchAIStore(s => s.addPolicy);
  const resolveProposal = usePatchAIStore(s => s.resolveProposal);
  const pruneNode = usePatchAIStore(s => s.pruneNode);
  const reviveNode = usePatchAIStore(s => s.reviveNode);
  const addNotification = usePatchAIStore(s => s.addNotification);
  const addAuditEntry = usePatchAIStore(s => s.addAuditEntry);
  const updateStats = usePatchAIStore(s => s.updateStats);

  const [activeTab, setActiveTab] = useState<'rules' | 'history' | 'evaluator'>('rules');
  const [newRuleText, setNewRuleText] = useState('');
  const [showAddRule, setShowAddRule] = useState(false);

  const pendingProposals = evaluatorProposals.filter(p => p.status === 'pending');

  const handleAddRule = () => {
    if (!newRuleText.trim()) return;
    addPolicy(newRuleText.trim());
    setNewRuleText('');
    setShowAddRule(false);
    addNotification({ type: 'success', title: 'Policy Updated', message: `New rule added: "${newRuleText.trim()}"` });
  };

  const handleApproveProposal = (proposalId: string, nodeId: string) => {
    resolveProposal(proposalId, 'approved');
    pruneNode(nodeId);
    addAuditEntry({ nodeId, operation: 'PRUNE', actor: 'evaluator', success: true, details: 'Human approved evaluator prune proposal', policyCheck: 'passed', timestamp: Date.now() });
    addNotification({ type: 'info', title: 'Prune Approved', message: 'Evaluator proposal accepted. Branch pruned.' });
    updateStats({ humanInterventions: usePatchAIStore.getState().stats.humanInterventions + 1 });
  };

  const handleOverrideProposal = (proposalId: string, nodeId: string) => {
    resolveProposal(proposalId, 'overridden');
    reviveNode(nodeId);
    addAuditEntry({ nodeId, operation: 'REVIVE', actor: 'human', success: true, details: 'Human overrode evaluator prune proposal — branch kept alive', policyCheck: 'passed', timestamp: Date.now() });
    addNotification({ type: 'success', title: '⚡ Override — Branch Kept', message: 'Evaluator proposal rejected. Branch continues.' });
    updateStats({ humanInterventions: usePatchAIStore.getState().stats.humanInterventions + 1 });
  };

  const handleSnoozeProposal = (proposalId: string) => {
    resolveProposal(proposalId, 'snoozed');
    addNotification({ type: 'info', title: 'Snoozed 10 min', message: 'Evaluator will re-evaluate in 10 minutes.' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', padding: '8px 8px 0', gap: 2 }}>
        {(['rules', 'evaluator', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '6px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--accent-indigo)' : 'transparent'}`,
              color: activeTab === tab ? 'var(--accent-indigo-light)' : 'var(--text-tertiary)',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              transition: 'all 150ms ease',
            }}
          >
            {tab === 'evaluator' && pendingProposals.length > 0 && (
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
                {pendingProposals.length}
              </span>
            )}
            {tab}
          </button>
        ))}
      </div>

      <div className="panel-content" style={{ padding: '10px', flex: 1, overflowY: 'auto' }}>
        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <>
            {policy.map(rule => (
              <div key={rule.id} className={`policy-rule${rule.enabled ? '' : ' disabled'}`}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                  {TYPE_ICONS[rule.type] || '📋'}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="policy-rule__text">{rule.text}</div>
                  <div className="policy-rule__category">{rule.category} · {rule.type}</div>
                </div>
                <label className="toggle" title={rule.enabled ? 'Disable rule' : 'Enable rule'}>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => togglePolicy(rule.id)}
                  />
                  <div className="toggle-slider" />
                </label>
              </div>
            ))}

            {/* Add Rule */}
            {showAddRule ? (
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 10, padding: 12, marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
                  Add Policy Rule (Natural Language)
                </div>
                <input
                  type="text"
                  className="task-input"
                  value={newRuleText}
                  onChange={e => setNewRuleText(e.target.value)}
                  placeholder="e.g. Only Planner can initiate branching"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddRule(); }}
                  style={{ width: '100%', marginBottom: 8 }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleAddRule}>Add Rule</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAddRule(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddRule(true)}
                style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
              >
                + Add Rule
              </button>
            )}
          </>
        )}

        {/* Evaluator Tab */}
        {activeTab === 'evaluator' && (
          <>
            {evaluatorProposals.length === 0 ? (
              <div className="empty-state" style={{ height: 160 }}>
                <div className="empty-state__icon">⚖️</div>
                <div className="empty-state__title">No proposals</div>
                <div className="empty-state__description">Evaluator has no pending branch quality proposals</div>
              </div>
            ) : (
              evaluatorProposals.map(proposal => (
                <div key={proposal.id} className={`evaluator-proposal${proposal.status !== 'pending' ? '' : ''}`}
                  style={{ opacity: proposal.status === 'pending' ? 1 : 0.5 }}
                >
                  <div className="evaluator-proposal__header">
                    <span style={{ fontSize: 14 }}>⚖️</span>
                    <div className="evaluator-proposal__title">
                      {proposal.type === 'prune' ? '✂️ Prune Proposal' : '⚠️ Warning'}
                    </div>
                    <div className="evaluator-proposal__confidence">
                      {Math.round(proposal.confidence * 100)}% confidence
                    </div>
                  </div>

                  <div className="evaluator-proposal__rationale">{proposal.rationale}</div>

                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
                    Heuristic: {proposal.heuristic} · Target: {proposal.targetNodeId}
                  </div>

                  {proposal.status === 'pending' ? (
                    <div className="evaluator-proposal__actions">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleApproveProposal(proposal.id, proposal.targetNodeId)}
                      >
                        ✂️ Approve Prune
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleOverrideProposal(proposal.id, proposal.targetNodeId)}
                      >
                        ⚡ Override — Keep
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleSnoozeProposal(proposal.id)}
                      >
                        💤 Snooze
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, fontWeight: 700, color: proposal.status === 'approved' ? 'var(--accent-red)' : proposal.status === 'overridden' ? 'var(--accent-emerald)' : 'var(--text-tertiary)' }}>
                      {proposal.status === 'approved' ? '✂️ Pruned' : proposal.status === 'overridden' ? '⚡ Overridden — Branch kept alive' : '💤 Snoozed'}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <>
            {policyHistory.length === 0 ? (
              <div className="empty-state" style={{ height: 160 }}>
                <div className="empty-state__icon">📜</div>
                <div className="empty-state__title">No policy changes</div>
                <div className="empty-state__description">Policy evolution history will appear here</div>
              </div>
            ) : (
              policyHistory.map(evo => (
                <div key={evo.id} className="audit-entry" style={{ padding: '8px 0' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent-indigo-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                    {evo.action === 'added' ? '➕' : evo.action === 'toggled' ? '🔄' : evo.action === 'modified' ? '✏️' : '🗑️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {evo.action.toUpperCase()} by {evo.proposer}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{evo.ruleText}</div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                    {formatTime(evo.timestamp)}
                  </span>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
