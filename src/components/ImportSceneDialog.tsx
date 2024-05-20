import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import React from 'react';

import type { Scene } from '../types/scene';

type ImportSceneDialogProps = {
  open: boolean
  onAfterImportScene: () => void
  handleClose: () => void
  sceneName: string
  scenes: Scene[]
}

export default function ImportSceneDialog(props: ImportSceneDialogProps) {
  return (
    <Dialog
      PaperProps={{
        component: 'form',
        onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const formJson = Object.fromEntries(formData.entries());
          const { sceneName } = formJson;
          if (!sceneName) { return; }

          invoke('import_scene', { sceneName: props.sceneName, sceneNameToImport: sceneName })
            .then(() => props.onAfterImportScene())
            .catch(error => message(error as string, { title: 'Error', type: 'error' }));
        },
      }}
      onClose={() => props.handleClose()}
      open={props.open}
    >
      <DialogTitle>Import scene</DialogTitle>
      <DialogContent>
        <DialogContentText className='mb-4'>
          Importing a scene adds a scene's docker-compose.yml file path
          to the <code>include</code> config of the current scene's file
        </DialogContentText>
        <FormControl fullWidth>
          <InputLabel id='select-scene-label'>
            Scene
          </InputLabel>
          <Select
            label='Scene'
            labelId='select-scene-label'
            name='sceneName'
          >
            {props.scenes.filter(scene => scene.name !== props.sceneName).map(({ name: sceneName }) => (
              <MenuItem key={sceneName} value={sceneName}>{sceneName}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.handleClose}>Cancel</Button>
        <Button type='submit' variant='contained'>Import</Button>
      </DialogActions>
    </Dialog>
  );
}
