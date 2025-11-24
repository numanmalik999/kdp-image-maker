import { Chapter } from '../types';
import { Plus, Trash2 } from 'lucide-react';

interface ChaptersEditorProps {
  chapters: Chapter[];
  onChange: (chapters: Chapter[]) => void;
}

export default function ChaptersEditor({ chapters, onChange }: ChaptersEditorProps) {
  const addChapter = () => {
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: '',
      content: '',
    };
    onChange([...chapters, newChapter]);
  };

  const removeChapter = (id: string) => {
    onChange(chapters.filter(chapter => chapter.id !== id));
  };

  const updateChapter = (id: string, field: 'title' | 'content', value: string) => {
    onChange(
      chapters.map(chapter =>
        chapter.id === id ? { ...chapter, [field]: value } : chapter
      )
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {chapters.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No chapters yet. Click "Add Chapter" to get started.</p>
          </div>
        ) : (
          chapters.map((chapter, index) => (
            <div key={chapter.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">Chapter {index + 1}</span>
                <button
                  onClick={() => removeChapter(chapter.id)}
                  className="text-red-600 hover:text-red-700 transition-colors p-1"
                  title="Remove chapter"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={chapter.title}
                onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Chapter title"
              />
              <textarea
                value={chapter.content}
                onChange={(e) => updateChapter(chapter.id, 'content', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-serif"
                rows={8}
                placeholder="Chapter content..."
              />
            </div>
          ))
        )}
      </div>
      <button
        onClick={addChapter}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        <Plus className="w-5 h-5" />
        Add Chapter
      </button>
    </div>
  );
}
