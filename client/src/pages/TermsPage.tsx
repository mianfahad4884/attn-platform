import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center p-6 pt-12">
      <div className="max-w-2xl w-full">
        <div className="mb-8 flex justify-between items-end border-b border-divider pb-4">
          <h1 className="text-2xl text-text-primary tracking-tight">Platform Terms & Fees</h1>
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>

        <div className="p-4 bg-negative/10 border border-negative/20 text-negative text-sm mb-6">
          <strong>[DRAFT — REPLACE WITH REVIEWED LEGAL TEXT BEFORE REAL LAUNCH]</strong>
          <br />
          This is a structural placeholder. The content below is simulated and holds no legal weight.
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-sm uppercase tracking-wider text-text-secondary mb-3">
              1. Withdrawal Policies
            </h2>
            <div className="text-sm text-text-primary space-y-3">
              <p>
                The platform enforces a strict minimum withdrawal threshold. Currently, the minimum withdrawal amount is fixed at <strong>500.0000 ATTN</strong>.
              </p>
              <p>
                All withdrawals are subject to a flat <strong>5.00% network fee</strong> to cover processing and ledger maintenance. This fee is automatically deducted from the requested amount before payout.
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm uppercase tracking-wider text-text-secondary mb-3">
              2. Verification Rewards & Tiers
            </h2>
            <div className="text-sm text-text-primary space-y-3">
              <p>
                Users generate ATTN by submitting cryptographic proofs of attention every 30 seconds. The base reward is 25.0000 ATTN per verification.
              </p>
              <p>
                By referring active users to the platform, you can unlock higher tier statuses which permanently multiply your verification rewards:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-text-secondary">
                <li><span className="text-text-primary">NOVICE (Default):</span> 1.0× Multiplier</li>
                <li><span className="text-text-primary">ADVOCATE (10+ Referrals):</span> 1.5× Multiplier</li>
                <li><span className="text-text-primary">ELITE (50+ Referrals):</span> 2.5× Multiplier</li>
                <li><span className="text-text-primary">LEGEND (250+ Referrals):</span> 5.0× Multiplier</li>
              </ul>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm uppercase tracking-wider text-text-secondary mb-3">
              3. Precision Mathematics
            </h2>
            <div className="text-sm text-text-primary space-y-3">
              <p>
                All financial calculations on the ATTN network are performed using strict integer math at the minor-unit level (where 1 ATTN = 10,000 minor units). 
                The platform mathematically guarantees zero floating-point drift.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
