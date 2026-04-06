/**
 * historicalRates.ts
 *
 * Fetches the exchange rate between two currencies on a specific calendar date
 * using the fawazahmed0 currency-api (same provider as exchangeRates.ts, dated endpoint).
 *
 * Results are cached permanently in AsyncStorage — historical rates never change.
 * Falls back to the current live rate (from RATES_VS_USD) if the API is unreachable.
 *
 * URL format:
 *   https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{YYYY-MM-DD}/v1/currencies/{from}.json
 * Response:
 *   { "date": "YYYY-MM-DD", "{from}": { "{to}": 83.12, ... } }
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RATES_VS_USD, FALLBACK_RATES } from './exchangeRates';

const CACHE_PREFIX = '@hist_rate_v1_';

/**
 * Returns the exchange rate: 1 unit of `fromCode` = X units of `toCode` on `dateISO`.
 *
 * @param fromCode  ISO 4217 source currency  (e.g. 'USD')
 * @param toCode    ISO 4217 target currency  (e.g. 'INR')
 * @param dateISO   Calendar date in YYYY-MM-DD format
 */
export async function fetchHistoricalRate(
  fromCode: string,
  toCode: string,
  dateISO: string,
): Promise<number> {
  if (fromCode === toCode) return 1;

  // ── Permanent cache (historical rates never change) ────────────────────────
  const cacheKey = `${CACHE_PREFIX}${fromCode}_${toCode}_${dateISO}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached !== null) return JSON.parse(cached) as number;
  } catch {
    // Cache unreadable — proceed to network
  }

  const from = fromCode.toLowerCase();
  const to   = toCode.toLowerCase();
  const today = new Date().toISOString().split('T')[0];

  // Try the exact dated snapshot first, then latest as a fallback
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateISO}/v1/currencies/${from}.json`,
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from}.json`,
    ...(dateISO === today
      ? [`https://latest.currency-api.pages.dev/v1/currencies/${from}.json`]
      : []),
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) continue;

      const data = await res.json();
      const rate: unknown = data?.[from]?.[to];
      if (typeof rate !== 'number' || rate <= 0) continue;

      // Cache permanently — only for the exact date (not the @latest fallback)
      if (url.includes(`@${dateISO}`)) {
        try { await AsyncStorage.setItem(cacheKey, JSON.stringify(rate)); } catch {}
      }
      return rate;
    } catch {
      // Timeout / network error — try next mirror
    }
  }

  // ── Fallback: derive from the latest live rates ────────────────────────────
  const fromVsUsd = RATES_VS_USD[fromCode] ?? FALLBACK_RATES[fromCode] ?? 1;
  const toVsUsd   = RATES_VS_USD[toCode]   ?? FALLBACK_RATES[toCode]   ?? 1;
  return toVsUsd / fromVsUsd;
}

/** Formats a rate for human display: "1 USD = 83.4521 INR" */
export function formatRate(rate: number, fromCode: string, toCode: string): string {
  const decimals = rate >= 100 ? 2 : rate >= 1 ? 4 : 6;
  return `1 ${fromCode} = ${rate.toFixed(decimals)} ${toCode}`;
}
