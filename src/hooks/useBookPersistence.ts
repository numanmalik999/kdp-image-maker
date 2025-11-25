import { supabase } from '../lib/supabase';
import { BookSettings, Page } from '../types';
import { BookData } from './useBookData';

interface UseBookPersistenceProps {
  bookId: string;
  book: BookData | null;
  pages: Page[];
  setBook: React.Dispatch<React.SetStateAction<BookData | null>>;
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

// Define the necessary type locally to match the caller (BookEditor.tsx)
type EditorTab = 'single' | 'chapters' | 'pages' | 'front_cover' | 'back_cover';

export default function useBookPersistence({
  bookId,
  book,
  pages,
  setBook,
  setPages,
  setIsSaving,
}: UseBookPersistenceProps) {

  const handleSaveSettings = async (newSettings: BookSettings) => {
    if (!bookId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({
          title: newSettings.title,
          author: newSettings.author,
          trim_size: newSettings.trimSize,
          font_size: newSettings.fontSize,
          target_pages: newSettings.targetPages,
        })
        .eq('id', bookId);

      if (error) throw error;
      setBook((prev: BookData | null) => prev ? { ...prev, ...newSettings } : null);
      alert('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePageContent = async (pageNumber: number, content: string, activityTypes: string[]) => {
    if (!bookId) return;
    setIsSaving(true);
    try {
      const existingPage = pages.find(p => p.pageNumber === pageNumber);
      
      const isFrontCover = pageNumber === 0;
      const isBackCover = book && pageNumber === book.target_pages + 1;
      
      const { error } = await supabase
        .from('book_pages')
        .upsert({
          book_id: bookId,
          page_number: pageNumber,
          content: content,
          // Ensure activity_type is set, defaulting to 'story' if array is empty
          activity_type: activityTypes[0] || 'story', 
          image_url: existingPage?.imageUrl,
          is_front_cover: isFrontCover,
          is_back_cover: isBackCover,
        }, { onConflict: 'book_id, page_number' });

      if (error) {
        console.error('Supabase Save Page Error:', error);
        throw error;
      }

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
      
      // If saving a cover for the first time, update book status
      if ((isFrontCover && !book?.has_front_cover) || (isBackCover && !book?.has_back_cover)) {
        const updateData: Partial<BookData> = {};
        if (isFrontCover) updateData.has_front_cover = true;
        if (isBackCover) updateData.has_back_cover = true;
        
        await supabase.from('books').update(updateData).eq('id', bookId);
        setBook((prev: BookData | null) => prev ? { ...prev, ...updateData } as BookData : null);
      }

      alert('Page content saved!');
    } catch (error: any) {
      console.error('Error saving page content:', error);
      alert(`Failed to save page content: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePage = async (pageNumber: number, setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>, setActiveTab: React.Dispatch<React.SetStateAction<EditorTab>>) => {
    if (!bookId) return;
    
    const isFrontCover = pageNumber === 0;
    const isBackCover = book && pageNumber === book.target_pages + 1;
    
    if (!confirm(`Are you sure you want to delete page ${pageNumber}?`)) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('book_pages')
        .delete()
        .eq('book_id', bookId)
        .eq('page_number', pageNumber);

      if (error) throw error;

      // Update local state
      setPages(prev => prev.filter(p => p.pageNumber !== pageNumber));
      
      // If we deleted the current page, move to the previous one (or 1)
      setCurrentPageNumber(prev => Math.max(1, prev - 1));
      
      // If deleting a cover, update book status
      if (isFrontCover || isBackCover) {
        const updateData: Partial<BookData> = {};
        if (isFrontCover) updateData.has_front_cover = false;
        if (isBackCover) updateData.has_back_cover = false;
        
        await supabase.from('books').update(updateData).eq('id', bookId);
        setBook((prev: BookData | null) => prev ? { ...prev, ...updateData } as BookData : null);
        
        // Switch tab back to pages
        setActiveTab('pages');
      }

      alert(`Page ${pageNumber} deleted successfully!`);
    } catch (error: any) {
      console.error('Error deleting page:', error);
      alert('Failed to delete page.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (pageNumber: number, file: File) => {
    if (!bookId) return;
    setIsSaving(true);
    try {
      const filename = `${bookId}/${pageNumber}-${Date.now()}-${file.name}`;

      // 1. Upload the image file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('coloring_images')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError);
        // Throw the specific error message from Supabase
        throw new Error(`Storage Upload Failed: ${uploadError.message}`);
      }

      // 2. Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('coloring_images')
        .getPublicUrl(filename);

      const newImageUrl = publicUrlData.publicUrl;
      const existingPage = pages.find(p => p.pageNumber === pageNumber);
      const activityTypes = existingPage?.activityTypes || ['image'];
      
      const isFrontCover = pageNumber === 0;
      const isBackCover = book && pageNumber === book.target_pages + 1;

      // 3. Update the page in the database
      const { error: dbError } = await supabase
        .from('book_pages')
        .upsert({
          book_id: bookId,
          page_number: pageNumber,
          image_url: newImageUrl,
          content: existingPage?.content || '',
          activity_type: activityTypes[0] || 'image',
          is_front_cover: isFrontCover,
          is_back_cover: isBackCover,
        }, { onConflict: 'book_id, page_number' });

      if (dbError) {
        console.error('Database Update Error:', dbError);
        throw dbError;
      }

      // 4. Update local state
      setPages(prev => {
        const index = prev.findIndex(p => p.pageNumber === pageNumber);
        const newPage: Page = {
          id: existingPage?.id || `temp-${pageNumber}`,
          pageNumber,
          content: existingPage?.content || '',
          imageUrl: newImageUrl,
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
      
      // If saving a cover for the first time, update book status
      if ((isFrontCover && !book?.has_front_cover) || (isBackCover && !book?.has_back_cover)) {
        const updateData: Partial<BookData> = {};
        if (isFrontCover) updateData.has_front_cover = true;
        if (isBackCover) updateData.has_back_cover = true;
        
        await supabase.from('books').update(updateData).eq('id', bookId);
        setBook((prev: BookData | null) => prev ? { ...prev, ...updateData } as BookData : null);
      }

      alert('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Image Upload Error:', error);
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageEditComplete = async (editedImageBlob: Blob, pageNumber: number, setImageToEdit: React.Dispatch<React.SetStateAction<{ src: string; pageNumber: number } | null>>, setIsImageEditorModalOpen: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!bookId) return;
    
    setIsSaving(true);
    try {
      const filename = `${bookId}/${pageNumber}-${Date.now()}.png`;

      // 1. Upload the new image blob to Supabase Storage
      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from('coloring_images')
        .upload(filename, editedImageBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError);
        // Throw the specific error message from Supabase
        throw new Error(`Storage Upload Failed: ${uploadError.message}`);
      }

      // 2. Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('coloring_images')
        .getPublicUrl(filename);

      const newImageUrl = publicUrlData.publicUrl;

      // 3. Update the page in the database
      const { error: dbError } = await supabase
        .from('book_pages')
        .update({ image_url: newImageUrl })
        .eq('book_id', bookId)
        .eq('page_number', pageNumber);

      if (dbError) throw dbError;

      // 4. Update local state
      setPages(prev => prev.map(p => 
        p.pageNumber === pageNumber ? { ...p, imageUrl: newImageUrl } : p
      ));

      alert('Image saved successfully!');
      setIsImageEditorModalOpen(false);
      setImageToEdit(null);
    } catch (error: any) {
      console.error('Image Edit Save Error:', error);
      alert(`Failed to save edited image: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    handleSaveSettings,
    handleSavePageContent,
    handleImageUpload,
    handleDeletePage,
    handleImageEditComplete,
  };
}