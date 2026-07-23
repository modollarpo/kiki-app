// Notifications Hook - Push & In-App Notifications
import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchNotifications, 
  markNotificationRead, 
  markAllNotificationsRead,
  registerPushTokenThunk,
  updateSettings,
} from '../stores/slices/notificationsSlice';
import { RootState, AppDispatch } from '../stores';
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

export const useNotifications = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    items, 
    unreadCount, 
    isLoading, 
    error, 
    pushToken, 
    settings 
  } = useSelector((state: RootState) => state.notifications);

  const loadNotifications = useCallback(async (params: any = {}) => {
    await dispatch(fetchNotifications(params));
  }, [dispatch]);

  const markAsRead = useCallback(async (id: string) => {
    await dispatch(markNotificationRead(id));
  }, [dispatch]);

  const markAllAsRead = useCallback(async () => {
    await dispatch(markAllNotificationsRead());
  }, [dispatch]);

  const clearNotificationError = useCallback(() => {
    dispatch({ type: 'notifications/clearError' });
  }, [dispatch]);

  const updateNotificationSettings = useCallback(async (newSettings: any) => {
    await dispatch(updateSettings(newSettings));
  }, [dispatch]);

  const registerPushToken = useCallback(async (token: string) => {
    await dispatch(registerPushTokenThunk(token));
  }, [dispatch]);

  // Configure push notifications
  useEffect(() => {
    PushNotification.configure({
      onRegister: (token) => {
        dispatch(registerPushTokenThunk(token.token));
      },
      onNotification: (notification) => {
        if (notification.userInteraction) {
          // Handle notification tap
          handleNotificationTap(notification);
        }
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      },
      onAction: (notification) => {
        // Handle action buttons
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
      requestPermissions: true,
    });

    // Request permissions
    PushNotification.requestPermissions();
  }, [dispatch]);

  const handleNotificationTap = useCallback((notification: any) => {
    const data = notification.data || {};
    // Navigate based on notification type
    if (data.screen) {
      // Navigate to specific screen
    }
  }, []);

  // Load initial notifications
  useEffect(() => {
    loadNotifications({ page: 1, limit: 20 });
  }, [loadNotifications]);

  return {
    notifications: items,
    unreadCount,
    isLoading,
    error,
    pushToken,
    settings,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    registerPushToken,
    clearError: clearNotificationError,
    updateSettings: updateNotificationSettings,
  };
};

export const useUnreadCount = () => {
  const { unreadCount } = useNotifications();
  return unreadCount;
};

export const usePushNotifications = () => {
  const { pushToken, registerPushToken } = useNotifications();
  return { pushToken, registerPushToken };
};