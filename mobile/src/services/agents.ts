// Agents Service
import apiClient from './api';
import { Agent, AgentStatus, AgentAction } from '../shared/types';

export const getAgents = async (): Promise<Agent[]> => {
  const response = await apiClient.get<Agent[]>('/agents');
  return response;
};

export const getAgent = async (id: string): Promise<Agent> => {
  const response = await apiClient.get<Agent>(`/agents/${id}`);
  return response;
};

export const updateAgentStatus = async (id: string, status: AgentStatus): Promise<Agent> => {
  const response = await apiClient.patch<Agent>(`/agents/${id}/status`, { status });
  return response;
};

export const runAgent = async (id: string): Promise<{ success: boolean; result?: any }> => {
  const response = await apiClient.post<{ success: boolean; result?: any }>(`/agents/${id}/run`);
  return response;
};

export const getAgentActions = async (agentId: string, limit: number = 50): Promise<AgentAction[]> => {
  const response = await apiClient.get<AgentAction[]>(`/agents/${agentId}/actions`, { limit });
  return response;
};

export const updateAgentConfig = async (id: string, config: any): Promise<Agent> => {
  const response = await apiClient.patch<Agent>(`/agents/${id}/config`, config);
  return response;
};

export const createAgent = async (data: { name: string; type: string; config?: any }): Promise<Agent> => {
  const response = await apiClient.post<Agent>('/agents', data);
  return response;
};

export const deleteAgent = async (id: string): Promise<void> => {
  await apiClient.delete(`/agents/${id}`);
};

export const getAgentMetrics = async (id: string, days: number = 30): Promise<any> => {
  const response = await apiClient.get<any>(`/agents/${id}/metrics`, { days });
  return response;
};