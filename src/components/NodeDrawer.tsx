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
        <>
          <Button
            className='w-6 h-6 min-w-[unset] p-0 outline-none border-none'
            color='inherit'
            onClick={() => setPage(undefined)}
            title='Go back'
            variant='outlined'
          >
            <ArrowBack fontSize='small' />
          </Button>
          <ServiceLogs sceneName={props.sceneName} serviceId={props.serviceId} />
        </>
      );

    case undefined:
    default:
      return (
        <Box className='w-52' role='presentation'>
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
