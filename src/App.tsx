import React from 'react';
import { default as ReactFlow } from 'reactflow';

import 'reactflow/dist/style.css';

const initialNodes = [
  { data: { label: '1' }, id: '1', position: { x: 0, y: 0 } },
  { data: { label: '2' }, id: '2', position: { x: 0, y: 100 } },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

export default function App() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <ReactFlow edges={initialEdges} nodes={initialNodes} />
    </div>
  );
}
