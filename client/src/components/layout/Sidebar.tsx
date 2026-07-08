import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  Users,
  ArrowDownToLine,
  Settings,
  Terminal,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { truncateEmail } from '../../utils/format';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/verify', label: 'Verify', icon: Shield },
  { to: '/referrals', label: 'Referrals', icon: Users },
  { to: '/withdraw', label: 'Withdraw', icon: ArrowDownToLine },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { user, isAdmin, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
      isActive
        ? 'text-accent border-l-2 border-accent -ml-[1px]'
        : 'text-text-secondary hover:text-text-primary'
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-56 bg-panel border-r border-divider flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-divider">
          <span className="font-tabular text-accent tracking-widest text-sm font-semibold">
            ATTN
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClasses}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={16} strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="mx-4 my-3 border-t border-divider" />
              <NavLink
                to="/admin/terminal"
                className={linkClasses}
                onClick={() => setSidebarOpen(false)}
              >
                <Terminal size={16} strokeWidth={1.5} />
                <span>Admin Terminal</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-divider px-4 py-3">
          <div className="text-xs text-text-secondary truncate mb-2">
            {user ? truncateEmail(user.email) : '—'}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <LogOut size={14} strokeWidth={1.5} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
