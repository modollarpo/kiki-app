// Dashboard Screen - Main Dashboard with KPI Cards
import React from 'react';
import { View, ScrollView, RefreshControl, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Paragraph, Avatar, IconButton, Button, Chip } from 'react-native-paper';
import { useCampaigns } from '../hooks/useCampaigns';
import { useAgents } from '../hooks/useAgents';
import { useWallet } from '../hooks/useWallet';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { K, spacing, borderRadius, shadows, typography } from '../theme';
import { formatCurrency, formatNumber } from '../utils/formatters';

const DashboardScreen = ({ navigation }) => {
  const { theme, colors, spacing: themeSpacing, typography: themeTypography } = useTheme();
  const { campaigns, isLoading: campaignsLoading, loadCampaigns } = useCampaigns();
  const { agents, isLoading: agentsLoading } = useAgents();
  const { wallet, balance, isLoading: walletLoading } = useWallet();
  const { unreadCount } = useNotifications();
  const { user, isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadCampaigns();
    setRefreshing(false);
  }, [loadCampaigns]);

  // Calculate KPIs
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const runningAgents = agents.filter(a => a.status === 'running').length;

  if (!isAuthenticated) {
    return <AuthRequiredScreen navigation={navigation} />;
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[K.mint]} />
      }
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[themeTypography.headlineMedium, { color: colors.onSurface }]}>
            Good {getTimeOfDay()}, {user?.firstName || 'there'}
          </Text>
          <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            Here's what's happening with your campaigns
          </Text>
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.badgeContainer}>
              <IconButton
                icon="bell"
                size={24}
                color={colors.onSurface}
                onPress={() => navigation.navigate('Notifications')}
              />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarContainer}>
            <Avatar.Text size={32} label={user?.firstName?.[0] || 'U'} backgroundColor={K.mint} />
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.sectionHeader}>
        <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>Overview</Text>
      </View>

      <View style={styles.kpiGrid}>
        <KPICard
          title="Active Campaigns"
          value={activeCampaigns}
          trend={activeCampaigns > 5 ? 'up' : 'stable'}
          icon="campaign"
          color={K.blue}
          onPress={() => navigation.navigate('Campaigns')}
        />
        <KPICard
          title="Total ROAS"
          value={`${avgRoas.toFixed(2)}x`}
          trend={avgRoas > 3 ? 'up' : avgRoas > 1 ? 'stable' : 'down'}
          icon="trending-up"
          color={K.mint}
          onPress={() => navigation.navigate('Analytics')}
        />
        <KPICard
          title="Total Spend"
          value={formatCurrency(totalSpend)}
          trend={totalSpend > 10000 ? 'up' : 'stable'}
          icon="currency-usd"
          color={K.gold}
          onPress={() => navigation.navigate('Wallet')}
        />
        <KPICard
          title="Active Agents"
          value={`${runningAgents}/${agents.length}`}
          trend={runningAgents > 0 ? 'up' : 'down'}
          icon="robot"
          color={K.teal}
          onPress={() => navigation.navigate('Agents')}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>Quick Actions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Campaigns')} style={styles.seeAll}>
            <Text style={[themeTypography.labelMedium, { color: K.blue }]}>See All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quickActionsGrid}>
        <QuickActionButton
          title="Create Campaign"
          subtitle="Launch new campaign"
          icon="plus-circle"
          color={K.blue}
          onPress={() => navigation.navigate('CreateCampaign')}
        />
        <QuickActionButton
          title="Review Bids"
          subtitle={campaigns.filter(c => c.status === 'active').length + ' pending'}
          icon="gavel"
          color={K.gold}
          onPress={() => navigation.navigate('Bidding')}
        />
        <QuickActionButton
          title="Check Wallet"
          subtitle={formatCurrency(balance)}
          icon="wallet"
          color={K.mint}
          onPress={() => navigation.navigate('Wallet')}
        />
        <QuickActionButton
          title="View Analytics"
          subtitle="Performance insights"
          icon="chart-line"
          color={K.teal}
          onPress={() => navigation.navigate('Analytics')}
        />
      </View>

      {/* Recent Campaigns */}
      {campaigns.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>Recent Campaigns</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Campaigns')} style={styles.seeAll}>
                <Text style={[themeTypography.labelMedium, { color: K.blue }]}>See All</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.campaignsList}>
            {campaigns.slice(0, 3).map((campaign) => (
              <CampaignRow
                key={campaign.id}
                campaign={campaign}
                onPress={() => navigation.navigate('CampaignDetail', { id: campaign.id })}
              />
            ))}
          </View>
        </>
      )}

      {/* Active Agents */}
      {agents.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>Active Agents</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Agents')} style={styles.seeAll}>
                <Text style={[themeTypography.labelMedium, { color: K.blue }]}>See All</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.agentsList}>
            {agents.slice(0, 3).map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                onPress={() => navigation.navigate('AgentDetail', { id: agent.id })}
              />
            ))}
          </View>
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// KPI Card Component
const KPICard = ({ title, value, trend, icon, color, onPress }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  
  const trendColors = {
    up: K.mint,
    down: K.danger,
    stable: K.blue,
  };

  return (
    <TouchableOpacity onPress={onPress} style={[styles.kpiCard, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIcon, { backgroundColor: color + '20' }]}>
          <Text style={{ fontSize: 24, color }}>📊</Text>
        </View>
        <View style={[styles.kpiTrend, { backgroundColor: trendColors[trend] + '20' }]}>
          <Text style={[themeTypography.labelSmall, { color: trendColors[trend], fontWeight: '600' }]}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </Text>
        </View>
      </View>
      <Text style={[themeTypography.headlineSmall, { color: colors.onSurface, fontWeight: '700' }]}>{value}</Text>
      <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant }]}>{title}</Text>
    </TouchableOpacity>
  );
};

