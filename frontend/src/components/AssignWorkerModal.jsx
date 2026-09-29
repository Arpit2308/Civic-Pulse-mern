import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import {
  X,
  Loader2,
  AlertCircle,
  UserCheck,
  Building2,
  PlayCircle,
} from 'lucide-react';

export const AssignWorkerModal = ({ issue, onSuccess, onCancel }) => {
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(
    issue?.assignedWorker?._id || issue?.assignedWorker || ''
  );
  const [comment, setComment] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Success state offering one-click "Mark In Progress"
  const [assignedSuccessData, setAssignedSuccessData] = useState(null);
  const [updatingInProgress, setUpdatingInProgress] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchWorkers = async () => {
      setLoadingWorkers(true);
      try {
        const endpoint =
          !showAllDepartments && issue?.department
            ? `/admin/workers?department=${encodeURIComponent(issue.department)}`
            : '/admin/workers';

        const res = await API.get(endpoint);
        if (!ignore) {
          setWorkers(Array.isArray(res.data) ? res.data : []);
          setLoadingWorkers(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load workers:', err);
          toast.error('Failed to load workers list');
          setLoadingWorkers(false);
        }
      }
    };

    fetchWorkers();
    return () => {
      ignore = true;
    };
  }, [showAllDepartments, issue?.department]);

  const handleAssign = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    if (!selectedWorkerId) {
      setFieldErrors({ workerId: 'Please select a field worker to assign' });
      return;
    }

    setSubmitting(true);

    try {
      const response = await API.patch(`/issues/${issue._id}/assign`, {
        workerId: selectedWorkerId,
        comment: comment.trim() || undefined,
      });

      const updatedIssue = response.data?.issue || response.data;
      toast.success('Worker assigned successfully!');

      // If status is not already In Progress or Resolved, offer one-click "Mark In Progress"
      if (updatedIssue.status === 'Reported') {
        setAssignedSuccessData(updatedIssue);
      } else {
        if (onSuccess) onSuccess(updatedIssue);
      }
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors && typeof respData.errors === 'object') {
        setFieldErrors(respData.errors);
      }
      setGeneralError(
        respData?.message || 'Failed to assign worker. Please try again.'
      );
      toast.error(respData?.message || 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkInProgress = async () => {
    if (!assignedSuccessData) return;
    setUpdatingInProgress(true);

    try {
      const res = await API.put(`/issues/${assignedSuccessData._id}/status`, {
        status: 'In Progress',
        comment: 'Status updated to In Progress following worker assignment',
      });

      toast.success('Issue marked as In Progress!');
      if (onSuccess) {
        onSuccess(res.data?.issue || res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark In Progress');
      if (onSuccess) {
        onSuccess(assignedSuccessData);
      }
    } finally {
      setUpdatingInProgress(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl shadow-black/60 relative">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>Assign Municipal Worker</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {issue?.title}
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

        {/* Post-assignment 1-click In-Progress prompt */}
        {assignedSuccessData ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 text-sm">
              <div className="font-semibold text-amber-300 mb-1 flex items-center gap-2">
                <span>Worker Assigned Successfully</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The worker has been assigned to this issue. The current status is still <strong className="text-slate-100">Reported</strong>. Would you like to transition it to <strong className="text-amber-300">In Progress</strong> now?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => onSuccess && onSuccess(assignedSuccessData)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
              >
                Keep as Reported
              </button>
              <button
                type="button"
                onClick={handleMarkInProgress}
                disabled={updatingInProgress}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-md transition-all"
              >
                {updatingInProgress ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Mark In Progress</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAssign} className="space-y-4">
            {generalError && (
              <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 flex items-start gap-3 text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Department info & toggle */}
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span className="flex items-center gap-1 text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Issue Department: <strong className="text-white">{issue?.department || 'General'}</strong></span>
              </span>
            </div>

            {/* Worker Selector Dropdown */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Select Field Worker *
              </label>

              {loadingWorkers ? (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Loading workers list...</span>
                </div>
              ) : workers.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                  No workers found in this department. Check "Show all departments" below.
                </div>
              ) : (
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-purple-500/70 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                >
                  <option value="">-- Choose Field Worker --</option>
                  {workers.map((w) => (
                    <option key={w._id || w.id} value={w._id || w.id} className="bg-slate-900 text-slate-100">
                      {w.name} ({w.department || 'General'}) {w.phone ? `• ${w.phone}` : ''}
                    </option>
                  ))}
                </select>
              )}

              {fieldErrors.workerId && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.workerId}</p>
              )}
            </div>

            {/* Cross-Department Toggle */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="showAll"
                checked={showAllDepartments}
                onChange={(e) => setShowAllDepartments(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-purple-500/30 cursor-pointer"
              />
              <label htmlFor="showAll" className="text-xs text-slate-300 cursor-pointer select-none">
                Show workers across all departments
              </label>
            </div>

            {/* Optional Assignment Note */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Assignment Note (Optional)
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Assigned to Ward 4 road crew for immediate inspection..."
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-purple-500/70 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
              />
            </div>

            {/* Action Buttons */}
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
                disabled={submitting || loadingWorkers}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-60 transition-all shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Assign Worker</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AssignWorkerModal;
