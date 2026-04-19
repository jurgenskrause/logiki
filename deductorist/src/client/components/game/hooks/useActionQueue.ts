import { useRef, useCallback, useEffect } from 'react';

export function useActionQueue() {
  const queueRef = useRef<(() => Promise<void>)[]>([]);
  const isProcessingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      queueRef.current = [];
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    while (queueRef.current.length > 0 && isMountedRef.current) {
      const action = queueRef.current.shift();
      if (action) {
        try {
          await action();
        } catch (e) {
          console.error("ActionQueue execution fault:", e);
        }
      }
    }
    
    isProcessingRef.current = false;
  }, []);

  const enqueue = useCallback((action: () => Promise<void> | void) => {
    queueRef.current.push(async () => { await action(); });
    processQueue();
  }, [processQueue]);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    isProcessingRef.current = false;
  }, []);

  return { enqueue, clearQueue };
}