// Quick Action Button
const QuickActionButton = ({ title, subtitle, icon, color, onPress }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} style={[styles.quickActionBtn, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 28, color }}>⚡</Text>
      </View>
      <View style={styles.quickActionContent}>
        <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{title}</Text>
        <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>
      </View>
      <View style={[styles.quickActionArrow, { borderLeftColor: colors.outline }]} />
    </TouchableOpacity>
  );
};

// Campaign Row
const CampaignRow = ({ campaign, onPress }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  const statusColors = {
    active: K.mint,
    paused: K.gold,
    completed: K.blue,
    draft: K.t3,
    rejected: K.danger,
  };

  const roas = campaign.spend > 0 ? (campaign.revenue / campaign.spend).toFixed(2) : '0.00';

  return (
    <TouchableOpacity onPress={onPress} style={[styles.campaignRow, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={styles.campaignMain}>
        <View style={styles.campaignInfo}>
          <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{campaign.name}</Text>
          <View style={styles.campaignMeta}>
            <Chip style={styles.campaignChip}>
              <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>{campaign.platform}</Text>
            </Chip>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[campaign.status] + '20' }]}>
              <Text style={[themeTypography.labelSmall, { color: statusColors[campaign.status], fontWeight: '600' }]}>
                {campaign.status}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.campaignStats}>
          <View style={styles.stat}>
            <Text style={[themeTypography.headlineSmall, { color: colors.onSurface, fontWeight: '700' }]}>{roas}x</Text>
            <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>ROAS</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[themeTypography.headlineSmall, { color: colors.onSurface, fontWeight: '700' }]}>{formatCurrency(campaign.spend)}</Text>
            <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Spend</Text>
          </View>
        </View>
      </View>
      <View style={[styles.chevron, { borderLeftColor: colors.outline }]} />
    </TouchableOpacity>
  );
};

// Agent Row
const AgentRow = ({ agent, onPress }) => {
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

  return (
    <TouchableOpacity onPress={onPress} style={[styles.agentRow, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={styles.agentMain}>
        <View style={styles.agentInfo}>
          <View style={styles.agentHeader}>
            <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{agent.name}</Text>
            <View style={[styles.agentStatus, { backgroundColor: statusColors[agent.status] + '20' }]}>
              <Text style={[themeTypography.labelSmall, { color: statusColors[agent.status], fontWeight: '600' }]}>
                {statusIcons[agent.status]} {agent.status}
              </Text>
            </View>
          </View>
          <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant }]}>{agent.type} • {agent.actionCount} actions</Text>
        </View>
        <View style={styles.agentStats}>
          <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant }]}>Last: {agent.lastAction || 'Never'}</Text>
        </View>
      </View>
      <View style={[styles.chevron, { borderLeftColor: colors.outline }]} />
    </TouchableOpacity>
  );
};

// Auth Required Screen
const AuthRequiredScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  return (
    <View style={[styles.authContainer, { backgroundColor: colors.background }]}>
      <View style={styles.authCard}>
        <Text style={[themeTypography.displaySmall, { color: colors.onSurface, textAlign: 'center', marginBottom: 16 }]}>
          Welcome to KIKI
        </Text>
        <Text style={[themeTypography.bodyLarge, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 32 }]}>
          Please sign in to access your campaigns, agents, and analytics
        </Text>
        <Button
          mode="contained"
          style={styles.authButton}
          onPress={() => navigation.navigate('Login')}
        >
          Sign In
        </Button>
      </View>
    </View>
  );
};

// Helper functions
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: K.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  avatarContainer: {
    width: 40,
    height: 40,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    padding: spacing.xs,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: '48%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTrend: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  quickActionsGrid: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 12,
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  campaignsList: {
    gap: spacing.sm,
  },
  campaignRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  campaignMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  campaignChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  campaignStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    alignItems: 'flex-end',
  },
  chevron: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 12,
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  agentsList: {
    gap: spacing.sm,
  },
  agentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  agentMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  agentInfo: {
    flex: 1,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  agentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  agentStats: {
    alignItems: 'flex-end',
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
  bottomSpacer: {
    height: spacing.xxl,
  },
});

export default DashboardScreen;