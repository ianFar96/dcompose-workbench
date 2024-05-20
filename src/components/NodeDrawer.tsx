import { ArrowBack, Edit, Folder, Search } from '@mui/icons-material';
import { Box, Button, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Node, NodeProps } from 'reactflow';
import { useReactFlow } from 'reactflow';

import type { CustomNodeData } from './CustomNode';
import EditService from './EditService';
import EditServiceVolumes from './EditServiceAssets';
import ServiceLogs from './ServiceLogs';

type Pages = undefined | 'logs' | 'edit' | 'assets'

type NodeDrawerProps = {
  open: boolean
  onClose: () => void
  onDeleteService: (serviceId: string) => void
}

export default function NodeDrawer(props: NodeProps<CustomNodeData> & NodeDrawerProps) {
  const [page, setPage] = useState<Pages>();

  const { getNodes } = useReactFlow();
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  useEffect(() => {
    const nodes = getNodes() as Node<CustomNodeData>[];
    setServiceIds(nodes.map(node => node.data.serviceId));
  }, [getNodes]);

  const onEditService = useCallback((serviceId: string, code: string) => {
    invoke('update_service', {
      code,
      previousServiceId: props.data?.serviceId,
      sceneName: props.data?.sceneName,
      serviceId,
    }).then(() => {
      setPage(undefined);
      props.data?.reloadScene();
    }).catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [props]);

  const mainList = useMemo(() => {
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
            <h2 className='text-lg whitespace-nowrap'>{props.data?.serviceId}</h2>
          </div>
          <hr />

          <ServiceLogs sceneName={props.data?.sceneName} serviceId={props.data?.serviceId} />
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
            <h2 className='text-lg whitespace-nowrap'>{props.data?.serviceId}</h2>
          </div>
          <hr />

          <EditService
            handleCancel={() => setPage(undefined)}
            handleSubmit={onEditService}
            sceneName={props.data?.sceneName}
            serviceId={props.data?.serviceId}
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
            <h2 className='text-lg whitespace-nowrap'>{props.data?.serviceId}</h2>
          </div>
          <hr />

          <EditServiceVolumes sceneName={props.data?.sceneName} serviceId={props.data?.serviceId} />
        </Box>
      );

    case undefined:
    default:
      return (
        <Box className='min-w-72 flex flex-col h-full' role='presentation'>
          <div className='px-6 py-4'>
            <h2 className='text-lg whitespace-nowrap'>{props.data?.serviceId}</h2>
          </div>
          <hr />

          <List className='h-full'>
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

          <hr />
          <div className='flex justify-end px-4 py-3'>
            <Button
              color='error'
              onClick={() => props.onDeleteService(props.data?.serviceId)}
              variant='contained'
            >
              Delete
            </Button>
          </div>
        </Box>
      );
    }
  }, [onEditService, page, props, serviceIds]);

  return (
    <Drawer
      anchor='right'
      onClose={props.onClose}
      open={props.open}
    >
      {mainList}
    </Drawer>
  );
}
