import { Page, PageActivityType, UserAIConfig } from '../types';
import { Download, FileStack, BookOpenCheck, BookOpenText, Key } from 'lucide-react';
import PagesEditor from './PagesEditor';
import { countWords, estimatePages } from '../utils/textUtils';

type EditorTab = 'pages' | 'front_cover' | 'back_cover';

interface EditorAreaProps {
  pages: Page[];
  onPagesChange: (pages: Page[]) => void;
  onGeneratePage: (pageNumber: number, prompt: string) => Promise<void>;
  onGenerateImage: (pageNumber: number, prompt: string) => Promise<void>;
  onEditImage: (pageNumber: number) => void;
  fontSize: number;
  onGeneratePDF: () => void;
  isGenerating: boolean;
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  maxContentPage: number; // New: Max content page number
  bookPrompt: string;
  currentPageNumber: number;
  onPageChange: (newPageNumber: number) => void;
  onSavePageContent: (pageNumber: number, content: string, activityTypes: PageActivityType[]) => Promise<void>;
  onImageUpload: (pageNumber: number, file: File) => Promise<void>;
  onDeletePage: (pageNumber: number) => Promise<void>;
  onInsertPage: (insertionPoint: number) => Promise<void>; // New
  isSaving: boolean;
  // New Props
  aiConfig: UserAIConfig;
  onOpenAIConfigModal: () => void;
  // Reference Image Props
  referenceImageUrl?: string;
  onReferenceImageUpload: (file: File) => Promise<void>;
  onClearReferenceImage: () => void;
  isUploadingReference: boolean;
}

export default function EditorArea({
  pages,
  onPagesChange,
  onGeneratePage,
  onGenerateImage,
  onEditImage,
  fontSize,
  onGeneratePDF,
  isGenerating,
  activeTab,
  onTabChange,
  maxContentPage,
  bookPrompt,
  currentPageNumber,
  onPageChange,
  onSavePageContent,
  onImageUpload,
  onDeletePage,
  onInsertPage,
  isSaving,
  aiConfig,
  onOpenAIConfigModal,
  referenceImageUrl,
  onReferenceImageUpload,
  onClearReferenceImage,
  isUploadingReference,
}: EditorAreaProps) {

  // Calculate words based on existing pages content
  const totalWords = pages.reduce((sum, page) => sum + countWords(page.content), 0);
  const estimatedPages = estimatePages(totalWords, fontSize);

  const isCoverTab = activeTab === 'front_cover' || activeTab === 'back_cover';
  
  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => onTabChange('front_cover')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 ${
                activeTab === 'front_cover'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BookOpenCheck className="w-4 h-4" />
              Front Cover
            </button>
            <button
              onClick={() => onTabChange('pages')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 ${
                activeTab === 'pages'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileStack className="w-4 h-4" />
              Pages
            </button>
            <button
              onClick={() => onTabChange('back_cover')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 ${
                activeTab === 'back_cover'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BookOpenText className="w-4 h-4" />
              Back Cover
            </button>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            {/* Added quick access button for AI Config */}
            <button
              onClick={onOpenAIConfigModal}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
              title="Configure AI API Keys"
            >
              <Key className="w-4 h-4" />
              AI Config
            </button>
            
            <button
              onClick={onGeneratePDF}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              {isGenerating ? 'Generating...' : 'Generate KDP PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-hidden mb-4">
            <PagesEditor
              pages={pages}
              onChange={onPagesChange}
              onGeneratePage={onGeneratePage}
              onGenerateImage={onGenerateImage}
              onEditImage={onEditImage}
              bookPrompt={bookPrompt}
              currentPageNumber={isCoverTab ? (activeTab === 'front_cover' ? 0 : maxContentPage + 1) : currentPageNumber}
              onPageChange={onPageChange}
              onSavePageContent={onSavePageContent}
              onImageUpload={onImageUpload}
              onDeletePage={onDeletePage}
              onInsertPage={onInsertPage} // Pass new handler
              isSaving={isSaving}
              isCoverPage={isCoverTab}
              maxContentPage={maxContentPage} // Pass max content page count
              // New Props
              aiConfig={aiConfig}
              onOpenAIConfigModal={onOpenAIConfigModal}
              // Reference Image Props
              referenceImageUrl={referenceImageUrl}
              onReferenceImageUpload={onReferenceImageUpload}
              onClearReferenceImage={onClearReferenceImage}
              isUploadingReference={isUploadingReference}
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex gap-6 text-sm">
              <span className="text-gray-600">
                Words: <span className="font-semibold text-gray-900">{totalWords.toLocaleString()}</span>
              </span>
              <span className="text-gray-600">
                Est. Pages: <span className="font-semibold text-gray-900">{estimatedPages}</span>
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Total Content Pages: <span className="font-semibold text-gray-900">{maxContentPage}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}