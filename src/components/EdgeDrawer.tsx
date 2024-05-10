import type { SelectChangeEvent } from '@mui/material';
import { Box, Button, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import React, { useCallback } from 'react';
import { useReactFlow, type Edge } from 'reactflow';

import type { CustomEdgeData } from './CustomEdge';

type EdgeDrawerProps = {
  edge: Edge<CustomEdgeData>
  sceneName: string
}

const dependsOnConditionOptions = ['service_started', 'service_healthy', 'service_completed_successfully'];
export default function EdgeDrawer(props: EdgeDrawerProps) {
  const onConditionChange = useCallback((event: SelectChangeEvent) => {
    invoke('set_dependency_condition', {
      condition: event.target.value,
      sceneName: props.sceneName,
      source: props.edge.source,
      target: props.edge.target,
    }).catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [props.sceneName, props.edge.source, props.edge.target]);

  const { setEdges } = useReactFlow();
  const onDelete = useCallback(() => {
    invoke('delete_dependency', { sceneName: props.sceneName, source: props.edge.source, target: props.edge.target })
      .then(() => {
        setEdges(edges => edges.filter(edge => edge.id !== props.edge.id));
      })
      .catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [props.edge, props.sceneName, setEdges]);

  return (
    <>
      <Box className='min-w-80 flex flex-col h-full' role='presentation'>
        <h2 className='text-lg px-6 py-4'>Dependency</h2>
        <hr />

        <div className='px-4 py-3 h-full'>
          <div className='flex flex-col items-center mb-8 mt-4'>
            <p className='text-center whitespace-nowrap mb-2'>{props.edge.target}</p>
            <div className='h-12 w-px bg-gray-300 mb-2'></div>
            <p className='text-center whitespace-nowrap mb-2 text-xs text-gray-400'>depends on</p>
            <div className='h-12 w-px bg-gray-300 mb-2 relative'>
              <div className='h-2 w-px bg-gray-300 mb-2 absolute -rotate-45 bottom-0 translate-y-2 -translate-x-1'></div>
              <div className='h-2 w-px bg-gray-300 mb-2 absolute rotate-45 bottom-0 translate-y-2 translate-x-1'></div>
            </div>
            <p className='text-center whitespace-nowrap'>{props.edge.source}</p>
          </div>

          <FormControl fullWidth>
            <InputLabel id='depends-on-condition-select'>Condition</InputLabel>
            <Select
              defaultValue={props.edge.data?.condition}
              label='Condition'
              labelId='depends-on-condition-select'
              onChange={onConditionChange}
            >
              {dependsOnConditionOptions.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <hr />
        <div className='flex justify-end px-4 py-3'>
          <Button color='error' onClick={onDelete} variant='contained'>
              Delete
          </Button>
        </div>
      </Box>
    </>
  );
}
