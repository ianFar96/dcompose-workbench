import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

export default function useTauriEvent<T>(eventName: string) {
  const [payload, setPayload] = useState<T | undefined>();

  useEffect(() => {
    const unlistenPromise = listen<T>(eventName, event => {
      setPayload(event.payload);
    });

    let unlisten: UnlistenFn | undefined;
    unlistenPromise.then(unlistenFn => { unlisten = unlistenFn; })
      .catch(error => {
        // TODO: un bell'alert
        console.error(error);
      });
    return () => { unlisten?.(); };
  }, []);

  return payload;
}
