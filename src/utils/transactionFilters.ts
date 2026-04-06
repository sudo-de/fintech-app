import { CategoryId } from '../types';

export type TransactionTypeFilter = 'all' | 'income' | 'expense';

export type DatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'this_year'
  | 'custom';

export type TransactionListFilters = {
  type: TransactionTypeFilter;
  categoryId: CategoryId | 'all';
  datePreset: DatePreset;
  customStart: string;
  customEnd: string;
};

export const DEFAULT_TX_FILTERS: TransactionListFilters = {
  type: 'all',
  categoryId: 'all',
  datePreset: 'all',
  customStart: '',
  customEnd: '',
};

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(s: string): boolean {
  if (!YMD_RE.test(s.trim())) return false;
  const d = new Date(s.trim() + 'T12:00:00');
  return !Number.isNaN(d.getTime());
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local calendar date for an ISO transaction timestamp. */
export function transactionYmd(iso: string): string {
  return toYmd(new Date(iso));
}

export function matchesDatePreset(
  iso: string,
  preset: DatePreset,
  customStart?: string,
  customEnd?: string
): boolean {
  if (preset === 'all') return true;

  const tx = transactionYmd(iso);
  const now = new Date();
  const tYmd = toYmd(now);

  if (preset === 'today') return tx === tYmd;

  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (preset === 'yesterday') return tx === toYmd(y);

  if (preset === 'this_month') {
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return tx.startsWith(prefix);
  }

  if (preset === 'this_year') {
    return tx.slice(0, 4) === String(now.getFullYear());
  }

  if (preset === 'this_week') {
    const wd = now.getDay();
    const mondayOffset = wd === 0 ? -6 : 1 - wd;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return tx >= toYmd(monday) && tx <= toYmd(sunday);
  }

  if (preset === 'custom') {
    const a = customStart?.trim();
    const b = customEnd?.trim();
    if (!a || !b || !isValidYmd(a) || !isValidYmd(b)) return true;
    const lo = a <= b ? a : b;
    const hi = a <= b ? b : a;
    return tx >= lo && tx <= hi;
  }

  return true;
}

export function countActiveFilters(f: TransactionListFilters): number {
  let n = 0;
  if (f.type !== 'all') n++;
  if (f.categoryId !== 'all') n++;
  if (f.datePreset !== 'all') {
    if (f.datePreset === 'custom') {
      if (isValidYmd(f.customStart) && isValidYmd(f.customEnd)) n++;
    } else {
      n++;
    }
  }
  return n;
}

export function filtersEqualDefault(f: TransactionListFilters): boolean {
  return countActiveFilters(f) === 0;
}
