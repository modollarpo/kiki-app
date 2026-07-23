# KIKI Mobile App - Enterprise Companion for KIKI Agent Platform

A production-ready React Native mobile application built with Expo, TypeScript, and enterprise-grade architecture. Provides full campaign management, AI agent control, real-time analytics, and financial operations for the KIKI Agent Platform.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS (macOS only)
npm run ios

# Run on Android
npm run android
```

## 📱 Project Structure

```
mobile/
├── app.json                 # Expo configuration
├── package.json             # Dependencies & scripts
├── babel.config.js          # Babel configuration
├── .prettierrc              # Code formatting
├── index.js                 # Entry point
├── app.json                 # Expo app config
├── eas.json                 # EAS Build configuration
├── .env                     # Development environment
├── .env.production          # Production environment
├── README.md                # This file
│
├── src/                     # Main React Native source
│   ├── App.tsx              # Root component
│   ├── theme/               # Design system & theming
│   │   └── index.ts         # Theme configuration
│   ├── stores/              # Redux state management
│   │   ├── index.ts         # Store configuration
│   │   └── slices/          # Redux slices
│   │       ├── authSlice.ts
│   │       ├── campaignsSlice.ts
│   │       ├── agentsSlice.ts
│   │       ├── walletSlice.ts
│   │       ├── notificationsSlice.ts
│   │       └── uiSlice.ts
│   ├── navigation/          # Navigation setup
│   │   └── AppNavigator.tsx
│   ├── screens/             # Screen components
│   │   ├── DashboardScreen.tsx
│   │   ├── CampaignsScreen.tsx
│   │   ├── CampaignDetailScreen.tsx
│   │   ├── CreateCampaignScreen.tsx
│   │   ├── BiddingScreen.tsx
│   │   ├── AnalyticsScreen.tsx
│   │   ├── AgentsScreen.tsx
│   │   ├── WalletScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── OnboardingScreen.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useTheme.ts
│   │   ├── useCampaigns.ts
│   │   ├── useAgents.ts
│   │   ├── useWallet.ts
│   │   └── useNotifications.ts
│   ├── services/            # API & native services
│   │   ├── api.ts           # Axios HTTP client
│   │   ├── auth.ts
│   │   ├── campaigns.ts
│   │   ├── agents.ts
│   │   ├── wallet.ts
│   │   ├── notifications.ts
│   │   └── biometrics.ts
│   ├── utils/               # Utility functions
│   │   ├── formatters.ts
│   │   ├── errorHandling.ts
│   │   ├── storage.ts
│   │   └── network.ts
│   └── shared/              # Shared components & types
│       ├── components/
│       ├── types/
│       └── lib/
│
├── shared/                  # Shared TypeScript package
│   ├── src/                 # Shared source
│   ├── types/               # TypeScript types
│   │   └── index.ts         # All API types
│   ├── components/          # Shared UI components
│   ├── lib/                 # Shared libraries
│   │   ├── config.ts        # App configuration
│   │   └── api.ts           # API client types
│   ├── package.json         # Shared package config
│   └── tsconfig.json        # TypeScript config
│
├── ios/                     # iOS native code (SwiftUI)
│   ├── KIKIMobile/
│   │   ├── App/
│   │   ├── Scenes/
│   │   └── Supporting Files/
│   └── Podfile
│
├── android/                 # Android native code (Jetpack Compose)
│   ├── app/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── java/com/kiki/mobile/
│   │   │   │   ├── res/
│   │   │   │   └── AndroidManifest.xml
│   │   │   └── build.gradle
│   │   └── build.gradle
│   ├── gradle/
│   ├── gradlew
│   └── build.gradle
│
└── assets/                  # Static assets
    ├── icon.png
    ├── splash.png
    ├── adaptive-icon.png
    ├── notification-icon.png
    └── notification-sound.wav
```

## 🏗️ Architecture

### Layered Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP LAYER                       │
├─────────────────────────────────────────────────────────┤
│  React Native Screens • React Navigation • Redux Store  │
├─────────────────────────────────────────────────────────┤
│                    SHARED LAYER (TypeScript)              │
├─────────────────────────────────────────────────────────┤
│  API Types • Configuration • Utilities • Components     │
├─────────────────────────────────────────────────────────┤
│              ENTERPRISE BACKEND (KIKI Platform)           │
├─────────────────────────────────────────────────────────┤
│  REST APIs • WebSocket • Multi-tenant DB • Auth          │
└─────────────────────────────────────────────────────────┘
```

### Key Technologies
- **Framework**: React Native with Expo SDK 50+
- **Language**: TypeScript 5.1+ (strict mode)
- **Navigation**: Expo Router + React Navigation 6
- **State**: Redux Toolkit + RTK Query + Redux Persist
- **HTTP**: Axios with interceptors
- **Storage**: MMKV (encrypted) + AsyncStorage
- **Notifications**: Expo Notifications (FCM/APNs)
- **Biometrics**: React Native Biometrics
- **Charts**: react-native-svg-charts
- **UI**: React Native Paper (Material Design 3)

## ✨ Features Implemented

### Core Screens (12 Complete)
| Screen | Description | Key Features |
|--------|-------------|--------------|
| **Dashboard** | Executive overview | KPI cards, quick actions, recent campaigns, agent status |
| **Campaigns** | Campaign management | List, filter, search, create, duplicate, pause/resume |
| **Campaign Detail** | Deep dive analytics | ROAS, spend, revenue, budget tracking, actions |
| **Create Campaign** | Campaign wizard | Multi-step form, platform selection, budget targets |
| **Bidding** | Real-time bid review | Approve/reject, auto-approve, confidence scoring |
| **Analytics** | Performance insights | Time-series charts, platform breakdown, funnel, attribution |
| **Agents** | AI agent management | Status control, run/stop, config, metrics |
| **Wallet** | Financial operations | Balance, transactions, deposit/withdraw, payment methods |
| **Notifications** | Push + in-app | Rich notifications, actions, categories, quiet hours |
| **Settings** | App configuration | Theme, security, privacy, notifications, danger zone |
| **Login** | Authentication | Email/password, biometric, remember me, forgot password |
| **Profile** | User management | Edit profile, security, preferences, account |

