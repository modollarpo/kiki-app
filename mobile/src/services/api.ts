// API Client - Centralized HTTP Client with Interceptors
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { store } from '../stores';
import { refreshAuthToken, logout } from '../stores/slices/authSlice';
import { addToast } from '../stores/slices/uiSlice';

declare const __DEV__: boolean;

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://kiki-app.purplesky-3fddb402.swedencentral.azurecontainerapps.io/api';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const state = store.getState();
        const token = state.auth.token;
        
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request ID for tracing
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 401 - token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              originalRequest.headers!.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const state = store.getState();
            const refreshToken = state.auth.refreshToken;
            
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { token: newToken, refreshToken: newRefreshToken } = response.data;
            
            // Update store
            store.dispatch(refreshAuthToken.fulfilled({
              token: newToken,
              refreshToken: newRefreshToken,
              user: state.auth.user,
              tenant: state.auth.tenant,
            } as any));

            // Process queued requests
            this.failedQueue.forEach(({ resolve }) => resolve(newToken));
            this.failedQueue = [];

            originalRequest.headers!.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];
            
            // Force logout
            store.dispatch(logout());
            store.dispatch(addToast({
              type: 'error',
              title: 'Session Expired',
              message: 'Please log in again',
            }));
            
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other errors
        if (error.response?.status === 403) {
          store.dispatch(addToast({
            type: 'error',
            title: 'Access Denied',
            message: 'You do not have permission to perform this action',
          }));
        } else if (error.response?.status === 429) {
          store.dispatch(addToast({
            type: 'warning',
            title: 'Rate Limited',
            message: 'Too many requests. Please try again later.',
          }));
        } else if (error.response?.status && error.response.status >= 500) {
          store.dispatch(addToast({
            type: 'error',
            title: 'Server Error',
            message: 'Something went wrong. Please try again later.',
          }));
        } else if (error.code === 'ECONNABORTED') {
          store.dispatch(addToast({
            type: 'error',
            title: 'Request Timeout',
            message: 'The request took too long. Please check your connection.',
          }));
        } else if (!error.response) {
          store.dispatch(addToast({
            type: 'error',
            title: 'Network Error',
            message: 'Unable to connect to server. Please check your internet connection.',
          }));
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    this.failedQueue = [];
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // HTTP Methods
  async get<T>(url: string, params?: any) {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any) {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any) {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any) {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string) {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  // File upload
  async upload<T>(url: string, file: any, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;