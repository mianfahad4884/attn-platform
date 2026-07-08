import { useState, useEffect } from 'react';
import { Shell } from '../../components/layout/Shell';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Table, type Column } from '../../components/ui/Table';
import { formatATTNComma, formatDateTime, truncateId, truncateEmail } from '../../utils/format';
import type { User, AuditLogEntry, SystemConfig } from '../../types';
import { DetailModal } from '../../components/ui/DetailModal';
import { useAuthStore } from '../../store/authStore';

type Tab = 'users' | 'audit' | 'controls';

export function TerminalPage() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Modal states
  const [actionModal, setActionModal] = useState<{
    type: 'ban' | 'adjust' | 'tier';
    user: User;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [selectedTier, setSelectedTier] = useState<number>(1);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  // Controls state
  const [pauseReason, setPauseReason] = useState('');
  const [pauseExpiry, setPauseExpiry] = useState('');

  // Bulk actions
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAudit = async () => {
    try {
      const res = await fetch('/api/admin/audit', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAuditLog(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchControls = async () => {
    try {
      const res = await fetch('/api/admin/controls', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'audit') fetchAudit();
    if (activeTab === 'controls') fetchControls();
  }, [activeTab, token]);

  const toggleUserSelection = (id: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUsers(newSet);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(newSet());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'users', label: 'Users' },
    { key: 'audit', label: 'Audit Log' },
    { key: 'controls', label: 'Controls' },
  ];

  // ── Users tab ──
  const userColumns: Column<User>[] = [
    {
      name: (
        <input 
          type="checkbox" 
          checked={users.length > 0 && selectedUsers.size === users.length}
          onChange={toggleAllUsers}
          className="cursor-pointer"
        />
      ) as any,
      key: 'checkbox' as any,
      render: (row) => (
        <input 
          type="checkbox" 
          checked={selectedUsers.has(row.id)}
          onChange={() => toggleUserSelection(row.id)}
          className="cursor-pointer"
        />
      ),
    },
    {
      name: 'ID',
      key: 'id',
      render: (row) => (
        <span className="font-tabular text-xs text-text-secondary">{truncateId(row.id)}</span>
      ),
    },
    {
      name: 'Email',
      key: 'email',
      render: (row) => <span className="text-sm">{truncateEmail(row.email, 24)}</span>,
    },
    {
      name: 'Tier',
      key: 'tierLabel',
      render: (row) => <Badge variant="default">{row.tier || 1}</Badge>,
    },
    {
      name: 'Status',
      key: 'status',
      render: (row) => {
        const variantMap: Record<string, 'default' | 'accent' | 'negative'> = {
          ACTIVE: 'accent',
          SUSPENDED: 'default',
          BANNED: 'negative',
        };
        return <Badge variant={variantMap[row.status] || 'default'}>{row.status}</Badge>;
      },
    },
    {
      name: 'Created',
      key: 'createdAt',
      render: (row) => (
        <span className="text-xs text-text-secondary">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      name: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex gap-3">
          <button
            className="text-xs text-accent hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setActionModal({ type: 'tier', user: row });
              setSelectedTier(row.tier || 1);
            }}
          >
            tier
          </button>
          <button
            className="text-xs text-negative hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setActionModal({ type: 'ban', user: row });
              setActionReason('');
            }}
          >
            ban
          </button>
          <button
            className="text-xs text-accent hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setActionModal({ type: 'adjust', user: row });
              setActionReason('');
              setAdjustAmount('');
            }}
          >
            adjust
          </button>
        </div>
      ),
    },
  ];

  // ── Audit tab ──
  const auditColumns: Column<AuditLogEntry>[] = [
    {
      name: 'Date',
      key: 'createdAt',
      render: (row) => (
        <span className="text-xs text-text-secondary">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      name: 'Admin',
      key: 'adminId',
      render: (row) => (
        <span className="font-tabular text-xs text-text-secondary">{truncateId(row.adminId)}</span>
      ),
    },
    {
      name: 'Action',
      key: 'action',
      render: (row) => <span className="text-xs">{row.action}</span>,
    },
    {
      name: 'Target',
      key: 'targetUserId',
      render: (row) => (
        <span className="font-tabular text-xs text-text-secondary">
          {row.targetUserId ? truncateId(row.targetUserId) : '—'}
        </span>
      ),
    },
    {
      name: 'Reason',
      key: 'reason',
      render: (row) => (
        <span className="text-xs text-text-secondary truncate max-w-[200px] block">
          {row.reason}
        </span>
      ),
    },
    {
      name: 'Details',
      key: 'details',
      render: (row) => (
        <button
          className="text-xs text-accent hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAuditLog({
              id: row.id,
              createdAt: row.createdAt,
              type: 'AUDIT_LOG',
              source: 'ADMIN',
              description: row.reason,
              amount: 0,
              balanceAfter: 0,
              ...row.details
            });
          }}
        >
          view
        </button>
      ),
    },
  ];

  const handleActionSubmit = async () => {
    if (!actionModal) return;
    
    let endpoint = `/api/admin/users/${actionModal.user.id}/ban`;
    let body: any = { reason: actionReason };
    
    if (actionModal.type === 'adjust') {
      if (!actionReason.trim() || !adjustAmount) return;
      endpoint = `/api/admin/users/${actionModal.user.id}/adjust`;
      body = { amount: parseInt(adjustAmount, 10), reason: actionReason };
    } else if (actionModal.type === 'tier') {
      endpoint = `/api/admin/users/${actionModal.user.id}/tier`;
      body = { tier: selectedTier };
    } else {
      if (!actionReason.trim()) return;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        fetchUsers();
        setActionModal(null);
      } else {
        console.error('Action failed', await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      const res = await fetch('/api/admin/controls/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        fetchControls();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePause = async () => {
    if (!config) return;
    const newState = !config.emergencyPause;
    
    try {
      const res = await fetch('/api/admin/controls/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emergencyPause: newState,
          reason: newState ? pauseReason : undefined,
          expiresAt: newState ? pauseExpiry : undefined
        })
      });
      
      if (res.ok) {
        fetchControls();
        if (!newState) {
          setPauseReason('');
          setPauseExpiry('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + users.map(u => `${u.id},${u.email},${u.tier},${u.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "users_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Shell title="Admin Terminal">
      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b border-divider pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`text-sm pb-1 cursor-pointer ${
              activeTab === tab.key
                ? 'text-accent border-b-2 border-accent -mb-[9px]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {activeTab === 'users' && (
        <Card className="p-0">
          <div className="p-4 border-b border-divider flex justify-between items-center">
            <div className="text-xs text-text-secondary">
              {selectedUsers.size > 0 ? `${selectedUsers.size} users selected` : 'Users List'}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={exportCSV}>
                Export CSV
              </Button>
            </div>
          </div>
          <Table columns={userColumns} data={users} />
        </Card>
      )}

      {/* Audit Log tab */}
      {activeTab === 'audit' && (
        <Card className="p-0">
          <Table columns={auditColumns} data={auditLog} />
        </Card>
      )}

      {/* Controls tab */}
      {activeTab === 'controls' && config && (
        <div className="space-y-6">
          {/* System config */}
          <Card>
            <div className="text-xs uppercase tracking-wider text-text-secondary mb-4">
              System Configuration
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
              <Input
                label="Fee Percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={String(config.feePercentage)}
                onChange={(e) =>
                  setConfig({ ...config, feePercentage: parseFloat(e.target.value) || 0 })
                }
                className="font-tabular"
              />
              <Input
                label="Withdrawal Minimum (ATTN)"
                type="number"
                step="0.0001"
                min="0"
                value={String(config.withdrawalMinimum / 10000)}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    withdrawalMinimum: Math.floor((parseFloat(e.target.value) || 0) * 10000),
                  })
                }
                className="font-tabular"
              />
            </div>
            <Button size="sm" className="mt-4" onClick={handleSaveConfig}>
              Save Configuration
            </Button>
          </Card>

          {/* Emergency pause */}
          <Card>
            <div className="text-xs uppercase tracking-wider text-text-secondary mb-4">
              Emergency Pause
            </div>
            <div className="flex items-center gap-3 mb-4">
              <button
                className={`relative w-10 h-5 border cursor-pointer transition-colors ${
                  config.emergencyPause ? 'bg-accent border-accent' : 'bg-transparent border-divider'
                }`}
                onClick={handleTogglePause}
              >
                <div
                  className={`absolute top-0 w-4 h-[18px] transition-transform ${
                    config.emergencyPause ? 'bg-text-primary translate-x-5' : 'bg-divider translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm text-text-primary">
                {config.emergencyPause ? 'System paused' : 'System active'}
              </span>
            </div>
            {config.emergencyPause && (
              <div className="space-y-3 max-w-lg">
                <Textarea
                  label="Pause Reason"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for emergency pause"
                />
                <Input
                  label="Pause Expires At"
                  type="datetime-local"
                  value={pauseExpiry}
                  onChange={(e) => setPauseExpiry(e.target.value)}
                />
              </div>
            )}
          </Card>

          {/* Stats */}
          {stats && (
            <Card>
              <div className="text-xs uppercase tracking-wider text-text-secondary mb-4">
                Platform Statistics
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-text-secondary mb-1">Total Users</div>
                  <span className="font-tabular text-lg text-text-primary">
                    {stats.totalUsers?.toLocaleString() || 0}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-text-secondary mb-1">Total ATTN Minted</div>
                  <span className="font-tabular text-lg text-text-primary">
                    {formatATTNComma(stats.totalMinted || 0)}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-text-secondary mb-1">Total Fees</div>
                  <span className="font-tabular text-lg text-text-primary">
                    {formatATTNComma(stats.totalFees || 0)}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-text-secondary mb-1">Avg Time-to-Withdrawal</div>
                  <span className="font-tabular text-lg text-text-primary">
                    {stats.avgTimeToWithdrawal || 'N/A'}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Action modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border border-divider">
            <div className="text-xs uppercase tracking-wider text-text-secondary mb-4">
              {actionModal.type === 'ban' ? 'Ban User' : actionModal.type === 'adjust' ? 'Adjust Balance' : 'Edit Tier'}
            </div>
            <div className="text-sm text-text-primary mb-4">
              Target:{' '}
              <span className="font-tabular text-text-secondary">
                {actionModal.user.email}
              </span>
            </div>

            {actionModal.type === 'adjust' && (
              <div className="mb-3">
                <Input
                  label="Amount (minor units, negative to debit)"
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="font-tabular"
                />
              </div>
            )}

            {actionModal.type === 'tier' && (
              <div className="mb-3">
                <Input
                  label="Tier Level (1-10)"
                  type="number"
                  min="1"
                  max="10"
                  value={String(selectedTier)}
                  onChange={(e) => setSelectedTier(parseInt(e.target.value, 10))}
                  className="font-tabular"
                />
              </div>
            )}

            {actionModal.type !== 'tier' && (
              <Textarea
                label="Reason (required)"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                placeholder="Provide a reason for this action"
              />
            )}

            <div className="flex gap-3 mt-4">
              <Button
                variant={actionModal.type === 'ban' ? 'danger' : 'primary'}
                size="sm"
                onClick={handleActionSubmit}
                disabled={actionModal.type !== 'tier' && !actionReason.trim()}
              >
                {actionModal.type === 'ban' ? 'Confirm Ban' : actionModal.type === 'adjust' ? 'Confirm Adjustment' : 'Confirm Tier Change'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActionModal(null)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      <DetailModal data={selectedAuditLog} onClose={() => setSelectedAuditLog(null)} />
    </Shell>
  );
}
