'use client';

import React from 'react';
import { usePatchAIStore } from '@/store/patchai';

export default function OnboardingOverlay() {
  const showOnboarding = usePatchAIStore(s => s.showOnboarding);
  const setShowOnboarding = usePatchAIStore(s => s.setShowOnboarding);

  if (!showOnboarding) return null;

  return (
    <div className="onboarding-overlay" onClick={() => setShowOnboarding(false)}>
      <div className="onboarding-card" onClick={e => e.stopPropagation()}>
        {/* Logo */}
        <div className="onboarding-logo">
          Patch<span>.AI</span>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-tertiary)',
          marginBottom: 6,
        }}>
          v1.0.0 · Multi-Agent Orchestration Control Plane
        </div>
        <div className="onboarding-tagline">
          The first platform that lets you{' '}
          <strong style={{ color: 'var(--text-primary)' }}>see, control, and reshape</strong>
          {' '}multi-agent AI execution — surgically, in real-time.
        </div>

        {/* Features */}
        <div className="onboarding-features">
          <div className="onboarding-feature">
            <span className="onboarding-feature__icon">🕸️</span>
            <div className="onboarding-feature__text">
              <strong>Live State Graph</strong>
              The entire execution history as a real-time, mutable directed graph
            </div>
          </div>
          <div className="onboarding-feature">
            <span className="onboarding-feature__icon">⚡</span>
            <div className="onboarding-feature__text">
              <strong>Any-Node, Any-Time Intervention</strong>
              Not checkpoints — surgical intervention on any node, live
            </div>
          </div>
          <div className="onboarding-feature">
            <span className="onboarding-feature__icon">📜</span>
            <div className="onboarding-feature__text">
              <strong>Mutable Workflow Policy</strong>
              Governance rules that evolve with the task, with full audit trail
            </div>
          </div>
          <div className="onboarding-feature">
            <span className="onboarding-feature__icon">⚖️</span>
            <div className="onboarding-feature__text">
              <strong>Evaluator System</strong>
              Heuristic quality monitoring — human retains override authority
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          className="btn btn-demo"
          style={{ width: '100%', padding: '12px', fontSize: 15, justifyContent: 'center' }}
          onClick={() => setShowOnboarding(false)}
        >
          Launch Dashboard →
        </button>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12 }}>
          Click "▶ Start Demo" in the top bar to watch multi-agent orchestration in real-time
        </div>
      </div>
    </div>
  );
}
