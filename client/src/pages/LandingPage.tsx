import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-block border border-accent bg-panel px-4 py-1 mb-8">
            <span className="font-mono text-sm tracking-widest text-accent uppercase">
              Attention Platform
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-normal text-text-primary mb-6 tracking-tight">
            Monetize your verified attention.
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            The minimal, high-precision interface for generating and withdrawing ATTN through continuous verification and network referrals.
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="border border-divider bg-panel p-6">
            <div className="text-xs uppercase tracking-wider text-text-secondary mb-3">
              Verification Engine
            </div>
            <p className="text-sm text-text-primary">
              Verify your active attention every 30 seconds to mint ATTN directly to your ledger. Zero floating-point drift. Strict integer precision.
            </p>
          </div>
          <div className="border border-divider bg-panel p-6">
            <div className="text-xs uppercase tracking-wider text-text-secondary mb-3">
              Tiered Multipliers
            </div>
            <p className="text-sm text-text-primary">
              Invite peers to expand your network. Accumulate direct referrals to unlock higher tier status and permanently boost your verification rewards.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center pb-12">
          <Button onClick={() => navigate('/login')} className="w-full md:w-auto min-w-[160px]">
            Sign In
          </Button>
          <Button variant="secondary" onClick={() => navigate('/register')} className="w-full md:w-auto min-w-[160px]">
            Create Account
          </Button>
        </div>
        
        {/* Footer Link */}
        <div className="text-center mt-12 pt-8 border-t border-divider">
          <button 
            onClick={() => navigate('/terms')}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Platform Terms & Fees
          </button>
        </div>
      </div>
    </div>
  );
}
