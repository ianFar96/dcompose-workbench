import { Drawer } from '@mui/material';
import React, { useEffect, useState } from 'react';
import type { EdgeProps } from 'reactflow';
import { BaseEdge, Position, getBezierPath } from 'reactflow';

import type { DependsOnCondition } from '../types/docker';

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

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  useEffect(() => {
    setIsDrawerOpen(!!props.selected);
  }, [props.selected]);

  return (
    <>
      <BaseEdge id={props.id} interactionWidth={20} path={edgePath} />

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
