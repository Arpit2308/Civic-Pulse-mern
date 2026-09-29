import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { USER_ROLE_LABELS } from '../constants';
import toast from 'react-hot-toast';
import {
  ShieldAlert,
  MapPin,
  ClipboardList,
  FolderOpen,
  Wrench,
  LayoutDashboard,
  Users,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  User,
  Building2,
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
      isActive
        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
      isActive
        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;

  // Role Badge Styling
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      case 'dept_admin':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60';
      case 'worker':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      default:
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link
              to={isAuthenticated ? (user?.role === 'worker' ? '/worker' : user?.role === 'citizen' ? '/issues' : '/admin') : '/issues'}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1">
                  Civic<span className="text-cyan-400">Pulse</span>
                </span>
                <span className="hidden sm:block text-[10px] text-slate-400 font-medium tracking-wider uppercase -mt-1">
                  Municipal Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {/* Common Public / Citizen Link */}
            <NavLink to="/issues" className={navLinkClass}>
              <MapPin className="w-4 h-4" />
              <span>Civic Issues</span>
            </NavLink>

            {/* Authenticated Citizen Links */}
            {isAuthenticated && user?.role === 'citizen' && (
              <>
                <NavLink to="/issues/my" className={navLinkClass}>
                  <FolderOpen className="w-4 h-4" />
                  <span>My Issues</span>
                </NavLink>
                <NavLink to="/complaints" className={navLinkClass}>
                  <ClipboardList className="w-4 h-4" />
                  <span>Consumer Safety</span>
                </NavLink>
              </>
            )}

            {/* Worker Links */}
            {isAuthenticated && user?.role === 'worker' && (
              <NavLink to="/worker" className={navLinkClass}>
                <Wrench className="w-4 h-4" />
                <span>Assigned Tasks</span>
              </NavLink>
            )}

            {/* Dept Admin & Super Admin Links */}
            {isAuthenticated && (user?.role === 'dept_admin' || user?.role === 'super_admin') && (
              <>
                <NavLink to="/admin" end className={navLinkClass}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Admin Hub</span>
                </NavLink>
                <NavLink to="/complaints" className={navLinkClass}>
                  <ClipboardList className="w-4 h-4" />
                  <span>Complaints</span>
                </NavLink>
                <NavLink to="/admin/workers" className={navLinkClass}>
                  <Users className="w-4 h-4" />
                  <span>{user?.role === 'super_admin' ? 'Staff & Workers' : 'Dept Workers'}</span>
                </NavLink>
              </>
            )}
          </nav>

          {/* Right Side: Auth / Profile Controls */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-sm font-semibold text-slate-100 max-w-[140px] truncate">
                      {user?.name}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                        user?.role
                      )}`}
                    >
                      {USER_ROLE_LABELS[user?.role] || user?.role}
                    </span>
                  </div>
                  {user?.department && (
                    <div className="flex items-center justify-end gap-1 text-[11px] text-slate-400">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      <span>{user.department}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4 text-cyan-400" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-sm shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          {isAuthenticated && (
            <div className="p-3 mb-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{user?.name}</div>
                  <div className="text-xs text-slate-400">{user?.email}</div>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                  user?.role
                )}`}
              >
                {USER_ROLE_LABELS[user?.role] || user?.role}
              </span>
            </div>
          )}

          <div className="space-y-1">
            <NavLink
              to="/issues"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              <MapPin className="w-4 h-4" />
              <span>Civic Issues</span>
            </NavLink>

            {isAuthenticated && user?.role === 'citizen' && (
              <>
                <NavLink
                  to="/issues/my"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>My Issues</span>
                </NavLink>
                <NavLink
                  to="/complaints"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Consumer Safety</span>
                </NavLink>
              </>
            )}

            {isAuthenticated && user?.role === 'worker' && (
              <NavLink
                to="/worker"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                <Wrench className="w-4 h-4" />
                <span>Assigned Tasks</span>
              </NavLink>
            )}

            {isAuthenticated && (user?.role === 'dept_admin' || user?.role === 'super_admin') && (
              <>
                <NavLink
                  to="/admin"
                  end
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Admin Hub</span>
                </NavLink>
                <NavLink
                  to="/complaints"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Complaints</span>
                </NavLink>
                <NavLink
                  to="/admin/workers"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  <Users className="w-4 h-4" />
                  <span>{user?.role === 'super_admin' ? 'Staff & Workers' : 'Dept Workers'}</span>
                </NavLink>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 bg-red-950/30 border border-red-900/50 hover:bg-red-950/50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-500"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;