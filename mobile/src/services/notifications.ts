// Notification Service - Push Notification Handling
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform, Linking } from 'react-native';
import { store } from '../stores';
import { addNotification, updateNotification } from '../stores/slices/notificationsSlice';
import { Notification, NotificationType, NotificationPriority } from '../shared/types';

let isConfigured = false;

export const initPushNotifications = () => {
  if (isConfigured) return;

  PushNotification.configure({
    onRegister: (token) => {
      console.log('Push token:', token);
      store.dispatch({ type: 'notifications/registerPushToken', payload: token.token });
    },
    onNotification: (notification) => {
      handleNotification(notification);
      notification.finish(PushNotificationIOS.FetchResult.NoData);
    },
    onAction: (notification) => {
      handleNotificationAction(notification);
    },
    onRegistrationError: (err) => {
      console.error('Push notification registration error:', err);
    },
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },
    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios',
  });

  // Create notification channels for Android
  if (Platform.OS === 'android') {
    createNotificationChannels();
  }

  isConfigured = true;
};

const createNotificationChannels = () => {
  PushNotification.createChannel(
    {
      channelId: 'campaign',
      channelName: 'Campaign Alerts',
      channelDescription: 'Notifications for campaign updates and bidding',
      playSound: true,
      soundName: 'default',
      importance: 4,
      vibrate: true,
    },
    (created) => console.log('Campaign channel created:', created)
  );

  PushNotification.createChannel(
    {
      channelId: 'agent',
      channelName: 'Agent Alerts',
      channelDescription: 'Notifications for AI agent activities',
      playSound: true,
      soundName: 'default',
      importance: 4,
      vibrate: true,
    },
    (created) => console.log('Agent channel created:', created)
  );

  PushNotification.createChannel(
    {
      channelId: 'wallet',
      channelName: 'Wallet Alerts',
      channelDescription: 'Notifications for wallet and transactions',
      playSound: true,
      soundName: 'default',
      importance: 4,
      vibrate: true,
    },
    (created) => console.log('Wallet channel created:', created)
  );

  PushNotification.createChannel(
    {
      channelId: 'system',
      channelName: 'System Alerts',
      channelDescription: 'System and security notifications',
      playSound: true,
      soundName: 'default',
      importance: 5,
      vibrate: true,
    },
    (created) => console.log('System channel created:', created)
  );
};

export const requestPushPermissions = async (): Promise<boolean> => {
  const granted = await PushNotification.requestPermissions();
  return granted;
};

export const getPushToken = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    PushNotification.getToken((token) => {
      resolve(token);
    });
  });
};

const handleNotification = (notification: any) => {
  const data = notification.data || {};
  
  // Create notification object
  const newNotification: Notification = {
    id: data.id || `${Date.now()}`,
    tenantId: data.tenantId || '',
    userId: data.userId || '',
    type: data.type as NotificationType || 'info',
    title: notification.title || data.title || 'Notification',
    message: notification.message || data.message || '',
    data,
    priority: data.priority as NotificationPriority || 'normal',
    status: 'unread',
    actionRequired: data.actionRequired || false,
    actionUrl: data.actionUrl,
    createdAt: data.createdAt || new Date().toISOString(),
  };

  // Add to store
  store.dispatch(addNotification(newNotification));

  // Show local notification if app is in foreground
  if (notification.foreground) {
    showLocalNotification(newNotification);
  }
};

const handleNotificationAction = (notification: any) => {
  const data = notification.data || {};
  const action = notification.action || 'open';

  // Handle action buttons
  switch (action) {
    case 'approve':
      // Handle approve action
      break;
    case 'reject':
      // Handle reject action
      break;
    case 'view':
    default:
      // Navigate to relevant screen
      if (data.actionUrl) {
        // Navigate based on actionUrl
      }
      break;
  }

  // Update notification status
  if (data.id) {
    store.dispatch(updateNotification({
      ...data,
      status: 'clicked',
      clickedAt: new Date().toISOString(),
    }));
  }
};

// Fetch notifications (API)
export const getNotifications = async (params?: { page?: number; limit?: number }): Promise<{ items: Notification[]; total: number }> => {
  // In production, this would call an API endpoint
  return { items: [], total: 0 };
};

// Mark single notification as read
export const markAsRead = async (id: string): Promise<void> => {
  // In production, this would call an API endpoint
};

// Mark all notifications as read
export const markAllAsRead = async (): Promise<void> => {
  // In production, this would call an API endpoint
};

// Register push token
export const registerPushToken = async (token: string): Promise<void> => {
  // In production, this would call an API endpoint
};

export const showLocalNotification = (notification: Notification) => {
  const channelMap: Record<string, string> = {
    campaign: 'campaign',
    agent: 'agent',
    wallet: 'wallet',
    system: 'system',
    alert: 'system',
    info: 'system',
  };

  PushNotification.localNotification({
    channelId: channelMap[notification.type] || 'system',
    title: notification.title,
    message: notification.message,
    playSound: notification.priority === 'critical' || notification.priority === 'high',
    soundName: 'default',
    vibrate: true,
    vibrationPattern: [200, 100, 200],
    priority: notification.priority === 'critical' ? 'max' : 'high',
    importance: 'high',
    autoCancel: true,
    largeIcon: 'ic_launcher',
    smallIcon: 'ic_notification',
    color: '#10b981',
    userInfo: notification.data,
  });
};

export const showLocalNotificationWithActions = (
  notification: Notification,
  actions: Array<{ id: string; title: string; icon?: string }>
) => {
  const channelMap: Record<string, string> = {
    campaign: 'campaign',
    agent: 'agent',
    wallet: 'wallet',
    system: 'system',
    alert: 'system',
    info: 'system',
  };

  PushNotification.localNotification({
    channelId: channelMap[notification.type] || 'system',
    title: notification.title,
    message: notification.message,
    playSound: notification.priority === 'critical' || notification.priority === 'high',
    soundName: 'default',
    vibrate: true,
    vibrationPattern: [200, 100, 200],
    priority: notification.priority === 'critical' ? 'max' : 'high',
    importance: 'high',
    autoCancel: true,
    largeIcon: 'ic_launcher',
    smallIcon: 'ic_notification',
    color: '#10b981',
    userInfo: notification.data,
    actions: actions.map((a) => ({
      id: a.id,
      title: a.title,
      icon: a.icon,
    })),
  });
};

export const cancelNotification = (id: string) => {
  PushNotification.cancelLocalNotification(id);
};

export const cancelAllNotifications = () => {
  PushNotification.cancelAllLocalNotifications();
};

export const setBadgeCount = (count: number) => {
  PushNotification.setApplicationIconBadgeNumber(count);
};

export const getBadgeCount = async (): Promise<number> => {
  return new Promise((resolve) => {
    PushNotification.getApplicationIconBadgeNumber((count) => {
      resolve(count);
    });
  });
};

export const scheduleNotification = (notification: Notification, date: Date) => {
  PushNotification.localNotificationSchedule({
    channelId: 'system',
    title: notification.title,
    message: notification.message,
    date,
    playSound: true,
    soundName: 'default',
    vibrate: true,
    autoCancel: true,
    userInfo: notification.data,
  });
};

export const cancelScheduledNotification = (id: string) => {
  PushNotification.cancelLocalNotification(id);
};

export const getScheduledNotifications = async (): Promise<any[]> => {
  return new Promise((resolve) => {
    PushNotification.getScheduledLocalNotifications((notifications) => {
      resolve(notifications);
    });
  });
};