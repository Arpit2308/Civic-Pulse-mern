import { useState, useRef } from 'react';
import API from '../api/axios';
import { MAX_UPLOAD_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '../constants';
import toast from 'react-hot-toast';
import {
  UploadCloud,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Check,
  Camera,
} from 'lucide-react';

export const ResolveIssueForm = ({ issue, onSuccess, onCancel, inline = false }) => {
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        proofImage: 'Only JPG, PNG, and WEBP image formats are supported.',
      }));
      return;
    }

    // Validate image size (max 5MB)
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setFieldErrors((prev) => ({
        ...prev,
        proofImage: 'Proof image must be smaller than 5MB.',
      }));
      return;
    }

    setFieldErrors((prev) => ({ ...prev, proofImage: '' }));
    setProofImage(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const removeImage = () => {
    setProofImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    // Mandatory Proof Image validation
    if (!proofImage) {
      setFieldErrors({
        proofImage: 'A resolution proof photo is required to resolve this issue.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('proofImage', proofImage);
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      const issueId = issue?._id || issue?.id || issue;
      const response = await API.put(`/issues/${issueId}/resolve`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Issue marked as Resolved with proof photo!');

      // Reset form
      setNotes('');
      removeImage();

      if (onSuccess) {
        onSuccess(response.data?.issue || response.data);
      }
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors && typeof respData.errors === 'object') {
        setFieldErrors(respData.errors);
      }
      setGeneralError(
        respData?.message || 'Failed to submit resolution. Please check the proof image.'
      );
      toast.error(respData?.message || 'Failed to resolve issue');
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {generalError && (
        <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 flex items-start gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Mandatory Proof Photo Upload */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Resolution Proof Photo * (Required)</span>
          </span>
          <span className="text-[11px] text-slate-400 lowercase font-normal">
            JPEG, PNG, or WEBP &le; 5MB
          </span>
        </label>

        {!imagePreview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all group ${
              fieldErrors.proofImage
                ? 'border-red-500/80 bg-red-950/10'
                : 'border-slate-800 hover:border-emerald-500/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Click to select field completion photo
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mandatory proof demonstrating the problem has been repaired
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative rounded-xl border border-emerald-700/60 bg-slate-950 p-3 flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-slate-800">
              <img
                src={imagePreview}
                alt="Proof Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Proof photo ready</span>
              </div>
              <p className="text-xs text-slate-300 truncate font-mono">
                {proofImage?.name}
              </p>
              <p className="text-[11px] text-slate-500">
                {proofImage ? `${(proofImage.size / (1024 * 1024)).toFixed(2)} MB` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={removeImage}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
              title="Change photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {fieldErrors.proofImage && (
          <p className="mt-1.5 text-xs text-red-400 font-medium">
            {fieldErrors.proofImage}
          </p>
        )}
      </div>

      {/* Resolution Notes Field */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          Resolution Notes / Work Performed (Optional)
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Pothole asphalt patched, leveled, and compacted. Road surface cleared for traffic."
          className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-emerald-500/70 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
        />
        {fieldErrors.notes && (
          <p className="mt-1 text-xs text-red-400">{fieldErrors.notes}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 disabled:pointer-events-none shadow-lg shadow-emerald-600/20 transition-all"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading & Resolving...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Mark as Resolved</span>
            </>
          )}
        </button>
      </div>
    </form>
  );

  if (inline) {
    return (
      <div className="bg-slate-900/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-7 backdrop-blur">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Complete Work Order & Upload Proof</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit resolution photo and notes for this assigned issue
            </p>
          </div>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-black/60 relative">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Resolve Civic Issue</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {issue?.title || 'Work Order'}
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {formContent}
      </div>
    </div>
  );
};

export default ResolveIssueForm;
