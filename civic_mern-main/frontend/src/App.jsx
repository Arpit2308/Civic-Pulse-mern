import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Register from './pages/Register';
import Login from './pages/Login';
import CivicIssues from './pages/CivicIssues';
import ConsumerSafety from './pages/ConsumerSafety';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/issues" />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/issues" element={<CivicIssues />} />
            <Route path="/complaints" element={<ConsumerSafety />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;