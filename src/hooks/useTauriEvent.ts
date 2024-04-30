import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useEffect } from 'react';

export default function useTauriEvent<T>(eventName: string, callback: (payload: T) => void) {
  useEffect(() => {
    const unlistenPromise = listen<T>(eventName, event => {
      callback(event.payload);
    });

    let unlisten: UnlistenFn | undefined;
    unlistenPromise.then(unlistenFn => { unlisten = unlistenFn; })
      .catch(error => {
        // TODO: un bell'alert
        console.error(error);
      });
    return () => { unlisten?.(); };
  }, []);
}
