import { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2, Clock, CheckCircle, Download, Trash2 } from 'lucide-react';
import { supabase, Book } from '../lib/supabase';
import NewBookModal from '../components/NewBookModal';
import ExportModal from '../components/ExportModal';
import SubscriptionStatus from '../components/SubscriptionStatus';
import { TrimSize, Page } from '../types';
import { generatePDF } from '../utils/pdfGenerator';
import { checkBookCreationLimit, incrementBookCount } from '../utils/subscriptionLimits';

interface DashboardProps {
  onEditBook: (bookId: string) => void;
  onViewPricing: () => void;
  onManageBilling: () => void;
}

export default function Dashboard({ onEditBook, onViewPricing, onManageBilling }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBookModal, setShowNewBookModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
    loadBooks();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadBooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBook = async (data: { title: string; author: string; trimSize: TrimSize }) => {
    try {
      if (!user) {
        alert('You must be logged in to create a book');
        return;
      }

      const limitCheck = await checkBookCreationLimit(user.id);
      if (!limitCheck.allowed) {
        if (confirm(`${limitCheck.message}\n\nWould you like to view our pricing plans?`)) {
          onViewPricing();
        }
        return;
      }

      const { data: book, error } = await supabase
        .from('books')
        .insert([
          {
            user_id: user.id,
            title: data.title,
            author: data.author || null,
            trim_size: data.trimSize,
            target_pages: 1,
            status: 'draft',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      await incrementBookCount(user.id);

      setShowNewBookModal(false);
      loadBooks();

      if (book) {
        onEditBook(book.id);
      }
    } catch (error) {
      console.error('Error creating book:', error);
      alert('Failed to create book. Please try again.');
    }
  };

  const handleDeleteBook = async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;

      loadBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Failed to delete book. Please try again.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'generating':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'generating':
        return 'Generating';
      default:
        return 'Draft';
    }
  };

  const handleDownloadBook = async (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBook(book);
    setShowExportModal(true);
  };

  const handleExportPDF = async () => {
    if (!selectedBook) return;

    setIsExporting(true);
    try {
      const { data: pagesData, error: pagesError } = await supabase
        .from('book_pages')
        .select('*')
        .eq('book_id', selectedBook.id)
        .order('page_number', { ascending: true });

      if (pagesError) throw pagesError;

      const pages: Page[] = (pagesData || []).map(p => ({
        id: p.id,
        pageNumber: p.page_number,
        content: p.content || '',
        imageUrl: p.image_url,
      }));

      await generatePDF(selectedBook, pages);

      alert('PDF downloaded successfully!');
      setShowExportModal(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportEPUB = async () => {
    alert(
      'EPUB export is a premium feature that requires additional libraries for creating EPUB files.\n\n' +
      'For coloring books, PDF format is recommended as it better preserves image quality and layout.\n\n' +
      'EPUB support may be added in a future update!'
    );
  };

  const handleExportKindle = () => {
    alert(
      'Send to Kindle functionality requires Amazon API integration.\n\n' +
      'You can export as PDF and manually transfer to your Kindle device via:\n' +
      '1. Email (send to your Kindle email address)\n' +
      '2. USB connection\n' +
      '3. Send to Kindle app\n\n' +
      'Direct Kindle integration may be added in a future update!'
    );
  };

  const filteredBooks = (() => {
    if (activeTab === 'in-progress') {
      return books.filter(book => book.status === 'draft' || book.status === 'generating');
    }
    if (activeTab === 'completed') {
      return books.filter(book => book.status === 'completed');
    }
    return books;
  })();

  const inProgressCount = books.filter(b => b.status === 'draft' || b.status === 'generating').length;
  const completedCount = books.filter(b => b.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Books</h1>
              <p className="text-gray-600 mt-1">Create and manage your KDP coloring books</p>
            </div>
            <button
              onClick={() => setShowNewBookModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Plus className="w-5 h-5" />
              New Book
            </button>
          </div>

          <SubscriptionStatus onUpgrade={onViewPricing} onManageBilling={onManageBilling} />

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Books ({books.length})
            </button>
            <button
              onClick={() => setActiveTab('in-progress')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'in-progress'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'completed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'in-progress' ? 'No books in progress' : activeTab === 'completed' ? 'No completed books' : 'No books yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'in-progress'
                ? 'Books you are working on will appear here'
                : activeTab === 'completed'
                ? 'Completed books ready for download will appear here'
                : 'Get started by creating your first book'}
            </p>
            {activeTab === 'all' && (
              <button
                onClick={() => setShowNewBookModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Create Your First Book
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => onEditBook(book.id)}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="text-sm text-gray-600 mt-1">by {book.author}</p>
                    )}
                  </div>
                  {getStatusIcon(book.status)}
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className="font-medium">{getStatusText(book.status)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Size:</span>
                    <span className="font-medium">{book.trim_size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pages:</span>
                    <span className="font-medium">{book.target_pages}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Updated {new Date(book.updated_at).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2">
                      {book.status === 'completed' && (
                        <button
                          onClick={(e) => handleDownloadBook(book, e)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteBook(book.id, e)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewBookModal
        isOpen={showNewBookModal}
        onClose={() => setShowNewBookModal(false)}
        onCreate={handleCreateBook}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportPDF={handleExportPDF}
        onExportEPUB={handleExportEPUB}
        onExportKindle={handleExportKindle}
        isExporting={isExporting}
      />
    </div>
  );
}
