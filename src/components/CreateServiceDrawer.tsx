import { Drawer } from '@mui/material';
import React from 'react';

import EditService from './EditService';

type CreateServiceDrawerProps = {
  handleSubmit: (serviceId: string, code: string) => void
  handleClose: () => void
  sceneName: string
  serviceIds: string[]
  open: boolean
}

export default function CreateServiceDrawer(props: CreateServiceDrawerProps) {
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
        handleSubmit={props.handleSubmit}
        sceneName={props.sceneName}
        serviceIds={props.serviceIds}
        submitText='Create'
      />
    </Drawer>
  );
}
