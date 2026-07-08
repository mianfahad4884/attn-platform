import { useState } from 'react';
import { Shell } from '../components/layout/Shell';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters');
      return;
    }
    setPasswordMessage('Password updated successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Shell title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* Account */}
        <Card>
          <div className="text-xs uppercase tracking-wider text-text-secondary mb-4">
            Account
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-text-secondary uppercase tracking-wider">Email</span>
              <div className="text-sm text-text-primary mt-1">{user?.email || '—'}</div>
            </div>
            <div>
              <span className="text-xs text-text-secondary uppercase tracking-wider">Tier</span>
              <div className="text-sm text-text-primary mt-1">
                {user?.tierLabel || 'NOVICE'}{' '}
                <span className="font-tabular text-accent">{user?.multiplier || 1.0}×</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-text-secondary uppercase tracking-wider">Referral Code</span>
              <div className="font-tabular text-sm text-text-primary mt-1">
                {user?.referralCode || '—'}
              </div>
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <div className="text-xs uppercase tracking-wider text-text-secondary mb-4">
            Security
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {passwordMessage && (
              <p
                className={`text-sm ${
                  passwordMessage.includes('success') ? 'text-accent' : 'text-negative'
                }`}
              >
                {passwordMessage}
              </p>
            )}
            <Button type="submit" size="sm">
              Update Password
            </Button>
          </form>
        </Card>

        {/* Preferences */}
        <Card>
          <div className="text-xs uppercase tracking-wider text-text-secondary mb-4">
            Preferences
          </div>
          <p className="text-sm text-text-secondary">
            No configurable preferences in v1. Additional settings will appear here in future releases.
          </p>
        </Card>
      </div>
    </Shell>
  );
}
