// Campaigns Screen - Campaign List & Management
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Card, Chip, Button, TextInput, IconButton, Menu, Divider, Portal } from 'react-native-paper';
import { useCampaigns } from '../hooks/useCampaigns';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { K, spacing, borderRadius, shadows, typography } from '../theme';
import { formatCurrency, formatNumber } from '../utils/formatters';

const CampaignsScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  const { 
    campaigns, 
    filters, 
    pagination, 
    isLoading, 
    isCreating, 
    error,
    loadCampaigns,
    loadMore,
    updateFilters,
    clearAllFilters,
    selectCampaign,
    createCampaign,
    deleteCampaign,
    approveBid,
    rejectBid,
  } = useCampaigns();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadCampaigns(1);
    setRefreshing(false);
  }, [loadCampaigns]);

  const handleSearch = React.useCallback((text: string) => {
    setSearchQuery(text);
    // Debounce search
    setTimeout(() => {
      updateFilters({ searchQuery: text });
    }, 300);
  }, [updateFilters]);

  const handleFilterPress = (filter: string) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(filter)
      ? currentStatuses.filter(s => s !== filter)
      : [...currentStatuses, filter];
    updateFilters({ status: newStatuses });
  };

  if (!isAuthenticated) {
    return <AuthRequiredScreen navigation={navigation} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[themeTypography.headlineMedium, { color: colors.onSurface }]}>Campaigns</Text>
          <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Button
            mode="contained"
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreateCampaign')}
            loading={isCreating}
            icon="plus"
          >
            Create
          </Button>
        </View>
      </View>

      {/* Search & Filters */}
      <View style={styles.filtersSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search campaigns..."
          value={searchQuery}
          onChangeText={handleSearch}
          mode="outlined"
          theme={theme}
          label="Search"
          placeholderTextColor={colors.onSurfaceVariant}
          right={<IconButton icon="magnify" onPress={() => {}} />}
        />
        <View style={styles.filtersRow}>
          <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant, marginRight: spacing.sm }]}>Status:</Text>
          <View style={styles.filterChips}>
            {['active', 'paused', 'completed', 'draft', 'rejected'].map((status) => (
              <Chip
                key={status}
                style={styles.filterChip}
                selected={filters.status?.includes(status)}
                onPress={() => handleFilterPress(status)}
                onSelect={() => handleFilterPress(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Chip>
            ))}
          </View>
        </View>
        {(filters.status?.length || searchQuery) && (
          <Button
            mode="text"
            style={styles.clearFiltersBtn}
            onPress={() => {
              clearAllFilters();
              setSearchQuery('');
            }}
          >
            Clear Filters
          </Button>
        )}
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={[themeTypography.bodyMedium, { color: K.danger }]}>{error}</Text>
          <Button mode="text" onPress={() => loadCampaigns(1)}>Retry</Button>
        </View>
      )}

      {/* Campaigns List */}
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CampaignCard
            campaign={item}
            onPress={() => {
              selectCampaign(item);
              navigation.navigate('CampaignDetail', { id: item.id });
            }}
            onMenuPress={() => {
              setSelectedCampaignId(item.id);
              setMenuVisible(true);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[themeTypography.headlineSmall, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.sm }]}>
              No campaigns found
            </Text>
            <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.lg }]}>
              {searchQuery || filters.status?.length ? 'Try adjusting your filters' : 'Create your first campaign to get started'}
            </Text>
            <Button
              mode="contained"
              style={{ width: 200 }}
              onPress={() => navigation.navigate('CreateCampaign')}
            >
              Create Campaign
            </Button>
          </View>
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={onRefresh}
        refreshing={refreshing}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Campaign Menu */}
      <Portal>
        <Menu
          visible={menuVisible}
          onDismiss={() => {
            setMenuVisible(false);
            setSelectedCampaignId(null);
          }}
          anchor={
            <View style={styles.menuAnchor} />
          }
        >
          {selectedCampaignId && (
            <>
              <Menu.Item
                onPress={() => {
                  const campaign = campaigns.find(c => c.id === selectedCampaignId);
                  if (campaign) navigation.navigate('CampaignDetail', { id: campaign.id });
                  setMenuVisible(false);
                }}
              >
                View Details
              </Menu.Item>
              <Menu.Item
                onPress={() => {
                  // Duplicate campaign
                  setMenuVisible(false);
                }}
              >
                Duplicate
              </Menu.Item>
              <Divider />
              <Menu.Item
                onPress={() => {
                  // Pause/Resume
                  setMenuVisible(false);
                }}
              >
                {campaigns.find(c => c.id === selectedCampaignId)?.status === 'active' ? 'Pause' : 'Resume'}
              </Menu.Item>
              <Divider />
              <Menu.Item
                onPress={() => {
                  if (selectedCampaignId) deleteCampaign(selectedCampaignId);
                  setMenuVisible(false);
                }}
                style={{ color: K.danger }}
              >
                Delete
              </Menu.Item>
            </>
          )}
        </Menu>
      </Portal>
    </View>
  );
};

