import { useState } from 'react';
import { Page } from '../types';
import { Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';

interface PagesEditorProps {
  pages: Page[];
  onChange: (pages: Page[]) => void;
  onGeneratePage: (pageNumber: number, prompt: string) => Promise<void>;
  onGenerateImage: (pageNumber: number, prompt: string) => Promise<void>;
  totalPages: number;
  bookPrompt: string;
}

export default function PagesEditor({ pages, onChange, onGeneratePage, onGenerateImage, totalPages, bookPrompt }: PagesEditorProps) {
  const [generatingPages, setGeneratingPages] = useState<Set<number>>(new Set());
  const [generatingImages, setGeneratingImages] = useState<Set<number>>(new Set());
  const [pagePrompts, setPagePrompts] = useState<Record<number, string>>({});

  const updatePageContent = (pageNumber: number, content: string) => {
    const updatedPages = [...pages];
    const pageIndex = updatedPages.findIndex(p => p.pageNumber === pageNumber);

    if (pageIndex >= 0) {
      updatedPages[pageIndex] = { ...updatedPages[pageIndex], content };
    } else {
      updatedPages.push({
        id: `page-${pageNumber}`,
        pageNumber,
        content,
      });
    }

    updatedPages.sort((a, b) => a.pageNumber - b.pageNumber);
    onChange(updatedPages);
  };

  const handleGeneratePage = async (pageNumber: number) => {
    const prompt = pagePrompts[pageNumber] || bookPrompt;
    if (!prompt.trim()) {
      alert('Please enter a prompt for this page or set a book description in the AI generator.');
      return;
    }

    setGeneratingPages(prev => new Set(prev).add(pageNumber));
    try {
      await onGeneratePage(pageNumber, prompt);
    } finally {
      setGeneratingPages(prev => {
        const next = new Set(prev);
        next.delete(pageNumber);
        return next;
      });
    }
  };

  const handleGenerateImage = async (pageNumber: number) => {
    const prompt = pagePrompts[pageNumber] || bookPrompt;
    if (!prompt.trim()) {
      alert('Please enter a prompt for this page or set a book description in the AI generator.');
      return;
    }

    setGeneratingImages(prev => new Set(prev).add(pageNumber));
    try {
      await onGenerateImage(pageNumber, prompt);
    } finally {
      setGeneratingImages(prev => {
        const next = new Set(prev);
        next.delete(pageNumber);
        return next;
      });
    }
  };

  const getPageContent = (pageNumber: number): string => {
    const page = pages.find(p => p.pageNumber === pageNumber);
    return page?.content || '';
  };

  const getPageImage = (pageNumber: number): string | undefined => {
    const page = pages.find(p => p.pageNumber === pageNumber);
    return page?.imageUrl;
  };

  const renderPage = (pageNumber: number) => {
    const isGenerating = generatingPages.has(pageNumber);
    const isGeneratingImage = generatingImages.has(pageNumber);
    const content = getPageContent(pageNumber);
    const imageUrl = getPageImage(pageNumber);
    const pagePrompt = pagePrompts[pageNumber] || '';

    return (
      <div key={pageNumber} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Page {pageNumber}</span>
        </div>

        <div className="mb-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-900">AI Generate</span>
          </div>
          <input
            type="text"
            value={pagePrompt}
            onChange={(e) => setPagePrompts(prev => ({ ...prev, [pageNumber]: e.target.value }))}
            className="w-full px-2 py-1.5 text-sm border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-2"
            placeholder={bookPrompt || "What should this page be about?"}
            disabled={isGenerating}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleGeneratePage(pageNumber)}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Text...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Text
                </>
              )}
            </button>
            <button
              onClick={() => handleGenerateImage(pageNumber)}
              disabled={isGeneratingImage}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Image...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Image
                </>
              )}
            </button>
          </div>
        </div>

        {imageUrl && (
          <div className="mb-3">
            <img
              src={imageUrl}
              alt={`Page ${pageNumber} coloring image`}
              className="w-full h-auto rounded-lg border border-gray-300"
            />
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => updatePageContent(pageNumber, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-serif text-sm"
          rows={12}
          placeholder="Page content will appear here after generation, or type your own..."
        />
      </div>
    );
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-4">
        {pageNumbers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">Set a target page count in the sidebar to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {pageNumbers.map(pageNumber => renderPage(pageNumber))}
          </div>
        )}
      </div>
    </div>
  );
}
