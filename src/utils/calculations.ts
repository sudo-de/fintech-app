import { Transaction, CategoryId, Budget } from '../types';
import { getMonthFromDate, getCurrentMonth, parseLocalDateFromISO } from './formatters';

export const getTotalIncome = (transactions: Transaction[], month?: string): number =>
  transactions
    .filter((t) => t.type === 'income' && (!month || getMonthFromDate(t.date) === month))
    .reduce((sum, t) => sum + t.amount, 0);

export const getTotalExpenses = (transactions: Transaction[], month?: string): number =>
  transactions
    .filter((t) => t.type === 'expense' && (!month || getMonthFromDate(t.date) === month))
    .reduce((sum, t) => sum + t.amount, 0);

export const getBalance = (
  transactions: Transaction[],
  initialBalance: number,
  month?: string
): number => {
  if (month) {
    return getTotalIncome(transactions, month) - getTotalExpenses(transactions, month);
  }
  return initialBalance + getTotalIncome(transactions) - getTotalExpenses(transactions);
};

export const getNetSavings = (transactions: Transaction[], month?: string): number => {
  const income = getTotalIncome(transactions, month);
  const expenses = getTotalExpenses(transactions, month);
  return income - expenses;
};

export interface CategoryTotal {
  category: CategoryId;
  amount: number;
  percentage: number;
  count: number;
}

export const getCategoryTotals = (
  transactions: Transaction[],
  type: 'income' | 'expense',
  month?: string
): CategoryTotal[] => {
  const filtered = transactions.filter(
    (t) => t.type === type && (!month || getMonthFromDate(t.date) === month)
  );
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  const byCategory: Record<string, { amount: number; count: number }> = {};
  filtered.forEach((t) => {
    if (!byCategory[t.category]) byCategory[t.category] = { amount: 0, count: 0 };
    byCategory[t.category].amount += t.amount;
    byCategory[t.category].count += 1;
  });

  return Object.entries(byCategory)
    .map(([category, { amount, count }]) => ({
      category: category as CategoryId,
      amount,
      count,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

export interface WeeklyData {
  thisWeek: number;
  lastWeek: number;
  change: number; // percentage
}

/**
 * Rolling 7-day expense totals vs the prior 7 days, anchored to the Insights month.
 * For the current calendar month, the anchor is "now"; for past months, the last day of that month.
 */
export const getWeeklyComparison = (transactions: Transaction[], contextMonth?: string): WeeklyData => {
  const month = contextMonth ?? getCurrentMonth();
  const [y, m] = month.split('-').map(Number);
  const endOfSelectedMonth = new Date(y, m, 0, 23, 59, 59, 999);

  const now = new Date();
  const isCurrentMonth = month === getCurrentMonth();
  // End-of-day anchor so same-calendar-day txns (parsed at noon) are never excluded before local noon.
  const end = isCurrentMonth
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    : endOfSelectedMonth;

  const thisWeekStart = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
  thisWeekStart.setDate(end.getDate() - 6);

  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const lastWeekStart = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate(), 0, 0, 0, 0);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6);

  const inRange = (iso: string, start: Date, finish: Date) => {
    const d = parseLocalDateFromISO(iso);
    return d >= start && d <= finish;
  };

  const thisWeekExpenses = transactions
    .filter(
      (t) => t.type === 'expense' && inRange(t.date, thisWeekStart, end)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const lastWeekExpenses = transactions
    .filter(
      (t) => t.type === 'expense' && inRange(t.date, lastWeekStart, lastWeekEnd)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const change =
    lastWeekExpenses === 0
      ? 0
      : ((thisWeekExpenses - lastWeekExpenses) / lastWeekExpenses) * 100;

  return { thisWeek: thisWeekExpenses, lastWeek: lastWeekExpenses, change };
};

export interface MonthlyPoint {
  month: string; // 'MMM' (may repeat across years — use yearMonth for keys)
  yearMonth: string; // 'YYYY-MM'
  income: number;
  expenses: number;
  net: number;
}

/** Last `months` calendar months ending at `endMonth` (defaults to current month). */
export const getMonthlyTrend = (
  transactions: Transaction[],
  months = 6,
  endMonth?: string
): MonthlyPoint[] => {
  const end = endMonth ?? getCurrentMonth();
  const [ey, em] = end.split('-').map(Number);
  const endDate = new Date(ey, em - 1, 1);
  const points: MonthlyPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'short' });
    const income = getTotalIncome(transactions, monthKey);
    const expenses = getTotalExpenses(transactions, monthKey);
    points.push({
      month: label,
      yearMonth: monthKey,
      income,
      expenses,
      net: income - expenses,
    });
  }

  return points;
};

export const getDailyExpenses = (transactions: Transaction[], days = 7): number[] => {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (days - 1 - i));
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return t.type === 'expense' && d >= dayStart && d < dayEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  });
};

