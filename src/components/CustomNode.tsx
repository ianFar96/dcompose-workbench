import { Error, Pause, PlayArrow, QuestionMark, Refresh } from '@mui/icons-material';
import { Button, Card, CardContent, Chip, Typography } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import React, { useCallback, useMemo, useState } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

import useTauriEvent from '../hooks/useTauriEvent';
import type { ServiceStatus, StatusEventPayload } from '../types/service';

import ExternalNodeDrawer from './ExternalNodeDrawer';
import NodeDrawer from './NodeDrawer';

export type CustomNodeData = {
  sceneName: string
  serviceId: string
  serviceType?: string
  serviceSceneName: string
  reloadScene: () => void
  onDeleteService: (serviceId: string) => void
  onDetachScene: (sceneName: string, externalSceneName: string) => void
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
    }).catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [props.data]);

  const stop = useCallback(() => {
    setStatus('loading');

    invoke('stop_service', {
      sceneName: props.data.sceneName,
      serviceId: props.data.serviceId,
    }).catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [props.data.sceneName, props.data.serviceId]);

  const isExternal = useMemo(() => props.data.sceneName !== props.data.serviceSceneName,
    [props.data.sceneName, props.data.serviceSceneName]);

  const actionButton = useMemo(() => {
    switch (status) {
    case 'paused':
      return (
        <Button
          className='absolute -top-8 left-0 w-6 h-6 min-w-[unset] p-0'
          color={isExternal ? 'secondary' : 'primary'}
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
          color={isExternal ? 'secondary' : 'primary'}
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
          color={isExternal ? 'secondary' : 'primary'}
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
    default:
      return (
        <Button
          className='absolute -top-8 left-0 w-6 h-6 min-w-[unset] p-0'
          color={isExternal ? 'secondary' : 'primary'}
          disabled
          title={statusText}
          variant='outlined'
        >
          <QuestionMark fontSize='small' />
        </Button>
      );
    }
  }, [isExternal, run, status, statusText, stop]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      {actionButton}

      <Card className='h-24 w-52' onClick={() => setIsDrawerOpen(true)} variant='elevation'>
        <CardContent className='relative h-full overflow-hidden whitespace-nowrap text-ellipsis'>
          <Typography component='span' title={props.data.serviceId} variant='h5'>
            {props.data.serviceId}
          </Typography>
          {props.data.serviceType
            ? <Chip
              className='absolute bottom-2 left-3'
              color={isExternal ? 'secondary' : 'primary'}
              label={props.data.serviceType}
              size='small'
              title={isExternal ? 'External' : ''}
              variant='outlined'
            />
            : undefined}
        </CardContent>
      </Card>

      {isExternal ? (
        <ExternalNodeDrawer
          {...props}
          onClose={() => setIsDrawerOpen(false)}
          onDetachScene={props.data?.onDetachScene}
          open={isDrawerOpen}
        />
      ) : (
        <NodeDrawer
          {...props}
          onClose={() => setIsDrawerOpen(false)}
          onDeleteService={props.data?.onDeleteService}
          open={isDrawerOpen}
        />
      )}

      <Handle isConnectable={!isExternal} position={Position.Left} type='target' />
      <Handle isConnectable={!isExternal} position={Position.Right} type='source' />
    </>
  );
}