// Campaign Card Component
const CampaignCard = ({ campaign, onPress, onMenuPress }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

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

  const roas = campaign.spend > 0 ? (campaign.revenue / campaign.spend).toFixed(2) : '0.00';
  const roasColor = parseFloat(roas) >= 3 ? K.mint : parseFloat(roas) >= 1 ? K.gold : K.danger;

  return (
    <TouchableOpacity onPress={onPress} style={[styles.campaignCard, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={styles.campaignHeader}>
        <View style={styles.campaignTitleRow}>
          <View style={[styles.platformBadge, { backgroundColor: platformColors[campaign.platform] || K.blue }]}>
            <Text style={styles.platformBadgeText}>{campaign.platform.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.campaignTitleContainer}>
            <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{campaign.name}</Text>
            <View style={styles.campaignMeta}>
              <Chip style={styles.statusChip}>
                <View style={styles.statusDotContainer}>
                  <View style={[styles.statusDot, { backgroundColor: statusColors[campaign.status] }]} />
                  <Text style={[themeTypography.labelSmall, { color: statusColors[campaign.status], fontWeight: '600' }]}>
                    {campaign.status}
                  </Text>
                </View>
              </Chip>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn} activeOpacity={0.7}>
          <IconButton icon="dots-vertical" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <View style={styles.campaignStats}>
        <View style={styles.stat}>
          <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>ROAS</Text>
          <Text style={[themeTypography.headlineSmall, { color: roasColor, fontWeight: '700' }]}>{roas}x</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Spend</Text>
          <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{formatCurrency(campaign.spend)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Revenue</Text>
          <Text style={[themeTypography.titleMedium, { color: K.mint, fontWeight: '600' }]}>{formatCurrency(campaign.revenue)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Conv.</Text>
          <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{formatNumber(campaign.conversions)}</Text>
        </View>
      </View>

      <View style={styles.campaignProgress}>
        <View style={styles.progressLabel}>
          <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Budget Used</Text>
          <Text style={[themeTypography.labelSmall, { color: colors.onSurface }]}>{campaign.budget ? ((campaign.spend / campaign.budget) * 100).toFixed(0) + '%' : 'N/A'}</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { 
                width: campaign.budget ? Math.min((campaign.spend / campaign.budget) * 100, 100) + '%' : '0%',
                backgroundColor: campaign.budget && campaign.spend > campaign.budget ? K.danger : K.blue,
              }
            ]}
          />
        </View>
      </View>

      <View style={styles.campaignFooter}>
        <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>
          Updated {formatRelativeTime(campaign.updatedAt)}
        </Text>
        <View style={styles.footerActions}>
          {campaign.status === 'active' && (
            <Button mode="text" style={styles.smallBtn} onPress={() => {}}>
              Pause
            </Button>
          )}
          {campaign.status === 'paused' && (
            <Button mode="text" style={styles.smallBtn} onPress={() => {}}>
              Resume
            </Button>
          )}
        </View>
      </View>
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
          Please sign in to manage your campaigns
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
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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
  headerRight: {
    marginLeft: spacing.md,
  },
  createBtn: {
    height: 44,
  },
  filtersSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    marginBottom: spacing.md,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    marginRight: spacing.xs,
  },
  filterChipSelected: {
    backgroundColor: K.blue + '20',
  },
  clearFiltersBtn: {
    marginTop: spacing.sm,
    marginLeft: 'auto',
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: K.danger + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: K.danger,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  campaignCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  campaignTitleRow: {
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
    fontSize: 12,
    fontWeight: '700',
  },
  campaignTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  campaignMeta: {
    marginTop: spacing.xs,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  menuBtn: {
    padding: spacing.xs,
  },
  campaignStats: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  campaignProgress: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  progressLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1f2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  campaignFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  smallBtn: {
    paddingHorizontal: spacing.md,
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
  menuAnchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  },
});

export default CampaignsScreen;