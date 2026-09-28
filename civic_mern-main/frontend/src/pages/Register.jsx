import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await API.post('/auth/register', formData);
      alert('Registration Successful!');
      navigate('/login');
    } catch (err) {
      console.error('Registration Error:', err);
      const data = err.response?.data;
      let errorMsg = 'Registration failed';
      if (data?.message) {
        errorMsg = data.message;
      } else if (data?.errors) {
        if (Array.isArray(data.errors)) {
          errorMsg = data.errors.map((e) => e.msg || e.message).join(', ');
        } else if (typeof data.errors === 'object') {
          errorMsg = Object.values(data.errors).join(', ');
        }
      }
      setError(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-700">
        <h2 className="text-2xl font-bold text-emerald-400 mb-6 text-center">Create Account</h2>
        {error && <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 text-center">{error}</div>}
        
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full mb-4 p-3 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full mb-4 p-3 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-full mb-6 p-3 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
          required
        />
        
        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded font-bold transition">
          Register
        </button>
      </form>
    </div>
  );
};

export default Register;