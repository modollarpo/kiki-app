// Settings Screen - App Configuration & Preferences
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { Card, Button, TextInput, IconButton, List, Divider, Chip, SegmentedButtons } from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../hooks/useNotifications';
import { K, spacing, borderRadius, shadows, typography } from '../theme';
import { formatRelativeTime } from '../utils/formatters';

const SettingsScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const { settings, updateSettings } = useNotifications();
  const [appSettings, setAppSettings] = useState({
    theme: 'system',
    language: 'en',
    currency: 'USD',
    biometricEnabled: false,
    autoRefresh: true,
    refreshInterval: 5,
    dataSaver: false,
    analytics: true,
    crashReporting: true,
  });
  const [notifSettings, setNotifSettings] = useState(settings);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

  useEffect(() => {
    // Load settings from storage
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Load from AsyncStorage/MMkv
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setAppSettings(prev => ({ ...prev, theme: newTheme }));
    setShowThemeModal(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { /* Delete account */ } },
      ]
    );
  };

  if (!isAuthenticated) {
    return <AuthRequiredScreen navigation={navigation} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{user?.firstName?.[0] || 'U'}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={[themeTypography.titleLarge, { color: colors.onSurface, fontWeight: '700' }]}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>
              {user?.email}
            </Text>
            <View style={styles.profileMeta}>
              <Chip style={styles.planChip}>
                <Text style={[themeTypography.labelSmall, { color: colors.onSurface }]}>
                  {user?.role || 'User'}
                </Text>
              </Chip>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.editBtn}>
          <IconButton icon="pencil" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionHeader}>
        <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>Quick Actions</Text>
      </View>

      <View style={styles.quickActionsGrid}>
        <QuickActionTile
          title="Billing"
          subtitle="Payment methods & invoices"
          icon="💳"
          color={K.blue}
          onPress={() => navigation.navigate('Billing')}
        />
        <QuickActionTile
          title="Integrations"
          subtitle="Connected platforms"
          icon="🔗"
          color={K.teal}
          onPress={() => navigation.navigate('Integrations')}
        />
        <QuickActionTile
          title="Team"
          subtitle="Members & permissions"
          icon="👥"
          color={K.gold}
          onPress={() => navigation.navigate('Team')}
        />
        <QuickActionTile
          title="API Keys"
          subtitle="Developer access"
          icon="🔑"
          color={K.mint}
          onPress={() => navigation.navigate('ApiKeys')}
        />
      </View>

      {/* App Preferences */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>Preferences</Text>
      </View>

      <Card style={[styles.settingsCard, { backgroundColor: colors.surface }]} elevation={2}>
        <List.Item
          title="Appearance"
          description={appSettings.theme.charAt(0).toUpperCase() + appSettings.theme.slice(1)}
          onPress={() => setShowThemeModal(true)}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Language"
          description={appSettings.language === 'en' ? 'English' : appSettings.language}
          onPress={() => setShowLanguageModal(true)}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Currency"
          description={appSettings.currency}
          onPress={() => setShowCurrencyModal(true)}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Auto Refresh"
          description={appSettings.autoRefresh ? `${appSettings.refreshInterval} min` : 'Disabled'}
          onPress={() => { /* Toggle */ }}
          right={() => (
            <Switch
              value={appSettings.autoRefresh}
              onValueChange={(value) => setAppSettings(prev => ({ ...prev, autoRefresh: value }))}
              color={K.mint}
            />
          )}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Refresh Interval"
          description={`${appSettings.refreshInterval} minutes`}
          onPress={() => { /* Picker */ }}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Data Saver Mode"
          description="Reduce data usage on cellular"
          onPress={() => { /* Toggle */ }}
          right={() => (
            <Switch
              value={appSettings.dataSaver}
              onValueChange={(value) => setAppSettings(prev => ({ ...prev, dataSaver: value }))}
              color={K.mint}
            />
          )}
        />
      </Card>

      {/* Notifications */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>Notifications</Text>
      </View>

      <Card style={[styles.settingsCard, { backgroundColor: colors.surface }]} elevation={2}>
        <List.Item
          title="Push Notifications"
          description={notifSettings.enabled ? 'Enabled' : 'Disabled'}
          onPress={() => { /* Toggle */ }}
          right={() => (
            <Switch
              value={notifSettings.enabled}
              onValueChange={(value) => setNotifSettings(prev => ({ ...prev, enabled: value }))}
              color={K.mint}
            />
          )}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Notification Preferences"
          description="Configure per-type settings"
          onPress={() => setNotificationsModalVisible(true)}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Quiet Hours"
          description={notifSettings.quietHours?.enabled ? `${notifSettings.quietHours.start} - ${notifSettings.quietHours.end}` : 'Disabled'}
          onPress={() => { /* Configure */ }}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
      </Card>

      {/* Security */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>Security</Text>
      </View>

      <Card style={[styles.settingsCard, { backgroundColor: colors.surface }]} elevation={2}>
        <List.Item
          title="Biometric Authentication"
          description={appSettings.biometricEnabled ? 'Enabled' : 'Disabled'}
          onPress={() => { /* Toggle biometric */ }}
          right={() => (
            <Switch
              value={appSettings.biometricEnabled}
              onValueChange={(value) => setAppSettings(prev => ({ ...prev, biometricEnabled: value }))}
              color={K.mint}
            />
          )}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Change Password"
          description="Update your account password"
          onPress={() => navigation.navigate('ChangePassword')}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Two-Factor Authentication"
          description="Add an extra layer of security"
          onPress={() => navigation.navigate('TwoFactor')}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Active Sessions"
          description="Manage logged-in devices"
          onPress={() => navigation.navigate('Sessions')}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
      </Card>

      {/* Privacy & Data */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>Privacy & Data</Text>
      </View>

      <Card style={[styles.settingsCard, { backgroundColor: colors.surface }]} elevation={2}>
        <List.Item
          title="Data Usage"
          description="View your data consumption"
          onPress={() => navigation.navigate('DataUsage')}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Export Data"
          description="Download your account data"
          onPress={() => { /* Export */ }}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Analytics & Crash Reporting"
          description={appSettings.analytics ? 'Enabled' : 'Disabled'}
          onPress={() => { /* Toggle */ }}
          right={() => (
            <Switch
              value={appSettings.analytics}
              onValueChange={(value) => setAppSettings(prev => ({ ...prev, analytics: value }))}
              color={K.mint}
            />
          )}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Crash Reporting"
          description={appSettings.crashReporting ? 'Enabled' : 'Disabled'}
          onPress={() => { /* Toggle */ }}
          right={() => (
            <Switch
              value={appSettings.crashReporting}
              onValueChange={(value) => setAppSettings(prev => ({ ...prev, crashReporting: value }))}
              color={K.mint}
            />
          )}
        />
      </Card>

      {/* About */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>About</Text>
      </View>

      <Card style={[styles.settingsCard, { backgroundColor: colors.surface }]} elevation={2}>
        <List.Item
          title="Version"
          description="1.0.0 (Build 1)"
          right={() => <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>1.0.0</Text>}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Terms of Service"
          onPress={() => { /* Open terms */ }}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Privacy Policy"
          onPress={() => { /* Open privacy */ }}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Open Source Licenses"
          onPress={() => { /* Open licenses */ }}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Contact Support"
          description="help@kiki.ai"
          onPress={() => { /* Open support */ }}
          right={() => <IconButton icon="chevron-right" size={24} color={colors.onSurfaceVariant} />}
        />
      </Card>

      {/* Danger Zone */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text style={[themeTypography.titleMedium, { color: K.danger, fontWeight: '600' }]}>Danger Zone</Text>
      </View>

      <Card style={[styles.settingsCard, { backgroundColor: colors.surface, borderWidth: 1, borderColor: K.danger + '40' }]} elevation={2}>
        <List.Item
          title="Sign Out"
          titleStyle={{ color: colors.onSurface }}
          description="Sign out of your account"
          onPress={handleLogout}
          right={() => <IconButton icon="logout" size={24} color={K.danger} />}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Delete Account"
          titleStyle={{ color: K.danger }}
          description="Permanently delete your account and all data"
          onPress={handleDeleteAccount}
          right={() => <IconButton icon="delete-forever" size={24} color={K.danger} />}
        />
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// Quick Action Tile
const QuickActionTile = ({ title, subtitle, icon, color, onPress }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.quickActionTile, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 28, color }}>{icon}</Text>
      </View>
      <View style={styles.quickActionContent}>
        <Text style={[themeTypography.titleSmall, { color: colors.onSurface, fontWeight: '600' }]}>{title}</Text>
        <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>
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
        <Text style={[themeTypography.displaySmall, { color: colors.onSurface, textAlign: 'center', marginBottom: 16 }]}>Sign In Required</Text>
        <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 32 }]}>Please sign in to access settings</Text>
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: K.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#030712',
  },
  profileDetails: {
    flex: 1,
  },
  profileMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  planChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  editBtn: {
    padding: spacing.sm,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickActionTile: {
    flex: 1,
    minWidth: '48%',
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
    marginBottom: spacing.sm,
  },
  quickActionContent: {},
  settingsCard: {
    marginBottom: spacing.lg,
  },
  divider: {
    marginHorizontal: spacing.md,
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

export default SettingsScreen;