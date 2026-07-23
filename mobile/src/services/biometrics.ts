// Biometric Authentication Service
import { Platform } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
const BiometricAuth = ReactNativeBiometrics;
const BiometryTypes = ReactNativeBiometrics.BiometryTypes;
import { store } from '../stores';
import { setBiometricEnabled } from '../stores/slices/authSlice';

const biometrics = new BiometricAuth();

export const isBiometricAvailable = async (): Promise<{
  available: boolean;
  biometryType: typeof BiometryTypes | null;
  error?: string;
}> => {
  try {
    const { available, biometryType, error } = await biometrics.isSensorAvailable();
    return { available, biometryType, error };
  } catch (err) {
    return { available: false, biometryType: null, error: String(err) };
  }
};

export const createBiometricKeys = async (): Promise<{
  success: boolean;
  publicKey?: string;
  error?: string;
}> => {
  try {
    const { keysExist } = await biometrics.biometricKeysExist();
    if (keysExist) {
      return { success: true };
    }

    const { publicKey } = await biometrics.createKeys();
    return { success: true, publicKey };
  } catch (err) {
    return { success: false, error: String(err) };
  }
};

export const deleteBiometricKeys = async (): Promise<boolean> => {
  try {
    await biometrics.deleteKeys();
    return true;
  } catch (err) {
    console.error('Delete biometric keys error:', err);
    return false;
  }
};

export const authenticateWithBiometrics = async (promptMessage: string = 'Authenticate to access KIKI'): Promise<{
  success: boolean;
  signature?: string;
  error?: string;
}> => {
  try {
    const { success, signature, error } = await biometrics.createSignature({
      promptMessage,
      fallbackPromptMessage: 'Use device credentials',
      cancelButtonText: 'Cancel',
    });

    if (success && signature) {
      return { success: true, signature };
    }

    return { success: false, error: error || 'Biometric authentication failed' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
};

export const verifyBiometricCredential = async (credential: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  // Verify the biometric credential with backend
  try {
    // This would call the backend to verify the signature
    // const response = await apiClient.post('/auth/biometric/verify', { credential });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
};

export const enableBiometricAuth = async (): Promise<boolean> => {
  try {
    // Check availability
    const { available } = await isBiometricAvailable();
    if (!available) return false;

    // Create keys
    const { success } = await createBiometricKeys();
    if (!success) return false;

    // Enable in store
    store.dispatch(setBiometricEnabled(true));
    return true;
  } catch (err) {
    console.error('Enable biometric auth error:', err);
    return false;
  }
};

export const disableBiometricAuth = async (): Promise<boolean> => {
  try {
    await deleteBiometricKeys();
    store.dispatch(setBiometricEnabled(false));
    return true;
  } catch (err) {
    console.error('Disable biometric auth error:', err);
    return false;
  }
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const { keysExist } = await biometrics.biometricKeysExist();
    return keysExist;
  } catch {
    return false;
  }
};

export const getBiometryType = (): typeof BiometryTypes | null => {
  // This would be determined from isSensorAvailable
  return null;
};

export const isFaceID = (): boolean => {
  return Platform.OS === 'ios';
};

export const isFingerprint = (): boolean => {
  return Platform.OS === 'android';
};