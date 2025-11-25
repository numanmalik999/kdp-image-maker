/* @ts-nocheck */
export default function BookEditor({ bookId, onBack }: { bookId: string; onBack: () => void; }) {
  return (
    <div className="p-4">
      <button onClick={onBack} className="text-blue-600">Back</button>
      <h2 className="text-xl font-semibold">Book Editor</h2>
      <p className="text-sm text-gray-700">Book ID: {bookId}</p>
    </div>
  );
}