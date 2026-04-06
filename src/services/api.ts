// ── API base URL ──────────────────────────────────────────────────────────────
// Change EXPO_PUBLIC_API_URL in your .env file:
//   iOS Simulator    → http://localhost:8080
//   Android Emulator → http://10.0.2.2:8080
//   Physical device  → http://<your-machine-ip>:8080
const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'
).replace(/\/$/, '');

const TIMEOUT_MS = 10_000;

/** Called when an authenticated request returns 401 (e.g. token for another server). Set from AuthProvider. */
let onUnauthorized: (() => void) | null = null;

export function setApiUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// ── Error type ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Maps API/network errors to short, actionable copy for alerts and toasts. */
export function userFacingApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return error.message;
    if (error.status === 0) return error.message;
    const m = error.message.toLowerCase();
    if (m.includes('failed to create transaction') || m.includes('failed to update')) {
      return 'The server could not save this entry. Sign out and sign in again (especially if you changed API server), then retry.';
    }
    if (m.includes('failed to delete')) {
      return 'Could not delete on the server. Check your connection and try again.';
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Try again.';
}

// ── Core request helper ───────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out. Is the server running?', 0);
    }
    throw new ApiError(
      `Cannot reach the server (${BASE_URL}). ` +
        'Make sure the backend is running and EXPO_PUBLIC_API_URL is correct.',
      0
    );
  }
  clearTimeout(timer);

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      onUnauthorized?.();
    }
    throw new ApiError(
      (data as { error?: string }).error ?? `Server error (${res.status})`,
      res.status
    );
  }
  return data as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  balance: number;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: BackendUser;
}

export interface BackendTransaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string; // ISO 4217
  category: string;
  note: string;
  date: string;
  createdAt: string;
}

export interface DailySpend {
  date: string;   // YYYY-MM-DD
  amount: number;
}

export interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
}

export interface DashboardData {
  balance: number;
  month: string;
  income: number;
  expenses: number;
  netSavings: number;
  savingsRate: number;
  totalTransactions: number;
  weeklySpending: DailySpend[];
  topCategories: CategorySpend[];
  recentTransactions: BackendTransaction[];
}

export interface TransactionPayload {
  type: 'income' | 'expense';
  amount: number;
  currency: string; // ISO 4217
  category: string;
  note: string;
  date: string;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export const authApi = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('POST', '/auth/register', null, { name, email, password }),

  login: (email: string, password: string) =>
    request<AuthResponse>('POST', '/auth/login', null, { email, password }),
};

// ── Dashboard endpoint ────────────────────────────────────────────────────────

export const dashboardApi = {
  get: (token: string) =>
    request<DashboardData>('GET', '/api/dashboard', token),
};

// ── User endpoints ────────────────────────────────────────────────────────────

export const userApi = {
  getProfile: (token: string) =>
    request<BackendUser>('GET', '/api/user', token),

  updateProfile: (token: string, name: string, email: string) =>
    request<BackendUser>('PUT', '/api/user/profile', token, { name, email }),

  setBalance: (token: string, balance: number) =>
    request<BackendUser>('PUT', '/api/user/balance', token, { balance }),
};

// ── Transaction endpoints ─────────────────────────────────────────────────────

export const transactionApi = {
  list: (token: string, params?: { type?: string; month?: string }) => {
    const qs = params
      ? '?' + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')
      : '';
    return request<BackendTransaction[]>('GET', `/api/transactions${qs}`, token);
  },

  create: (token: string, payload: TransactionPayload) =>
    request<BackendTransaction>('POST', '/api/transactions', token, payload),

  update: (token: string, id: string, payload: TransactionPayload) =>
    request<BackendTransaction>('PUT', `/api/transactions/${id}`, token, payload),

  delete: (token: string, id: string) =>
    request<void>('DELETE', `/api/transactions/${id}`, token),
};

// ── Savings goals ────────────────────────────────────────────────────────────

export interface BackendSavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  month: string;
  currency?: string;
  createdAt: string;
}

export const goalsApi = {
  list: (token: string, month?: string) => {
    const q = month ? `?month=${encodeURIComponent(month)}` : '';
    return request<BackendSavingsGoal[]>('GET', `/api/goals${q}`, token);
  },

  create: (
    token: string,
    body: { name: string; targetAmount: number; month: string; currency?: string }
  ) => request<BackendSavingsGoal>('POST', '/api/goals', token, body),

  delete: (token: string, id: string) =>
    request<void>('DELETE', `/api/goals/${id}`, token),
};

// ── Budgets ─────────────────────────────────────────────────────────────────

export interface BackendBudget {
  id: string;
  userId: string;
  category: string;
  limit: number;
  month: string;
  currency?: string;
}

export const budgetsApi = {
  list: (token: string, month?: string) => {
    const q = month ? `?month=${encodeURIComponent(month)}` : '';
    return request<BackendBudget[]>('GET', `/api/budgets${q}`, token);
  },

  create: (
    token: string,
    body: { category: string; limit: number; month: string; currency?: string }
  ) => request<BackendBudget>('POST', '/api/budgets', token, body),

  delete: (token: string, id: string) =>
    request<void>('DELETE', `/api/budgets/${id}`, token),
};

// ── No-spend challenge (one per user) ───────────────────────────────────────

export interface BackendChallenge {
  id: string;
  userId: string;
  startDate: string;
  durationDays: number;
  isActive: boolean;
}

export const challengeApi = {
  get: (token: string) =>
    request<BackendChallenge | null>('GET', '/api/challenge', token),

  set: (
    token: string,
    body: { startDate: string; durationDays: number; isActive: boolean }
  ) => request<BackendChallenge>('POST', '/api/challenge', token, body),

  delete: (token: string) => request<void>('DELETE', '/api/challenge', token),
};
