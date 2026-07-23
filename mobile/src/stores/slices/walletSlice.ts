// Wallet Slice - Financial State Management
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  getWallet, 
  getTransactions, 
  addFunds, 
  withdrawFunds,
  getPaymentMethods,
} from '../../services/wallet';
import { Wallet, WalletTransaction, TransactionType, TransactionStatus } from '../../shared/types';

interface WalletState {
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  isTransacting: boolean;
  error: string | null;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'crypto';
  name: string;
  last4?: string;
  isDefault: boolean;
  expiry?: string;
}

const initialState: WalletState = {
  wallet: null,
  transactions: [],
  paymentMethods: [],
  isLoading: false,
  isTransacting: false,
  error: null,
};

export const fetchWallet = createAsyncThunk(
  'wallet/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getWallet();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch wallet');
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (params: { page?: number; limit?: number; type?: TransactionType } = {}, { rejectWithValue }) => {
    try {
      const response = await getTransactions(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch transactions');
    }
  }
);

export const addFundsToWallet = createAsyncThunk(
  'wallet/addFunds',
  async (data: { amount: number; paymentMethodId: string }, { rejectWithValue }) => {
    try {
      const response = await addFunds(data.amount, data.paymentMethodId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add funds');
    }
  }
);

export const withdrawFundsFromWallet = createAsyncThunk(
  'wallet/withdraw',
  async (data: { amount: number; paymentMethodId: string }, { rejectWithValue }) => {
    try {
      const response = await withdrawFunds(data.amount, data.paymentMethodId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to withdraw funds');
    }
  }
);

export const fetchPaymentMethods = createAsyncThunk(
  'wallet/fetchPaymentMethods',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getPaymentMethods();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch payment methods');
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateBalance: (state, action: PayloadAction<number>) => {
      if (state.wallet) {
        state.wallet.balance = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallet.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.wallet = action.payload;
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTransactions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions = action.payload.items;
      })
      .addCase(addFundsToWallet.pending, (state) => {
        state.isTransacting = true;
      })
      .addCase(addFundsToWallet.fulfilled, (state, action) => {
        state.isTransacting = false;
        state.transactions.unshift(action.payload.transaction);
        if (state.wallet) {
          state.wallet.balance += action.payload.amount;
        }
      })
      .addCase(withdrawFundsFromWallet.pending, (state) => {
        state.isTransacting = true;
      })
      .addCase(withdrawFundsFromWallet.fulfilled, (state, action) => {
        state.isTransacting = false;
        state.transactions.unshift(action.payload.transaction);
        if (state.wallet) {
          state.wallet.balance -= action.payload.amount;
        }
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.paymentMethods = action.payload;
      });
  },
});

export const { clearError, updateBalance } = walletSlice.actions;
export default walletSlice.reducer;