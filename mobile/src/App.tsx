// App Entry Point - KIKI Mobile Enterprise
import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import PersistGate from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { store, persistor } from './stores';
import { theme } from './theme';
import AppNavigator from './navigation/AppNavigator';
import { useAuth } from './hooks/useAuth';
import { initPushNotifications } from './services/notifications';
import { setupErrorHandling } from './utils/errorHandling';

// Initialize global configurations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

setupErrorHandling();

const App = () => {
  const { initializeAuth } = useAuth();

  React.useEffect(() => {
    initializeAuth();
    initPushNotifications();
  }, [initializeAuth]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ReduxProvider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <PaperProvider theme={theme}>
              <SafeAreaProvider>
                <StatusBar barStyle="light-content" backgroundColor="#030712" />
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </SafeAreaProvider>
            </PaperProvider>
          </PersistGate>
        </ReduxProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default App;