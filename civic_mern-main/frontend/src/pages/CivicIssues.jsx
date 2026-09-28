import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';

export default function CivicIssues() {
  const [issues, setIssues] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Roads & Potholes');
  const [filterPincode, setFilterPincode] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('token');

  const loadIssues = useCallback(async () => {
    try {
      const endpoint = filterPincode ? `/issues?pincode=${filterPincode.trim()}` : '/issues';
      const res = await API.get(endpoint);
      setIssues(res.data);
    } catch (err) {
      console.error('Error loading issues:', err);
    }
  }, [filterPincode]);

  useEffect(() => {
    let ignore = false;
    const fetchCurrentIssues = async () => {
      try {
        const endpoint = filterPincode ? `/issues?pincode=${filterPincode.trim()}` : '/issues';
        const res = await API.get(endpoint);
        if (!ignore) {
          setIssues(res.data);
        }
      } catch (err) {
        console.error('Error fetching issues:', err);
      }
    };
    fetchCurrentIssues();
    return () => {
      ignore = true;
    };
  }, [filterPincode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!token) {
      setFormError('You must be logged in to report a civic issue. Please log in first.');
      return;
    }

    setIsSubmitting(true);
    try {
      await API.post('/issues', {
        title,
        description,
        pincode,
        address,
        category,
      });

      setTitle('');
      setDescription('');
      setPincode('');
      setAddress('');
      setCategory('Roads & Potholes');
      setFormSuccess('Civic issue reported successfully!');
      loadIssues();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to report issue';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (id) => {
    if (!token) {
      alert('Please log in to upvote issues.');
      return;
    }
    try {
      await API.put(`/issues/${id}/upvote`);
      loadIssues();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upvote');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Report Form */}
      <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-emerald-400">Report a Civic Issue</h2>

        {!token && (
          <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 p-3 rounded text-sm">
            You are viewing in guest mode. <Link to="/login" className="underline font-semibold hover:text-white">Log in</Link> to submit or upvote reports.
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Title *</label>
            <input 
              type="text" 
              placeholder="e.g. Broken streetlight on 5th main" 
              value={title}
              className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-400"
              onChange={(e) => setTitle(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Pincode *</label>
            <input 
              type="text" 
              placeholder="e.g. 560001" 
              value={pincode}
              className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-400"
              onChange={(e) => setPincode(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-400"
            >
              <option value="Roads & Potholes">Roads & Potholes</option>
              <option value="Sanitation & Garbage">Sanitation & Garbage</option>
              <option value="Street Lighting">Street Lighting</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Electricity">Electricity</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Address / Landmark (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. Near City Bank ATM, Sector 4" 
              value={address}
              className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-400"
              onChange={(e) => setAddress(e.target.value)} 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
          <textarea 
            placeholder="Detailed description of the civic problem..." 
            value={description}
            className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-400 h-20"
            onChange={(e) => setDescription(e.target.value)} 
            required 
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2 rounded font-semibold transition"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>

      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-white">Reported Issues ({issues.length})</h3>
        <input 
          type="text" 
          placeholder="Filter by Pincode..." 
          className="p-2 rounded bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-400"
          value={filterPincode}
          onChange={(e) => setFilterPincode(e.target.value)}
        />
      </div>

      {/* Issues List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {issues.length === 0 ? (
          <div className="col-span-full bg-slate-800/40 p-8 rounded-xl border border-slate-700/60 text-center text-slate-400">
            No civic issues reported yet for this area.
          </div>
        ) : (
          issues.map((issue) => (
            <div key={issue._id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-semibold">
                    {issue.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    Pincode: {issue.location?.pincode || issue.pincode || 'N/A'}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white">{issue.title}</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{issue.description}</p>
                {issue.location?.address && (
                  <p className="text-xs text-slate-400">📍 {issue.location.address}</p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center text-xs text-slate-400">
                <span>By: {issue.reportedBy?.name || 'Citizen'}</span>
                <button
                  onClick={() => handleUpvote(issue._id)}
                  className="bg-slate-700 hover:bg-slate-600 text-emerald-400 px-3 py-1 rounded font-medium transition flex items-center gap-1"
                >
                  ▲ Upvote ({issue.upvotes?.length || 0})
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}