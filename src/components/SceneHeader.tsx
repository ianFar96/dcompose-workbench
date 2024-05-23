import { ArrowBack, MoreVert, PlayArrow, Refresh, Stop } from '@mui/icons-material';
import { Button } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CreateServiceDrawer from '../components/CreateServiceDrawer';
import SceneMenu from '../components/SceneMenu';

import ImportSceneDialog from './ImportSceneDialog';

type SceneHeaderProps = {
  sceneName: string
  reloadScene: () => void
  serviceIds: string[]
}

export default function SceneHeader(props: SceneHeaderProps) {
  const navigate = useNavigate();

  const [unlistenRunScene, setUnlistenRunScene] = useState<UnlistenFn | undefined>();
  const [isRunningScene, setIsRunningScene] = useState(false);
  const startAll = useCallback(() => {
    setIsRunningScene(true);

    listen(`${props.sceneName}-run-scene-output-event`, event => {
      console.log({ event });
    })
      .then(unlisten => {
        setUnlistenRunScene(() => unlisten);

        invoke('run_scene', { sceneName: props.sceneName })
          .catch(error => message(error as string, { title: 'Error', type: 'error' }))
          .finally(() => {
            setIsRunningScene(false);
            unlisten();
          });
      })
      .catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [props.sceneName]);

  useEffect(() => {
    return () => unlistenRunScene?.();
  }, [unlistenRunScene]);

  const [isStoppingScene, setIsStoppingScene] = useState(false);
  const stopAll = useCallback(() => {
    setIsStoppingScene(true);
    invoke('stop_scene', { sceneName: props.sceneName })
      .catch(error => message(error as string, { title: 'Error', type: 'error' }))
      .finally(() => {
        setIsStoppingScene(false);
      });
  }, [props.sceneName]);

  const openVsCode = useCallback(() => {
    invoke('open_vscode', { sceneName: props.sceneName })
      .catch(error => message(error as string, { title: 'Error', type: 'error' }));
  }, [props.sceneName]);

  const [isMenuShown, setIsMenuShown] = useState(false);
  const triggerMenuRef = useRef(null);

  const [isCreateServiceDrawerOpen, setIsCreateDrawerDialogOpen] = useState(false);
  const onAfterCreateService = useCallback(() => {
    setIsCreateDrawerDialogOpen(false);
    props.reloadScene();
  }, [props]);

  const [isImportSceneDialogOpen, setIsImportSceneDialogOpen] = useState(false);
  const onAfterImportScene = useCallback(() => {
    setIsImportSceneDialogOpen(false);
    props.reloadScene();
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
            importScene: () => setIsImportSceneDialogOpen(true),
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
        onAfterCreateService={onAfterCreateService}
        open={isCreateServiceDrawerOpen}
        sceneName={props.sceneName}
        serviceIds={props.serviceIds}
      />

      <ImportSceneDialog
        handleClose={() => setIsImportSceneDialogOpen(false)}
        onAfterImportScene={onAfterImportScene}
        open={isImportSceneDialogOpen}
        sceneName={props.sceneName} />
    </>
  );
}
