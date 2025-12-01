import { X, FileText, Book } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  onExportEPUB: () => void;
  isExporting: boolean;
}

export default function ExportModal({
  isOpen,
  onClose,
  onExportPDF,
  onExportEPUB,
  isExporting,
}: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Export Book</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Choose your export format:
          </p>

          <button
            onClick={onExportPDF}
            disabled={isExporting}
            className="w-full px-4 py-3 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <FileText className="w-5 h-5" />
            Download as PDF
          </button>

          <button
            onClick={onExportEPUB}
            disabled={isExporting}
            className="w-full px-4 py-3 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <Book className="w-5 h-5" />
            Download as EPUB
          </button>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}