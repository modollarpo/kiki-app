// UI Slice - Global UI State
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  activeModal: string | null;
  modalProps: Record<string, any> | null;
  toasts: Toast[];
  loadingOverlays: LoadingOverlay[];
  networkStatus: 'online' | 'offline' | 'unknown';
  deviceOrientation: 'portrait' | 'landscape';
  keyboardVisible: boolean;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onPress: () => void };
}

interface LoadingOverlay {
  id: string;
  message?: string;
  progress?: number;
}

const initialState: UIState = {
  theme: 'system',
  sidebarOpen: false,
  activeModal: null,
  modalProps: null,
  toasts: [],
  loadingOverlays: [],
  networkStatus: 'unknown',
  deviceOrientation: 'portrait',
  keyboardVisible: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    openModal: (state, action: PayloadAction<{ name: string; props?: Record<string, any> }>) => {
      state.activeModal = action.payload.name;
      state.modalProps = action.payload.props || null;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.modalProps = null;
    },
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const id = Math.random().toString(36).substr(2, 9);
      state.toasts.push({ ...action.payload, id });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    addLoadingOverlay: (state, action: PayloadAction<Omit<LoadingOverlay, 'id'>>) => {
      const id = Math.random().toString(36).substr(2, 9);
      state.loadingOverlays.push({ ...action.payload, id });
    },
    removeLoadingOverlay: (state, action: PayloadAction<string>) => {
      state.loadingOverlays = state.loadingOverlays.filter(l => l.id !== action.payload);
    },
    setNetworkStatus: (state, action: PayloadAction<'online' | 'offline' | 'unknown'>) => {
      state.networkStatus = action.payload;
    },
    setDeviceOrientation: (state, action: PayloadAction<'portrait' | 'landscape'>) => {
      state.deviceOrientation = action.payload;
    },
    setKeyboardVisible: (state, action: PayloadAction<boolean>) => {
      state.keyboardVisible = action.payload;
    },
  },
});

export const { 
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  openModal,
  closeModal,
  addToast,
  removeToast,
  addLoadingOverlay,
  removeLoadingOverlay,
  setNetworkStatus,
  setDeviceOrientation,
  setKeyboardVisible,
} = uiSlice.actions;
export default uiSlice.reducer;