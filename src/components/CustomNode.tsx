import { Error, Pause, PlayArrow, QuestionMark, Refresh } from '@mui/icons-material';
import { Button, Card, CardContent, Chip, Drawer, Typography } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import React, { useCallback, useMemo, useState } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

import useTauriEvent from '../hooks/useTauriEvent';
import type { ServiceStatus, StatusEventPayload } from '../types/service';

import NodeDrawer from './NodeDrawer';

export type CustomNodeData = {
  sceneName: string
  serviceId: string
  serviceName: string
  serviceType?: string
}

export default function CustomNode(props: NodeProps<CustomNodeData>) {
  const [status, setStatus] = useState<ServiceStatus>('unknown');
  const [statusText, setStatusText] = useState<string | undefined>();

  const eventName = useMemo(() => `${props.data.sceneName}-${props.data.serviceId}-status-event`, [props.data.sceneName, props.data.serviceId]);
  useTauriEvent<StatusEventPayload>(eventName, payload => {
    setStatus(payload.status);
    setStatusText(payload.message);
  });

  const run = useCallback(() => {
    setStatus('loading');

    invoke('run_service', {
      sceneName: props.data.sceneName,
      serviceId: props.data.serviceId,
    }).catch(error => {
      // TODO: un bell'alert
      console.error(error);
    });
  }, [props.data.sceneName, props.data.serviceId]);

  const stop = useCallback(() => {
    setStatus('loading');

    invoke('stop_service', {
      sceneName: props.data.sceneName,
      serviceId: props.data.serviceId,
    }).catch(error => {
      // TODO: un bell'alert
      console.error(error);
    });
  }, [props.data.sceneName, props.data.serviceId]);

  const actionButton = useMemo(() => {
    switch (status) {
    case 'paused':
      return (
        <Button
          className='absolute -top-8 left-0 w-6 h-6 min-w-[unset] p-0'
          onClick={run}
          title={statusText}
          variant='outlined'
        >
          <PlayArrow fontSize='small' />
        </Button>
      );
    case 'running':
      return (
        <Button
          className='absolute -top-8 left-0 w-6 h-6 min-w-[unset] p-0'
          onClick={stop}
          title={statusText}
          variant='outlined'
        >
          <Pause fontSize='small' />
        </Button>
      );
    case 'loading':
      return (
        <Button
          className='absolute -top-8 left-0 w-6 h-6 min-w-[unset] p-0'
          onClick={stop}
          title={statusText}
          variant='outlined'
        >
          <Refresh className='animate-spin' fontSize='small' />
        </Button>
      );
    case 'error':
      return (
        <Button
          className='absolute -top-8 left-0 w-6 h-6 min-w-[unset] p-0'
          color='error'
          onClick={stop}
          title={statusText}
          variant='outlined'
        >
          <Error fontSize='small' />
        </Button>
      );
    case 'unknown':
      return (
        <Button
          className='absolute -top-8 left-0 w-6 h-6 min-w-[unset] p-0'
          disabled
          title={statusText}
          variant='outlined'
        >
          <QuestionMark fontSize='small' />
        </Button>
      );
    }
  }, [run, status, statusText, stop]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      {actionButton}

      <Card className='h-24 w-52' onClick={() => setIsDrawerOpen(true)} variant='elevation'>
        <CardContent className='relative h-full overflow-hidden whitespace-nowrap text-ellipsis'>
          <Typography component='span' title={props.data.serviceName} variant='h5'>
            {props.data.serviceName}
          </Typography>
          {props.data.serviceType ? <Chip className='absolute bottom-2 left-3' color='primary' label={props.data.serviceType} size='small' variant='outlined' /> : undefined}
        </CardContent>
      </Card>

      <Drawer
        anchor='right'
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        <NodeDrawer sceneName={props.data.sceneName} serviceId={props.data.serviceId} />
      </Drawer>

      <Handle position={Position.Left} type='target' />
      <Handle position={Position.Right} type='source' />
    </>
  );
}
