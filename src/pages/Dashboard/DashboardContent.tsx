import { useState, useEffect } from 'react';
import { Plus, BookOpen, Loader2, User, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BookCard from '../../components/BookCard';
import NewBookModal from '../../components/NewBookModal';
import { TrimSize } from '../../types';

interface Book {
  id: string;
  title: string;
  author: string | null;
  trim_size: string;
  target_pages: number;
  status: 'draft' | 'generating' | 'complete';
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
}

interface DashboardContentProps {
  onEditBook: (bookId: string) => void;
}

type BookFilter = 'all' | 'in_progress' | 'completed';

export default function DashboardContent({ onEditBook }: DashboardContentProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeFilter, setActiveFilter] = useState<BookFilter>('all');

  useEffect(() => {
    loadUserAndBooks();
  }, []);

  const loadUserAndBooks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // 1. Load User Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      setUserProfile(profileData as UserProfile);

      // 2. Load Books
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBook = async (data: { title: string; author: string; trimSize: TrimSize }) => {
    if (!userProfile) return;

    try {
      const { data: newBook, error } = await supabase
        .from('books')
        .insert({
          user_id: userProfile.id,
          title: data.title,
          author: data.author,
          trim_size: data.trimSize,
          target_pages: 50, // Default pages
          font_size: 12, // Default font size
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      setIsModalOpen(false);
      setBooks(prev => [newBook, ...prev]);
      onEditBook(newBook.id); // Navigate to editor immediately
    } catch (error) {
      console.error('Error creating book:', error);
      alert('Failed to create book.');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await supabase.from('books').delete().eq('id', bookId);
      setBooks(prev => prev.filter(book => book.id !== bookId));
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Failed to delete book.');
    }
  };
  
  const filteredBooks = books.filter(book => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'in_progress') return book.status === 'draft' || book.status === 'generating';
    if (activeFilter === 'completed') return book.status === 'complete';
    return true;
  });
  
  const getFilterCount = (filter: BookFilter) => {
    if (filter === 'all') return books.length;
    if (filter === 'in_progress') return books.filter(b => b.status === 'draft' || b.status === 'generating').length;
    if (filter === 'completed') return books.filter(b => b.status === 'complete').length;
    return 0;
  };

  const renderFilterButton = (filter: BookFilter, label: string, Icon: React.ElementType) => {
    const isActive = activeFilter === filter;
    const count = getFilterCount(filter);
    
    return (
      <button
        onClick={() => setActiveFilter(filter)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        <Icon className="w-4 h-4" />
        {label} ({count})
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header and User Info */}
        <div className="flex items-start justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            My Books
          </h1>
          
          {userProfile && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
              <User className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">{userProfile.full_name || 'User'}</p>
                <p className="text-sm text-gray-600">{userProfile.email}</p>
                <p className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full ${
                  userProfile.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Controls and Tabs */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-4">
          <div className="flex gap-3">
            {renderFilterButton('all', 'All Books', BookOpen)}
            {renderFilterButton('in_progress', 'In Progress', Clock)}
            {renderFilterButton('completed', 'Completed', CheckCircle)}
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
          >
            <Plus className="w-5 h-5" />
            New Book
          </button>
        </div>


        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your books...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              {activeFilter === 'all' ? 'No Books Found' : `No ${activeFilter.replace('_', ' ')} Books`}
            </h2>
            <p className="text-gray-500 mb-6">
              {activeFilter === 'all' ? 'Start your KDP journey by creating your first book!' : 'Keep working on your drafts or create a new book!'}
            </p>
            {activeFilter === 'all' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md mx-auto"
              >
                <Plus className="w-5 h-5" />
                Create First Book
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onEdit={onEditBook}
                onDelete={handleDeleteBook}
              />
            ))}
          </div>
        )}
      </div>

      <NewBookModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateBook}
      />
    </div>
  );
}