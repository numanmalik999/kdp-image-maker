import { Routes, Route, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookEditor from './pages/BookEditor/BookEditor';
import StaticPage from './pages/StaticPage';
import { useState, useEffect } from 'react';
import Footer from './components/Footer';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

export default function App() {
  const navigate = useNavigate();
  const [staticPageSlug, setStaticPageSlug] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // Removed loadingAuth state as it was unused.

  useEffect(() => {
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
        navigate('/dashboard');
      }
      if (event === 'SIGNED_OUT') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePageClick = (slug: string) => {
    setStaticPageSlug(slug);
  };

  const handleBack = () => {
    setStaticPageSlug(null);
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener handles the navigation to '/'
  };

  if (staticPageSlug) {
    return (
      <>
        <StaticPage slug={staticPageSlug} onBack={handleBack} />
        <Footer onPageClick={handlePageClick} />
      </>
    );
  }
  
  // Filter user to ensure email exists, satisfying the LandingProps interface
  const landingUser = user && user.email ? { email: user.email } : null;

  return (
    <>
      <Routes>
        <Route 
          path="/" 
          element={
            <Landing 
              onGetStarted={() => navigate('/signup')} 
              onSignIn={() => navigate('/login')} 
              onSignUp={() => navigate('/signup')} 
              onGoToDashboard={() => navigate('/dashboard')}
              onLogout={handleLogout}
              user={landingUser}
            />
          } 
        />
        <Route path="/login" element={<Login onLoginSuccess={() => navigate('/dashboard')} onSwitchToSignup={() => navigate('/signup')} />} />
        <Route path="/signup" element={<Signup onSignupSuccess={() => navigate('/dashboard')} onSwitchToLogin={() => navigate('/login')} />} />
        <Route path="/editor/:bookId" element={<BookEditor onBack={() => navigate('/dashboard')} />} />
        <Route 
          path="/dashboard" 
          element={
            <Dashboard 
              onEditBook={(bookId) => navigate(`/editor/${bookId}`)} 
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