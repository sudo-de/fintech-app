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
  category: CategoryId;
  note: string;
  date: string; // ISO string
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  month: string; // 'YYYY-MM'
  createdAt: string;
}

export interface Budget {
  id: string;
  category: CategoryId;
  limit: number;
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
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'DELETE_SAVINGS_GOAL'; payload: string }
  | { type: 'ADD_BUDGET'; payload: Budget }
  | { type: 'UPDATE_BUDGET'; payload: Budget }
  | { type: 'DELETE_BUDGET'; payload: string }
  | { type: 'SET_NO_SPEND_CHALLENGE'; payload: NoSpendChallenge | null }
  | { type: 'SET_INITIAL_BALANCE'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean };
