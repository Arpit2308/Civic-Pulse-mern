import { Clock, CheckCircle, AlertCircle, RefreshCw, User, Image as ImageIcon } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { getImageUrl } from '../api/axios';

export const StatusTimeline = ({ statusHistory = [], resolutionDetails = null }) => {
  if (!statusHistory || statusHistory.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic py-2">
        No status history recorded yet.
      </div>
    );
  }

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown date';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Render who made the change: handles both string ID and {_id, name, role} object
  const renderChangedBy = (changedBy) => {
    if (!changedBy) return null;
    if (typeof changedBy === 'object') {
      const name = changedBy.name || 'Staff Member';
      const role = changedBy.role ? ` (${changedBy.role.replace('_', ' ')})` : '';
      return `${name}${role}`;
    }
    // If it's just an ID string, show user identifier
    return `User #${changedBy.slice(-6)}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Resolved':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'Rejected':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'In Progress':
      case 'Under Review':
      case 'Escalated':
        return <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {statusHistory.map((item, index) => {
        return (
          <div key={item._id || index} className="relative group">
            {/* Timeline node icon */}
            <div className="absolute -left-6 top-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 border border-slate-700 ring-4 ring-slate-950">
              {getStatusIcon(item.status)}
            </div>

            <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-3.5 hover:border-slate-700 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <StatusBadge status={item.status} size="sm" />
                <span className="text-xs text-slate-500 font-mono">
                  {formatDate(item.changedAt || item.createdAt)}
                </span>
              </div>

              {item.comment && (
                <p className="text-sm text-slate-300 font-normal leading-relaxed mb-2">
                  {item.comment}
                </p>
              )}

              {item.changedBy && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Updated by: <strong className="text-slate-300 font-medium">{renderChangedBy(item.changedBy)}</strong></span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Resolution details highlight if resolved */}
      {resolutionDetails && resolutionDetails.resolvedAt && (
        <div className="relative pt-2">
          <div className="absolute -left-6 top-3.5 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500 ring-4 ring-slate-950">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="bg-emerald-950/20 border border-emerald-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Official Resolution
              </span>
              <span className="text-xs text-emerald-300/70 font-mono">
                {formatDate(resolutionDetails.resolvedAt)}
              </span>
            </div>

            {resolutionDetails.notes && (
              <p className="text-sm text-slate-200 mb-3">
                {resolutionDetails.notes}
              </p>
            )}

            {resolutionDetails.resolvedBy && (
              <p className="text-xs text-slate-400 mb-3">
                Resolved by: <strong className="text-slate-200">{renderChangedBy(resolutionDetails.resolvedBy)}</strong>
              </p>
            )}

            {resolutionDetails.proofImageUrl && (
              <div>
                <span className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> Proof Photo:
                </span>
                <a
                  href={getImageUrl(resolutionDetails.proofImageUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg border border-emerald-700/50 max-w-xs group"
                >
                  <img
                    src={getImageUrl(resolutionDetails.proofImageUrl)}
                    alt="Resolution Proof"
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusTimeline;
