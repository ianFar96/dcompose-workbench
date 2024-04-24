import { PlayArrow } from '@mui/icons-material';
import { Button, Card, CardContent, Chip, Typography } from '@mui/material';
import React from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

type CustomNodeData = {
  name: string
  label: string
}

export default function CustomNode(props: NodeProps<CustomNodeData>) {
  return (
    <>
      <Button className='absolute -top-8 left-0 w-6 h-6 min-w-[unset] p-0' variant='outlined'>
        <PlayArrow fontSize='small' />
      </Button>

      <Card className='h-24 w-52' variant='elevation'>
        <CardContent className='relative h-full'>
          <Typography component='span' variant='h5'>
            {props.data.name}
          </Typography>
          <Chip className='absolute bottom-2 left-3' color='primary' label={props.data.label} size='small' variant='outlined' />

        </CardContent>
      </Card>

      <Handle position={Position.Left} type='target' />
      <Handle position={Position.Right} type='source' />
    </>
  );
}
