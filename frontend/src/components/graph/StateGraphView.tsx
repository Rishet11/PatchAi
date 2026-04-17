'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { usePatchAIStore } from '@/store/patchai';
import { nodeTypes } from './AgentNode';
import { getLayoutedElements } from '@/lib/graph-layout';
import { ContextMenu } from './ContextMenu';
import GraphSearchBar from './GraphSearchBar';
import { GraphNode } from '@/lib/types';
import { AGENT_CONFIG } from '@/lib/constants';
import { Network } from 'lucide-react';

function GraphCanvas() {
  const storeNodes = usePatchAIStore(s => s.nodes);
  const storeEdges = usePatchAIStore(s => s.edges);
  const selectedNodeId = usePatchAIStore(s => s.selectedNodeId);
  const selectNode = usePatchAIStore(s => s.selectNode);
  const pruneNode = usePatchAIStore(s => s.pruneNode);
  const reviveNode = usePatchAIStore(s => s.reviveNode);
  const addNode = usePatchAIStore(s => s.addNode);
  const addEdge = usePatchAIStore(s => s.addEdge);
  const addNotification = usePatchAIStore(s => s.addNotification);
  const addAuditEntry = usePatchAIStore(s => s.addAuditEntry);
  const updateStats = usePatchAIStore(s => s.updateStats);
  const graphSearchQuery = usePatchAIStore(s => s.graphSearchQuery);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; nodeId: string;
  } | null>(null);

  // Convert store nodes to React Flow nodes with layout
  useEffect(() => {
    const graphNodes: GraphNode[] = Object.values(storeNodes);
    if (graphNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const q = graphSearchQuery.toLowerCase().trim();

    const rfNodes: Node[] = graphNodes.map(n => {
      const matches = !q ||
        n.title.toLowerCase().includes(q) ||
        n.agent.toLowerCase().includes(q) ||
        n.artifactType.toLowerCase().includes(q) ||
        n.artifact.toLowerCase().includes(q) ||
        n.branchId.toLowerCase().includes(q);

      return {
        id: n.id,
        type: 'agentNode',
        position: { x: 0, y: 0 },
        data: { ...n },
        selected: n.id === selectedNodeId,
        style: {
          opacity: q ? (matches ? 1 : 0.12) : 1,
          transition: 'opacity 0.2s ease',
          pointerEvents: (q && !matches) ? 'none' as const : 'all' as const,
        },
      };
    });

    const rfEdges: Edge[] = storeEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: e.animated,
      style: {
        stroke: e.type === 'branch'
          ? 'rgba(6, 182, 212, 0.6)'
          : e.type === 'human'
            ? 'rgba(6, 182, 212, 0.8)'
            : 'rgba(99, 102, 241, 0.5)',
        strokeWidth: 1.5,
        strokeDasharray: e.type === 'branch' ? '5,5' : undefined,
      },
    }));

    const { nodes: lNodes, edges: lEdges } = getLayoutedElements(rfNodes, rfEdges, 'TB');
    setNodes(lNodes);
    setEdges(lEdges);
  }, [storeNodes, storeEdges, selectedNodeId, graphSearchQuery]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectNode(node.id);
    setContextMenu(null);
  }, [selectNode]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handlePrune = useCallback((nodeId: string) => {
    pruneNode(nodeId);
    addAuditEntry({
      nodeId,
      operation: 'PRUNE',
      actor: 'human',
      success: true,
      details: `Human pruned node ${nodeId} and its subtree`,
      policyCheck: 'passed',
      timestamp: Date.now(),
    });
    addNotification({ type: 'info', title: 'Node Pruned', message: `Node ${nodeId.substring(0, 8)} marked inactive. Branch preserved in audit log.` });
    updateStats({ humanInterventions: usePatchAIStore.getState().stats.humanInterventions + 1 });
    setContextMenu(null);
  }, [pruneNode, addAuditEntry, addNotification, updateStats]);

  const handleRevive = useCallback((nodeId: string) => {
    reviveNode(nodeId);
    addAuditEntry({
      nodeId,
      operation: 'REVIVE',
      actor: 'human',
      success: true,
      details: `Human revived node ${nodeId}`,
      policyCheck: 'passed',
      timestamp: Date.now(),
    });
    addNotification({ type: 'success', title: 'Branch Revived', message: `Node revived successfully. Branch is active again.` });
    setContextMenu(null);
  }, [reviveNode, addAuditEntry, addNotification]);

  const handleBranchFrom = useCallback((nodeId: string) => {
    const parentNode = storeNodes[nodeId];
    if (!parentNode) return;
    const branchNodeId = `node-human-${Date.now()}`;
    const agentCfg = AGENT_CONFIG['human'];
    addNode({
      id: branchNodeId,
      parentId: nodeId,
      agent: 'human',
      status: 'active',
      artifactType: 'decision',
      title: 'Human Branch Instruction',
      artifact: '# Human Override Decision\n\nA human operator has intervened and created a new execution branch from this point.\n\nNew direction: [Awaiting human input]\n\nThis node marks a human_override point in the execution graph.',
      contextDelta: 'Human operator created branch from this node',
      humanOverride: true,
      evaluatorFlag: false,
      timestamp: Date.now(),
      depth: parentNode.depth + 1,
      branchId: `branch-human-${Date.now()}`,
      metadata: { humanOverride: true },
    });
    addEdge({
      id: `e-${nodeId}-${branchNodeId}`,
      source: nodeId,
      target: branchNodeId,
      type: 'human',
      animated: true,
    });
    addAuditEntry({
      nodeId: branchNodeId,
      operation: 'BRANCH',
      actor: 'human',
      success: true,
      details: `Human created new branch from node ${nodeId}`,
      policyCheck: 'bypassed',
      timestamp: Date.now(),
    });
    addNotification({ type: 'success', title: 'Branch Created', message: 'New execution branch created from your intervention.' });
    setContextMenu(null);
  }, [storeNodes, addNode, addEdge, addAuditEntry, addNotification]);

  const handleInject = useCallback((nodeId: string) => {
    const sourceNode = storeNodes[nodeId];
    if (!sourceNode) return;
    const injectId = `node-human-${Date.now()}`;
    // Injected node is a sibling: same parentId as source, same depth
    addNode({
      id: injectId,
      parentId: sourceNode.parentId,
      agent: 'human',
      status: 'active',
      artifactType: 'decision',
      title: 'Injected Human Directive',
      artifact: '# Injected Directive\n\nA human operator has injected a new node as a sibling of the selected node.\n\nThis represents an alternative path or corrective instruction at this point in execution.',
      contextDelta: `Human injected sibling node alongside ${nodeId}`,
      humanOverride: true,
      evaluatorFlag: false,
      timestamp: Date.now(),
      depth: sourceNode.depth,
      branchId: sourceNode.branchId,
      metadata: { humanOverride: true, injectedFrom: nodeId },
    });
    // Connect parent → injected (if parent exists)
    if (sourceNode.parentId) {
      addEdge({ id: `e-${sourceNode.parentId}-${injectId}`, source: sourceNode.parentId, target: injectId, type: 'human', animated: true });
    }
    addAuditEntry({
      nodeId: injectId,
      operation: 'INJECT',
      actor: 'human',
      success: true,
      details: `Human injected sibling node alongside ${nodeId}`,
      policyCheck: 'bypassed',
      timestamp: Date.now(),
    });
    addNotification({ type: 'info', title: 'Node Injected', message: 'New sibling node injected into the execution graph.' });
    setContextMenu(null);
  }, [storeNodes, addNode, addEdge, addAuditEntry, addNotification]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Floating search bar */}
      <GraphSearchBar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: 'rgba(99, 102, 241, 0.5)', strokeWidth: 1.5 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(99, 102, 241, 0.12)"
        />
        <Controls
          style={{ bottom: 16, left: 16 }}
          showInteractive={false}
        />
        <MiniMap
          style={{ bottom: 16, right: 16 }}
          nodeColor={(node) => {
            const n = node.data as unknown as GraphNode;
            if (!n) return '#1a2540';
            if (n.status === 'pruned') return '#374151';
            return AGENT_CONFIG[n.agent]?.color || '#6366f1';
          }}
          maskColor="rgba(4, 7, 15, 0.7)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Empty State */}
      {Object.keys(storeNodes).length === 0 && (
        <div className="empty-state" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div className="empty-state__icon" style={{ display: 'flex', justifyContent: 'center', opacity: 0.25 }}>
            <Network size={48} strokeWidth={1} />
          </div>
          <div className="empty-state__title">No execution in progress</div>
          <div className="empty-state__description">
            Enter a task and click "Start Demo" to watch multi-agent orchestration in real time
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          node={storeNodes[contextMenu.nodeId]}
          onPrune={handlePrune}
          onRevive={handleRevive}
          onBranch={handleBranchFrom}
          onInject={handleInject}
          onInspect={() => { selectNode(contextMenu.nodeId); setContextMenu(null); }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default function StateGraphView() {
  return (
    <ReactFlowProvider>
      <GraphCanvas />
    </ReactFlowProvider>
  );
}
