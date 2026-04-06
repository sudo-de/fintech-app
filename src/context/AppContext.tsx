import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { AppState, AppAction, Transaction, SavingsGoal, Budget, NoSpendChallenge } from '../types';
import { appReducer, initialState } from './appReducer';
import { loadState, saveState } from '../storage/storage';

type NewTransactionInput = Omit<Transaction, 'id'> & { id?: string };

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addTransaction: (t: NewTransactionInput) => void;
  setTransactions: (list: Transaction[]) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addSavingsGoal: (g: Omit<SavingsGoal, 'id' | 'createdAt'> | SavingsGoal) => void;
  setSavingsGoals: (list: SavingsGoal[]) => void;
  deleteSavingsGoal: (id: string) => void;
  addBudget: (b: Omit<Budget, 'id'> | Budget) => void;
  setBudgets: (list: Budget[]) => void;
  updateBudget: (b: Budget) => void;
  deleteBudget: (id: string) => void;
  /** Pass a full challenge (e.g. from API with `id`) or local fields without `id`. */
  setNoSpendChallenge: (c: NoSpendChallenge | Omit<NoSpendChallenge, 'id'> | null) => void;
  setInitialBalance: (amount: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const isFirstLoad = useRef(true);

  // Hydrate from storage on mount
  useEffect(() => {
    (async () => {
      const saved = await loadState();
      if (saved) {
        dispatch({ type: 'LOAD_DATA', payload: saved });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();
  }, []);

  // Persist to storage on every state change (after initial load)
  useEffect(() => {
    if (state.isLoading) return;
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    const { isLoading, ...persistable } = state;
    saveState(persistable);
  }, [state]);

  const addTransaction = useCallback((t: NewTransactionInput) => {
    const id = t.id !== undefined && t.id !== '' ? t.id : generateId();
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: { ...t, id },
    });
  }, []);

  const setTransactions = useCallback((list: Transaction[]) => {
    dispatch({ type: 'SET_TRANSACTIONS', payload: list });
  }, []);

  const updateTransaction = useCallback((t: Transaction) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: t });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
  }, []);

  const addSavingsGoal = useCallback((g: Omit<SavingsGoal, 'id' | 'createdAt'> | SavingsGoal) => {
    const payload: SavingsGoal =
      'createdAt' in g && g.createdAt && 'id' in g && g.id
        ? (g as SavingsGoal)
        : {
            ...(g as Omit<SavingsGoal, 'id' | 'createdAt'>),
            id: generateId(),
            createdAt: new Date().toISOString(),
          };
    dispatch({ type: 'ADD_SAVINGS_GOAL', payload });
  }, []);

  const setSavingsGoals = useCallback((list: SavingsGoal[]) => {
    dispatch({ type: 'SET_SAVINGS_GOALS', payload: list });
  }, []);

  const deleteSavingsGoal = useCallback((id: string) => {
    dispatch({ type: 'DELETE_SAVINGS_GOAL', payload: id });
  }, []);

  const addBudget = useCallback((b: Omit<Budget, 'id'> | Budget) => {
    const payload: Budget =
      'id' in b && b.id ? (b as Budget) : { ...(b as Omit<Budget, 'id'>), id: generateId() };
    dispatch({ type: 'ADD_BUDGET', payload });
  }, []);

  const setBudgets = useCallback((list: Budget[]) => {
    dispatch({ type: 'SET_BUDGETS', payload: list });
  }, []);

  const updateBudget = useCallback((b: Budget) => {
    dispatch({ type: 'UPDATE_BUDGET', payload: b });
  }, []);

  const deleteBudget = useCallback((id: string) => {
    dispatch({ type: 'DELETE_BUDGET', payload: id });
  }, []);

  const setNoSpendChallenge = useCallback((c: NoSpendChallenge | Omit<NoSpendChallenge, 'id'> | null) => {
    if (c === null) {
      dispatch({ type: 'SET_NO_SPEND_CHALLENGE', payload: null });
      return;
    }
    const payload: NoSpendChallenge =
      'id' in c && c.id ? (c as NoSpendChallenge) : { ...c, id: generateId() };
    dispatch({ type: 'SET_NO_SPEND_CHALLENGE', payload });
  }, []);

  const setInitialBalance = useCallback((amount: number) => {
    dispatch({ type: 'SET_INITIAL_BALANCE', payload: amount });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addTransaction,
        setTransactions,
        updateTransaction,
        deleteTransaction,
        addSavingsGoal,
        setSavingsGoals,
        deleteSavingsGoal,
        addBudget,
        setBudgets,
        updateBudget,
        deleteBudget,
        setNoSpendChallenge,
        setInitialBalance,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
