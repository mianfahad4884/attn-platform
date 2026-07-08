import { create } from 'zustand';
import type { LedgerEntry, Withdrawal } from '../types';
import { mockBalance, mockLedgerEntries, mockWithdrawals } from '../services/mockData';

interface BalanceState {
  balance: number;
  ledger: LedgerEntry[];
  withdrawals: Withdrawal[];
  isLoading: boolean;
  fetchBalance: () => Promise<void>;
  fetchLedger: () => Promise<void>;
  requestWithdrawal: (amount: number, method: 'STRIPE' | 'CRYPTO') => Promise<void>;
  addCredit: (amount: number, source: LedgerEntry['source'], description: string) => void;
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  balance: mockBalance,
  ledger: mockLedgerEntries,
  withdrawals: mockWithdrawals,
  isLoading: false,

  fetchBalance: async () => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 300));
    set({ balance: mockBalance, isLoading: false });
  },

  fetchLedger: async () => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 300));
    set({ ledger: mockLedgerEntries, isLoading: false });
  },

  requestWithdrawal: async (amount: number, method: 'STRIPE' | 'CRYPTO') => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 800));

    const fee = Math.floor(amount * 0.05);
    const netPayout = amount - fee;
    const state = get();

    const withdrawal: Withdrawal = {
      id: 'wd_' + Math.random().toString(36).slice(2, 8),
      userId: 'usr_8f3a1b2c4d5e6f7a',
      amount,
      fee,
      netPayout,
      method,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const debitEntry: LedgerEntry = {
      id: 'txn_' + Math.random().toString(36).slice(2, 8),
      userId: 'usr_8f3a1b2c4d5e6f7a',
      type: 'DEBIT',
      amount: -amount,
      balanceAfter: state.balance - amount,
      source: 'WITHDRAWAL',
      referenceId: withdrawal.id,
      description: `Withdrawal to ${method === 'STRIPE' ? 'Stripe' : 'crypto wallet'}`,
      createdAt: new Date().toISOString(),
    };

    const feeEntry: LedgerEntry = {
      id: 'txn_' + Math.random().toString(36).slice(2, 8),
      userId: 'usr_8f3a1b2c4d5e6f7a',
      type: 'FEE',
      amount: -fee,
      balanceAfter: state.balance - amount - fee,
      source: 'WITHDRAWAL',
      referenceId: withdrawal.id,
      description: `Withdrawal fee (5.00%)`,
      createdAt: new Date().toISOString(),
    };

    set({
      balance: state.balance - amount - fee,
      ledger: [debitEntry, feeEntry, ...state.ledger],
      withdrawals: [withdrawal, ...state.withdrawals],
      isLoading: false,
    });
  },

  addCredit: (amount: number, source: LedgerEntry['source'], description: string) => {
    const state = get();
    const entry: LedgerEntry = {
      id: 'txn_' + Math.random().toString(36).slice(2, 8),
      userId: 'usr_8f3a1b2c4d5e6f7a',
      type: 'CREDIT',
      amount,
      balanceAfter: state.balance + amount,
      source,
      referenceId: null,
      description,
      createdAt: new Date().toISOString(),
    };

    set({
      balance: state.balance + amount,
      ledger: [entry, ...state.ledger],
    });
  },
}));
