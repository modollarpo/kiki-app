// Wallet Hook - Wallet State & Actions
import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchWallet, 
  fetchTransactions, 
  addFundsToWallet, 
  withdrawFundsFromWallet,
  fetchPaymentMethods,
  updateBalance,
} from '../stores/slices/walletSlice';
import { RootState, AppDispatch } from '../stores';

export const useWallet = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    wallet, 
    transactions, 
    paymentMethods, 
    isLoading, 
    isTransacting, 
    error 
  } = useSelector((state: RootState) => state.wallet);

  const loadWallet = useCallback(async () => {
    await dispatch(fetchWallet());
  }, [dispatch]);

  const loadTransactions = useCallback(async (params: any = {}) => {
    await dispatch(fetchTransactions(params));
  }, [dispatch]);

  const loadPaymentMethods = useCallback(async () => {
    await dispatch(fetchPaymentMethods());
  }, [dispatch]);

  const addFunds = useCallback(async (amount: number, paymentMethodId: string) => {
    try {
      const result = await dispatch(addFundsToWallet({ amount, paymentMethodId })).unwrap();
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const withdrawFunds = useCallback(async (amount: number, paymentMethodId: string) => {
    try {
      const result = await dispatch(withdrawFundsFromWallet({ amount, paymentMethodId })).unwrap();
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const clearWalletError = useCallback(() => {
    dispatch({ type: 'wallet/clearError' });
  }, [dispatch]);

  // Load wallet on mount
  useEffect(() => {
    if (!wallet) {
      loadWallet();
      loadTransactions();
      loadPaymentMethods();
    }
  }, [wallet, loadWallet, loadTransactions, loadPaymentMethods]);

  return {
    wallet,
    transactions,
    paymentMethods,
    isLoading,
    isTransacting,
    error,
    loadWallet,
    loadTransactions,
    loadPaymentMethods,
    addFunds,
    withdrawFunds,
    clearError: clearWalletError,
    balance: wallet?.balance || 0,
    currency: wallet?.currency || 'USD',
  };
};

export const useTransactions = (params: any = {}) => {
  const { transactions, isLoading, loadTransactions } = useWallet();
  
  useEffect(() => {
    loadTransactions(params);
  }, [params.page, params.limit, params.type, loadTransactions]);

  return { transactions, isLoading, loadTransactions };
};

export const useBalance = () => {
  const { balance, currency, wallet } = useWallet();
  return { balance, currency, wallet };
};