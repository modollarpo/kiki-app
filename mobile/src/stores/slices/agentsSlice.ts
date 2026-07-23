// Agents Slice - AI Agent State Management
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  getAgents, 
  getAgent, 
  updateAgentStatus, 
  runAgent,
  getAgentActions,
} from '../../services/agents';
import { Agent, AgentStatus, AgentAction } from '../../shared/types';

interface AgentsState {
  items: Agent[];
  selectedAgent: Agent | null;
  actions: AgentAction[];
  isLoading: boolean;
  isRunning: boolean;
  error: string | null;
}

const initialState: AgentsState = {
  items: [],
  selectedAgent: null,
  actions: [],
  isLoading: false,
  isRunning: false,
  error: null,
};

export const fetchAgents = createAsyncThunk(
  'agents/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getAgents();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch agents');
    }
  }
);

export const fetchAgent = createAsyncThunk(
  'agents/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await getAgent(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch agent');
    }
  }
);

export const updateAgentStatusThunk = createAsyncThunk(
  'agents/updateStatus',
  async ({ id, status }: { id: string; status: AgentStatus }, { rejectWithValue }) => {
    try {
      const response = await updateAgentStatus(id, status);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update agent status');
    }
  }
);

export const runAgentThunk = createAsyncThunk(
  'agents/run',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await runAgent(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to run agent');
    }
  }
);

export const fetchAgentActions = createAsyncThunk(
  'agents/fetchActions',
  async (agentId: string, { rejectWithValue }) => {
    try {
      const response = await getAgentActions(agentId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch agent actions');
    }
  }
);

const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    setSelectedAgent: (state, action: PayloadAction<Agent | null>) => {
      state.selectedAgent = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAgents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchAgents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchAgent.fulfilled, (state, action) => {
        state.selectedAgent = action.payload;
      })
      .addCase(updateAgentStatusThunk.fulfilled, (state, action) => {
        const index = state.items.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedAgent?.id === action.payload.id) {
          state.selectedAgent = action.payload;
        }
      })
      .addCase(runAgentThunk.pending, (state) => {
        state.isRunning = true;
      })
      .addCase(runAgentThunk.fulfilled, (state) => {
        state.isRunning = false;
      })
      .addCase(runAgentThunk.rejected, (state, action) => {
        state.isRunning = false;
        state.error = action.payload as string;
      })
      .addCase(fetchAgentActions.fulfilled, (state, action) => {
        state.actions = action.payload;
      });
  },
});

export const { setSelectedAgent, clearError } = agentsSlice.actions;
export default agentsSlice.reducer;