import { useState, useEffect } from 'react';
import { Page } from '../../types';
import { generateColoringImage } from '../../utils/aiGeneration';
import { supabase, Book } from '../../lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import SinglePageEditor from '../../components/SinglePageEditor';
import ExportModal from '../../components/ExportModal';
import { generatePDF } from '../../utils/pdfGenerator';
import { checkAICredits, decrementAICredits, incrementImageCount, checkPageCreationLimit, incrementPageCount } from '../../utils/subscriptionLimits';

interface BookEditorProps {
  bookId: string;
  onBack: () => void;
}

type ViewMode = 'page' | 'front-cover' | 'back-cover';

export default function BookEditor({ bookId, onBack }: BookEditorProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [frontCover, setFrontCover] = useState<Page | null>(null);
  const [backCover, setBackCover] = useState<Page | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('page');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadBook();
  }, [bookId]);

  const loadBook = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (error) throw error;
      if (data) {
        setBook(data);
        await loadBookPages();
      }
    } catch (error) {
      console.error('Error loading book:', error);
      alert('Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  const loadBookPages = async () => {
    try {
      const { data, error } = await supabase
        .from('book_pages')
        .select('*')
        .eq('book_id', bookId)
        .order('page_number', { ascending: true });

      if (error) throw error;
      if (data) {
        const loadedPages: Page[] = [];
        let front: Page | null = null;
        let back: Page | null = null;

        data.forEach(p => {
          const page: Page = {
            id: p.id,
            pageNumber: p.page_number,
            content: p.content || '',
            imageUrl: p.image_url || undefined,
          };

          if (p.is_front_cover) {
            front = page;
          } else if (p.is_back_cover) {
            back = page;
          } else {
            loadedPages.push(page);
          }
        });

        setPages(loadedPages);
        setFrontCover(front);
        setBackCover(back);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
    }
  };

  const handleGeneratePage = async (pageNumber: number, activityType: string, prompt: string, model: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const creditsCheck = await checkAICredits(user.id);
      if (!creditsCheck.allowed) {
        alert(creditsCheck.message);
        return;
      }

      const pageCheck = await checkPageCreationLimit(user.id, bookId);
      if (!pageCheck.allowed) {
        alert(pageCheck.message);
        return;
      }

      const fullPrompt = `${activityType}: ${prompt}`;
      const imageUrl = await generateColoringImage(fullPrompt, model, bookId);

      await decrementAICredits(user.id);
      await incrementImageCount(user.id);
      await incrementPageCount(user.id);

      const updatedPages = [...pages];
      const pageIndex = updatedPages.findIndex(p => p.pageNumber === pageNumber);

      if (pageIndex >= 0) {
        updatedPages[pageIndex] = {
          ...updatedPages[pageIndex],
          imageUrl,
          content: prompt
        };
      } else {
        updatedPages.push({
          id: `page-${pageNumber}`,
          pageNumber,
          content: prompt,
          imageUrl,
        });
      }

      updatedPages.sort((a, b) => a.pageNumber - b.pageNumber);
      setPages(updatedPages);

      setToastMessage(`Page ${pageNumber} generated successfully!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error('Error generating page:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate page. Please try again.';
      alert(errorMessage);
      throw error;
    }
  };

  const handleGenerateCover = async (type: 'front' | 'back', activityType: string, prompt: string, model: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const creditsCheck = await checkAICredits(user.id);
      if (!creditsCheck.allowed) {
        alert(creditsCheck.message);
        return;
      }

      const fullPrompt = `${activityType}: ${prompt}`;
      const imageUrl = await generateColoringImage(fullPrompt, model);

      await decrementAICredits(user.id);
      await incrementImageCount(user.id);

      const coverPage: Page = {
        id: `${type}-cover`,
        pageNumber: type === 'front' ? 0 : -1,
        content: prompt,
        imageUrl,
      };

      if (type === 'front') {
        setFrontCover(coverPage);
        await updateBookCoverStatus('front', true);
      } else {
        setBackCover(coverPage);
        await updateBookCoverStatus('back', true);
      }

      setToastMessage(`${type === 'front' ? 'Front' : 'Back'} cover generated successfully!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error('Error generating cover:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate cover. Please try again.';
      alert(errorMessage);
      throw error;
    }
  };

  const updateBookCoverStatus = async (type: 'front' | 'back', status: boolean) => {
    try {
      const field = type === 'front' ? 'has_front_cover' : 'has_back_cover';
      const { error } = await supabase
        .from('books')
        .update({ [field]: status })
        .eq('id', bookId);

      if (error) throw error;

      setBook(prev => prev ? { ...prev, [field]: status } : null);
    } catch (error) {
      console.error('Error updating cover status:', error);
    }
  };

  const saveBook = async () => {
    try {
      setSaving(true);

      const { error: deleteError } = await supabase
        .from('book_pages')
        .delete()
        .eq('book_id', bookId)
        .eq('is_front_cover', false)
        .eq('is_back_cover', false);

      if (deleteError) throw deleteError;

      for (const page of pages) {
        if (page.content || page.imageUrl) {
          const { error: pageError } = await supabase
            .from('book_pages')
            .insert({
              book_id: bookId,
              page_number: page.pageNumber,
              content: page.content,
              image_url: page.imageUrl || null,
              is_front_cover: false,
              is_back_cover: false,
            });

          if (pageError) throw pageError;
        }
      }

      if (frontCover) {
        const { error: frontError } = await supabase
          .from('book_pages')
          .upsert({
            book_id: bookId,
            page_number: 0,
            content: frontCover.content,
            image_url: frontCover.imageUrl || null,
            is_front_cover: true,
            is_back_cover: false,
          }, {
            onConflict: 'book_id,page_number'
          });

        if (frontError) throw frontError;
      }

      if (backCover) {
        const { error: backError } = await supabase
          .from('book_pages')
          .upsert({
            book_id: bookId,
            page_number: -1,
            content: backCover.content,
            image_url: backCover.imageUrl || null,
            is_front_cover: false,
            is_back_cover: true,
          }, {
            onConflict: 'book_id,page_number'
          });

        if (backError) throw backError;
      }

      setToastMessage('Book saved successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error('Error saving book:', error);
      alert('Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < (book?.target_pages || 1)) {
      setCurrentPage(prev => prev + 1);
      setViewMode('page');
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      setViewMode('page');
    }
  };

  const handleUpdateContent = (content: string) => {
    if (viewMode === 'front-cover' && frontCover) {
      setFrontCover({ ...frontCover, content });
    } else if (viewMode === 'back-cover' && backCover) {
      setBackCover({ ...backCover, content });
    } else {
      const updatedPages = [...pages];
      const pageIndex = updatedPages.findIndex(p => p.pageNumber === currentPage);
      if (pageIndex >= 0) {
        updatedPages[pageIndex] = { ...updatedPages[pageIndex], content };
        setPages(updatedPages);
      }
    }
  };

  const handleSwitchToFrontCover = () => {
    setViewMode('front-cover');
  };

  const handleSwitchToBackCover = () => {
    setViewMode('back-cover');
  };

  const handleAddNewPage = async () => {
    if (!book) return;

    const newPageNumber = book.target_pages + 1;

    try {
      const { error } = await supabase
        .from('books')
        .update({ target_pages: newPageNumber })
        .eq('id', bookId);

      if (error) throw error;

      setBook({ ...book, target_pages: newPageNumber });
      setCurrentPage(newPageNumber);

      setToastMessage(`Page ${newPageNumber} added successfully!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error('Error adding new page:', error);
      alert('Failed to add new page');
    }
  };

  const handleInsertPageAfter = async () => {
    if (!book) return;

    const insertAfter = currentPage;
    const newTotalPages = book.target_pages + 1;

    try {
      const updatedPages = pages.map(page => {
        if (page.pageNumber > insertAfter) {
          return { ...page, pageNumber: page.pageNumber + 1 };
        }
        return page;
      });

      setPages(updatedPages);

      const { error } = await supabase
        .from('books')
        .update({ target_pages: newTotalPages })
        .eq('id', bookId);

      if (error) throw error;

      setBook({ ...book, target_pages: newTotalPages });
      setCurrentPage(insertAfter + 1);

      setToastMessage(`New page inserted after page ${insertAfter}!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error('Error inserting page:', error);
      alert('Failed to insert page');
    }
  };

  const handleCompleteBook = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to complete this book? This will save your progress and prepare it for export.'
    );

    if (!confirmed) return;

    await saveBook();

    try {
      const { error } = await supabase
        .from('books')
        .update({ status: 'completed' })
        .eq('id', bookId);

      if (error) throw error;

      if (book) {
        setBook({ ...book, status: 'completed' });
      }

      setShowExportModal(true);
    } catch (error) {
      console.error('Error marking book as completed:', error);
      alert('Failed to mark book as completed');
    }
  };

  const handleExportPDF = async () => {
    if (!book) return;

    setIsExporting(true);
    try {
      const allPages = [
        ...(frontCover ? [frontCover] : []),
        ...pages.sort((a, b) => a.pageNumber - b.pageNumber),
        ...(backCover ? [backCover] : []),
      ];

      await generatePDF(book, allPages);

      setToastMessage('PDF downloaded successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setShowExportModal(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportEPUB = () => {
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

  const getCurrentPageData = () => {
    if (viewMode === 'front-cover') {
      return {
        content: frontCover?.content || '',
        imageUrl: frontCover?.imageUrl,
        isFrontCover: true,
        isBackCover: false,
      };
    }

    if (viewMode === 'back-cover') {
      return {
        content: backCover?.content || '',
        imageUrl: backCover?.imageUrl,
        isFrontCover: false,
        isBackCover: true,
      };
    }

    const page = pages.find(p => p.pageNumber === currentPage);
    return {
      content: page?.content || '',
      imageUrl: page?.imageUrl,
      isFrontCover: false,
      isBackCover: false,
    };
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Book not found</p>
          <button onClick={onBack} className="text-blue-600 hover:underline">
            Go back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const { content, imageUrl, isFrontCover, isBackCover } = getCurrentPageData();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <h1 className="text-lg font-semibold text-gray-900">{book.title}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <SinglePageEditor
          currentPage={currentPage}
          totalPages={book.target_pages}
          pageContent={content}
          pageImage={imageUrl}
          bookPrompt={book.book_prompt || ''}
          hasFrontCover={book.has_front_cover}
          hasBackCover={book.has_back_cover}
          isFrontCover={isFrontCover}
          isBackCover={isBackCover}
          onGeneratePage={handleGeneratePage}
          onGenerateCover={handleGenerateCover}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
          onSaveBook={saveBook}
          onUpdateContent={handleUpdateContent}
          onSwitchToFrontCover={handleSwitchToFrontCover}
          onAddNewPage={handleAddNewPage}
          onInsertPageAfter={handleInsertPageAfter}
          onSwitchToBackCover={handleSwitchToBackCover}
          onCompleteBook={handleCompleteBook}
          isSaving={saving}
        />
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportPDF={handleExportPDF}
        onExportEPUB={handleExportEPUB}
        onExportKindle={handleExportKindle}
        isExporting={isExporting}
      />

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
