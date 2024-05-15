import type { SelectChangeEvent } from '@mui/material';
import { Box, Button, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import React, { useCallback, useMemo } from 'react';
import { useNodes, useReactFlow, type Edge } from 'reactflow';

import type { CustomEdgeData } from './CustomEdge';
import type { CustomNodeData } from './CustomNode';

const dependsOnConditionOptions = ['service_started', 'service_healthy', 'service_completed_successfully'];
export default function EdgeDrawer(props: Edge<CustomEdgeData>) {
  const onConditionChange = useCallback((event: SelectChangeEvent) => {
    invoke('set_dependency_condition', {
      condition: event.target.value,
      sceneName: props.data?.sceneName,
      source: props.source,
      target: props.target,
    }).catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [props.data?.sceneName, props.source, props.target]);

  const { setEdges } = useReactFlow();
  const onDelete = useCallback(() => {
    invoke('delete_dependency', { sceneName: props.data?.sceneName, source: props.source, target: props.target })
      .then(() => {
        setEdges(edges => edges.filter(edge => edge.id !== props.id));
      })
      .catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [props, setEdges]);

  const nodes = useNodes<CustomNodeData>();
  const isTargetExternal = useMemo(() => {
    const targetNode = nodes.find(node => node.id === props.target);
    return targetNode?.data.sceneName !== targetNode?.data.serviceSceneName;
  }, [nodes, props.target]);

  return (
    <>
      <Box className='min-w-80 flex flex-col h-full' role='presentation'>
        <h2 className='text-lg px-6 py-4'>Dependency</h2>
        <hr />

        <div className='px-4 py-3 h-full'>
          <div className='flex flex-col items-center mb-8 mt-4'>
            <p className='text-center whitespace-nowrap mb-2'>{props.target}</p>
            <div className='h-12 w-px bg-gray-300 mb-2'></div>
            <p className='text-center whitespace-nowrap mb-2 text-xs text-gray-400'>depends on</p>
            <div className='h-12 w-px bg-gray-300 mb-2 relative'>
              <div className='h-2 w-px bg-gray-300 mb-2 absolute -rotate-45 bottom-0 translate-y-2 -translate-x-1'></div>
              <div className='h-2 w-px bg-gray-300 mb-2 absolute rotate-45 bottom-0 translate-y-2 translate-x-1'></div>
            </div>
            <p className='text-center whitespace-nowrap'>{props.source}</p>
          </div>

          <FormControl fullWidth>
            <InputLabel id='depends-on-condition-select'>
              Condition
            </InputLabel>
            <Select
              defaultValue={props.data?.condition}
              disabled={isTargetExternal}
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

        {isTargetExternal ? undefined : (
          <>
            <hr />
            <div className='flex justify-end px-4 py-3'>
              <Button color='error' onClick={onDelete} variant='contained'>
                  Delete
              </Button>
            </div>
          </>
        )}
      </Box>
    </>
  );
}
