import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Users, ArrowLeft } from 'lucide-react';
import StaticPagesManager from '../components/StaticPagesManager';
import { useNavigate } from 'react-router-dom';

// Define StaticPage interface (matching StaticPagesManager)
interface StaticPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  display_location: string[];
  is_published: boolean;
  display_order: number;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminDashboard(): JSX.Element | null {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [staticPages, setStaticPages] = useState<StaticPage[]>([]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // 1. Check Admin Role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        setIsAdmin(false);
        navigate('/dashboard'); // Redirect non-admins
        return;
      }
      setIsAdmin(true);

      // 2. Fetch Total Users (Count profiles)
      // We count the profiles table as it reflects all registered users
      const { count: userCount, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalUsers(userCount);

      // 3. Fetch Static Pages
      const { data: pagesData, error: pagesError } = await supabase
        .from('static_pages')
        .select('*')
        .order('display_order', { ascending: true });

      if (pagesError) throw pagesError;
      setStaticPages(pagesData as StaticPage[]);

    } catch (error) {
      console.error('Error loading admin data:', error);
      // If loading fails, ensure we stop loading state
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        <p className="ml-3 text-gray-600">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (!isAdmin) {
    // If loading finished and user is not admin, they should have been redirected.
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <Users className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {totalUsers !== null ? totalUsers.toLocaleString() : <Loader2 className="w-6 h-6 animate-spin" />}
            </p>
          </div>
          {/* Placeholder for other stats */}
        </div>

        {/* Static Pages Management */}
        <div className="mt-10">
          <StaticPagesManager pages={staticPages} onUpdate={loadAdminData} />
        </div>
      </div>
    </div>
  );
}