import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Page, TrimSize, FontSize, PageActivityType } from '../types';

// Define the structure of the book data fetched from Supabase
export interface BookData {
  id: string;
  title: string;
  author: string | null;
  trim_size: TrimSize;
  font_size: FontSize;
  target_pages: number; // Kept for DB consistency, but ignored for limits
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

// Helper type for the raw page data returned from the DB
interface RawPage {
  id: string;
  page_number: number;
  content: string;
  image_url?: string;
  activity_type: PageActivityType; // DB stores singular string
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

      // Map raw pages data to the frontend Page interface
      let mappedPages: Page[] = (bookData.pages as RawPage[] || []).map(rawPage => ({
        id: rawPage.id,
        pageNumber: rawPage.page_number,
        content: rawPage.content || '',
        imageUrl: rawPage.image_url || undefined,
        // Convert singular DB activity_type string back to an array for the frontend state
        activityTypes: rawPage.activity_type ? [rawPage.activity_type] : ['coloring'],
      }));
      
      // If no content pages exist (new book or all deleted), ensure page 1 exists for editing
      const contentPagesExist = mappedPages.some(p => p.pageNumber > 0);
      if (!contentPagesExist) {
        mappedPages.push({
          id: `temp-1`,
          pageNumber: 1,
          content: '',
          activityTypes: ['coloring'],
        });
        mappedPages.sort((a, b) => a.pageNumber - b.pageNumber);
      }

      // Ensure types match the local state structure
      const typedBookData: BookData = {
        ...bookData,
        trim_size: bookData.trim_size as TrimSize,
        font_size: bookData.font_size as FontSize,
        pages: mappedPages,
      };

      setBook(typedBookData);
      setPages(mappedPages);
      
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