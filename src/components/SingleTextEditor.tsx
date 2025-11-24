interface SingleTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function SingleTextEditor({ content, onChange }: SingleTextEditorProps) {
  return (
    <div className="h-full flex flex-col">
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-serif"
        placeholder="Paste or write your entire book content here..."
      />
    </div>
  );
}
