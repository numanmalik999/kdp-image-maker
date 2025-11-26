import { supabase } from '../lib/supabase';
import { BookData } from './useBookData';
import { Page, UserAIConfig } from '../types';
import { checkAICredits, decrementAICredits, incrementPageCount, incrementImageCount, checkPageCreationLimit } from '../utils/subscriptionLimits';
import { generatePageContent, generateColoringImage } from '../utils/aiGeneration';

interface UseBookGenerationProps {
  bookId: string;
  book: BookData | null;
  pages: Page[];
  setBook: React.Dispatch<React.SetStateAction<BookData | null>>;
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  setIsGeneratingAI: React.Dispatch<React.SetStateAction<boolean>>;
  aiConfig: UserAIConfig; // New: User's AI configuration
}

export default function useBookGeneration({
  bookId,
  book,
  pages,
  setPages,
  aiConfig,
}: UseBookGenerationProps) {

  const handleGeneratePage = async (pageNumber: number, prompt: string) => {
    if (!book || !bookId) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Please log in to use AI generation.');
      return;
    }
    
    const apiKey = aiConfig.textModel === 'gpt-4o' ? aiConfig.openAIApiKey : aiConfig.geminiApiKey;
    if (!apiKey) {
      alert(`Please configure your ${aiConfig.textModel.toUpperCase()} API Key in the settings modal.`);
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
        apiKey, // Pass API Key
        aiConfig.textModel, // Pass Model
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
    
    const apiKey = aiConfig.openAIApiKey;
    if (!apiKey) {
      alert('Please configure your OpenAI API Key in the settings modal.');
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
        session.access_token,
        apiKey, // Pass API Key
        aiConfig.imageModel, // Pass Model
        bookId,
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
    handleGeneratePage,
    handleGenerateImage,
  };
}