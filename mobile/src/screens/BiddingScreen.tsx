// Bidding Screen - Bid Approval/Rejection Interface
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert, Animated } from 'react-native';
import { Card, Chip, Button, IconButton, Avatar, Badge, Divider } from 'react-native-paper';
import { useCampaigns } from '../hooks/useCampaigns';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { K, spacing, borderRadius, shadows, typography } from '../theme';
import { formatCurrency, formatNumber, formatPercentage, formatRelativeTime } from '../utils/formatters';

interface BidItem {
  id: string;
  campaignId: string;
  campaignName: string;
  platform: string;
  currentBid: number;
  suggestedBid: number;
  changePercent: number;
  reason: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  campaignRoas: number;
  campaignSpend: number;
}

const BiddingScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  const { isAuthenticated } = useAuth();
  const [bids, setBids] = useState<BidItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, totalChange: 0 });

  // Mock bid data - in real app would come from API
  const mockBids: BidItem[] = [
    {
      id: 'bid_1',
      campaignId: 'camp_1',
      campaignName: 'Summer Sale - Meta',
      platform: 'meta',
      currentBid: 2.45,
      suggestedBid: 2.85,
      changePercent: 16.3,
      reason: 'ROAS trending up 23% this week. Competitor bidding increased.',
      confidence: 87,
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      campaignRoas: 3.2,
      campaignSpend: 12500,
    },
    {
      id: 'bid_2',
      campaignId: 'camp_2',
      campaignName: 'Brand Awareness - Google',
      platform: 'google',
      currentBid: 4.20,
      suggestedBid: 3.85,
      changePercent: -8.3,
      reason: 'CPA increased 15% above target. Reducing bid to maintain efficiency.',
      confidence: 92,
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      campaignRoas: 2.1,
      campaignSpend: 8900,
    },
    {
      id: 'bid_3',
      campaignId: 'camp_3',
      campaignName: 'Product Launch - TikTok',
      platform: 'tiktok',
      currentBid: 1.75,
      suggestedBid: 2.10,
      changePercent: 20.0,
      reason: 'High engagement rate (8.2%). Scaling bid for viral potential.',
      confidence: 78,
      status: 'pending',
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      campaignRoas: 4.5,
      campaignSpend: 3200,
    },
    {
      id: 'bid_4',
      campaignId: 'camp_4',
      campaignName: 'Retargeting - Meta',
      platform: 'meta',
      currentBid: 3.50,
      suggestedBid: 3.50,
      changePercent: 0,
      reason: 'Performance stable. Maintaining current bid.',
      confidence: 95,
      status: 'approved',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      campaignRoas: 2.8,
      campaignSpend: 15600,
    },
    {
      id: 'bid_5',
      campaignId: 'camp_5',
      campaignName: 'Search - Google',
      platform: 'google',
      currentBid: 5.80,
      suggestedBid: 5.20,
      changePercent: -10.3,
      reason: 'Keyword quality score dropped. Reducing bid to maintain position.',
      confidence: 89,
      status: 'rejected',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      campaignRoas: 1.9,
      campaignSpend: 22400,
    },
  ];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    loadBids();
    setRefreshing(false);
  }, []);

  const loadBids = () => {
    setBids(mockBids);
    updateStats();
  };

  const updateStats = () => {
    const pending = bids.filter(b => b.status === 'pending').length;
    const approved = bids.filter(b => b.status === 'approved').length;
    const rejected = bids.filter(b => b.status === 'rejected').length;
    const totalChange = bids.reduce((sum, b) => sum + b.changePercent, 0);
    setStats({ pending, approved, rejected, totalChange });
  };

  const filteredBids = bids.filter(bid => 
    filter === 'all' || bid.status === filter
  );

  const handleApprove = async (bidId: string) => {
    const bid = bids.find(b => b.id === bidId);
    if (!bid) return;

    Alert.alert(
      'Approve Bid Change?',
      `Increase bid from $${bid.currentBid.toFixed(2)} to $${bid.suggestedBid.toFixed(2)} (${bid.changePercent > 0 ? '+' : ''}${bid.changePercent.toFixed(1)}%)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Approve', 
          style: 'default',
          onPress: () => {
            setBids(bids.map(b => b.id === bidId ? { ...b, status: 'approved' } : b));
            updateStats();
          }
        }
      ]
    );
  };

  const handleReject = async (bidId: string) => {
    const bid = bids.find(b => b.id === bidId);
    if (!bid) return;

    Alert.alert(
      'Reject Bid Change?',
      `Reject ${bid.changePercent > 0 ? 'increase' : 'decrease'} from $${bid.currentBid.toFixed(2)} to $${bid.suggestedBid.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: () => {
            setBids(bids.map(b => b.id === bidId ? { ...b, status: 'rejected' } : b));
            updateStats();
          }
        }
      ]
    );
  };

  const handleAutoApprove = () => {
    const pendingBids = bids.filter(b => b.status === 'pending' && b.confidence >= 85);
    if (pendingBids.length === 0) {
      Alert.alert('No High-Confidence Bids', 'No pending bids with 85%+ confidence to auto-approve');
      return;
    }

    Alert.alert(
      `Auto-Approve ${pendingBids.length} Bids?`,
      `Approve all ${pendingBids.length} high-confidence (85%+) bid changes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Approve All', 
          onPress: () => {
            setBids(bids.map(b => 
              pendingBids.some(pb => pb.id === b.id) ? { ...b, status: 'approved' } : b
            ));
            updateStats();
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadBids();
  }, []);

  if (!isAuthenticated) {
    return <AuthRequiredScreen navigation={navigation} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[themeTypography.headlineMedium, { color: colors.onSurface }]}>Bid Review</Text>
          <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            {stats.pending} pending • {stats.approved} approved • {stats.rejected} rejected
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Button
            mode="outlined"
            style={styles.autoBtn}
            onPress={handleAutoApprove}
            disabled={stats.pending === 0}
            icon="auto-fix"
          >
            Auto-Approve
          </Button>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <StatCard
          title="Pending Review"
          value={stats.pending}
          color={K.gold}
          icon="clock-alert"
        />
        <StatCard
          title="Approved Today"
          value={stats.approved}
          color={K.mint}
          icon="check-circle"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          color={K.danger}
          icon="close-circle"
        />
        <StatCard
          title="Avg Change"
          value={`${stats.totalChange / (bids.length || 1) >= 0 ? '+' : ''}${(stats.totalChange / (bids.length || 1)).toFixed(1)}%`}
          color={stats.totalChange >= 0 ? K.mint : K.danger}
          icon="trending-up"
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab)}
            style={[
              styles.filterTab,
              filter === tab && styles.filterTabActive,
            ]}
          >
            <Text style={[
              themeTypography.labelMedium,
              { 
                color: filter === tab ? colors.primary : colors.onSurfaceVariant,
                fontWeight: filter === tab ? '600' : '400',
              }
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {tab !== 'all' && stats[tab] > 0 && (
              <Badge style={styles.filterBadge}>
                {stats[tab]}
              </Badge>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Bids List */}
      <FlatList
        data={filteredBids}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BidCard
            bid={item}
            onApprove={() => handleApprove(item.id)}
            onReject={() => handleReject(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[themeTypography.headlineSmall, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.sm }]}>
              {filter === 'all' ? 'No bid changes' : `No ${filter} bids`}
            </Text>
            <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.lg }]}>
              {filter === 'all' 
                ? 'No bid changes suggested at this time'
                : `All ${filter} bids will appear here`}
            </Text>
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

// Bid Card Component
const BidCard = ({ bid, onApprove, onReject }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  const platformColors = {
    meta: '#1877F2',
    google: '#4285F4',
    tiktok: '#000000',
    snap: '#FFFC00',
    linkedin: '#0A66C2',
    pinterest: '#E60023',
  };

  const statusColors = {
    pending: K.gold,
    approved: K.mint,
    rejected: K.danger,
  };

  const statusIcons = {
    pending: '⏳',
    approved: '✅',
    rejected: '❌',
  };

  const isIncrease = bid.changePercent > 0;

  return (
    <Card style={[styles.bidCard, { backgroundColor: colors.surface }]} elevation={2}>
      {/* Header */}
      <View style={styles.bidHeader}>
        <View style={styles.bidCampaignInfo}>
          <View style={[styles.platformBadge, { backgroundColor: platformColors[bid.platform] || K.blue }]}>
            <Text style={styles.platformBadgeText}>{bid.platform.toUpperCase()}</Text>
          </View>
          <View style={styles.campaignInfo}>
            <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{bid.campaignName}</Text>
            <View style={styles.campaignMeta}>
              <Badge style={styles.statusBadge}>
                {statusIcons[bid.status]} {bid.status}
              </Badge>
              <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>
                ROAS: {bid.campaignRoas.toFixed(1)}x • Spend: {formatCurrency(bid.campaignSpend)}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadgeLarge, { backgroundColor: statusColors[bid.status] + '20' }]}>
          <Text style={[themeTypography.labelMedium, { color: statusColors[bid.status], fontWeight: '700' }]}>
            {statusIcons[bid.status]} {bid.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Bid Details */}
      <View style={styles.bidDetails}>
        <View style={styles.bidComparison}>
          <View style={styles.bidValue}>
            <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Current Bid</Text>
            <Text style={[themeTypography.headlineMedium, { color: colors.onSurface, fontWeight: '700' }]}>
              ${bid.currentBid.toFixed(2)}
            </Text>
          </View>
          <View style={styles.bidArrow}>
            <Text style={{ fontSize: 24, color: isIncrease ? K.mint : K.danger }}>
              {isIncrease ? '↑' : '↓'}
            </Text>
            <Text style={[themeTypography.labelMedium, { color: isIncrease ? K.mint : K.danger, fontWeight: '700' }]}>
              {isIncrease ? '+' : ''}{bid.changePercent.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.bidValue}>
            <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Suggested</Text>
            <Text style={[themeTypography.headlineMedium, { color: isIncrease ? K.mint : K.danger, fontWeight: '700' }]}>
              ${bid.suggestedBid.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Confidence & Reason */}
        <View style={styles.bidMeta}>
          <View style={styles.confidence}>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  { width: `${bid.confidence}%`, backgroundColor: bid.confidence >= 85 ? K.mint : bid.confidence >= 70 ? K.gold : K.danger }
                ]}
              />
            </View>
            <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Confidence: {bid.confidence}%</Text>
          </View>
          <View style={styles.reason}>
            <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Reason</Text>
            <Text style={[themeTypography.bodySmall, { color: colors.onSurface, marginTop: spacing.xs }]}>{bid.reason}</Text>
          </View>
        </View>

        {/* Actions */}
        {bid.status === 'pending' && (
          <View style={styles.bidActions}>
            <Button
              mode="outlined"
              style={styles.rejectBtn}
              onPress={onReject}
              icon="close"
            >
              Reject
            </Button>
            <Button
              mode="contained"
              style={styles.approveBtn}
              onPress={onApprove}
              icon="check"
            >
              Approve
            </Button>
          </View>
        )}

        {/* Timestamp */}
        <View style={styles.bidFooter}>
          <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>
            Suggested {formatRelativeTime(bid.createdAt)}
          </Text>
        </View>
      </View>
    </Card>
  );
};

// Stat Card Component
const StatCard = ({ title, value, color, icon }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 24, color }}>📊</Text>
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
        <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 32 }]}>Please sign in to review bids</Text>
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
  autoBtn: {
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
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: '#1f2937',
  },
  filterTabActive: {
    backgroundColor: K.blue + '30',
  },
  filterBadge: {
    backgroundColor: K.blue,
  },
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
  bidCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  bidCampaignInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  platformBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  campaignInfo: {
    flex: 1,
    minWidth: 0,
  },
  campaignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeLarge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  bidDetails: {
    padding: spacing.md,
  },
  bidComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  bidValue: {
    alignItems: 'center',
  },
  bidArrow: {
    alignItems: 'center',
  },
  bidMeta: {
    marginBottom: spacing.md,
  },
  confidence: {
    flex: 1,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#1f2937',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  reason: {
    flex: 1,
    marginLeft: spacing.md,
  },
  bidActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  rejectBtn: {
    flex: 1,
    borderColor: K.danger,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: K.mint,
  },
  bidFooter: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
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

export default BiddingScreen;