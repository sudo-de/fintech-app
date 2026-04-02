import React, { useState, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { FilterBar, FilterType } from '../components/transactions/FilterBar';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { EmptyState } from '../components/common/EmptyState';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/colors';
import { Transaction } from '../types';
import { getRelativeDateLabel, formatCurrency, getCurrentMonth } from '../utils/formatters';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface GroupedDay {
  date: string;
  label: string;
  transactions: Transaction[];
}

export function TransactionsScreen() {
  const { state } = useApp();
  const navigation = useNavigation<NavProp>();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const { transactions } = state;

  const filtered = useMemo(() => {
    let result = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (filter !== 'all') {
      result = result.filter((t) => t.type === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.note.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, filter, search]);

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
  const monthlyIncome = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'income' && t.date.startsWith(month));
    return income.reduce((s, t) => s + t.amount, 0);
  }, [transactions, month]);
  const monthlyExpense = useMemo(() => {
    const expense = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(month));
    return expense.reduce((s, t) => s + t.amount, 0);
  }, [transactions, month]);

  const renderGroup = ({ item }: { item: GroupedDay }) => (
    <View style={styles.group}>
      <Text style={styles.groupDate}>{item.label}</Text>
      {item.transactions.map((t) => (
        <TransactionItem
          key={t.id}
          transaction={t}
          onPress={() => navigation.navigate('AddTransaction', { transaction: t })}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddTransaction', {})}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Month Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: `${COLORS.income}40` }]}>
          <Ionicons name="arrow-down-circle" size={16} color={COLORS.income} />
          <View>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, { color: COLORS.income }]}>
              {formatCurrency(monthlyIncome)}
            </Text>
          </View>
        </View>
        <View style={[styles.summaryCard, { borderColor: `${COLORS.expense}40` }]}>
          <Ionicons name="arrow-up-circle" size={16} color={COLORS.expense} />
          <View>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: COLORS.expense }]}>
              {formatCurrency(monthlyExpense)}
            </Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={COLORS.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search transactions..."
          placeholderTextColor={COLORS.textTertiary}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <FilterBar selected={filter} onSelect={setFilter} />

      {/* List */}
      {grouped.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title={search ? 'No results found' : 'No transactions yet'}
          subtitle={search ? 'Try a different search term' : 'Tap + to add your first transaction'}
        />
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.date}
          renderItem={renderGroup}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
  },
  list: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  group: {
    marginBottom: SPACING.md,
  },
  groupDate: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
