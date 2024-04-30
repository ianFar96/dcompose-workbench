import { ArrowBack, Edit, Search } from '@mui/icons-material';
import { Box, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import React, { useMemo, useState } from 'react';

import ServiceLogs from './ServiceLogs';

type Pages = undefined | 'logs' | 'edit'

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
            <Button
              className='w-6 h-6 min-w-[unset] p-0 outline-none border-none mr-2'
              color='inherit'
              onClick={() => setPage(undefined)}
              title='Go back'
              variant='outlined'
            >
              <ArrowBack fontSize='small' />
            </Button>
            <h2 className='text-lg whitespace-nowrap'>{props.serviceId}</h2>
          </div>
          <hr />

          <ServiceLogs sceneName={props.sceneName} serviceId={props.serviceId} />
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
            {/* <ListItem disablePadding>
              <ListItemButton onClick={() => setPage('edit')}>
                <ListItemIcon>
                  <Edit />
                </ListItemIcon>
                <ListItemText primary='Edit' />
              </ListItemButton>
            </ListItem> */}
          </List>
        </Box>
      );
    }
  }, [page, props.sceneName, props.serviceId]);
}
