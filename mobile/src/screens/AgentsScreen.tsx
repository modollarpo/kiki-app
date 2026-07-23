// Agents Screen - AI Agent Management
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Chip, Button, IconButton, Badge, Avatar } from 'react-native-paper';
import { useAgents } from '../hooks/useAgents';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { K, spacing, borderRadius, shadows, typography } from '../theme';
import { formatRelativeTime, formatNumber } from '../utils/formatters';

interface AgentItem {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  description?: string;
  config?: any;
  metrics?: any;
  lastAction?: string;
  actionCount: number;
  createdAt: string;
  updatedAt: string;
}

const AgentsScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  const { agents, isLoading, loadAgents, updateStatus, runAgent, selectAgent, clearError } = useAgents();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'running' | 'paused' | 'stopped' | 'error'>('all');

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadAgents();
    setRefreshing(false);
  }, [loadAgents]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const filteredAgents = agents.filter(agent => 
    filter === 'all' || agent.status === filter
  );

  const stats = {
    total: agents.length,
    running: agents.filter(a => a.status === 'running').length,
    paused: agents.filter(a => a.status === 'paused').length,
    stopped: agents.filter(a => a.status === 'stopped').length,
    error: agents.filter(a => a.status === 'error').length,
    totalActions: agents.reduce((sum, a) => sum + a.actionCount, 0),
  };

  const statusColors = {
    running: K.mint,
    paused: K.gold,
    stopped: K.t3,
    error: K.danger,
  };

  const statusIcons = {
    running: '▶',
    paused: '⏸',
    stopped: '■',
    error: '✕',
  };

  const typeIcons = {
    bidding: '🎯',
    ltu: '📈',
    mmm: '📊',
    optimization: '⚙️',
    analysis: '🔍',
  };

  if (!isAuthenticated) {
    return <AuthRequiredScreen navigation={navigation} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[themeTypography.headlineMedium, { color: colors.onSurface }]}>AI Agents</Text>
          <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            {stats.running} running • {stats.totalActions} total actions
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Button
            mode="contained"
            style={styles.createBtn}
            onPress={() => { /* Create agent */ }}
            icon="plus"
          >
            Create Agent
          </Button>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <StatCard title="Total Agents" value={stats.total} color={K.blue} icon="robot" />
        <StatCard title="Running" value={stats.running} color={K.mint} icon="play-circle" />
        <StatCard title="Paused" value={stats.paused} color={K.gold} icon="pause-circle" />
        <StatCard title="Errors" value={stats.error} color={stats.error > 0 ? K.danger : K.mint} icon="alert-circle" />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'running', 'paused', 'stopped', 'error'] as const).map((tab) => {
          const count = stats[tab as keyof typeof stats];
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              style={[
                styles.filterTab,
                filter === tab && styles.filterTabActive,
              ]}
            >
              <View style={[
                styles.filterTabIcon,
                { backgroundColor: tab === 'all' ? K.blue + '20' : statusColors[tab as keyof typeof statusColors] + '20' }
              ]}>
                <Text style={{ fontSize: 16, color: tab === 'all' ? K.blue : statusColors[tab as keyof typeof statusColors] }}>
                  {tab === 'all' ? '🤖' : statusIcons[tab as keyof typeof statusIcons]}
                </Text>
              </View>
              <Text style={[
                themeTypography.labelMedium,
                { 
                  color: filter === tab ? (tab === 'all' ? K.blue : statusColors[tab as keyof typeof statusColors]) : colors.onSurfaceVariant,
                  fontWeight: filter === tab ? '600' : '400',
                }
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {count > 0 && (
                <Badge style={styles.filterBadge} color={tab === 'all' ? K.blue : statusColors[tab as keyof typeof statusColors]}>
                  {count}
                </Badge>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Agents List */}
      <FlatList
        data={filteredAgents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AgentCard
            agent={item}
            onPress={() => {
              selectAgent(item);
              navigation.navigate('AgentDetail', { id: item.id });
            }}
            onStatusChange={(newStatus) => updateStatus(item.id, newStatus)}
            onRun={() => runAgent(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[themeTypography.headlineSmall, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.sm }]}>
              {filter === 'all' ? 'No agents configured' : `No ${filter} agents`}
            </Text>
            <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.lg }]}>
              {filter === 'all' 
                ? 'Create your first AI agent to automate campaign management'
                : `All ${filter} agents will appear here`}
            </Text>
            {filter === 'all' && (
              <Button
                mode="contained"
                style={{ width: 200, marginTop: spacing.md }}
                onPress={() => { /* Create agent */ }}
              >
                Create Agent
              </Button>
            )}
          </View>
        }
        onRefresh={onRefresh}
        refreshing={refreshing}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Agent Card Component
const AgentCard = ({ agent, onPress, onStatusChange, onRun }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  const statusColors = {
    running: K.mint,
    paused: K.gold,
    stopped: K.t3,
    error: K.danger,
  };

  const statusIcons = {
    running: '▶',
    paused: '⏸',
    stopped: '■',
    error: '✕',
  };

  const typeIcons = {
    bidding: '🎯',
    ltu: '📈',
    mmm: '📊',
    optimization: '⚙️',
    analysis: '🔍',
  };

  return (
    <TouchableOpacity onPress={onPress} style={[styles.agentCard, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={styles.agentHeader}>
        <View style={styles.agentMainInfo}>
          <View style={[
            styles.agentTypeBadge,
            { backgroundColor: K.blue + '20' }
          ]}>
            <Text style={{ fontSize: 24 }}>{typeIcons[agent.type as keyof typeof typeIcons] || '🤖'}</Text>
          </View>
          <View style={styles.agentInfo}>
            <View style={styles.agentTitleRow}>
              <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{agent.name}</Text>
              <View style={[styles.agentStatusBadge, { backgroundColor: statusColors[agent.status] + '20' }]}>
                <Text style={[themeTypography.labelSmall, { color: statusColors[agent.status], fontWeight: '700' }]}>
                  {statusIcons[agent.status]} {agent.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant }]}>{agent.type.charAt(0).toUpperCase() + agent.type.slice(1)} Agent</Text>
            {agent.description && (
              <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>{agent.description}</Text>
            )}
          </View>
        </View>
        <View style={styles.agentActions}>
          {agent.status !== 'running' && (
            <Button
              mode="outlined"
              style={styles.smallBtn}
              onPress={() => onStatusChange('running')}
              icon="play"
            >
              Start
            </Button>
          )}
          {agent.status === 'running' && (
            <Button
              mode="outlined"
              style={styles.smallBtn}
              onPress={() => onStatusChange('paused')}
              icon="pause"
            >
              Pause
            </Button>
          )}
          <Button
            mode="text"
            style={styles.smallBtn}
            onPress={onRun}
            icon="refresh"
          >
            Run
          </Button>
        </View>
      </View>

      <View style={styles.agentStats}>
        <View style={styles.stat}>
          <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Actions</Text>
          <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '700' }]}>{formatNumber(agent.actionCount)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Last Run</Text>
          <Text style={[themeTypography.labelMedium, { color: colors.onSurface, fontWeight: '500' }]}>{agent.lastAction ? formatRelativeTime(agent.lastAction) : 'Never'}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Accuracy</Text>
          <Text style={[themeTypography.titleMedium, { color: K.mint, fontWeight: '700' }]}>{(agent.metrics?.accuracy || 0).toFixed(1)}%</Text>
        </View>
      </View>

      <View style={styles.agentFooter}>
        <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>
          Created {formatRelativeTime(agent.createdAt)} • Updated {formatRelativeTime(agent.updatedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Stat Card Component
const StatCard = ({ title, value, color, icon }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 24, color }}>🤖</Text>
      </View>
      <Text style={[themeTypography.headlineSmall, { color, fontWeight: '700' }]}>{value}</Text>
      <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant }]}>{title}</Text>
    </TouchableOpacity>
  );
};

// Auth Required Screen
const AuthRequiredScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <View style={[styles.authContainer, { backgroundColor: colors.background }]}>
      <View style={styles.authCard}>
        <Text style={[themeTypography.displaySmall, { color: colors.onSurface, textAlign: 'center', marginBottom: 16 }]}>Sign In Required</Text>
        <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 32 }]}>Please sign in to manage AI agents</Text>
        <Button mode="contained" style={styles.authButton} onPress={() => navigation.navigate('Login')}>Sign In</Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {},
  createBtn: {
    height: 44,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  filterTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: '#1f2937',
  },
  filterTabActive: {
    backgroundColor: K.blue + '30',
  },
  filterTabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {},
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  agentCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  agentMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  agentTypeBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentInfo: {
    flex: 1,
    minWidth: 0,
  },
  agentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  agentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  agentActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  smallBtn: {
    paddingHorizontal: spacing.sm,
    height: 36,
  },
  agentStats: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  agentFooter: {
    padding: spacing.md,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  authCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  authButton: {
    width: '100%',
    marginTop: spacing.md,
    height: 52,
  },
});

export default AgentsScreen;