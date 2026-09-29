import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { ROLE_REDIRECT_MAP } from '../constants';
import toast from 'react-hot-toast';
import { ShieldAlert, Mail, Lock, LogIn, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick Demo Accounts to facilitate prompt testing
  const demoAccounts = [
    { label: 'Citizen', email: 'citizen1@civicpulse.com', role: 'citizen' },
    { label: 'Field Worker', email: 'worker.roads@civicpulse.com', role: 'worker' },
    { label: 'Dept Admin', email: 'deptadmin@civicpulse.com', role: 'dept_admin' },
    { label: 'Super Admin', email: 'admin@civicpulse.com', role: 'super_admin' },
  ];

  const fillDemo = (acc) => {
    setFormData({
      email: acc.email,
      password: 'Test@1234',
    });
    setFieldErrors({});
    setGeneralError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear specific field error when typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setGeneralError('');

    // Basic client validation
    const errors = {};
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }

    try {
      const response = await API.post('/auth/login', {
        email: formData.email.trim(),
        password: formData.password,
      });

      if (response.data?.token && response.data?.user) {
        const { token, user } = response.data;
        login(token, user);
        toast.success(`Welcome back, ${user.name}!`);

        // Check if there was a previous redirect destination
        const from = location.state?.from?.pathname;
        if (from && from !== '/login' && from !== '/register' && from !== '/unauthorized') {
          navigate(from, { replace: true });
        } else {
          const defaultRedirect = ROLE_REDIRECT_MAP[user.role] || '/issues';
          navigate(defaultRedirect, { replace: true });
        }
      }
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors && typeof respData.errors === 'object') {
        setFieldErrors(respData.errors);
      }
      setGeneralError(
        respData?.message || 'Failed to sign in. Please check your credentials.'
      );
      toast.error(respData?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-xl shadow-cyan-500/20 mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sign in to <span className="text-cyan-400">CivicPulse</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Access municipal civic issue tracking & consumer protection
          </p>
        </div>

        {/* Quick Demo Credentials Toolbar */}
        <div className="mb-6 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quick Demo Role Fill:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => fillDemo(acc)}
                className="px-2 py-1.5 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors truncate text-center"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          {generalError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 flex items-start gap-3 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all ${
                    fieldErrors.email
                      ? 'border-red-500/80 focus:border-red-500'
                      : 'border-slate-800 focus:border-cyan-500/70'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all ${
                    fieldErrors.password
                      ? 'border-red-500/80 focus:border-red-500'
                      : 'border-slate-800 focus:border-cyan-500/70'
                  }`}
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none shadow-lg shadow-cyan-600/20 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Register as a Citizen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;