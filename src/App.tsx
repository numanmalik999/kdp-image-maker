import { Routes, Route, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookEditor from './pages/BookEditor/BookEditor';
import StaticPage from './pages/StaticPage';
import { useState } from 'react';
import Footer from './components/Footer';

export default function App() {
  const navigate = useNavigate();
  const [staticPageSlug, setStaticPageSlug] = useState<string | null>(null);

  const handlePageClick = (slug: string) => {
    setStaticPageSlug(slug);
  };

  const handleBack = () => {
    setStaticPageSlug(null);
  };

  if (staticPageSlug) {
    return (
      <>
        <StaticPage slug={staticPageSlug} onBack={handleBack} />
        <Footer onPageClick={handlePageClick} />
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing onGetStarted={() => navigate('/signup')} onSignIn={() => navigate('/login')} onSignUp={() => navigate('/signup')} />} />
        {/* Removed /pricing route */}
        <Route path="/login" element={<Login onLoginSuccess={() => navigate('/dashboard')} onSwitchToSignup={() => navigate('/signup')} />} />
        <Route path="/signup" element={<Signup onSignupSuccess={() => navigate('/dashboard')} onSwitchToLogin={() => navigate('/login')} />} />
        <Route path="/editor/:bookId" element={<BookEditor onBack={() => navigate('/dashboard')} />} />
        <Route 
          path="/dashboard" 
          element={
            <Dashboard 
              onEditBook={(bookId) => navigate(`/editor/${bookId}`)} 
              // Removed onViewPricing and onManageBilling props
            />
          } 
        />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<div className="p-6 text-center">404</div>} />
      </Routes>
      <Footer onPageClick={handlePageClick} />
    </>
  );
}