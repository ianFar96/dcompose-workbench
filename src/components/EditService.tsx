import { Editor } from '@monaco-editor/react';
import { Alert, Snackbar } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { KeyCode, KeyMod, type editor } from 'monaco-editor';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import YAML from 'yaml';

import type { ServiceYaml } from '../types/service';

type EditServiceProps = {
  serviceId: string
  sceneName: string
}

// TODO: try adding validation with https://raw.githubusercontent.com/compose-spec/compose-spec/master/schema/compose-spec.json
export default function EditService(props: EditServiceProps) {
  const [service, setService] = useState<ServiceYaml>();
  const serviceYamlString = useMemo(() => (service ? YAML.stringify(service) : ''), [service]);

  useEffect(() => {
    invoke<ServiceYaml>('get_service', { sceneName: props.sceneName, serviceId: props.serviceId })
      .then(service => {
        setService(service);
      })
      .catch(error => {
      // TODO: un bell'allert
        console.error(error);
      });
  }, [props.sceneName, props.serviceId]);

  const [isToastOpen, setIsToastOpen] = useState(false);

  const onMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => {
      const value = editor.getValue();

      let parsedValue;
      try {
        parsedValue = YAML.parse(value) as ServiceYaml;
      } catch (error) {
        return;
      }

      invoke<ServiceYaml>('overwrite_service_config', { config: parsedValue, sceneName: props.sceneName, serviceId: props.serviceId })
        .then(() => {
          setIsToastOpen(true);
        })
        .catch(error => {
          // TODO: un bell'allert
          console.error(error);
        });
    });
  }, [props.sceneName, props.serviceId]);

  const handleToastClose = useCallback(() => {
    setIsToastOpen(false);
  }, []);

  return (
    <>
      {serviceYamlString ? (
        <>
          <Snackbar
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            autoHideDuration={1000}
            onClose={handleToastClose}
            open={isToastOpen}
          >
            <Alert
              severity='success'
              sx={{ width: '100%' }}
              variant='filled'
            >
              Saved
            </Alert>
          </Snackbar>

          <Editor
            defaultLanguage='yaml'
            defaultValue={serviceYamlString}
            onMount={onMount}
            options={{ scrollBeyondLastLine: false }}
            theme='vs-dark'
          />
        </>
      ) : undefined}
    </>
  );
}
