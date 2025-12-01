import { useState, useRef, useEffect, useCallback } from 'react';
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

// --- Constants ---
const COLOR_OPTIONS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFFFF']; // Black, Red, Green, Blue, White (Eraser)

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

export default function ImageEditorModal({ isOpen, onClose, src, onEditComplete, isProcessing }: ImageEditorModalProps) {
  const [mode, setMode] = useState<'crop' | 'draw'>('crop');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  
  // Refs for image and canvas
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [brushSize, setBrushSize] = useState(10);
  const [hasDrawn, setHasDrawn] = useState(false);
  
  // State to track if the canvas has been initialized with the image
  const [canvasInitialized, setCanvasInitialized] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setLoadError(false);
      setHasDrawn(false);
      setCanvasInitialized(false);
    }
  }, [isOpen, src]);

  if (!isOpen) return null;

  // --- Image Loading & Cropping Logic ---

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    // Default to 1:1 aspect ratio for coloring pages
    setCrop(centerAspectCrop(width, height, 1)); 
    setImageLoaded(true);
    setLoadError(false);
    
    // Initialize canvas immediately after image loads
    initializeCanvasForDrawing(e.currentTarget);
  };
  
  const onImageError = () => {
    setLoadError(true);
    setImageLoaded(false);
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
  
  // --- Drawing Logic ---
  
  const initializeCanvasForDrawing = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match the natural size of the loaded image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0);
    
    setCanvasInitialized(true);
    setHasDrawn(false);
    
  }, []);

  const getCanvasScale = (canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { scaleX, scaleY, rect };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isProcessing || !canvasInitialized) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { scaleX, scaleY, rect } = getCanvasScale(canvas);

    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isProcessing || !canvasInitialized) return;
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
  
  const handleSave = async () => {
    if (isProcessing) return;
    
    try {
      let blob: Blob;
      
      // If drawing was performed, save the canvas content
      if (hasDrawn && canvasRef.current) {
        blob = await new Promise((resolve, reject) => {
          canvasRef.current?.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas to Blob failed during drawing save.'));
          }, 'image/png');
        });
      } 
      // If cropping was performed (and no drawing), save the cropped image
      else if (completedCrop && imgRef.current) {
        blob = await getCroppedImage(imgRef.current, completedCrop);
      } 
      // If neither, use the original image (if loaded)
      else if (imgRef.current) {
        // If no changes, we still need to return a blob of the original image
        blob = await getCroppedImage(imgRef.current, { x: 0, y: 0, width: 100, height: 100, unit: '%' });
      } else {
        alert('Image not loaded.');
        return;
      }
      
      await onEditComplete(blob);
    } catch (error) {
      console.error('Error during save:', error);
      alert('Failed to save image changes.');
    }
  };
  
  const handleClearDrawing = () => {
    if (confirm('Are you sure you want to clear all drawings and revert to the original image?')) {
      if (imgRef.current) {
        initializeCanvasForDrawing(imgRef.current);
        setHasDrawn(false);
      }
    }
  };

  const isSaveDisabled = isProcessing || !imageLoaded;

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

        <div className="flex-1 overflow-hidden p-4 flex gap-4 bg-gray-100">
          
          {/* Left Sidebar: Controls/Palette (Always visible) */}
          <div className="flex-shrink-0 w-64 p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col space-y-4 overflow-y-auto">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Tools</h4>
            
            <div className="flex gap-2">
              <button
                onClick={() => setMode('crop')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors flex-1 justify-center ${
                  mode === 'crop'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={!imageLoaded}
              >
                <CropIcon className="w-4 h-4" />
                Crop Mode
              </button>
              <button
                onClick={() => setMode('draw')}
                disabled={!imageLoaded}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors flex-1 justify-center ${
                  mode === 'draw'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                }`}
              >
                <Palette className="w-4 h-4" />
                Draw Mode
              </button>
            </div>
            
            {mode === 'draw' && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">Drawing Tools</h4>
                
                {/* Color Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color / Tool:</label>
                  <div className="flex flex-wrap gap-3">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
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
                    disabled={loadError}
                  />
                  <span className="text-sm text-gray-600 mt-1 block text-center">{brushSize}px</span>
                </div>
                
                <button
                  onClick={handleClearDrawing}
                  disabled={!hasDrawn}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
                >
                  Clear Drawing
                </button>
              </div>
            )}
          </div>
          
          {/* Right Area: Image/Canvas Display */}
          <div className="flex-1 flex items-center justify-center overflow-auto bg-gray-200 rounded-lg min-h-[400px] relative">
            {loadError ? (
              <div className="text-center p-8 text-red-700">
                <p className="font-semibold mb-2">Error Loading Image</p>
                <p className="text-sm text-gray-600">Could not load the image. Please ensure the image URL is valid and the proxy function is working.</p>
              </div>
            ) : !imageLoaded && (
              <div className="w-96 h-96 flex items-center justify-center bg-gray-200">
                <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
              </div>
            )}
            
            {/* Image Container: Always render ReactCrop to handle image loading */}
            <div className="max-w-full max-h-full flex items-center justify-center" style={{ display: imageLoaded ? 'block' : 'none' }}>
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1} // Enforce 1:1 aspect ratio for coloring pages
                disabled={mode === 'draw'} // Disable cropping handles in draw mode
              >
                <img
                  ref={imgRef}
                  alt="Editable image"
                  src={src}
                  onLoad={onImageLoad}
                  onError={onImageError}
                  // Ensure the image is visible in crop mode, and hidden/static in draw mode
                  style={{ 
                    maxHeight: '70vh', 
                    maxWidth: '100%',
                    opacity: mode === 'draw' ? 0 : 1, // Hide image in draw mode
                    pointerEvents: mode === 'draw' ? 'none' : 'auto',
                  }}
                />
              </ReactCrop>
            </div>
            
            {/* Drawing Canvas Overlay */}
            {imageLoaded && (
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className={`absolute top-0 left-0 w-full h-full cursor-crosshair border border-gray-400 shadow-lg ${mode === 'draw' ? 'block' : 'hidden'}`}
                style={{ 
                  // Match the size of the ReactCrop container dynamically
                  width: imgRef.current?.clientWidth,
                  height: imgRef.current?.clientHeight,
                  touchAction: 'none', 
                }}
              />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
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
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}