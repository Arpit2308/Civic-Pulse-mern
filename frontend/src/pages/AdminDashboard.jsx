import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  DEPARTMENTS,
  ISSUE_CATEGORIES,
  ISSUE_STATUS_LIST,
  PRIORITY_LIST,
  USER_ROLE_LABELS,
} from '../constants';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { CardSkeleton } from '../components/PageLoader';
import EmptyState from '../components/EmptyState';
import UpdateStatusModal from '../components/UpdateStatusModal';
import AssignWorkerModal from '../components/AssignWorkerModal';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Search,
  RotateCcw,
  UserCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();

  // Platform KPIs and analytics state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Issues table state & filters
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loadingIssues, setLoadingIssues] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [department, setDepartment] = useState(
    user?.role === 'dept_admin' && user?.department ? user.department : ''
  );
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Modal states
  const [updatingStatusIssue, setUpdatingStatusIssue] = useState(null);
  const [assigningWorkerIssue, setAssigningWorkerIssue] = useState(null);

  // Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Issues with filters & pagination
  const fetchIssues = useCallback(async () => {
    try {
      setLoadingIssues(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);

      if (search.trim()) params.append('search', search.trim());
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (department) params.append('department', department);

      const res = await API.get(`/issues?${params.toString()}`);

      if (res.data?.data && res.data?.pagination) {
        let fetchedData = res.data.data;
        if (unassignedOnly) {
          fetchedData = fetchedData.filter((i) => !i.assignedWorker);
        }
        setIssues(fetchedData);
        setPagination(res.data.pagination);
      } else if (Array.isArray(res.data)) {
        let fetchedData = res.data;
        if (unassignedOnly) {
          fetchedData = fetchedData.filter((i) => !i.assignedWorker);
        }
        setIssues(fetchedData);
        setPagination({
          page: 1,
          limit: fetchedData.length,
          total: fetchedData.length,
          totalPages: 1,
        });
      }
    } catch (err) {
      console.error('Failed to load issues table:', err);
      toast.error('Failed to load civic issues');
    } finally {
      setLoadingIssues(false);
    }
  }, [page, search, category, status, priority, department, unassignedOnly]);

  useEffect(() => {
    let ignore = false;
    const loadStats = async () => {
      try {
        const res = await API.get('/admin/stats');
        if (!ignore) {
          setStats(res.data);
          setLoadingStats(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load admin stats:', err);
          setLoadingStats(false);
        }
      }
    };

    loadStats();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadIssues = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', 10);

        if (search.trim()) params.append('search', search.trim());
        if (category) params.append('category', category);
        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);
        if (department) params.append('department', department);

        const res = await API.get(`/issues?${params.toString()}`);
        if (!ignore) {
          if (res.data?.data && res.data?.pagination) {
            let fetchedData = res.data.data;
            if (unassignedOnly) {
              fetchedData = fetchedData.filter((i) => !i.assignedWorker);
            }
            setIssues(fetchedData);
            setPagination(res.data.pagination);
          } else if (Array.isArray(res.data)) {
            let fetchedData = res.data;
            if (unassignedOnly) {
              fetchedData = fetchedData.filter((i) => !i.assignedWorker);
            }
            setIssues(fetchedData);
            setPagination({
              page: 1,
              limit: fetchedData.length,
              total: fetchedData.length,
              totalPages: 1,
            });
          }
          setLoadingIssues(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load issues:', err);
          setLoadingIssues(false);
        }
      }
    };

    loadIssues();
    return () => {
      ignore = true;
    };
  }, [page, search, category, status, priority, department, unassignedOnly]);

  const handleFilterChange = (setter, val) => {
    setter(val);
    setPage(1);
    setLoadingIssues(true);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setPriority('');
    setDepartment(user?.role === 'dept_admin' && user?.department ? user.department : '');
    setUnassignedOnly(false);
    setPage(1);
    setLoadingIssues(true);
  };

  const handleStatusUpdated = (updated) => {
    setUpdatingStatusIssue(null);
    setIssues((prev) =>
      prev.map((iss) => (iss._id === updated._id ? { ...iss, ...updated } : iss))
    );
    fetchStats();
  };

  const handleWorkerAssigned = (updated) => {
    setAssigningWorkerIssue(null);
    setIssues((prev) =>
      prev.map((iss) => (iss._id === updated._id ? { ...iss, ...updated } : iss))
    );
    fetchStats();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  // Status Chart Data Preparation
  const statusChartData = (stats?.byStatus || []).map((item) => ({
    name: item._id,
    count: item.count,
  }));

  // Category Chart Data Preparation
  const categoryChartData = (stats?.byCategory || []).map((item) => ({
    name: item._id.length > 14 ? `${item._id.substring(0, 12)}...` : item._id,
    fullName: item._id,
    count: item.count,
  }));

  const getBarColor = (name) => {
    switch (name) {
      case 'Reported':
        return '#64748b';
      case 'In Progress':
        return '#f59e0b';
      case 'Resolved':
        return '#10b981';
      case 'Rejected':
        return '#ef4444';
      default:
        return '#06b6d4';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/40 rounded-2xl p-6 sm:p-7 backdrop-blur shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2.5">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{USER_ROLE_LABELS[user?.role] || 'Administrator'} Command Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Municipal Administration Overview
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Logged in as: <strong className="text-slate-200">{user?.name}</strong> • Scope:{' '}
              <strong className="text-purple-300">
                {user?.department || 'All Municipal Departments'}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              to="/admin/workers"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/20 transition-all"
            >
              <Users className="w-4 h-4" />
              <span>{user?.role === 'super_admin' ? 'Manage Staff & Roles' : 'Dept Workers'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Total Issues
          </span>
          <div className="text-2xl font-black text-white">
            {loadingStats ? '-' : stats?.totalIssues ?? 0}
          </div>
          <span className="text-[10px] text-slate-500">Platform Lifetime</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400 block mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Unassigned</span>
          </span>
          <div className="text-2xl font-black text-red-400">
            {loadingStats ? '-' : stats?.unassignedCount ?? 0}
          </div>
          <span className="text-[10px] text-slate-500">Needs Crew Dispatch</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>In Progress</span>
          </span>
          <div className="text-2xl font-black text-amber-400">
            {loadingStats
              ? '-'
              : stats?.byStatus?.find((s) => s._id === 'In Progress')?.count ?? 0}
          </div>
          <span className="text-[10px] text-slate-500">Field Active</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Resolved</span>
          </span>
          <div className="text-2xl font-black text-emerald-400">
            {loadingStats
              ? '-'
              : stats?.byStatus?.find((s) => s._id === 'Resolved')?.count ?? 0}
          </div>
          <span className="text-[10px] text-slate-500">With Verified Proof</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 block mb-1 flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Field Staff</span>
          </span>
          <div className="text-2xl font-black text-purple-300">
            {loadingStats ? '-' : stats?.totalWorkers ?? 0}
          </div>
          <span className="text-[10px] text-slate-500">Active Workers</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 block mb-1">
            Avg Resolution
          </span>
          <div className="text-2xl font-black text-cyan-400">
            {loadingStats ? '-' : `${stats?.avgResolutionHours ?? 0}h`}
          </div>
          <span className="text-[10px] text-slate-500">Turnaround Speed</span>
        </div>
      </div>

      {/* Visual Analytics Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status Distribution Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>Issues Distribution by Status</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Live workload breakdown across stages</p>

          <div className="h-56 w-full">
            {statusChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No status data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-purple-400" />
            <span>Issues Breakdown by Category</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Volume of reports across municipal domains</p>

          <div className="h-56 w-full">
            {categoryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No category data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Main Issue Management Table Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              <span>Civic Issues Triage & Assignment</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage status, assign field workers, and track municipal issues
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFilterChange(setUnassignedOnly, !unassignedOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                unassignedOnly
                  ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Unassigned Only</span>
            </button>

            <button
              onClick={() => {
                setLoadingIssues(true);
                fetchIssues();
              }}
              title="Refresh issues"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div className="lg:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              placeholder="Search keyword..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
            />
          </div>

          <div>
            <select
              value={category}
              onChange={(e) => handleFilterChange(setCategory, e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-xs text-slate-100 focus:outline-none transition-all"
            >
              <option value="">All Categories</option>
              {ISSUE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-slate-100">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-xs text-slate-100 focus:outline-none transition-all"
            >
              <option value="">All Statuses</option>
              {ISSUE_STATUS_LIST.map((st) => (
                <option key={st} value={st} className="bg-slate-900 text-slate-100">
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={priority}
              onChange={(e) => handleFilterChange(setPriority, e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-xs text-slate-100 focus:outline-none transition-all"
            >
              <option value="">All Priorities</option>
              {PRIORITY_LIST.map((pr) => (
                <option key={pr} value={pr} className="bg-slate-900 text-slate-100">
                  {pr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={department}
              onChange={(e) => handleFilterChange(setDepartment, e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-xs text-slate-100 focus:outline-none transition-all"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept} className="bg-slate-900 text-slate-100">
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Container */}
        {loadingIssues ? (
          <div className="space-y-3 py-4">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No Civic Issues Found"
            description="No issues match the selected filter criteria."
            action={
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Title & Domain</th>
                  <th className="px-4 py-3">Pincode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Assigned Crew</th>
                  <th className="px-4 py-3">Reported</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                {issues.map((issue) => (
                  <tr key={issue._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-100 text-sm max-w-xs truncate">
                        {issue.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className="text-cyan-400">{issue.category}</span>
                        <span>•</span>
                        <span>{issue.department || 'General'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      {issue.location?.pincode || issue.pincode || 'N/A'}
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge status={issue.status} size="sm" />
                    </td>

                    <td className="px-4 py-3.5">
                      <PriorityBadge priority={issue.priority || 'Medium'} size="sm" />
                    </td>

                    <td className="px-4 py-3.5">
                      {issue.assignedWorker ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-medium text-slate-200 truncate max-w-[120px]">
                            {issue.assignedWorker.name}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/60 text-red-300 border border-red-800/60">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {formatDate(issue.createdAt)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => setAssigningWorkerIssue(issue)}
                          title="Assign Field Worker"
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-purple-300 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/60 transition-colors"
                        >
                          Assign
                        </button>

                        <button
                          onClick={() => setUpdatingStatusIssue(issue)}
                          title="Update Status / Priority"
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/60 transition-colors"
                        >
                          Status
                        </button>

                        <Link
                          to={`/issues/${issue._id}`}
                          title="View Full Details"
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
            <span>
              Showing {issues.length} of {pagination.total} records
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || loadingIssues}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-2 font-mono">
                {pagination.page} / {pagination.totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages || loadingIssues}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {updatingStatusIssue && (
        <UpdateStatusModal
          issue={updatingStatusIssue}
          onSuccess={handleStatusUpdated}
          onCancel={() => setUpdatingStatusIssue(null)}
        />
      )}

      {assigningWorkerIssue && (
        <AssignWorkerModal
          issue={assigningWorkerIssue}
          onSuccess={handleWorkerAssigned}
          onCancel={() => setAssigningWorkerIssue(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
