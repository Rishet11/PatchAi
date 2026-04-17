import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Patch.AI — Live Multi-Agent Orchestration Control Plane',
  description:
    'The first platform that treats multi-agent execution history as a live, mutable state graph. See, control, and reshape AI systems in real-time. Built for HackDUCS 2026.',
  keywords: ['AI orchestration', 'multi-agent systems', 'LangGraph', 'HITL', 'AI control plane'],
  authors: [{ name: 'Patch.AI Team' }],
  openGraph: {
    title: 'Patch.AI — Live Multi-Agent Orchestration',
    description: 'Surgical control over running AI agent systems',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
