// Wallet Screen - Financial Management
import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Text, TextInput, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Chip, Button, IconButton, Badge, Avatar, Divider } from 'react-native-paper';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { K, spacing, borderRadius, shadows, typography } from '../theme';
import { formatCurrency, formatRelativeTime, formatNumber } from '../utils/formatters';

const WalletScreen = ({ navigation }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  const { wallet, balance, transactions, paymentMethods, isLoading, isTransacting, error, loadWallet, addFunds, withdrawFunds } = useWallet();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  }, [loadWallet]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleAddFunds = async () => {
    if (!amount || parseFloat(amount) <= 0 || !selectedMethod) {
      Alert.alert('Error', 'Please enter a valid amount and select a payment method');
      return;
    }

    try {
      await addFunds(parseFloat(amount), selectedMethod);
      setShowAddFunds(false);
      setAmount('');
      setSelectedMethod(null);
      Alert.alert('Success', 'Funds added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add funds');
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0 || !selectedMethod) {
      Alert.alert('Error', 'Please enter a valid amount and select a payment method');
      return;
    }

    if (parseFloat(amount) > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      await withdrawFunds(parseFloat(amount), selectedMethod);
      setShowWithdraw(false);
      setAmount('');
      setSelectedMethod(null);
      Alert.alert('Success', 'Withdrawal initiated');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to withdraw funds');
    }
  };

  if (!isAuthenticated) {
    return <AuthRequiredScreen navigation={navigation} />;
  }

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
        <View style={styles.headerLeft}>
          <Text style={[themeTypography.headlineMedium, { color: colors.onSurface }]}>Wallet</Text>
          <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            {wallet?.currency || 'USD'} \u2022 {wallet?.accountType || 'Checking'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('WalletDetail')} style={styles.detailBtn}>
            <IconButton icon="account-details" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Balance Card */}
      <Card style={[styles.balanceCard, { backgroundColor: colors.surface }]} elevation={4}>
        <View style={styles.balanceContent}>
          <View style={styles.balanceMain}>
            <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant }]}>Available Balance</Text>
            <Text style={[themeTypography.displaySmall, { color: colors.onSurface, fontWeight: '700' }]}>
              {formatCurrency(balance, wallet?.currency || 'USD')}
            </Text>
          </View>
          <View style={styles.balanceActions}>
            <Button
              mode="outlined"
              style={styles.balanceBtn}
              onPress={() => { setShowAddFunds(true); setAmount(''); setSelectedMethod(null); }}
              icon="plus"
            >
              Add Funds
            </Button>
            <Button
              mode="contained"
              style={styles.balanceBtn}
              onPress={() => { setShowWithdraw(true); setAmount(''); setSelectedMethod(null); }}
              icon="minus"
              color={K.danger}
            >
              Withdraw
            </Button>
          </View>
        </View>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <StatCard title="This Month" value={formatCurrency(2450)} color={K.mint} icon="trending-up" subtitle="+12.5% vs last month" />
        <StatCard title="Pending" value={formatCurrency(450)} color={K.gold} icon="clock" subtitle="3 transactions" />
        <StatCard title="Spent" value={formatCurrency(12800)} color={K.blue} icon="currency-usd" subtitle="Across 47 transactions" />
      </View>

      {/* Payment Methods */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>Payment Methods</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WalletDetail')} style={styles.seeAll}>
            <Text style={[themeTypography.labelMedium, { color: K.blue }]}>Manage</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.paymentMethodsList}>
        {paymentMethods.length > 0 ? (
          paymentMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              selected={selectedMethod === method.id}
              onSelect={() => setSelectedMethod(method.id)}
              onRemove={() => {}}
            />
          ))
        ) : (
          <View style={styles.emptyPaymentContent}>
            <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.md }]}>
              No payment methods yet
            </Text>
            <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              Add a payment method to get started
            </Text>
          </View>
        )}
      </View>

      {/* Recent Transactions */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WalletDetail')} style={styles.seeAll}>
            <Text style={[themeTypography.labelMedium, { color: K.blue }]}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.transactionsList}>
        {transactions.length > 0 ? (
          transactions.slice(0, 5).map((tx) => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))
        ) : (
          <View style={styles.emptyTransactions}>
            <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.md }]}>
              No transactions yet
            </Text>
            <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              Your transaction history will appear here
            </Text>
          </View>
        )}
      </View>

      {/* Add Funds Modal */}
      {showAddFunds && (
        <ModalContent
          title="Add Funds"
          subtitle={`Current balance: ${formatCurrency(balance)}`}
          amount={amount}
          setAmount={setAmount}
          selectedMethod={selectedMethod}
          setSelectedMethod={setSelectedMethod}
          paymentMethods={paymentMethods}
          onConfirm={handleAddFunds}
          onCancel={() => { setShowAddFunds(false); setAmount(''); setSelectedMethod(null); }}
          confirmText="Add Funds"
          confirmColor={K.mint}
        />
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <ModalContent
          title="Withdraw Funds"
          subtitle={`Available: ${formatCurrency(balance)}`}
          amount={amount}
          setAmount={setAmount}
          selectedMethod={selectedMethod}
          setSelectedMethod={setSelectedMethod}
          paymentMethods={paymentMethods}
          onConfirm={handleWithdraw}
          onCancel={() => { setShowWithdraw(false); setAmount(''); setSelectedMethod(null); }}
          confirmText="Withdraw"
          confirmColor={K.danger}
          maxAmount={balance}
        />
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// Payment Method Card
const PaymentMethodCard = ({ method, onSelect, selected, onRemove }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  const typeIcons = {
    card: '\u{1f4b3}',
    bank: '\u{1f3e6}',
    crypto: '\u{20bf}',
  };

  const typeLabels = {
    card: 'Credit/Debit Card',
    bank: 'Bank Account',
    crypto: 'Cryptocurrency',
  };

  return (
    <TouchableOpacity onPress={onSelect} style={[styles.paymentCard, { backgroundColor: colors.surface, borderWidth: selected ? 2 : 1, borderColor: selected ? K.blue : '#1f2937' }]} activeOpacity={0.8}>
      <View style={styles.paymentMain}>
        <View style={styles.paymentIcon}>
          <Text style={{ fontSize: 28 }}>{typeIcons[method.type as keyof typeof typeIcons] || '\u{1f4b3}'}</Text>
        </View>
        <View style={styles.paymentInfo}>
          <View style={styles.paymentTitleRow}>
            <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{typeLabels[method.type as keyof typeof typeLabels]}</Text>
            {method.isDefault && (
              <Badge style={styles.defaultBadge} color={K.mint}>
                Default
              </Badge>
            )}
          </View>
          <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant }]}>
            {method.last4 ? `Ending in ${method.last4}` : method.name}
            {method.expiry && ` \u2022 Expires ${method.expiry}`}
          </Text>
        </View>
      </View>
      <View style={styles.paymentActions}>
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <IconButton icon="delete" size={20} color={K.danger} />
        </TouchableOpacity>
        {selected && (
          <View style={[styles.selectedIndicator, { backgroundColor: K.blue }]} />
        )}
      </View>
    </TouchableOpacity>
  );
};

