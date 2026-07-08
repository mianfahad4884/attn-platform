import { useState, useMemo } from 'react';
import { Shell } from '../components/layout/Shell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, type Column } from '../components/ui/Table';
import { useBalanceStore } from '../store/balanceStore';
import { formatATTN, formatATTNComma, formatDateTime } from '../utils/format';
import type { Withdrawal } from '../types';

const FEE_PERCENTAGE = 5;
const WITHDRAWAL_MINIMUM = 5000000; // 500.0000 ATTN

export function WithdrawPage() {
  const { balance, withdrawals, requestWithdrawal, isLoading } = useBalanceStore();
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState<'STRIPE' | 'CRYPTO'>('STRIPE');

  const amountMinorUnits = useMemo(() => {
    const parsed = parseFloat(amountStr);
    if (isNaN(parsed) || parsed <= 0) return 0;
    return Math.floor(parsed * 10000);
  }, [amountStr]);

  const fee = Math.floor(amountMinorUnits * (FEE_PERCENTAGE / 100));
  const netPayout = amountMinorUnits - fee;

  const canSubmit =
    amountMinorUnits >= WITHDRAWAL_MINIMUM &&
    amountMinorUnits <= balance &&
    !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await requestWithdrawal(amountMinorUnits, method);
    setAmountStr('');
  };

  const withdrawalColumns: Column<Withdrawal>[] = [
    {
      name: 'Date',
      key: 'createdAt',
      render: (row) => (
        <span className="text-xs text-text-secondary">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      name: 'Amount',
      key: 'amount',
      align: 'right',
      mono: true,
      render: (row) => formatATTN(row.amount),
    },
    {
      name: 'Fee',
      key: 'fee',
      align: 'right',
      mono: true,
      render: (row) => formatATTN(row.fee),
    },
    {
      name: 'Net',
      key: 'netPayout',
      align: 'right',
      mono: true,
      render: (row) => formatATTN(row.netPayout),
    },
    {
      name: 'Status',
      key: 'status',
      align: 'center',
      render: (row) => {
        const variantMap: Record<string, 'default' | 'accent' | 'negative'> = {
          PENDING: 'default',
          PROCESSING: 'accent',
          COMPLETED: 'accent',
          FAILED: 'negative',
        };
        return <Badge variant={variantMap[row.status] || 'default'}>{row.status}</Badge>;
      },
    },
    {
      name: 'Method',
      key: 'method',
      render: (row) => (
        <span className="text-xs text-text-secondary">{row.method}</span>
      ),
    },
  ];

  return (
    <Shell title="Withdraw">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: withdrawal form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Balance display */}
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
            <p className="text-xs text-text-secondary mt-2">
              Minimum withdrawal: {formatATTNComma(WITHDRAWAL_MINIMUM)} ATTN
            </p>
          </Card>

          {/* Amount input */}
          <Card>
            <Input
              label="Amount (ATTN)"
              type="number"
              step="0.0001"
              min="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.0000"
              className="font-tabular"
            />
          </Card>

          {/* Payment method */}
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`bg-panel border rounded-[2px] p-4 text-left cursor-pointer ${
                method === 'STRIPE' ? 'border-accent' : 'border-divider'
              }`}
              onClick={() => setMethod('STRIPE')}
            >
              <div className="text-sm text-text-primary">Bank Transfer</div>
              <div className="text-xs text-text-secondary mt-0.5">via Stripe</div>
            </button>
            <button
              className={`bg-panel border rounded-[2px] p-4 text-left cursor-pointer ${
                method === 'CRYPTO' ? 'border-accent' : 'border-divider'
              }`}
              onClick={() => setMethod('CRYPTO')}
            >
              <div className="text-sm text-text-primary">Cryptocurrency</div>
              <div className="text-xs text-text-secondary mt-0.5">Wallet transfer</div>
            </button>
          </div>

          {/* Receipt breakdown */}
          {amountMinorUnits > 0 && (
            <Card>
              <div className="space-y-2 font-tabular text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Requested</span>
                  <span className="text-text-primary">{formatATTNComma(amountMinorUnits)} ATTN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Fee ({FEE_PERCENTAGE}.00%)</span>
                  <span className="text-negative">-{formatATTN(fee)} ATTN</span>
                </div>
                <div className="border-t border-divider my-2" />
                <div className="flex justify-between">
                  <span className="text-text-primary font-medium">Net Payout</span>
                  <span className="text-text-primary font-medium">{formatATTNComma(netPayout)} ATTN</span>
                </div>
              </div>
            </Card>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
          >
            {isLoading ? 'Processing…' : 'Confirm Withdrawal'}
          </Button>
        </div>

        {/* Right: withdrawal history */}
        <div className="lg:col-span-1">
          <Card className="p-0">
            <div className="px-5 py-3 border-b border-divider">
              <span className="text-xs uppercase tracking-wider text-text-secondary font-medium">
                Withdrawal History
              </span>
            </div>
            <Table columns={withdrawalColumns} data={withdrawals} />
          </Card>
        </div>
      </div>
    </Shell>
  );
}
