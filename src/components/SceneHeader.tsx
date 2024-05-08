import { ArrowBack, MoreVert, PlayArrow, Refresh, Stop } from '@mui/icons-material';
import { Button } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CreateServiceDrawer from '../components/CreateServiceDrawer';
import SceneMenu from '../components/SceneMenu';

type SceneHeaderProps = {
  sceneName: string
  reloadScene: () => void
  serviceIds: string[]
}

export default function SceneHeader(props: SceneHeaderProps) {
  const navigate = useNavigate();

  const [isRunningScene, setIsRunningScene] = useState(false);
  const startAll = useCallback(() => {
    setIsRunningScene(true);
    invoke('run_scene', { sceneName: props.sceneName })
      .catch(error => alert(error))
      .finally(() => {
        setIsRunningScene(false);
      });
  }, [props.sceneName]);

  const [isStoppingScene, setIsStoppingScene] = useState(false);
  const stopAll = useCallback(() => {
    setIsStoppingScene(true);
    invoke('stop_scene', { sceneName: props.sceneName })
      .catch(error => alert(error))
      .finally(() => {
        setIsStoppingScene(false);
      });
  }, [props.sceneName]);

  const openVsCode = useCallback(() => {
    invoke('open_vscode', { sceneName: props.sceneName })
      .catch(error => alert(error));
  }, [props.sceneName]);

  const [isMenuShown, setIsMenuShown] = useState(false);
  const triggerMenuRef = useRef(null);

  const [isCreateServiceDrawerOpen, setIsCreateDrawerDialogOpen] = useState(false);
  const handleCreateService = useCallback((serviceId: string, code: string) => {
    invoke('create_service', { code, sceneName: props.sceneName, serviceId }).then(() => {
      setIsCreateDrawerDialogOpen(false);
      props.reloadScene();
    }).catch(error => alert(error));
  }, [props]);

  return (
    <>
      <div className='flex justify-between px-4 py-3 shadow-lg z-10'>
        <div className='flex items-center'>
          <button className='mr-2 p-0' onClick={() => navigate('/scenes')}>
            <ArrowBack />
          </button>
          <h2 className='text-xl'>{props.sceneName}</h2>
        </div>

        <div>
          <Button
            className='w-10 h-10 min-w-[unset] p-0 mr-2'
            disabled={isRunningScene}
            onClick={startAll}
            title='Start all services'
            variant='outlined'
          >
            {isRunningScene ? <Refresh className='animate-spin' fontSize='large' /> : <PlayArrow fontSize='large' />}
          </Button>

          <Button
            className='w-10 h-10 min-w-[unset] p-0 mr-2'
            disabled={isStoppingScene}
            onClick={stopAll}
            title='Stop all services'
            variant='outlined'
          >
            {isStoppingScene ? <Refresh className='animate-spin' fontSize='large' /> : <Stop fontSize='large' />}
          </Button>

          <button
            className='w-4 h-10 min-w-[unset] p-0'
            color='inherit'
            onClick={() => setIsMenuShown(!isMenuShown)}
            ref={triggerMenuRef}
          >
            <MoreVert />
          </button>
        </div>
      </div>

      {triggerMenuRef.current ? (
        <SceneMenu
          actions={{
            createService: () => setIsCreateDrawerDialogOpen(true),
            openVsCode,
            reloadScene: props.reloadScene,
          }}
          anchorEl={triggerMenuRef.current}
          handleClose={() => setIsMenuShown(false)}
          open={isMenuShown}
        />
      ) : undefined}

      <CreateServiceDrawer
        handleClose={() => setIsCreateDrawerDialogOpen(false)}
        handleSubmit={handleCreateService}
        open={isCreateServiceDrawerOpen}
        sceneName={props.sceneName}
        serviceIds={props.serviceIds}
      />
    </>
  );
}
