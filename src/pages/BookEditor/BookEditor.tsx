import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Settings, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import EditorArea from '../../components/EditorArea';
import Sidebar from '../../components/Sidebar';
import BookSettingsModal from '../../components/BookSettingsModal';
import ExportModal from '../../components/ExportModal';
import ImageEditorModal from '../../components/ImageEditorModal';
import { BookSettings, Chapter, Page, TrimSize, FontSize } from '../../types';
import { SAMPLE_CHAPTERS, SAMPLE_SINGLE_TEXT } from '../../utils/sampleContent';
import { generateBookContent, convertToChapters, convertToSingleText, generatePageContent, generateColoringImage } from '../../utils/aiGeneration';
import { checkAICredits, decrementAICredits, incrementPageCount, incrementImageCount, checkPageCreationLimit } from '../../utils/subscriptionLimits';
import { generatePDF } from '../../utils/pdfGenerator';
import { generateEPUB } from '../../utils/epubGenerator';
import { SUPABASE_URL } from '../../lib/config'; // Import SUPABASE_URL

// Define the structure of the book data fetched from Supabase
interface BookData {
  id: string;
  title: string;
  author: string | null;
  trim_size: TrimSize;
  font_size: FontSize;
  target_pages: number;
  status: 'draft' | 'generating' | 'complete';
  book_prompt: string | null;
  pages: Page[];
}

export default function BookEditor({ onBack }: { onBack: () => void; }) {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Corrected initialization
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'chapters' | 'pages'>('pages');
  
  // Content states
  const [singleText, setSingleText] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [pages, setPages] = useState<Page[]>([]);

  // Modal states
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImageEditorModalOpen, setIsImageEditorModalOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<{ src: string; pageNumber: number } | null>(null);

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
        onBack();
        return;
      }

      setBook(bookData);
      setPages(bookData.pages || []);
      
      // Initialize content based on the active tab (defaulting to pages for coloring books)
      // For simplicity, we won't try to reconstruct chapters/single text from pages yet.
      // We assume the primary editing mode is 'pages'.
      
    } catch (error: any) {
      console.error('Error loading book:', error);
      alert('Failed to load book data.');
    } finally {
      setLoading(false);
    }
  }, [bookId, onBack]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  // --- Settings & Persistence ---

  const handleSettingsChange = (newSettings: BookSettings) => {
    if (book) {
      setBook(prev => prev ? { ...prev, ...newSettings } : null);
    }
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
          target_pages: newSettings.targetPages,
        })
        .eq('id', bookId);

      if (error) throw error;
      setBook(prev => prev ? { ...prev, ...newSettings } : null);
      setIsSettingsModalOpen(false);
      alert('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- AI Generation ---

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

      setBook(prev => prev ? { ...prev, book_prompt: prompt, title: generatedContent.title } : null);

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

  // --- Content Handlers ---

  const handlePagesChange = (newPages: Page[]) => {
    setPages(newPages);
    // Note: Persistence to DB for individual page edits is handled within PagesEditor or on final export/save.
    // For now, we rely on the AI generation functions to handle DB upserts.
  };

  const handleInsertSample = () => {
    setChapters(SAMPLE_CHAPTERS);
    setSingleText(SAMPLE_SINGLE_TEXT);
    setActiveTab('chapters');
    alert('Sample story inserted into Chapters tab.');
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
      // Ensure all pages are saved to the DB before generating PDF
      // (Skipping complex DB sync for now, relying on current state)
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
    const page = pages.find(p => p.pageNumber === pageNumber);
    if (page?.imageUrl) {
      // Proxy the image URL through the edge function to avoid CORS issues during canvas manipulation
      const proxiedUrl = `${SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(page.imageUrl)}`;
      setImageToEdit({ src: proxiedUrl, pageNumber });
      setIsImageEditorModalOpen(true);
    } else {
      alert('No image found for this page to edit.');
    }
  };

  const handleImageEditComplete = async (editedImageBlob: Blob) => {
    if (!imageToEdit || !bookId) return;
    
    setIsSaving(true);
    try {
      const pageNumber = imageToEdit.pageNumber;
      const filename = `${bookId}/${pageNumber}-${Date.now()}.png`;

      // 1. Upload the new image blob to Supabase Storage
      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from('coloring_images')
        .upload(filename, editedImageBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

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
      alert('Failed to save edited image.');
    } finally {
      setIsSaving(false);
    }
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        settings={currentSettings}
        onSettingsChange={handleSettingsChange}
        onInsertSample={handleInsertSample}
        onAIGenerate={handleAIGenerateBook}
        isGeneratingAI={isGeneratingAI}
      />

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

        <EditorArea
          singleText={singleText}
          onSingleTextChange={setSingleText}
          chapters={chapters}
          onChaptersChange={setChapters}
          pages={pages}
          onPagesChange={handlePagesChange}
          onGeneratePage={handleGeneratePage}
          onGenerateImage={handleGenerateImage}
          onEditImage={handleEditImage}
          fontSize={book.font_size}
          onGeneratePDF={handleGeneratePDF}
          isGenerating={isGeneratingAI}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          targetPages={book.target_pages}
          bookPrompt={book.book_prompt || ''}
        />
      </div>

      <BookSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={currentSettings}
        onSave={handleSaveSettings}
        isSaving={isSaving}
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
          onEditComplete={handleImageEditComplete}
          isProcessing={isSaving}
        />
      )}
    </div>
  );
}