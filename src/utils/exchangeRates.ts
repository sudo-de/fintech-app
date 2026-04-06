import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@exchange_rates_v2';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Hardcoded fallback — used only if both the cache and network are unavailable
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  NPR: 133.5,
  AED: 3.67,
  JPY: 149.5,
  AUD: 1.52,
};

/**
 * Live rates relative to USD.
 * Starts with the fallback snapshot; updated in-place when fetchLiveRates() resolves.
 * Direct callers of convertCurrency() automatically get fresh rates after the first load.
 */
export const RATES_VS_USD: Record<string, number> = { ...FALLBACK_RATES };

// Two CDN mirrors for the free, no-key fawazahmed0 exchange-rate API
const API_URLS = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
];

interface RatesCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

/**
 * Fetches live USD-based exchange rates.
 *   1. Returns cached rates if still fresh (< 6 h).
 *   2. Hits the primary CDN, falls back to the mirror on failure.
 *   3. Writes a fresh cache entry on success.
 *   4. Returns FALLBACK_RATES if both sources fail.
 *
 * Also updates RATES_VS_USD in-place so convertCurrency() is always current.
 */
export async function fetchLiveRates(): Promise<Record<string, number>> {
  // ── 1. Try AsyncStorage cache ──────────────────────────────────────────────
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const { rates, fetchedAt }: RatesCache = JSON.parse(raw);
      if (Date.now() - fetchedAt < CACHE_TTL_MS) {
        Object.assign(RATES_VS_USD, rates);
        return rates;
      }
    }
  } catch {
    // Cache unreadable — proceed to network
  }

  // ── 2. Try each API mirror ─────────────────────────────────────────────────
  for (const url of API_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();
      const raw: Record<string, number> | undefined = data?.usd;
      if (!raw || typeof raw !== 'object') continue;

      // API uses lowercase keys — normalise to UPPER
      const rates: Record<string, number> = { USD: 1 };
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'number') rates[k.toUpperCase()] = v;
      }

      // Persist to cache
      try {
        const entry: RatesCache = { rates, fetchedAt: Date.now() };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
      } catch {
        // Cache write failed — still return the fresh rates
      }

      Object.assign(RATES_VS_USD, rates);
      return rates;
    } catch {
      // Timeout / network error — try the next mirror
    }
  }

  // ── 3. Both sources failed — use fallback ──────────────────────────────────
  return FALLBACK_RATES;
}

/** Convert `amount` from `fromCode` to `toCode` using a rates table. */
export function convertWithRates(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: Record<string, number>
): number {
  if (fromCode === toCode) return amount;
  const from = rates[fromCode] ?? FALLBACK_RATES[fromCode] ?? 1;
  const to   = rates[toCode]   ?? FALLBACK_RATES[toCode]   ?? 1;
  return (amount / from) * to;
}

/**
 * Convert using the currently loaded rates (RATES_VS_USD).
 * After fetchLiveRates() resolves, this automatically returns live values.
 */
export function convertCurrency(amount: number, fromCode: string, toCode: string): number {
  return convertWithRates(amount, fromCode, toCode, RATES_VS_USD);
}
