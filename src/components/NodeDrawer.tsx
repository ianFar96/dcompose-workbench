import { ArrowBack, Search } from '@mui/icons-material';
import { Box, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import React, { useMemo, useState } from 'react';

import ServiceLogs from './ServiceLogs';

type Pages = undefined | 'logs'

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
        <Box className='max-w-[75vw] min-w-52 h-screen flex flex-col' role='presentation'>
          <div className='flex items-center px-4 py-3'>
            <Button
              className='w-6 h-6 min-w-[unset] p-0 outline-none border-none mr-2'
              color='inherit'
              onClick={() => setPage(undefined)}
              title='Go back'
              variant='outlined'
            >
              <ArrowBack fontSize='small' />
            </Button>
            <span className='text-xl'>{props.serviceId}</span>
          </div>
          <ServiceLogs sceneName={props.sceneName} serviceId={props.serviceId} />
        </Box>
      );

    case undefined:
    default:
      return (
        <Box className='min-w-52' role='presentation'>
          <div className='px-4 py-3'>
            <span className='text-xl whitespace-nowrap'>{props.serviceId}</span>
          </div>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setPage('logs')}>
                <ListItemIcon>
                  <Search />
                </ListItemIcon>
                <ListItemText primary='Logs' />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      );
    }
  }, [page, props.sceneName, props.serviceId]);
}
