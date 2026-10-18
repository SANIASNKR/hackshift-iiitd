import { useState, useEffect, useCallback } from 'react';

export interface QueuedTelemetryAction {
  id: string;
  type: 'VITALS_UPDATE' | 'VOICE_TRANSCRIPT' | 'TRIAGE_CHANGE' | 'ROUTE_CHECKPOINT';
  payload: Record<string, unknown>;
  timestamp: string;
  caseId?: string;
  retryCount: number;
}

const STORAGE_KEY = 'ayustream_offline_queue_v1';

export function useOfflineSync(onSyncItem?: (action: QueuedTelemetryAction) => Promise<boolean>) {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queue, setQueue] = useState<QueuedTelemetryAction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to persist offline queue to localStorage', err);
    }
  }, [queue]);

  const queueAction = useCallback((action: Omit<QueuedTelemetryAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const newItem: QueuedTelemetryAction = {
      ...action,
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    setQueue((prev) => [...prev, newItem]);
    return newItem.id;
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline || queue.length === 0 || isSyncing) return;
    setIsSyncing(true);

    const remaining: QueuedTelemetryAction[] = [];

    for (const item of queue) {
      try {
        if (onSyncItem) {
          const success = await onSyncItem(item);
          if (!success) {
            remaining.push({ ...item, retryCount: item.retryCount + 1 });
          }
        } else {
          // Default: simulate network sync success
          await new Promise((res) => setTimeout(res, 200));
        }
      } catch {
        remaining.push({ ...item, retryCount: item.retryCount + 1 });
      }
    }

    setQueue(remaining);
    setLastSyncedAt(new Date());
    setIsSyncing(false);
  }, [isOnline, queue, isSyncing, onSyncItem]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    isOnline,
    queue,
    queuedCount: queue.length,
    isSyncing,
    lastSyncedAt,
    queueAction,
    syncNow,
    clearQueue,
  };
}