export const getBudgetStatus = (
  transactions: Transaction[],
  category: CategoryId,
  limit: number,
  month?: string
): { spent: number; remaining: number; percentage: number; isOver: boolean } => {
  const m = month ?? getCurrentMonth();
  const spent = transactions
    .filter((t) => t.type === 'expense' && t.category === category && getMonthFromDate(t.date) === m)
    .reduce((sum, t) => sum + t.amount, 0);
  const remaining = limit - spent;
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  return { spent, remaining, percentage, isOver: spent > limit };
};

export const getNoSpendStreakDays = (
  transactions: Transaction[],
  startDate: string
): number => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  let streakDays = 0;
  const current = new Date(now);

  while (current >= start) {
    const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const hasExpense = transactions.some((t) => {
      const d = new Date(t.date);
      return t.type === 'expense' && d >= dayStart && d < dayEnd;
    });

    if (hasExpense) break;
    streakDays++;
    current.setDate(current.getDate() - 1);
  }

  return streakDays;
};

export const getTopSpendingCategory = (
  transactions: Transaction[],
  month?: string
): CategoryId | null => {
  const totals = getCategoryTotals(transactions, 'expense', month);
  return totals.length > 0 ? totals[0].category : null;
};

/** Count-based mix of income vs expense rows (useful for “what you log most”). */
export type TransactionTypeMix = {
  incomeCount: number;
  expenseCount: number;
  total: number;
  dominant: 'income' | 'expense' | 'balanced';
  incomePercent: number;
};

export function getTransactionTypeMix(
  transactions: Transaction[],
  month?: string
): TransactionTypeMix {
  const filtered = month
    ? transactions.filter((t) => getMonthFromDate(t.date) === month)
    : transactions;
  let incomeCount = 0;
  let expenseCount = 0;
  filtered.forEach((t) => {
    if (t.type === 'income') incomeCount += 1;
    else expenseCount += 1;
  });
  const total = incomeCount + expenseCount;
  const incomePercent = total > 0 ? Math.round((incomeCount / total) * 100) : 50;
  let dominant: 'income' | 'expense' | 'balanced';
  if (incomeCount === expenseCount) dominant = 'balanced';
  else if (incomeCount > expenseCount) dominant = 'income';
  else dominant = 'expense';
  return { incomeCount, expenseCount, total, dominant, incomePercent };
}

export const getSavingsRate = (transactions: Transaction[], month?: string): number => {
  const income = getTotalIncome(transactions, month);
  const expenses = getTotalExpenses(transactions, month);
  if (income === 0) return 0;
  return Math.max(0, ((income - expenses) / income) * 100);
};

export type SavingsPaceStatus = 'achieved' | 'ahead' | 'on_track' | 'behind' | 'past_miss';

function daysInCalendarMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/** Pace vs. a linear “save evenly through the month” plan — current month only; past months use past_miss if under target. */
export function getSavingsPaceInsight(
  netSaved: number,
  targetAmount: number,
  monthKey: string,
  referenceDate = new Date()
): {
  progress: number;
  paceStatus: SavingsPaceStatus;
  percentThroughMonth: number;
  expectedByToday: number;
  daysRemainingInMonth: number;
  dailyCatchUp: number;
} {
  if (targetAmount <= 0) {
    return {
      progress: 0,
      paceStatus: 'on_track',
      percentThroughMonth: 0,
      expectedByToday: 0,
      daysRemainingInMonth: 0,
      dailyCatchUp: 0,
    };
  }

  const progress = Math.min(Math.max(netSaved / targetAmount, 0), 1);
  const [ys, ms] = monthKey.split('-').map((x) => parseInt(x, 10));
  const dim = daysInCalendarMonth(ys, ms);
  const currentKey = getCurrentMonth();
  const isPast = monthKey < currentKey;
  const isFuture = monthKey > currentKey;

  if (netSaved >= targetAmount) {
    return {
      progress: 1,
      paceStatus: 'achieved',
      percentThroughMonth: 1,
      expectedByToday: targetAmount,
      daysRemainingInMonth: 0,
      dailyCatchUp: 0,
    };
  }

  if (isFuture) {
    return {
      progress,
      paceStatus: 'on_track',
      percentThroughMonth: 0,
      expectedByToday: 0,
      daysRemainingInMonth: dim,
      dailyCatchUp: targetAmount / Math.max(dim, 1),
    };
  }

  if (isPast) {
    return {
      progress,
      paceStatus: 'past_miss',
      percentThroughMonth: 1,
      expectedByToday: targetAmount,
      daysRemainingInMonth: 0,
      dailyCatchUp: 0,
    };
  }

  // Current calendar month (monthKey === getCurrentMonth())
  const d = Math.min(referenceDate.getDate(), dim);
  const percentThroughMonth = d / dim;
  const expectedByToday = targetAmount * percentThroughMonth;
  const daysRemainingInMonth = Math.max(1, dim - d + 1);
  const slack = 0.06;
  let paceStatus: SavingsPaceStatus;
  if (netSaved >= expectedByToday * (1 + slack)) paceStatus = 'ahead';
  else if (netSaved >= expectedByToday * (1 - slack)) paceStatus = 'on_track';
  else paceStatus = 'behind';

  const dailyCatchUp = Math.max(0, targetAmount - netSaved) / daysRemainingInMonth;

  return {
    progress,
    paceStatus,
    percentThroughMonth,
    expectedByToday,
    daysRemainingInMonth,
    dailyCatchUp,
  };
}

