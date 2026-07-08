import { useState, useEffect, useRef, useCallback } from 'react';
import { Shell } from '../components/layout/Shell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressRing } from '../components/ui/ProgressRing';
import { useAuthStore } from '../store/authStore';
import { useBalanceStore } from '../store/balanceStore';
import { formatATTN } from '../utils/format';
import { useUIStore } from '../store/uiStore';

type VerifyState = 'idle' | 'verifying' | 'completed' | 'failed';

const VERIFICATION_DURATION = 30;

export function VerifyPage() {
  const [state, setState] = useState<VerifyState>('idle');
  const [countdown, setCountdown] = useState(VERIFICATION_DURATION);
  const intervalRef = useRef<number | null>(null);
  const user = useAuthStore((s) => s.user);
  const addCredit = useBalanceStore((s) => s.addCredit);
  const addToast = useUIStore((s) => s.addToast);

  const baseReward = 250000; // 25.0000 ATTN
  const multiplier = user?.multiplier || 1.0;
  const tierBonus = Math.floor(baseReward * (multiplier - 1));
  const netReward = baseReward + tierBonus;

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const startVerification = () => {
    setState('verifying');
    setCountdown(VERIFICATION_DURATION);

    intervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          // Simulate 95% success rate
          if (Math.random() > 0.05) {
            setState('completed');
            addCredit(netReward, 'VERIFICATION', `Verification reward (${multiplier}× tier bonus)`);
            addToast('Verification successful. ATTN credited.', 'success');
          } else {
            setState('failed');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const progress = 1 - countdown / VERIFICATION_DURATION;

  return (
    <Shell title="Verify">
      <div className="max-w-lg mx-auto">
        {state === 'idle' && (
          <Card>
            <div className="text-xs uppercase tracking-wider text-text-secondary mb-3">
              Attention Verification
            </div>
            <p className="text-sm text-text-secondary mb-1">
              Complete a 30-second verification to earn ATTN rewards.
            </p>
            <p className="text-sm text-text-secondary mb-6">
              Your current tier multiplier:{' '}
              <span className="font-tabular text-accent">{multiplier}×</span>
            </p>
            <Button onClick={startVerification} className="w-full">
              Start Verification
            </Button>
          </Card>
        )}

        {state === 'verifying' && (
          <div className="space-y-6">
            <Card className="flex flex-col items-center py-10">
              <ProgressRing progress={progress} size={120} strokeWidth={3}>
                <span className="font-tabular text-2xl text-text-primary">{countdown}</span>
              </ProgressRing>
              <p className="text-sm text-text-secondary mt-6">Verifying attention…</p>
            </Card>

            {/* Verification Placeholder (Mock Ad) */}
            <Card className="flex flex-col items-center justify-center min-h-[200px] border-dashed border-2 border-divider bg-bg">
              <span className="text-xs uppercase tracking-widest text-text-secondary font-mono">
                Simulated Ad Content — 30s
              </span>
              <span className="text-sm text-text-secondary mt-2 opacity-50">
                (Placeholder for attention verification media)
              </span>
            </Card>
          </div>
        )}

        {state === 'completed' && (
          <Card>
            <div className="text-xs uppercase tracking-wider text-text-secondary mb-4">
              Verification Complete
            </div>

            <div className="space-y-2 font-tabular text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Base Reward</span>
                <span className="text-text-primary">{formatATTN(baseReward)} ATTN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Tier Bonus ({multiplier}×)</span>
                <span className="text-text-primary">{formatATTN(tierBonus)} ATTN</span>
              </div>
              <div className="border-t border-divider my-2" />
              <div className="flex justify-between">
                <span className="text-text-primary font-medium">Credited</span>
                <span className="text-text-primary font-medium">{formatATTN(netReward)} ATTN</span>
              </div>
            </div>

            <Button onClick={startVerification} className="w-full mt-6">
              Verify Again
            </Button>
          </Card>
        )}

        {state === 'failed' && (
          <Card className="flex flex-col items-center py-8">
            <p className="text-negative text-sm mb-6">
              Verification failed. Please try again.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setState('idle');
                setCountdown(VERIFICATION_DURATION);
              }}
            >
              Try Again
            </Button>
          </Card>
        )}
      </div>
    </Shell>
  );
}
