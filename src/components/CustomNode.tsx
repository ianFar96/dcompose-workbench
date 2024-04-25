import { Pause, PlayArrow, Refresh } from '@mui/icons-material';
import { Button, Card, CardContent, Chip, Typography } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import React, { useCallback, useMemo, useState } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

export type CustomNodeData = {
  sceneName: string
  serviceId: string
  serviceName: string
  serviceType: string
}

type ServiceStatus = 'paused' | 'running' | 'loading'

export default function CustomNode(props: NodeProps<CustomNodeData>) {
  const [status, setStatus] = useState<ServiceStatus>('paused');

  const run = useCallback(() => {
    setStatus('loading');

    invoke('run_service', {
      sceneName: props.data.sceneName,
      serviceId: props.data.serviceId,
    }).then(() => {
      setStatus('running');
    }).catch(error => {
      console.error(error);
      setStatus('paused');
    });
  }, [props.data.sceneName, props.data.serviceId]);

  const stop = useCallback(() => {
    setStatus('loading');

    invoke('stop_service', {
      sceneName: props.data.sceneName,
      serviceId: props.data.serviceId,
    }).then(() => {
      setStatus('paused');
    }).catch(error => {
      console.error(error);
      setStatus('running');
    });
  }, [props.data.sceneName, props.data.serviceId]);

  const actionButton = useMemo(() => {
    switch (status) {
    case 'paused':
      return (
        <Button className='absolute -top-8 left-0 w-6 h-6 min-w-[unset] p-0' onClick={run} variant='outlined'>
          <PlayArrow fontSize='small' />
        </Button>
      );
    case 'running':
      return (
        <Button className='absolute -top-8 left-0 w-6 h-6 min-w-[unset] p-0' onClick={stop} variant='outlined'>
          <Pause fontSize='small' />
        </Button>
      );
    case 'loading':
      return (
        <Button className='absolute -top-8 left-0 w-6 h-6 min-w-[unset] p-0' disabled variant='outlined'>
          <Refresh className='animate-spin' fontSize='small' />
        </Button>
      );
    }
  }, [run, status, stop]);

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
