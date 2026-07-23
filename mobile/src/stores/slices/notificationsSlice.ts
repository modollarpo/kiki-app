// Notifications Slice - Push & In-App Notifications
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead,
  registerPushToken,
} from '../../services/notifications';
import { Notification, NotificationType, NotificationPriority } from '../../shared/types';

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  pushToken: string | null;
  settings: NotificationSettings;
}

interface NotificationSettings {
  enabled: boolean;
  types: Record<NotificationType, boolean>;
  quietHours: { enabled: boolean; start: string; end: string };
  sound: boolean;
  vibration: boolean;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  pushToken: null,
  settings: {
    enabled: true,
    types: {
      campaign: true,
      agent: true,
      wallet: true,
      system: true,
      alert: true,
      info: true,
    },
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
    sound: true,
    vibration: true,
  },
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await getNotifications(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id: string, { rejectWithValue }) => {
    try {
      await markAsRead(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark as read');
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await markAllAsRead();
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark all as read');
    }
  }
);

export const registerPushTokenThunk = createAsyncThunk(
  'notifications/registerToken',
  async (token: string, { rejectWithValue }) => {
    try {
      await registerPushToken(token);
      return token;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to register push token');
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.items.unshift(action.payload);
      if (action.payload.status === 'unread') {
        state.unreadCount += 1;
      }
    },
    updateNotification: (state, action: PayloadAction<Notification>) => {
      const index = state.items.findIndex(n => n.id === action.payload.id);
      if (index !== -1) {
        const wasUnread = state.items[index].status === 'unread';
        const isUnread = action.payload.status === 'unread';
        if (wasUnread && !isUnread) state.unreadCount -= 1;
        if (!wasUnread && isUnread) state.unreadCount += 1;
        state.items[index] = action.payload;
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.items.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        if (state.items[index].status === 'unread') state.unreadCount -= 1;
        state.items.splice(index, 1);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    updateSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.unreadCount = action.payload.items.filter(n => n.status === 'unread').length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const index = state.items.findIndex(n => n.id === action.payload);
        if (index !== -1 && state.items[index].status === 'unread') {
          state.items[index].status = 'read';
          state.unreadCount -= 1;
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach(n => { n.status = 'read'; });
        state.unreadCount = 0;
      })
      .addCase(registerPushTokenThunk.fulfilled, (state, action) => {
        state.pushToken = action.payload;
      });
  },
});

export const { 
  addNotification, 
  updateNotification, 
  removeNotification, 
  clearError, 
  updateSettings 
} = notificationsSlice.actions;
export default notificationsSlice.reducer;