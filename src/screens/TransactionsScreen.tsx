import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { TransactionFilterModal } from '../components/transactions/TransactionFilterModal';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { SyncErrorBanner } from '../components/common/SyncErrorBanner';
import { useSyncTransactions } from '../hooks/useSyncTransactions';
import { transactionApi } from '../services/api';
import { FONTS, SPACING, RADIUS, SHADOW } from '../constants/colors';
import { Transaction } from '../types';
import { getRelativeDateLabel, getCurrentMonth } from '../utils/formatters';
import { useCurrency, getCurrencyInfo, formatCurrencyWithInfo } from '../context/CurrencyContext';
import { useConvertedTransactions } from '../hooks/useConvertedTransactions';
import { useTheme } from '../context/ThemeContext';
import { showAppAlert } from '../utils/appAlert';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ThemeColors } from '../constants/themes';
import {
  DEFAULT_TX_FILTERS,
  filtersEqualDefault,
  countActiveFilters,
  matchesDatePreset,
  TransactionListFilters,
} from '../utils/transactionFilters';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface GroupedDay {
  date: string;
  label: string;
  transactions: Transaction[];
}

function SwipeableRow({
  transaction,
  colors,
  onView,
  onRequestDelete,
}: {
  transaction: Transaction;
  colors: ThemeColors;
  onView: (t: Transaction) => void;
  onRequestDelete: (t: Transaction) => void;
}) {
  const ref = useRef<Swipeable>(null);

  const renderRight = useCallback(() => (
    <TouchableOpacity
      style={[styles.swipeAction, { backgroundColor: colors.expense }]}
      onPress={() => { ref.current?.close(); onRequestDelete(transaction); }}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="Delete transaction"
    >
      <Ionicons name="trash-outline" size={20} color="#fff" />
      <Text style={styles.swipeActionText}>Delete</Text>
    </TouchableOpacity>
  ), [colors.expense, onRequestDelete, transaction]);

  return (
    <Swipeable ref={ref} renderRightActions={renderRight} overshootRight={false}>
      <TransactionItem transaction={transaction} variant="history" onPress={() => onView(transaction)} />
    </Swipeable>
  );
}

