import { useState, useEffect } from 'react';
import { Users, BookOpen, Loader2, Shield, RefreshCw } from 'lucide-react';
import { supabase, Book, Profile } from '../lib/supabase';
import StaticPagesManager from '../components/StaticPagesManager';

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

interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'free' | 'pro' | 'premium';
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
}

interface UserWithSubscription extends Profile {
  subscription?: Subscription;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [staticPages, setStaticPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'books' | 'pages'>('users');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: subscriptionsData } = await supabase
        .from('subscriptions')
        .select('*');

      const usersWithSubscriptions = (profilesData || []).map(user => ({
        ...user,
        subscription: subscriptionsData?.find(sub => sub.user_id === user.id)
      }));

      setUsers(usersWithSubscriptions);

      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (booksError) throw booksError;
      setBooks(booksData || []);

      const { data: pagesData, error: pagesError } = await supabase
        .from('static_pages')
        .select('*')
        .order('display_order', { ascending: true });

      if (pagesError) throw pagesError;
      setStaticPages(pagesData || []);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncUsers = async () => {
    try {
      setSyncingUsers(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-users`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync users');
      }

      alert(data.message);
      if (data.syncedCount > 0) {
        loadData();
      }
    } catch (error: any) {
      console.error('Error syncing users:', error);
      alert(`Failed to sync users: ${error.message}`);
    } finally {
      setSyncingUsers(false);
    }
  };

  const handleChangeSubscription = async (userId: string, newTier: 'free' | 'pro' | 'premium') => {
    try {
      setUpdatingUser(userId);

      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ plan_type: newTier })
        .eq('user_id', userId);

      if (subError) throw subError;

      const limits = {
        free: { books_limit: 2, pages_per_book_limit: 20, ai_credits_remaining: 20 },
        pro: { books_limit: 10, pages_per_book_limit: 50, ai_credits_remaining: 200 },
        premium: { books_limit: 999999, pages_per_book_limit: 100, ai_credits_remaining: 1000 }
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_tier: newTier,
          ...limits[newTier]
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      alert(`Subscription updated to ${newTier}!`);
      loadData();
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      alert(`Failed to update subscription: ${error.message}`);
    } finally {
      setUpdatingUser(null);
    }
  };

  const stats = {
    totalUsers: users.length,
    adminUsers: users.filter(u => u.role === 'admin').length,
    totalBooks: books.length,
    completedBooks: books.filter(b => b.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage users and books</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Users</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Admins</p>
                  <p className="text-2xl font-bold text-green-900">{stats.adminUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Books</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.totalBooks}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.completedBooks}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Users ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('books')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'books'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Books ({books.length})
              </button>
              <button
                onClick={() => setActiveTab('pages')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'pages'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Static Pages ({staticPages.length})
              </button>
            </div>

            {activeTab === 'users' && (
              <button
                onClick={handleSyncUsers}
                disabled={syncingUsers}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {syncingUsers ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sync Users
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : activeTab === 'pages' ? (
          <StaticPagesManager pages={staticPages} onUpdate={loadData} />
        ) : activeTab === 'users' ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.subscription?.plan_type === 'premium'
                          ? 'bg-purple-100 text-purple-800'
                          : user.subscription?.plan_type === 'pro'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.subscription?.plan_type || 'free'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.subscription?.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.subscription?.status || 'inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <select
                        value={user.subscription?.plan_type || 'free'}
                        onChange={(e) => handleChangeSubscription(user.id, e.target.value as 'free' | 'pro' | 'premium')}
                        disabled={updatingUser === user.id}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="premium">Premium</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {book.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {book.author || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        book.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : book.status === 'generating'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {book.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {book.target_pages}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(book.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}