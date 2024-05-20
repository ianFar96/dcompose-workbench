import { ArrowBack, OpenInNew, Search } from '@mui/icons-material';
import { Box, Button, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NodeProps } from 'reactflow';

import type { CustomNodeData } from './CustomNode';
import ServiceLogs from './ServiceLogs';

type Pages = undefined | 'logs' | 'edit' | 'assets'

type ExternalNodeDrawerProps = {
  open: boolean
  onClose: () => void
  onDetachScene: (sceneName: string, externalSceneName: string) => void
}

export default function ExternalNodeDrawer(props: NodeProps<CustomNodeData> & ExternalNodeDrawerProps) {
  const [page, setPage] = useState<Pages>();

  const navigate = useNavigate();

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
            <h2 className='text-lg whitespace-nowrap'>{props.data.serviceId}</h2>
          </div>
          <hr />

          <ServiceLogs sceneName={props.data.sceneName} serviceId={props.data.serviceId} />
        </Box>
      );
    case undefined:
    default:
      return (
        <Box className='min-w-72 flex flex-col h-full' role='presentation'>
          <div className='px-6 py-4'>
            <h2 className='text-lg whitespace-nowrap'>{props.data.serviceId}</h2>
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
              <ListItemButton onClick={() => navigate(`/scenes/${props.data.serviceSceneName}`)}>
                <ListItemIcon>
                  <OpenInNew />
                </ListItemIcon>
                <ListItemText primary='Go to scene' />
              </ListItemButton>
            </ListItem>
          </List>

          <hr />
          <div className='flex justify-end px-4 py-3'>
            <Button
              color='error'
              onClick={() => props.onDetachScene(props.data.sceneName, props.data.serviceSceneName)}
              variant='contained'
            >
              Detach scene
            </Button>
          </div>
        </Box>
      );
    }
  }, [navigate, page, props]);

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
