// Navigation - AppNavigator
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

// Screen imports
import DashboardScreen from '../screens/DashboardScreen';
import CampaignsScreen from '../screens/CampaignsScreen';
import CampaignDetailScreen from '../screens/CampaignDetailScreen';
import CreateCampaignScreen from '../screens/CreateCampaignScreen';
import BiddingScreen from '../screens/BiddingScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import AgentsScreen from '../screens/AgentsScreen';
import WalletScreen from '../screens/WalletScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

// Main Tab Navigator
const MainTabNavigator = () => {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surface, borderTopWidth: 0, elevation: 8 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="home" size={size} color={color} filled={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Campaigns"
        component={CampaignsScreen}
        options={{
          tabBarLabel: 'Campaigns',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="campaign" size={size} color={color} filled={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Bidding"
        component={BiddingScreen}
        options={{
          tabBarLabel: 'Bidding',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="gavel" size={size} color={color} filled={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="analytics" size={size} color={color} filled={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="menu" size={size} color={color} filled={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// More Stack (for less frequently used features)
const MoreStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="More" component={MoreScreen} />
    <Stack.Screen name="Agents" component={AgentsScreen} />
    <Stack.Screen name="Wallet" component={WalletScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};

// Loading Screen
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#10b981" />
    <Text style={styles.loadingText}>Loading KIKI...</Text>
  </View>
);

// More Screen (placeholder for tab)
const MoreScreen = () => (
  <View style={styles.container}>
    <Text>More Features</Text>
  </View>
);

// Icon component placeholder
const Icon = ({ name, size, color, filled }: { name: string; size: number; color: string; filled: boolean }) => (
  <Text style={{ fontSize: size, color }}>Icon: {name}</Text>
);

const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
  },
  loadingText: {
    marginTop: 16,
    color: '#f9fafb',
    fontSize: 16,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default AppNavigator;