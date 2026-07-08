import { useNavigate } from 'react-router-dom';
import { Shell } from '../components/layout/Shell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, type Column } from '../components/ui/Table';
import { useAuthStore } from '../store/authStore';
import { useBalanceStore } from '../store/balanceStore';
import { formatATTNComma, formatATTN, formatDateTime } from '../utils/format';
import type { LedgerEntry } from '../types';
import { DetailModal } from '../components/ui/DetailModal';
import { useState } from 'react';

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { balance, ledger } = useBalanceStore();
  const [selectedTx, setSelectedTx] = useState<LedgerEntry | null>(null);

  const recentLedger = ledger.slice(0, 10);

  // Mock referral stats
  const directReferrals = 5;
  const nextTierThreshold = 10; // referrals needed for next tier

  const ledgerColumns: Column<LedgerEntry>[] = [
    {
      name: 'Date',
      key: 'createdAt',
      render: (row) => (
        <span className="text-text-secondary text-xs">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      name: 'Action',
      key: 'description',
      render: (row) => (
        <span className="text-sm">{row.description}</span>
      ),
    },
    {
      name: 'Amount',
      key: 'amount',
      align: 'right',
      mono: true,
      render: (row) => (
        <span className={row.amount < 0 ? 'text-negative' : 'text-text-primary'}>
          {row.amount >= 0 ? '+' : ''}{formatATTN(row.amount)}
        </span>
      ),
    },
    {
      name: 'Status',
      key: 'type',
      align: 'center',
      render: (row) => {
        const variantMap: Record<string, 'default' | 'accent' | 'negative'> = {
          CREDIT: 'accent',
          DEBIT: 'negative',
          FEE: 'negative',
          ADJUSTMENT: 'default',
        };
        return <Badge variant={variantMap[row.type] || 'default'}>{row.type}</Badge>;
      },
    },
  ];

  return (
    <Shell title="Dashboard">
      {/* Balance + Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="text-xs uppercase tracking-wider text-text-secondary mb-2">
            Available Balance
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-tabular text-2xl text-text-primary">
              {formatATTNComma(balance)}
            </span>
            <span className="text-text-secondary text-sm">ATTN</span>
          </div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wider text-text-secondary mb-2">
            Current Tier
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-lg text-text-primary uppercase tracking-wider">
              {user?.tierLabel || 'NOVICE'}
            </span>
            <span className="font-tabular text-accent text-sm">
              {user?.multiplier || 1.0}×
            </span>
          </div>
          <div className="text-xs text-text-secondary">
            {directReferrals} / {nextTierThreshold} referrals to next tier
          </div>
          <div className="mt-2 h-1 bg-divider rounded-[1px]">
            <div
              className="h-1 bg-accent rounded-[1px]"
              style={{ width: `${(directReferrals / nextTierThreshold) * 100}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <Button onClick={() => navigate('/verify')}>Verify Attention</Button>
        <Button variant="secondary" onClick={() => navigate('/withdraw')}>
          Withdraw
        </Button>
      </div>

      {/* Recent Activity */}
      <Card className="p-0">
        <div className="px-5 py-3 border-b border-divider">
          <span className="text-xs uppercase tracking-wider text-text-secondary font-medium">
            Recent Activity
          </span>
        </div>
        <Table columns={ledgerColumns} data={recentLedger} onRowClick={(row) => setSelectedTx(row)} />
      </Card>

      <DetailModal data={selectedTx} onClose={() => setSelectedTx(null)} />
    </Shell>
  );
}
