// Type declarations for mobile packages not installed in root node_modules

declare module 'react-native' {
  import { ComponentType, ReactNode } from 'react';
  export const View: ComponentType<any>;
  export const Text: ComponentType<any>;
  export const TextInput: ComponentType<any>;
  export const ScrollView: ComponentType<any>;
  export const TouchableOpacity: ComponentType<any>;
  export const StyleSheet: any;
  export const RefreshControl: ComponentType<any>;
  export const Alert: any;
  export const Switch: ComponentType<any>;
  export const ActivityIndicator: ComponentType<any>;
  export const Image: ComponentType<any>;
  export const Modal: ComponentType<any>;
  export const Dimensions: any;
  export const Platform: any;
  export const StatusBar: ComponentType<any>;
  export const Linking: any;
  export const Appearance: { getColorScheme: () => string; addColorSchemeListener: (handler: (e: any) => void) => { remove: () => void } };
  export type ColorSchemeName = string;
  export const FlatList: ComponentType<any>;
  export const SectionList: ComponentType<any>;
  export const KeyboardAvoidingView: ComponentType<any>;
  export const SafeAreaView: ComponentType<any>;
  export type TextStyle = any;
  export type ViewStyle = any;
  export type ImageStyle = any;
  export type RegisteredStyle<T> = any;
  export namespace Animated {
    export const View: ComponentType<any>;
    export const Text: ComponentType<any>;
    export const ScrollView: ComponentType<any>;
    export function timing(value: any, config: any): any;
    export function spring(value: any, config: any): any;
    export function Value(initial: number): any;
  }
}

declare module 'react-native-paper' {
  import { ComponentType } from 'react';
  export const Card: ComponentType<any>;
  export const Chip: ComponentType<any>;
  export const Button: ComponentType<any>;
  export const IconButton: ComponentType<any>;
  export const Badge: ComponentType<any>;
  export const Avatar: any;
  export const Divider: ComponentType<any>;
  export const TextInput: ComponentType<any>;
  export const Switch: ComponentType<any>;
  export const ProgressBar: ComponentType<any>;
  export const Modal: ComponentType<any>;
  export const Portal: ComponentType<any>;
  export const Provider: ComponentType<any>;
  export const Appbar: ComponentType<any>;
  export const Menu: ComponentType<any> & { Item: ComponentType<any> };
  export const FAB: ComponentType<any>;
  export const Snackbar: ComponentType<any>;
  export const Searchbar: ComponentType<any>;
  export const List: { Item: ComponentType<any>; Icon: ComponentType<any>; Section: ComponentType<any>; };
  export const SegmentedButtons: ComponentType<any> & { Button: ComponentType<any>; };
  export const Title: ComponentType<any>;
  export const Paragraph: ComponentType<any>;
  export const Dropdown: ComponentType<any>;
  export const useTheme: () => any;
  export const MD3DarkTheme: any;
  export const MD3LightTheme: any;
  export const MD2DarkTheme: any;
  export const MD2LightTheme: any;
  export function configureFonts(config: any): any;
}

declare module '@react-navigation/native' {
  import { ComponentType } from 'react';
  export const NavigationContainer: ComponentType<any>;
  export function useNavigation(): any;
  export function useRoute(): any;
  export function useFocusEffect(effect: () => void | (() => void)): void;
}

declare module '@react-navigation/native-stack' {
  import { ComponentType } from 'react';
  export const createNativeStackNavigator: () => { Navigator: ComponentType<any>; Screen: ComponentType<any>; Group: ComponentType<any> };
}

declare module '@react-navigation/bottom-tabs' {
  import { ComponentType } from 'react';
  export const createBottomTabNavigator: () => { Navigator: ComponentType<any>; Screen: ComponentType<any> };
}

declare module 'react-redux' {
  export function useDispatch<T = any>(): T;
  export function useSelector<TState = any, TSelected = TState>(selector: (state: TState) => TSelected): TSelected;
  export function connect(mapStateToProps?: any, mapDispatchToProps?: any): any;
  export const Provider: any;
}

declare module '@reduxjs/toolkit' {
  export function configureStore(config: any): any;
  export function createSlice(config: any): any;
  export function createAsyncThunk(name: string, thunk: any, options?: any): any;
  export function createAction(name: string): any;
  export type PayloadAction<T = any> = { payload: T; type: string };
  export type Dispatch = any;
  export type AnyAction = any;
}

declare module 'redux' {
  export function combineReducers(reducers: any): any;
  export type Reducer<S = any, A = any> = (state: S | undefined, action: A) => S;
}

declare module 'redux-persist' {
  export function persistStore(store: any, config?: any, callback?: () => void): any;
  export function persistReducer(config: any, reducer: any): any;
}

declare module 'redux-persist/integration/react' {
  const PersistGate: any;
  export default PersistGate;
}

declare module 'react-native-safe-area-context' {
  import { ComponentType } from 'react';
  export const SafeAreaProvider: ComponentType<any>;
  export const SafeAreaView: ComponentType<any>;
  export function useSafeAreaInsets(): { top: number; bottom: number; left: number; right: number };
}

declare module 'react-native-gesture-handler' {
  import { ComponentType } from 'react';
  export const GestureHandlerRootView: ComponentType<any>;
  export const Swipeable: ComponentType<any>;
  export const TouchableOpacity: ComponentType<any>;
  export const PanGestureHandler: ComponentType<any>;
}

