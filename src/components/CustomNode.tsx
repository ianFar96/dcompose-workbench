import { Card, CardContent, Chip, Typography } from '@mui/material';
import React from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

export default function CustomNode(_props: NodeProps) {
  return (
    <>
      <Card className='h-24 w-52' variant='elevation'>
        <CardContent className='relative h-full'>
          <Typography component='div' variant='h5'>
              sv_dogs
          </Typography>
          <Chip className='absolute bottom-2 left-3' color='primary' label='Single View Creator' size='small' variant='outlined' />

          <Handle position={Position.Left} type='target' />
          <Handle position={Position.Right} type='source' />
        </CardContent>
      </Card>
    </>
  );
}