// Transaction Row
const TransactionRow = ({ transaction }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  const typeColors = {
    credit: K.mint,
    debit: K.danger,
    transfer: K.blue,
    fee: K.gold,
  };

  const typeIcons = {
    credit: '\u2b07',
    debit: '\u2b06',
    transfer: '\u2194',
    fee: '\u26a0',
  };

  const isPositive = transaction.type === 'credit';

  return (
    <TouchableOpacity style={[styles.transactionRow, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={styles.transactionMain}>
        <View style={[styles.transactionIcon, { backgroundColor: typeColors[transaction.type] + '20' }]}>
          <Text style={{ fontSize: 20, color: typeColors[transaction.type] }}>{typeIcons[transaction.type] || '\u{1f4b0}'}</Text>
        </View>
        <View style={styles.transactionInfo}>
          <Text style={[themeTypography.titleMedium, { color: colors.onSurface, fontWeight: '600' }]}>{transaction.description || transaction.type}</Text>
          <View style={styles.transactionMeta}>
            <Badge style={styles.transactionTypeBadge}>
              <Text style={[themeTypography.labelSmall, { color: typeColors[transaction.type], fontWeight: '600' }]}>
                {transaction.type.toUpperCase()}
              </Text>
            </Badge>
            <Text style={[themeTypography.labelSmall, { color: colors.onSurfaceVariant }]}>{formatRelativeTime(transaction.createdAt)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.transactionAmount}>
        <Text style={[themeTypography.titleMedium, { color: isPositive ? K.mint : K.danger, fontWeight: '700' }]}>
          {isPositive ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
        </Text>
        <View style={[styles.transactionStatus, { backgroundColor: 
          transaction.status === 'completed' ? K.mint + '20' : 
          transaction.status === 'pending' ? K.gold + '20' : 
          K.danger + '20'
        }]}>
          <Text style={[themeTypography.labelSmall, { 
            color: transaction.status === 'completed' ? K.mint : 
            transaction.status === 'pending' ? K.gold : K.danger,
            fontWeight: '600' 
          }]}>
            {transaction.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Stat Card
const StatCard = ({ title, value, color, icon, subtitle }) => {
  const { theme, colors, typography: themeTypography } = useTheme();
  return (
    <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surface }]} activeOpacity={0.8}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 24, color }}>{'\u{1f4b0}'}</Text>
      </View>
      <Text style={[themeTypography.headlineSmall, { color, fontWeight: '700' }]}>{value}</Text>
      <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant }]}>{title}</Text>
      {subtitle && (
        <Text style={[themeTypography.labelSmall, { color: K.mint, marginTop: spacing.xs }]}>{subtitle}</Text>
      )}
    </TouchableOpacity>
  );
}

