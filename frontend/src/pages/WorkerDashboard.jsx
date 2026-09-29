import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import API, { getImageUrl } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { CardSkeleton } from '../components/PageLoader';
import EmptyState from '../components/EmptyState';
import ResolveIssueForm from '../components/ResolveIssueForm';
import toast from 'react-hot-toast';
import {
  Wrench,
  MapPin,
  Calendar,
  Building2,
  ArrowRight,
  CheckCircle2,
  Clock,
  Check,
  ImageIcon,
  RefreshCw,
} from 'lucide-react';

export const WorkerDashboard = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'resolved' | 'all'
  const [resolvingIssue, setResolvingIssue] = useState(null);

  const fetchAssignedIssues = useCallback(async () => {
    try {
      const res = await API.get('/issues/assigned');
      setIssues(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load assigned issues:', err);
      toast.error('Failed to load assigned work orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await API.get('/issues/assigned');
        if (!ignore) {
          setIssues(Array.isArray(res.data) ? res.data : []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load assigned issues:', err);
          toast.error('Failed to load assigned work orders');
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleResolveSuccess = (updatedIssue) => {
    setResolvingIssue(null);
    // Update issue state locally
    setIssues((prev) =>
      prev.map((iss) => (iss._id === updatedIssue._id ? updatedIssue : iss))
    );
    // Also re-fetch to ensure fresh data
    fetchAssignedIssues();
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

  // Filter issues according to active tab
  const filteredIssues = issues.filter((iss) => {
    if (activeTab === 'pending') return iss.status !== 'Resolved';
    if (activeTab === 'resolved') return iss.status === 'Resolved';
    return true;
  });

  const pendingCount = issues.filter((i) => i.status !== 'Resolved').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Mobile-First Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-800/40 rounded-2xl p-5 sm:p-7 backdrop-blur shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2.5">
              <Wrench className="w-3.5 h-3.5" />
              <span>Field Worker Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Assigned Work Orders
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 flex flex-wrap items-center gap-2">
              <span>Field Agent: <strong className="text-slate-200">{user?.name}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{user?.department || 'General Services'}</span>
              </span>
            </p>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              fetchAssignedIssues();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Refresh Tasks</span>
          </button>
        </div>
      </div>

      {/* Tab Controls Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'pending'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Actions ({pendingCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('resolved')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'resolved'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed ({resolvedCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'all'
              ? 'bg-slate-800 text-slate-200 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <span>All Assigned ({issues.length})</span>
        </button>
      </div>

      {/* Issues Grid / Mobile-First Work Order Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredIssues.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={
            activeTab === 'pending'
              ? 'No Pending Work Orders'
              : activeTab === 'resolved'
              ? 'No Completed Tasks Yet'
              : 'No Work Orders Assigned'
          }
          description={
            activeTab === 'pending'
              ? 'Great job! You have completed all assigned civic issues.'
              : 'There are currently no tasks matching this filter.'
          }
          action={
            <Link
              to="/issues"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <span>Explore Public Issues Feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredIssues.map((issue) => {
            const isResolved = issue.status === 'Resolved';

            return (
              <div
                key={issue._id}
                className={`bg-slate-900/80 border rounded-2xl p-5 backdrop-blur flex flex-col justify-between transition-all hover:shadow-xl ${
                  isResolved ? 'border-emerald-900/40 bg-slate-900/50' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3.5">
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
                  <div className="flex items-start gap-3">
                    {issue.imageUrl && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                        <img
                          src={getImageUrl(issue.imageUrl)}
                          alt={issue.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/issues/${issue._id}`}
                        className="text-base font-bold text-white hover:text-cyan-400 transition-colors line-clamp-2"
                      >
                        {issue.title}
                      </Link>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {issue.description}
                      </p>
                    </div>
                  </div>

                  {/* Location & Reported Info */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">
                        Pincode: <strong>{issue.location?.pincode || issue.pincode || 'N/A'}</strong>
                        {issue.location?.address ? ` • ${issue.location.address}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-900">
                      <span>Reported by: {issue.reportedBy?.name || 'Citizen'}</span>
                      <span className="font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(issue.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* If Resolved: Resolution snippet */}
                  {isResolved && issue.resolutionDetails && (
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolution Verified</span>
                        </span>
                        <span className="text-[10px] text-emerald-300/70 font-mono">
                          {formatDate(issue.resolutionDetails.resolvedAt)}
                        </span>
                      </div>
                      {issue.resolutionDetails.notes && (
                        <p className="text-slate-300 line-clamp-2 italic">
                          "{issue.resolutionDetails.notes}"
                        </p>
                      )}
                      {issue.resolutionDetails.proofImageUrl && (
                        <a
                          href={getImageUrl(issue.resolutionDetails.proofImageUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 hover:underline"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>View Proof Photo</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Footers */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <Link
                    to={`/issues/${issue._id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <span>View Full Issue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {!isResolved && (
                    <button
                      onClick={() => setResolvingIssue(issue)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 shadow-md shadow-emerald-600/20 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolve Issue</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve Issue Modal */}
      {resolvingIssue && (
        <ResolveIssueForm
          issue={resolvingIssue}
          onSuccess={handleResolveSuccess}
          onCancel={() => setResolvingIssue(null)}
        />
      )}
    </div>
  );
};

export default WorkerDashboard;
