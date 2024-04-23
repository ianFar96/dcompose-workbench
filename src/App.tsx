import ReplayIcon from '@mui/icons-material/Replay';
import dagre from 'dagre';
import React, { useCallback, useMemo } from 'react';
import type { Connection, Edge, Node } from 'reactflow';
import { Background, ControlButton, Controls, MiniMap, Position, default as ReactFlow, addEdge, useEdgesState, useNodesState } from 'reactflow';

import CustomNode from './components/CustomNode';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import 'reactflow/dist/style.css';

const position = { x: 0, y: 0 };
const initialNodes: Node[] = [
  { data: { label: '1' }, id: '1', position, type: 'custom' },
  { data: { label: '2' }, id: '2', position, type: 'custom' },
  { data: { label: '3' }, id: '3', position, type: 'custom' },
  { data: { label: '4' }, id: '4', position, type: 'custom' },
];
const initialEdges: Edge[] = [
  { animated: true, id: 'e1-2', source: '1', target: '2' },
  { animated: true, id: 'e1-3', source: '1', target: '3' },
  { animated: true, id: 'e3-4', source: '3', target: '4' },
];

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'LR' });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { height: nodeHeight, width: nodeWidth });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Left;
    node.sourcePosition = Position.Right;

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { edges, nodes };
};

const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  initialNodes,
  initialEdges
);

export default function App() {
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) =>
      addEdge({ ...connection, animated: true }, eds)
    );
  }, [setEdges]);

  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, setNodes, setEdges]);

  return (
    <>
      <div style={{ height: '100vh', width: '100vw' }}>
        <ReactFlow
          edges={edges}
          fitView
          nodeTypes={nodeTypes}
          nodes={nodes}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
        >
          <Background />
          <MiniMap />
          <Controls >
            <ControlButton onClick={onLayout}>
              <ReplayIcon />
            </ControlButton>
          </Controls>
        </ReactFlow>
      </div>
    </>
  );
}
