import { TRIM_SIZES, TrimDimensions } from '../types';

/**
 * Loads an image file and returns it as an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Crops an image file to match the aspect ratio of the specified trim size.
 * It centers the crop area to maximize the image content.
 * @param file The image file to crop.
 * @param trimSize The target trim size string (e.g., '8.5x11').
 * @returns A Promise that resolves to the cropped image Blob (PNG format).
 */
export async function cropImageToTrimSize(file: File, trimSize: keyof typeof TRIM_SIZES): Promise<Blob> {
  const dimensions: TrimDimensions = TRIM_SIZES[trimSize] || TRIM_SIZES['8.5x11'];
  const targetAspect = dimensions.width / dimensions.height;

  const img = await loadImage(file);
  const { naturalWidth: imgWidth, naturalHeight: imgHeight } = img;
  const imgAspect = imgWidth / imgHeight;

  let cropWidth: number;
  let cropHeight: number;
  let cropX: number;
  let cropY: number;

  if (imgAspect > targetAspect) {
    // Image is wider than target aspect, constrained by height
    cropHeight = imgHeight;
    cropWidth = imgHeight * targetAspect;
    cropX = (imgWidth - cropWidth) / 2;
    cropY = 0;
  } else {
    // Image is taller or equal to target aspect, constrained by width
    cropWidth = imgWidth;
    cropHeight = imgWidth / targetAspect;
    cropX = 0;
    cropY = (imgHeight - cropHeight) / 2;
  }

  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context for cropping.');
  }

  // Draw the cropped section of the original image onto the new canvas
  ctx.drawImage(
    img,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas to Blob failed during cropping.'));
      }
    }, 'image/png');
  });
}