// Network Utility - Connection & Request Helpers
import NetInfo from '@react-native-community/netinfo';
import { store } from '../stores';
import { setNetworkStatus } from '../stores/slices/uiSlice';
import { storage } from './storage';

let isMonitoring = false;
let unsubscribeNetInfo: (() => void) | null = null;

export const startNetworkMonitoring = () => {
  if (isMonitoring) return;
  
  isMonitoring = true;
  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    const status = state.isConnected ? 'online' : state.isConnected === false ? 'offline' : 'unknown';
    store.dispatch(setNetworkStatus(status));
  });

  // Get initial state
  NetInfo.fetch().then((state) => {
    const status = state.isConnected ? 'online' : state.isConnected === false ? 'offline' : 'unknown';
    store.dispatch(setNetworkStatus(status));
  });
};

export const stopNetworkMonitoring = () => {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
    isMonitoring = false;
  }
};

export const isOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
};

export const getNetworkType = async (): Promise<string> => {
  const state = await NetInfo.fetch();
  return state.type || 'unknown';
};

export const isWifi = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.type === 'wifi';
};

export const isCellular = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.type === 'cellular';
};

export const getNetworkDetails = async () => {
  const state = await NetInfo.fetch();
  return {
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
    isExpensive: state.isExpensive,
    details: state.details,
  };
};

// Request queue for offline support
interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retries: number;
}

const OFFLINE_QUEUE_KEY = '@kiki/offline/queue';

export const addToOfflineQueue = async (request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>) => {
  const queue = await getOfflineQueue();
  const newRequest: QueuedRequest = {
    ...request,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retries: 0,
  };
  
  queue.push(newRequest);
  await saveOfflineQueue(queue);
};

export const getOfflineQueue = async (): Promise<QueuedRequest[]> => {
  try {
    const queueJson = await storage.asyncGet(OFFLINE_QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch {
    return [];
  }
};

export const saveOfflineQueue = async (queue: QueuedRequest[]): Promise<void> => {
  await storage.asyncSet(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const removeFromOfflineQueue = async (id: string): Promise<void> => {
  const queue = await getOfflineQueue();
  const filtered = queue.filter((r) => r.id !== id);
  await saveOfflineQueue(filtered);
};

export const clearOfflineQueue = async (): Promise<void> => {
  await storage.asyncDelete(OFFLINE_QUEUE_KEY);
};

export const processOfflineQueue = async (processRequest: (req: QueuedRequest) => Promise<boolean>): Promise<number> => {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return 0;

  let processed = 0;
  const remaining: QueuedRequest[] = [];

  for (const request of queue) {
    try {
      const success = await processRequest(request);
      if (success) {
        processed++;
      } else {
        if (request.retries < 3) {
          remaining.push({ ...request, retries: request.retries + 1 });
        }
      }
    } catch (error) {
      if (request.retries < 3) {
        remaining.push({ ...request, retries: request.retries + 1 });
      }
    }
  }

  await saveOfflineQueue(remaining);
  return processed;
};

export const getOfflineQueueSize = async (): Promise<number> => {
  const queue = await getOfflineQueue();
  return queue.length;
};

export const hasPendingOfflineRequests = async (): Promise<boolean> => {
  const queue = await getOfflineQueue();
  return queue.length > 0;
};

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

export const deduplicateRequest = async <T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
};

export const cancelPendingRequest = (key: string): boolean => {
  return pendingRequests.delete(key);
};

export const clearPendingRequests = (): void => {
  pendingRequests.clear();
};