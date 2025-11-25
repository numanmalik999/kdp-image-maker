import { supabase } from '../lib/supabase';
import { BookData } from './useBookData';
import { Page, Chapter } from '../types';
import { checkAICredits, decrementAICredits, incrementPageCount, incrementImageCount, checkPageCreationLimit } from '../utils/subscriptionLimits';
import { generateBookContent, convertToChapters, convertToSingleText, generatePageContent, generateColoringImage } from '../utils/aiGeneration';

interface UseBookGenerationProps {
  bookId: string;
  book: BookData | null;
  pages: Page[];
  setBook: React.Dispatch<React.SetStateAction<BookData | null>>;
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  setChapters: React.Dispatch<React.SetStateAction<Chapter[]>>;
  setSingleText: React.Dispatch<React.SetStateAction<string>>;
  setIsGeneratingAI: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function useBookGeneration({
  bookId,
  book,
  pages,
  setBook,
  setPages,
  setChapters,
  setSingleText,
  setIsGeneratingAI,
}: UseBookGenerationProps) {

  const handleAIGenerateBook = async (prompt: string) => {
    if (!book || !bookId) return;
    setIsGeneratingAI(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Please log in to use AI generation.');
      setIsGeneratingAI(false);
      return;
    }

    const creditCheck = await checkAICredits(session.user.id);
    if (!creditCheck.allowed) {
      alert(creditCheck.message);
      setIsGeneratingAI(false);
      return;
    }

    try {
      // 1. Generate content
      const generatedContent = await generateBookContent(
        prompt,
        book.target_pages,
        book.font_size,
        book.trim_size,
        session.access_token
      );

      // 2. Update book prompt and title
      await supabase
        .from('books')
        .update({
          book_prompt: prompt,
          title: generatedContent.title,
        })
        .eq('id', bookId);

      setBook((prev: BookData | null) => prev ? { ...prev, book_prompt: prompt, title: generatedContent.title } : null);

      // 3. Update content states
      const newChapters = convertToChapters(generatedContent);
      setChapters(newChapters);
      setSingleText(convertToSingleText(generatedContent));
      
      // 4. Decrement credits
      await decrementAICredits(session.user.id);

      alert('Book content generated successfully!');
    } catch (error: any) {
      console.error('AI Generation Error:', error);
      alert(`AI Generation Failed: ${error.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGeneratePage = async (pageNumber: number, prompt: string) => {
    if (!book || !bookId) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Please log in to use AI generation.');
      return;
    }

    const creditCheck = await checkAICredits(session.user.id);
    if (!creditCheck.allowed) {
      alert(creditCheck.message);
      return;
    }

    try {
      const pageLimitCheck = await checkPageCreationLimit(session.user.id, bookId);
      if (!pageLimitCheck.allowed) {
        alert(pageLimitCheck.message);
        return;
      }

      const existingPage = pages.find(p => p.pageNumber === pageNumber);
      const activityTypes = existingPage?.activityTypes || ['story']; // Default to story if generating text

      const content = await generatePageContent(
        prompt,
        pageNumber,
        book.target_pages,
        book.font_size,
        session.access_token,
        book.book_prompt || undefined,
        activityTypes
      );

      // Save to DB
      const { error } = await supabase
        .from('book_pages')
        .upsert({
          book_id: bookId,
          page_number: pageNumber,
          content: content,
          activity_type: activityTypes[0] || 'story', // Use first activity type for DB column
          image_url: existingPage?.imageUrl,
        }, { onConflict: 'book_id, page_number' });

      if (error) throw error;

      // Update local state
      setPages(prev => {
        const index = prev.findIndex(p => p.pageNumber === pageNumber);
        const newPage: Page = {
          id: existingPage?.id || `temp-${pageNumber}`,
          pageNumber,
          content,
          imageUrl: existingPage?.imageUrl,
          activityTypes: existingPage?.activityTypes,
        };

        if (index >= 0) {
          const newPages = [...prev];
          newPages[index] = newPage;
          return newPages;
        } else {
          return [...prev, newPage].sort((a, b) => a.pageNumber - b.pageNumber);
        }
      });
      
      // Decrement credits and increment page count
      await decrementAICredits(session.user.id);
      await incrementPageCount(session.user.id);

    } catch (error: any) {
      console.error('Page Generation Error:', error);
      alert(`Page Generation Failed: ${error.message}`);
    }
  };

  const handleGenerateImage = async (pageNumber: number, prompt: string) => {
    if (!book || !bookId) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Please log in to use AI generation.');
      return;
    }

    const creditCheck = await checkAICredits(session.user.id);
    if (!creditCheck.allowed) {
      alert(creditCheck.message);
      return;
    }

    try {
      const existingPage = pages.find(p => p.pageNumber === pageNumber);
      const activityTypes = existingPage?.activityTypes || ['coloring'];
      const tracingWord = activityTypes.includes('tracing') ? prompt.split(' ')[0] : undefined;

      const imageUrl = await generateColoringImage(
        prompt,
        'DALL-E 3',
        bookId,
        session.access_token,
        activityTypes,
        tracingWord
      );

      // Save to DB
      const { error } = await supabase
        .from('book_pages')
        .upsert({
          book_id: bookId,
          page_number: pageNumber,
          image_url: imageUrl,
          content: existingPage?.content || '',
          activity_type: activityTypes[0] || 'coloring',
        }, { onConflict: 'book_id, page_number' });

      if (error) throw error;

      // Update local state
      setPages(prev => {
        const index = prev.findIndex(p => p.pageNumber === pageNumber);
        const newPage: Page = {
          id: existingPage?.id || `temp-${pageNumber}`,
          pageNumber,
          content: existingPage?.content || '',
          imageUrl,
          activityTypes: existingPage?.activityTypes,
        };

        if (index >= 0) {
          const newPages = [...prev];
          newPages[index] = newPage;
          return newPages;
        } else {
          return [...prev, newPage].sort((a, b) => a.pageNumber - b.pageNumber);
        }
      });
      
      // Decrement credits and increment image count
      await decrementAICredits(session.user.id);
      await incrementImageCount(session.user.id);

    } catch (error: any) {
      console.error('Image Generation Error:', error);
      alert(`Image Generation Failed: ${error.message}`);
    }
  };

  return {
    handleAIGenerateBook,
    handleGeneratePage,
    handleGenerateImage,
  };
}