import { AppState, AppAction } from '../types';

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
    case 'LOAD_DATA':
      return { ...state, ...action.payload, isLoading: false };

    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
      };

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

    case 'ADD_SAVINGS_GOAL':
      return {
        ...state,
        savingsGoals: [...state.savingsGoals, action.payload],
      };

    case 'DELETE_SAVINGS_GOAL':
      return {
        ...state,
        savingsGoals: state.savingsGoals.filter((g) => g.id !== action.payload),
      };

    case 'ADD_BUDGET':
      return {
        ...state,
        budgets: [...state.budgets, action.payload],
      };

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
