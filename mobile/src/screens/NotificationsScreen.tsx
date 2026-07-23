// Notifications Screen - In-App Notifications Center
import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert, ScrollView, Switch, TextInput } from 'react-native';
import { Card, Chip, Button, IconButton, Badge, Avatar, Divider, SegmentedButtons } from 'react-native-paper';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { K, spacing, borderRadius, shadows, typography } from '../theme';
import { formatRelativeTime, formatDateTime } from '../utils/formatters';

const typeIcons: Record<string, string> = {
  campaign: '📈',
  agent: '🤖',
  wallet: '💰',
  system: '⚙️',
  alert: '⚠️',
  info: 'ℹ️',
};

const typeColors: Record<string, string> = {
  campaign: K.blue,
  agent: K.teal,
  wallet: K.mint,
  system: K.gold,
  alert: K.danger,
  info: K.blue,
};

const NotificationsScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  const { notifications, unreadCount, isLoading, loadNotifications, markAsRead, markAllAsRead, clearError, updateSettings } = useNotifications();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = useCallback((notification: any) => {
    if (notification.status === 'unread') {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      // Navigate to action URL
    }
  }, [markAsRead]);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.status === 'unread';
    if (filter === 'read') return n.status !== 'unread';
    return true;
  });

  const priorityColors = {
    low: K.t3,
    normal: K.blue,
    high: K.gold,
    critical: K.danger,
  };

  const handleMarkAllRead = () => {
    Alert.alert(
      'Mark All as Read?',
      'This will mark all unread notifications as read.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark All Read', onPress: markAllAsRead },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications?',
      'This will permanently delete all notifications. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => { /* Clear all */ } },
      ]
    );
  };

  if (!isAuthenticated) {
    return <AuthRequiredScreen navigation={navigation} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[themeTypography.headlineMedium, { color: colors.onSurface }]}>Notifications</Text>
          <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''} • {unreadCount} unread
          </Text>
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <Button mode="text" style={styles.markAllBtn} onPress={handleMarkAllRead}>
              Mark All Read
            </Button>
          )}
          <Button mode="text" style={styles.clearBtn} onPress={handleClearAll}>
            Clear All
          </Button>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'unread', 'read'] as const).map((tab) => (
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
            {tab === 'unread' && unreadCount > 0 && (
              <Badge style={styles.filterBadge}>{unreadCount}</Badge>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationCard
            notification={item}
            onPress={() => handleNotificationPress(item)}
            onMarkRead={() => item.status === 'unread' && markAsRead(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[themeTypography.headlineSmall, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.sm }]}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </Text>
            <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.lg }]}>
              {filter === 'unread' 
                ? 'You\'re all caught up!' 
                : 'Notifications will appear here when you receive alerts about campaigns, agents, or wallet activity'}
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

const NotificationCard = ({ notification, onPress, onMarkRead }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  const priorityColors = {
    low: K.t3,
    normal: K.blue,
    high: K.gold,
    critical: K.danger,
  };

  const isUnread = notification.status === 'unread';

  return (
    <TouchableOpacity onPress={onPress} style={[styles.notificationCard, { backgroundColor: colors.surface, opacity: isUnread ? 1 : 0.7 }]} activeOpacity={0.8}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationMain}>
          <View style={[styles.notificationIcon, { backgroundColor: typeColors[notification.type] + '20' }]}>
            <Text style={{ fontSize: 20 }}>{typeIcons[notification.type] || '📬'}</Text>
          </View>
          <View style={styles.notificationInfo}>
            <View style={styles.notificationTitleRow}>
              <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: isUnread ? '700' : '500' }]}>
                {notification.title}
              </Text>
              {notification.actionRequired && (
                <Badge style={[styles.actionBadge, { backgroundColor: K.danger + '20' }]}>
                  <Text style={[themeTypography.labelSmall, { color: K.danger, fontWeight: '700' }]}>Action Required</Text>
                </Badge>
              )}
            </View>
            <View style={styles.notificationMeta}>
              <Badge style={[styles.typeBadge, { backgroundColor: typeColors[notification.type] + '20' }]}>
                <Text style={[themeTypography.labelSmall, { color: typeColors[notification.type], fontWeight: '600' }]}>
                  {notification.type.toUpperCase()}
                </Text>
              </Badge>
              <Badge style={[styles.priorityBadge, { backgroundColor: priorityColors[notification.priority] + '20' }]}>
                <Text style={[themeTypography.labelSmall, { color: priorityColors[notification.priority], fontWeight: '600' }]}>
                  {notification.priority.toUpperCase()}
                </Text>
              </Badge>
              <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>
                {formatRelativeTime(notification.createdAt)}
              </Text>
            </View>
          </View>
        </View>
        {isUnread && (
          <View style={styles.unreadIndicator} />
        )}
      </View>

      <View style={styles.notificationMessage}>
        <Text style={[themeTypography.bodyMedium, { color: isUnread ? colors.onSurface : colors.onSurfaceVariant }]}>
          {notification.message}
        </Text>
      </View>

      {notification.actionUrl && (
        <View style={styles.notificationAction}>
          <TouchableOpacity onPress={() => { /* Navigate to action */ }} style={styles.actionBtn}>
            <Text style={[themeTypography.labelMedium, { color: colors.primary, fontWeight: '600' }]}>View Details →</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.notificationFooter}>
        <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>
          {formatDateTime(notification.createdAt)}
        </Text>
        {isUnread && (
          <TouchableOpacity onPress={onMarkRead} style={styles.markReadBtn}>
            <Text style={[themeTypography.labelSmall, { color: colors.primary, fontWeight: '600' }]}>Mark as Read</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Settings modal for notification preferences
const NotificationSettingsModal = ({ visible, onClose, settings, onSave }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.modalHeader}>
          <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>Notification Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <IconButton icon="close" size={24} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={styles.settingsSection}>
            <Text style={[themeTypography.titleMedium, { color: colors.onSurface, marginBottom: spacing.md }]}>Enable Notifications</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[themeTypography.bodyMedium, { color: colors.onSurface }]}>Push Notifications</Text>
                <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Receive notifications when app is closed</Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(value) => onSave({ ...settings, enabled: value })}
                color={K.mint}
              />
            </View>
          </View>

          <View style={[styles.settingsSection, { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: spacing.lg }]}>
            <Text style={[themeTypography.titleMedium, { color: colors.onSurface, marginBottom: spacing.md }]}>Notification Types</Text>
            {Object.entries(settings.types || {}).map(([type, enabled]) => (
              <View key={type} style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={[styles.typeIcon, { backgroundColor: typeColors[type] + '20' }]}>
                    <Text style={{ fontSize: 16 }}>{typeIcons[type] || '📬'}</Text>
                  </View>
                  <View>
                    <Text style={[themeTypography.bodyMedium, { color: colors.onSurface }]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                    <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Notifications about {type} activity</Text>
                  </View>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(value) => onSave({ ...settings, types: { ...settings.types, [type]: value } })}
                  color={K.mint}
                />
              </View>
            ))}
          </View>

          <View style={[styles.settingsSection, { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: spacing.lg }]}>
            <Text style={[themeTypography.titleMedium, { color: colors.onSurface, marginBottom: spacing.md }]}>Quiet Hours</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[themeTypography.bodyMedium, { color: colors.onSurface }]}>Enable Quiet Hours</Text>
                <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Silence notifications during set hours</Text>
              </View>
              <Switch
                value={settings.quietHours?.enabled || false}
                onValueChange={(value) => onSave({ ...settings, quietHours: { ...settings.quietHours, enabled: value } })}
                color={K.mint}
              />
            </View>
            {settings.quietHours?.enabled && (
              <View style={styles.quietHoursInputs}>
                <TextInput
                  style={styles.timeInput}
                  mode="outlined"
                  theme={theme}
                  label="Start Time"
                  value={settings.quietHours?.start || '22:00'}
                  onChangeText={(value) => onSave({ ...settings, quietHours: { ...settings.quietHours, start: value } })}
                  placeholder="22:00"
                />
                <TextInput
                  style={[styles.timeInput, { marginLeft: spacing.md }]}
                  mode="outlined"
                  theme={theme}
                  label="End Time"
                  value={settings.quietHours?.end || '08:00'}
                  onChangeText={(value) => onSave({ ...settings, quietHours: { ...settings.quietHours, end: value } })}
                  placeholder="08:00"
                />
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <Button mode="text" style={styles.modalCancelBtn} onPress={onClose}>Cancel</Button>
          <Button mode="contained" style={styles.modalSaveBtn} onPress={() => { onSave(settings); onClose(); }}>Save</Button>
        </View>
      </View>
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
        <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 32 }]}>Please sign in to view notifications</Text>
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
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  markAllBtn: {
    paddingHorizontal: spacing.md,
  },
  clearBtn: {
    paddingHorizontal: spacing.md,
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
  notificationCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  notificationHeader: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  notificationMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationInfo: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  actionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: K.mint,
    marginLeft: 'auto',
    marginTop: 4,
  },
  notificationMessage: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  notificationAction: {
    padding: spacing.md,
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  markReadBtn: {
    padding: spacing.xs,
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

export default NotificationsScreen;