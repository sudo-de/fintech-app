import { useMemo } from 'react';
import { Transaction } from '../types';
import { useCurrency } from '../context/CurrencyContext';

/**
 * Returns a copy of `transactions` with every amount expressed in the current
 * display currency, using the following priority:
 *
 *  1. If transaction.currency === displayCurrency  → no conversion, return as-is.
 *  2. If transaction.baseCurrency === displayCurrency AND convertedAmount is set
 *     → use the historically-locked `convertedAmount` directly (immutable).
 *  3. If transaction.baseCurrency differs from displayCurrency AND convertedAmount is set
 *     → the original→base conversion is already locked; convert base→display using
 *       current live rates (only the display-currency leg uses today's rate).
 *  4. Fallback: live-rate conversion of the original amount.
 *
 * Use this before passing transactions to calculation utilities (totals, budgets, charts)
 * so all numbers are expressed in one currency.
 *
 * Transaction rows and detail screens should still read `transaction.amount` /
 * `transaction.currency` directly so the original denomination stays visible.
 */
export function useConvertedTransactions(transactions: Transaction[]): Transaction[] {
  const { convert, currency } = useCurrency();

  return useMemo(
    () =>
      transactions.map((t) => {
        const tCurrency = t.currency ?? currency.code;

        // 1. Same currency — no conversion needed
        if (tCurrency === currency.code) return t;

        // 2 & 3. Historical snapshot available
        if (t.convertedAmount !== undefined && t.baseCurrency) {
          if (t.baseCurrency === currency.code) {
            // Exact match: the stored amount is already in the display currency
            return { ...t, amount: t.convertedAmount, currency: currency.code };
          }
          // Display currency changed since save: convert the locked base amount
          return {
            ...t,
            amount: convert(t.convertedAmount, t.baseCurrency),
            currency: currency.code,
          };
        }

        // 4. Fallback: live rate
        return { ...t, amount: convert(t.amount, tCurrency), currency: currency.code };
      }),
    [transactions, convert, currency.code],
  );
}
