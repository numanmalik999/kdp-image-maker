/* @ts-nocheck */
import { useParams } from 'react-router-dom';

export default function BookEditor({ onBack }: { onBack: () => void; }) {
  const { bookId } = useParams();
  
  return (
    <div className="p-4">
      <button onClick={onBack} className="text-blue-600">Back</button>
      <h2 className="text-xl font-semibold">Book Editor</h2>
      <p className="text-sm text-gray-700">Book ID: {bookId}</p>
    </div>
  );
}