
import { Button } from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { invoke } from '@tauri-apps/api';
import React, { useCallback, useEffect, useState } from 'react';

import type { ServiceAssets } from '../types/service';

type AssetsListProps = {
  assets: ServiceAssets
  openVsCode: (filepath?: string) => void
  basePath: string
}

function AssetsList(props: AssetsListProps) {
  return Object.entries(props.assets).map(([entryName, children]) => {
    const filePath = `${props.basePath}/${entryName}`;

    if (!children) {
      return <TreeItem
        className='select-none'
        itemId={filePath}
        key={filePath}
        label={entryName}
        onDoubleClick={() => props.openVsCode(filePath)}
      />;
    }

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
  });
}

type EditServiceAssetsProps = {
  sceneName: string
  serviceId: string
}

export default function EditServiceAssets(props: EditServiceAssetsProps) {
  const [assets, setAssets] = useState<ServiceAssets>({});
  useEffect(() => {
    invoke<ServiceAssets>('get_service_assets', { sceneName: props.sceneName, serviceId: props.serviceId })
      .then(assets => {
        setAssets(assets);
      })
      .catch(error => {
      // TODO: un bell'alert
        console.error(error);
      });
  }, [props.sceneName, props.serviceId]);

  const openVsCode = useCallback((filepath?: string) => {
    invoke('open_vscode', { filepath, sceneName: props.sceneName, serviceId: props.serviceId })
      .catch(error => {
        // TODO: un bell'alert
        console.error(error);
      });
  }, [props.sceneName, props.serviceId]);

  return (
    <>
      <div className='relative px-4 py-3'>
        <div className='flex mb-4'>
          <p className='text-sm pr-4'>
          In this section you can see and upload the files and folders
          you need for the service, like and .env file or as volumes.
          To use it you just need to prefix the volume with the name of your service.
            <br/>
          Ex. <code>{'./<service-name>/config:path/to/config'}</code>
          </p>
          <Button
            className='w-10 h-10 min-w-[unset] p-2 shrink-0'
            onClick={() => openVsCode()}
            title='Open in VS Code'
          >
            <img alt='' src='/vscode.svg' />
          </Button>
        </div>

        <SimpleTreeView disableSelection={true}>
          <AssetsList assets={assets} basePath='./' openVsCode={openVsCode} />
        </SimpleTreeView>
      </div>
    </>
  );
}
