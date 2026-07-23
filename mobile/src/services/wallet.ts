// Wallet Service
import apiClient from './api';
import { Wallet, WalletTransaction, TransactionType, TransactionStatus } from '../shared/types';

interface TransactionParams {
  page?: number;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
}

export const getWallet = async (): Promise<Wallet> => {
  const response = await apiClient.get<Wallet>('/wallet');
  return response;
};

export const getTransactions = async (params: TransactionParams = {}): Promise<{ items: WalletTransaction[] }> => {
  const response = await apiClient.get<{ items: WalletTransaction[] }>('/wallet/transactions', params);
  return response;
};

export const addFunds = async (amount: number, paymentMethodId: string): Promise<{ transaction: WalletTransaction; amount: number }> => {
  const response = await apiClient.post<{ transaction: WalletTransaction; amount: number }>('/wallet/deposit', { amount, paymentMethodId });
  return response;
};

export const withdrawFunds = async (amount: number, paymentMethodId: string): Promise<{ transaction: WalletTransaction; amount: number }> => {
  const response = await apiClient.post<{ transaction: WalletTransaction; amount: number }>('/wallet/withdraw', { amount, paymentMethodId });
  return response;
};

export const getPaymentMethods = async (): Promise<any[]> => {
  const response = await apiClient.get<any[]>('/wallet/payment-methods');
  return response;
};

export const addPaymentMethod = async (data: any): Promise<any> => {
  const response = await apiClient.post<any>('/wallet/payment-methods', data);
  return response;
};

export const removePaymentMethod = async (id: string): Promise<void> => {
  await apiClient.delete(`/wallet/payment-methods/${id}`);
};

export const setDefaultPaymentMethod = async (id: string): Promise<void> => {
  await apiClient.post(`/wallet/payment-methods/${id}/default`);
};

export const getWalletBalance = async (): Promise<{ balance: number }> => {
  const response = await apiClient.get<{ balance: number }>('/wallet/balance');
  return response;
};