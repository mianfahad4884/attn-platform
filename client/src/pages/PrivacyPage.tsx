import { Shell } from '../components/layout/Shell';

export function PrivacyPage() {
  return (
    <Shell title="Privacy Policy">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="p-4 bg-negative/10 border border-negative/20 text-negative text-sm">
          <strong>[DRAFT — REPLACE WITH REVIEWED LEGAL TEXT BEFORE REAL LAUNCH]</strong>
          <br />
          This is a structural placeholder. The content below is simulated and holds no legal weight.
        </div>

        <div className="prose prose-invert prose-p:text-text-secondary prose-headings:text-text-primary max-w-none">
          <p>Last updated: July 8, 2026</p>

          <h3>1. Information We Collect</h3>
          <p>
            When you register for an ATTN Platform account, we collect your email address and an argon2id hashed password. We also collect your IP address and hardware fingerprint to enforce rate limits and prevent multi-accounting.
          </p>

          <h3>2. How We Use Your Information</h3>
          <p>
            Your information is used strictly to maintain your account ledger, process withdrawals (via Stripe or Coinbase Commerce), and prevent fraudulent activity within our reward network.
          </p>

          <h3>3. Data Sharing</h3>
          <p>
            We share necessary data with third-party verification partners (such as CPX Research) solely to validate attention and credit your ledger. We do not sell your personal data.
          </p>

          <h3>4. Your Rights</h3>
          <p>
            You may request deletion of your account and associated data by contacting our support team. Ledger data may be retained for regulatory compliance.
          </p>
        </div>
      </div>
    </Shell>
  );
}
