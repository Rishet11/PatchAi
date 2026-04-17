'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Network, Zap, ScrollText, Scale, GitBranch, ArrowRight,
  Code2, Eye, FlaskConical, User, ListTodo, Scissors
} from 'lucide-react';

const FEATURES = [
  {
    Icon: Network,
    title: 'Live State Graph',
    description: 'Execution history as a real-time, mutable directed acyclic graph. Every agent action becomes a node. Every dependency becomes an edge.',
  },
  {
    Icon: Zap,
    title: 'Any-Node, Any-Time Intervention',
    description: 'Prune dead branches, revive pruned paths, inject sibling directives, or directly edit any artifact — while execution is still live.',
  },
  {
    Icon: ScrollText,
    title: 'Mutable Workflow Policy',
    description: 'Runtime governance rules that evolve during execution. Toggle constraints, approve branching, restrict agent permissions — with full change history.',
  },
  {
    Icon: Scale,
    title: 'Heuristic Evaluator',
    description: 'Continuous branch quality monitoring across 5 heuristics. Evaluator proposes pruning — human retains final override authority.',
  },
  {
    Icon: GitBranch,
    title: 'Full Audit Trail',
    description: 'Every operation — human or agent — is timestamped and logged with actor, policy check result, and full provenance context.',
  },
  {
    Icon: Scissors,
    title: 'Surgical Editing',
    description: 'Edit any agent artifact inline in the Monaco editor. Changes propagate through the audit log and set the human override flag on the node.',
  },
];

const AGENTS = [
  { Icon: ListTodo, name: 'Planner', color: '#3b82f6', desc: 'Decomposes goals' },
  { Icon: Code2, name: 'Coder', color: '#22c55e', desc: 'Implements features' },
  { Icon: Eye, name: 'Reviewer', color: '#f59e0b', desc: 'Evaluates quality' },
  { Icon: FlaskConical, name: 'Tester', color: '#ef4444', desc: 'Runs test suites' },
  { Icon: Scale, name: 'Evaluator', color: '#a855f7', desc: 'Monitors branches' },
  { Icon: User, name: 'Human', color: '#06b6d4', desc: 'Override authority' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      overflowX: 'hidden',
    }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', height: 52,
        gap: 16,
      }}>
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>
          Patch<span style={{ color: 'var(--accent-indigo)' }}>.AI</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>v1.0.0</span>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              Launch Dashboard <ArrowRight size={13} />
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 32px 72px', maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 28,
            fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)', flexShrink: 0 }} />
            HackDUCS 2026 — AI/ML Track — Sankalan, University of Delhi
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            margin: '0 0 24px',
            color: 'var(--text-primary)',
          }}>
            See. Control. Reshape.<br />
            <span style={{ color: 'var(--accent-indigo)' }}>Multi-Agent AI</span> in Real Time.
          </h1>

          <p style={{
            fontSize: 17,
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            maxWidth: 620,
            margin: '0 auto 36px',
          }}>
            Patch.AI is an execution state graph and control plane for multi-agent workflows.
            Inspect, prune, or branch any node while execution is live.
            No other tool gives you this level of runtime visibility and control.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ fontSize: 14, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                Launch Dashboard <ArrowRight size={15} />
              </button>
            </Link>
            <a
              href="https://github.com/Rishet11/PatchAi"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <button className="btn btn-ghost" style={{ fontSize: 14, padding: '12px 24px' }}>
                View Source
              </button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Problem / Solution */}
      <section style={{ padding: '0 32px 72px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
          border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden',
        }}>
          {[
            {
              label: 'The Problem',
              color: 'var(--accent-red)',
              points: [
                'Zero visibility into live agent execution',
                'Rigid pre-programmed checkpoints only (LangGraph)',
                'Or total autonomous chaos with no control (OpenAI Agents)',
                'No audit trail for decisions made by agents',
                'Cannot intervene when things go wrong mid-execution',
              ]
            },
            {
              label: 'The Patch.AI Solution',
              color: 'var(--accent-emerald)',
              points: [
                'Live DAG of every agent action, updated in real time',
                'Prune, revive, branch, or inject at any node, any time',
                'Runtime-mutable policy rules with full governance trail',
                'Heuristic evaluator proposes pruning — human decides',
                'Every operation logged with actor, timestamp, provenance',
              ]
            }
          ].map(col => (
            <div key={col.label} style={{ background: 'var(--bg-secondary)', padding: '28px 28px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: col.color, marginBottom: 16 }}>
                {col.label}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.points.map(p => (
                  <li key={p} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <span style={{ color: col.color, flexShrink: 0, marginTop: 2 }}>—</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Agent roster */}
      <section style={{ padding: '0 32px 72px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 20, textAlign: 'center' }}>
          The Agent Roster
        </div>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}
        >
          {AGENTS.map(({ Icon, name, color, desc }) => (
            <motion.div
              key={name}
              variants={item}
              style={{ background: 'var(--bg-secondary)', padding: '20px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}
            >
              <div style={{ background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={color} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Feature grid */}
      <section style={{ padding: '0 32px 72px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 20, textAlign: 'center' }}>
          Core Capabilities
        </div>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}
        >
          {FEATURES.map(({ Icon, title, description }) => (
            <motion.div
              key={title}
              variants={item}
              style={{ background: 'var(--bg-secondary)', padding: '24px 24px', borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Icon size={16} color="var(--accent-indigo-light)" strokeWidth={1.5} />
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{description}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 32px 80px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 540, margin: '0 auto',
          border: '1px solid var(--border-default)',
          borderRadius: 12, background: 'var(--bg-secondary)',
          padding: '40px 32px',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>
            Ready to intervene?
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
            Launch the dashboard and click &quot;Start Demo&quot; to watch a multi-agent software engineering workflow execute in real time — and take control of it.
          </div>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary" style={{ fontSize: 14, padding: '12px 32px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Launch Dashboard <ArrowRight size={15} />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '20px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--text-tertiary)',
      }}>
        <span>Patch<span style={{ color: 'var(--accent-indigo)' }}>.AI</span> — HackDUCS 2026</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="https://github.com/Rishet11/PatchAi" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>GitHub</a>
          <Link href="/dashboard" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Dashboard</Link>
        </div>
      </footer>
    </div>
  );
}
