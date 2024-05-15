/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-case-declarations */
/* eslint-disable no-empty-function */
import ReplayIcon from '@mui/icons-material/Replay';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js';
import ELK from 'elkjs/lib/elk.bundled.js';
import { useConfirm } from 'material-ui-confirm';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Connection, Edge, EdgeChange, Node, NodeChange } from 'reactflow';
import { Background, ControlButton, Controls, MiniMap, default as ReactFlow, ReactFlowProvider, addEdge, useEdgesState, useNodesState, useReactFlow } from 'reactflow';

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

const elk = new ELK();

function Scene() {
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeData>([]);

  const { sceneName } = useParams();
  if (!sceneName) { throw new Error(); }

  const { fitView } = useReactFlow();
  const getLayoutedElements = useCallback((nodes: Node<CustomNodeData>[], edges: Edge<CustomEdgeData>[]) => {
    const graph: ElkNode = {
      children: nodes.map(node => ({
        ...node,
        height: 150,
        sourcePosition: 'right',
        targetPosition: 'left',
        width: 208,
      })),
      edges: edges as unknown as ElkExtendedEdge[],
      id: 'root',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.layered.spacing.nodeNodeBetweenLayers': 150,
        'elk.separateConnectedComponents': false,
        'elk.spacing.nodeNode': 50,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    };

    return elk
      .layout(graph)
      .then((layoutedGraph) => ({
        edges: (layoutedGraph.edges ?? []) as unknown as Edge<CustomEdgeData>[],
        nodes: (layoutedGraph.children?.map(node => ({
          ...node,
          position: { x: node.x, y: node.y },
        })) ?? []) as Node<CustomNodeData>[],
      }));
  }, []);

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
        // extent: 'parent',
        id: service.id,
        // parentId: sceneName !== service.sceneName ? service.sceneName : undefined,
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

      getLayoutedElements(sceneNodes, sceneEdges)
        .then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);

          window.requestAnimationFrame(() => fitView());
        })
        .catch(() => {});
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

  const onLayout = useCallback(() => {
    getLayoutedElements(nodes, edges)
      .then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        window.requestAnimationFrame(() => fitView());
      })
      .catch(() => {});
  }, [getLayoutedElements, nodes, edges, setNodes, setEdges, fitView]);

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

// eslint-disable-next-line func-names
export default function () {
  return (
    <ReactFlowProvider>
      <Scene />
    </ReactFlowProvider>
  );
}
