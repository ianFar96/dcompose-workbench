import type { SelectChangeEvent } from '@mui/material';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import React, { useCallback } from 'react';
import type { Edge } from 'reactflow';

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
    }).catch(error => {
      // TODO: un bell'allert
      console.error(error);
    });
  }, [props.sceneName, props.edge.source, props.edge.target]);

  return (
    <>
      <p>A --{'>'} {props.edge.source}</p>
      <p>B --{'>'} {props.edge.target}</p>

      <Box className='min-w-52' role='presentation'>
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
      </Box>
    </>
  );
}
