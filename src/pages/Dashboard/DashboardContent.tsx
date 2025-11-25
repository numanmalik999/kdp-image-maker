import { useState, useEffect } from 'react';
import { Plus, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BookCard from '../../components/BookCard';
import SubscriptionStatus from '../../components/SubscriptionStatus';
import NewBookModal from '../../components/NewBookModal';
import { checkBookCreationLimit, incrementBookCount } from '../../utils/subscriptionLimits';
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

interface DashboardContentProps {
  onEditBook: (bookId: string) => void;
  onViewPricing: () => void;
  onManageBilling: () => void;
}

export default function DashboardContent({ onEditBook, onViewPricing, onManageBilling }: DashboardContentProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUserAndBooks();
  }, []);

  const loadUserAndBooks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
      alert('Failed to load books.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBook = async (data: { title: string; author: string; trimSize: TrimSize }) => {
    if (!user) return;

    // 1. Check limits
    const limitCheck = await checkBookCreationLimit(user.id);
    if (!limitCheck.allowed) {
      alert(limitCheck.message);
      return;
    }

    try {
      const { data: newBook, error } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
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

      // 2. Increment usage count
      await incrementBookCount(user.id);

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            My Books
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
          >
            <Plus className="w-5 h-5" />
            New Book
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <div className="lg:col-span-4">
            <SubscriptionStatus onUpgrade={onViewPricing} onManageBilling={onManageBilling} />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your books...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Books Found</h2>
            <p className="text-gray-500 mb-6">Start your KDP journey by creating your first book!</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create First Book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map(book => (
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