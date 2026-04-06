import { BackendBudget, BackendSavingsGoal, BackendChallenge } from '../services/api';
import { Budget, CategoryId, NoSpendChallenge, SavingsGoal } from '../types';

export function mapBackendToSavingsGoal(g: BackendSavingsGoal): SavingsGoal {
  const target =
    typeof g.targetAmount === 'number' ? g.targetAmount : parseFloat(String(g.targetAmount));
  return {
    id: g.id,
    name: g.name,
    targetAmount: target,
    month: g.month,
    currency: g.currency || undefined,
    createdAt: g.createdAt,
  };
}

export function mapBackendToBudget(b: BackendBudget): Budget {
  const limit = typeof b.limit === 'number' ? b.limit : parseFloat(String(b.limit));
  return {
    id: b.id,
    category: b.category as CategoryId,
    limit,
    month: b.month,
    currency: b.currency || undefined,
  };
}

export function mapBackendChallenge(c: BackendChallenge): NoSpendChallenge {
  return {
    id: c.id,
    startDate: c.startDate,
    durationDays: c.durationDays,
    isActive: c.isActive,
  };
}
