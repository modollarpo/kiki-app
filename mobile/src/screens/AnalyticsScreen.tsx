// Analytics Screen - Performance Analytics & Visualizations
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, RefreshControl, FlatList } from 'react-native';
import { Card, Chip, Button, IconButton, Badge, SegmentedButtons } from 'react-native-paper';
import { useCampaigns } from '../hooks/useCampaigns';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { K, spacing, borderRadius, shadows, typography } from '../theme';
import { formatCurrency, formatNumber, formatPercentage, formatRelativeTime, formatDate } from '../utils/formatters';

interface AnalyticsMetric {
  name: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

interface TimeSeriesData {
  date: string;
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  impressions: number;
  clicks: number;
}

interface PlatformData {
  platform: string;
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  cpa: number;
  ctr: number;
  color: string;
}

const AnalyticsScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  const { campaigns, isLoading, loadCampaigns } = useCampaigns();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'roas' | 'spend' | 'revenue' | 'conversions' | 'cpa' | 'ctr'>('roas');

  // Mock analytics data
  const mockMetrics: AnalyticsMetric[] = [
    { name: 'Total ROAS', value: '3.24x', change: 12.5, trend: 'up', color: K.mint },
    { name: 'Total Spend', value: '$47.8K', change: 8.2, trend: 'up', color: K.blue },
    { name: 'Total Revenue', value: '$155.2K', change: 15.7, trend: 'up', color: K.mint },
    { name: 'Conversions', value: '3,247', change: -3.2, trend: 'down', color: K.gold },
    { name: 'Avg CPA', value: '$14.72', change: -5.1, trend: 'up', color: K.mint },
    { name: 'Avg CTR', value: '2.34%', change: 1.8, trend: 'up', color: K.teal },
  ];

  const mockTimeSeries: TimeSeriesData[] = [
    { date: '2024-01-15', spend: 1200, revenue: 3800, roas: 3.17, conversions: 85, impressions: 45000, clicks: 1200 },
    { date: '2024-01-16', spend: 1350, revenue: 4200, roas: 3.11, conversions: 92, impressions: 48000, clicks: 1350 },
    { date: '2024-01-17', spend: 1100, revenue: 3500, roas: 3.18, conversions: 78, impressions: 42000, clicks: 1100 },
    { date: '2024-01-18', spend: 1450, revenue: 4800, roas: 3.31, conversions: 105, impressions: 52000, clicks: 1450 },
    { date: '2024-01-19', spend: 1300, revenue: 4100, roas: 3.15, conversions: 89, impressions: 46000, clicks: 1280 },
    { date: '2024-01-20', spend: 1600, revenue: 5200, roas: 3.25, conversions: 112, impressions: 55000, clicks: 1520 },
    { date: '2024-01-21', spend: 1250, revenue: 3900, roas: 3.12, conversions: 87, impressions: 44000, clicks: 1180 },
  ];

