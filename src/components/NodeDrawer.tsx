import { ArrowBack, Edit, Folder, Search } from '@mui/icons-material';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import React, { useMemo, useState } from 'react';

import EditService from './EditService';
import EditServiceVolumes from './EditServiceAssets';
import ServiceLogs from './ServiceLogs';

type Pages = undefined | 'logs' | 'edit' | 'assets'

type NodeDrawerProps = {
  serviceId: string
  sceneName: string
}

export default function NodeDrawer(props: NodeDrawerProps) {
  const [page, setPage] = useState<Pages>();

  return useMemo(() => {
    switch (page) {
    case 'logs':
      return (
        <Box className='max-w-[75vw] min-w-72 h-screen flex flex-col' role='presentation'>
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
        <Box className='w-[75vw] h-screen flex flex-col' role='presentation'>
          <div className='flex justify-between items-center px-6 py-4'>
            <div className='flex items-center'>
              <button
                className='mr-2 -ml-2'
                onClick={() => setPage(undefined)}
              >
                <ArrowBack fontSize='small' />
              </button>
              <h2 className='text-lg whitespace-nowrap'>{props.serviceId}</h2>
            </div>
            <span className='text-sm text-gray-500'><b>ctrl+s</b> to save</span>
          </div>
          <hr />

          <EditService sceneName={props.sceneName} serviceId={props.serviceId}/>
        </Box>
      );

    case 'assets':
      return (
        <Box className='max-w-[450px] h-screen flex flex-col' role='presentation'>
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

          <EditServiceVolumes sceneName={props.sceneName} serviceId={props.serviceId}/>
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
