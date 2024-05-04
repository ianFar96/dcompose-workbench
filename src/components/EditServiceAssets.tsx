/* eslint-disable no-empty-function */

import { DriveFolderUpload, Refresh, Upload, UploadFile } from '@mui/icons-material';
import { Button, InputAdornment, TextField } from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { invoke, path } from '@tauri-apps/api';
import { open } from '@tauri-apps/api/dialog';
import { appDataDir } from '@tauri-apps/api/path';
import type { FormEvent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';

import type { ServiceAssets } from '../types/service';

type AssetsListProps = {
  assets: ServiceAssets
  openVsCode: (filepath?: string) => void
  basePath: string
}

function AssetsList(props: AssetsListProps) {
  return Object.entries(props.assets)
    .sort(([aName, aValue], [bName, bValue]) => {
      if (aValue === null) { return 1; }
      if (bValue === null) { return -1; }
      return aName > bName ? 1 : -1;
    })
    .map(([entryName, children]) => {
      const filePath = `${props.basePath}/${entryName}`;

      if (children) {
        return (
          <TreeItem
            itemId={filePath}
            key={filePath}
            label={entryName}
          >
            <AssetsList
              assets={children}
              basePath={filePath}
              openVsCode={props.openVsCode}
            />
          </TreeItem>
        );
      }

      return <TreeItem
        className='select-none'
        itemId={filePath}
        key={filePath}
        label={entryName}
        onDoubleClick={() => props.openVsCode(filePath)}
      />;
    });
}

type EditServiceAssetsProps = {
  sceneName: string
  serviceId: string
}

export default function EditServiceAssets(props: EditServiceAssetsProps) {
  const [assets, setAssets] = useState<ServiceAssets>({});
  const loadAssets = useCallback(() => {
    invoke<ServiceAssets>('get_service_assets', { sceneName: props.sceneName, serviceId: props.serviceId })
      .then(assets => {
        setAssets(assets);
      })
      .catch(error => {
      // TODO: un bell'alert
        console.error(error);
      });
  }, [props.sceneName, props.serviceId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const openVsCode = useCallback((filepath?: string) => {
    invoke('open_vscode', { filepath, sceneName: props.sceneName, serviceId: props.serviceId })
      .catch(error => {
        // TODO: un bell'alert
        console.error(error);
      });
  }, [props.sceneName, props.serviceId]);

  const [selectedEntry, setSelectedEntry] = useState<string|null>(null);
  const [doesEntryExist, setDoesEntryExist] = useState(false);
  const [targetPath, setTargetPath] = useState('');

  const onClickFile = useCallback(() => {
    appDataDir().then(appDir => {
      open({
        defaultPath: appDir,
      }).then(selected => {
        if (selected) {
          setSelectedEntry(selected as string);
          setDoesEntryExist(false);
          path.basename(selected as string).then(basename => {
            setTargetPath(basename);
          }).catch(error => {
            // TODO: un bell'alert
            console.error(error);
          });
        }
      }).catch(error => {
        // TODO: un bell'alert
        console.error(error);
      });
    }).catch(error => {
      // TODO: un bell'alert
      console.error(error);
    });
  }, []);

  const onClickFolder = useCallback(() => {
    appDataDir().then(appDir => {
      open({
        defaultPath: appDir,
        directory: true,
      }).then(selected => {
        if (selected) {
          setSelectedEntry(selected as string);
          setDoesEntryExist(false);
          path.basename(selected as string).then(basename => {
            setTargetPath(basename);
          }).catch(error => {
            // TODO: un bell'alert
            console.error(error);
          });
        }
      }).catch(_ => {});
    }).catch(_ => {});
  }, []);

  const [isCopying, setIsCopying] = useState(false);
  const onCopyEntry = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsCopying(true);
    invoke('copy_target_entry', {
      sceneName: props.sceneName,
      serviceId: props.serviceId,
      source: selectedEntry,
      target: targetPath,
    })
      .then(() => {
        setIsCopying(false);
        setDoesEntryExist(false);
        setSelectedEntry(null);
        setTargetPath('');
        loadAssets();
      })
      .catch(error => {
        setIsCopying(false);
        if (error === 'entry_already_exists') {
          setDoesEntryExist(true);
        } else {
          // TODO: un bell'allert
          console.error(error);
        }
      });
  }, [loadAssets, props.sceneName, props.serviceId, selectedEntry, targetPath]);

  return (
    <>
      <div className='px-4 py-3 overflow-auto h-full w-full'>
        <div className='flex mb-4'>
          <p className='text-sm pr-4'>
          In this section you can see and upload the files and folders
          you need for the service, like and .env file or as volumes.
          To use it you just need to prefix the volume with the name of your service.
            <br/>
          Ex. <code>{`./${props.serviceId}/config:path/to/config`}</code>
          </p>
          <Button
            className='w-10 h-10 min-w-[unset] p-2 shrink-0'
            onClick={() => openVsCode()}
            title='Open in VS Code'
          >
            <img alt='' src='/vscode.svg' />
          </Button>
        </div>

        <SimpleTreeView className='mb-4' disableSelection={true}>
          <AssetsList assets={assets} basePath='./' openVsCode={openVsCode} />
        </SimpleTreeView>

        <div className='flex justify-center my-4'>
          <hr className='w-[80%]' />
        </div>

        <div className='flex w-full justify-around mb-4'>
          <Button onClick={onClickFile} variant='outlined'>
            <UploadFile className='mr-1' />
            <span>Choose File</span>
          </Button>
          <Button onClick={onClickFolder} variant='outlined'>
            <DriveFolderUpload className='mr-1' />
            <span>Choose Folder</span>
          </Button>
        </div>

        {selectedEntry ? (
          <form onSubmit={onCopyEntry}>
            <div className='mb-4'>
              <label className='block mb-1'>Source</label>
              <span className='text-sm'>{selectedEntry}</span>
            </div>

            <div className='mb-4'>
              <label className={`block mb-1 ${doesEntryExist ? 'text-error' : ''}`}>Target</label>
              <TextField
                InputProps={{
                  startAdornment: <InputAdornment position='start'>
                    <span className='text-xs'>{`./${props.serviceId}/`}</span>
                  </InputAdornment>,
                }}
                className='w-full text-sm'
                error={doesEntryExist}
                helperText={`${doesEntryExist ? 'File/Folder already exists' : ''}`}
                onChange={event => setTargetPath(event.target.value)}
                size='small'
                value={targetPath}
                variant='outlined'
              />
            </div>

            <div className='flex justify-end'>
              {isCopying
                ? <>
                  <Button disabled variant='outlined'>
                    <Refresh className='animate-spin mr-1' />
                    <span>Copying...</span>
                  </Button>
                </>
                : <>
                  <Button type='submit' variant='outlined'>
                    <Upload />
                    <span>Copy</span>
                  </Button>
                </>
              }
            </div>
          </form>
        ) : undefined}
      </div>
    </>
  );
}
