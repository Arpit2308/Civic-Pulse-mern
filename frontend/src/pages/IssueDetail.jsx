import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API, { getImageUrl } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import StatusTimeline from '../components/StatusTimeline';
import PageLoader from '../components/PageLoader';
import EmptyState from '../components/EmptyState';
import ResolveIssueForm from '../components/ResolveIssueForm';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  ThumbsUp,
  Building2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ImageIcon,
} from 'lucide-react';

export const IssueDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upvoting, setUpvoting] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchIssue = async () => {
      try {
        setError(null);
        const res = await API.get(`/issues/${id}`);
        if (!ignore) {
          setIssue(res.data);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Failed to load issue details');
          setLoading(false);
        }
      }
    };

    fetchIssue();
    return () => {
      ignore = true;
    };
  }, [id]);

  const currentUserId = user?.id || user?._id;
  const hasUpvoted =
    isAuthenticated &&
    Boolean(
      issue?.upvotes &&
        (issue.upvotes.includes(currentUserId) ||
          issue.upvotes.some((u) => (typeof u === 'object' ? u._id === currentUserId || u.id === currentUserId : u === currentUserId)))
    );

  const isAssignedWorker = Boolean(
    user &&
      (user.role === 'super_admin' ||
        user.role === 'dept_admin' ||
        (user.role === 'worker' &&
          (issue?.assignedWorker?._id === currentUserId ||
            issue?.assignedWorker === currentUserId ||
            issue?.assignedWorker?._id?.toString() === currentUserId?.toString())))
  );

  const handleUpvote = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to upvote civic issues.');
      navigate('/login', { state: { from: { pathname: `/issues/${id}` } } });
      return;
    }

    if (hasUpvoted) {
      toast('You have already upvoted this issue.', { icon: 'ℹ️' });
      return;
    }

    setUpvoting(true);
    try {
      const res = await API.put(`/issues/${id}/upvote`);
      toast.success('Upvoted successfully!');

      // Optimistically update local issue upvotes array
      setIssue((prev) => {
        if (!prev) return prev;
        const newUpvotes = prev.upvotes ? [...prev.upvotes, currentUserId] : [currentUserId];
        const newUpvoteCount = typeof res.data?.upvotes === 'number' ? res.data.upvotes : newUpvotes.length;
        // Priority auto-escalates to High at 10 upvotes
        const newPriority = newUpvoteCount >= 10 ? 'High' : prev.priority;
        return {
          ...prev,
          upvotes: newUpvotes,
          priority: newPriority,
        };
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit upvote');
    } finally {
      setUpvoting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return <PageLoader message="Loading civic issue details..." />;
  }

  if (error || !issue) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <EmptyState
          icon={AlertTriangle}
          title="Civic Issue Not Found"
          description={error || 'The requested issue could not be found or may have been removed.'}
          action={
            <Link
              to="/issues"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Civic Issues</span>
            </Link>
          }
        />
      </div>
    );
  }

  const upvoteCount = issue.upvotes?.length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <StatusBadge status={issue.status} size="lg" />
          <PriorityBadge priority={issue.priority || 'Medium'} size="lg" />
        </div>
      </div>

      {/* Main Issue Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur">
        {/* Issue Attached Photo Banner */}
        {issue.imageUrl && (
          <div className="relative w-full h-64 sm:h-80 bg-slate-950 border-b border-slate-800 overflow-hidden group">
            <img
              src={getImageUrl(issue.imageUrl)}
              alt={issue.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
            <a
              href={getImageUrl(issue.imageUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 backdrop-blur transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>View Full Photo</span>
            </a>
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Title & Department Meta */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {issue.category}
              </span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Dept: {issue.department || 'General'}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {issue.title}
            </h1>
          </div>

          {/* Description */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Issue Description
            </h3>
            <p className="text-slate-200 text-base leading-relaxed whitespace-pre-line">
              {issue.description}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                  Location / Ward
                </span>
                <span className="text-sm font-medium text-slate-200 block">
                  Pincode: {issue.location?.pincode || issue.pincode || 'N/A'}
                </span>
                {issue.location?.address && (
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {issue.location.address}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                  Reported By
                </span>
                <span className="text-sm font-medium text-slate-200 block">
                  {issue.reportedBy?.name || 'Citizen'}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {formatDate(issue.createdAt)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                  Assigned Worker
                </span>
                <span className="text-sm font-medium text-slate-200 block">
                  {issue.assignedWorker?.name || (
                    <span className="text-slate-500 italic">Unassigned</span>
                  )}
                </span>
                {issue.assignedWorker?.department && (
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {issue.assignedWorker.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Upvote Call-to-Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
                <ThumbsUp className="w-4 h-4" />
                <span>{upvoteCount} {upvoteCount === 1 ? 'Upvote' : 'Upvotes'}</span>
              </div>
              <span className="text-xs text-slate-400">
                {upvoteCount >= 10
                  ? '⚡ Escalated to High Priority by community votes'
                  : `${10 - upvoteCount} more upvotes to escalate priority`}
              </span>
            </div>

            <button
              onClick={handleUpvote}
              disabled={upvoting || hasUpvoted}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md ${
                hasUpvoted
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                  : 'text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 shadow-emerald-600/20'
              } disabled:opacity-75`}
            >
              <ThumbsUp className={`w-4 h-4 ${hasUpvoted ? 'fill-emerald-400' : ''}`} />
              <span>{hasUpvoted ? 'Upvoted' : upvoting ? 'Voting...' : 'Upvote Issue'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline Resolve Form for Assigned Worker or Admins when Issue is NOT resolved */}
      {isAssignedWorker && issue.status !== 'Resolved' && (
        <ResolveIssueForm
          issue={issue}
          inline={true}
          onSuccess={(updated) => {
            setIssue(updated);
          }}
        />
      )}

      {/* Audit History & Resolution Timeline */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Status & Audit History</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Transparent municipal resolution trail and field updates
            </p>
          </div>
        </div>

        <StatusTimeline
          statusHistory={issue.statusHistory || []}
          resolutionDetails={issue.resolutionDetails || null}
        />
      </div>
    </div>
  );
};

export default IssueDetail;
