// Campaigns Service
import apiClient from './api';
import { Campaign, CampaignPerformance, CampaignStatus, Platform } from '../shared/types';

interface CampaignListParams {
  page?: number;
  limit?: number;
  status?: CampaignStatus[];
  platform?: Platform[];
  searchQuery?: string;
  dateRange?: { start: string; end: string };
}

interface CampaignListResponse {
  items: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export const getCampaigns = async (params: CampaignListParams = {}): Promise<CampaignListResponse> => {
  const response = await apiClient.get<CampaignListResponse>('/campaigns', params);
  return response;
};

export const getCampaign = async (id: string): Promise<Campaign> => {
  const response = await apiClient.get<Campaign>(`/campaigns/${id}`);
  return response;
};

export const createCampaign = async (data: Partial<Campaign>): Promise<Campaign> => {
  const response = await apiClient.post<Campaign>('/campaigns', data);
  return response;
};

export const updateCampaign = async (id: string, data: Partial<Campaign>): Promise<Campaign> => {
  const response = await apiClient.patch<Campaign>(`/campaigns/${id}`, data);
  return response;
};

export const deleteCampaign = async (id: string): Promise<void> => {
  await apiClient.delete(`/campaigns/${id}`);
};

export const approveBid = async (bidId: string): Promise<{ success: boolean }> => {
  const response = await apiClient.post<{ success: boolean }>(`/bidding/${bidId}/approve`);
  return response;
};

export const rejectBid = async (bidId: string): Promise<{ success: boolean }> => {
  const response = await apiClient.post<{ success: boolean }>(`/bidding/${bidId}/reject`);
  return response;
};

export const getCampaignPerformance = async (id: string, days: number = 30): Promise<CampaignPerformance[]> => {
  const response = await apiClient.get<CampaignPerformance[]>(`/campaigns/${id}/performance`, { days });
  return response;
};

export const getCampaignSignals = async (id: string, days: number = 7): Promise<any[]> => {
  const response = await apiClient.get<any[]>(`/campaigns/${id}/signals`, { days });
  return response;
};

export const duplicateCampaign = async (id: string): Promise<Campaign> => {
  const response = await apiClient.post<Campaign>(`/campaigns/${id}/duplicate`);
  return response;
};

export const pauseCampaign = async (id: string): Promise<Campaign> => {
  const response = await apiClient.post<Campaign>(`/campaigns/${id}/pause`);
  return response;
};

export const resumeCampaign = async (id: string): Promise<Campaign> => {
  const response = await apiClient.post<Campaign>(`/campaigns/${id}/resume`);
  return response;
};