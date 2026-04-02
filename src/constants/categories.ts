import { CategoryId, TransactionType } from '../types';
import { COLORS } from './colors';

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  icon: string;
  color: string;
  type: TransactionType | 'both';
}

export const CATEGORIES: CategoryInfo[] = [
  // Expense categories
  { id: 'food', label: 'Food & Dining', icon: 'fast-food', color: COLORS.categories.food, type: 'expense' },
  { id: 'transport', label: 'Transport', icon: 'car', color: COLORS.categories.transport, type: 'expense' },
  { id: 'shopping', label: 'Shopping', icon: 'bag', color: COLORS.categories.shopping, type: 'expense' },
  { id: 'entertainment', label: 'Entertainment', icon: 'game-controller', color: COLORS.categories.entertainment, type: 'expense' },
  { id: 'health', label: 'Health', icon: 'medical', color: COLORS.categories.health, type: 'expense' },
  { id: 'utilities', label: 'Utilities', icon: 'flash', color: COLORS.categories.utilities, type: 'expense' },
  { id: 'housing', label: 'Housing', icon: 'home', color: COLORS.categories.housing, type: 'expense' },
  { id: 'education', label: 'Education', icon: 'school', color: COLORS.categories.education, type: 'expense' },
  { id: 'travel', label: 'Travel', icon: 'airplane', color: COLORS.categories.travel, type: 'expense' },
  { id: 'personal', label: 'Personal Care', icon: 'person', color: COLORS.categories.personal, type: 'expense' },
  // Income categories
  { id: 'salary', label: 'Salary', icon: 'briefcase', color: COLORS.categories.salary, type: 'income' },
  { id: 'freelance', label: 'Freelance', icon: 'laptop', color: COLORS.categories.freelance, type: 'income' },
  { id: 'investment', label: 'Investment', icon: 'trending-up', color: COLORS.categories.investment, type: 'income' },
  // Both
  { id: 'gift', label: 'Gift', icon: 'gift', color: COLORS.categories.gift, type: 'both' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: COLORS.categories.other, type: 'both' },
];

export const getCategoryInfo = (id: CategoryId): CategoryInfo =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export const getExpenseCategories = (): CategoryInfo[] =>
  CATEGORIES.filter((c) => c.type === 'expense' || c.type === 'both');

export const getIncomeCategories = (): CategoryInfo[] =>
  CATEGORIES.filter((c) => c.type === 'income' || c.type === 'both');

export const getCategoriesForType = (type: TransactionType): CategoryInfo[] =>
  type === 'expense' ? getExpenseCategories() : getIncomeCategories();
