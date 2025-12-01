import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Save, Loader2, Crop as CropIcon } from 'lucide-react';

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

export default function ImageEditorModal({ isOpen, onClose, src, onEditComplete, isProcessing }: ImageEditorModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  
  // Refs for image and canvas
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setLoadError(false);
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
  
  const handleSave = async () => {
    if (isProcessing || !completedCrop || !imgRef.current) return;
    
    try {
      const blob = await getCroppedImage(imgRef.current, completedCrop);
      await onEditComplete(blob);
    } catch (error) {
      console.error('Error during save:', error);
      alert('Failed to save image changes.');
    }
  };

  const isSaveDisabled = isProcessing || !imageLoaded || !completedCrop;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Crop Image</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex gap-4 bg-gray-100">
          
          {/* Left Sidebar: Controls/Palette (Cropping is the only mode now) */}
          <div className="flex-shrink-0 w-64 p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col space-y-4 overflow-y-auto">
            <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <CropIcon className="w-5 h-5 text-blue-600" />
              Crop Tool
            </h4>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">Aspect Ratio:</p>
              <p>The crop area is locked to a 1:1 aspect ratio, suitable for square coloring pages.</p>
            </div>
          </div>
          
          {/* Right Area: Image Display */}
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
            
            {imageLoaded && (
              <div className="max-w-full max-h-full flex items-center justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1} // Enforce 1:1 aspect ratio
                >
                  <img
                    ref={imgRef}
                    alt="Editable image"
                    src={src}
                    onLoad={onImageLoad}
                    onError={onImageError}
                    crossOrigin="anonymous"
                    style={{ 
                      maxHeight: '70vh', 
                      maxWidth: '100%',
                    }}
                  />
                </ReactCrop>
              </div>
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
                Save Cropped Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}