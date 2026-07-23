// Campaign Detail Screen
import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Card, Chip, Button, IconButton, Title, Paragraph, Divider } from 'react-native-paper';
import { useCampaign } from '../hooks/useCampaigns';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { K, spacing, borderRadius, shadows, typography } from '../theme';
import { formatCurrency, formatNumber, formatPercentage, formatRelativeTime, formatDate } from '../utils/formatters';

const CampaignDetailScreen = ({ route, navigation }) => {
  const { campaign, isLoading, loadCampaign, error } = useCampaign(route.params?.id);
  const { theme, colors, typography: themeTypography } = useTheme();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handlePauseCampaign = useCallback(() => {
    Alert.alert(
      'Pause Campaign',
      'Are you sure you want to pause this campaign?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pause', style: 'destructive', onPress: () => { /* pause logic */ } },
      ]
    );
  }, []);

  const handleResumeCampaign = useCallback(() => {
    Alert.alert(
      'Resume Campaign',
      'Are you sure you want to resume this campaign?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resume', onPress: () => { /* resume logic */ } },
      ]
    );
  }, []);

  const handleDuplicateCampaign = useCallback(() => {
    navigation.navigate('CreateCampaign', { campaign });
  }, [navigation, campaign]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadCampaign(route.params?.id);
    setRefreshing(false);
  }, [loadCampaign, route.params?.id]);

  useEffect(() => {
    if (route.params?.id) {
      loadCampaign(route.params?.id);
    }
  }, [route.params?.id, loadCampaign]);

  if (!isAuthenticated) {
    return <AuthRequiredScreen navigation={navigation} />;
  }

  if (isLoading && !campaign) {
    return <LoadingScreen />;
  }

  if (!campaign) {
    return <ErrorScreen message="Campaign not found" onRetry={() => navigation.goBack()} />;
  }

  const roas = campaign.spend > 0 ? (campaign.revenue / campaign.spend).toFixed(2) : '0.00';
  const cpa = campaign.conversions > 0 ? (campaign.spend / campaign.conversions).toFixed(2) : '0.00';
  const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00';
  const budgetUsed = campaign.budget ? (campaign.spend / campaign.budget) * 100 : 0;
  const budgetRemaining = campaign.budget ? campaign.budget - campaign.spend : 0;

  const statusColors = {
    active: K.mint,
    paused: K.gold,
    completed: K.blue,
    draft: K.t3,
    rejected: K.danger,
  };

  const platformColors = {
    meta: '#1877F2',
    google: '#4285F4',
    tiktok: '#000000',
    snap: '#FFFC00',
    linkedin: '#0A66C2',
    pinterest: '#E60023',
  };

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <IconButton icon="arrow-left" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.platformBadge, { backgroundColor: platformColors[campaign.platform] || K.blue }]}>
            <Text style={styles.platformBadgeText}>{campaign.platform.toUpperCase()}</Text>
          </View>
          <Text style={[themeTypography.headlineSmall, { color: colors.onSurface, fontWeight: '700', marginLeft: spacing.md }]}>
            {campaign.name}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[campaign.status] + '20' }]}>
            <Text style={[themeTypography.labelSmall, { color: statusColors[campaign.status], fontWeight: '600' }]}>
              {campaign.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <KPICard title="ROAS" value={`${roas}x`} color={parseFloat(roas) >= 3 ? K.mint : parseFloat(roas) >= 1 ? K.gold : K.danger} icon="trending-up" />
        <KPICard title="Spend" value={formatCurrency(campaign.spend)} color={K.blue} icon="currency-usd" />
        <KPICard title="Revenue" value={formatCurrency(campaign.revenue)} color={K.mint} icon="cash-multiple" />
        <KPICard title="Conversions" value={formatNumber(campaign.conversions)} color={K.teal} icon="check-circle" />
      </View>

      {/* Secondary Metrics */}
      <View style={styles.kpiGrid}>
        <KPICard title="CPA" value={formatCurrency(parseFloat(cpa))} color={K.gold} icon="calculator" />
        <KPICard title="CTR" value={`${ctr}%`} color={K.blue} icon="mouse" />
        <KPICard title="Impressions" value={formatNumber(campaign.impressions)} color={K.t3} icon="eye" />
        <KPICard title="Clicks" value={formatNumber(campaign.clicks)} color={K.blue} icon="cursor-pointer" />
      </View>

      {/* Budget Progress */}
      {campaign.budget && (
        <Card style={[styles.budgetCard, { backgroundColor: colors.surface }]} elevation={2}>
          <View style={styles.budgetHeader}>
            <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>Budget</Text>
            <View style={styles.budgetHeaderRight}>
              <Text style={[themeTypography.bodyMedium, { color: budgetUsed > 100 ? K.danger : colors.onSurface }]}>
                {formatCurrency(campaign.spend)} / {formatCurrency(campaign.budget)}
              </Text>
            </View>
          </View>
          <View style={styles.budgetProgress}>
            <View style={styles.budgetLabels}>
              <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Used: {budgetUsed.toFixed(0)}%</Text>
              <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>{formatCurrency(budgetRemaining)} remaining</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(budgetUsed, 100)}%`,
                    backgroundColor: budgetUsed > 100 ? K.danger : K.blue,
                  },
                ]}
              />
            </View>
          </View>
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actionsSection}>
        <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600', marginBottom: spacing.md }]}>
          Actions
        </Text>
        <View style={styles.actionsGrid}>
          {campaign.status === 'active' && (
            <ActionButton
              title="Pause Campaign"
              subtitle="Temporarily stop spending"
              icon="pause-circle"
              color={K.gold}
              onPress={() => handlePauseCampaign()}
            />
          )}
          {campaign.status === 'paused' && (
            <ActionButton
              title="Resume Campaign"
              subtitle="Restart campaign spending"
              icon="play-circle"
              color={K.mint}
              onPress={() => handleResumeCampaign()}
            />
          )}
          <ActionButton
            title="Duplicate Campaign"
            subtitle="Create similar campaign"
            icon="content-copy"
            color={K.blue}
            onPress={() => handleDuplicateCampaign()}
          />
          <ActionButton
            title="View Signals"
            subtitle="Real-time campaign signals"
            icon="signal"
            color={K.teal}
            onPress={() => navigation.navigate('Signals', { campaignId: campaign.id })}
          />
        </View>
      </View>

      {/* Details */}
      <Card style={[styles.detailsCard, { backgroundColor: colors.surface }]} elevation={2}>
        <View style={styles.cardHeader}>
          <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>Campaign Details</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.detailsGrid}>
          <DetailRow label="Campaign ID" value={campaign.id} />
          <DetailRow label="Platform" value={campaign.platform} />
          <DetailRow label="Status" value={campaign.status} />
          <DetailRow label="Target ROAS" value={campaign.targetRoas ? `${campaign.targetRoas}x` : 'Not set'} />
          {campaign.startDate && <DetailRow label="Start Date" value={formatDate(campaign.startDate)} />}
          {campaign.endDate && <DetailRow label="End Date" value={formatDate(campaign.endDate)} />}
          <DetailRow label="Created" value={formatRelativeTime(campaign.createdAt)} />
          <DetailRow label="Updated" value={formatRelativeTime(campaign.updatedAt)} />
        </View>
        {campaign.description && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.descriptionSection}>
              <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant }]}>Description</Text>
              <Text style={[themeTypography.bodyMedium, { color: colors.onSurface, marginTop: spacing.xs }]}>{campaign.description}</Text>
            </View>
          </>
        )}
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// Components
const KPICard = ({ title, value, color, icon }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <TouchableOpacity style={[styles.kpiCard, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 24, color }}>📊</Text>
      </View>
      <Text style={[themeTypography.headlineSmall, { color, fontWeight: '700' }]}>{value}</Text>
      <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const ActionButton = ({ title, subtitle, icon, color, onPress }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.actionBtn, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 24, color }}>⚡</Text>
      </View>
      <View style={styles.actionContent}>
        <Text style={[themeTypography.labelMedium, { color: colors.onSurface, fontWeight: '600' }]}>{title}</Text>
        <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

const DetailRow = ({ label, value }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[themeTypography.bodyMedium, { color: colors.onSurface, fontWeight: '500', textAlign: 'right' }]}>{value}</Text>
    </View>
  );
};

const LoadingScreen = () => {
  const { theme, colors, typography } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={K.mint} />
      <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: spacing.md }]}>Loading campaign...</Text>
    </View>
  );
};

const ErrorScreen = ({ message, onRetry }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
      <Text style={[themeTypography.headlineSmall, { color: colors.onSurface, textAlign: 'center', marginBottom: spacing.sm }]}>Error</Text>
      <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.lg }]}>{message}</Text>
      <Button mode="contained" onPress={onRetry}>Retry</Button>
    </View>
  );
};

const AuthRequiredScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <View style={[styles.authContainer, { backgroundColor: colors.background }]}>
      <View style={styles.authCard}>
        <Text style={[themeTypography.displaySmall, { color: colors.onSurface, textAlign: 'center', marginBottom: 16 }]}>Sign In Required</Text>
        <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 32 }]}>Please sign in to view campaign details</Text>
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
    paddingHorizontal: spacing.xs,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerRight: {},
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  kpiCard: {
    flex: 1,
    minWidth: '48%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  budgetCard: {
    marginBottom: spacing.lg,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  budgetHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  budgetProgress: {},
  budgetLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1f2937',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionsSection: {
    marginBottom: spacing.lg,
  },
  actionsGrid: {
    gap: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  detailsCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    padding: spacing.md,
    paddingBottom: spacing.xs,
  },
  divider: {
    marginHorizontal: spacing.md,
  },
  detailsGrid: {
    padding: spacing.md,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  descriptionSection: {
    padding: spacing.md,
    paddingTop: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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

export default CampaignDetailScreen;