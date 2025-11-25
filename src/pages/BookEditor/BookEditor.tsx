import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Settings, Loader2 } from 'lucide-react';
import EditorArea from '../../components/EditorArea';
import BookSettingsModal from '../../components/BookSettingsModal';
import ExportModal from '../../components/ExportModal';
import ImageEditorModal from '../../components/ImageEditorModal';
import { BookSettings, Page, EditorTab } from '../../types';
import { generatePDF } from '../../utils/pdfGenerator';
import { generateEPUB } from '../../utils/epubGenerator';
import { SUPABASE_URL } from '../../lib/config';

// Import new hooks
import useBookData from '../../hooks/useBookData';
import useBookPersistence from '../../hooks/useBookPersistence';
import useBookGeneration from '../../hooks/useBookGeneration';

export default function BookEditor({ onBack }: { onBack: () => void; }) {
  const { bookId } = useParams<{ bookId: string }>();
  
  // --- UI State Management ---
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('pages');
  const [currentPageNumber, setCurrentPageNumber] = useState(1);

  // Modal states
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImageEditorModalOpen, setIsImageEditorModalOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<{ src: string; pageNumber: number } | null>(null);

  // --- Hooks ---
  const { book, pages, loading, setBook, setPages } = useBookData(bookId, onBack);
  
  const {
    handleSaveSettings,
    handleSavePageContent,
    handleImageUpload,
    handleDeletePage,
    handleImageEditComplete,
  } = useBookPersistence({
    bookId: bookId || '',
    book,
    pages,
    setBook,
    setPages,
    setIsSaving,
  });

  const {
    handleGeneratePage,
    handleGenerateImage,
  } = useBookGeneration({
    bookId: bookId || '',
    book,
    pages,
    setBook,
    setPages,
    setIsGeneratingAI,
  });

  // --- Effects ---
  
  // Set initial page number after book loads
  useEffect(() => {
    if (book && book.target_pages > 0) {
      setCurrentPageNumber(1);
    }
  }, [book]);

  // Handle tab change logic
  const handleTabChange = (tab: EditorTab) => {
    setActiveTab(tab);
    if (book) {
      if (tab === 'front_cover') {
        setCurrentPageNumber(0); // Front cover is page 0
      } else if (tab === 'back_cover') {
        setCurrentPageNumber(book.target_pages + 1); // Back cover is page N+1
      } else if (tab === 'pages') {
        setCurrentPageNumber(1); // Default to first content page
      }
    }
  };

  // --- Content Handlers ---

  const handlePagesChange = (newPages: Page[]) => {
    setPages(newPages);
  };

  // --- Export Handlers ---

  const handleGeneratePDF = async () => {
    if (!book) return;
    setIsExportModalOpen(true);
  };

  const handleExportPDF = async () => {
    if (!book) return;
    setIsExporting(true);
    try {
      await generatePDF(book, pages);
      alert('PDF generation initiated. Check your downloads!');
    } catch (error: any) {
      console.error('PDF Export Error:', error);
      alert('Failed to generate PDF.');
    } finally {
      setIsExporting(false);
      setIsExportModalOpen(false);
    }
  };

  const handleExportEPUB = async () => {
    if (!book) return;
    setIsExporting(true);
    try {
      await generateEPUB(book, pages);
      alert('EPUB generation initiated. Check your downloads!');
    } catch (error: any) {
      console.error('EPUB Export Error:', error);
      alert('Failed to generate EPUB.');
    } finally {
      setIsExporting(false);
      setIsExportModalOpen(false);
    }
  };

  const handleExportKindle = () => {
    alert('Kindle export functionality is not yet implemented.');
    setIsExportModalOpen(false);
  };

  // --- Image Editing ---

  const handleEditImage = (pageNumber: number) => {
    const page = pages.find((p: Page) => p.pageNumber === pageNumber);
    if (page?.imageUrl) {
      // Proxy the image URL through the edge function to avoid CORS issues during canvas manipulation
      const proxiedUrl = `${SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(page.imageUrl)}`;
      setImageToEdit({ src: proxiedUrl, pageNumber });
      setIsImageEditorModalOpen(true);
    } else {
      alert('No image found for this page to edit.');
    }
  };

  // Wrappers to pass modal setters to persistence hook
  const handleImageEditCompleteWrapper = async (editedImageBlob: Blob) => {
    if (!imageToEdit) return;
    await handleImageEditComplete(
      editedImageBlob, 
      imageToEdit.pageNumber, 
      setImageToEdit, 
      setIsImageEditorModalOpen
    );
  };
  
  const handleDeletePageWrapper = async (pageNumber: number) => {
    await handleDeletePage(pageNumber, setCurrentPageNumber, setActiveTab);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!book) {
    return null; // Should be handled by loadBook redirect
  }

  const currentSettings: BookSettings = {
    title: book.title,
    author: book.author || '',
    trimSize: book.trim_size,
    fontSize: book.font_size,
    targetPages: book.target_pages,
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-gray-900 truncate max-w-xs">
            {book.title}
          </h1>
          <span className="text-sm text-gray-500">({book.trim_size})</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <EditorArea
          pages={pages}
          onPagesChange={handlePagesChange}
          onGeneratePage={handleGeneratePage}
          onGenerateImage={handleGenerateImage}
          onEditImage={handleEditImage}
          fontSize={book.font_size}
          onGeneratePDF={handleGeneratePDF}
          isGenerating={isGeneratingAI}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          targetPages={book.target_pages}
          bookPrompt={book.book_prompt || ''}
          currentPageNumber={currentPageNumber}
          onPageChange={setCurrentPageNumber}
          onSavePageContent={handleSavePageContent}
          onImageUpload={handleImageUpload}
          onDeletePage={handleDeletePageWrapper}
          isSaving={isSaving}
        />
      </div>

      <BookSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={currentSettings}
        onSave={handleSaveSettings}
        isSaving={isSaving}
        onInsertSample={() => alert('Sample insertion removed. Use AI generation or manual input.')}
        onAIGenerate={() => alert('Full book AI generation removed. Use page-level generation.')}
        isGeneratingAI={isGeneratingAI}
        bookPrompt={book.book_prompt || ''}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExportPDF={handleExportPDF}
        onExportEPUB={handleExportEPUB}
        onExportKindle={handleExportKindle}
        isExporting={isExporting}
      />

      {isImageEditorModalOpen && imageToEdit && (
        <ImageEditorModal
          isOpen={isImageEditorModalOpen}
          onClose={() => setIsImageEditorModalOpen(false)}
          src={imageToEdit.src}
          onEditComplete={handleImageEditCompleteWrapper}
          isProcessing={isSaving}
        />
      )}
    </div>
  );
}