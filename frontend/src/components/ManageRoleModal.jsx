import { useState } from 'react';
import API from '../api/axios';
import { USER_ROLES, USER_ROLE_LABELS, DEPARTMENTS } from '../constants';
import toast from 'react-hot-toast';
import {
  X,
  Loader2,
  AlertCircle,
  ShieldCheck,
  User,
  Building2,
} from 'lucide-react';

export const ManageRoleModal = ({ userItem, onSuccess, onCancel }) => {
  const [role, setRole] = useState(userItem?.role || USER_ROLES.WORKER);
  const [department, setDepartment] = useState(userItem?.department || DEPARTMENTS[0]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});
    setSubmitting(true);

    try {
      const userId = userItem?._id || userItem?.id;
      const payload = {
        role,
        department: role === 'citizen' ? null : department,
      };

      const response = await API.patch(`/auth/users/${userId}/role`, payload);

      toast.success(response.data?.message || 'User role updated successfully!');
      if (onSuccess) {
        onSuccess(response.data?.user || response.data);
      }
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors && typeof respData.errors === 'object') {
        setFieldErrors(respData.errors);
      }
      setGeneralError(
        respData?.message || 'Failed to update user role. Please try again.'
      );
      toast.error(respData?.message || 'Role update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl shadow-black/60 relative">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Modify User Role & Permissions</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Target: <strong className="text-slate-200">{userItem?.name}</strong> ({userItem?.email})
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {generalError && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 flex items-start gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Assigned Platform Role *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-purple-500/70 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
              >
                <option value={USER_ROLES.CITIZEN}>{USER_ROLE_LABELS.citizen}</option>
                <option value={USER_ROLES.WORKER}>{USER_ROLE_LABELS.worker}</option>
                <option value={USER_ROLES.DEPT_ADMIN}>{USER_ROLE_LABELS.dept_admin}</option>
                <option value={USER_ROLES.SUPER_ADMIN}>{USER_ROLE_LABELS.super_admin}</option>
              </select>
            </div>
            {fieldErrors.role && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.role}</p>
            )}
          </div>

          {(role === USER_ROLES.WORKER || role === USER_ROLES.DEPT_ADMIN) && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Designated Department *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Building2 className="w-4 h-4" />
                </div>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-purple-500/70 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept} className="bg-slate-900 text-slate-100">
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              {fieldErrors.department && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.department}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-60 transition-all shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Role...</span>
                </>
              ) : (
                <span>Save Role Permissions</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageRoleModal;
