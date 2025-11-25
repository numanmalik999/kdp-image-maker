import { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Edit2, Plus, PlusCircle, CheckCircle, FileText, Image as ImageIcon, Upload, Settings, ArrowLeft, Crop as CropIcon } from 'lucide-react';
import { PageActivityType } from '../types';

interface SinglePageEditorProps {
  currentPage: number;
  totalPages: number;
  pageContent: string;
  pageImage?: string;
  pageActivityType?: PageActivityType; // New prop
  bookPrompt: string;
  hasFrontCover: boolean;
  hasBackCover: boolean;
  isFrontCover?: boolean;
  isBackCover?: boolean;
  
  // Updated props: separate handlers for text and image
  onGenerateText: (pageNumber: number, prompt: string, activityType: PageActivityType) => Promise<void>;
  onGenerateImage: (pageNumber: number, prompt: string, activityType: PageActivityType) => Promise<void>;
  onGenerateCoverImage: (type: 'front' | 'back', prompt: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<void>; // New handler for image upload
  
  onNextPage: () => void;
  onPreviousPage: () => void;
  onSaveBook: () => void;
  onUpdateContent: (content: string, activityType: PageActivityType) => void; // Updated handler
  onSwitchToFrontCover: () => void;
  onSwitchToBackCover: () => void;
  onSwitchToPages: () => void; // New handler
  onAddNewPage: () => void;
  onInsertPageAfter: () => void;
  onCompleteBook: () => void;
  onOpenSettings: () => void; // New handler
  onEditImage: (imageUrl: string) => void; // New handler
  isSaving: boolean;
}

const ACTIVITY_OPTIONS: { value: PageActivityType; label: string }[] = [
  { value: 'coloring', label: 'Coloring/Tracing' },
  { value: 'story', label: 'Story/Text Page' },
  { value: 'maze', label: 'Maze' },
  { value: 'dot-to-dot', label: 'Dot-to-Dot Game' },
  { value: 'image', label: 'Full Page Image' },
];

export default function SinglePageEditor({
  currentPage,
  totalPages,
  pageContent,
  pageImage,
  pageActivityType = 'coloring', // Default to coloring
  bookPrompt,
  hasFrontCover,
  hasBackCover,
  isFrontCover,
  isBackCover,
  onGenerateText,
  onGenerateImage,
  onGenerateCoverImage,
  onUploadImage, // Destructure new prop
  onNextPage,
  onPreviousPage,
  onSaveBook,
  onUpdateContent,
  onSwitchToFrontCover,
  onSwitchToBackCover,
  onSwitchToPages, // Destructure new prop
  onAddNewPage,
  onInsertPageAfter,
  onCompleteBook,
  onOpenSettings, // Destructure new prop
  onEditImage, // Destructure new prop
  isSaving,
}: SinglePageEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [activityType, setActivityType] = useState<PageActivityType>(pageActivityType);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // New state for upload
  const [editedContent, setEditedContent] = useState(pageContent);
  const [isEditingContent, setIsEditingContent] = useState(false);

  const isCoverView = isFrontCover || isBackCover;

  useEffect(() => {
    setEditedContent(pageContent);
  }, [pageContent]);

  useEffect(() => {
    // Covers should always default to 'image' type internally for saving purposes
    setActivityType(isCoverView ? 'image' : pageActivityType);
  }, [pageActivityType, isCoverView]);

  const handleGenerate = async (type: 'text' | 'image') => {
    const finalPrompt = prompt.trim() || bookPrompt;
    if (!finalPrompt) {
      alert('Please enter a prompt or set a book description.');
      return;
    }

    if (isCoverView) {
      // Covers only generate images
      if (type === 'image') {
        setIsGeneratingImage(true);
        try {
          await onGenerateCoverImage(isFrontCover ? 'front' : 'back', finalPrompt);
        } finally {
          setIsGeneratingImage(false);
        }
      } else {
        alert('Text generation is not available for covers.');
      }
      return;
    }

    // Regular pages
    if (type === 'text') {
      setIsGeneratingText(true);
      try {
        await onGenerateText(currentPage, finalPrompt, activityType);
      } finally {
        setIsGeneratingText(false);
      }
    } else {
      setIsGeneratingImage(true);
      try {
        await onGenerateImage(currentPage, finalPrompt, activityType);
      } finally {
        setIsGeneratingImage(false);
      }
    }
    setPrompt('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        await onUploadImage(file);
        // Set activity type to 'image' automatically upon upload
        setActivityType('image');
        onUpdateContent(editedContent, 'image');
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Image upload failed. Please try again.');
      } finally {
        setIsUploading(false);
        // Reset file input value to allow re-uploading the same file
        e.target.value = ''; 
      }
    }
  };

  const handleSaveEdit = () => {
    // Covers are always saved with 'image' activity type
    const finalActivityType = isCoverView ? 'image' : activityType;
    onUpdateContent(editedContent, finalActivityType);
    setIsEditingContent(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(pageContent);
    setIsEditingContent(false);
  };

  const handleActivityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newActivityType = e.target.value as PageActivityType;
    setActivityType(newActivityType);
    // Immediately update content/activity type in parent state
    onUpdateContent(editedContent, newActivityType);
  };

