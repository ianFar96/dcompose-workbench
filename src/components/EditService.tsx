import { Editor } from '@monaco-editor/react';
import { Button, TextField } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { message } from '@tauri-apps/api/dialog';
import type { editor } from 'monaco-editor';
import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import YAML from 'yaml';

import type { ServiceYaml } from '../types/service';

type EditServiceProps = {
  serviceId?: string
  sceneName: string
  serviceIds: string[]
  handleSubmit: (serviceId: string, code: string) => void
  handleCancel: () => void
  submitText: string
}

export default function EditService(props: EditServiceProps) {
  const [serviceYamlString, setServiceYamlString] = useState<string>();
  const [validationText, setValidationText] = useState<string | undefined>();

  useEffect(() => {
    if (props.serviceId) {
      invoke<ServiceYaml>('get_service', { sceneName: props.sceneName, serviceId: props.serviceId })
        .then(service => {
          setServiceYamlString(YAML.stringify(service));
        })
        .catch(error => message(error as string, { title: 'Error', type: 'error' }));
    }
  }, [props.sceneName, props.serviceId]);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const onMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const serviceId = event.target.value;
    const isServiceIdTaken = props.serviceIds.some(service => service === serviceId && service !== props.serviceId);
    if (isServiceIdTaken) {
      setValidationText('A service with that Id already exists');
      return;
    }

    const isServiceNameValid = /^[a-zA-Z0-9-_]+$/.test(serviceId);
    if (!isServiceNameValid) {
      setValidationText('Use only alphanumeric characters, - and _');
      return;
    }

    setValidationText(undefined);
  }, [props.serviceId, props.serviceIds]);

  const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries(formData.entries());
    const { serviceId } = formJson;
    if (!serviceId) { return; }

    if (!validationText) {
      props.handleSubmit(serviceId as string, editorRef.current?.getValue() ?? '{}');
    }
  }, [props, validationText]);

  const defaultServiceTemplate = useMemo(() => YAML.stringify({
    image: 'mongo',
    labels: {
      serviceType: 'DB',
    },
    ports: ['27017:27017'],
  }), []);

  return (
    <form className='w-[50vw] h-full flex flex-col' onSubmit={onSubmit}>
      <div className='px-4 py-3'>
        <TextField
          autoFocus
          defaultValue={props.serviceId}
          error={!!validationText}
          fullWidth
          helperText={validationText ?? 'Use only alphanumeric characters, - and _'}
          name='serviceId'
          onChange={onChange}
          placeholder='Service Id'
          size='small'
          type='text'
          variant='outlined'
        />
      </div>

      {(!props.serviceId || serviceYamlString)
        ? <Editor
          className='h-full'
          defaultLanguage='yaml'
          defaultValue={serviceYamlString ?? defaultServiceTemplate}
          onMount={onMount}
          options={{ padding: { top: 15 }, scrollBeyondLastLine: false }}
          theme='vs-dark'
        /> : undefined}


      <div className='flex justify-end px-4 py-2'>
        <Button className='mr-4' onClick={props.handleCancel}>Cancel</Button>
        <Button type='submit' variant='contained'>{props.submitText}</Button>
      </div>
    </form>
  );
}
