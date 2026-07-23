// Login Screen - Authentication
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Card, Title, Paragraph, IconButton } from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { K, spacing, borderRadius, shadows, typography } from '../theme';

const LoginScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    
    try {
      await login({ email, password, rememberMe });
      // Navigation handled by auth state change
    } catch (err) {
      // Error handled by auth slice
    }
  };

  const handleForgotPassword = () => {
    // Navigate to forgot password screen
  };

  const handleBiometricLogin = async () => {
    // Implement biometric authentication
  };

  if (isAuthenticated) {
    return null; // Will redirect via navigator
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
        {/* Logo & Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>KIKI</Text>
          </View>
          <Title style={[styles.appTitle, { color: colors.onSurface }]}>KIKI Agent</Title>
          <Paragraph style={[styles.appSubtitle, { color: colors.onSurfaceVariant }]}>
            Enterprise Campaign Intelligence Platform
          </Paragraph>
        </View>

        {/* Login Form */}
        <Card style={[styles.formCard, { backgroundColor: colors.surface }]} elevation={2}>
          <View style={styles.formContent}>
            <Title style={[styles.formTitle, { color: colors.onSurface }]}>Welcome Back</Title>
            <Paragraph style={[styles.formSubtitle, { color: colors.onSurfaceVariant }]}>
              Sign in to access your campaigns and analytics
            </Paragraph>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={[themeTypography.bodyMedium, { color: K.danger }]}>{error}</Text>
              </View>
            )}

            {/* Email Field */}
            <TextInput
              style={styles.input}
              mode="outlined"
              theme={theme}
              label="Email"
              placeholder="you@company.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              right={<IconButton icon="email" size={24} color={colors.onSurfaceVariant} />}
            />

            {/* Password Field */}
            <TextInput
              style={[styles.input, { marginTop: spacing.md }]}
              mode="outlined"
              theme={theme}
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              right={
                <IconButton
                  icon={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={colors.onSurfaceVariant}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            {/* Remember Me & Forgot Password */}
            <View style={[styles.rememberRow, { marginTop: spacing.md }]}>
              <TouchableOpacity onPress={() => setRememberMe(!rememberMe)} style={styles.checkboxContainer}>
                <View style={[
                  styles.checkbox,
                  { backgroundColor: rememberMe ? K.blue : 'transparent', borderColor: rememberMe ? K.blue : colors.outline }
                ]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[themeTypography.bodyMedium, { color: colors.onSurface, marginLeft: spacing.sm }]}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword} style={{ marginLeft: 'auto' }}>
                <Text style={[themeTypography.labelMedium, { color: K.blue, fontWeight: '600' }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <Button
              mode="contained"
              style={[styles.loginBtn, { marginTop: spacing.lg }]}
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading || !email || !password}
            >
              Sign In
            </Button>

            {/* Biometric Login */}
            <View style={[styles.divider, { marginVertical: spacing.lg }]}>
              <View style={styles.dividerLine} />
              <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant, marginHorizontal: spacing.md }]}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              mode="outlined"
              style={styles.biometricBtn}
              onPress={handleBiometricLogin}
              icon="fingerprint"
            >
              Sign in with Biometrics
            </Button>

            {/* Sign Up Link */}
            <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
              <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={[themeTypography.bodyMedium, { color: K.blue, fontWeight: '600' }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Features Preview */}
        <View style={styles.featuresSection}>
          <Text style={[themeTypography.titleMedium, { color: colors.onSurface, textAlign: 'center', marginBottom: spacing.md }]}>
            Why KIKI?
          </Text>
          <View style={styles.featuresGrid}>
            <FeatureItem
              icon="🎯"
              title="Smart Bidding"
              description="AI-powered bid optimization"
            />
            <FeatureItem
              icon="📊"
              title="Real-time Analytics"
              description="Live ROAS & performance tracking"
            />
            <FeatureItem
              icon="🤖"
              title="AI Agents"
              description="Autonomous campaign management"
            />
            <FeatureItem
              icon="🔒"
              title="Enterprise Security"
              description="SOC 2, GDPR, HIPAA compliant"
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
            © 2026 KIKI Agent Platform. All rights reserved.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
            <TouchableOpacity>
              <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Privacy</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Terms</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Feature Item Component
const FeatureItem = ({ icon, title, description }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  return (
    <View style={[styles.featureItem, { backgroundColor: colors.surface }]}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={[themeTypography.titleSmall, { color: colors.onSurface, fontWeight: '600', marginTop: spacing.sm }]}>{title}</Text>
      <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant, marginTop: spacing.xs, textAlign: 'center' }]}>{description}</Text>
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
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    backgroundColor: K.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#030712',
    letterSpacing: -2,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  appSubtitle: {
    textAlign: 'center',
    fontSize: 16,
  },
  formCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  formContent: {
    padding: spacing.xl,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    marginBottom: spacing.lg,
  },
  errorContainer: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: K.danger + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: K.danger,
  },
  input: {
    backgroundColor: '#030712',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  loginBtn: {
    height: 52,
    borderRadius: borderRadius.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1f2937',
  },
  biometricBtn: {
    height: 52,
    borderRadius: borderRadius.md,
  },
  featuresSection: {
    marginBottom: spacing.xl,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  featureItem: {
    width: '45%',
    minWidth: 160,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  featureIcon: {
    fontSize: 32,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
});

export default LoginScreen;