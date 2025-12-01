import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Settings, Loader2 } from 'lucide-react';
import EditorArea from '../../components/EditorArea';
import BookSettingsModal from '../../components/BookSettingsModal';
import ExportModal from '../../components/ExportModal';
import ImageEditorModal from '../../components/ImageEditorModal';
import AIConfigModal from '../../components/AIConfigModal'; // Import new modal
import { BookSettings, Page, EditorTab, UserAIConfig } from '../../types';
import { generatePDF } from '../../utils/pdfGenerator';
import { generateEPUB } from '../../utils/epubGenerator';
import { SUPABASE_URL } from '../../lib/config';
import { generateBookContent } from '../../utils/aiGeneration';
import { supabase } from '../../lib/supabase';

// Import new hooks
import useBookData from '../../hooks/useBookData';
import useBookPersistence from '../../hooks/useBookPersistence';
import useBookGeneration from '../../hooks/useBookGeneration';

const AI_CONFIG_KEY = 'kdp_ai_config';

const loadAIConfig = (): UserAIConfig => {
  if (typeof window !== 'undefined') {
    const storedConfig = localStorage.getItem(AI_CONFIG_KEY);
    if (storedConfig) {
      try {
        return JSON.parse(storedConfig);
      } catch (e) {
        console.error("Failed to parse AI config from local storage", e);
      }
    }
  }
  return {
    openAIApiKey: '',
    geminiApiKey: '',
    textModel: 'gpt-4o',
    imageModel: 'dall-e-3',
  };
};

// Helper function to get the highest content page number
const getMaxContentPageNumber = (currentPages: Page[]): number => {
    const contentPages = currentPages.filter(p => p.pageNumber > 0);
    if (contentPages.length === 0) return 0;
    return Math.max(...contentPages.map(p => p.pageNumber));
};