  const mockPlatforms: PlatformData[] = [
    { platform: 'Meta', spend: 18500, revenue: 62000, roas: 3.35, conversions: 1240, cpa: 14.92, ctr: 2.45, color: '#1877F2' },
    { platform: 'Google', spend: 15200, revenue: 48500, roas: 3.19, conversions: 980, cpa: 15.51, ctr: 3.12, color: '#4285F4' },
    { platform: 'TikTok', spend: 8900, revenue: 32000, roas: 3.60, conversions: 680, cpa: 13.09, ctr: 4.21, color: '#000000' },
    { platform: 'Snapchat', spend: 3200, revenue: 8500, roas: 2.66, conversions: 210, cpa: 15.24, ctr: 1.87, color: '#FFFC00' },
    { platform: 'LinkedIn', spend: 2000, revenue: 4200, roas: 2.10, conversions: 85, cpa: 23.53, ctr: 0.92, color: '#0A66C2' },
  ];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadCampaigns();
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
  }, [loadCampaigns]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Calculate totals
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const avgCtr = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0) / 
    Math.max(campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0), 1) * 100;

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
          <Text style={[themeTypography.headlineMedium, { color: colors.onSurface }]}>Analytics</Text>
          <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            Performance insights & trends
          </Text>
        </View>
        <View style={styles.headerRight}>
          <SegmentedButtons
            value={timeRange}
            onValueChange={setTimeRange}
            direction="horizontal"
            style={styles.segmentedButtons}
          >
            <SegmentedButtons.Button value="7d" style={styles.segmentButton}>7D</SegmentedButtons.Button>
            <SegmentedButtons.Button value="30d" style={styles.segmentButton}>30D</SegmentedButtons.Button>
            <SegmentedButtons.Button value="90d" style={styles.segmentButton}>90D</SegmentedButtons.Button>
            <SegmentedButtons.Button value="all" style={styles.segmentButton}>All</SegmentedButtons.Button>
          </SegmentedButtons>
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.sectionHeader}>
        <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>Key Metrics</Text>
      </View>

      <View style={styles.kpiGrid}>
        {mockMetrics.map((metric) => (
          <MetricCard key={metric.name} metric={metric} />
        ))}
      </View>

      {/* Platform Performance */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>Platform Performance</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Campaigns')} style={styles.seeAll}>
            <Text style={[themeTypography.labelMedium, { color: K.blue }]}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.platformsList}>
        {mockPlatforms.map((platform) => (
          <PlatformCard key={platform.platform} platform={platform} />
        ))}
      </View>

      {/* Trend Chart Placeholder */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>Trends</Text>
          <SegmentedButtons
            value={selectedMetric}
            onValueChange={setSelectedMetric}
            direction="horizontal"
            style={styles.metricSegmentedButtons}
          >
            <SegmentedButtons.Button value="roas" style={styles.metricSegmentButton}>ROAS</SegmentedButtons.Button>
            <SegmentedButtons.Button value="spend" style={styles.metricSegmentButton}>Spend</SegmentedButtons.Button>
            <SegmentedButtons.Button value="revenue" style={styles.metricSegmentButton}>Revenue</SegmentedButtons.Button>
            <SegmentedButtons.Button value="conversions" style={styles.metricSegmentButton}>Conv.</SegmentedButtons.Button>
          </SegmentedButtons>
        </View>
      </View>

      <Card style={[styles.chartCard, { backgroundColor: colors.surface }]} elevation={2}>
        <View style={styles.chartContainer}>
          <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.lg }]}>
            📈 {selectedMetric.toUpperCase()} Trend Chart
          </Text>
          <View style={styles.chartPlaceholder}>
            <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>
              Interactive chart would be rendered here using react-native-svg-charts or similar library
            </Text>
            <View style={styles.miniChart}>
              {mockTimeSeries.map((point, index) => (
                <View
                  key={index}
                  style={[
                    styles.chartBar,
                    {
                      height: Math.max(
                        (point[selectedMetric as keyof TimeSeriesData] as number) / 
                        Math.max(...mockTimeSeries.map(p => p[selectedMetric as keyof TimeSeriesData] as number)) * 100,
                        20
                      ),
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </Card>

      {/* Attribution & Funnel */}
      <View style={styles.sectionHeader}>
        <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>Attribution & Funnel</Text>
      </View>

      <View style={styles.attributionGrid}>
        <Card style={[styles.attributionCard, { backgroundColor: colors.surface }]} elevation={2}>
          <View style={styles.cardHeader}>
            <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>Attribution Model</Text>
          </View>
          <View style={styles.attributionList}>
            <AttributionRow model="Last Click" conversions={Math.round(totalConversions * 0.506)} share="50.6%" color={K.blue} />
            <AttributionRow model="First Touch" conversions={Math.round(totalConversions * 0.269)} share="26.9%" color={K.teal} />
            <AttributionRow model="Data-Driven" conversions={Math.round(totalConversions * 0.225)} share="22.5%" color={K.mint} />
          </View>
        </Card>

        <Card style={[styles.attributionCard, { backgroundColor: colors.surface }]} elevation={2}>
          <View style={styles.cardHeader}>
            <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>Conversion Funnel</Text>
          </View>
          <View style={styles.funnelList}>
            <FunnelRow stage="Impressions" value={campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0)} pct={100} color={K.blue} />
            <FunnelRow stage="Clicks" value={campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0)} pct={avgCtr} color={K.teal} />
            <FunnelRow stage="Leads" value={Math.round(campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0) * 0.15)} pct={15} color={K.gold} />
            <FunnelRow stage="Conversions" value={totalConversions} pct={avgCtr * 0.15} color={K.mint} />
          </View>
        </Card>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// Metric Card Component
const MetricCard = ({ metric }: { metric: AnalyticsMetric }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  
  return (
    <TouchableOpacity style={[styles.metricCard, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: metric.color + '20' }]}>
          <Text style={{ fontSize: 24, color: metric.color }}>📊</Text>
        </View>
        <View style={[styles.metricTrend, { backgroundColor: metric.color + '20' }]}>
          <Text style={[themeTypography.labelSmall, { color: metric.color, fontWeight: '600' }]}>
            {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'} {Math.abs(metric.change).toFixed(1)}%
          </Text>
        </View>
      </View>
      <Text style={[themeTypography.headlineSmall, { color: metric.color, fontWeight: '700' }]}>{metric.value}</Text>
      <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant }]}>{metric.name}</Text>
    </TouchableOpacity>
  );
};

