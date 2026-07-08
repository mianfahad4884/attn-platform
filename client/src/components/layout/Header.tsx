import { Menu } from 'lucide-react';
import { useBalanceStore } from '../../store/balanceStore';
import { useUIStore } from '../../store/uiStore';
import { formatATTNComma } from '../../utils/format';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const balance = useBalanceStore((s) => s.balance);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="sticky top-0 z-30 bg-panel border-b border-divider h-12 flex items-center justify-between px-5">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden text-text-secondary hover:text-text-primary cursor-pointer"
        >
          <Menu size={18} strokeWidth={1.5} />
        </button>
        <h1 className="text-sm font-medium text-text-primary uppercase tracking-wider">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary uppercase tracking-wider">ATTN</span>
        <span className="font-tabular text-sm text-text-primary">
          {formatATTNComma(balance)}
        </span>
      </div>
    </header>
  );
}
