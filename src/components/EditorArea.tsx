import { Chapter, Page } from '../types';
import { FileText, BookOpen, Download, FileStack } from 'lucide-react';
import SingleTextEditor from './SingleTextEditor';
import ChaptersEditor from './ChaptersEditor';
import PagesEditor from './PagesEditor';
import { countWords, estimatePages } from '../utils/textUtils';

interface EditorAreaProps {
  singleText: string;
  onSingleTextChange: (text: string) => void;
  chapters: Chapter[];
  onChaptersChange: (chapters: Chapter[]) => void;
  pages: Page[];
  onPagesChange: (pages: Page[]) => void;
  onGeneratePage: (pageNumber: number, prompt: string) => Promise<void>;
  onGenerateImage: (pageNumber: number, prompt: string) => Promise<void>;
  fontSize: number;
  onGeneratePDF: () => void;
  isGenerating: boolean;
  activeTab: 'single' | 'chapters' | 'pages';
  onTabChange: (tab: 'single' | 'chapters' | 'pages') => void;
  targetPages: number;
  bookPrompt: string;
}

export default function EditorArea({
  singleText,
  onSingleTextChange,
  chapters,
  onChaptersChange,
  pages,
  onPagesChange,
  onGeneratePage,
  onGenerateImage,
  fontSize,
  onGeneratePDF,
  isGenerating,
  activeTab,
  onTabChange,
  targetPages,
  bookPrompt,
}: EditorAreaProps) {

  const totalWords =
    activeTab === 'single'
      ? countWords(singleText)
      : activeTab === 'chapters'
      ? chapters.reduce((sum, chapter) => sum + countWords(chapter.content), 0)
      : pages.reduce((sum, page) => sum + countWords(page.content), 0);

  const estimatedPages = estimatePages(totalWords, fontSize);

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => onTabChange('single')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Single Text
            </button>
            <button
              onClick={() => onTabChange('chapters')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'chapters'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Chapters
            </button>
            <button
              onClick={() => onTabChange('pages')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'pages'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileStack className="w-4 h-4" />
              Pages
            </button>
          </div>
          <button
            onClick={onGeneratePDF}
            disabled={isGenerating || totalWords === 0}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            {isGenerating ? 'Generating...' : 'Generate KDP PDF'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-hidden mb-4">
            {activeTab === 'single' ? (
              <SingleTextEditor content={singleText} onChange={onSingleTextChange} />
            ) : activeTab === 'chapters' ? (
              <ChaptersEditor chapters={chapters} onChange={onChaptersChange} />
            ) : (
              <PagesEditor
                pages={pages}
                onChange={onPagesChange}
                onGeneratePage={onGeneratePage}
                onGenerateImage={onGenerateImage}
                totalPages={targetPages}
                bookPrompt={bookPrompt}
              />
            )}
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
              Based on {fontSize}pt font
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