// Modal Content
const ModalContent = ({ title, subtitle, amount, setAmount, selectedMethod, setSelectedMethod, paymentMethods, onConfirm, onCancel, confirmText, confirmColor, maxAmount = 0 }) => {
  const { theme, colors, typography: themeTypography } = useTheme();

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.modalHeader}>
          <Text style={[themeTypography.titleLarge, { color: colors.onSurface }]}>{title}</Text>
          <TouchableOpacity onPress={onCancel}>
            <IconButton icon="close" size={24} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
        {subtitle && (
          <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: spacing.md }]}>{subtitle}</Text>
        )}
        <TextInput
          style={styles.modalInput}
          mode="outlined"
          theme={theme}
          label="Amount"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          right={<Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, marginRight: spacing.sm }]}>USD</Text>}
        />
        <View style={{ marginTop: spacing.md }}>
          <Text style={[themeTypography.labelMedium, { color: colors.onSurfaceVariant, marginBottom: spacing.sm }]}>Payment Method</Text>
          <View style={styles.methodSelector}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSelectedMethod(method.id)}
                style={[
                  styles.methodOption,
                  selectedMethod === method.id && styles.methodOptionSelected,
                ]}
              >
                <Text style={[
                  themeTypography.bodyMedium,
                  { color: selectedMethod === method.id ? '#fff' : colors.onSurface }
                ]}>
                  {method.last4 ? `\u2022\u2022\u2022\u2022 ${method.last4}` : method.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        <View style={styles.modalActions}>
          <Button mode="outlined" style={styles.modalCancelBtn} onPress={onCancel}>Cancel</Button>
          <Button mode="contained" style={styles.modalConfirmBtn} onPress={onConfirm} color={confirmColor}>
            {confirmText}
          </Button>
        </View>
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
        <Text style={[themeTypography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 32 }]}>Please sign in to manage your wallet</Text>
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
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {},
  detailBtn: {
    padding: spacing.xs,
  },
  balanceCard: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  balanceContent: {
    padding: spacing.xl,
  },
  balanceMain: {
    flex: 1,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  balanceBtn: {
    flex: 1,
    height: 48,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    padding: spacing.xs,
  },
  paymentCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  paymentMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  paymentInfo: {
    flex: 1,
    minWidth: 0,
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  defaultBadge: {},
  paymentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  removeBtn: {
    padding: spacing.xs,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyPaymentCard: {
    borderRadius: borderRadius.xl,
  },
  emptyPaymentContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  transactionsList: {
    gap: spacing.sm,
  },
  emptyTransactions: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: '#030712',
  },
  methodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  methodOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#030712',
  },
  methodOptionSelected: {
    backgroundColor: K.blue,
    borderColor: K.blue,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 48,
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

export default WalletScreen;