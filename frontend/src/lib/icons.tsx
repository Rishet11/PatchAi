/**
 * Centralized icon renderer for agent and artifact icons.
 * Maps the string keys from constants.ts to actual Lucide components.
 * This file is the ONLY place where icon components are imported for this mapping.
 */
import React from 'react';
import {
  ListTodo, Code2, Eye, FlaskConical, Scale, User,
  ClipboardList, FileCode, FileText, TestTube, Zap,
  ScrollText, MessageCircle, type LucideProps
} from 'lucide-react';
import { AgentIconKey, ArtifactIconKey } from './constants';

const AGENT_ICON_MAP: Record<AgentIconKey, React.ElementType<LucideProps>> = {
  ListTodo,
  Code2,
  Eye,
  FlaskConical,
  Scale,
  User,
};

const ARTIFACT_ICON_MAP: Record<ArtifactIconKey, React.ElementType<LucideProps>> = {
  ClipboardList,
  FileCode,
  FileText,
  TestTube,
  Zap,
  ScrollText,
  MessageCircle,
};

interface IconProps extends LucideProps {
  size?: number;
}

export function AgentIcon({ iconKey, ...props }: { iconKey: AgentIconKey } & IconProps) {
  const Icon = AGENT_ICON_MAP[iconKey] || User;
  return <Icon {...props} />;
}

export function ArtifactIcon({ iconKey, ...props }: { iconKey: ArtifactIconKey } & IconProps) {
  const Icon = ARTIFACT_ICON_MAP[iconKey] || FileCode;
  return <Icon {...props} />;
}
