import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCurrency, CURRENCIES, getCurrencyInfo } from '../context/CurrencyContext';
import { transactionApi, userFacingApiMessage } from '../services/api';
import { FONTS, SPACING, RADIUS } from '../constants/colors';
import { getCategoriesForType } from '../constants/categories';
import { TransactionType, CategoryId } from '../types';
import { mapBackendToTransaction } from '../utils/transactionMap';
import { fetchHistoricalRate, formatRate } from '../utils/historicalRates';
import { RootStackParamList } from '../navigation/RootNavigator';
import { showAppAlert } from '../utils/appAlert';

type AddRoute = RouteProp<RootStackParamList, 'AddTransaction'>;
type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddTransaction'>;

function defaultFormState() {
  return {
    type: 'expense' as const,
    amount: '',
    category: 'food' as CategoryId,
    note: '',
    date: new Date().toISOString(),
  };
}

export function AddTransactionScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<AddRoute>();
  const { colors, isDark } = useTheme();
  const { currency, convert } = useCurrency();
  const { addTransaction, updateTransaction, deleteTransaction } = useApp();
  const { token } = useAuth();
  const existing = route.params?.transaction;
  const isEdit = !!existing;

  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [txnCurrencyCode, setTxnCurrencyCode] = useState(existing?.currency ?? currency.code);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [category, setCategory] = useState<CategoryId>(existing?.category ?? 'food');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Live historical-rate preview shown in the hero card while the user edits
  const [ratePreview, setRatePreview] = useState<{
    loading: boolean;
    rate: number | null;
    forDate: string;
    forCurrency: string;
  }>(() => ({
    loading: false,
    rate: existing?.rateUsed ?? null,
    forDate: (existing?.date ?? '').split('T')[0],
    forCurrency: existing?.currency ?? '',
  }));

  const txnCurrencyInfo = getCurrencyInfo(txnCurrencyCode);

  // Animate type toggle pill
  const toggleAnim = useRef(new Animated.Value(type === 'expense' ? 0 : 1)).current;
  // Animate hero section on mount
  const heroAnim = useRef(new Animated.Value(0)).current;
  // Animate type icons on switch
  const expenseIconScale = useRef(new Animated.Value(type === 'expense' ? 1 : 0.8)).current;
  const incomeIconScale  = useRef(new Animated.Value(type === 'income'  ? 1 : 0.8)).current;
  // Pulse save button when amount becomes valid
  const savePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const accent = type === 'expense' ? colors.expense : colors.income;
  const accentBg: [string, string] =
    type === 'expense'
      ? [`${colors.expense}15`, `${colors.expense}07`]
      : [`${colors.income}15`, `${colors.income}07`];

  const animateToggle = (toExpense: boolean) => {
    const entering  = toExpense ? expenseIconScale : incomeIconScale;
    const leaving   = toExpense ? incomeIconScale  : expenseIconScale;
    Animated.parallel([
      Animated.spring(toggleAnim, {
        toValue: toExpense ? 0 : 1,
        tension: 120,
        friction: 10,
        useNativeDriver: false,
      }),
      // shrink leaving icon
      Animated.spring(leaving, {
        toValue: 0.7,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
      // bounce entering icon
      Animated.sequence([
        Animated.spring(entering, { toValue: 1.25, tension: 250, friction: 6, useNativeDriver: true }),
        Animated.spring(entering, { toValue: 1,    tension: 200, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const leaveAddFlow = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs', { screen: 'Transactions' });
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.transaction) return;
      const d = defaultFormState();
      setType(d.type);
      setAmount(d.amount);
      setCategory(d.category);
      setNote(d.note);
      setDate(d.date);
      toggleAnim.setValue(0);
    }, [route.params?.transaction])
  );

  const categories = getCategoriesForType(type);

  const parsedAmount = useMemo(() => {
    const n = parseFloat(amount.replace(/,/g, ''));
    return { valid: amount.trim() !== '' && !isNaN(n) && n > 0, value: n };
  }, [amount]);

  const prevValid = useRef(false);
  useEffect(() => {
    if (parsedAmount.valid && !prevValid.current) {
      Animated.sequence([
        Animated.spring(savePulse, { toValue: 1.04, tension: 250, friction: 6, useNativeDriver: true }),
        Animated.spring(savePulse, { toValue: 1,    tension: 200, friction: 8, useNativeDriver: true }),
      ]).start();
    }
    prevValid.current = parsedAmount.valid;
  }, [parsedAmount.valid]);

  // Fetch historical rate for the preview whenever the date or transaction currency changes
  useEffect(() => {
    if (txnCurrencyCode === currency.code) {
      setRatePreview({ loading: false, rate: null, forDate: '', forCurrency: '' });
      return;
    }
    const dateStr = date.split('T')[0];
    if (
      ratePreview.forDate === dateStr &&
      ratePreview.forCurrency === txnCurrencyCode &&
      !ratePreview.loading &&
      ratePreview.rate !== null
    ) return;

    setRatePreview((p) => ({ ...p, loading: true, forDate: dateStr, forCurrency: txnCurrencyCode }));
    let cancelled = false;
    fetchHistoricalRate(txnCurrencyCode, currency.code, dateStr).then((rate) => {
      if (!cancelled) setRatePreview({ loading: false, rate, forDate: dateStr, forCurrency: txnCurrencyCode });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txnCurrencyCode, date, currency.code]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    animateToggle(newType === 'expense');
    const cats = getCategoriesForType(newType);
    if (!cats.find((c) => c.id === category)) {
      setCategory(cats[0].id);
    }
  };

  const handleSave = async () => {
    if (!parsedAmount.valid) {
      showAppAlert(isDark, 'Check amount', 'Enter a number greater than zero.', [{ text: 'OK' }]);
      return;
    }
    if (!token) {
      showAppAlert(isDark, 'Not signed in', 'Please sign in to save transactions.', [{ text: 'OK' }]);
      return;
    }

    setSaving(true);

    // ── Fetch and lock historical exchange rate ────────────────────────────
    let snapshot: {
      convertedAmount?: number;
      baseCurrency?: string;
      rateUsed?: number;
    } = {};

    if (txnCurrencyCode !== currency.code) {
      const dateStr = date.split('T')[0];
      try {
        const rate =
          ratePreview.rate !== null &&
          ratePreview.forDate === dateStr &&
          ratePreview.forCurrency === txnCurrencyCode
            ? ratePreview.rate
            : await fetchHistoricalRate(txnCurrencyCode, currency.code, dateStr);

        snapshot = {
          convertedAmount: parsedAmount.value * rate,
          baseCurrency: currency.code,
          rateUsed: rate,
        };
      } catch {
        showAppAlert(
          isDark,
          'Exchange rate unavailable',
          'Could not load a rate for this date. Pick another date or set the transaction currency to match your display currency.',
          [{ text: 'OK' }]
        );
        setSaving(false);
        return;
      }
    }

    const payload = {
      type,
      amount: parsedAmount.value,
      currency: txnCurrencyCode,
      category,
      note: note.trim(),
      date,
    };

    try {
      if (isEdit && existing) {
        updateTransaction({ ...existing, ...payload, ...snapshot });
        leaveAddFlow();
        try {
          await transactionApi.update(token, existing.id, payload);
        } catch (e: unknown) {
          updateTransaction(existing);
          showAppAlert(isDark, 'Save failed', userFacingApiMessage(e), [{ text: 'OK' }]);
        }
      } else {
        const created = await transactionApi.create(token, payload);
        addTransaction({ ...mapBackendToTransaction(created), ...snapshot });
        leaveAddFlow();
      }
    } catch (e: unknown) {
      showAppAlert(isDark, 'Could not save', userFacingApiMessage(e), [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existing || !token) return;
    showAppAlert(isDark, 'Delete transaction?', 'This removes the entry from your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          // Optimistic
          deleteTransaction(existing.id);
          leaveAddFlow();
          try {
            await transactionApi.delete(token, existing.id);
          } catch (e: unknown) {
            addTransaction(existing);
            showAppAlert(isDark, 'Delete failed', userFacingApiMessage(e), [{ text: 'OK' }]);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const noonISO = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).toISOString();

  const today = new Date();
  const selectedDate = new Date(date);

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setDate(noonISO(d));
  };

  const isToday = selectedDate.toDateString() === today.toDateString();
  const isYesterday = selectedDate.toDateString() === new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString();

  // Calendar modal
  const [calOpen, setCalOpen] = useState(false);
  const [calYear, setCalYear] = useState(selectedDate.getFullYear());
  const [calMonth, setCalMonth] = useState(selectedDate.getMonth());

  const openCal = () => {
    setCalYear(selectedDate.getFullYear());
    setCalMonth(selectedDate.getMonth());
    setCalOpen(true);
  };

  const calTitle = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });

  const calDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1);
    const last = new Date(calYear, calMonth + 1, 0);
    const pad = first.getDay();
    const cells: Array<{ day: number | null; iso: string | null; isToday: boolean }> = [];
    for (let i = 0; i < pad; i++) cells.push({ day: null, iso: null, isToday: false });
    for (let d = 1; d <= last.getDate(); d++) {
      const dd = new Date(calYear, calMonth, d);
      cells.push({ day: d, iso: noonISO(dd), isToday: dd.toDateString() === today.toDateString() });
    }
    return cells;
  }, [calYear, calMonth]);

  const shiftCalMonth = (delta: number) => {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCalMonth(m);
    setCalYear(y);
  };

  const togglePillX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* ── Nav bar ───────────────────────────────────────────────────── */}
        <View style={styles.navbar}>
          <TouchableOpacity
            onPress={leaveAddFlow}
            style={[styles.navIconBtn, { backgroundColor: colors.card }]}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.textPrimary }]}>
            {isEdit ? 'Edit transaction' : 'New transaction'}
          </Text>
          <View style={styles.navRight}>
            {isEdit ? (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting || saving}
                style={[styles.navIconBtn, { backgroundColor: `${colors.expense}18` }]}
                accessibilityLabel="Delete"
              >
                {deleting
                  ? <ActivityIndicator size="small" color={colors.expense} />
                  : <Ionicons name="trash-outline" size={20} color={colors.expense} />}
              </TouchableOpacity>
            ) : <View style={styles.navIconBtn} />}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero amount ───────────────────────────────────────────────── */}
          <Animated.View style={{ opacity: heroAnim, transform: [{ scale: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
            <LinearGradient
              colors={accentBg as [string, string]}
              style={[styles.heroCard, { borderColor: `${accent}25` }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              {/* Type toggle */}
              <View style={[styles.typeTrack, { backgroundColor: colors.card }]}>
                <Animated.View
                  style={[
                    styles.typePill,
                    { backgroundColor: accent, left: togglePillX },
                  ]}
                />
                {(['expense', 'income'] as TransactionType[]).map((t) => {
                  const iconScale = t === 'expense' ? expenseIconScale : incomeIconScale;
                  const active = type === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={styles.typeBtn}
                      onPress={() => handleTypeChange(t)}
                      activeOpacity={0.8}
                    >
                      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                        <Ionicons
                          name={t === 'expense' ? 'trending-down' : 'trending-up'}
                          size={16}
                          color={active ? '#FFFFFF' : colors.textTertiary}
                        />
                      </Animated.View>
                      <Text style={[styles.typeBtnText, { color: active ? '#FFFFFF' : colors.textTertiary }]}>
                        {t === 'expense' ? 'Expense' : 'Income'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount input */}
              <View style={styles.amountRow}>
                <TouchableOpacity
                  onPress={() => setCurrencyPickerVisible(true)}
                  style={[styles.currencyBtn, { borderColor: `${accent}40`, backgroundColor: `${accent}12` }]}
                  activeOpacity={0.7}
                  accessibilityLabel="Change transaction currency"
                >
                  <Text style={[styles.currencySymbol, { color: accent }]}>{txnCurrencyInfo.symbol}</Text>
                  <Ionicons name="chevron-down" size={11} color={`${accent}99`} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.amountInput, { color: accent }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={`${accent}50`}
                  keyboardType="decimal-pad"
                  autoFocus={!isEdit}
                  selectionColor={accent}
                />
              </View>
              {txnCurrencyCode !== currency.code && (
                <View style={styles.ratePreviewBlock}>
                  {ratePreview.loading ? (
                    <View style={styles.ratePreviewRow}>
                      <ActivityIndicator size="small" color={`${accent}90`} />
                      <Text style={[styles.convertNote, { color: `${accent}80`, marginTop: 0 }]}>
                        Fetching {date.split('T')[0]} rate…
                      </Text>
                    </View>
                  ) : ratePreview.rate !== null ? (
                    <>
                      <Text style={[styles.convertNote, { color: `${accent}80`, marginTop: 0 }]}>
                        ≈ {currency.symbol}
                        {parsedAmount.valid
                          ? (parsedAmount.value * ratePreview.rate).toFixed(2)
                          : '0.00'}{' '}
                        {currency.code}
                      </Text>
                      <View style={styles.rateLockLabelRow}>
                        <Text style={[styles.rateLockLabel, { color: `${accent}55` }]}>
                          {formatRate(ratePreview.rate, txnCurrencyCode, currency.code)}
                          {'  ·  '}{ratePreview.forDate}{'  ·  '}
                        </Text>
                        <Ionicons name="lock-closed" size={10} color={`${accent}55`} />
                        <Text style={[styles.rateLockLabel, { color: `${accent}55` }]}>{' locked at save'}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={[styles.convertNote, { color: `${accent}80`, marginTop: 0 }]}>
                      ≈ {currency.symbol}
                      {parsedAmount.valid
                        ? convert(parsedAmount.value, txnCurrencyCode).toFixed(2)
                        : '0.00'}{' '}
                      {currency.code}
                    </Text>
                  )}
                </View>
              )}
              {!parsedAmount.valid && amount.length > 0 ? (
                <Text style={[styles.amountError, { color: colors.expense }]}>
                  Enter a valid amount greater than 0
                </Text>
              ) : null}
            </LinearGradient>
          </Animated.View>

          {/* ── Category ─────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionNum, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.sectionNumText, { color: colors.primary }]}>1</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Category</Text>
            </View>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <AnimatedCatItem
                  key={cat.id}
                  cat={cat}
                  active={category === cat.id}
                  colors={colors}
                  onPress={() => setCategory(cat.id)}
                />
              ))}
            </View>
          </View>

          {/* ── Date ─────────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionNum, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.sectionNumText, { color: colors.primary }]}>2</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Date</Text>
            </View>

            {/* Selected date card — tap to open calendar */}
            <TouchableOpacity
              style={[styles.selectedDateCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={openCal}
              activeOpacity={0.75}
            >
              <TouchableOpacity
                style={[styles.dateNavBtn, { backgroundColor: colors.surface }]}
                onPress={() => shiftDay(-1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.selectedDateCenter}>
                <View style={[styles.selectedDateIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="calendar" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.selectedDateMain, { color: colors.textPrimary }]}>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <Text style={[styles.selectedDateSub, { color: colors.textTertiary }]}>
                  {isToday ? 'Today' : isYesterday ? 'Yesterday' : selectedDate.getFullYear().toString()}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.dateNavBtn, { backgroundColor: colors.surface }]}
                onPress={() => shiftDay(1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Calendar modal */}
            <Modal
              visible={calOpen}
              transparent
              animationType="slide"
              onRequestClose={() => setCalOpen(false)}
            >
              <TouchableOpacity
                style={[styles.calBackdrop, { backgroundColor: colors.overlay }]}
                activeOpacity={1}
                onPress={() => setCalOpen(false)}
              />
              <View style={[styles.calSheet, { backgroundColor: colors.card }]}>
                {/* Handle */}
                <View style={[styles.calHandle, { backgroundColor: colors.border }]} />

                {/* Month nav */}
                <View style={styles.calNav}>
                  <TouchableOpacity
                    style={[styles.calNavBtn, { backgroundColor: colors.surface }]}
                    onPress={() => shiftCalMonth(-1)}
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={[styles.calNavTitle, { color: colors.textPrimary }]}>{calTitle}</Text>
                  <TouchableOpacity
                    style={[styles.calNavBtn, { backgroundColor: colors.surface }]}
                    onPress={() => shiftCalMonth(1)}
                  >
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Weekday row */}
                <View style={styles.calWeekRow}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <Text key={d} style={[styles.calWeekLabel, { color: colors.textTertiary }]}>{d}</Text>
                  ))}
                </View>

                {/* Day grid */}
                <View style={styles.calGrid}>
                  {calDays.map((cell, i) => {
                    if (!cell.day) return <View key={`p-${i}`} style={styles.calCell} />;
                    const sel = cell.iso !== null && new Date(cell.iso).toDateString() === selectedDate.toDateString();
                    return (
                      <TouchableOpacity
                        key={cell.iso}
                        style={[
                          styles.calCell,
                          sel && [styles.calCellSelected, { backgroundColor: colors.primary }],
                          !sel && cell.isToday && [styles.calCellToday, { borderColor: colors.primary }],
                        ]}
                        onPress={() => {
                          if (cell.iso) setDate(cell.iso);
                          setCalOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.calDayText,
                          { color: sel ? '#fff' : cell.isToday ? colors.primary : colors.textPrimary },
                          sel && { fontWeight: '800' },
                        ]}>
                          {cell.day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Done */}
                <TouchableOpacity
                  style={[styles.calDoneBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setCalOpen(false)}
                >
                  <Text style={styles.calDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </Modal>

            {/* Quick picks */}
            <View style={styles.quickPickRow}>
              {[
                { label: 'Today', icon: 'today-outline' as const, iso: noonISO(today) },
                { label: 'Yesterday', icon: 'calendar-outline' as const, iso: noonISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) },
              ].map((q) => {
                const active = new Date(q.iso).toDateString() === selectedDate.toDateString();
                return (
                  <TouchableOpacity
                    key={q.label}
                    style={[
                      styles.quickChip,
                      {
                        backgroundColor: active ? `${colors.primary}18` : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setDate(q.iso)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={q.icon} size={13} color={active ? colors.primary : colors.textTertiary} />
                    <Text style={[styles.quickChipText, { color: active ? colors.primary : colors.textSecondary }]}>
                      {q.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Note ─────────────────────────────────────────────────────── */}
          <View style={[styles.section, { marginBottom: SPACING.xl }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionNum, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.sectionNumText, { color: colors.primary }]}>3</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Note</Text>
              <Text style={[styles.sectionOptional, { color: colors.textTertiary }]}>optional</Text>
            </View>
            <View style={[styles.noteWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="pencil-outline" size={16} color={colors.textTertiary} style={styles.noteIcon} />
              <TextInput
                style={[styles.noteInput, { color: colors.textPrimary }]}
                value={note}
                onChangeText={setNote}
                placeholder="Add a memo, merchant, or reminder…"
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
                returnKeyType="done"
              />
            </View>
          </View>
        </ScrollView>

        {/* ── Save button ───────────────────────────────────────────────── */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Animated.View style={{ transform: [{ scale: savePulse }] }}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: parsedAmount.valid ? accent : colors.card },
            ]}
            onPress={handleSave}
            disabled={saving || !parsedAmount.valid}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={isEdit ? 'Save changes' : 'Add transaction'}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons
                  name={isEdit ? 'checkmark-circle' : 'add-circle'}
                  size={22}
                  color={parsedAmount.valid ? '#FFFFFF' : colors.textTertiary}
                />
                <Text style={[styles.saveBtnText, { color: parsedAmount.valid ? '#FFFFFF' : colors.textTertiary }]}>
                  {isEdit ? 'Save changes' : 'Add transaction'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          </Animated.View>
        </View>

      </KeyboardAvoidingView>

      {/* ── Currency picker modal ─────────────────────────────────────── */}
      <Modal
        visible={currencyPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCurrencyPickerVisible(false)}
      >
        <Pressable
          style={[styles.currencyModalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setCurrencyPickerVisible(false)}
        >
          <Pressable
            style={[styles.currencyModalSheet, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <View style={[styles.currencyModalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.currencyModalTitle, { color: colors.textPrimary }]}>
              Transaction Currency
            </Text>
            <Text style={[styles.currencyModalSub, { color: colors.textTertiary }]}>
              Choose the currency this amount is in
            </Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(c) => c.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = item.code === txnCurrencyCode;
                return (
                  <TouchableOpacity
                    style={[
                      styles.currencyPickerRow,
                      {
                        backgroundColor: selected ? `${accent}12` : 'transparent',
                        borderColor: selected ? `${accent}30` : colors.divider,
                      },
                    ]}
                    onPress={() => {
                      setTxnCurrencyCode(item.code);
                      setCurrencyPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.currencyPickerFlag}>{item.flag}</Text>
                    <View style={styles.currencyPickerInfo}>
                      <Text style={[styles.currencyPickerName, { color: colors.textPrimary }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.currencyPickerCode, { color: colors.textTertiary }]}>
                        {item.code}
                      </Text>
                    </View>
                    <Text style={[styles.currencyPickerSymbol, { color: selected ? accent : colors.textSecondary }]}>
                      {item.symbol}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={20} color={accent} style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

// ── Animated category item ────────────────────────────────────────────────────
function AnimatedCatItem({
  cat,
  active,
  colors,
  onPress,
}: {
  cat: { id: string; icon: string; label: string; color: string };
  active: boolean;
  colors: any;
  onPress: () => void;
}) {
  const scale     = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scale,     { toValue: 1.06, tension: 250, friction: 6, useNativeDriver: true }),
          Animated.spring(scale,     { toValue: 1,    tension: 200, friction: 8, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.spring(iconScale, { toValue: 1.3,  tension: 280, friction: 5, useNativeDriver: true }),
          Animated.spring(iconScale, { toValue: 1,    tension: 200, friction: 8, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [active]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Animated.View
        style={[
          styles.catItem,
          {
            backgroundColor: active ? `${cat.color}18` : colors.card,
            borderColor: active ? cat.color : colors.border,
            borderWidth: active ? 1.5 : 1,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={[styles.catIconWrap, { backgroundColor: `${cat.color}25` }]}>
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Ionicons name={cat.icon as any} size={18} color={cat.color} />
          </Animated.View>
        </View>
        <Text
          style={[styles.catLabel, { color: active ? cat.color : colors.textSecondary }]}
          numberOfLines={1}
        >
          {cat.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },

  // Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  navIconBtn: {
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
  navRight: {
    alignItems: 'flex-end',
  },

  scroll: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },

  // Hero card
  heroCard: {
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.lg,
  },

  // Type toggle
  typeTrack: {
    flexDirection: 'row',
    borderRadius: RADIUS.full,
    padding: 4,
    width: '100%',
    position: 'relative',
    height: 44,
  },
  typePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '50%',
    borderRadius: RADIUS.full,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 1,
  },
  typeBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Amount
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  currencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  currencySymbol: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  amountInput: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    minWidth: 100,
    maxWidth: 260,
    padding: 0,
  },
  amountError: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    marginTop: -SPACING.sm,
  },
  convertNote: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginTop: -SPACING.sm,
  },
  ratePreviewBlock: {
    alignItems: 'center',
    gap: 4,
  },
  ratePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rateLockLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateLockLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Currency picker modal
  currencyModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  currencyModalSheet: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 36,
    maxHeight: '75%',
  },
  currencyModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  currencyModalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    marginBottom: 4,
  },
  currencyModalSub: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginBottom: SPACING.lg,
  },
  currencyPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 8,
  },
  currencyPickerFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  currencyPickerInfo: {
    flex: 1,
  },
  currencyPickerName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  currencyPickerCode: {
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  currencyPickerSymbol: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },

  // Sections
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  sectionOptional: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  catIconWrap: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    maxWidth: 100,
  },

  // Date
  selectedDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  dateNavBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selectedDateCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  selectedDateIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDateMain: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  selectedDateSub: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  // Calendar modal
  calBackdrop: {
    flex: 1,
  },
  calSheet: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    paddingTop: SPACING.md,
  },
  calHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  calNavBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  calWeekRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  calWeekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.xl,
  },
  calCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellSelected: {
    borderRadius: RADIUS.md,
  },
  calCellToday: {
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  calDayText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  calDoneBtn: {
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  calDoneBtnText: {
    color: '#fff',
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
  },

  quickPickRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },

  // Note
  noteWrap: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  noteIcon: {
    marginTop: 2,
  },
  noteInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    minHeight: 80,
    fontWeight: '500',
    padding: 0,
  },

  // Footer save
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  saveBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
