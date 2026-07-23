// Custom Hooks - Agents
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { RootState, AppDispatch } from '../stores';
import { 
  fetchAgents, 
  fetchAgent, 
  updateAgentStatusThunk, 
  runAgentThunk, 
  fetchAgentActions,
  setSelectedAgent,
  clearError,
} from '../stores/slices/agentsSlice';

export const useAgents = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, selectedAgent, actions, isLoading, isRunning, error } = useSelector((state: RootState) => state.agents);

  const loadAgents = useCallback(async () => {
    await dispatch(fetchAgents());
  }, [dispatch]);

  const loadAgent = useCallback(async (id: string) => {
    await dispatch(fetchAgent(id));
  }, [dispatch]);

  const loadAgentActions = useCallback(async (agentId: string) => {
    await dispatch(fetchAgentActions(agentId));
  }, [dispatch]);

  const updateStatus = useCallback(async (id: string, status: any) => {
    await dispatch(updateAgentStatusThunk({ id, status }));
  }, [dispatch]);

  const runAgent = useCallback(async (id: string) => {
    await dispatch(runAgentThunk(id));
  }, [dispatch]);

  const selectAgent = useCallback((agent: any) => {
    dispatch(setSelectedAgent(agent));
  }, [dispatch]);

  const clearAgentError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    agents: items,
    selectedAgent,
    actions,
    isLoading,
    isRunning,
    error,
    loadAgents,
    loadAgent,
    loadAgentActions,
    updateStatus,
    runAgent,
    selectAgent,
    clearError: clearAgentError,
  };
};

export const useAgent = (id: string) => {
  const { agents, loadAgent, selectedAgent } = useAgents();
  
  useEffect(() => {
    if (id && (!selectedAgent || selectedAgent.id !== id)) {
      loadAgent(id);
    }
  }, [id, loadAgent, selectedAgent]);

  return {
    agent: selectedAgent || agents.find(a => a.id === id),
    isLoading: !selectedAgent && !!id,
    loadAgent,
  };
};

import { useEffect } from 'react';