import { ArrowBack, Edit, Folder, Search } from '@mui/icons-material';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { invoke } from '@tauri-apps/api';
import EditService from './EditService';
import EditServiceVolumes from './EditServiceAssets';
import ServiceLogs from './ServiceLogs';
import { Node, useReactFlow } from 'reactflow';
import { CustomNodeData } from './CustomNode';

type Pages = undefined | 'logs' | 'edit' | 'assets'

type NodeDrawerProps = {
  serviceId: string
  sceneName: string
}

export default function NodeDrawer(props: NodeDrawerProps) {
  const [page, setPage] = useState<Pages>();

  const { getNodes } = useReactFlow();
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  useEffect(() => {
    const nodes = getNodes() as Node<CustomNodeData>[]
    setServiceIds(nodes.map(node => node.data.serviceId))
  })

  const handleEditService = useCallback((serviceId: string, code: string) => {
    invoke('update_service', {
      code,
      previousServiceId: props.serviceId,
      sceneName: props.sceneName,
      serviceId,
    }).then(() => {
      setPage(undefined);
    }).catch(error => {
      // TODO: un bell'allert
      console.error(error);
    });
  }, [props.sceneName, props.serviceId]);

  return useMemo(() => {
    switch (page) {
      case 'logs':
        return (
          <Box className='w-[50vw] h-screen flex flex-col' role='presentation'>
            <div className='flex items-center px-6 py-4'>
              <button
                className='mr-2 -ml-2'
                onClick={() => setPage(undefined)}
              >
                <ArrowBack fontSize='small' />
              </button>
              <h2 className='text-lg whitespace-nowrap'>{props.serviceId}</h2>
            </div>
            <hr />

            <ServiceLogs sceneName={props.sceneName} serviceId={props.serviceId} />
          </Box>
        );

      case 'edit':
        return (
          <Box className='w-[50vw] h-screen flex flex-col' role='presentation'>
            <div className='flex items-center px-6 py-4'>
              <button
                className='mr-2 -ml-2'
                onClick={() => setPage(undefined)}
              >
                <ArrowBack fontSize='small' />
              </button>
              <h2 className='text-lg whitespace-nowrap'>{props.serviceId}</h2>
            </div>
            <hr />

            <EditService
              handleCancel={() => setPage(undefined)}
              handleSubmit={handleEditService}
              sceneName={props.sceneName}
              serviceId={props.serviceId}
              serviceIds={serviceIds}
              submitText='Update'
            />
          </Box>
        );

      case 'assets':
        return (
          <Box className='w-[450px] h-screen flex flex-col' role='presentation'>
            <div className='flex items-center px-6 py-4'>
              <button
                className='mr-2 -ml-2'
                onClick={() => setPage(undefined)}
              >
                <ArrowBack fontSize='small' />
              </button>
              <h2 className='text-lg whitespace-nowrap'>{props.serviceId}</h2>
            </div>
            <hr />

            <EditServiceVolumes sceneName={props.sceneName} serviceId={props.serviceId} />
          </Box>
        );

      case undefined:
      default:
        return (
          <Box className='min-w-72' role='presentation'>
            <div className='px-6 py-4'>
              <h2 className='text-lg whitespace-nowrap'>{props.serviceId}</h2>
            </div>
            <hr />

            <List>
              <ListItem disablePadding>
                <ListItemButton onClick={() => setPage('logs')}>
                  <ListItemIcon>
                    <Search />
                  </ListItemIcon>
                  <ListItemText primary='Logs' />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={() => setPage('edit')}>
                  <ListItemIcon>
                    <Edit />
                  </ListItemIcon>
                  <ListItemText primary='Edit' />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={() => setPage('assets')}>
                  <ListItemIcon>
                    <Folder />
                  </ListItemIcon>
                  <ListItemText primary='Assets' />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        );
    }
  }, [page, props.sceneName, props.serviceId]);
}
