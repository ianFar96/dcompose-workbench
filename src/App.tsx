import { Button, Card, CardActions, CardContent, Typography } from '@mui/material';
import React from 'react';
import { default as ReactFlow } from 'reactflow';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import 'reactflow/dist/style.css';

const initialNodes = [
  { data: { label: '1' }, id: '1', position: { x: 0, y: 0 } },
  { data: { label: '2' }, id: '2', position: { x: 0, y: 100 } },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

export default function App() {
  const card = (
    <>
      <CardContent>
        <Typography color='text.secondary' gutterBottom sx={{ fontSize: 14 }}>
        Word of the Day
        </Typography>
        <Typography component='div' variant='h5'>
        benevolent
        </Typography>
        <Typography color='text.secondary' sx={{ mb: 1.5 }}>
        adjective
        </Typography>
        <Typography variant='body2'>
        well meaning and kindly.
          <br />
          {'"a benevolent smile"'}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size='small'>Learn More</Button>
      </CardActions>
    </>
  );


  return (
    <>
      <Card variant='outlined'>{card}</Card>
      <div style={{ height: '100vh', width: '100vw' }}>
        <ReactFlow edges={initialEdges} nodes={initialNodes} />
      </div>
    </>
  );
}
