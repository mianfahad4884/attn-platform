import { formatATTNComma, formatDateTime } from '../../utils/format';

interface DetailModalProps {
  data: any | null;
  onClose: () => void;
}

export function DetailModal({ data, onClose }: DetailModalProps) {
  if (!data) return null;

  // Distinguish between LedgerEntry and Withdrawal
  const isWithdrawal = 'method' in data && 'fee' in data;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg border border-divider">
        <div className="px-5 py-3 border-b border-divider flex justify-between items-center bg-panel">
          <span className="text-xs uppercase tracking-wider text-text-secondary font-medium">
            {isWithdrawal ? 'Withdrawal Details' : 'Transaction Details'}
          </span>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm border-b border-divider pb-4">
            <div>
              <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">ID</div>
              <div className="font-tabular">{data.id}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Date</div>
              <div>{formatDateTime(data.createdAt)}</div>
            </div>
          </div>

          {!isWithdrawal ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm border-b border-divider pb-4">
                <div>
                  <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Type</div>
                  <div>{data.type}</div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Source</div>
                  <div>{data.source}</div>
                </div>
              </div>
              <div className="text-sm border-b border-divider pb-4">
                <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Description</div>
                <div>{data.description}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Amount (ATTN)</div>
                  <div className={`font-tabular ${data.amount < 0 ? 'text-negative' : 'text-text-primary'}`}>
                    {data.amount >= 0 ? '+' : ''}{formatATTNComma(data.amount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Balance After</div>
                  <div className="font-tabular">{formatATTNComma(data.balanceAfter)}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm border-b border-divider pb-4">
                <div>
                  <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Status</div>
                  <div>{data.status}</div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Method</div>
                  <div>{data.method}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm border-b border-divider pb-4">
                <div>
                  <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Amount (ATTN)</div>
                  <div className="font-tabular">{formatATTNComma(data.amount)}</div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Fee</div>
                  <div className="font-tabular text-negative">-{formatATTNComma(data.fee)}</div>
                </div>
              </div>
              <div className="text-sm">
                <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Net Payout</div>
                <div className="font-tabular font-medium">{formatATTNComma(data.netPayout)}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
