'use client';

import dynamic from 'next/dynamic';
import GlobalStatusBar from '@/components/layout/GlobalStatusBar';
import RightSidebar from '@/components/layout/RightSidebar';
import OnboardingOverlay from '@/components/layout/OnboardingOverlay';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Dynamic import to avoid SSR issues with React Flow
const StateGraphView = dynamic(
  () => import('@/components/graph/StateGraphView'),
  { ssr: false, loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--text-tertiary)',
      fontSize: 13,
      gap: 10,
    }}>
      <div className="run-dot" style={{ background: 'var(--accent-indigo)' }} />
      Initializing graph engine…
    </div>
  )}
);

export default function DashboardPage() {
  useKeyboardShortcuts();

  return (
    <div className="app-shell">
      {/* Global Status Bar */}
      <GlobalStatusBar />

      {/* Main Graph Canvas */}
      <main className="graph-canvas-area">
        <StateGraphView />
      </main>

      {/* Right Sidebar */}
      <aside className="right-sidebar">
        <RightSidebar />
      </aside>

      {/* Onboarding Overlay */}
      <OnboardingOverlay />
    </div>
  );
}
