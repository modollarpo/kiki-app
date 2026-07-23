// Auth Hook - Authentication State & Actions
import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, logout, refreshAuthToken, initializeAuth, clearError, updateUserProfile } from '../stores/slices/authSlice';
import { RootState, AppDispatch } from '../stores';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, tenant, token, refreshToken, isAuthenticated, isLoading, error, biometricEnabled } = useSelector((state: RootState) => state.auth);

  const handleLogin = useCallback(async (credentials: any) => {
    try {
      const result = await dispatch(login(credentials)).unwrap();
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleLogout = useCallback(async () => {
    await dispatch(logout());
  }, [dispatch]);

  const handleRefreshToken = useCallback(async () => {
    try {
      await dispatch(refreshAuthToken()).unwrap();
    } catch (error) {
      // Token refresh failed, user will be logged out
      throw error;
    }
  }, [dispatch]);

  const handleInitializeAuth = useCallback(async () => {
    await dispatch(initializeAuth());
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleUpdateProfile = useCallback(async (data: Partial<any>) => {
    await dispatch(updateUserProfile(data));
  }, [dispatch]);

  const handleSetBiometricEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'auth/setBiometricEnabled', payload: enabled });
  }, [dispatch]);

  // Initialize auth on mount
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      handleInitializeAuth();
    }
  }, [handleInitializeAuth, isAuthenticated, isLoading]);

  return {
    user,
    tenant,
    token,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    biometricEnabled,
    login: handleLogin,
    logout: handleLogout,
    tokenRefresh: handleRefreshToken,
    initializeAuth: handleInitializeAuth,
    clearError: handleClearError,
    updateProfile: handleUpdateProfile,
    setBiometricEnabled: handleSetBiometricEnabled,
  };
};

export const useUser = () => {
  const { user, isAuthenticated } = useAuth();
  return { user, isAuthenticated };
};

export const useTenant = () => {
  const { tenant, isAuthenticated } = useAuth();
  return { tenant, isAuthenticated };
};