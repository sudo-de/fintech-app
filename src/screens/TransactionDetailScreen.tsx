import React, { useCallback, useMemo, useRef, useEffect, useLayoutEffect, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCurrency, getCurrencyInfo, formatCurrencyWithInfo } from '../context/CurrencyContext';
import { getCategoryInfo } from '../constants/categories';
import { FONTS, SPACING, RADIUS } from '../constants/colors';
import { transactionApi } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { formatRate } from '../utils/historicalRates';
import { RootStackParamList } from '../navigation/RootNavigator';
import { showAppAlert } from '../utils/appAlert';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TransactionDetail'>;
type Route = RouteProp<RootStackParamList, 'TransactionDetail'>;

export function TransactionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const paramTx = route.params?.transaction;

  const { colors, isDark } = useTheme();
  const { formatCurrency, convert, currency: displayCurrency } = useCurrency();
  const txnCurrency = getCurrencyInfo(paramTx?.currency ?? displayCurrency.code);
  const isForeignCurrency = txnCurrency.code !== displayCurrency.code;
  const { state, deleteTransaction, addTransaction } = useApp();
  const { token } = useAuth();

  const transaction = useMemo(() => {
    if (!paramTx) return null;
    return state.transactions.find((t) => t.id === paramTx.id) ?? paramTx;
  }, [state.transactions, paramTx]);

  useLayoutEffect(() => {
    if (!paramTx) navigation.goBack();
  }, [paramTx, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!paramTx) return;
      if (state.transactions.length === 0) return;
      if (!state.transactions.some((t) => t.id === paramTx.id)) navigation.goBack();
    }, [state.transactions, paramTx, navigation])
  );

  const category = transaction ? getCategoryInfo(transaction.category) : getCategoryInfo('other');
  const isIncome = transaction?.type === 'income';
  const typeColor = isIncome ? '#4CAF50' : '#FF5252';
  const catColor = transaction
    ? ((colors.categories as Record<string, string>)[transaction.category] ?? category.color)
    : category.color;
  const note = transaction?.note?.trim() ?? '';

  // ── Entrance animations ───────────────────────────────────────────────────
  const heroScale  = useRef(new Animated.Value(0.85)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const cardY      = useRef(new Animated.Value(24)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Count-up for amount
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayAmount, setDisplayAmount] = useState(0);

  useEffect(() => {
    if (!transaction) return;
    countAnim.setValue(0);
    const id = countAnim.addListener(({ value }) => setDisplayAmount(value));
    Animated.parallel([
      Animated.spring(heroScale, { toValue: 1, tension: 80, friction: 9, useNativeDriver: true }),
      Animated.timing(heroOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardY, { toValue: 0, duration: 400, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(countAnim, {
        toValue: transaction.amount,
        duration: 900,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
    return () => countAnim.removeListener(id);
  }, [transaction]);

  const openEdit = () => {
    if (transaction) navigation.navigate('AddTransaction', { transaction });
  };

  const requestDelete = () => {
    if (!transaction) return;
    showAppAlert(
      isDark,
      'Delete transaction?',
      `${note || category.label} · ${formatCurrencyWithInfo(transaction.amount, txnCurrency)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            // Optimistic: remove locally and navigate back
            deleteTransaction(transaction.id);
            navigation.goBack();
            if (token) {
              try {
                await transactionApi.delete(token, transaction.id);
              } catch (e: any) {
                // Rollback — restore the deleted transaction
                addTransaction(transaction);
                showAppAlert(
                  isDark,
                  'Delete failed',
                  e?.message ?? 'Could not delete. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            }
          },
        },
      ]
    );
  };

  if (!transaction) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']} />
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>

      {/* ── Navigation bar ───────────────────────────────────────────── */}
      <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.navBtn, { backgroundColor: colors.card }]}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Details</Text>
        <View style={styles.navActions} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ────────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: heroOpacity, transform: [{ scale: heroScale }] }}>
          <LinearGradient
            colors={isIncome
              ? ['#4CAF5022', '#4CAF5008']
              : ['#FF525222', '#FF525208']}
            style={[styles.heroCard, { borderColor: `${typeColor}30` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Category icon */}
            <View style={[styles.heroIconWrap, { backgroundColor: `${catColor}25` }]}>
              <Ionicons name={category.icon as any} size={36} color={catColor} />
            </View>

            {/* Animated amount */}
            <View style={styles.amountRow}>
              <Text style={[styles.heroSign, { color: typeColor }]}>
                {isIncome ? '+' : '−'}
              </Text>
              <Text style={[styles.heroAmount, { color: typeColor }]}>
                {formatCurrencyWithInfo(Math.round(displayAmount * 100) / 100, txnCurrency)}
              </Text>
            </View>
            {isForeignCurrency && (
              <View style={styles.heroConvertedRow}>
                <Text style={[styles.heroConverted, { color: `${typeColor}80` }]}>
                  {transaction.convertedAmount !== undefined && transaction.baseCurrency
                    ? `≈ ${formatCurrency(
                        transaction.baseCurrency === displayCurrency.code
                          ? transaction.convertedAmount
                          : convert(transaction.convertedAmount, transaction.baseCurrency)
                      )} ${displayCurrency.code}`
                    : `≈ ${formatCurrency(convert(transaction.amount, txnCurrency.code))} ${displayCurrency.code}`}
                </Text>
                {transaction.rateUsed !== undefined && (
                  <Ionicons name="lock-closed" size={11} color={`${typeColor}80`} />
                )}
              </View>
            )}

            {/* Note / title */}
            <Text style={[styles.heroNote, { color: colors.textSecondary }]} numberOfLines={2}>
              {note || category.label}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ── Detail card ──────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardY }] }}>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

            <DetailRow
              icon="pricetag-outline"
              label="Category"
              iconColor={catColor}
              colors={colors}
            >
              <View style={styles.categoryChip}>
                <View style={[styles.catDot, { backgroundColor: catColor }]} />
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                  {category.label}
                </Text>
              </View>
            </DetailRow>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <DetailRow
              icon="calendar-outline"
              label="Date & time"
              iconColor={colors.primary}
              colors={colors}
            >
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {formatDateTime(transaction.date)}
              </Text>
            </DetailRow>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <DetailRow
              icon="document-text-outline"
              label="Description"
              iconColor={colors.secondary}
              colors={colors}
            >
              <Text
                style={[
                  styles.detailValue,
                  !note && { color: colors.textTertiary, fontStyle: 'italic' },
                  note && { color: colors.textPrimary },
                ]}
              >
                {note || 'No description'}
              </Text>
            </DetailRow>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <DetailRow
              icon="cash-outline"
              label="Currency"
              iconColor="#4ECDC4"
              colors={colors}
            >
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {txnCurrency.flag} {txnCurrency.name} · {txnCurrency.code}
              </Text>
            </DetailRow>

            {transaction.rateUsed !== undefined && transaction.baseCurrency && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <DetailRow
                  icon="lock-closed-outline"
                  label="Exchange rate (locked)"
                  iconColor="#F59E0B"
                  colors={colors}
                >
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                    {formatRate(transaction.rateUsed, transaction.currency, transaction.baseCurrency)}
                  </Text>
                  <View style={styles.detailSubRow}>
                    <Text style={[styles.detailSubValue, { color: colors.textTertiary }]}>
                      {new Date(transaction.date).toISOString().split('T')[0]}
                      {'  ·  Historical · immutable  '}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={11} color={colors.textTertiary} />
                  </View>
                </DetailRow>
              </>
            )}

            {transaction.convertedAmount !== undefined && transaction.baseCurrency && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <DetailRow
                  icon="swap-horizontal-outline"
                  label="Converted amount (locked)"
                  iconColor="#8B5CF6"
                  colors={colors}
                >
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                    {formatCurrency(transaction.convertedAmount)} {transaction.baseCurrency}
                  </Text>
                  <View style={styles.detailSubRow}>
                    <Text style={[styles.detailSubValue, { color: colors.textTertiary }]}>
                      {'Fixed at creation · never recalculated  '}
                    </Text>
                    <Ionicons name="shield-checkmark-outline" size={11} color={colors.textTertiary} />
                  </View>
                </DetailRow>
              </>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <DetailRow
              icon={isIncome ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
              label="Type"
              iconColor={typeColor}
              colors={colors}
            >
              <View style={[styles.typePill, { backgroundColor: `${typeColor}22`, borderWidth: 1, borderColor: `${typeColor}45`, alignSelf: 'flex-start' }]}>
                <Ionicons
                  name={isIncome ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={typeColor}
                />
                <Text style={[styles.typePillText, { color: typeColor }]}>
                  {isIncome ? 'Income' : 'Expense'}
                </Text>
              </View>
            </DetailRow>
          </View>
        </Animated.View>

        {/* ── Action buttons ───────────────────────────────────────────── */}
        <Animated.View style={[styles.actionRow, { opacity: cardOpacity }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}
            onPress={openEdit}
            activeOpacity={0.75}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${colors.expense}18`, borderColor: `${colors.expense}40` }]}
            onPress={requestDelete}
            activeOpacity={0.75}
          >
            <Ionicons name="trash-outline" size={20} color={colors.expense} />
            <Text style={[styles.actionBtnText, { color: colors.expense }]}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── DetailRow sub-component ───────────────────────────────────────────────────
function DetailRow({
  icon,
  label,
  iconColor,
  colors,
  children,
}: {
  icon: string;
  label: string;
  iconColor: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon as any} size={16} color={iconColor} />
      </View>
      <View style={styles.detailContent}>
        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  navActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },

  // Hero card
  heroCard: {
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  typePillText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: SPACING.sm,
  },
  heroSign: {
    fontSize: 34,
    fontWeight: '700',
    paddingBottom: 4,
  },
  heroAmount: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  heroNote: {
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  heroConvertedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  heroConverted: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Detail card
  detailCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailContent: { flex: 1 },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  detailSubValue: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  detailSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52 + SPACING.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
});
