import { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Edit2, Plus, PlusCircle, CheckCircle } from 'lucide-react';

interface SinglePageEditorProps {
  currentPage: number;
  totalPages: number;
  pageContent: string;
  pageImage?: string;
  bookPrompt: string;
  hasFrontCover: boolean;
  hasBackCover: boolean;
  isFrontCover?: boolean;
  isBackCover?: boolean;
  onGeneratePage: (pageNumber: number, activityType: string, prompt: string, model: string) => Promise<void>;
  onGenerateCover: (type: 'front' | 'back', activityType: string, prompt: string, model: string) => Promise<void>;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onSaveBook: () => void;
  onUpdateContent: (content: string) => void;
  onSwitchToFrontCover: () => void;
  onSwitchToBackCover: () => void;
  onAddNewPage: () => void;
  onInsertPageAfter: () => void;
  onCompleteBook: () => void;
  isSaving: boolean;
}

export default function SinglePageEditor({
  currentPage,
  totalPages,
  pageContent,
  pageImage,
  bookPrompt,
  hasFrontCover,
  hasBackCover,
  isFrontCover,
  isBackCover,
  onGeneratePage,
  onGenerateCover,
  onNextPage,
  onPreviousPage,
  onSaveBook,
  onUpdateContent,
  onSwitchToFrontCover,
  onSwitchToBackCover,
  onAddNewPage,
  onInsertPageAfter,
  onCompleteBook,
  isSaving,
}: SinglePageEditorProps) {
  const [activityType, setActivityType] = useState('Coloring/Tracing');
  const [model, setModel] = useState('Image & Text');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editedContent, setEditedContent] = useState(pageContent);
  const [isEditingContent, setIsEditingContent] = useState(false);

  useEffect(() => {
    setEditedContent(pageContent);
  }, [pageContent]);

  const handleGenerate = async () => {
    const finalPrompt = prompt.trim() || bookPrompt;
    if (!finalPrompt) {
      alert('Please enter a prompt or set a book description.');
      return;
    }

    setIsGenerating(true);
    try {
      if (isFrontCover) {
        await onGenerateCover('front', activityType, finalPrompt, model);
      } else if (isBackCover) {
        await onGenerateCover('back', activityType, finalPrompt, model);
      } else {
        await onGeneratePage(currentPage, activityType, finalPrompt, model);
      }
      setPrompt('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEdit = () => {
    onUpdateContent(editedContent);
    setIsEditingContent(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(pageContent);
    setIsEditingContent(false);
  };

  const completedPages = totalPages > 0 ? currentPage : 0;

  const getPageTitle = () => {
    if (isFrontCover) return 'Front Cover';
    if (isBackCover) return 'Back Cover';
    return `Page ${currentPage} of ${totalPages}`;
  };

  return (
    <div className="h-full flex">
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">
            {getPageTitle()}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!isFrontCover && !isBackCover && (
            <div className="space-y-2">
              <button
                onClick={onSwitchToFrontCover}
                disabled={hasFrontCover}
                className="w-full px-3 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                {hasFrontCover ? 'Front Cover Created ✓' : 'Create Front Cover'}
              </button>
              <button
                onClick={onSwitchToBackCover}
                disabled={hasBackCover}
                className="w-full px-3 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                {hasBackCover ? 'Back Cover Created ✓' : 'Create Back Cover'}
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Type:
            </label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGenerating}
            >
              <option value="Coloring/Tracing">Coloring/Tracing</option>
              <option value="Word Search">Word Search</option>
              <option value="Maze">Maze</option>
              <option value="Connect the Dots">Connect the Dots</option>
              <option value="Spot the Difference">Spot the Difference</option>
              <option value="Counting">Counting</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model:
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGenerating}
            >
              <option value="Image & Text">Image & Text (ChatGPT)</option>
              <option value="Gemini">Text Only (Gemini)</option>
            </select>
          </div>

          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              rows={3}
              placeholder={bookPrompt || 'Enter prompt for this page...'}
              disabled={isGenerating}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : isFrontCover ? (
              'Generate Front Cover'
            ) : isBackCover ? (
              'Generate Back Cover'
            ) : (
              `Generate Page ${currentPage}`
            )}
          </button>

          {!isFrontCover && !isBackCover && (
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
                  <h3 className="text-sm font-medium text-gray-700">Content</h3>
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
                      rows={8}
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
            <p className="text-gray-600">Generate content for this page to see the preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
