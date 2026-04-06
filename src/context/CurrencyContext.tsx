import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FALLBACK_RATES, fetchLiveRates, convertWithRates } from '../utils/exchangeRates';

const CURRENCY_STORAGE_KEY = '@fintrack_currency';

// ── Supported currencies ──────────────────────────────────────────────────────

export interface CurrencyInfo {
  code: string;
  symbol: string;
  locale: string;
  name: string;
  flag: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN', name: 'Indian Rupee',   flag: '🇮🇳' },
  { code: 'USD', symbol: '$',   locale: 'en-US', name: 'US Dollar',      flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE', name: 'Euro',           flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB', name: 'British Pound',  flag: '🇬🇧' },
  { code: 'NPR', symbol: 'रू',  locale: 'ne-NP', name: 'Nepali Rupee',   flag: '🇳🇵' },
  { code: 'AED', symbol: 'د.إ', locale: 'ar-AE', name: 'UAE Dirham',     flag: '🇦🇪' },
  { code: 'JPY', symbol: '¥',   locale: 'ja-JP', name: 'Japanese Yen',   flag: '🇯🇵' },
  { code: 'AUD', symbol: 'A$',  locale: 'en-AU', name: 'Australian Dollar', flag: '🇦🇺' },
];

const INR_INFO = CURRENCIES.find((c) => c.code === 'INR')!;
const DEFAULT_CURRENCY = INR_INFO;

// ── Formatting helpers ────────────────────────────────────────────────────────

const INDIAN_LOCALES = new Set(['INR', 'NPR']);

function addThousandSeparators(num: string): string {
  const parts = num.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/** Indian grouping: last 3 digits, then groups of 2 — e.g. 12,34,567 */
function addIndianSeparators(num: string): string {
  const parts = num.split('.');
  const int = parts[0];
  if (int.length <= 3) return num;
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  parts[0] = `${grouped},${last3}`;
  return parts.join('.');
}

export function formatCurrencyWithInfo(
  amount: number,
  currency: CurrencyInfo,
  showSign = false
): string {
  const abs = Math.abs(amount);
  const noDecimals = currency.code === 'JPY';
  const fixed = noDecimals ? Math.round(abs).toString() : abs.toFixed(2);
  const separated = INDIAN_LOCALES.has(currency.code)
    ? addIndianSeparators(fixed)
    : addThousandSeparators(fixed);
  const formatted = `${currency.symbol}${separated}`;
  if (showSign) return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  return formatted;
}

export function formatAmountWithInfo(amount: number, currency: CurrencyInfo): string {
  const abs = Math.abs(amount);
  if (INDIAN_LOCALES.has(currency.code)) {
    if (abs >= 10_000_000) return `${currency.symbol}${(abs / 10_000_000).toFixed(1)}Cr`;
    if (abs >= 100_000)    return `${currency.symbol}${(abs / 100_000).toFixed(1)}L`;
    if (abs >= 1_000)      return `${currency.symbol}${(abs / 1_000).toFixed(1)}K`;
  } else {
    if (abs >= 1_000_000)  return `${currency.symbol}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)      return `${currency.symbol}${(abs / 1_000).toFixed(1)}K`;
  }
  return formatCurrencyWithInfo(amount, currency);
}

/** Lookup CurrencyInfo for any code without needing the hook. Fallback: INR. */
export function getCurrencyInfo(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? INR_INFO;
}

// ── Context ───────────────────────────────────────────────────────────────────

interface CurrencyContextValue {
  currency: CurrencyInfo;
  setCurrency: (code: string) => Promise<void>;
  formatCurrency: (amount: number, showSign?: boolean) => string;
  formatAmount: (amount: number) => string;
  /** Convert `amount` from `fromCode` to the current display currency. */
  convert: (amount: number, fromCode: string) => number;
  /** True while the first live-rate fetch is in progress. */
  ratesLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Load the saved display currency preference
  useEffect(() => {
    AsyncStorage.getItem(CURRENCY_STORAGE_KEY).then((code) => {
      if (code) {
        const found = CURRENCIES.find((c) => c.code === code);
        if (found) setCurrencyState(found);
      }
    });
  }, []);

  // Fetch live exchange rates once on mount
  useEffect(() => {
    let cancelled = false;
    fetchLiveRates().then((liveRates) => {
      if (!cancelled) {
        setRates(liveRates);
        setRatesLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const setCurrency = useCallback(async (code: string) => {
    const found = CURRENCIES.find((c) => c.code === code);
    if (!found) return;
    setCurrencyState(found);
    await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, code);
  }, []);

  const formatCurrency = useCallback(
    (amount: number, showSign = false) => formatCurrencyWithInfo(amount, currency, showSign),
    [currency]
  );

  const formatAmount = useCallback(
    (amount: number) => formatAmountWithInfo(amount, currency),
    [currency]
  );

  const convert = useCallback(
    (amount: number, fromCode: string) => convertWithRates(amount, fromCode, currency.code, rates),
    [currency.code, rates]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, formatAmount, convert, ratesLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
