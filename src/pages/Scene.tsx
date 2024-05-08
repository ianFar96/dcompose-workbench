import { ArrowBack, MoreVert, PlayArrow, Refresh, Stop } from '@mui/icons-material';
import ReplayIcon from '@mui/icons-material/Replay';
import { Button } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import dagre from 'dagre';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Connection, Edge, Node } from 'reactflow';
import { Background, ControlButton, Controls, MiniMap, Position, default as ReactFlow, addEdge, useEdgesState, useNodesState } from 'reactflow';

import CreateServiceDrawer from '../components/CreateServiceDrawer';
import type { CustomEdgeData } from '../components/CustomEdge';
import CustomEdge from '../components/CustomEdge';
import type { CustomNodeData } from '../components/CustomNode';
import CustomNode from '../components/CustomNode';
import SceneMenu from '../components/SceneMenu';
import type { Service } from '../types/service';

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

export default function Scene() {
  const navigate = useNavigate();

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { sceneName } = useParams();
  if (!sceneName) { throw new Error(); }

  const [services, setServices] = useState<Service[]>([]);

  const unlistenStatusFns: (() => Promise<unknown>)[] = useMemo(() => [], []);
  const loadScene = useCallback(() => {
    invoke<Service[]>('get_scene_services', { sceneName }).then(services => {
      setServices(services);

      for (const service of services) {
        invoke('start_emitting_service_status', { sceneName, serviceId: service.id })
          .catch(error => alert(error));
        unlistenStatusFns.push(invoke.bind(undefined, 'stop_emitting_service_status', { sceneName, serviceId: service.id }));
      }

      const sceneNodes: Node<CustomNodeData>[] = services.map(service => ({
        data: {
          sceneName,
          serviceId: service.id,
          serviceType: service.type,
        },
        id: service.id,
        position: { x: 0, y: 0 },
        type: 'custom',
      }));

      const sceneEdges: Edge<CustomEdgeData>[] = [];
      for (const service of services) {
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
  }, [sceneName, setEdges, setNodes, unlistenStatusFns]);

  useEffect(() => {
    loadScene();
    return () => {
      for (const unlisten of unlistenStatusFns) {
        unlisten().catch(error => alert(error));
      }
    };
  }, [setNodes, setEdges, sceneName, loadScene, unlistenStatusFns]);

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
      .catch(error => alert(error));
  }, [sceneName, setEdges]);

  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      invoke('delete_dependency', { sceneName, source: edge.source, target: edge.target })
        .then(() => {
          setEdges(edges => edges.filter(edge => !edgesToDelete.includes(edge)));
        })
        .catch(error => alert(error));
    }
  }, [sceneName, setEdges]);

  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, setNodes, setEdges]);

  const [isRunningScene, setIsRunningScene] = useState(false);
  const startAll = useCallback(() => {
    setIsRunningScene(true);
    invoke('run_scene', { sceneName })
      .catch(error => alert(error))
      .finally(() => {
        setIsRunningScene(false);
      });
  }, [sceneName]);

  const [isStoppingScene, setIsStoppingScene] = useState(false);
  const stopAll = useCallback(() => {
    setIsStoppingScene(true);
    invoke('stop_scene', { sceneName })
      .catch(error => alert(error))
      .finally(() => {
        setIsStoppingScene(false);
      });
  }, [sceneName]);

  const openVsCode = useCallback(() => {
    invoke('open_vscode', { sceneName })
      .catch(error => alert(error));
  }, [sceneName]);

  const reloadScene = useCallback(() => {
    for (const unlisten of unlistenStatusFns) {
      unlisten().catch(error => alert(error));
    }

    loadScene();
  }, [loadScene, unlistenStatusFns]);

  useEffect(() => {
    const callback = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'r') {
        reloadScene();
      }
    };
    window.addEventListener('keydown', callback);
    return () => { window.removeEventListener('keydown', callback); };
  }, [reloadScene]);

  const [isMenuShown, setIsMenuShown] = useState(false);
  const triggerMenuRef = useRef(null);

  const [isCreateServiceDrawerOpen, setIsCreateDrawerDialogOpen] = useState(false);
  const handleCreateService = useCallback((serviceId: string, code: string) => {
    invoke('create_service', { code, sceneName, serviceId }).then(() => {
      setIsCreateDrawerDialogOpen(false);
      reloadScene();
    }).catch(error => {
      // TODO: un bell'allert
      console.error(error);
    });
  }, [reloadScene, sceneName]);

  return (
    <>
      <div className='flex flex-col h-screen'>
        <div className='flex justify-between px-4 py-3 shadow-lg z-10'>
          <div className='flex items-center'>
            <button className='mr-2 p-0' onClick={() => navigate('/scenes')}>
              <ArrowBack />
            </button>
            <h2 className='text-xl'>{sceneName}</h2>
          </div>

          <div>
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
              className='w-10 h-10 min-w-[unset] p-0 mr-2'
              disabled={isStoppingScene}
              onClick={stopAll}
              title='Stop all services'
              variant='outlined'
            >
              {isStoppingScene ? <Refresh className='animate-spin' fontSize='large' /> : <Stop fontSize='large' />}
            </Button>

            <button
              className='w-4 h-10 min-w-[unset] p-0'
              color='inherit'
              onClick={() => setIsMenuShown(!isMenuShown)}
              ref={triggerMenuRef}
            >
              <MoreVert />
            </button>
          </div>
        </div>

        {triggerMenuRef.current ? (
          <SceneMenu
            actions={{
              createService: () => setIsCreateDrawerDialogOpen(true),
              openVsCode,
              reloadScene,
            }}
            anchorEl={triggerMenuRef.current}
            handleClose={() => setIsMenuShown(false)}
            open={isMenuShown}
          />
        ) : undefined}

        <CreateServiceDrawer
          handleClose={() => setIsCreateDrawerDialogOpen(false)}
          handleSubmit={handleCreateService}
          open={isCreateServiceDrawerOpen}
          sceneName={sceneName}
          serviceIds={services.map(service => service.id)}
        />

        <div className='h-full w-screen'>
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
      </div>
    </>
  );
}
