// Campaigns Slice - Campaign State Management
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  getCampaigns, 
  getCampaign, 
  createCampaign, 
  updateCampaign, 
  deleteCampaign,
  approveBid,
  rejectBid,
} from '../../services/campaigns';
import { Campaign, CampaignPerformance, CampaignStatus, Platform } from '../../shared/types';

interface CampaignsState {
  items: Campaign[];
  selectedCampaign: Campaign | null;
  performance: CampaignPerformance[];
  filters: CampaignFilters;
  pagination: PaginationState;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
}

interface CampaignFilters {
  status?: CampaignStatus[];
  platform?: Platform[];
  searchQuery: string;
  dateRange?: { start: string; end: string };
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

const initialState: CampaignsState = {
  items: [],
  selectedCampaign: null,
  performance: [],
  filters: {
    searchQuery: '',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  },
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  error: null,
};

export const fetchCampaigns = createAsyncThunk(
  'campaigns/fetchAll',
  async (params: { page?: number; filters?: CampaignFilters } = {}, { rejectWithValue }) => {
    try {
      const response = await getCampaigns(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch campaigns');
    }
  }
);

export const fetchCampaign = createAsyncThunk(
  'campaigns/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await getCampaign(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch campaign');
    }
  }
);

export const createNewCampaign = createAsyncThunk(
  'campaigns/create',
  async (data: Partial<Campaign>, { rejectWithValue }) => {
    try {
      const response = await createCampaign(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create campaign');
    }
  }
);

export const updateExistingCampaign = createAsyncThunk(
  'campaigns/update',
  async ({ id, data }: { id: string; data: Partial<Campaign> }, { rejectWithValue }) => {
    try {
      const response = await updateCampaign(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update campaign');
    }
  }
);

export const deleteExistingCampaign = createAsyncThunk(
  'campaigns/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteCampaign(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete campaign');
    }
  }
);

export const approveCampaignBid = createAsyncThunk(
  'campaigns/approveBid',
  async (bidId: string, { rejectWithValue }) => {
    try {
      const response = await approveBid(bidId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to approve bid');
    }
  }
);

export const rejectCampaignBid = createAsyncThunk(
  'campaigns/rejectBid',
  async (bidId: string, { rejectWithValue }) => {
    try {
      const response = await rejectBid(bidId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to reject bid');
    }
  }
);

const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<CampaignFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = { searchQuery: '' };
      state.pagination.page = 1;
    },
    setSelectedCampaign: (state, action: PayloadAction<Campaign | null>) => {
      state.selectedCampaign = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setPagination: (state, action: PayloadAction<Partial<PaginationState>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCampaigns.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.page === 1) {
          state.items = action.payload.items;
        } else {
          state.items = [...state.items, ...action.payload.items];
        }
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCampaign.fulfilled, (state, action) => {
        state.selectedCampaign = action.payload;
      })
      .addCase(createNewCampaign.pending, (state) => {
        state.isCreating = true;
      })
      .addCase(createNewCampaign.fulfilled, (state, action) => {
        state.isCreating = false;
        state.items.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createNewCampaign.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      .addCase(updateExistingCampaign.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.items.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedCampaign?.id === action.payload.id) {
          state.selectedCampaign = action.payload;
        }
      })
      .addCase(updateExistingCampaign.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      .addCase(deleteExistingCampaign.fulfilled, (state, action) => {
        state.items = state.items.filter(c => c.id !== action.payload);
        state.pagination.total -= 1;
        if (state.selectedCampaign?.id === action.payload) {
          state.selectedCampaign = null;
        }
      })
      .addCase(approveCampaignBid.fulfilled, (state, action) => {
        // Update campaign with new bid status
      })
      .addCase(rejectCampaignBid.fulfilled, (state, action) => {
        // Update campaign with rejected bid status
      });
  },
});

export const { 
  setFilters, 
  clearFilters, 
  setSelectedCampaign, 
  clearError, 
  setPagination 
} = campaignsSlice.actions;
export default campaignsSlice.reducer;