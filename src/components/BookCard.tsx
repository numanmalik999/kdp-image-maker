import { Edit, Trash2, Loader2 } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string | null;
  trim_size: string;
  target_pages: number;
  status: 'draft' | 'generating' | 'complete';
  created_at: string;
}

interface BookCardProps {
  book: Book;
  onEdit: (bookId: string) => void;
  onDelete: (bookId: string) => void;
}

export default function BookCard({ book, onEdit, onDelete }: BookCardProps) {
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the book: "${book.title}"?`)) {
      return;
    }
    onDelete(book.id);
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    generating: 'bg-yellow-100 text-yellow-700 animate-pulse',
    complete: 'bg-green-100 text-green-700',
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex flex-col justify-between transition-shadow hover:shadow-lg">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 truncate">{book.title}</h3>
          <span className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 ${statusColors[book.status]}`}>
            {book.status === 'generating' && <Loader2 className="w-3 h-3 animate-spin" />}
            {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          {book.author || 'Unknown Author'}
        </p>

        <div className="space-y-1 text-sm text-gray-500 mb-6">
          <div className="flex justify-between">
            <span>Trim Size:</span>
            <span className="font-medium text-gray-700">{book.trim_size}</span>
          </div>
          <div className="flex justify-between">
            <span>Target Pages:</span>
            <span className="font-medium text-gray-700">{book.target_pages}</span>
          </div>
          <div className="flex justify-between">
            <span>Created:</span>
            <span className="font-medium text-gray-700">{new Date(book.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button
          onClick={() => onEdit(book.id)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          disabled={book.status === 'generating'}
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete Book"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}