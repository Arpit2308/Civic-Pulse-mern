import { useNavigate } from 'react-router-dom';
import { ShieldX, Home, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_REDIRECT_MAP, USER_ROLE_LABELS } from '../constants';

export const Unauthorized = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (!isAuthenticated || !user) {
      navigate('/login');
    } else {
      const homePath = ROLE_REDIRECT_MAP[user.role] || '/issues';
      navigate(homePath);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-slate-900/60 border border-slate-800 rounded-2xl p-8 backdrop-blur shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5 text-red-400">
          <ShieldX className="w-8 h-8" />
        </div>

        <span className="text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-950/60 border border-red-800/60 px-2.5 py-1 rounded-full">
          403 Access Forbidden
        </span>

        <h1 className="text-2xl font-bold text-white mt-4 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          You don't have permission to view this page with your current role{' '}
          {user?.role && (
            <span className="font-semibold text-slate-200">
              ({USER_ROLE_LABELS[user.role] || user.role})
            </span>
          )}
          . Please navigate back to your authorized dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleGoHome}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </button>

          {isAuthenticated && (
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Switch Account</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
