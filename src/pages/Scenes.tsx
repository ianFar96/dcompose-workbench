/* eslint-disable no-empty-function */
import { ArrowForward, Delete } from '@mui/icons-material';
import { Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import { useConfirm } from 'material-ui-confirm';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CreateSceneDialog from '../components/CreateSceneDialog';
import type { Scene } from '../types/scene';

export default function Scenes() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const navigate = useNavigate();

  const loadScenes = useCallback(() => {
    invoke<Scene[]>('get_scenes').then(scenes => {
      setScenes(scenes);
    }).catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, []);

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  const confirm = useConfirm();

  const deleteScene = useCallback((sceneName: string) => {
    confirm({
      cancellationButtonProps: { variant: 'text' },
      cancellationText: 'No',
      confirmationButtonProps: { color: 'error', variant: 'contained' },
      confirmationText: 'Yes',
      description: 'This scene will be deleted and all configurations will be lost. Are you sure you want to proceed?',
      title: 'Delete scene',
    }).then(() => {
      invoke('delete_scene', { sceneName }).then(() => {
        loadScenes();
      }).catch(error => message(error as string, { title: 'Error', type: 'error' }));
    }).catch(() => {});
  }, [confirm, loadScenes]);

  const [isCreateSceneDialogOpen, setIsCreateSceneDialogOpen] = useState(false);
  const onAfterCreateScene = useCallback(() => {
    setIsCreateSceneDialogOpen(false);
    loadScenes();
  }, [loadScenes]);

  return (
    <>
      <div className='p-6 bg-gray-100 h-screen'>
        <div className='flex justify-between mb-4'>
          <h2 className='text-lg'>
            Scenes
          </h2>
          <Button onClick={() => setIsCreateSceneDialogOpen(true)} variant='outlined'>
            Create scene
          </Button>
        </div>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scenes.map((scene) => (
                <TableRow key={scene.name}>
                  <TableCell
                    className='cursor-pointer w-full'
                    onClick={() => navigate(`/scenes/${scene.name}`)}
                  >
                    {scene.name}
                  </TableCell>
                  <TableCell align='right'>
                    <div className='flex'>
                      <button className='p-0 mr-1 text-error' onClick={() => deleteScene(scene.name)}>
                        <Delete />
                      </button>
                      <button className='p-0' onClick={() => navigate(`/scenes/${scene.name}`)}>
                        <ArrowForward />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      <CreateSceneDialog
        handleClose={() => setIsCreateSceneDialogOpen(false)}
        onAfterCreateScene={onAfterCreateScene}
        open={isCreateSceneDialogOpen}
        scenes={scenes}
      />
    </>
  );
}
