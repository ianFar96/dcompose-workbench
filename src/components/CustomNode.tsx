import { Error, Pause, PlayArrow, QuestionMark, Refresh } from '@mui/icons-material';
import { Button, Card, CardContent, Chip, Typography } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { listen } from '@tauri-apps/api/event';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

export type CustomNodeData = {
  sceneName: string
  serviceId: string
  serviceName: string
  serviceType: string
}

type ServiceStatus = 'paused' | 'running' | 'loading' | 'error' | 'unknown'
type StatusEventPayload = {
  status: ServiceStatus
  message?: string
}

export default function CustomNode(props: NodeProps<CustomNodeData>) {
  const [status, setStatus] = useState<ServiceStatus>('unknown');
  const [statusText, setStatusText] = useState<string | undefined>();

  useEffect(() => {
    const eventName = `${props.data.sceneName}-${props.data.serviceId}-status-event`;
    const unlistenPromise = listen<StatusEventPayload>(eventName, event => {
      console.log({ payload: event.payload });

      setStatus(event.payload.status);
      setStatusText(event.payload.message);
    });

    let unlisten: UnlistenFn | undefined;
    unlistenPromise.then(unlistenFn => { unlisten = unlistenFn; })
      .catch(error => {
        // TODO: un bell'alert
        console.error(error);
      });
    return () => { unlisten?.(); };
  }, [props.data.sceneName, props.data.serviceId]);

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

  return (
    <>
      {actionButton}

      <Card className='h-24 w-52' variant='elevation'>
        <CardContent className='relative h-full'>
          <Typography component='span' variant='h5'>
            {props.data.serviceName}
          </Typography>
          <Chip className='absolute bottom-2 left-3' color='primary' label={props.data.serviceType} size='small' variant='outlined' />

        </CardContent>
      </Card>

      <Handle position={Position.Left} type='target' />
      <Handle position={Position.Right} type='source' />
    </>
  );
}