export function TransactionsScreen() {
  const { colors, isDark } = useTheme();
  const { state, setTransactions, deleteTransaction } = useApp();
  const { token } = useAuth();
  const navigation = useNavigation<NavProp>();
  const { formatCurrency, convert, currency: displayCurrency } = useCurrency();

  const [txFilters, setTxFilters] = useState<TransactionListFilters>(DEFAULT_TX_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const { transactions } = state;
  const convertedTransactions = useConvertedTransactions(transactions);

  const { isSyncing, isRefreshing, syncError, sync, clearError } = useSyncTransactions({
    token,
    setTransactions,
  });

  const filtered = useMemo(() => {
    let result = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (txFilters.type !== 'all') result = result.filter((t) => t.type === txFilters.type);
    if (txFilters.categoryId !== 'all') result = result.filter((t) => t.category === txFilters.categoryId);
    result = result.filter((t) =>
      matchesDatePreset(t.date, txFilters.datePreset, txFilters.customStart, txFilters.customEnd)
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.note.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.type === 'income' ? 'income' : 'expense').includes(q) ||
          String(t.amount).includes(q)
      );
    }
    return result;
  }, [transactions, txFilters, search]);

  const grouped = useMemo<GroupedDay[]>(() => {
    const byDate: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      const dayKey = new Date(t.date).toDateString();
      if (!byDate[dayKey]) byDate[dayKey] = [];
      byDate[dayKey].push(t);
    });
    return Object.entries(byDate).map(([date, txns]) => ({
      date,
      label: getRelativeDateLabel(txns[0].date),
      transactions: txns,
    }));
  }, [filtered]);

  const month = getCurrentMonth();
  const monthlyIncome = useMemo(
    () => convertedTransactions.filter((t) => t.type === 'income' && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0),
    [convertedTransactions, month]
  );
  const monthlyExpense = useMemo(
    () => convertedTransactions.filter((t) => t.type === 'expense' && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0),
    [convertedTransactions, month]
  );

  const openDetail = useCallback(
    (t: Transaction) => navigation.navigate('TransactionDetail', { transaction: t }),
    [navigation]
  );

  const requestDelete = useCallback(
    (t: Transaction) => {
      const txnCurrency = getCurrencyInfo(t.currency ?? displayCurrency.code);
      const isForeign = txnCurrency.code !== displayCurrency.code;
      const amountLabel = isForeign
        ? `${formatCurrencyWithInfo(t.amount, txnCurrency)} ≈ ${formatCurrency(convert(t.amount, txnCurrency.code))}`
        : formatCurrencyWithInfo(t.amount, txnCurrency);
      showAppAlert(isDark, 'Delete transaction?', `${t.note || t.category} · ${amountLabel}`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            // Optimistic removal
            deleteTransaction(t.id);
            try {
              if (token) await transactionApi.delete(token, t.id);
            } catch (e: any) {
              // Rollback — re-add the transaction to local state
              setTransactions([...state.transactions, t].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              ));
              showAppAlert(isDark, 'Delete failed', e?.message ?? 'Try again.', [{ text: 'OK' }]);
            }
          },
        },
      ]);
    },
    [deleteTransaction, formatCurrency, convert, displayCurrency, token, setTransactions, state.transactions, isDark]
  );

  const filterActiveCount = countActiveFilters(txFilters);
  const filtersOn = !filtersEqualDefault(txFilters);
  const showResultBar = filtersOn || search.trim().length > 0;
  const resultLabel = filtered.length === 1 ? '1 transaction' : `${filtered.length} transactions`;

  const renderGroup = ({ item }: { item: GroupedDay }) => (
    <View style={styles.group}>
      {/* Group header */}
      <View style={styles.groupHeader}>
        <Text style={[styles.groupDate, { color: colors.textSecondary }]}>{item.label}</Text>
        <View style={[styles.groupCountPill, { backgroundColor: colors.surface }]}>
          <Text style={[styles.groupCountText, { color: colors.textTertiary }]}>
            {item.transactions.length}
          </Text>
        </View>
      </View>
      {item.transactions.map((t) => (
        <SwipeableRow
          key={t.id}
          transaction={t}
          colors={colors}
          onView={openDetail}
          onRequestDelete={requestDelete}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Transactions</Text>
          <Text style={[styles.screenSub, { color: colors.textTertiary }]}>
            {transactions.length} total
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary, ...SHADOW.large }]}
          onPress={() => navigation.navigate('AddTransaction', {})}
          activeOpacity={0.8}
          accessibilityLabel="Add transaction"
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Summary Cards ────────────────────────────────────────────── */}
      <View style={styles.summaryRow}>
        <LinearGradient
          colors={['#4CAF5022', '#4CAF5008']}
          style={[styles.summaryCard, { borderColor: '#4CAF5040' }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.summaryIcon}>
            <Ionicons name="arrow-up-circle" size={18} color="#4CAF50" />
          </View>
          <View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
              {formatCurrency(monthlyIncome)}
            </Text>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['#FF525222', '#FF525208']}
          style={[styles.summaryCard, { borderColor: '#FF525240' }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.summaryIcon}>
            <Ionicons name="arrow-down-circle" size={18} color="#FF5252" />
          </View>
          <View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: '#FF5252' }]}>
              {formatCurrency(monthlyExpense)}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* ── Error Banner ─────────────────────────────────────────────── */}
      {syncError ? (
        <SyncErrorBanner
          message={syncError}
          onRetry={() => sync()}
          onDismiss={clearError}
        />
      ) : null}

      {/* ── Search + Filter ───────────────────────────────────────────── */}
      <View style={styles.searchFilterRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={17} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions…"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            {
              backgroundColor: filterActiveCount > 0 ? `${colors.primary}18` : colors.card,
              borderColor: filterActiveCount > 0 ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={filterActiveCount > 0 ? colors.primary : colors.textSecondary}
          />
          {filterActiveCount > 0 ? (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{filterActiveCount > 9 ? '9+' : filterActiveCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* ── Result count bar ─────────────────────────────────────────── */}
      {showResultBar ? (
        <View style={[styles.resultBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="funnel" size={12} color={colors.primary} />
          <Text style={[styles.resultBarText, { color: colors.textSecondary }]}>
            {resultLabel} found
          </Text>
          <TouchableOpacity
            onPress={() => { setTxFilters(DEFAULT_TX_FILTERS); setSearch(''); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.resultBarClear, { color: colors.primary }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TransactionFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        value={txFilters}
        onApply={setTxFilters}
      />

      {/* ── Initial sync overlay ─────────────────────────────────────── */}
      {isSyncing && <LoadingOverlay message="Loading transactions…" />}

      {/* ── List ─────────────────────────────────────────────────────── */}
      {!isSyncing && (
        grouped.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title={search || filtersOn ? 'No matching transactions' : 'No transactions yet'}
            subtitle={
              search || filtersOn
                ? 'Try adjusting your search or filters.'
                : 'Tap + to add your first transaction.'
            }
          />
        ) : (
          <FlatList
            data={grouped}
            keyExtractor={(item) => item.date}
            renderItem={renderGroup}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => sync({ refresh: true })}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  screenTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSub: {
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryLabel: {
    fontSize: FONTS.sizes.xs,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // Search + filter
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    minWidth: 0,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },

  // Result bar
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  resultBarText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    flex: 1,
  },
  resultBarClear: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },

  // List
  list: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  group: {
    marginBottom: SPACING.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingHorizontal: 2,
  },
  groupDate: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  groupCountPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  groupCountText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Swipe
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginLeft: SPACING.sm,
    gap: 3,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
