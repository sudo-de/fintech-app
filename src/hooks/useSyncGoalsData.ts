import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { budgetsApi, challengeApi, goalsApi } from '../services/api';
import { mapBackendChallenge, mapBackendToBudget, mapBackendToSavingsGoal } from '../utils/goalBudgetMap';
import { Budget, NoSpendChallenge, SavingsGoal } from '../types';

interface Options {
  token: string | null;
  setSavingsGoals: (list: SavingsGoal[]) => void;
  setBudgets: (list: Budget[]) => void;
  setNoSpendChallenge: (c: NoSpendChallenge | null) => void;
}

interface Result {
  isSyncingGoals: boolean;
  isRefreshingGoals: boolean;
  goalsSyncError: string | null;
  syncGoalsData: (opts?: { refresh?: boolean }) => Promise<void>;
  clearGoalsSyncError: () => void;
}

/**
 * Loads savings goals, budgets, and no-spend challenge from the API when the
 * Goals tab is focused. Local-only mode when `token` is null.
 */
export function useSyncGoalsData({
  token,
  setSavingsGoals,
  setBudgets,
  setNoSpendChallenge,
}: Options): Result {
  const [isSyncingGoals, setIsSyncingGoals] = useState(false);
  const [isRefreshingGoals, setIsRefreshingGoals] = useState(false);
  const [goalsSyncError, setGoalsSyncError] = useState<string | null>(null);
  const initialDone = useRef(false);

  const syncGoalsData = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!token) return;

      if (opts?.refresh) {
        setIsRefreshingGoals(true);
      } else if (!initialDone.current) {
        setIsSyncingGoals(true);
      }
      setGoalsSyncError(null);

      try {
        const [goalRows, budgetRows, challengeRow] = await Promise.all([
          goalsApi.list(token),
          budgetsApi.list(token),
          challengeApi.get(token),
        ]);

        setSavingsGoals(goalRows.map(mapBackendToSavingsGoal));
        setBudgets(budgetRows.map(mapBackendToBudget));
        setNoSpendChallenge(challengeRow ? mapBackendChallenge(challengeRow) : null);
        initialDone.current = true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to sync goals and budgets.';
        setGoalsSyncError(msg);
      } finally {
        setIsSyncingGoals(false);
        setIsRefreshingGoals(false);
      }
    },
    [token, setSavingsGoals, setBudgets, setNoSpendChallenge]
  );

  useFocusEffect(
    useCallback(() => {
      syncGoalsData();
    }, [syncGoalsData])
  );

  return {
    isSyncingGoals,
    isRefreshingGoals,
    goalsSyncError,
    syncGoalsData,
    clearGoalsSyncError: () => setGoalsSyncError(null),
  };
}