declare module 'axios' {
  export function create(config?: any): any;
  export function isAxiosError(error: any): boolean;
  export class AxiosError extends Error { response?: any; request?: any; code?: string; config?: any; }
  export interface AxiosInstance { get<T=any>(url: string, config?: any): Promise<{data: T}>; post<T=any>(url: string, data?: any, config?: any): Promise<{data: T}>; put<T=any>(url: string, data?: any, config?: any): Promise<{data: T}>; patch<T=any>(url: string, data?: any, config?: any): Promise<{data: T}>; delete<T=any>(url: string, config?: any): Promise<{data: T}>; interceptors: any; (config: any): Promise<any>; }
  export interface InternalAxiosRequestConfig { headers?: any; _retry?: boolean; [key: string]: any; }
  const axios: any;
  export default axios;
}

declare module '@tanstack/react-query' {
  export function useQuery<T = any>(options: any): { data?: T; isLoading: boolean; error: any; refetch: () => void };
  export function useMutation<T = any>(options: any): { mutate: (vars: any) => void; isLoading: boolean; error: any };
  export const QueryClient: any;
  export const QueryClientProvider: any;
}

declare module 'react-native-push-notification' {
  const PushNotification: any;
  export default PushNotification;
}

declare module '@react-native-community/push-notification-ios' {
  const PushNotificationIOS: any;
  export default PushNotificationIOS;
}

declare module 'react-native-biometrics' {
  const ReactNativeBiometrics: any;
  export default ReactNativeBiometrics;
}

declare module 'react-native-mmkv' {
  export const MMKV: any;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: any;
  export default AsyncStorage;
}

declare module '@react-native-community/netinfo' {
  export function fetch(): Promise<any>;
  export function addEventListener(handler: (state: any) => void): () => void;
}

declare module 'react-native-device-info' {
  const DeviceInfo: any;
  export default DeviceInfo;
}

declare module 'react-native-haptic-feedback' {
  const ReactNativeHapticFeedback: any;
  export default ReactNativeHapticFeedback;
}

declare module 'react-native-keychain' {
  export function setGenericPassword(service: string, username: string, password: string): Promise<void>;
  export function getGenericPassword(): Promise<any>;
  export function resetGenericPassword(): Promise<void>;
}

declare module 'react-native-vector-icons' {
  import { ComponentType } from 'react';
  const Icon: ComponentType<any>;
  export default Icon;
}

declare module 'react-native-progress' {
  import { ComponentType } from 'react';
  export const Bar: ComponentType<any>;
  export const Circle: ComponentType<any>;
  export const Pie: ComponentType<any>;
}

declare module 'react-native-modal' {
  import { ComponentType } from 'react';
  const Modal: ComponentType<any>;
  export default Modal;
}

declare module 'react-native-toast-notifications' {
  import { ComponentType } from 'react';
  export const ToastProvider: ComponentType<any>;
  export function useToast(): { show: (msg: string, options?: any) => void; hide: () => void };
}

declare module 'react-native-svg' {
  import { ComponentType } from 'react';
  export const Svg: ComponentType<any>;
  export const Circle: ComponentType<any>;
  export const Rect: ComponentType<any>;
  export const Line: ComponentType<any>;
  export const Path: ComponentType<any>;
  export const Text: ComponentType<any>;
  export const G: ComponentType<any>;
  export const Defs: ComponentType<any>;
  export const LinearGradient: ComponentType<any>;
  export const Stop: ComponentType<any>;
}

declare module 'react-native-charts' {
  const Charts: any;
  export default Charts;
}

declare module 'react-native-config' {
  const Config: any;
  export default Config;
}

declare module 'react-native-fetch-blob' {
  const RNFetchBlob: any;
  export default RNFetchBlob;
}

declare module 'react-native-sensitive-info' {
  export function setItem(key: string, value: string, options?: any): Promise<void>;
  export function getItem(key: string, options?: any): Promise<string | null>;
  export function deleteItem(key: string, options?: any): Promise<void>;
}

declare module 'react-native-splash-screen' {
  const SplashScreen: any;
  export default SplashScreen;
}

declare module 'react-native-reanimated' {
  const Reanimated: any;
  export default Reanimated;
  export const View: any;
  export const Text: any;
  export const ScrollView: any;
  export function useSharedValue(initial: number): any;
  export function useAnimatedStyle(updater: () => any): any;
  export function withTiming(toValue: number, options?: any): any;
  export function withSpring(toValue: number, options?: any): any;
  export const Easing: any;
}

declare module 'react-native-screens' {
  export function enableScreens(enabled?: boolean): void;
}

declare module 'moment' {
  interface Moment {
    format(fmt?: string): string;
    fromNow(): string;
    diff(b: Moment, unit?: string): number;
  }
  interface MomentStatic {
    (inp?: any, format?: any, strict?: boolean): Moment;
    duration(inp?: any, unit?: string): any;
    unix(timestamp: number): Moment;
  }
  const moment: MomentStatic;
  export default moment;
}

declare module 'crypto-js' {
  const CryptoJS: any;
  export default CryptoJS;
}

declare module 'react-native-fingerprint-scanner' {
  const FingerprintScanner: any;
  export default FingerprintScanner;
}

declare module 'react-native-hmac' {
  const Hmac: any;
  export default Hmac;
}

declare module 'react-native-crypto' {
  const crypto: any;
  export default crypto;
}

declare module 'react-native-local-notifications' {
  const Notifications: any;
  export default Notifications;
}


