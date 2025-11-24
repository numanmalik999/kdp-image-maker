import { useState } from 'react';
import { BookSettings, TrimSize, FontSize } from '../types';
import { BookOpen, Info, Sparkles } from 'lucide-react';

interface SidebarProps {
  settings: BookSettings;
  onSettingsChange: (settings: BookSettings) => void;
  onInsertSample: () => void;
  onAIGenerate: (prompt: string) => void;
  isGeneratingAI: boolean;
}

export default function Sidebar({ settings, onSettingsChange, onInsertSample, onAIGenerate, isGeneratingAI }: SidebarProps) {
  const [aiPrompt, setAiPrompt] = useState('');
  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">KDP Book Builder</h1>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Book Title
          </label>
          <input
            type="text"
            id="title"
            value={settings.title}
            onChange={(e) => onSettingsChange({ ...settings, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter book title"
          />
        </div>

        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
            Author Name
          </label>
          <input
            type="text"
            id="author"
            value={settings.author}
            onChange={(e) => onSettingsChange({ ...settings, author: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter author name"
          />
        </div>

        <div>
          <label htmlFor="trimSize" className="block text-sm font-medium text-gray-700 mb-2">
            Trim Size
          </label>
          <select
            id="trimSize"
            value={settings.trimSize}
            onChange={(e) => onSettingsChange({ ...settings, trimSize: e.target.value as TrimSize })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="8.5x11">8.5 × 11 inches</option>
            <option value="6x9">6 × 9 inches</option>
            <option value="5x8">5 × 8 inches</option>
          </select>
        </div>

        <div>
          <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700 mb-2">
            Font Size
          </label>
          <select
            id="fontSize"
            value={settings.fontSize}
            onChange={(e) => onSettingsChange({ ...settings, fontSize: parseInt(e.target.value) as FontSize })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="10">10pt</option>
            <option value="11">11pt</option>
            <option value="12">12pt</option>
          </select>
        </div>

        <div>
          <label htmlFor="targetPages" className="block text-sm font-medium text-gray-700 mb-2">
            Target Pages
          </label>
          <input
            type="number"
            id="targetPages"
            value={settings.targetPages}
            onChange={(e) => onSettingsChange({ ...settings, targetPages: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g. 100"
            min="1"
          />
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-purple-900">AI Content Generator</h3>
            </div>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
              rows={3}
              placeholder="Describe your book in simple words... e.g. 'A children's story about a brave puppy who saves his town'"
              disabled={isGeneratingAI}
            />
            <button
              onClick={() => {
                if (aiPrompt.trim()) {
                  onAIGenerate(aiPrompt);
                }
              }}
              disabled={isGeneratingAI || !aiPrompt.trim()}
              className="w-full mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isGeneratingAI ? 'Generating...' : 'Generate with AI'}
            </button>
          </div>

          <button
            onClick={onInsertSample}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Insert Sample Story
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">KDP Tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• 6×9 inches is most common for novels</li>
                <li>• 8.5×11 inches works well for workbooks</li>
                <li>• 11–12pt font is standard for adult books</li>
                <li>• Children's books often use larger fonts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
