import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import React, { useState } from 'react';

import type { Scene } from '../types/scene';

type CreateSceneDialogProps = {
  open: boolean
  onAfterCreateScene: () => void
  handleClose: () => void
  scenes: Scene[]
}

export default function CreateSceneDialog(props: CreateSceneDialogProps) {
  const [isSceneNameTaken, setIsSceneNameTaken] = useState(false);

  return (
    <Dialog
      PaperProps={{
        component: 'form',
        onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const formJson = Object.fromEntries(formData.entries());
          const { sceneName } = formJson;

          const isSceneNameTaken = props.scenes.some(scene => scene.name === sceneName);
          setIsSceneNameTaken(isSceneNameTaken);

          if (!isSceneNameTaken) {
            invoke('create_scene', { sceneName })
              .then(() => props.onAfterCreateScene())
              .catch(error => message(error as string, { title: 'Error', type: 'error' }));
          }
        },
      }}
      onClose={() => props.handleClose()}
      open={props.open}
    >
      <DialogTitle>Create scene</DialogTitle>
      <DialogContent>
        <DialogContentText className='mb-4'>
          Creating a scene adds a folder with the specified scene name
          and an empty docker-compose.yml file to create your services
        </DialogContentText>
        <TextField
          autoFocus
          error={isSceneNameTaken}
          fullWidth
          helperText={`${isSceneNameTaken ? 'A scene with that name already exists' : ''}`}
          label='Scene name'
          name='sceneName'
          required
          size='small'
          type='text'
          variant='outlined'
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={props.handleClose}>Cancel</Button>
        <Button type='submit' variant='contained'>Create</Button>
      </DialogActions>
    </Dialog>
  );
}
