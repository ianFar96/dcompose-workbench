import { PlayArrow, Refresh, Stop } from '@mui/icons-material';
import ReplayIcon from '@mui/icons-material/Replay';
import { Button } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import dagre from 'dagre';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Connection, Edge, Node } from 'reactflow';
import { Background, ControlButton, Controls, MiniMap, Position, default as ReactFlow, addEdge, useEdgesState, useNodesState } from 'reactflow';

import type { CustomEdgeData } from './components/CustomEdge';
import CustomEdge from './components/CustomEdge';
import type { CustomNodeData } from './components/CustomNode';
import CustomNode from './components/CustomNode';
import type { Scene } from './types/scene';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import 'reactflow/dist/style.css';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 208;
const nodeHeight = 96;
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 150 });

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

export default function App() {
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const sceneName = 'fast-data-example';

  useEffect(() => {
    invoke<Scene>('get_scene', { sceneName }).then(scene => {
      const sceneNodes: Node<CustomNodeData>[] = scene.services.map(service => ({
        data: {
          sceneName,
          serviceId: service.id,
          serviceName: service.label,
          serviceType: service.type,
        },
        id: service.id,
        position: { x: 0, y: 0 },
        type: 'custom',
      }));

      const sceneEdges: Edge<CustomEdgeData>[] = [];
      for (const service of scene.services) {
        for (const [targetServiceId, definition] of Object.entries(service.dependsOn)) {
          sceneEdges.push({
            data: {
              condition: definition.condition,
              sceneName,
              sourceServiceId: service.id,
              targetServiceId,
            },
            id: `e${targetServiceId}-${service.id}`,
            source: targetServiceId,
            target: service.id,
            type: 'custom',
          });
        }
      }

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(sceneNodes, sceneEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }).catch(console.error);
  }, [setNodes, setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    invoke('create_dependency', { sceneName, source: connection.source, target: connection.target })
      .then(() => {
        setEdges((edges) => addEdge({
          ...connection,
          data: {
            sceneName,
            sourceServiceId: connection.source,
            targetServiceId: connection.target,
          },
          type: 'custom',
        }, edges));
      })
      .catch(error => {
        // TODO: un bell'alert
        console.error(error);
      });
  }, [setEdges]);

  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      invoke('delete_dependency', { sceneName, source: edge.source, target: edge.target })
        .then(() => {
          setEdges(edges => edges.filter(edge => !edgesToDelete.includes(edge)));
        })
        .catch(error => {
        // TODO: un bell'alert
          console.error(error);
        });
    }
  }, [setEdges]);

  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, setNodes, setEdges]);

  const [isRunningScene, setIsRunningScene] = useState(false);
  const startAll = useCallback(() => {
    setIsRunningScene(true);
    invoke('run_scene', { sceneName })
      .catch(error => {
        // TODO: un bell'alert
        console.error(error);
      })
      .finally(() => {
        setIsRunningScene(false);
      });
  }, []);

  const [isStoppingScene, setIsStoppingScene] = useState(false);
  const stopAll = useCallback(() => {
    setIsStoppingScene(true);
    invoke('stop_scene', { sceneName })
      .catch(error => {
        // TODO: un bell'alert
        console.error(error);
      })
      .finally(() => {
        setIsStoppingScene(false);
      });
  }, []);

  return (
    <>
      <div className='fixed top-4 right-4 z-10'>
        <Button
          className='w-10 h-10 min-w-[unset] p-0 mr-2'
          disabled={isRunningScene}
          onClick={startAll}
          title='Start all services'
          variant='outlined'
        >
          {isRunningScene ? <Refresh className='animate-spin' fontSize='large' /> : <PlayArrow fontSize='large' />}
        </Button>

        <Button
          className='w-10 h-10 min-w-[unset] p-0'
          disabled={isStoppingScene}
          onClick={stopAll}
          title='Stop all services'
          variant='outlined'
        >
          {isStoppingScene ? <Refresh className='animate-spin' fontSize='large' /> : <Stop fontSize='large' />}
        </Button>
      </div>

      <div style={{ height: '100vh', width: '100vw' }}>
        <ReactFlow
          edgeTypes={edgeTypes}
          edges={edges}
          fitView
          nodeTypes={nodeTypes}
          nodes={nodes}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
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
