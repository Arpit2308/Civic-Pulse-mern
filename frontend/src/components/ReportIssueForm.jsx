import { useState, useRef } from 'react';
import API from '../api/axios';
import { ISSUE_CATEGORIES, MAX_UPLOAD_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '../constants';
import toast from 'react-hot-toast';
import {
  UploadCloud,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Send,
} from 'lucide-react';

export const ReportIssueForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ISSUE_CATEGORIES[0],
    pincode: '',
    address: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        image: 'Only JPG, PNG, and WEBP image formats are supported.',
      }));
      return;
    }

    // Validate size (max 5MB)
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setFieldErrors((prev) => ({
        ...prev,
        image: 'Image file size must be less than 5MB.',
      }));
      return;
    }

    setFieldErrors((prev) => ({ ...prev, image: '' }));
    setImageFile(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateClient = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.trim().length < 3 || formData.title.trim().length > 150) {
      errors.title = 'Title must be between 3 and 150 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 5) {
      errors.description = 'Description must be at least 5 characters long';
    }

    if (!formData.pincode.trim()) {
      errors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = 'Please enter a valid 6-digit pincode';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});

    try {
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('description', formData.description.trim());
      data.append('category', formData.category);
      data.append('pincode', formData.pincode.trim());
      if (formData.address.trim()) {
        data.append('address', formData.address.trim());
      }
      if (imageFile) {
        data.append('image', imageFile);
      }

      const response = await API.post('/issues', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Civic issue reported successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: ISSUE_CATEGORIES[0],
        pincode: '',
        address: '',
      });
      removeImage();

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors && typeof respData.errors === 'object') {
        setFieldErrors(respData.errors);
      }
      setGeneralError(
        respData?.message || 'Failed to submit report. Please check the entered fields.'
      );
      toast.error(respData?.message || 'Failed to submit issue report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Report a Civic Issue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Submit a problem report directly to your municipal ward operations
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {generalError && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 flex items-start gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title & Pincode Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Issue Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Deep hazardous pothole on 4th Main Road"
              className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all ${
                fieldErrors.title
                  ? 'border-red-500/80 focus:border-red-500'
                  : 'border-slate-800 focus:border-cyan-500/70'
              }`}
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Pincode *
            </label>
            <input
              type="text"
              name="pincode"
              maxLength={6}
              value={formData.pincode}
              onChange={handleChange}
              placeholder="e.g. 560001"
              className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all ${
                fieldErrors.pincode
                  ? 'border-red-500/80 focus:border-red-500'
                  : 'border-slate-800 focus:border-cyan-500/70'
              }`}
            />
            {fieldErrors.pincode && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.pincode}</p>
            )}
          </div>
        </div>

        {/* Category & Address Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
            >
              {ISSUE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-slate-100">
                  {cat}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.category}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Location / Landmark (Optional)
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. Opposite City Park East Gate"
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
            />
            {fieldErrors.address && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.address}</p>
            )}
          </div>
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Problem Description *
          </label>
          <textarea
            rows={3}
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide specific details about the issue to help municipal field crews locate and resolve it..."
            className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all ${
              fieldErrors.description
                ? 'border-red-500/80 focus:border-red-500'
                : 'border-slate-800 focus:border-cyan-500/70'
            }`}
          />
          {fieldErrors.description && (
            <p className="mt-1 text-xs text-red-400">{fieldErrors.description}</p>
          )}
        </div>

        {/* Photo Upload with Client Validation & Preview */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Attach Issue Photo (Optional — JPG, PNG, WEBP, max 5MB)
          </label>

          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-xl p-5 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition-colors">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    Click to select an image from your device
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    JPEG, PNG, or WEBP up to 5MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-xl border border-slate-700 bg-slate-950 p-2.5 flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-slate-800">
                <img
                  src={imagePreview}
                  alt="Issue Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Photo attached</span>
                </div>
                <p className="text-xs text-slate-300 truncate font-mono">
                  {imageFile?.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {imageFile ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={removeImage}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {fieldErrors.image && (
            <p className="mt-1 text-xs text-red-400">{fieldErrors.image}</p>
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
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-60 disabled:pointer-events-none shadow-lg shadow-cyan-600/20 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Report...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Civic Report</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportIssueForm;
