import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      navigate('/issues');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Credentials');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl shadow-lg w-96 space-y-4 border border-slate-700">
        <h2 className="text-2xl font-bold text-emerald-400 text-center">User Login</h2>
        {error && <div className="p-2 bg-red-500/20 text-red-400 rounded text-sm text-center">{error}</div>}
        <input 
          type="email" 
          placeholder="Email Address" 
          className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-400"
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-400"
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded font-semibold transition">
          Sign In
        </button>
      </form>
    </div>
  );
}