export default function BookEditor({ onBack }: { onBack: () => void; }) {
  const { bookId } = useParams<{ bookId: string }>();
  
  // --- AI Configuration State ---
  const [aiConfig, setAiConfig] = useState<UserAIConfig>(loadAIConfig);

  const updateAIConfig = useCallback((newConfig: UserAIConfig) => {
    setAiConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(newConfig));
    }
  }, []);
  
  // --- UI State Management ---
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('pages');
  const [currentPageNumber, setCurrentPageNumber] = useState(1);

  // Modal states
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImageEditorModalOpen, setIsImageEditorModal] = useState(false);
  const [isAIConfigModalOpen, setIsAIConfigModalOpen] = useState(false); // New state
  const [imageToEdit, setImageToEdit] = useState<{ src: string; pageNumber: number } | null>(null);

  // --- Hooks ---
  const { book, pages, loading, setBook, setPages } = useBookData(bookId, onBack);
  
  const {
    handleSaveSettings,
    handleSavePageContent,
    handleImageUpload,
    handleDeletePage,
    handleImageEditComplete,
    handleSaveBookPrompt,
    handleInsertPage, // New
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
    aiConfig, // Pass config to generation hook
  });

  // --- Effects ---
  
  // Set initial page number after book loads
  useEffect(() => {
    if (book) {
      // Ensure we are on a valid page number (1 or higher if pages exist)
      const maxPage = getMaxContentPageNumber(pages);
      // If maxPage is 0 (only covers exist), default to page 1. Otherwise, stay on current page or default to 1.
      setCurrentPageNumber(prev => {
        if (prev === 0 || prev === maxPage + 1) {
          return 1; // If we were on a cover, switch to page 1
        }
        return Math.max(1, prev);
      });
    }
  }, [book, pages]);

  // Handle tab change logic
  const handleTabChange = (tab: EditorTab) => {
    setActiveTab(tab);
    const maxPage = getMaxContentPageNumber(pages);
    if (tab === 'front_cover') {
      setCurrentPageNumber(0); // Front cover is page 0
    } else if (tab === 'back_cover') {
      setCurrentPageNumber(maxPage + 1); // Back cover is max content page + 1
    } else if (tab === 'pages') {
      setCurrentPageNumber(1); // Default to first content page
    }
  };

  // --- AI Content Handlers (Full Book) ---
  
  const handleAIGenerateBook = async (prompt: string) => {
    if (!book || !bookId) return;
    
    if (!aiConfig.openAIApiKey) {
      alert('Please configure your OpenAI API Key in the settings modal under "AI Generation" -> "API Keys & Models".');
      return;
    }
    
    setIsGeneratingAI(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Please log in to use AI generation.');
      setIsGeneratingAI(false);
      return;
    }

    try {
      // 1. Generate content (primarily for title/structure context)
      // We use a placeholder targetPages (100) for the AI prompt context, 
      // as the actual page count is now dynamic.
      const generatedContent = await generateBookContent(
        prompt,
        100, // Placeholder for AI context
        book.font_size,
        book.trim_size,
        session.access_token,
        aiConfig.openAIApiKey, // Pass API Key
        aiConfig.textModel // Pass Model
      );

      // 2. Update book prompt and title in DB
      await handleSaveBookPrompt(prompt);
      
      // 3. Update book title locally (since handleSaveBookPrompt doesn't update title)
      setBook(prev => prev ? { ...prev, title: generatedContent.title } : null);

      alert('Book content generated successfully! Now use the Pages tab to generate individual pages.');
    } catch (error: any) {
      console.error('AI Generation Error:', error);
      alert(`AI Generation Failed: ${error.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };
  
  const handleInsertSample = () => {
    if (!book) return;
    const samplePrompt = "A children's story about a brave puppy who saves his town";
    
    // 1. Save sample prompt to DB
    handleSaveBookPrompt(samplePrompt);
    
    // 2. Update book title locally
    setBook(prev => prev ? { ...prev, title: 'The Magic Garden (Sample)', book_prompt: samplePrompt } : null);
    
    alert('Sample prompt inserted. Now go to the Pages tab and click "Generate Page" to create content based on the sample story.');
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

  // Removed handleExportKindle

  // --- Image Editing ---

  const handleEditImage = (pageNumber: number) => {
    const page = pages.find((p: Page) => p.pageNumber === pageNumber);
    if (page?.imageUrl) {
      // Proxy the image URL through the edge function to avoid CORS issues during canvas manipulation
      const proxiedUrl = `${SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(page.imageUrl)}`;
      setImageToEdit({ src: proxiedUrl, pageNumber });
      setIsImageEditorModal(true);
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
      setIsImageEditorModal
    );
  };
  
  const handleDeletePageWrapper = async (pageNumber: number) => {
    await handleDeletePage(pageNumber, setCurrentPageNumber, setActiveTab);
  };
  
  const handleInsertPageWrapper = async (insertionPoint: number) => {
    await handleInsertPage(insertionPoint, setCurrentPageNumber);
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

  const maxContentPage = getMaxContentPageNumber(pages);
  
  const currentSettings: BookSettings = {
    title: book.title,
    author: book.author || '',
    trimSize: book.trim_size,
    fontSize: book.font_size,
    hasFrontCover: book.has_front_cover,
    hasBackCover: book.has_back_cover,
  };

  return (
    <div className="flex h-screen"> {/* Removed overflow-hidden */}
      
      <div className="flex-1 flex flex-col overflow-hidden">
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
            maxContentPage={maxContentPage} // Pass max content page count
            bookPrompt={book.book_prompt || ''}
            currentPageNumber={currentPageNumber}
            onPageChange={setCurrentPageNumber}
            onSavePageContent={handleSavePageContent}
            onImageUpload={handleImageUpload}
            onDeletePage={handleDeletePageWrapper}
            onInsertPage={handleInsertPageWrapper} // Pass new handler
            isSaving={isSaving}
            // Pass AI Config and Modal Opener down
            aiConfig={aiConfig}
            onOpenAIConfigModal={() => setIsAIConfigModalOpen(true)}
          />
        </div>
      </div>

      <BookSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={currentSettings}
        onSave={handleSaveSettings}
        isSaving={isSaving}
        // Pass AI props to the modal
        bookPrompt={book.book_prompt || ''}
        onAIGenerate={handleAIGenerateBook}
        isGeneratingAI={isGeneratingAI}
        onInsertSample={handleInsertSample}
        onUpdateBookPrompt={handleSaveBookPrompt}
        // New AI Config Props
        aiConfig={aiConfig}
        onUpdateAIConfig={updateAIConfig}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExportPDF={handleExportPDF}
        onExportEPUB={handleExportEPUB}
        isExporting={isExporting}
      />

      {isImageEditorModalOpen && imageToEdit && (
        <ImageEditorModal
          isOpen={isImageEditorModalOpen}
          onClose={() => setIsImageEditorModal(false)}
          src={imageToEdit.src}
          onEditComplete={handleImageEditCompleteWrapper}
          isProcessing={isSaving}
        />
      )}
      
      {isAIConfigModalOpen && (
        <AIConfigModal
          isOpen={isAIConfigModalOpen}
          onClose={() => setIsAIConfigModalOpen(false)}
          aiConfig={aiConfig}
          onUpdateAIConfig={updateAIConfig}
        />
      )}
    </div>
  );
}