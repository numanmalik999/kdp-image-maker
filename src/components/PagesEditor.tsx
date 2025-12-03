import { useState, useEffect, useRef } from 'react';
import { Page, PageActivityType, UserAIConfig } from '../types';
import { Sparkles, Loader2, Palette, ChevronLeft, ChevronRight, Pencil, Save, Upload, Trash2, Plus, Key, Image, X } from 'lucide-react';

interface PagesEditorProps {
  pages: Page[];
  onChange: (pages: Page[]) => void; // Used to update page content/activities locally
  onGeneratePage: (pageNumber: number, prompt: string) => Promise<void>;
  onGenerateImage: (pageNumber: number, prompt: string) => Promise<void>;
  onEditImage: (pageNumber: number) => void;
  bookPrompt: string;
  currentPageNumber: number;
  onPageChange: (newPageNumber: number) => void;
  onSavePageContent: (pageNumber: number, content: string, activityTypes: PageActivityType[]) => Promise<void>;
  onImageUpload: (pageNumber: number, file: File) => Promise<void>;
  onDeletePage: (pageNumber: number) => Promise<void>;
  onInsertPage: (insertionPoint: number) => Promise<void>; // New
  isSaving: boolean;
  isCoverPage: boolean;
  maxContentPage: number; // Max content page number (highest pageNumber > 0)
  // New Props
  aiConfig: UserAIConfig;
  onOpenAIConfigModal: () => void;
  // Reference Image Props
  referenceImageUrl?: string;
  onReferenceImageUpload: (file: File) => Promise<void>;
  onClearReferenceImage: () => void;
  isUploadingReference: boolean;
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
  bookPrompt,
  currentPageNumber,
  onPageChange,
  onSavePageContent,
  onImageUpload,
  onDeletePage,
  onInsertPage,
  isSaving,
  isCoverPage,
  maxContentPage,
  aiConfig,
  onOpenAIConfigModal,
  referenceImageUrl,
  onReferenceImageUpload,
  onClearReferenceImage,
  isUploadingReference,
}: PagesEditorProps) {
  
  const existingPage = pages.find(p => p.pageNumber === currentPageNumber);
  
  const [pagePrompt, setPagePrompt] = useState(bookPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [localContent, setLocalContent] = useState(existingPage?.content || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null); // New ref for reference image

  // Sync local content state when page changes or existingPage updates
  useEffect(() => {
    setLocalContent(existingPage?.content || '');
  }, [existingPage]);

  // Initialize prompt based on bookPrompt or existing page data
  useEffect(() => {
    setPagePrompt(bookPrompt);
  }, [bookPrompt, currentPageNumber]);

  // Derive current page data, ensuring we use the latest image URL from existingPage
  const currentPage: Page = existingPage || {
    id: `temp-${currentPageNumber}`,
    pageNumber: currentPageNumber,
    content: localContent,
    imageUrl: undefined, // Ensure default is undefined if no existing page
    activityTypes: isCoverPage ? ['image'] : ['coloring'], // Default cover to image
  };

  const currentActivities = currentPage.activityTypes || (isCoverPage ? ['image'] : ['coloring']);
  const hasTextActivity = currentActivities.includes('story') || currentActivities.includes('tracing');
  const hasImageActivity = currentActivities.includes('coloring') || currentActivities.includes('maze') || currentActivities.includes('dot-to-dot') || currentActivities.includes('image');

  const updatePageActivities = (activity: PageActivityType) => {
    if (isCoverPage) return; // Covers cannot change activity type

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
      alert('Please enter a prompt or set a book description in the settings modal.');
      return;
    }
    
    // Check if API keys are configured before generating
    const isTextGeneration = hasTextActivity;
    const isImageGeneration = hasImageActivity;
    
    if (isTextGeneration && !aiConfig.openAIApiKey && !aiConfig.geminiApiKey) {
      alert('Please configure your OpenAI or Gemini API Key to generate text content.');
      onOpenAIConfigModal();
      return;
    }
    if (isImageGeneration && !aiConfig.openAIApiKey) {
      alert('Please configure your OpenAI API Key to generate images (DALL-E 3).');
      onOpenAIConfigModal();
      return;
    }

    setIsGenerating(true);
    try {
      // Covers only generate images
      if (isCoverPage) {
        await onGenerateImage(currentPageNumber, prompt);
      } else {
        // Content pages run both generation types sequentially if both activities are selected
        if (hasTextActivity) {
          await onGeneratePage(currentPageNumber, prompt);
        }
        if (hasImageActivity) {
          // Pass the reference image URL if available
          await onGenerateImage(currentPageNumber, prompt); 
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLocalContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    
    // Update local state immediately for responsiveness
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
  
  const handleSave = () => {
    // When saving, we use the current local content and the current activities
    onSavePageContent(currentPageNumber, localContent, currentActivities);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(currentPageNumber, file);
    }
  };
  
  const handleReferenceImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onReferenceImageUpload(file);
    }
  };

  const handleNext = () => {
    // Navigate to the next content page
    if (currentPageNumber >= 1 && currentPageNumber < maxContentPage) {
      onPageChange(currentPageNumber + 1);
    }
  };

  const handlePrevious = () => {
    // Navigate to the previous content page
    if (currentPageNumber > 1) {
      onPageChange(currentPageNumber - 1);
    }
  };
  
  const handleAddPage = async () => {
    // Add page after the last content page (maxContentPage + 1)
    const newPageNumber = maxContentPage + 1;
    await onInsertPage(newPageNumber);
  };
  
  const handleInsertPageAtCurrent = async () => {
    // Insert page at the current page number, shifting subsequent pages
    await onInsertPage(currentPageNumber);
  };
  
  const pageTitle = isCoverPage 
    ? (currentPageNumber === 0 ? 'Front Cover' : 'Back Cover')
    : `Page ${currentPageNumber}`;
    
  const isFirstContentPage = currentPageNumber === 1;

  const renderActivitySelector = () => {
    if (isCoverPage) {
      return (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          Covers are automatically set to 'Image' activity type.
        </div>
      );
    }
    
    return (
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
              disabled={isGenerating || isSaving}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  };
  
  const renderReferenceImageUploader = () => (
    <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Image className="w-4 h-4 text-purple-600" />
        Reference Image (Optional)
      </h3>
      
      {referenceImageUrl ? (
        <div className="relative">
          <img 
            src={referenceImageUrl} 
            alt="Reference" 
            className="w-full h-auto rounded-lg border border-purple-300 object-cover max-h-40"
          />
          <button
            onClick={onClearReferenceImage}
            className="absolute top-1 right-1 p-1 bg-white/80 text-red-600 rounded-full shadow-md hover:bg-white transition-colors"
            title="Clear Reference Image"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-xs text-gray-600 mt-1">Image will guide AI generation.</p>
        </div>
      ) : (
        <>
          <input
            type="file"
            ref={referenceFileInputRef}
            onChange={handleReferenceImageSelect}
            accept="image/*"
            className="hidden"
            disabled={isUploadingReference || isGenerating || isSaving}
          />
          <button
            onClick={() => referenceFileInputRef.current?.click()}
            disabled={isUploadingReference || isGenerating || isSaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploadingReference ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Reference Image
              </>
            )}
          </button>
          <p className="text-xs text-gray-500">Use an image to influence the style or subject of the AI output.</p>
        </>
      )}
    </div>
  );

  const renderPreview = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded-lg">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-lg font-medium text-gray-700">Generating {pageTitle}...</p>
          <p className="text-sm text-gray-500 mt-1">This may take a moment.</p>
        </div>
      );
    }

    const hasContent = currentPage.imageUrl || (localContent && hasTextActivity);

    if (hasContent) {
      return (
        <div className="h-full overflow-y-auto p-6 bg-white rounded-lg shadow-inner border border-gray-200">
          {currentPage.imageUrl && hasImageActivity && (
            <div className="relative mb-4 border border-gray-300 rounded-lg overflow-hidden">
              <img 
                src={currentPage.imageUrl} 
                alt={`${pageTitle} image`} 
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
              value={localContent}
              onChange={handleLocalContentChange}
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
        <Pencil className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-medium mb-2">{pageTitle}: Ready to Generate</h3>
        <p>Enter your prompt and click 'Generate' to begin!</p>
      </div>
    );
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
      {/* Left Sidebar (Controls) */}
      <div className="lg:col-span-1 flex flex-col bg-white p-6 border border-gray-200 rounded-lg shadow-sm overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{pageTitle}</h2>

        {renderActivitySelector()}
        
        {/* Reference Image Uploader */}
        {hasImageActivity && renderReferenceImageUploader()}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt for {pageTitle}
          </label>
          <textarea
            value={pagePrompt}
            onChange={(e) => setPagePrompt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            rows={3}
            placeholder={bookPrompt || "Describe the content or image for this page..."}
            disabled={isGenerating || isSaving}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || isSaving || (!pagePrompt.trim() && !bookPrompt.trim())}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate {pageTitle}
            </>
          )}
        </button>
        
        {/* Quick AI Config Button */}
        <button
          onClick={onOpenAIConfigModal}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium mb-4"
        >
          <Key className="w-4 h-4" />
          Configure AI Keys
        </button>
        
        {/* Manual Actions */}
        <div className="space-y-3 mb-6 pt-4 border-t border-gray-100">
          {/* Save Page button is now always visible */}
          <button
            onClick={handleSave}
            disabled={isSaving || isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Page'}
          </button>

          {hasImageActivity && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
                disabled={isSaving || isGenerating}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving || isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Upload Custom Image
              </button>
            </>
          )}
          
          {/* Insert Page Button */}
          {!isCoverPage && (
            <button
              onClick={handleInsertPageAtCurrent}
              disabled={isSaving || isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Insert New Page Here
            </button>
          )}

          <button
            onClick={() => onDeletePage(currentPageNumber)}
            disabled={isSaving || isGenerating || !existingPage || (isFirstContentPage && maxContentPage === 1)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete {isCoverPage ? 'Cover' : 'Page'}
          </button>
        </div>

        {/* Navigation (Only for content pages) */}
        {!isCoverPage && (
          <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-auto">
            <button
              onClick={handlePrevious}
              disabled={currentPageNumber <= 1 || isGenerating || isSaving}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Page
            </button>
            
            <button
              onClick={handleAddPage}
              disabled={isSaving || isGenerating}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              title="Add a new page to the end of the book"
            >
              <Plus className="w-4 h-4" />
              Add Page
            </button>
            
            <button
              onClick={handleNext}
              disabled={currentPageNumber >= maxContentPage || isGenerating || isSaving}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Next Page
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Right Content Area (Preview) */}
      <div className="lg:col-span-2 h-full flex flex-col">
        {renderPreview()}
      </div>
    </div>
  );
}