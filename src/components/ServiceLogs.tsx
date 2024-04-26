import { invoke } from '@tauri-apps/api';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { listen } from '@tauri-apps/api/event';
import React, { useEffect, useState } from 'react';

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
  }, [props.sceneName, props.serviceId]);

  return (
    <>
      {logs.map(log => (
        <>
          <p className={log.type === 'stderr' ? 'text-red-600' : ''}>{log.text}</p>
          <p className='text-gray-600'>{log.timestamp}</p>
        </>
      ))}
    </>
  );
}
