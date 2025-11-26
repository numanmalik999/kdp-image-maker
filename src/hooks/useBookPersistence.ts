import { supabase } from '../lib/supabase';
import { BookSettings, Page, PageActivityType, EditorTab } from '../types';
import { BookData } from './useBookData';

interface UseBookPersistenceProps {
  bookId: string;
  book: BookData | null;
  pages: Page[];
  setBook: React.Dispatch<React.SetStateAction<BookData | null>>;
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function useBookPersistence({
  bookId,
  book,
  pages,
  setBook,
  setPages,
  setIsSaving,
}: UseBookPersistenceProps) {
  
  // Helper function to get the highest content page number
  const getMaxContentPageNumber = (currentPages: Page[]): number => {
    const contentPages = currentPages.filter(p => p.pageNumber > 0);
    if (contentPages.length === 0) return 0;
    return Math.max(...contentPages.map(p => p.pageNumber));
  };

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
          // target_pages is ignored here as pages are dynamic
          has_front_cover: newSettings.hasFrontCover,
          has_back_cover: newSettings.hasBackCover,
        })
        .eq('id', bookId);

      if (error) throw error;
      
      // Update local state with all new settings
      setBook((prev: BookData | null) => prev ? { 
        ...prev, 
        ...newSettings,
        has_front_cover: newSettings.hasFrontCover,
        has_back_cover: newSettings.hasBackCover,
      } : null);
      
      alert('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSavePageContent = async (pageNumber: number, content: string, activityTypes: PageActivityType[]) => {
    if (!bookId) return;
    setIsSaving(true);
    try {
      const maxContentPage = getMaxContentPageNumber(pages);
      
      const isFrontCover = pageNumber === 0;
      // Back cover is now defined as maxContentPage + 1 if hasBackCover is true
      const isBackCover = book?.has_back_cover && pageNumber === maxContentPage + 1;
      
      // Find the latest state of the page from the hook's props
      const existingPage = pages.find(p => p.pageNumber === pageNumber);
      
      // CRITICAL: Get the image URL from the current local state, which was updated by handleImageUpload
      const imageUrlToSave = existingPage?.imageUrl || null; 
      
      console.log(`[SavePage] Page ${pageNumber} - Image URL to save:`, imageUrlToSave);

      const { data: savedPage, error } = await supabase
        .from('book_pages')
        .upsert({
          book_id: bookId,
          page_number: pageNumber,
          content: content,
          // Use the activityTypes passed from the editor, defaulting if empty
          activity_type: activityTypes[0] || 'story', 
          image_url: imageUrlToSave, // Explicitly set the image URL
          is_front_cover: isFrontCover,
          is_back_cover: isBackCover,
        }, { onConflict: 'book_id, page_number' })
        .select()
        .single();

      if (error) {
        console.error('Supabase Save Page Error:', error);
        throw error;
      }

      // Since the DB operation succeeded, we ensure the local state is fully consistent
      // by updating the page record with all the saved data.
      setPages(prev => {
        const index = prev.findIndex(p => p.pageNumber === pageNumber);
        const newPage: Page = {
          id: savedPage.id,
          pageNumber,
          content,
          imageUrl: imageUrlToSave || undefined, // Use the saved URL
          activityTypes: activityTypes,
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

      alert('Page saved successfully!');
    } catch (error: any) {
      console.error('Error saving page content:', error);
      alert(`Failed to save page: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertPage = async (insertionPoint: number, setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>) => {
    if (!bookId) return;
    setIsSaving(true);
    try {
      // 1. Shift pages in the database (increment page_number by 1)
      const { error: shiftError } = await supabase.rpc('shift_book_pages', {
        book_id_param: bookId,
        start_page_param: insertionPoint,
      });
      
      if (shiftError) {
        throw shiftError;
      }
      
      // 2. Insert the new page at the insertion point
      const { data: newPageData, error: insertError } = await supabase
        .from('book_pages')
        .insert({
          book_id: bookId,
          page_number: insertionPoint,
          content: '',
          activity_type: 'coloring',
          image_url: null,
        })
        .select()
        .single();
        
      if (insertError) throw insertError;

      // 3. Update local state
      const newPage: Page = {
        id: newPageData.id,
        pageNumber: insertionPoint,
        content: '',
        imageUrl: undefined,
        activityTypes: ['coloring'],
      };
      
      // Update existing pages locally by shifting them
      const shiftedPages = pages.map(p => 
        p.pageNumber >= insertionPoint && p.pageNumber > 0 ? { ...p, pageNumber: p.pageNumber + 1 } : p
      );
      
      setPages([...shiftedPages, newPage].sort((a, b) => a.pageNumber - b.pageNumber));
      setCurrentPageNumber(insertionPoint);

      alert(`Page inserted successfully at position ${insertionPoint}!`);
    } catch (error: any) {
      console.error('Error inserting page:', error);
      alert(`Failed to insert page: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePage = async (pageNumber: number, setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>, setActiveTab: React.Dispatch<React.SetStateAction<EditorTab>>) => {
    if (!bookId) return;
    
    const maxContentPage = getMaxContentPageNumber(pages);
    const isFrontCover = pageNumber === 0;
    const isBackCover = book?.has_back_cover && pageNumber === maxContentPage + 1;
    
    if (!confirm(`Are you sure you want to delete page ${pageNumber}? This cannot be undone.`)) return;

    setIsSaving(true);
    try {
      // 1. Delete the page
      const { error: deleteError } = await supabase
        .from('book_pages')
        .delete()
        .eq('book_id', bookId)
        .eq('page_number', pageNumber);

      if (deleteError) throw deleteError;
      
      // 2. Shift subsequent pages down (pageNumber > pageNumber)
      if (pageNumber > 0 && pageNumber <= maxContentPage) {
        const { error: shiftError } = await supabase.rpc('unshift_book_pages', {
          book_id_param: bookId,
          start_page_param: pageNumber,
        });
        if (shiftError) throw shiftError;
      }

      // 3. Update local state
      let newPages = pages.filter(p => p.pageNumber !== pageNumber);
      
      // Shift pages locally
      newPages = newPages.map(p => 
        p.pageNumber > pageNumber && p.pageNumber > 0 ? { ...p, pageNumber: p.pageNumber - 1 } : p
      );
      
      setPages(newPages.sort((a, b) => a.pageNumber - b.pageNumber));
      
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
        throw new Error(`Storage Upload Failed: ${uploadError.message}`);
      }

      // 2. Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('coloring_images')
        .getPublicUrl(filename);

      const newImageUrl = publicUrlData.publicUrl;
      
      // Find the current page state to get the latest content and activity types
      const currentPageState = pages.find(p => p.pageNumber === pageNumber);
      const activityTypes = currentPageState?.activityTypes || ['image'];
      
      // 3. Update the page in the database immediately (CRITICAL for persistence)
      const { data: savedPage, error: dbError } = await supabase
        .from('book_pages')
        .upsert({
          book_id: bookId,
          page_number: pageNumber,
          image_url: newImageUrl,
          content: currentPageState?.content || '',
          activity_type: activityTypes[0] || 'image',
        }, { onConflict: 'book_id, page_number' })
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. Update local state with the new image URL and ID
      setPages(prev => {
        const index = prev.findIndex(p => p.pageNumber === pageNumber);
        const newPage: Page = {
          id: savedPage.id, // Use the ID returned from the DB
          pageNumber,
          content: currentPageState?.content || '',
          imageUrl: newImageUrl,
          activityTypes: activityTypes,
        };

        if (index >= 0) {
          const newPages = [...prev];
          newPages[index] = newPage;
          return newPages;
        } else {
          return [...prev, newPage].sort((a, b) => a.pageNumber - b.pageNumber);
        }
      });
      
      alert('Image uploaded and saved successfully!');

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

      // 3. Update the page in the database (Immediate persistence for image editing)
      const { data: savedPage, error: dbError } = await supabase
        .from('book_pages')
        .update({ image_url: newImageUrl })
        .eq('book_id', bookId)
        .eq('page_number', pageNumber)
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. Update local state
      setPages(prev => prev.map(p => 
        p.pageNumber === pageNumber ? { ...p, imageUrl: newImageUrl, id: savedPage.id } : p
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
  
  const handleSaveBookPrompt = async (prompt: string) => {
    if (!bookId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({ book_prompt: prompt })
        .eq('id', bookId);

      if (error) throw error;
      setBook((prev: BookData | null) => prev ? { ...prev, book_prompt: prompt } : null);
    } catch (error: any) {
      console.error('Error saving book prompt:', error);
      // Do not alert user on simple prompt typing save failure, just log
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
    handleSaveBookPrompt,
    handleInsertPage, // Export new function
  };
}