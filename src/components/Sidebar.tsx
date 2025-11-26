import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Info } from 'lucide-react';

interface SidebarProps {
  bookPrompt: string;
  onAIGenerate: (prompt: string) => void;
  isGeneratingAI: boolean;
  onInsertSample: () => void;
  onUpdateBookPrompt: (prompt: string) => void;
}

export default function Sidebar({ 
  bookPrompt, 
  onAIGenerate, 
  isGeneratingAI, 
  onInsertSample,
  onUpdateBookPrompt,
}: SidebarProps) {
  
  const [aiPrompt, setAiPrompt] = useState(bookPrompt);

  useEffect(() => {
    setAiPrompt(bookPrompt);
  }, [bookPrompt]);
  
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setAiPrompt(newPrompt);
    onUpdateBookPrompt(newPrompt); // Update the main book prompt in the parent state
  };

  const handleAIGenerate = () => {
    if (aiPrompt.trim()) {
      onAIGenerate(aiPrompt);
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto p-6">
      <div className="space-y-4">
        
        {/* --- AI Content Generator --- */}
        <div className="space-y-4 border p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-900">AI Book Generator</h3>
          </div>
          
          <textarea
            value={aiPrompt}
            onChange={handlePromptChange}
            className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
            rows={4}
            placeholder="Describe your book in simple words... e.g. 'A children's story about a brave puppy who saves his town'"
            disabled={isGeneratingAI}
          />
          
          <div className="flex flex-col gap-3">
            <button
              onClick={handleAIGenerate}
              type="button"
              disabled={isGeneratingAI || !aiPrompt.trim()}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Full Book Content
                </>
              )}
            </button>
            
            <button
              onClick={onInsertSample}
              type="button"
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Insert Sample Story
            </button>
          </div>
        </div>
        
        {/* --- Info --- */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">How to use:</p>
              <ul className="space-y-1 text-xs list-disc pl-4">
                <li>Use the AI Generator to create the story structure.</li>
                <li>Go to the 'Pages' tab to generate individual coloring images or text pages based on the story.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}