/** Short nudge when a category budget is tight — ties goals to spending behavior. */
export function getSmartSpendingNudge(
  transactions: Transaction[],
  budgets: Budget[],
  monthKey: string
): string | null {
  const monthBudgets = budgets.filter((b) => b.month === monthKey);
  if (monthBudgets.length === 0) return null;

  let worstOver: Budget | null = null;
  let worstPct = 0;
  for (const b of monthBudgets) {
    const { percentage, isOver } = getBudgetStatus(transactions, b.category, b.limit, monthKey);
    if (isOver) {
      if (!worstOver || percentage > worstPct) {
        worstOver = b;
        worstPct = percentage;
      }
    }
  }
  if (worstOver) {
    return `A budget is over limit — easing spend there helps your savings goal.`;
  }

  let tight: { category: CategoryId; percentage: number } | null = null;
  for (const b of monthBudgets) {
    const { percentage } = getBudgetStatus(transactions, b.category, b.limit, monthKey);
    if (percentage >= 88 && (!tight || percentage > tight.percentage)) {
      tight = { category: b.category, percentage };
    }
  }
  if (tight) {
    return `One category budget is at ${Math.round(tight.percentage)}% — a good week to stay mindful.`;
  }

  return null;
}

// ── Saving Streak ──────────────────────────────────────────────────────────

export type StreakLevel = 'dormant' | 'spark' | 'flame' | 'blaze' | 'inferno';

export interface StreakMonthPoint {
  month: string;   // YYYY-MM
  net: number;
  saved: boolean;
  hasData: boolean;
}

export interface StreakMilestone {
  count: number;
  label: string;
  unlocked: boolean;
}

export interface SavingsStreak {
  count: number;
  level: StreakLevel;
  levelLabel: string;
  monthHistory: StreakMonthPoint[];   // last 6 months
  milestones: StreakMilestone[];
  nextMilestone: number | null;
}

const MILESTONES: Array<{ count: number; label: string }> = [
  { count: 1,  label: 'First Save'      },
  { count: 3,  label: 'Quarter Strong'  },
  { count: 6,  label: 'Half Year'       },
  { count: 12, label: 'Year Champion'   },
];

function levelFor(count: number): StreakLevel {
  if (count === 0)  return 'dormant';
  if (count <= 2)   return 'spark';
  if (count <= 5)   return 'flame';
  if (count <= 11)  return 'blaze';
  return 'inferno';
}

const LEVEL_LABELS: Record<StreakLevel, string> = {
  dormant:  'Dormant',
  spark:    'Spark',
  flame:    'Flame',
  blaze:    'Blaze',
  inferno:  'Inferno',
};

export function getSavingsStreak(transactions: Transaction[]): SavingsStreak {
  const today = new Date();
  // Build last 12 months descending
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const monthData: StreakMonthPoint[] = months.map((m) => {
    const hasData = transactions.some((t) => t.date.startsWith(m));
    const net = hasData ? getNetSavings(transactions, m) : 0;
    return { month: m, net, saved: net > 0, hasData };
  });

  // Count streak backwards — skip months with no data only if the streak is still intact
  let streak = 0;
  for (let i = monthData.length - 1; i >= 0; i--) {
    const { hasData, saved } = monthData[i];
    if (!hasData) {
      // A month with no transactions doesn't break the streak but doesn't extend it
      if (streak > 0) break; // if already started streak, gap breaks it
      continue;
    }
    if (saved) {
      streak++;
    } else {
      break;
    }
  }

  const level = levelFor(streak);
  const unlockedMilestones = MILESTONES.map((m) => ({ ...m, unlocked: streak >= m.count }));
  const nextMilestone = MILESTONES.find((m) => m.count > streak)?.count ?? null;

  return {
    count: streak,
    level,
    levelLabel: LEVEL_LABELS[level],
    monthHistory: monthData.slice(-6),
    milestones: unlockedMilestones,
    nextMilestone,
  };
}
