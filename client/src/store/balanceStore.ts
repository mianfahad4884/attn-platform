import { create } from 'zustand';
import type { LedgerEntry, Withdrawal } from '../types';
import { useAuthStore } from './authStore';

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
  balance: 0,
  ledger: [],
  withdrawals: [],
  isLoading: false,

  fetchBalance: async () => {
    // Note: If balance is included in user object or ledger, this might be redundant.
    // Assuming GET /api/wallet/ledger returns the balance too, or we have a specific endpoint.
    // If not, we calculate from the most recent ledger entry or /api/auth/me.
    // For now, let's fetch ledger to get balance.
    await get().fetchLedger();
  },

  fetchLedger: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true });
    try {
      const [ledgerRes, withdrawalRes] = await Promise.all([
        fetch('/api/wallet/ledger', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/wallet/withdrawals', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (ledgerRes.ok && withdrawalRes.ok) {
        const ledgerData = await ledgerRes.json();
        const withdrawalsData = await withdrawalRes.json();
        
        const ledger = Array.isArray(ledgerData) ? ledgerData : (ledgerData.entries || []);
        const balance = ledger.length > 0 ? ledger[0].balanceAfter : 0;

        set({ 
          ledger, 
          balance,
          withdrawals: Array.isArray(withdrawalsData) ? withdrawalsData : (withdrawalsData.withdrawals || []),
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
      set({ isLoading: false });
    }
  },

  requestWithdrawal: async (amount: number, method: 'STRIPE' | 'CRYPTO') => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true });
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, method })
      });

      if (res.ok) {
        // Refresh ledger and withdrawals after successful withdrawal
        await get().fetchLedger();
      } else {
        const error = await res.json();
        console.error('Withdrawal failed:', error);
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('Withdrawal request error:', err);
      set({ isLoading: false });
    }
  },

  addCredit: (amount: number, source: LedgerEntry['source'], description: string) => {
    // This looks like an internal/mock function for UI testing, but in a real app,
    // adding credit is a backend operation. So we'll skip direct implementation
    // or simulate an API call if there was one (e.g. POST /api/wallet/credit - typically admin only)
    console.warn('addCredit called on frontend but should be a backend operation');
  },
}));
