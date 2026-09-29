import { useState } from 'react';
import API from '../api/axios';
import { ISSUE_STATUS_LIST, PRIORITY_LIST } from '../constants';
import toast from 'react-hot-toast';
import { X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export const UpdateStatusModal = ({ issue, onSuccess, onCancel }) => {
  const [status, setStatus] = useState(issue?.status || 'Reported');
  const [priority, setPriority] = useState(issue?.priority || 'Medium');
  const [comment, setComment] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});
    setSubmitting(true);

    try {
      const response = await API.put(`/issues/${issue._id}/status`, {
        status,
        priority,
        comment: comment.trim() || `Status updated to ${status} and priority to ${priority}`,
      });

      toast.success('Issue status and priority updated!');
      if (onSuccess) {
        onSuccess(response.data?.issue || response.data);
      }
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors && typeof respData.errors === 'object') {
        setFieldErrors(respData.errors);
      }
      setGeneralError(
        respData?.message || 'Failed to update issue status. Please try again.'
      );
      toast.error(respData?.message || 'Update failed');
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
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <span>Update Status & Priority</span>
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

        {generalError && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 flex items-start gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                New Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
              >
                {ISSUE_STATUS_LIST.map((st) => (
                  <option key={st} value={st} className="bg-slate-900 text-slate-100">
                    {st}
                  </option>
                ))}
              </select>
              {fieldErrors.status && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.status}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
              >
                {PRIORITY_LIST.map((pr) => (
                  <option key={pr} value={pr} className="bg-slate-900 text-slate-100">
                    {pr}
                  </option>
                ))}
              </select>
              {fieldErrors.priority && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.priority}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Audit Note / Triage Comment (Optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Dispatched inspection team to verify water pressure drop..."
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
            />
            {fieldErrors.comment && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.comment}</p>
            )}
          </div>

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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-60 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateStatusModal;
