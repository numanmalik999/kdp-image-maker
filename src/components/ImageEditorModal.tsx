import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Save, Loader2, Crop as CropIcon, Palette } from 'lucide-react';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string; // Base64 or URL of the image to edit
  onEditComplete: (editedImageBlob: Blob) => Promise<void>;
  isProcessing: boolean;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

// --- Drawing Logic ---
const COLOR_OPTIONS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFFFF']; // Black, Red, Green, Blue, White (Eraser)

interface DrawingCanvasProps {
  src: string;
  isProcessing: boolean;
  onImageLoad: (loaded: boolean) => void;
  onCanvasReady: (saveFn: () => Promise<Blob | null>) => void;
}

function DrawingCanvas({ src, isProcessing, onImageLoad, onCanvasReady }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [brushSize, setBrushSize] = useState(10);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      // Set internal canvas dimensions to match image dimensions (high resolution)
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Set display dimensions for responsiveness
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });

      // Draw the image onto the canvas
      ctx.drawImage(img, 0, 0);
      onImageLoad(true);
      
      // Expose the save function to the parent component
      onCanvasReady(handleSaveDrawing);
    };
    img.onerror = () => {
      console.error("Failed to load image for drawing.");
      onImageLoad(false);
    };
    img.src = src;
  }, [src, onImageLoad, onCanvasReady]);

  const handleSaveDrawing = (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return Promise.resolve(null);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  const getCanvasScale = (canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { scaleX, scaleY, rect };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isProcessing || !imageDimensions.width) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { scaleX, scaleY, rect } = getCanvasScale(canvas);

    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isProcessing || !imageDimensions.width) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { scaleX, scaleY, rect } = getCanvasScale(canvas);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    
    // If color is white, use 'destination-out' for erasing effect
    ctx.globalCompositeOperation = color === '#FFFFFF' ? 'destination-out' : 'source-over';

    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex w-full h-full gap-4">
      {/* Left Sidebar: Controls/Palette */}
      <div className="flex-shrink-0 w-64 p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">Drawing Tools</h4>
        
        {/* Color Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color / Tool:</label>
          <div className="flex flex-wrap gap-3">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  // Reset composite operation when changing color
                  const ctx = canvasRef.current?.getContext('2d');
                  if (ctx) ctx.globalCompositeOperation = c === '#FFFFFF' ? 'destination-out' : 'source-over';
                }}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  color === c ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:ring-1 ring-gray-300'
                }`}
                style={{ backgroundColor: c, borderColor: c === '#FFFFFF' ? '#ccc' : c }}
                title={c === '#FFFFFF' ? 'Eraser' : c}
              />
            ))}
          </div>
        </div>
        
        {/* Brush Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Brush Size:</label>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer range-sm"
          />
          <span className="text-sm text-gray-600 mt-1 block text-center">{brushSize}px</span>
        </div>
      </div>
      
      {/* Right Area: Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-auto bg-gray-200 rounded-lg">
        {!imageDimensions.width ? (
          <div className="w-96 h-96 flex items-center justify-center bg-gray-200">
            <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="cursor-crosshair max-w-full max-h-full border border-gray-400 shadow-lg"
            // Simplified styling: rely on max-width/max-height of container and auto sizing
            style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
          />
        )}
      </div>
    </div>
  );
}


export default function ImageEditorModal({ isOpen, onClose, src, onEditComplete, isProcessing }: ImageEditorModalProps) {
  const [activeTab, setActiveTab] = useState<'crop' | 'color'>('crop');
  const [crop, setCrop] = useState<Crop>();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [drawingSaveFn, setDrawingSaveFn] = useState<(() => Promise<Blob | null>) | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  if (!isOpen) return null;

  // --- Cropping Logic ---

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setImage(e.currentTarget);
    setCrop(centerAspectCrop(width, height, 1)); // Default to 1:1 aspect ratio for coloring pages
    setImageLoaded(true);
  };

  const getCroppedImage = (image: HTMLImageElement, crop: Crop): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return Promise.reject(new Error('No 2d context'));
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob failed'));
        }
      }, 'image/png');
    });
  };

  const handleSaveCrop = async () => {
    if (image && completedCrop) {
      try {
        const blob = await getCroppedImage(image, completedCrop);
        await onEditComplete(blob);
      } catch (error) {
        console.error('Error during cropping:', error);
        alert('Failed to crop image.');
      }
    }
  };
  
  const handleSaveDrawing = async () => {
    if (drawingSaveFn) {
      try {
        const blob = await drawingSaveFn();
        if (blob) {
          await onEditComplete(blob);
        } else {
          alert('Failed to capture drawing.');
        }
      } catch (error) {
        console.error('Error during drawing save:', error);
        alert('Failed to save drawing.');
      }
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Edit Image</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-shrink-0 border-b border-gray-200 px-4 pt-2">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActiveTab('crop');
                setImageLoaded(false); // Reset image loaded state for crop tab
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'crop'
                  ? 'bg-gray-100 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CropIcon className="w-4 h-4" />
              Crop
            </button>
            <button
              onClick={() => {
                setActiveTab('color');
                setImageLoaded(false); // Reset image loaded state for drawing tab
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'color'
                  ? 'bg-gray-100 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Palette className="w-4 h-4" />
              Color / Draw
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4 flex items-center justify-center bg-gray-100" style={{ maxHeight: '70vh' }}>
          {activeTab === 'crop' ? (
            <div className="max-w-full max-h-full flex items-center justify-center">
              {!imageLoaded && (
                <div className="w-96 h-96 flex items-center justify-center bg-gray-200">
                  <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                </div>
              )}
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1} // Enforce 1:1 aspect ratio for coloring pages
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={src}
                  onLoad={onImageLoad}
                  style={{ maxHeight: '70vh', maxWidth: '100%', display: imageLoaded ? 'block' : 'none' }}
                />
              </ReactCrop>
            </div>
          ) : (
            <DrawingCanvas 
              src={src} 
              isProcessing={isProcessing} 
              onImageLoad={setImageLoaded}
              onCanvasReady={setDrawingSaveFn}
            />
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          {activeTab === 'crop' && (
            <button
              onClick={handleSaveCrop}
              disabled={!completedCrop || isProcessing || !imageLoaded}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Cropped Image
                </>
              )}
            </button>
          )}
          {activeTab === 'color' && (
            <button
              onClick={handleSaveDrawing}
              disabled={isProcessing || !imageLoaded}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Done Coloring & Save
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}