import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import type { ChangeEvent, FormEvent } from 'react';
import React, { useCallback, useState } from 'react';

import type { Scene } from '../types/scene';

type CreateSceneDialogProps = {
  open: boolean
  onAfterCreateScene: () => void
  handleClose: () => void
  scenes: Scene[]
}

export default function CreateSceneDialog(props: CreateSceneDialogProps) {
  const [validationText, setValidationText] = useState<string | undefined>();

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const sceneName = event.target.value;

    const isSceneNameTaken = props.scenes.some(scene => scene.name === sceneName);
    if (isSceneNameTaken) {
      setValidationText('A scene with that name already exists');
      return;
    }

    const isSceneNameValid = /^[a-z0-9-_]+$/.test(sceneName);
    if (!isSceneNameValid) {
      setValidationText('A scene name can only contain alfanumeric lowercase characters, - and _');
      return;
    }

    setValidationText(undefined);
  }, [props.scenes]);

  return (
    <Dialog
      PaperProps={{
        component: 'form',
        onSubmit: (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const formJson = Object.fromEntries(formData.entries());
          const { sceneName } = formJson;

          if (validationText === undefined) {
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
          error={validationText !== undefined}
          fullWidth
          helperText={validationText}
          label='Scene name'
          name='sceneName'
          onChange={onChange}
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
