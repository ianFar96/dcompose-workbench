import { Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button } from '@mui/material';
import React, { useState } from 'react';

import type { Scene } from '../types/scene';

type CreateSceneDialogProps = {
  open: boolean
  handleSubmit: (sceneName: string) => void
  handleClose: () => void
  scenes: Scene[]
}

export default function CreateScene(props: CreateSceneDialogProps) {
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
            props.handleSubmit(sceneName as string);
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
