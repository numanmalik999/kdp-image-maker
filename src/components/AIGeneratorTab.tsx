import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Info, Key, Settings } from 'lucide-react';
import { UserAIConfig, TextModel, ImageModel } from '../types';

interface AIGeneratorTabProps {
  bookPrompt: string;
  onAIGenerate: (prompt: string) => void;
  isGeneratingAI: boolean;
  onInsertSample: () => void;
  onUpdateBookPrompt: (prompt: string) => void;
  // New props for AI configuration
  aiConfig: UserAIConfig;
  onUpdateAIConfig: (config: UserAIConfig) => void;
}

const TEXT_MODELS: { value: TextModel; label: string }[] = [
  { value: 'gpt-4o', label: 'OpenAI GPT-4o' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
];

const IMAGE_MODELS: { value: ImageModel; label: string }[] = [
  { value: 'dall-e-3', label: 'DALL-E 3' },
];

export default function AIGeneratorTab({ 
  bookPrompt, 
  onAIGenerate, 
  isGeneratingAI, 
  onInsertSample,
  onUpdateBookPrompt,
  aiConfig,
  onUpdateAIConfig,
}: AIGeneratorTabProps) {
  
  const [aiPrompt, setAiPrompt] = useState(bookPrompt);
  const [localConfig, setLocalConfig] = useState(aiConfig);
  const [activeSubTab, setActiveSubTab] = useState<'generator' | 'keys'>('generator');

  useEffect(() => {
    setAiPrompt(bookPrompt);
  }, [bookPrompt]);
  
  useEffect(() => {
    setLocalConfig(aiConfig);
  }, [aiConfig]);

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
  
  const handleConfigChange = (field: keyof UserAIConfig, value: string | TextModel | ImageModel) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    onUpdateAIConfig(newConfig);
  };
  
  const renderKeySettings = () => (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2 mb-3">
        <Key className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI Service Configuration</h3>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        <p className="font-semibold mb-1">Important:</p>
        <p>Your API keys are stored only in your browser's local storage and are sent directly to our Edge Functions for secure API calls. We do not store them in our database.</p>
      </div>

      {/* OpenAI Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          OpenAI API Key (for GPT & DALL-E)
        </label>
        <input
          type="password"
          value={localConfig.openAIApiKey}
          onChange={(e) => handleConfigChange('openAIApiKey', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="sk-..."
        />
      </div>
      
      {/* Gemini Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gemini API Key (Optional)
        </label>
        <input
          type="password"
          value={localConfig.geminiApiKey}
          onChange={(e) => handleConfigChange('geminiApiKey', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="AIza..."
        />
      </div>
      
      {/* Model Selection */}
      <div className="grid grid-cols-2 gap-4 pt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Text Generation Model
          </label>
          <select
            value={localConfig.textModel}
            onChange={(e) => handleConfigChange('textModel', e.target.value as TextModel)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {TEXT_MODELS.map(model => (
              <option key={model.value} value={model.value}>{model.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image Generation Model
          </label>
          <select
            value={localConfig.imageModel}
            onChange={(e) => handleConfigChange('imageModel', e.target.value as ImageModel)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {IMAGE_MODELS.map(model => (
              <option key={model.value} value={model.value}>{model.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderGenerator = () => (
    <div className="space-y-6 p-6">
      
      {/* --- AI Content Generator --- */}
      <div className="space-y-4 border p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-purple-900">AI Book Content Generator</h3>
        </div>
        
        {!localConfig.openAIApiKey && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            Please configure your OpenAI API Key in the "API Keys" tab before generating content.
          </div>
        )}
        
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
            disabled={isGeneratingAI || !aiPrompt.trim() || !localConfig.openAIApiKey}
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
              <li>Go to the 'Pages' tab in the editor to generate individual coloring images or text pages based on the story.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-gray-200 px-6 pt-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveSubTab('generator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeSubTab === 'generator'
                ? 'bg-gray-100 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Generator
          </button>
          <button
            onClick={() => setActiveSubTab('keys')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeSubTab === 'keys'
                ? 'bg-gray-100 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            API Keys & Models
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === 'generator' && renderGenerator()}
        {activeSubTab === 'keys' && renderKeySettings()}
      </div>
    </div>
  );
}