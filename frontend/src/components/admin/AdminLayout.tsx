import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  LayoutDashboard,
  Megaphone,
  Ticket,
  Users,
  ScanLine,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/admin/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/campaigns',    icon: Megaphone,        label: 'Campaigns' },
  { to: '/admin/coupons',      icon: Ticket,           label: 'Coupons' },
  { to: '/admin/participants', icon: Users,             label: 'Participants' },
  { to: '/admin/verify',       icon: ScanLine,         label: 'Verify & Redeem' },
  { to: '/admin/settings',     icon: Settings,         label: 'Settings' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { admin, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/admin/login', { replace: true });
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`${
        mobile ? 'flex lg:hidden' : 'hidden lg:flex'
      } flex-col h-full bg-primary-950/90 backdrop-blur-xl border-r border-white/5`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-display font-bold text-sm leading-none">DBL Admin</p>
          <p className="text-primary-500 text-xs mt-0.5">Campaign Engine</p>
        </div>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-white/40 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-primary-700/50 text-white shadow-sm'
                  : 'text-primary-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-primary-300' : 'text-primary-500 group-hover:text-primary-300'}`} />
                {label}
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
            {admin?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{admin?.name}</p>
            <p className="text-primary-500 text-xs truncate capitalize">{admin?.role}</p>
          </div>
        </div>
        <button
          id="btn-logout"
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 text-primary-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl text-sm transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh bg-primary-950 text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="w-60 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 z-10">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-4 border-b border-white/5 bg-primary-950/80 backdrop-blur-sm">
          <button
            id="btn-mobile-menu"
            onClick={() => setSidebarOpen(true)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary-400" />
            <span className="text-white font-semibold text-sm">DBL Admin</span>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
