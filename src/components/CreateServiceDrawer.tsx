import { Drawer } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import React, { useCallback } from 'react';

import EditService from './EditService';

type CreateServiceDrawerProps = {
  onAfterCreateService: () => void
  handleClose: () => void
  sceneName: string
  serviceIds: string[]
  open: boolean
}

export default function CreateServiceDrawer(props: CreateServiceDrawerProps) {
  const handleCreateService = useCallback((serviceId: string, code: string) => {
    invoke('create_service', { code, sceneName: props.sceneName, serviceId }).then(() => {
      props.onAfterCreateService();
    }).catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [props]);

  return (
    <Drawer
      anchor='right'
      onClose={props.handleClose}
      open={props.open}
    >
      <div className='px-4 py-4'>
        <h2 className='text-lg whitespace-nowrap'>
          Create service
        </h2>
      </div>
      <hr />

      <EditService
        handleCancel={props.handleClose}
        handleSubmit={handleCreateService}
        sceneName={props.sceneName}
        serviceIds={props.serviceIds}
        submitText='Create'
      />
    </Drawer>
  );
}
