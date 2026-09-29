import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API, { getImageUrl } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import PageLoader from '../components/PageLoader';
import EmptyState from '../components/EmptyState';
import ReportIssueForm from '../components/ReportIssueForm';
import toast from 'react-hot-toast';
import {
  Plus,
  MapPin,
  Calendar,
  ThumbsUp,
  ArrowRight,
  ClipboardList,
  Building2,
} from 'lucide-react';

export const MyIssues = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);

  const fetchMyIssues = async () => {
    try {
      const res = await API.get('/issues/my');
      setIssues(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load my issues:', err);
      toast.error('Failed to load your issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await API.get('/issues/my');
        if (!ignore) {
          setIssues(Array.isArray(res.data) ? res.data : []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load my issues:', err);
          toast.error('Failed to load your issues');
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

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

  const handleIssueCreated = () => {
    setShowReportForm(false);
    setLoading(true);
    fetchMyIssues();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-800/40 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Citizen Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              My Reported Issues
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Track the progress, municipal assignment, and resolution of issues filed by <strong className="text-slate-200">{user?.name}</strong>
            </p>
          </div>

          <button
            onClick={() => setShowReportForm(!showReportForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{showReportForm ? 'Close Form' : 'Report New Issue'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Report Form */}
      {showReportForm && (
        <div className="mb-6">
          <ReportIssueForm
            onSuccess={handleIssueCreated}
            onCancel={() => setShowReportForm(false)}
          />
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <PageLoader message="Loading your reported issues..." />
      ) : issues.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No Issues Reported Yet"
          description="You haven't reported any civic issues yet. Notice a pothole, broken streetlight, or garbage buildup in your area?"
          action={
            <button
              onClick={() => setShowReportForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Report Your First Issue</span>
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing {issues.length} {issues.length === 1 ? 'issue' : 'issues'} reported by you</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {issues.map((issue) => (
              <div
                key={issue._id}
                className="bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 sm:p-6 backdrop-blur flex flex-col justify-between transition-all hover:shadow-xl group"
              >
                <div className="space-y-3">
                  {/* Category & Badges */}
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

                  {/* Department & Location */}
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

                {/* Footer Controls */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatDate(issue.createdAt)}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {issue.upvotes?.length || 0}
                    </span>
                  </div>

                  <Link
                    to={`/issues/${issue._id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>View Timeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyIssues;
