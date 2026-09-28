import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center text-white">
      <Link to="/" className="text-xl font-bold text-emerald-400">CivicPulse</Link>
      <div className="space-x-4 flex items-center">
        <Link to="/issues" className="hover:text-emerald-400 transition">Civic Issues</Link>
        <Link to="/complaints" className="hover:text-emerald-400 transition">Consumer Safety</Link>
        {token ? (
          <button 
            onClick={handleLogout} 
            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-sm transition"
          >
            Logout
          </button>
        ) : (
          <>
            <Link to="/login" className="hover:text-emerald-400 transition">Login</Link>
            <Link to="/register" className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded-md text-sm transition">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}