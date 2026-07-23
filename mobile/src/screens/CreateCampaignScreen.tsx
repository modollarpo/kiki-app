// Create Campaign Screen
import React, { useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Card, Title, Paragraph, Dropdown, IconButton, Chip, Switch } from 'react-native-paper';
import { useCampaigns } from '../hooks/useCampaigns';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { K, spacing, borderRadius, shadows, typography } from '../theme';
import { formatCurrency } from '../utils/formatters';

const CreateCampaignScreen = ({ navigation, route }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  const { createCampaign, isCreating } = useCampaigns();
  const { isAuthenticated } = useAuth();
  const [editingCampaign, setEditingCampaign] = useState(route.params?.campaign || null);
  const isEditing = !!editingCampaign;

  const [formData, setFormData] = useState({
    name: editingCampaign?.name || '',
    description: editingCampaign?.description || '',
    platform: editingCampaign?.platform || 'meta',
    budget: editingCampaign?.budget?.toString() || '',
    targetRoas: editingCampaign?.targetRoas?.toString() || '',
    startDate: editingCampaign?.startDate ? editingCampaign.startDate.split('T')[0] : '',
    endDate: editingCampaign?.endDate ? editingCampaign.endDate.split('T')[0] : '',
    targetCpa: '',
    dailyBudget: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);

  const platforms = [
    { label: 'Meta (Facebook/Instagram)', value: 'meta' },
    { label: 'Google Ads', value: 'google' },
    { label: 'TikTok Ads', value: 'tiktok' },
    { label: 'Snapchat Ads', value: 'snap' },
    { label: 'LinkedIn Ads', value: 'linkedin' },
    { label: 'Pinterest Ads', value: 'pinterest' },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Campaign name is required';
    if (!formData.platform) newErrors.platform = 'Platform is required';
    if (formData.budget && parseFloat(formData.budget) <= 0) newErrors.budget = 'Budget must be greater than 0';
    if (formData.targetRoas && parseFloat(formData.targetRoas) <= 0) newErrors.targetRoas = 'Target ROAS must be greater than 0';
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const campaignData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        platform: formData.platform,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        targetRoas: formData.targetRoas ? parseFloat(formData.targetRoas) : undefined,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        targetCpa: formData.targetCpa ? parseFloat(formData.targetCpa) : undefined,
        dailyBudget: formData.dailyBudget ? parseFloat(formData.dailyBudget) : undefined,
      };

      if (isEditing) {
        // Update existing campaign
        // await updateCampaign(editingCampaign.id, campaignData);
      } else {
        await createCampaign(campaignData);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save campaign');
    }
  };

  const handleCancel = () => {
    if (editingCampaign) {
      Alert.alert('Discard Changes?', 'Are you sure you want to discard your changes?', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  if (!isAuthenticated) {
    return <AuthRequiredScreen navigation={navigation} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
            <IconButton icon="arrow-left" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[themeTypography.headlineMedium, { color: colors.onSurface, fontWeight: '700' }]}>
              {isEditing ? 'Edit Campaign' : 'Create Campaign'}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Form */}
        <Card style={[styles.formCard, { backgroundColor: colors.surface }]} elevation={2}>
          <View style={styles.formContent}>
            {/* Basic Info */}
            <View style={styles.section}>
              <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600', marginBottom: spacing.md }]}>
                Basic Information
              </Text>

              <TextInput
                style={styles.input}
                mode="outlined"
                theme={theme}
                label="Campaign Name"
                placeholder="e.g., Summer Sale 2024"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                error={!!errors.name}
                helperText={errors.name}
                maxLength={100}
                autoCapitalize="words"
              />

              <TextInput
                style={[styles.input, { marginTop: spacing.md }]}
                mode="outlined"
                theme={theme}
                label="Description (Optional)"
                placeholder="Describe your campaign goals..."
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
                maxLength={500}
              />

              {/* Platform Selector */}
              <View style={{ marginTop: spacing.md }}>
                <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant, marginBottom: spacing.xs }]}>Platform</Text>
                <View style={styles.platformSelector}>
                  {platforms.map((platform) => (
                    <TouchableOpacity
                      key={platform.value}
                      onPress={() => setFormData({ ...formData, platform: platform.value })}
                      style={[
                        styles.platformOption,
                        formData.platform === platform.value && styles.platformOptionSelected,
                      ]}
                    >
                      <Text style={[
                        themeTypography.labelMedium,
                        { 
                          color: formData.platform === platform.value ? '#fff' : colors.onSurface,
                          fontWeight: formData.platform === platform.value ? '600' : '400',
                        }
                      ]}>
                        {platform.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.platform && (
                  <Text style={[themeTypography.labelSmall, { color: K.danger, marginTop: spacing.xs }]}>{errors.platform}</Text>
                )}
              </View>
            </View>

            {/* Budget & Targets */}
            <View style={[styles.section, { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: spacing.lg }]}>
              <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600', marginBottom: spacing.md }]}>
                Budget & Targets
              </Text>

              <TextInput
                style={styles.input}
                mode="outlined"
                theme={theme}
                label="Total Budget"
                placeholder="e.g., 10000"
                value={formData.budget}
                onChangeText={(text) => setFormData({ ...formData, budget: text })}
                keyboardType="numeric"
                error={!!errors.budget}
                helperText={errors.budget}
                right={<Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, marginRight: spacing.sm }]}>USD</Text>}
              />

              <View style={styles.twoColumn}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  mode="outlined"
                  theme={theme}
                  label="Target ROAS"
                  placeholder="e.g., 3.5"
                  value={formData.targetRoas}
                  onChangeText={(text) => setFormData({ ...formData, targetRoas: text })}
                  keyboardType="decimal-pad"
                  error={!!errors.targetRoas}
                  helperText={errors.targetRoas}
                  right={<Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, marginRight: spacing.sm }]}>x</Text>}
                />

                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  mode="outlined"
                  theme={theme}
                  label="Target CPA (Optional)"
                  placeholder="e.g., 25.00"
                  value={formData.targetCpa}
                  onChangeText={(text) => setFormData({ ...formData, targetCpa: text })}
                  keyboardType="decimal-pad"
                  right={<Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, marginRight: spacing.sm }]}>USD</Text>}
                />
              </View>

              <View style={[styles.twoColumn, { marginTop: spacing.md }]}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  mode="outlined"
                  theme={theme}
                  label="Daily Budget (Optional)"
                  placeholder="e.g., 100"
                  value={formData.dailyBudget}
                  onChangeText={(text) => setFormData({ ...formData, dailyBudget: text })}
                  keyboardType="numeric"
                  right={<Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, marginRight: spacing.sm }]}>USD</Text>}
                />

                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  mode="outlined"
                  theme={theme}
                  label="Start Date"
                  placeholder="YYYY-MM-DD"
                  value={formData.startDate}
                  onChangeText={(text) => setFormData({ ...formData, startDate: text })}
                  keyboardType="date"
                  right={<IconButton icon="calendar" size={24} color={colors.onSurfaceVariant} />}
                />
              </View>

              <TextInput
                style={[styles.input, { marginTop: spacing.md }]}
                mode="outlined"
                theme={theme}
                label="End Date (Optional)"
                placeholder="YYYY-MM-DD"
                value={formData.endDate}
                onChangeText={(text) => setFormData({ ...formData, endDate: text })}
                keyboardType="date"
                right={<IconButton icon="calendar" size={24} color={colors.onSurfaceVariant} />}
              />
            </View>

            {/* Advanced Settings */}
            <View style={[styles.section, { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: spacing.lg }]}>
              <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600', marginBottom: spacing.md }]}>
                Advanced Settings
              </Text>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[themeTypography.bodyMedium, { color: colors.onSurface }]}>Auto-pause on budget</Text>
                  <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Automatically pause when budget is exhausted</Text>
                </View>
                <Switch
                  value={false}
                  onValueChange={() => {}}
                  color={K.mint}
                />
              </View>

              <View style={[styles.settingRow, { marginTop: spacing.md }]}>
                <View style={styles.settingInfo}>
                  <Text style={[themeTypography.bodyMedium, { color: colors.onSurface }]}>Smart bidding</Text>
                  <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Allow AI to optimize bids automatically</Text>
                </View>
                <Switch
                  value={true}
                  onValueChange={() => {}}
                  color={K.mint}
                />
              </View>

              <View style={[styles.settingRow, { marginTop: spacing.md }]}>
                <View style={styles.settingInfo}>
                  <Text style={[themeTypography.bodyMedium, { color: colors.onSurface }]}>Weekend optimization</Text>
                  <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Adjust bids for weekend traffic patterns</Text>
                </View>
                <Switch
                  value={false}
                  onValueChange={() => {}}
                  color={K.mint}
                />
              </View>
            </View>

            {/* Error Display */}
            {Object.keys(errors).length > 0 && (
              <View style={[styles.errorBanner, { marginTop: spacing.md }]}>
                <Text style={[themeTypography.bodyMedium, { color: K.danger }]}>
                  Please fix the errors above
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={[styles.actionsRow, { marginTop: spacing.lg }]}>
              <Button
                mode="outlined"
                style={styles.cancelBtn}
                onPress={handleCancel}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                style={styles.submitBtn}
                onPress={handleSubmit}
                loading={isCreating}
                disabled={isCreating}
              >
                {isEditing ? 'Save Changes' : 'Create Campaign'}
              </Button>
            </View>
          </View>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Auth Required Screen
const AuthRequiredScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <View style={[styles.authContainer, { backgroundColor: colors.background }]}>
      <View style={styles.authCard}>
        <Text style={[themeTypography.displaySmall, { color: colors.onSurface, textAlign: 'center', marginBottom: 16 }]}>Sign In Required</Text>
        <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 32 }]}>Please sign in to create campaigns</Text>
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
  scrollContent: {
    flexGrow: 1,
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
    flex: 1,
  },
  headerRight: {},
  formCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  formContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: '#030712',
  },
  platformSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  platformOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#030712',
  },
  platformOptionSelected: {
    backgroundColor: K.blue,
    borderColor: K.blue,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  errorBanner: {
    padding: spacing.md,
    backgroundColor: K.danger + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: K.danger,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    flex: 1,
    height: 52,
  },
  submitBtn: {
    flex: 1,
    height: 52,
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

export default CreateCampaignScreen;