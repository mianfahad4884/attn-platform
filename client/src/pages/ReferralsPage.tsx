import { useState } from 'react';
import { ClipboardCopy, Check } from 'lucide-react';
import { Shell } from '../components/layout/Shell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, type Column } from '../components/ui/Table';
import { useAuthStore } from '../store/authStore';
import { mockReferralTree } from '../services/mockData';
import { formatATTN, formatDate, truncateEmail, tierLabels } from '../utils/format';
import type { ReferralNode } from '../types';

function ReferralTreeNode({ node, isRoot = false }: { node: ReferralNode; isRoot?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {/* Node box */}
      <div
        className={`bg-panel border ${isRoot ? 'border-accent' : 'border-divider'} rounded-[2px] px-3 py-2 text-center min-w-[140px]`}
      >
        <div className="text-xs text-text-primary truncate max-w-[130px]">
          {truncateEmail(node.email, 18)}
        </div>
        <div className="mt-1">
          <Badge variant={node.verified ? 'accent' : 'default'}>
            {tierLabels[node.tier] || 'NOVICE'}
          </Badge>
        </div>
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <>
          {/* Vertical connector from parent */}
          <div className="w-px h-4 bg-divider" />

          <div className="flex justify-center">
            {node.children.map((child, index) => {
              const isFirst = index === 0;
              const isLast = index === node.children.length - 1;
              const isOnly = node.children.length === 1;

              return (
                <div key={child.id} className="flex flex-col items-center relative px-3">
                  {/* Horizontal line segments */}
                  {!isOnly && (
                    <>
                      <div className={`absolute top-0 left-0 w-1/2 h-px ${isFirst ? 'bg-transparent' : 'bg-divider'}`} />
                      <div className={`absolute top-0 right-0 w-1/2 h-px ${isLast ? 'bg-transparent' : 'bg-divider'}`} />
                    </>
                  )}
                  {/* Vertical connector to child */}
                  <div className="w-px h-4 bg-divider" />
                  <ReferralTreeNode node={child} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface DirectReferral {
  email: string;
  tier: string;
  verified: boolean;
  status: string;
  joined: string;
}

export function ReferralsPage() {
  const user = useAuthStore((s) => s.user);
  const [copied, setCopied] = useState(false);

  const referralCode = user?.referralCode || 'ATTN-XXXXXX';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Derive direct referral table data from tree
  const directReferrals: DirectReferral[] = mockReferralTree.children.map((child) => ({
    email: child.email,
    tier: tierLabels[child.tier] || 'NOVICE',
    verified: child.verified,
    status: child.verified ? 'ACTIVE' : 'PENDING',
    joined: '2026-03-10T14:20:00Z', // mock
  }));

  const networkEarnings = 1250000; // 125.0000 ATTN mock

  const columns: Column<DirectReferral>[] = [
    { name: 'Email', key: 'email' },
    {
      name: 'Tier',
      key: 'tier',
      render: (row) => <Badge variant="default">{row.tier}</Badge>,
    },
    {
      name: 'Status',
      key: 'status',
      render: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'accent' : 'default'}>{row.status}</Badge>
      ),
    },
    {
      name: 'Verified',
      key: 'verified',
      align: 'center',
      render: (row) => (
        <span className={row.verified ? 'text-accent' : 'text-text-secondary'}>
          {row.verified ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      name: 'Joined',
      key: 'joined',
      render: (row) => (
        <span className="text-text-secondary text-xs">{formatDate(row.joined)}</span>
      ),
    },
  ];

  return (
    <Shell title="Referrals">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-xs uppercase tracking-wider text-text-secondary mb-2">
            Your Code
          </div>
          <div className="flex items-center gap-2">
            <span className="font-tabular text-lg text-text-primary">{referralCode}</span>
            <button
              onClick={handleCopy}
              className="text-text-secondary hover:text-text-primary cursor-pointer"
            >
              {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
            </button>
          </div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wider text-text-secondary mb-2">
            Direct Referrals
          </div>
          <span className="font-tabular text-lg text-text-primary">
            {mockReferralTree.children.length}
          </span>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-wider text-text-secondary mb-2">
            Network Earnings
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-tabular text-lg text-text-primary">
              {formatATTN(networkEarnings)}
            </span>
            <span className="text-text-secondary text-sm">ATTN</span>
          </div>
        </Card>
      </div>

      {/* Referral tree */}
      <Card className="mb-6 overflow-x-auto">
        <div className="text-xs uppercase tracking-wider text-text-secondary mb-4">
          Referral Network
        </div>
        <div className="flex justify-center py-4 min-w-[600px]">
          <ReferralTreeNode node={mockReferralTree} isRoot />
        </div>
      </Card>

      {/* Direct referrals table */}
      <Card className="p-0">
        <div className="px-5 py-3 border-b border-divider">
          <span className="text-xs uppercase tracking-wider text-text-secondary font-medium">
            Direct Referrals
          </span>
        </div>
        <Table columns={columns} data={directReferrals} />
      </Card>
    </Shell>
  );
}
