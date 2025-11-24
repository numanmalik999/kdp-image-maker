import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';
import BookEditor from './pages/BookEditor/BookEditor';
import AdminDashboard from './pages/AdminDashboard';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import StaticPage from './pages/StaticPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Footer from './components/Footer';
import { Loader2 } from 'lucide-react';

type View = 'landing' | 'dashboard' | 'editor' | 'admin' | 'pricing' | 'static-page';
type AuthView = 'login' | 'signup';

function App() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'premium'>('free');
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('landing');
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [currentPageSlug, setCurrentPageSlug] = useState<string | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUserRole(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
        setCurrentView('dashboard');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, subscription_tier')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserRole(data?.role || 'user');
      setUserTier(data?.subscription_tier || 'free');
    } catch (error) {
      console.error('Error loading profile:', error);
      setUserRole('user');
      setUserTier('free');
    }
  };

  const handleLoginSuccess = async () => {
    await checkUser();
    setCurrentView('dashboard');
  };

  const handleSignupSuccess = async () => {
    await checkUser();
    setCurrentView('dashboard');
  };

  const handleEditBook = (bookId: string) => {
    setCurrentBookId(bookId);
    setCurrentView('editor');
  };

  const handleBackToDashboard = () => {
    setCurrentView(userRole === 'admin' ? 'admin' : 'dashboard');
    setCurrentBookId(null);
  };

  const handleSwitchToAdmin = () => {
    setCurrentView('admin');
  };

  const handleSwitchToUser = () => {
    setCurrentView('dashboard');
  };

  const handleViewPricing = () => {
    setCurrentView('pricing');
  };

  const handleViewStaticPage = (slug: string) => {
    setCurrentPageSlug(slug);
    setCurrentView('static-page');
  };

  const handleBackFromStaticPage = () => {
    setCurrentView(user ? 'dashboard' : 'landing');
    setCurrentPageSlug(null);
  };

  const handleManageBilling = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to manage billing');
        return;
      }

      // Hardcoded Supabase URL to ensure Edge Function call works
      const supabaseUrl = 'https://lrwjdykjaulwwdswuuoa.supabase.co';
      const apiUrl = `${supabaseUrl}/functions/v1/create-portal-session`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create portal session');
      }
    } catch (error) {
      console.error('Billing portal error:', error);
      alert('Failed to open billing portal. Please try again.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setCurrentView('landing');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (currentView === 'landing') {
      return (
        <>
          <Landing onGetStarted={() => {
            setCurrentView('dashboard');
            setAuthView('login');
          }} />
          <Footer onPageClick={handleViewStaticPage} />
        </>
      );
    }

    if (authView === 'signup') {
      return (
        <Signup
          onSignupSuccess={handleSignupSuccess}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onSwitchToSignup={() => setAuthView('signup')}
      />
    );
  }

  if (currentView === 'editor' && currentBookId) {
    return <BookEditor bookId={currentBookId} onBack={handleBackToDashboard} />;
  }

  if (currentView === 'pricing') {
    return (
      <>
        <Pricing
          currentTier={userTier}
          onBack={() => setCurrentView('dashboard')}
        />
        <Footer onPageClick={handleViewStaticPage} />
      </>
    );
  }

  if (currentView === 'static-page' && currentPageSlug) {
    return (
      <>
        <StaticPage slug={currentPageSlug} onBack={handleBackFromStaticPage} />
        <Footer onPageClick={handleViewStaticPage} />
      </>
    );
  }

  if (currentView === 'admin' && userRole === 'admin') {
    return (
      <div>
        <AdminDashboard />
        <button
          onClick={handleSwitchToUser}
          className="fixed bottom-6 left-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
        >
          Switch to User View
        </button>
        <button
          onClick={handleLogout}
          className="fixed bottom-6 right-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <>
      <Dashboard
        onEditBook={handleEditBook}
        onViewPricing={handleViewPricing}
        onManageBilling={handleManageBilling}
      />
      <Footer onPageClick={handleViewStaticPage} />
      {userRole === 'admin' && (
        <button
          onClick={handleSwitchToAdmin}
          className="fixed bottom-6 left-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg"
        >
          Admin Dashboard
        </button>
      )}
      <button
        onClick={handleLogout}
        className="fixed bottom-6 right-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg"
      >
        Logout
      </button>
    </>
  );
}

export default App;