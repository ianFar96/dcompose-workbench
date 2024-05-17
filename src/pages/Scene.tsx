/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-case-declarations */
/* eslint-disable no-empty-function */
import ReplayIcon from '@mui/icons-material/Replay';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import dagre from 'dagre';
import { useConfirm } from 'material-ui-confirm';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Connection, Edge, EdgeChange, Node, NodeChange } from 'reactflow';
import { Background, ControlButton, Controls, MiniMap, Position, default as ReactFlow, addEdge, useEdgesState, useNodesState } from 'reactflow';

import type { CustomEdgeData } from '../components/CustomEdge';
import CustomEdge from '../components/CustomEdge';
import type { CustomNodeData } from '../components/CustomNode';
import CustomNode from '../components/CustomNode';
import SceneHeader from '../components/SceneHeader';
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
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeData>([]);

  const { sceneName } = useParams();
  if (!sceneName) { throw new Error(); }

  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const loadScene = useCallback(() => invoke<Service[]>('get_scene_services', { sceneName })
    .then(services => {
      setServiceIds(services.map(service => service.id));

      // const sceneGroups = services.reduce<Node[]>((acc, service) => {
      //   acc.push({
      //     data: { label: 'Label' },
      //     id: 'dev-scene-2',
      //     position: { x: 0, y: 0 },
      //     style: {
      //       height: 1000,
      //       width: 1000,
      //     },
      //     type: 'group',
      //   });

      //   return acc;
      // }, []);

      const sceneNodes: Node<CustomNodeData>[] = services.map(service => ({
        data: {
          onDeleteService,
          reloadScene,
          sceneName,
          serviceId: service.id,
          serviceSceneName: service.sceneName,
          serviceType: service.type,
        },
        extent: 'parent',
        id: service.id,
        parentId: sceneName !== service.sceneName ? service.sceneName : undefined,
        position: { x: 0, y: 0 },
        type: 'custom',
      }));

      const sceneEdges: Edge<CustomEdgeData>[] = [];
      for (const service of services) {
        for (const [targetServiceId, definition] of Object.entries(service.dependsOn)) {
          sceneEdges.push({
            animated: true,
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
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [sceneName, setEdges, setNodes]);

  const startEmittingSceneStatus = useCallback(() => invoke('start_emitting_scene_status', { sceneName }), [sceneName]);
  const stopEmittingSceneStatus = useCallback(() => invoke('stop_emitting_scene_status', { sceneName }), [sceneName]);

  useEffect(() => {
    loadScene()
      .then(() => {
        startEmittingSceneStatus()
          .catch(error => message(error as string, { title: 'Error', type: 'error' }));
      })
      .catch(error => message(error as string, { title: 'Error', type: 'error' }));

    return () => {
      stopEmittingSceneStatus()
        .catch(error => message(error as string, { title: 'Error', type: 'error' }));
    };
  }, [loadScene, startEmittingSceneStatus, stopEmittingSceneStatus]);

  const onConnect = useCallback((connection: Connection) => {
    invoke('create_dependency', { sceneName, source: connection.source, target: connection.target })
      .then(() => {
        setEdges((edges) => addEdge({
          ...connection,
          animated: true,
          data: {
            sceneName,
            sourceServiceId: connection.source,
            targetServiceId: connection.target,
          },
          type: 'custom',
        }, edges));
      })
      .catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [sceneName, setEdges]);

  const onEdgesDelete = useCallback(async (edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      try {
        await invoke('delete_dependency', { sceneName, source: edge.source, target: edge.target });
      } catch (error) {
        await message(error as string, { title: 'Error', type: 'error' });
      }
    }
  }, [sceneName]);

  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, setNodes, setEdges]);

  const reloadScene = useCallback(() => {
    stopEmittingSceneStatus()
      .then(() => {
        loadScene()
          .then(() => {
            startEmittingSceneStatus()
              .catch(error => message(error as string, { title: 'Error', type: 'error' }));
          })
          .catch(error => message(error as string, { title: 'Error', type: 'error' }));
      })
      .catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [loadScene, startEmittingSceneStatus, stopEmittingSceneStatus]);

  useEffect(() => {
    const callback = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'r') {
        reloadScene();
      }
    };
    window.addEventListener('keydown', callback);
    return () => { window.removeEventListener('keydown', callback); };
  }, [reloadScene]);

  const confirm = useConfirm();
  const onDeleteService = useCallback(async (serviceId: string) => {
    try {
      await confirm({
        cancellationButtonProps: { variant: 'text' },
        cancellationText: 'No',
        confirmationButtonProps: { color: 'error', variant: 'contained' },
        confirmationText: 'Yes',
        description: `The service "${serviceId}" will be deleted along with its configuration and local assets. Are you sure you want to proceed?`,
        title: 'Delete service',
      });

      try {
        await invoke('delete_service', { sceneName, serviceId });
      } catch (error) {
        await message(error as string, { title: 'Error', type: 'error' });
      }
    } catch (error) { /* empty */ }
  }, [confirm, sceneName]);

  // const onDetachScene = useCallback((currentSceneName: string, externalSceneName: string) => {
  //   confirm({
  //     cancellationButtonProps: { variant: 'text' },
  //     cancellationText: 'No',
  //     confirmationButtonProps: { color: 'error', variant: 'contained' },
  //     confirmationText: 'Yes',
  //     description: `The scene "${externalSceneName}" will be detached from ${currentSceneName}, do you want to proceed?`,
  //     title: 'Detach scene',
  //   }).then(() => {
  //     invoke('detach_scene', { sceneName: currentSceneName, sceneNameToDetach: externalSceneName })
  //       .then(() => reloadScene())
  //       .catch(error => message(error as string, { title: 'Error', type: 'error' }));
  //   }).catch(() => {});
  // }, [confirm, reloadScene]);

  const onCustomNodesChanges = useCallback((changes: NodeChange[]) => {
    for (const change of changes) {
      switch (change.type) {
      case 'remove':
        const node = nodes.find(node => node.id === change.id);
        if (!node) { return; }
        if (node.data.serviceSceneName === node.data.sceneName) {
          onDeleteService(node.data.serviceId).then(() => {
            onNodesChange([change]);
          }).catch(() => {});
        }
        break;

      default:
        onNodesChange([change]);
        break;
      }
    }
  }, [nodes, onDeleteService, onNodesChange]);

  const onCustomEdgeChanges = useCallback((changes: EdgeChange[]) => {
    for (const change of changes) {
      switch (change.type) {
      case 'remove':
        const edge = edges.find(edge => edge.id === change.id);
        if (!edge) { return; }

        const targetNode = nodes.find(node => node.id === edge.target);
        const isTargetExternal = targetNode?.data.sceneName !== targetNode?.data.serviceSceneName;
        if (!isTargetExternal) {
          onEdgesDelete([edge]).then(() => {
            onEdgesChange([change]);
          }).catch(() => {});
        }
        break;

      default:
        onEdgesChange([change]);
        break;
      }
    }
  }, [edges, nodes, onEdgesChange, onEdgesDelete]);

  return (
    <>
      <div className='flex flex-col h-screen'>
        <SceneHeader
          reloadScene={reloadScene}
          sceneName={sceneName}
          serviceIds={serviceIds}
        />

        <div className='h-full w-screen'>
          <ReactFlow
            edgeTypes={edgeTypes}
            edges={edges}
            fitView
            nodeTypes={nodeTypes}
            nodes={nodes}
            onConnect={onConnect}
            onEdgesChange={onCustomEdgeChanges}
            onNodesChange={onCustomNodesChanges}
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
