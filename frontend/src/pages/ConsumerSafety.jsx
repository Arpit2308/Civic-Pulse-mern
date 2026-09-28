import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';

export default function ConsumerSafety() {
  const [complaints, setComplaints] = useState([]);
  const [storeName, setStoreName] = useState('');
  const [product, setProduct] = useState('');
  const [category, setCategory] = useState('Adulterated Food');
  const [issueDetails, setIssueDetails] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('token');

  const loadComplaints = useCallback(async () => {
    try {
      const res = await API.get('/complaints');
      setComplaints(res.data);
    } catch (err) {
      console.error('Error loading complaints:', err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const fetchCurrentComplaints = async () => {
      try {
        const res = await API.get('/complaints');
        if (!ignore) {
          setComplaints(res.data);
        }
      } catch (err) {
        console.error('Error fetching complaints:', err);
      }
    };
    fetchCurrentComplaints();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!token) {
      setFormError('You must be logged in to submit a safety complaint. Please log in first.');
      return;
    }

    setIsSubmitting(true);
    try {
      await API.post('/complaints', {
        storeName,
        productName: product,
        category,
        description: issueDetails,
      });

      setStoreName('');
      setProduct('');
      setCategory('Adulterated Food');
      setIssueDetails('');
      setFormSuccess('Consumer complaint submitted successfully!');
      loadComplaints();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to submit complaint';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Consumer Safety Form */}
      <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-emerald-400">Report Consumer / Food Safety Violation</h2>

        {!token && (
          <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 p-3 rounded text-sm">
            You are viewing in guest mode. <Link to="/login" className="underline font-semibold hover:text-white">Log in</Link> to file safety complaints.
          </div>
        )}

        {formError && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-400 p-3 rounded text-sm">
            {formError}
          </div>
        )}

        {formSuccess && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-3 rounded text-sm">
            {formSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Store / Restaurant / Brand *</label>
            <input 
              type="text" 
              placeholder="e.g. Fresh Daily Supermarket" 
              value={storeName}
              className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-400"
              onChange={(e) => setStoreName(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Product / Item Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Packaged Milk / Expired Snack" 
              value={product}
              className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-400"
              onChange={(e) => setProduct(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Violation Category *</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-400"
          >
            <option value="Adulterated Food">Adulterated Food</option>
            <option value="Defective Product">Defective Product</option>
            <option value="Billing Fraud">Billing Fraud</option>
            <option value="Unsafe Cosmetics">Unsafe Cosmetics</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Details of Violation *</label>
          <textarea 
            placeholder="Describe the quality, hygiene, or safety defect in detail..." 
            value={issueDetails}
            className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-400 h-24"
            onChange={(e) => setIssueDetails(e.target.value)} 
            required 
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2 rounded font-semibold transition"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>

      {/* Complaints Feed */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Recent Consumer Reports ({complaints.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {complaints.length === 0 ? (
            <div className="col-span-full bg-slate-800/40 p-8 rounded-xl border border-slate-700/60 text-center text-slate-400">
              No consumer complaints reported yet.
            </div>
          ) : (
            complaints.map((item) => (
              <div key={item._id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-2 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-semibold">
                      {item.category || 'Safety Alert'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Status: {item.status || 'Submitted'}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white">{item.brandName}</h4>
                  <p className="text-sm font-medium text-emerald-400">Product: {item.productName}</p>
                  <p className="text-slate-300 text-sm">{item.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}