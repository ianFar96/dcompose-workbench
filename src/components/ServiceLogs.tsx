import { useDebouncedState } from '@mantine/hooks';
import { invoke } from '@tauri-apps/api';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { listen } from '@tauri-apps/api/event';
import React, { useCallback, useEffect, useState } from 'react';

type ServiceLogsProps = {
  serviceId: string
  sceneName: string
}

type LogEventPayload = {
  text: string
  type: 'stdout' | 'stderr'
  timestamp: string
  clear: boolean
}

type Log = {
  text: string
  type: 'stdout' | 'stderr'
  timestamp: string
}

export default function ServiceLogs(props: ServiceLogsProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [debouncedLogs, setDeboucesLogs] = useDebouncedState<Log[]>([], 500);

  useEffect(() => {
    const eventName = `${props.sceneName}-${props.serviceId}-log-event`;
    const unlistenPromise = listen<LogEventPayload>(eventName, event => {
      setLogs(logs => [
        ...(!event.payload.clear ? logs : []),
        event.payload,
      ]);
    });

    invoke('start_emitting_service_logs', { sceneName: props.sceneName, serviceId: props.serviceId }).catch(error => {
      // TODO: un bell'alert
      console.error(error);
    });

    let unlisten: UnlistenFn | undefined;
    unlistenPromise.then(unlistenFn => { unlisten = unlistenFn; })
      .catch(error => {
        // TODO: un bell'alert
        console.error(error);
      });
    return () => {
      invoke('stop_emitting_service_logs', { sceneName: props.sceneName, serviceId: props.serviceId }).catch(error => {
        // TODO: un bell'alert
        console.error(error);
      });

      unlisten?.();
    };
  }, [props.sceneName, props.serviceId, setLogs]);

  useEffect(() => {
    setDeboucesLogs(logs);
  }, [logs, setDeboucesLogs]);

  const tryJsonDisplay = useCallback((text: string) => {
    try {
      return JSON.stringify(JSON.parse(text), null, 4);
    } catch (error) {
      return text;
    }
  }, []);

  return (
    <div className='bg-black overflow-auto h-full w-full py-4'>
      {debouncedLogs.map((log, index) => (
        <span
          className={`${log.type === 'stderr' ? 'text-red-600' : 'text-white'} whitespace-pre-wrap text-sm px-4 block`}
          key={index}
          title={log.timestamp}>
          {tryJsonDisplay(log.text)}
        </span>
      ))}
    </div>
  );
}
