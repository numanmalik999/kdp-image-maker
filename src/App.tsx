import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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

type UserRole = 'user' | 'admin' | null;
type UserTier = 'free' | 'pro' | 'premium';

// Component to handle authentication and routing protection
const AuthWrapper = ({ children, user, loading, userRole, requiredRole }: { children: React.ReactNode, user: any, loading: boolean, userRole: UserRole, requiredRole?: UserRole }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Redirect unauthenticated users to login/landing
      if (location.pathname !== '/login' && location.pathname !== '/signup' && location.pathname !== '/pricing' && !location.pathname.startsWith('/page/')) {
        navigate('/', { replace: true });
      }
    } else if (requiredRole === 'admin' && userRole !== 'admin') {
      // Redirect non-admins trying to access admin page
      navigate('/dashboard', { replace: true });
    } else if (user && (location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/')) {
      // Redirect authenticated users from auth pages to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, userRole, requiredRole, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userTier, setUserTier] = useState<UserTier>('free');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const loadUserProfile = useCallback(async (userId: string) => {
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
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUserRole(null);
        setUserTier('free');
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const handleLoginSuccess = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleSignupSuccess = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleEditBook = (bookId: string) => {
    navigate(`/editor/${bookId}`);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleSwitchToAdmin = () => {
    navigate('/admin');
  };

  const handleSwitchToUser = () => {
    navigate('/dashboard');
  };

  const handleViewPricing = () => {
    navigate('/pricing');
  };

  const handleViewStaticPage = (slug: string) => {
    navigate(`/page/${slug}`);
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
    navigate('/', { replace: true });
  };

  const renderFooter = location.pathname !== '/admin' && !location.pathname.startsWith('/editor/');

  return (
    <AuthWrapper user={user} loading={loading} userRole={userRole}>
      <div className="flex flex-col min-h-screen">
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <Landing 
                onGetStarted={() => navigate('/pricing')} 
                onSignIn={() => navigate('/login')}
                onSignUp={() => navigate('/signup')}
              />
            } />
            <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} onSwitchToSignup={() => navigate('/signup')} />} />
            <Route path="/signup" element={<Signup onSignupSuccess={handleSignupSuccess} onSwitchToLogin={() => navigate('/login')} />} />
            <Route path="/pricing" element={
              <Pricing 
                currentTier={userTier} 
                onBack={() => navigate(-1)} 
                onAuthRequired={!user ? (type) => navigate(type === 'login' ? '/login' : '/signup') : undefined} 
              />
            } />
            <Route path="/page/:slug" element={<StaticPage slug={location.pathname.split('/').pop() || ''} onBack={() => navigate(-1)} />} />

            {/* Authenticated Routes */}
            <Route path="/dashboard" element={
              <Dashboard
                onEditBook={handleEditBook}
                onViewPricing={handleViewPricing}
                onManageBilling={handleManageBilling}
              />
            } />
            <Route path="/editor/:bookId" element={
              <BookEditor 
                bookId={location.pathname.split('/').pop() || ''} 
                onBack={handleBackToDashboard} 
              />
            } />

            {/* Admin Route */}
            <Route path="/admin" element={
              <AuthWrapper user={user} loading={loading} userRole={userRole} requiredRole="admin">
                <AdminDashboard />
              </AuthWrapper>
            } />

            {/* Fallback Route */}
            <Route path="*" element={
              <div className="p-12 text-center">
                <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
                <button onClick={() => navigate('/')} className="mt-4 text-blue-600 hover:underline">Go Home</button>
              </div>
            } />
          </Routes>
        </main>

        {renderFooter && <Footer onPageClick={handleViewStaticPage} />}

        {user && location.pathname !== '/admin' && !location.pathname.startsWith('/editor/') && (
          <button
            onClick={handleLogout}
            className="fixed bottom-6 right-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg z-40"
          >
            Logout
          </button>
        )}

        {user && userRole === 'admin' && location.pathname !== '/admin' && !location.pathname.startsWith('/editor/') && (
          <button
            onClick={handleSwitchToAdmin}
            className="fixed bottom-6 left-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg z-40"
          >
            Admin Dashboard
          </button>
        )}
        
        {user && userRole === 'admin' && location.pathname === '/admin' && (
          <button
            onClick={handleSwitchToUser}
            className="fixed bottom-6 left-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg z-40"
          >
            Switch to User View
          </button>
        )}
      </div>
    </AuthWrapper>
  );
}

export default App;