  const completedPages = totalPages > 0 ? currentPage : 0;

  const getPageTitle = () => {
    if (isFrontCover) return 'Front Cover';
    if (isBackCover) return 'Back Cover';
    return `Page ${currentPage} of ${totalPages}`;
  };

  const isGenerating = isGeneratingText || isGeneratingImage || isUploading;

  return (
    <div className="h-full flex">
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {getPageTitle()}
            </h2>
            <button
              onClick={onOpenSettings}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-lg"
              title="Edit Book Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Cover Navigation */}
          <div className="space-y-2">
            {isCoverView && (
              <button
                onClick={onSwitchToPages}
                className="w-full px-3 py-2 border-2 border-blue-600 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Pages
              </button>
            )}
            <button
              onClick={onSwitchToFrontCover}
              className={`w-full px-3 py-2 border-2 rounded-lg transition-colors text-sm font-medium ${
                isFrontCover
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : hasFrontCover
                  ? 'border-green-600 text-green-600 hover:bg-green-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {hasFrontCover ? 'Edit Front Cover' : 'Create Front Cover'}
            </button>
            <button
              onClick={onSwitchToBackCover}
              className={`w-full px-3 py-2 border-2 rounded-lg transition-colors text-sm font-medium ${
                isBackCover
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : hasBackCover
                  ? 'border-green-600 text-green-600 hover:bg-green-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {hasBackCover ? 'Edit Back Cover' : 'Create Back Cover'}
            </button>
          </div>

          {/* Activity Type Selector (Only for regular pages) */}
          {!isCoverView && (
            <div>
              <label htmlFor="activityType" className="block text-sm font-medium text-gray-700 mb-2">
                Activity Type:
              </label>
              <select
                id="activityType"
                value={activityType}
                onChange={handleActivityChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating}
              >
                {ACTIVITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Prompt:
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              rows={3}
              placeholder={bookPrompt || 'Enter prompt for this page...'}
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Generate Text Button (Only for pages, not covers) */}
            {!isCoverView && (
              <button
                onClick={() => handleGenerate('text')}
                disabled={isGenerating}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingText ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Text...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate Text
                  </>
                )}
              </button>
            )}

            {/* Generate Image Button (For pages and covers) */}
            <button
              onClick={() => handleGenerate('image')}
              disabled={isGenerating}
              className={`w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                isCoverView ? 'col-span-2' : ''
              }`}
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Image...
                </>
              ) : isFrontCover ? (
                'Generate Front Cover Image'
              ) : isBackCover ? (
                'Generate Back Cover Image'
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Generate Image
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={isGenerating}
            />
            <label
              htmlFor="image-upload"
              className={`w-full px-4 py-2 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors text-sm font-medium flex items-center justify-center gap-2 cursor-pointer ${
                isGenerating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Your Image
                </>
              )}
            </label>
          </div>

          {pageImage && (
            <button
              onClick={() => onEditImage(pageImage)}
              className="w-full px-4 py-2 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <CropIcon className="w-4 h-4" />
              Crop / Edit Image
            </button>
          )}

          {/* Page Navigation (Only for regular pages) */}
          {!isCoverView && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={onPreviousPage}
                  disabled={currentPage === 1}
                  className="flex-1 px-3 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={onNextPage}
                  disabled={currentPage >= totalPages}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {currentPage === totalPages ? (
                <button
                  onClick={onAddNewPage}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add New Page
                </button>
              ) : (
                <button
                  onClick={onInsertPageAfter}
                  className="w-full px-3 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Insert Page After {currentPage}
                </button>
              )}
            </>
          )}

          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 mb-2">
              Book Progress: <span className="font-semibold text-gray-900">{completedPages} Pages</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex-shrink-0 space-y-2">
          <button
            onClick={onSaveBook}
            disabled={isSaving}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Book'
            )}
          </button>
          <button
            onClick={onCompleteBook}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Complete Book
          </button>
        </div>
      </div>

      <div className="flex-1 bg-gray-100 overflow-y-auto p-8">
        {pageImage || pageContent ? (
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-3xl mx-auto">
            {pageImage && (
              <img
                src={pageImage}
                alt={getPageTitle()}
                className="w-full h-auto rounded mb-4"
              />
            )}
            {pageContent && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    {isCoverView ? 'Cover Description / Text' : 'Content'}
                  </h3>
                  {!isEditingContent && (
                    <button
                      onClick={() => setIsEditingContent(true)}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
                {isEditingContent ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={isCoverView ? 4 : 8}
                      placeholder={isCoverView ? "Enter a brief description or title text for the cover." : "Page content..."}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{pageContent}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
            <p className="text-gray-600">Generate content for this page or upload your own image</p>
          </div>
        )}
      </div>
    </div>
  );
}