export type TransactionType = 'income' | 'expense';

export type CategoryId =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'utilities'
  | 'housing'
  | 'education'
  | 'travel'
  | 'personal'
  | 'salary'
  | 'freelance'
  | 'investment'
  | 'gift'
  | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string; // ISO 4217 — the ORIGINAL currency as entered
  category: CategoryId;
  note: string;
  date: string; // ISO string

  /**
   * Historical rate snapshot — written ONCE when the transaction is first saved.
   * These fields are NEVER recalculated after creation, ensuring that past
   * conversions are not affected by future exchange-rate changes.
   */
  convertedAmount?: number; // amount × rateUsed, denominated in baseCurrency
  baseCurrency?: string;    // display currency at the time the transaction was saved
  rateUsed?: number;        // 1 unit of `currency` = rateUsed units of `baseCurrency`, on `date`
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currency?: string; // ISO 4217 – display currency when goal was created
  month: string; // 'YYYY-MM'
  createdAt: string;
}

export interface Budget {
  id: string;
  category: CategoryId;
  limit: number;
  currency?: string; // ISO 4217 – display currency when budget was created
  month: string; // 'YYYY-MM'
}

export interface NoSpendChallenge {
  id: string;
  startDate: string; // ISO string
  durationDays: number;
  isActive: boolean;
}

export interface AppState {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  budgets: Budget[];
  noSpendChallenge: NoSpendChallenge | null;
  isLoading: boolean;
  initialBalance: number;
}

export type AppAction =
  | { type: 'LOAD_DATA'; payload: Partial<AppState> }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'SET_SAVINGS_GOALS'; payload: SavingsGoal[] }
  | { type: 'DELETE_SAVINGS_GOAL'; payload: string }
  | { type: 'ADD_BUDGET'; payload: Budget }
  | { type: 'SET_BUDGETS'; payload: Budget[] }
  | { type: 'UPDATE_BUDGET'; payload: Budget }
  | { type: 'DELETE_BUDGET'; payload: string }
  | { type: 'SET_NO_SPEND_CHALLENGE'; payload: NoSpendChallenge | null }
  | { type: 'SET_INITIAL_BALANCE'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean };
