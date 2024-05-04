/* eslint-disable no-empty-function */
import { ArrowForward, Delete } from '@mui/icons-material';
import { Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { useConfirm } from 'material-ui-confirm';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CreateScene from '../components/CreateScene';
import type { Scene } from '../types/scene';

export default function Scenes() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const navigate = useNavigate();

  const loadScenes = useCallback(() => {
    invoke<Scene[]>('get_scenes').then(scenes => {
      setScenes(scenes);
    }).catch(error => {
      // TODO: un bell'allert
      console.error(error);
    });
  }, []);

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  const confirm = useConfirm();

  const confirmDelete = useCallback((sceneName: string) => {
    confirm({
      cancellationButtonProps: { variant: 'text' },
      confirmationButtonProps: { color: 'error', variant: 'contained' },
      confirmationText: 'Delete',
      description: 'This scene will be deleted and all configurations will be lost. Are you sure you want to proceed?',
      title: 'Delete Scene',
    }).then(() => {
      invoke('delete_scene', { sceneName }).then(() => {
        loadScenes();
      }).catch(error => {
        // TODO:: un bell'allert
        console.error(error);
      });
    }).catch(() => {});
  }, [confirm, loadScenes]);

  const [isCreateSceneDialogOpen, setIsCreateSceneDialogOpen] = useState(false);
  const handleCreateScene = useCallback((sceneName: string) => {
    invoke('create_scene', { sceneName }).then(() => {
      setIsCreateSceneDialogOpen(false);
      loadScenes();
    }).catch(error => {
      // TODO: un bell'allert
      console.error(error);
    });
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
                      <button className='p-0 mr-1 text-error' onClick={() => confirmDelete(scene.name)}>
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

      <CreateScene
        handleClose={() => setIsCreateSceneDialogOpen(false)}
        handleSubmit={handleCreateScene}
        open={isCreateSceneDialogOpen}
        scenes={scenes}
      />
    </>
  );
}
