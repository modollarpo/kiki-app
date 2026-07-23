// Auth Service
import apiClient from './api';
import { LoginRequest, LoginResponse, User, Tenant } from '../shared/types';

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
  return response;
};

export const refreshToken = async (refreshToken: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/refresh', { refreshToken });
  return response;
};

export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me');
  return response;
};

export const updateProfile = async (data: Partial<User>): Promise<User> => {
  const response = await apiClient.patch<User>('/auth/me', data);
  return response;
};

export const changePassword = async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
  await apiClient.post('/auth/change-password', data);
};

export const setupBiometric = async (): Promise<{ enabled: boolean }> => {
  const response = await apiClient.post<{ enabled: boolean }>('/auth/biometric/setup');
  return response;
};

export const verifyBiometric = async (credential: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/biometric/verify', { credential });
  return response;
};