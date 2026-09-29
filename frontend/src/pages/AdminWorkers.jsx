import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS, USER_ROLE_LABELS } from '../constants';
import CreateWorkerModal from '../components/CreateWorkerModal';
import ManageRoleModal from '../components/ManageRoleModal';
import { CardSkeleton } from '../components/PageLoader';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';
import {
  Users,
  UserPlus,
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  UserCog,
} from 'lucide-react';

export const AdminWorkers = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [managingRoleUser, setManagingRoleUser] = useState(null);

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = departmentFilter
        ? `/admin/workers?department=${encodeURIComponent(departmentFilter)}`
        : '/admin/workers';

      const res = await API.get(endpoint);
      setWorkers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load workers list:', err);
      toast.error('Failed to load workforce directory');
    } finally {
      setLoading(false);
    }
  }, [departmentFilter]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const endpoint = departmentFilter
          ? `/admin/workers?department=${encodeURIComponent(departmentFilter)}`
          : '/admin/workers';

        const res = await API.get(endpoint);
        if (!ignore) {
          setWorkers(Array.isArray(res.data) ? res.data : []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load workers:', err);
          toast.error('Failed to load workforce directory');
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [departmentFilter]);

  const handleWorkerCreated = (newWorker) => {
    setShowCreateModal(false);
    setWorkers((prev) => [newWorker, ...prev]);
    fetchWorkers();
  };

  const handleRoleUpdated = (updatedUser) => {
    setManagingRoleUser(null);
    fetchWorkers();
  };

  // Search filter
  const filteredWorkers = workers.filter((w) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      w.name?.toLowerCase().includes(q) ||
      w.email?.toLowerCase().includes(q) ||
      w.department?.toLowerCase().includes(q) ||
      w.phone?.includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-400" />
              <span>Staff & Field Workforce Directory</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {isSuperAdmin
                ? 'Super Admin master staff directory & role permission manager'
                : `Department view: ${user?.department || 'General'}`}
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Field Worker</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workers by name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-purple-500/70 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <span>Department:</span>
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-purple-500/70 rounded-xl text-xs text-slate-100 focus:outline-none transition-all"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept} className="bg-slate-900 text-slate-100">
                {dept}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setLoading(true);
              fetchWorkers();
            }}
            title="Refresh list"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Workers Grid / Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredWorkers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Field Workers Found"
          description="There are currently no workers registered in this department."
          action={
            isSuperAdmin ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Provision Worker</span>
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkers.map((worker) => (
            <div
              key={worker._id || worker.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur flex flex-col justify-between hover:border-slate-700 transition-all hover:shadow-lg group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-base">
                    {worker.name?.charAt(0)?.toUpperCase() || 'W'}
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60">
                    Field Worker
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                    {worker.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{worker.email}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Dept: <strong className="text-slate-200">{worker.department || 'General'}</strong></span>
                  </div>

                  {worker.phone && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{worker.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Super Admin Manage Role button */}
              {isSuperAdmin && (
                <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-end">
                  <button
                    onClick={() => setManagingRoleUser(worker)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-300 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/60 transition-colors"
                  >
                    <UserCog className="w-3.5 h-3.5" />
                    <span>Change Role</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Super Admin Modals */}
      {showCreateModal && (
        <CreateWorkerModal
          onSuccess={handleWorkerCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {managingRoleUser && (
        <ManageRoleModal
          userItem={managingRoleUser}
          onSuccess={handleRoleUpdated}
          onCancel={() => setManagingRoleUser(null)}
        />
      )}
    </div>
  );
};

export default AdminWorkers;
