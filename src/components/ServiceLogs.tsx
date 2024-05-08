import { useDebouncedState } from '@mantine/hooks';
import { invoke } from '@tauri-apps/api';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import useTauriEvent from '../hooks/useTauriEvent';

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

  const eventName = useMemo(() => `${props.sceneName}-${props.serviceId}-log-event`, [props.sceneName, props.serviceId]);
  useTauriEvent<LogEventPayload>(eventName, payload => {
    setLogs(logs => [
      ...(!payload.clear ? logs : []),
      payload,
    ]);
  });

  useEffect(() => {
    invoke('start_emitting_service_logs', { sceneName: props.sceneName, serviceId: props.serviceId })
      .catch(error => alert(error));

    return () => {
      invoke('stop_emitting_service_logs', { sceneName: props.sceneName, serviceId: props.serviceId })
        .catch(error => alert(error));
    };
  }, [props.sceneName, props.serviceId]);

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
    <div className='bg-[#1e1e1e] overflow-auto h-full w-full py-4'>
      {debouncedLogs.map((log, index) => (
        <span
          className={`${log.type === 'stderr' ? 'text-error' : 'text-white'} whitespace-pre-wrap text-sm px-4 block [overflow-anchor:none]`}
          key={index}
          title={log.timestamp}>
          {tryJsonDisplay(log.text)}
        </span>
      ))}
      <div className='[overflow-anchor:auto] h-px'></div>
    </div>
  );
}
