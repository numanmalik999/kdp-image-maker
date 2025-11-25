import { useState, useEffect } from 'react';
import { X, Save, Sparkles, Info, Loader2 } from 'lucide-react';
import { BookSettings } from '../types';

interface BookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BookSettings;
  onSave: (newSettings: BookSettings) => Promise<void>;
  isSaving: boolean;
  // New props for AI/Sample
  onInsertSample: () => void;
  onAIGenerate: (prompt: string) => void;
  isGeneratingAI: boolean;
  bookPrompt: string;
}

export default function BookSettingsModal({ isOpen, onClose, settings, onSave, isSaving, onInsertSample, onAIGenerate, isGeneratingAI, bookPrompt }: BookSettingsModalProps) {
  const [formData, setFormData] = useState<BookSettings>(settings);
  const [aiPrompt, setAiPrompt] = useState(bookPrompt); // Local state for AI prompt

  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
      setAiPrompt(bookPrompt);
    }
  }, [isOpen, settings, bookPrompt]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: id === 'targetPages' || id === 'fontSize' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.targetPages < 1) {
      alert('Title and target pages are required.');
      return;
    }
    await onSave(formData);
  };
  
  const handleAIGenerate = () => {
    if (aiPrompt.trim()) {
      onAIGenerate(aiPrompt);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Book Settings & AI Tools</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* --- Core Settings --- */}
            <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Book Metadata</h3>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Book Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter book title"
                  required
                />
              </div>

              <div>
                <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
                  Author Name
                </label>
                <input
                  type="text"
                  id="author"
                  value={formData.author}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter author name"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="trimSize" className="block text-sm font-medium text-gray-700 mb-1">
                    Trim Size
                  </label>
                  <select
                    id="trimSize"
                    value={formData.trimSize}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="8.5x11">8.5" × 11"</option>
                    <option value="6x9">6" × 9"</option>
                    <option value="5x8">5" × 8"</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700 mb-1">
                    Font Size
                  </label>
                  <select
                    id="fontSize"
                    value={formData.fontSize}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="10">10pt</option>
                    <option value="11">11pt</option>
                    <option value="12">12pt</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="targetPages" className="block text-sm font-medium text-gray-700 mb-1">
                    Target Pages
                  </label>
                  <input
                    type="number"
                    id="targetPages"
                    value={formData.targetPages}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. 100"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
            
            {/* --- AI Content Generator --- */}
            <div className="space-y-4 border p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-900">AI Content Generator</h3>
              </div>
              
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                rows={3}
                placeholder="Describe your book in simple words... e.g. 'A children's story about a brave puppy who saves his town'"
                disabled={isGeneratingAI}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={handleAIGenerate}
                  type="button"
                  disabled={isGeneratingAI || !aiPrompt.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Insert Sample Story
                </button>
              </div>
            </div>
            
            {/* --- KDP Tips --- */}
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

          </form>
        </div>
      </div>
    </div>
  );
}