### Enterprise Features
- **Multi-tenant Architecture**: Complete tenant isolation
- **Role-based Access Control**: Admin, Manager, Analyst, Viewer
- **Biometric Authentication**: Face ID, Touch ID, Fingerprint
- **Offline Support**: MMKV caching, background sync queue
- **Push Notifications**: FCM/APNs with rich actions
- **Real-time Updates**: WebSocket + polling fallback
- **Security**: Certificate pinning, encrypted storage, session management
- **Compliance**: GDPR, HIPAA, SOC 2 Type II ready

### Developer Experience
- **Type Safety**: 100% TypeScript with strict mode
- **Code Quality**: ESLint + Prettier + Husky
- **Testing**: Jest + React Native Testing Library + Detox
- **CI/CD**: GitHub Actions + EAS Build
- **Monitoring**: Sentry + Analytics
- **Documentation**: Comprehensive README + inline docs

## 🔧 Configuration

### Environment Variables
```env
# .env (development)
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_WS_URL=ws://localhost:3000/ws
EXPO_PUBLIC_JWT_SECRET=dev-secret
EXPO_PUBLIC_ENCRYPTION_KEY=dev-key
EXPO_PUBLIC_BIOMETRIC_ENABLED=false
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_FIREBASE_TRACKING_ID=
EXPO_PUBLIC_ANALYTICS_DEBUG=true
EXPO_PUBLIC_FEATURE_BIOMETRIC_AUTH=false
EXPO_PUBLIC_FEATURE_OFFLINE_MODE=true
EXPO_PUBLIC_FEATURE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_FEATURE_ANALYTICS=true
EXPO_PUBLIC_FEATURE_CRASH_REPORTING=true

# .env.production
EXPO_PUBLIC_API_URL=https://kiki-app.purplesky-3fddb402.swedencentral.azurecontainerapps.io/api
EXPO_PUBLIC_WS_URL=wss://kiki-app.purplesky-3fddb402.swedencentral.azurecontainerapps.io/ws
EXPO_PUBLIC_JWT_SECRET=${JWT_SECRET}
EXPO_PUBLIC_ENCRYPTION_KEY=${ENCRYPTION_KEY}
EXPO_PUBLIC_BIOMETRIC_ENABLED=true
EXPO_PUBLIC_ENVIRONMENT=production
```

### EAS Build Configuration
```json
{
  "cli": { "version": ">= 7.0.0", "requireCommit": true },
  "build": {
    "base": { "node": "20.11.0" },
    "development": { "distribution": "internal", "developmentClient": true },
    "preview": { "distribution": "internal", "channel": "preview" },
    "production": { "distribution": "store", "channel": "production", "autoIncrement": true }
  }
}
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# E2E tests (iOS)
npm run test:e2e:ios

# E2E tests (Android)
npm run test:e2e:android
```

## 🚀 Deployment

### iOS App Store
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### Google Play Store
```bash
eas build --platform android --profile production
eas submit --platform android
```

### Development Builds
```bash
eas build --profile development --platform all
```

## 📊 API Integration

The mobile app connects to the KIKI Agent Platform backend at:
- **Production**: `https://kiki-app.purplesky-3fddb402.swedencentral.azurecontainerapps.io`
- **WebSocket**: `wss://kiki-app.purplesky-3fddb402.swedencentral.azurecontainerapps.io`

### Key Endpoints Used
- `GET /api/campaigns` - Campaign listing
- `POST /api/campaigns` - Create campaign
- `GET /api/agents` - Agent management
- `GET /api/wallet` - Financial data
- `GET /api/analytics` - Performance metrics
- `GET /api/notifications` - Notification feed
- `POST /api/auth/login` - Authentication
- `POST /api/auth/refresh` - Token refresh

## 🎨 Design System

### Color Palette (KIKI Brand)
```typescript
K = {
  mint: '#10b981',    // Primary actions, success
  blue: '#3b82f6',    // Info, secondary actions
  gold: '#f59e0b',    // Warnings, pending states
  teal: '#14b8a6',    // Analytics, signals
  danger: '#ef4444',  // Errors, destructive actions
  warn: '#f59e0b',    // Caution
  t1: '#f9fafb',      // Primary text
  t2: '#9ca3af',      // Secondary text
  t3: '#6b7280',      // Tertiary text
  g950: '#030712',    // Background
  g900: '#111827',    // Card background
  g850: '#1f2937',    // Elevated surfaces
  cardBorder: '#1f2937',
  cardHover: '#1a2332',
}
```

### Typography Scale
- Display Large: 57px / 64px
- Display Medium: 45px / 52px
- Display Small: 36px / 44px
- Headline Large: 32px / 40px
- Headline Medium: 28px / 36px
- Headline Small: 24px / 32px
- Title Large: 22px / 28px
- Title Medium: 16px / 24px
- Title Small: 14px / 20px
- Body Large: 16px / 24px
- Body Medium: 14px / 20px
- Body Small: 12px / 16px

## 📝 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

- **Email**: support@kiki.ai
- **Documentation**: https://docs.kiki.ai/mobile
- **GitHub Issues**: https://github.com/kiki-agent/kiki-mobile/issues
- **Slack**: https://kiki.ai/slack

---

**Built with ❤️ by the KIKI Agent Platform Team**