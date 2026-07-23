// Campaigns Hook - Campaign State & Actions
import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchCampaigns, 
  fetchCampaign, 
  createNewCampaign, 
  updateExistingCampaign, 
  deleteExistingCampaign,
  approveCampaignBid,
  rejectCampaignBid,
  setFilters,
  clearFilters,
  setSelectedCampaign,
  setPagination,
} from '../stores/slices/campaignsSlice';
import { RootState, AppDispatch } from '../stores';

export const useCampaigns = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    items, 
    selectedCampaign, 
    performance, 
    filters, 
    pagination, 
    isLoading, 
    isCreating, 
    isUpdating, 
    error 
  } = useSelector((state: RootState) => state.campaigns);

  const loadCampaigns = useCallback(async (page = 1) => {
    await dispatch(fetchCampaigns({ page, filters }));
  }, [dispatch, filters]);

  const loadCampaign = useCallback(async (id: string) => {
    await dispatch(fetchCampaign(id));
  }, [dispatch]);

  const createCampaign = useCallback(async (data: any) => {
    try {
      const result = await dispatch(createNewCampaign(data)).unwrap();
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const updateCampaign = useCallback(async (id: string, data: any) => {
    try {
      const result = await dispatch(updateExistingCampaign({ id, data })).unwrap();
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const deleteCampaign = useCallback(async (id: string) => {
    try {
      await dispatch(deleteExistingCampaign(id)).unwrap();
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const approveBid = useCallback(async (bidId: string) => {
    await dispatch(approveCampaignBid(bidId));
  }, [dispatch]);

  const rejectBid = useCallback(async (bidId: string) => {
    await dispatch(rejectCampaignBid(bidId));
  }, [dispatch]);

  const updateFilters = useCallback((newFilters: any) => {
    dispatch(setFilters(newFilters));
  }, [dispatch]);

  const clearAllFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  const selectCampaign = useCallback((campaign: any) => {
    dispatch(setSelectedCampaign(campaign));
  }, [dispatch]);

  const clearCampaignError = useCallback(() => {
    dispatch({ type: 'campaigns/clearError' });
  }, [dispatch]);

  const setPage = useCallback((page: number) => {
    dispatch(setPagination({ page }));
  }, [dispatch]);

  const loadMore = useCallback(() => {
    if (pagination.hasMore && !isLoading) {
      setPage(pagination.page + 1);
    }
  }, [pagination.hasMore, pagination.page, isLoading, setPage]);

  // Load initial campaigns
  useEffect(() => {
    if (items.length === 0 && !isLoading) {
      loadCampaigns(1);
    }
  }, [items.length, isLoading, loadCampaigns]);

  return {
    campaigns: items,
    selectedCampaign,
    performance,
    filters,
    pagination,
    isLoading,
    isCreating,
    isUpdating,
    error,
    loadCampaigns,
    loadCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    approveBid,
    rejectBid,
    updateFilters,
    clearAllFilters,
    selectCampaign,
    clearError: clearCampaignError,
    loadMore,
    hasMore: pagination.hasMore,
  };
};

export const useCampaign = (id: string) => {
  const { campaigns, loadCampaign, selectedCampaign } = useCampaigns();
  
  useEffect(() => {
    if (id && (!selectedCampaign || selectedCampaign.id !== id)) {
      loadCampaign(id);
    }
  }, [id, loadCampaign, selectedCampaign]);

  return {
    campaign: selectedCampaign || campaigns.find(c => c.id === id),
    isLoading: !selectedCampaign && !!id,
    error: null,
    loadCampaign,
  };
};