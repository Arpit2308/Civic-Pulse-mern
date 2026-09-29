import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API, { getImageUrl } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  ISSUE_CATEGORIES,
  ISSUE_STATUS_LIST,
  PRIORITY_LIST,
} from '../constants';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { CardSkeleton } from '../components/PageLoader';
import EmptyState from '../components/EmptyState';
import ReportIssueForm from '../components/ReportIssueForm';
import toast from 'react-hot-toast';
import {
  Search,
  Filter,
  Plus,
  ThumbsUp,
  MapPin,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  LogIn,
} from 'lucide-react';

export const CivicIssues = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Issues and pagination states
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [pincode, setPincode] = useState('');
  const [page, setPage] = useState(1);

  // UI toggle for Report Form
  const [showReportForm, setShowReportForm] = useState(false);

  // Fetch issues with pagination and filters
  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 8);

      if (search.trim()) params.append('search', search.trim());
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (pincode.trim()) params.append('pincode', pincode.trim());

      const res = await API.get(`/issues?${params.toString()}`);

      if (res.data?.data && res.data?.pagination) {
        setIssues(res.data.data);
        setPagination(res.data.pagination);
      } else if (Array.isArray(res.data)) {
        // Fallback for non-paginated array
        setIssues(res.data);
        setPagination({
          page: 1,
          limit: res.data.length,
          total: res.data.length,
          totalPages: 1,
        });
      }
    } catch (err) {
      console.error('Error fetching civic issues:', err);
      toast.error('Failed to load civic issues');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status, priority, pincode]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', 8);

        if (search.trim()) params.append('search', search.trim());
        if (category) params.append('category', category);
        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);
        if (pincode.trim()) params.append('pincode', pincode.trim());

        const res = await API.get(`/issues?${params.toString()}`);
        if (!ignore) {
          if (res.data?.data && res.data?.pagination) {
            setIssues(res.data.data);
            setPagination(res.data.pagination);
          } else if (Array.isArray(res.data)) {
            setIssues(res.data);
            setPagination({
              page: 1,
              limit: res.data.length,
              total: res.data.length,
              totalPages: 1,
            });
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching civic issues:', err);
          toast.error('Failed to load civic issues');
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [page, search, category, status, priority, pincode]);

  // Reset page to 1 whenever filters change
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
    setLoading(true);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setPriority('');
    setPincode('');
    setPage(1);
    setLoading(true);
  };

  const hasActiveFilters = Boolean(
    search || category || status || priority || pincode
  );

  const currentUserId = user?.id || user?._id;

  const handleUpvote = async (issueId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please sign in to upvote civic issues.');
      navigate('/login', { state: { from: { pathname: '/issues' } } });
      return;
    }

    try {
      const res = await API.put(`/issues/${issueId}/upvote`);
      toast.success('Issue upvoted!');

      // Update state locally
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss._id === issueId) {
            const newUpvotes = iss.upvotes ? [...iss.upvotes, currentUserId] : [currentUserId];
            const newUpvoteCount = typeof res.data?.upvotes === 'number' ? res.data.upvotes : newUpvotes.length;
            const newPriority = newUpvoteCount >= 10 ? 'High' : iss.priority;
            return { ...iss, upvotes: newUpvotes, priority: newPriority };
          }
          return iss;
        })
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upvote');
    }
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero / Header Section */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-slate-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Community Civic Pulse</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Civic Issues Portal
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl">
              Browse, search, and upvote municipal problem reports in your area. Every issue is tracked live through to field resolution.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {isAuthenticated ? (
              <button
                onClick={() => setShowReportForm(!showReportForm)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{showReportForm ? 'Close Form' : 'Report Civic Issue'}</span>
              </button>
            ) : (
              <Link
                to="/login"
                state={{ from: { pathname: '/issues' } }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                <span>Sign in to Report</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Report Form */}
      {showReportForm && (
        <div className="mb-6">
          <ReportIssueForm
            onSuccess={() => {
              setShowReportForm(false);
              setPage(1);
              fetchIssues();
            }}
            onCancel={() => setShowReportForm(false)}
          />
        </div>
      )}

      {/* Search & Comprehensive Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 backdrop-blur space-y-4">
        {/* Search & Pincode Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              placeholder="Search issues by title or description keyword..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              type="text"
              maxLength={6}
              value={pincode}
              onChange={(e) => handleFilterChange(setPincode, e.target.value)}
              placeholder="Filter by Pincode..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
            />
          </div>
        </div>

        {/* Dropdowns Row: Category, Status, Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => handleFilterChange(setCategory, e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
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
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
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
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => handleFilterChange(setPriority, e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
            >
              <option value="">All Priorities</option>
              {PRIORITY_LIST.map((pr) => (
                <option key={pr} value={pr} className="bg-slate-900 text-slate-100">
                  {pr}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reset Filters</span>
              </button>
            ) : (
              <div className="w-full flex items-center justify-center gap-1 text-xs text-slate-500 py-2">
                <Filter className="w-3.5 h-3.5" />
                <span>Filters Active</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Issues Grid Header */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span>
          Showing {issues.length} of {pagination.total} total reports
        </span>
        {pagination.totalPages > 1 && (
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
        )}
      </div>

      {/* Issues Content / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No Civic Issues Match Your Search"
          description={
            hasActiveFilters
              ? 'No issues match the selected filter criteria. Try broadening your search or resetting filters.'
              : 'No civic issues have been reported yet in this area.'
          }
          action={
            hasActiveFilters ? (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear All Filters</span>
              </button>
            ) : isAuthenticated ? (
              <button
                onClick={() => setShowReportForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Report the First Issue</span>
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {issues.map((issue) => {
            const hasUserUpvoted =
              isAuthenticated &&
              Boolean(
                issue.upvotes &&
                  (issue.upvotes.includes(currentUserId) ||
                    issue.upvotes.some((u) => (typeof u === 'object' ? u._id === currentUserId || u.id === currentUserId : u === currentUserId)))
              );

            return (
              <div
                key={issue._id}
                className="bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 sm:p-6 backdrop-blur flex flex-col justify-between transition-all hover:shadow-xl group"
              >
                <div className="space-y-3">
                  {/* Category & Status Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      {issue.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <PriorityBadge priority={issue.priority || 'Medium'} size="sm" />
                      <StatusBadge status={issue.status} size="sm" />
                    </div>
                  </div>

                  {/* Thumbnail & Title */}
                  <div className="flex items-start gap-3.5">
                    {issue.imageUrl && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                        <img
                          src={getImageUrl(issue.imageUrl)}
                          alt={issue.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/issues/${issue._id}`}
                        className="text-base font-bold text-white hover:text-cyan-400 transition-colors line-clamp-1"
                      >
                        {issue.title}
                      </Link>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {issue.description}
                      </p>
                    </div>
                  </div>

                  {/* Meta: Location, Department */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Pincode: {issue.location?.pincode || issue.pincode || 'N/A'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{issue.department || 'General'}</span>
                    </span>
                  </div>
                </div>

                {/* Footer Controls & Upvoting */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatDate(issue.createdAt)}
                    </span>
                    <span className="hidden sm:inline text-slate-600">•</span>
                    <span className="hidden sm:inline text-slate-400 truncate max-w-[100px]">
                      By {issue.reportedBy?.name || 'Citizen'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleUpvote(issue._id, e)}
                      disabled={hasUserUpvoted}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        hasUserUpvoted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:scale-95'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasUserUpvoted ? 'fill-emerald-400' : ''}`} />
                      <span>{issue.upvotes?.length || 0}</span>
                    </button>

                    <Link
                      to={`/issues/${issue._id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-800/40 transition-colors"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pagination.page <= 1 || loading}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none border border-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-medium text-slate-400 px-2">
            Page <strong className="text-slate-200">{pagination.page}</strong> of{' '}
            <strong className="text-slate-200">{pagination.totalPages}</strong>
          </span>

          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none border border-slate-800 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CivicIssues;