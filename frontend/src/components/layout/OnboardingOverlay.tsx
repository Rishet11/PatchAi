'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePatchAIStore } from '@/store/patchai';
import { Network, Zap, ScrollText, Scale } from 'lucide-react';

export default function OnboardingOverlay() {
  const showOnboarding = usePatchAIStore(s => s.showOnboarding);
  const setShowOnboarding = usePatchAIStore(s => s.setShowOnboarding);

  return (
    <AnimatePresence>
      {showOnboarding && (
        <motion.div
          className="onboarding-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setShowOnboarding(false)}
        >
          <motion.div
            className="onboarding-card"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Logo */}
            <div className="onboarding-logo">
              Patch<span>.AI</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--text-tertiary)', marginBottom: 6,
            }}>
              v1.0.0 · Multi-Agent Orchestration Control Plane
            </div>
            <div className="onboarding-tagline">
              An execution state graph and control plane for multi-agent workflows.
              Inspect, prune, or branch any node while execution is live.
            </div>

            {/* Features */}
            <div className="onboarding-features">
              {[
                { Icon: Network, label: 'Live State Graph', desc: 'Execution history as a real-time, mutable directed graph' },
                { Icon: Zap, label: 'Any-Node, Any-Time Intervention', desc: 'Surgical intervention on any node during live execution' },
                { Icon: ScrollText, label: 'Mutable Workflow Policy', desc: 'Governance rules that evolve at runtime with audit trail' },
                { Icon: Scale, label: 'Evaluator System', desc: 'Heuristic quality monitoring — human retains override authority' },
              ].map(({ Icon, label, desc }) => (
                <div key={label} className="onboarding-feature">
                  <span className="onboarding-feature__icon">
                    <Icon size={16} strokeWidth={1.5} color="var(--text-tertiary)" />
                  </span>
                  <div className="onboarding-feature__text">
                    <strong>{label}</strong>
                    {desc}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: 13, justifyContent: 'center' }}
              onClick={() => setShowOnboarding(false)}
            >
              Launch Dashboard
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12 }}>
              Click &quot;Start Demo&quot; in the top bar to watch multi-agent orchestration in real-time
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
