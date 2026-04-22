'use client';

import React, { useState } from 'react';
import { usePatchAIStore } from '@/store/patchai';
import { DemoSimulation } from '@/lib/demo-simulation';
import { ENABLE_LOCAL_DEMO_FALLBACK } from '@/lib/constants';
import {
  Bell, Play, Square, RotateCcw, TreePine, Scissors, User,
  Scale, CheckCircle, Download, Upload, Timer, Cpu
} from 'lucide-react';
import { ExecutionState } from '@/lib/types';

let simInstance: DemoSimulation | null = null;

function UptimeCounter({ startTime }: { startTime: number | null }) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!startTime) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  if (!startTime) return <span>--:--</span>;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return <span>{m}:{s}</span>;
}

export default function GlobalStatusBar() {
  const stats = usePatchAIStore(s => s.stats);
  const status = usePatchAIStore(s => s.status);
  const startTime = usePatchAIStore(s => s.startTime);
  const taskDescription = usePatchAIStore(s => s.taskDescription);
  const isDemoRunning = usePatchAIStore(s => s.isDemoRunning);
  const unreadCount = usePatchAIStore(s => s.unreadCount);
  const notificationTrayOpen = usePatchAIStore(s => s.notificationTrayOpen);
  const notifications = usePatchAIStore(s => s.notifications);

  const startExecution = usePatchAIStore(s => s.startExecution);
  const setDemoRunning = usePatchAIStore(s => s.setDemoRunning);
  const resetState = usePatchAIStore(s => s.resetState);
  const setNotificationTrayOpen = usePatchAIStore(s => s.setNotificationTrayOpen);
  const markNotificationRead = usePatchAIStore(s => s.markNotificationRead);
  const stopExecution = usePatchAIStore(s => s.stopExecution);

  const [taskInput, setTaskInput] = useState('Build a REST API for a Task Management System');
  const [importError, setImportError] = useState<string | null>(null);

  const handleStartDemo = async () => {
    if (isDemoRunning) return;
    resetState();
    const started = await startExecution(taskInput.trim() || 'Build a REST API for a Task Management System');
    if (started) {
      return;
    }
    if (ENABLE_LOCAL_DEMO_FALLBACK) {
      setDemoRunning(true);
      simInstance = new DemoSimulation();
      simInstance.run();
    }
  };

  const handleStop = async () => {
    simInstance?.stop();
    await stopExecution();
    setDemoRunning(false);
  };

  const handleReset = () => {
    simInstance?.stop();
    resetState();
    setDemoRunning(false);
  };

  // Export: serialize current state to JSON file download
  const handleExport = () => {
    const state = usePatchAIStore.getState();
    const snapshot: Partial<ExecutionState> = {
      id: state.id,
      taskDescription: state.taskDescription,
      status: state.status,
      startTime: state.startTime,
      nodes: state.nodes,
      edges: state.edges,
      agents: state.agents,
      policy: state.policy,
      policyHistory: state.policyHistory,
      auditLog: state.auditLog,
      notifications: state.notifications,
      evaluatorProposals: state.evaluatorProposals,
      stats: state.stats,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patchai-snapshot-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import: load JSON file and restore state
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const snapshot = JSON.parse(text) as Partial<ExecutionState>;
        // Basic shape validation
        if (!snapshot.nodes || !snapshot.edges) {
          setImportError('Invalid snapshot: missing nodes or edges');
          setTimeout(() => setImportError(null), 3000);
          return;
        }
        usePatchAIStore.setState({
          ...snapshot,
          showOnboarding: false,
          isDemoRunning: false,
          activePanel: 'node',
          selectedNodeId: null,
          unreadCount: 0,
          notificationTrayOpen: false,
        } as Parameters<typeof usePatchAIStore.setState>[0]);
        setImportError(null);
      } catch {
        setImportError('Failed to parse snapshot JSON');
        setTimeout(() => setImportError(null), 3000);
      }
    };
    input.click();
  };

  return (
    <header className="status-bar">
      {/* Logo */}
      <div className="status-bar__logo">
        <div className="status-bar__logo-dot" />
        <span>Patch<span className="status-bar__logo-accent">.AI</span></span>
      </div>

      <div className="status-bar__divider" />

      {/* Task Input */}
      <div className="task-input-bar">
        {status === 'idle' || status === 'stopped' ? (
          <input
            className="task-input"
            value={taskInput}
            onChange={e => setTaskInput(e.target.value)}
            placeholder="Enter task prompt..."
          />
        ) : (
          <div style={{
            flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12,
            color: 'var(--text-secondary)', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {taskDescription || taskInput}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="status-bar__stats">
        <div className="stat-chip">
          <Timer size={11} />
          <span><UptimeCounter startTime={startTime} /></span>
        </div>
        <div className="stat-chip stat-chip--active">
          <Cpu size={11} />
          <span>Nodes</span>
          <span className="stat-chip__value">{stats.totalNodes}</span>
        </div>
        <div className="stat-chip stat-chip--active">
          <TreePine size={11} />
          <span className="stat-chip__value">{stats.activeBranches}</span>
          <span>Branches</span>
        </div>
        {stats.prunedNodes > 0 && (
          <div className="stat-chip stat-chip--pruned">
            <Scissors size={11} />
            <span className="stat-chip__value">{stats.prunedNodes}</span>
            <span>Pruned</span>
          </div>
        )}
        {stats.humanInterventions > 0 && (
          <div className="stat-chip stat-chip--human">
            <User size={11} />
            <span className="stat-chip__value">{stats.humanInterventions}</span>
            <span>HITL</span>
          </div>
        )}
        {stats.pendingProposals > 0 && (
          <div className="stat-chip stat-chip--warn">
            <Scale size={11} />
            <span className="stat-chip__value">{stats.pendingProposals}</span>
            <span>Pending</span>
          </div>
        )}
        {status === 'running' && (
          <div className="run-indicator">
            <div className="run-dot" />
            <span>Running</span>
          </div>
        )}
        {status === 'completed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--accent-emerald)' }}>
            <CheckCircle size={13} />
            <span>Complete</span>
          </div>
        )}
      </div>

      {importError && (
        <div style={{ fontSize: 11, color: 'var(--accent-red)', padding: '0 8px', whiteSpace: 'nowrap' }}>
          {importError}
        </div>
      )}

      <div className="status-bar__actions">
        {/* Export / Import */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleExport}
          title="Export snapshot (Ctrl+E)"
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Download size={13} /> Export
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleImport}
          title="Import snapshot"
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Upload size={13} /> Import
        </button>

        <div className="status-bar__divider" />

        {/* Notification bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setNotificationTrayOpen(!notificationTrayOpen)}
            title="Notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--accent-indigo)',
                color: 'white', borderRadius: '50%',
                width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Tray */}
          {notificationTrayOpen && (
            <div className="notification-tray">
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
                <button className="btn btn-ghost btn-sm" onClick={() => usePatchAIStore.getState().clearNotifications()}>Clear</button>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>No notifications</div>
                ) : (
                  notifications.slice(0, 20).map(n => (
                    <div
                      key={n.id}
                      className={`notification-item${!n.read ? ' unread' : ''}`}
                      onClick={() => markNotificationRead(n.id)}
                    >
                      <div className="notification-item__title">{n.title}</div>
                      <div className="notification-item__message">{n.message}</div>
                      <div className="notification-item__time">{new Date(n.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {(status === 'idle' || status === 'stopped' || status === 'completed') ? (
          <button
            className="btn btn-primary"
            onClick={handleStartDemo}
            disabled={isDemoRunning}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Play size={13} /> Start Demo
          </button>
        ) : (
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleStop}
            disabled={!isDemoRunning && status !== 'running'}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Square size={12} /> Stop
          </button>
        )}

        <button
          className="btn btn-ghost btn-icon"
          onClick={handleReset}
          title="Reset execution"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </header>
  );
}
