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

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addSavingsGoal: (g: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  deleteSavingsGoal: (id: string) => void;
  addBudget: (b: Omit<Budget, 'id'>) => void;
  updateBudget: (b: Budget) => void;
  deleteBudget: (id: string) => void;
  setNoSpendChallenge: (c: Omit<NoSpendChallenge, 'id'> | null) => void;
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

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    dispatch({ type: 'ADD_TRANSACTION', payload: { ...t, id: generateId() } });
  }, []);

  const updateTransaction = useCallback((t: Transaction) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: t });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
  }, []);

  const addSavingsGoal = useCallback((g: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    dispatch({
      type: 'ADD_SAVINGS_GOAL',
      payload: { ...g, id: generateId(), createdAt: new Date().toISOString() },
    });
  }, []);

  const deleteSavingsGoal = useCallback((id: string) => {
    dispatch({ type: 'DELETE_SAVINGS_GOAL', payload: id });
  }, []);

  const addBudget = useCallback((b: Omit<Budget, 'id'>) => {
    dispatch({ type: 'ADD_BUDGET', payload: { ...b, id: generateId() } });
  }, []);

  const updateBudget = useCallback((b: Budget) => {
    dispatch({ type: 'UPDATE_BUDGET', payload: b });
  }, []);

  const deleteBudget = useCallback((id: string) => {
    dispatch({ type: 'DELETE_BUDGET', payload: id });
  }, []);

  const setNoSpendChallenge = useCallback((c: Omit<NoSpendChallenge, 'id'> | null) => {
    dispatch({
      type: 'SET_NO_SPEND_CHALLENGE',
      payload: c ? { ...c, id: generateId() } : null,
    });
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
        updateTransaction,
        deleteTransaction,
        addSavingsGoal,
        deleteSavingsGoal,
        addBudget,
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
