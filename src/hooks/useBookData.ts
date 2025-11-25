import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Page, TrimSize, FontSize } from '../types';

// Define the structure of the book data fetched from Supabase
export interface BookData {
  id: string;
  title: string;
  author: string | null;
  trim_size: TrimSize;
  font_size: FontSize;
  target_pages: number;
  status: 'draft' | 'generating' | 'complete';
  book_prompt: string | null;
  pages: Page[];
  has_front_cover: boolean;
  has_back_cover: boolean;
}

interface UseBookDataResult {
  book: BookData | null;
  pages: Page[];
  loading: boolean;
  setBook: React.Dispatch<React.SetStateAction<BookData | null>>;
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  loadBook: () => Promise<void>;
}

export default function useBookData(bookId: string | undefined, onBookNotFound: () => void): UseBookDataResult {
  const [book, setBook] = useState<BookData | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBook = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    try {
      const { data: bookData, error } = await supabase
        .from('books')
        .select(`
          *,
          pages:book_pages(*)
        `)
        .eq('id', bookId)
        .order('page_number', { foreignTable: 'book_pages', ascending: true })
        .maybeSingle();

      if (error) throw error;
      if (!bookData) {
        alert('Book not found.');
        onBookNotFound();
        return;
      }

      // Ensure types match the local state structure
      const typedBookData: BookData = {
        ...bookData,
        trim_size: bookData.trim_size as TrimSize,
        font_size: bookData.font_size as FontSize,
        pages: (bookData.pages || []) as Page[],
      };

      setBook(typedBookData);
      setPages(typedBookData.pages || []);
      
    } catch (error: any) {
      console.error('Error loading book:', error);
      alert('Failed to load book data.');
    } finally {
      setLoading(false);
    }
  }, [bookId, onBookNotFound]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  return { book, pages, loading, setBook, setPages, loadBook };
}