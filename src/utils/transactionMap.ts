import { BackendTransaction } from '../services/api';
import { CategoryId, Transaction } from '../types';

export function mapBackendToTransaction(b: BackendTransaction): Transaction {
  return {
    id: b.id,
    type: b.type,
    amount: typeof b.amount === 'number' ? b.amount : parseFloat(String(b.amount)),
    currency: b.currency ?? 'INR',
    category: b.category as CategoryId,
    note: b.note ?? '',
    date: b.date,
  };
}
