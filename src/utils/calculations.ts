import { Transaction, CategoryId } from '../types';
import { getMonthFromDate, getCurrentMonth } from './formatters';

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

export const getWeeklyComparison = (transactions: Transaction[]): WeeklyData => {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  const thisWeekExpenses = transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === 'expense' && d >= startOfThisWeek && d <= now;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const lastWeekExpenses = transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === 'expense' && d >= startOfLastWeek && d < startOfThisWeek;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const change =
    lastWeekExpenses === 0
      ? 0
      : ((thisWeekExpenses - lastWeekExpenses) / lastWeekExpenses) * 100;

  return { thisWeek: thisWeekExpenses, lastWeek: lastWeekExpenses, change };
};

export interface MonthlyPoint {
  month: string; // 'MMM'
  income: number;
  expenses: number;
  net: number;
}

export const getMonthlyTrend = (transactions: Transaction[], months = 6): MonthlyPoint[] => {
  const now = new Date();
  const points: MonthlyPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'short' });
    const income = getTotalIncome(transactions, monthKey);
    const expenses = getTotalExpenses(transactions, monthKey);
    points.push({ month: label, income, expenses, net: income - expenses });
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

export const getSavingsRate = (transactions: Transaction[], month?: string): number => {
  const income = getTotalIncome(transactions, month);
  const expenses = getTotalExpenses(transactions, month);
  if (income === 0) return 0;
  return Math.max(0, ((income - expenses) / income) * 100);
};
