import { useState, useEffect } from 'react';
import { X, Settings, Save } from 'lucide-react';
import { UserAIConfig, TextModel, ImageModel } from '../types';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function AIConfigModal({ 
  isOpen, 
  onClose, 
  aiConfig, 
  onUpdateAIConfig 
}: AIConfigModalProps) {
  
  const [localConfig, setLocalConfig] = useState(aiConfig);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(aiConfig);
    }
  }, [isOpen, aiConfig]);

  if (!isOpen) return null;

  const handleConfigChange = (field: keyof UserAIConfig, value: string | TextModel | ImageModel) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSave = () => {
    onUpdateAIConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">AI API Keys & Models</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <p className="font-semibold mb-1">Important:</p>
            <p>Your API keys are stored only in your browser's local storage and are used securely by our Edge Functions for generation. We do not store them in our database.</p>
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

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}