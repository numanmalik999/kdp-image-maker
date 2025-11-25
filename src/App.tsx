/* @ts-nocheck */
import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import BookEditor from './pages/BookEditor/BookEditor';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import StaticPage from './pages/StaticPage';
import { Loader2 } from 'lucide-react';
import { SUPABASE_URL } from './lib/config';

function App() {
  // Minimal routing placeholder; actual logic omitted for brevity
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Demo: redirect to landing if unknown route
    if (!location.pathname.startsWith('/dashboard') && location.pathname !== '/') {
      navigate('/');
    }
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Landing onGetStarted={() => navigate('/pricing')} onSignIn={() => navigate('/login')} onSignUp={() => navigate('/signup')} />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/editor/:bookId" element={<BookEditor bookId={location.pathname.split('/').pop() || ''} onBack={() => navigate('/dashboard')} />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<div className="p-6 text-center">404</div>} />
    </Routes>
  );
}

export default App;