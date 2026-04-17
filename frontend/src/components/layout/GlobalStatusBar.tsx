'use client';

import React, { useState } from 'react';
import { usePatchAIStore } from '@/store/patchai';
import { DemoSimulation } from '@/lib/demo-simulation';

let simInstance: DemoSimulation | null = null;

function UptimeCounter({ startTime }: { startTime: number | null }) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!startTime) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  if (!startTime) return <span>—</span>;
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

  const setDemoRunning = usePatchAIStore(s => s.setDemoRunning);
  const resetState = usePatchAIStore(s => s.resetState);
  const setNotificationTrayOpen = usePatchAIStore(s => s.setNotificationTrayOpen);
  const markNotificationRead = usePatchAIStore(s => s.markNotificationRead);
  const stopExecution = usePatchAIStore(s => s.stopExecution);

  const [taskInput, setTaskInput] = useState('Build a REST API for a Task Management System');

  const handleStartDemo = () => {
    if (isDemoRunning) return;
    resetState();
    setDemoRunning(true);
    simInstance = new DemoSimulation();
    simInstance.run();
  };

  const handleStop = () => {
    simInstance?.stop();
    stopExecution();
    setDemoRunning(false);
  };

  const handleReset = () => {
    simInstance?.stop();
    resetState();
    setDemoRunning(false);
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
            flex: 1,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {taskDescription || taskInput}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="status-bar__stats">
        <div className="stat-chip">
          <span>⏱</span>
          <span><UptimeCounter startTime={startTime} /></span>
        </div>
        <div className="stat-chip stat-chip--active">
          <span>●</span>
          <span>Nodes</span>
          <span className="stat-chip__value">{stats.totalNodes}</span>
        </div>
        <div className="stat-chip stat-chip--active">
          <span>🌿</span>
          <span className="stat-chip__value">{stats.activeBranches}</span>
          <span>Branches</span>
        </div>
        {stats.prunedNodes > 0 && (
          <div className="stat-chip stat-chip--pruned">
            <span>✂️</span>
            <span className="stat-chip__value">{stats.prunedNodes}</span>
            <span>Pruned</span>
          </div>
        )}
        {stats.humanInterventions > 0 && (
          <div className="stat-chip stat-chip--human">
            <span>👤</span>
            <span className="stat-chip__value">{stats.humanInterventions}</span>
            <span>HITL</span>
          </div>
        )}
        {stats.pendingProposals > 0 && (
          <div className="stat-chip stat-chip--warn">
            <span>⚖️</span>
            <span className="stat-chip__value">{stats.pendingProposals}</span>
            <span>Pending</span>
          </div>
        )}

        {/* Running indicator */}
        {status === 'running' && (
          <div className="run-indicator">
            <div className="run-dot" />
            <span>Running</span>
          </div>
        )}
        {status === 'completed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--accent-emerald)' }}>
            <span>✅</span>
            <span>Complete</span>
          </div>
        )}
      </div>

      <div className="status-bar__actions">
        {/* Notification bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setNotificationTrayOpen(!notificationTrayOpen)}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -4, right: -4,
                background: 'var(--accent-indigo)',
                color: 'white',
                borderRadius: '50%',
                width: 16, height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 800,
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
                      <div className="notification-item__time">
                        {new Date(n.timestamp).toLocaleTimeString()}
                      </div>
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
            className="btn btn-demo"
            onClick={handleStartDemo}
            disabled={isDemoRunning}
          >
            ▶ Start Demo
          </button>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm" onClick={handleStop} disabled={!isDemoRunning && status !== 'running'}>
              ⏹ Stop
            </button>
          </>
        )}

        <button
          className="btn btn-ghost btn-icon"
          onClick={handleReset}
          title="Reset execution"
        >
          🔄
        </button>
      </div>
    </header>
  );
}