// Platform Card Component
const PlatformCard = ({ platform }: { platform: PlatformData }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  return (
    <TouchableOpacity style={[styles.platformCard, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={styles.platformHeader}>
        <View style={styles.platformInfo}>
          <View style={[styles.platformDot, { backgroundColor: platform.color }]} />
          <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{platform.platform}</Text>
        </View>
        <View style={[styles.platformRoas, { backgroundColor: platform.roas >= 3 ? K.mint + '20' : platform.roas >= 1 ? K.gold + '20' : K.danger + '20' }]}>
          <Text style={[themeTypography.labelMedium, { color: platform.roas >= 3 ? K.mint : platform.roas >= 1 ? K.gold : K.danger, fontWeight: '700' }]}>
            {platform.roas.toFixed(2)}x
          </Text>
        </View>
      </View>

      <View style={styles.platformStats}>
        <PlatformStat label="Spend" value={formatCurrency(platform.spend)} color={colors.onSurface} />
        <PlatformStat label="Revenue" value={formatCurrency(platform.revenue)} color={K.mint} />
        <PlatformStat label="Conversions" value={formatNumber(platform.conversions)} color={colors.onSurface} />
        <PlatformStat label="CPA" value={formatCurrency(platform.cpa)} color={K.gold} />
        <PlatformStat label="CTR" value={`${platform.ctr.toFixed(2)}%`} color={K.teal} />
      </View>

      <View style={styles.platformProgress}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(platform.roas / 5, 1) * 100}%`, backgroundColor: platform.color }
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Attribution Row
const AttributionRow = ({ model, conversions, share, color }: { model: string; conversions: number; share: string; color: string }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <TouchableOpacity style={styles.attributionRow} activeOpacity={0.8}>
      <View style={[styles.attributionColor, { backgroundColor: color }]} />
      <View style={styles.attributionInfo}>
        <Text style={[themeTypography.bodyMedium, { color: colors.onSurface, fontWeight: '500' }]}>{model}</Text>
        <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>{formatNumber(conversions)} conversions</Text>
      </View>
      <View style={styles.attributionShare}>
        <Text style={[themeTypography.bodyMedium, { color: color, fontWeight: '700' }]}>{share}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Platform Stat Row
const PlatformStat = ({ label, value, color }: { label: string; value: string; color: string }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <View style={styles.platformStat}>
      <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[themeTypography.bodyMedium, { color, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
};

// Funnel Row
const FunnelRow = ({ stage, value, pct, color }: { stage: string; value: number; pct: number; color: string }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <View style={styles.funnelRow}>
      <View style={styles.funnelStage}>
        <View style={[styles.funnelDot, { backgroundColor: color }]} />
        <Text style={[themeTypography.bodyMedium, { color: colors.onSurface, fontWeight: '500' }]}>{stage}</Text>
      </View>
      <View style={styles.funnelValue}>
        <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{formatNumber(value)}</Text>
        <Text style={[themeTypography.labelSmall, { color: color, fontWeight: '600' }]}>{pct.toFixed(1)}%</Text>
      </View>
      <View style={[
        styles.funnelBar,
        { width: `${Math.min(pct, 100)}%`, backgroundColor: color }
      ]} />
    </View>
  );
};

// Auth Required Screen
const AuthRequiredScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <View style={[styles.authContainer, { backgroundColor: colors.background }]}>
      <View style={styles.authCard}>
        <Text style={[themeTypography.displaySmall, { color: colors.onSurface, textAlign: 'center', marginBottom: 16 }]}>Sign In Required</Text>
        <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 32 }]}>Please sign in to view analytics</Text>
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
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    minWidth: 200,
  },
  segmentedButtons: {
    backgroundColor: '#1f2937',
    borderRadius: borderRadius.md,
  },
  segmentButton: {
    paddingHorizontal: spacing.md,
  },
  metricSegmentedButtons: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: borderRadius.md,
  },
  metricSegmentButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '48%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricTrend: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  platformsList: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  platformCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  platformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  platformDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  platformRoas: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  platformStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.md,
  },
  platformStat: {
    flex: 1,
    minWidth: '48%',
    gap: spacing.xs,
  },
  platformProgress: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#1f2937',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  chartCard: {
    marginBottom: spacing.lg,
  },
  chartContainer: {
    padding: spacing.lg,
  },
  chartPlaceholder: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: spacing.lg,
    height: 80,
  },
  chartBar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 20,
  },
  attributionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  attributionCard: {
    flex: 1,
    minWidth: 300,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardHeader: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  attributionList: {
    padding: spacing.md,
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  attributionColor: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  attributionInfo: {
    flex: 1,
  },
  attributionShare: {
    marginLeft: spacing.md,
  },
  funnelList: {
    padding: spacing.md,
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  funnelStage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 100,
  },
  funnelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  funnelValue: {
    flex: 1,
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  funnelBar: {
    height: 6,
    borderRadius: 3,
    width: 100,
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

export default AnalyticsScreen;