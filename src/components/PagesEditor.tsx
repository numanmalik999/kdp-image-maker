import { useState, useEffect } from 'react';
import { Page, PageActivityType } from '../types';
import { Sparkles, Loader2, Palette, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';

interface PagesEditorProps {
  pages: Page[];
  onChange: (pages: Page[]) => void; // Used to update page content/activities locally
  onGeneratePage: (pageNumber: number, prompt: string) => Promise<void>;
  onGenerateImage: (pageNumber: number, prompt: string) => Promise<void>;
  onEditImage: (pageNumber: number) => void;
  totalPages: number;
  bookPrompt: string;
  currentPageNumber: number;
  onPageChange: (newPageNumber: number) => void;
}

const ACTIVITY_OPTIONS: { value: PageActivityType; label: string }[] = [
  { value: 'coloring', label: 'Coloring Image' },
  { value: 'tracing', label: 'Tracing Text/Image' },
  { value: 'story', label: 'Story Content' },
  { value: 'maze', label: 'Maze Puzzle' },
  { value: 'dot-to-dot', label: 'Dot-to-Dot Puzzle' },
  { value: 'image', label: 'Full Page Image' },
];

export default function PagesEditor({ 
  pages, 
  onChange, 
  onGeneratePage, 
  onGenerateImage, 
  onEditImage, 
  totalPages, 
  bookPrompt,
  currentPageNumber,
  onPageChange,
}: PagesEditorProps) {
  
  const existingPage = pages.find(p => p.pageNumber === currentPageNumber);
  
  const [pagePrompt, setPagePrompt] = useState(bookPrompt);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize prompt based on bookPrompt or existing page data
  useEffect(() => {
    // If the page exists, we might want to load a specific prompt if we stored it, 
    // but for simplicity, we default to bookPrompt for the input field.
    setPagePrompt(bookPrompt);
  }, [bookPrompt, currentPageNumber]);

  const currentPage: Page = existingPage || {
    id: `temp-${currentPageNumber}`,
    pageNumber: currentPageNumber,
    content: '',
    activityTypes: ['coloring'],
  };

  const currentActivities = currentPage.activityTypes || ['coloring'];
  const hasTextActivity = currentActivities.includes('story') || currentActivities.includes('tracing');
  const hasImageActivity = currentActivities.includes('coloring') || currentActivities.includes('maze') || currentActivities.includes('dot-to-dot') || currentActivities.includes('image');

  const updatePageActivities = (activity: PageActivityType) => {
    let newActivities: PageActivityType[];
    
    if (currentActivities.includes(activity)) {
      newActivities = currentActivities.filter(a => a !== activity);
    } else {
      newActivities = [...currentActivities, activity];
    }
    
    if (newActivities.length === 0) {
      newActivities = ['coloring']; // Default fallback
    }

    // Update local page state
    const updatedPages = pages.map(p => 
      p.pageNumber === currentPageNumber ? { ...p, activityTypes: newActivities } : p
    );
    
    if (!existingPage) {
        updatedPages.push({ ...currentPage, activityTypes: newActivities });
    }

    onChange(updatedPages.sort((a, b) => a.pageNumber - b.pageNumber));
  };

  const handleGenerate = async () => {
    const prompt = pagePrompt.trim() || bookPrompt.trim();
    if (!prompt) {
      alert('Please enter a prompt or set a book description in the sidebar.');
      return;
    }

    setIsGenerating(true);
    try {
      // We run both generation types sequentially if both activities are selected
      if (hasTextActivity) {
        await onGeneratePage(currentPageNumber, prompt);
      }
      if (hasImageActivity) {
        await onGenerateImage(currentPageNumber, prompt);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    
    const newPage: Page = {
      ...currentPage,
      content: newContent,
      activityTypes: currentActivities,
    };

    const updatedPages = pages.map(p => 
      p.pageNumber === currentPageNumber ? newPage : p
    );
    
    if (!existingPage) {
        updatedPages.push(newPage);
    }
    
    onChange(updatedPages.sort((a, b) => a.pageNumber - b.pageNumber));
  };

  const handleNext = () => {
    if (currentPageNumber < totalPages) {
      onPageChange(currentPageNumber + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPageNumber > 1) {
      onPageChange(currentPageNumber - 1);
    }
  };

  const renderActivitySelector = () => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type:</label>
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => updatePageActivities(option.value)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              currentActivities.includes(option.value)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={isGenerating}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderPreview = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded-lg">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-lg font-medium text-gray-700">Generating Page {currentPageNumber}...</p>
          <p className="text-sm text-gray-500 mt-1">This may take a moment.</p>
        </div>
      );
    }

    if (currentPage.imageUrl || (currentPage.content && hasTextActivity)) {
      return (
        <div className="h-full overflow-y-auto p-6 bg-white rounded-lg shadow-inner border border-gray-200">
          {currentPage.imageUrl && hasImageActivity && (
            <div className="relative mb-4 border border-gray-300 rounded-lg overflow-hidden">
              <img 
                src={currentPage.imageUrl} 
                alt={`Page ${currentPageNumber} image`} 
                className="w-full h-auto object-contain"
              />
              <button
                onClick={() => onEditImage(currentPageNumber)}
                className="absolute top-2 right-2 p-2 bg-white/80 text-gray-800 rounded-full shadow-md transition-opacity hover:bg-white"
                title="Edit Image"
              >
                <Palette className="w-5 h-5" />
              </button>
            </div>
          )}
          {hasTextActivity && (
            <textarea
              value={currentPage.content}
              onChange={handleContentChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-serif text-base min-h-[200px]"
              rows={10}
              placeholder="Page content..."
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <Pencil className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-medium mb-2">Page {currentPageNumber}: Ready to Generate</h3>
        <p>Enter your prompt and click 'Generate' to begin!</p>
      </div>
    );
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
      {/* Left Sidebar (Controls) */}
      <div className="lg:col-span-1 flex flex-col bg-white p-6 border border-gray-200 rounded-lg shadow-sm overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Page {currentPageNumber} of {totalPages}</h2>

        {renderActivitySelector()}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt for Page {currentPageNumber}
          </label>
          <textarea
            value={pagePrompt}
            onChange={(e) => setPagePrompt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            rows={3}
            placeholder={bookPrompt || "Describe the content or image for this page..."}
            disabled={isGenerating}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || (!pagePrompt.trim() && !bookPrompt.trim())}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Page {currentPageNumber}
            </>
          )}
        </button>

        {/* Navigation */}
        <div className="flex justify-between items-center mb-6 pt-4 border-t border-gray-100">
          <button
            onClick={handlePrevious}
            disabled={currentPageNumber <= 1 || isGenerating}
            className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Page
          </button>
          <div className="text-sm text-gray-600">
            Book Progress: {pages.length} Pages
          </div>
          <button
            onClick={handleNext}
            disabled={currentPageNumber >= totalPages || isGenerating}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Next Page
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Generated Pages History:</h3>
          <p className="text-xs text-gray-500">
            History feature coming soon.
          </p>
        </div>
      </div>

      {/* Right Content Area (Preview) */}
      <div className="lg:col-span-2 h-full flex flex-col">
        {renderPreview()}
      </div>
    </div>
  );
}