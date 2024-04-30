import { Drawer } from '@mui/material';
import type { CSSProperties } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import type { EdgeProps } from 'reactflow';
import { BaseEdge, Position, getBezierPath, useReactFlow } from 'reactflow';

import useTauriEvent from '../hooks/useTauriEvent';
import type { DependsOnCondition } from '../types/docker';
import type { ServiceStatus, StatusEventPayload } from '../types/service';

import type { CustomNodeData } from './CustomNode';
import EdgeDrawer from './EdgeDrawer';

export type CustomEdgeData = {
  condition: DependsOnCondition
  sceneName: string
  sourceServiceId: string
  targetServiceId: string
}

export default function CustomEdge(props: EdgeProps<CustomEdgeData>) {
  const [edgePath] = getBezierPath({
    sourcePosition: Position.Right,
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetPosition: Position.Left,
    targetX: props.targetX,
    targetY: props.targetY,
  });

  const { setEdges } = useReactFlow<CustomNodeData, CustomEdgeData>();

  const [sourceStatus, setSourceStatus] = useState<ServiceStatus>('unknown');
  const [targetStatus, setTargetStatus] = useState<ServiceStatus>('unknown');

  const sourceEventName = useMemo(() => `${props.data?.sceneName}-${props.data?.sourceServiceId}-status-event`, [props.data?.sceneName, props.data?.sourceServiceId]);
  const sourceStatusPayload = useTauriEvent<StatusEventPayload>(sourceEventName);
  useEffect(() => {
    if (sourceStatusPayload) {
      setSourceStatus(sourceStatusPayload.status);
    }
  }, [sourceStatusPayload]);

  const targetEventName = useMemo(() => `${props.data?.sceneName}-${props.data?.targetServiceId}-status-event`, [props.data?.sceneName, props.data?.targetServiceId]);
  const targetStatusPayload = useTauriEvent<StatusEventPayload>(targetEventName);
  useEffect(() => {
    if (targetStatusPayload) {
      setTargetStatus(targetStatusPayload.status);
    }
  }, [targetStatusPayload]);

  const [edgeStyle, setEdgeStyle] = useState<CSSProperties>({});
  useEffect(() => {
    const isActive = sourceStatus === 'running' && targetStatus === 'running';
    setEdgeStyle(isActive ? { stroke: '#1976d2', strokeWidth: '2px' } : { strokeDasharray: '5px' });
    setEdges(edges => {
      const index = edges.findIndex(edge => edge.id === props.id);
      edges[index].animated = isActive;
      return edges;
    });
  }, [props.id, setEdges, sourceStatus, targetStatus]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  useEffect(() => {
    setIsDrawerOpen(!!props.selected);
  }, [props.selected]);

  return (
    <>
      <BaseEdge id={props.id} interactionWidth={20} path={edgePath} style={edgeStyle} />

      <Drawer
        anchor='right'
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        {props.data ? <EdgeDrawer edge={props} sceneName={props.data.sceneName} /> : undefined}
      </Drawer>
    </>
  );
}
