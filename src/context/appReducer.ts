import { AppState, AppAction, Transaction, SavingsGoal, Budget } from '../types';

/** Keeps first occurrence; prevents duplicate React keys if storage or sync ever repeats an id. */
function dedupeTransactionsById(transactions: Transaction[]): Transaction[] {
  const seen = new Set<string>();
  const out: Transaction[] = [];
  for (const t of transactions) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out;
}

function dedupeGoalsById(goals: SavingsGoal[]): SavingsGoal[] {
  const seen = new Set<string>();
  const out: SavingsGoal[] = [];
  for (const g of goals) {
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    out.push(g);
  }
  return out;
}

function dedupeBudgetsById(budgets: Budget[]): Budget[] {
  const seen = new Set<string>();
  const out: Budget[] = [];
  for (const b of budgets) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    out.push(b);
  }
  return out;
}

export const initialState: AppState = {
  transactions: [],
  savingsGoals: [],
  budgets: [],
  noSpendChallenge: null,
  isLoading: true,
  initialBalance: 0,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_DATA': {
      const merged = { ...state, ...action.payload, isLoading: false };
      return {
        ...merged,
        transactions: dedupeTransactionsById(merged.transactions),
        savingsGoals: dedupeGoalsById(merged.savingsGoals),
        budgets: dedupeBudgetsById(merged.budgets),
      };
    }

    case 'ADD_TRANSACTION': {
      const rest = state.transactions.filter((t) => t.id !== action.payload.id);
      return {
        ...state,
        transactions: [action.payload, ...rest],
      };
    }

    case 'SET_TRANSACTIONS': {
      // Preserve locally-stored historical rate snapshots when the backend
      // replaces the transaction list (backend has no knowledge of these fields).
      const existingById = new Map(state.transactions.map((t) => [t.id, t]));
      const merged = action.payload.map((t) => {
        const existing = existingById.get(t.id);
        if (!existing) return t;
        return {
          ...t,
          convertedAmount: existing.convertedAmount,
          baseCurrency: existing.baseCurrency,
          rateUsed: existing.rateUsed,
        };
      });
      return { ...state, transactions: dedupeTransactionsById(merged) };
    }

    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };

    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
      };

    case 'ADD_SAVINGS_GOAL': {
      const rest = state.savingsGoals.filter((g) => g.id !== action.payload.id);
      return { ...state, savingsGoals: [action.payload, ...rest] };
    }

    case 'SET_SAVINGS_GOALS':
      return { ...state, savingsGoals: dedupeGoalsById(action.payload) };

    case 'DELETE_SAVINGS_GOAL':
      return {
        ...state,
        savingsGoals: state.savingsGoals.filter((g) => g.id !== action.payload),
      };

    case 'ADD_BUDGET': {
      const rest = state.budgets.filter((b) => b.id !== action.payload.id);
      return { ...state, budgets: [action.payload, ...rest] };
    }

    case 'SET_BUDGETS':
      return { ...state, budgets: dedupeBudgetsById(action.payload) };

    case 'UPDATE_BUDGET':
      return {
        ...state,
        budgets: state.budgets.map((b) =>
          b.id === action.payload.id ? action.payload : b
        ),
      };

    case 'DELETE_BUDGET':
      return {
        ...state,
        budgets: state.budgets.filter((b) => b.id !== action.payload),
      };

    case 'SET_NO_SPEND_CHALLENGE':
      return { ...state, noSpendChallenge: action.payload };

    case 'SET_INITIAL_BALANCE':
      return { ...state, initialBalance: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    default:
      return state;
  }
}
