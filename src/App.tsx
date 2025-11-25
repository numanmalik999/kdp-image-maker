/* @ts-nocheck */
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookEditor from './pages/BookEditor/BookEditor';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Routes>
      <Route path="/" element={
        <Landing
          onGetStarted={() => navigate('/pricing')}
          onSignIn={() => navigate('/login')}
          onSignUp={() => navigate('/signup')}
        />
      } />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<Login onLoginSuccess={() => {}} onSwitchToSignup={() => navigate('/signup')} />} />
      <Route path="/signup" element={<Signup onSignupSuccess={() => {}} onSwitchToLogin={() => navigate('/login')} />} />
      <Route path="/editor/:bookId" element={<BookEditor bookId={location.pathname.split('/').pop() || ''} onBack={() => navigate('/dashboard')} />} />
      <Route path="/dashboard" element={<Dashboard onEditBook={() => {}} onViewPricing={() => navigate('/pricing')} onManageBilling={() => {}} />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<div className="p-6 text-center">404</div>} />
    </Routes>
  );
}