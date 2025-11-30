import { jsPDF } from 'jspdf';
import { Page, TRIM_SIZES, TrimDimensions } from '../types';
import { sanitizeFilename } from './textUtils';

// Local safe alias for Book data structure
interface Book {
  title: string;
  author: string | null;
  trim_size: keyof typeof TRIM_SIZES;
  font_size: number;
  has_front_cover: boolean;
  has_back_cover: boolean;
}

// Helper function to convert a URL to a Data URL (Base64)
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    // Use the proxy function to avoid CORS issues when fetching external images
    const proxyUrl = `https://lrwjdykjaulwwdswuuoa.supabase.co/functions/v1/proxy-image?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image from proxy: ${response.statusText}`);
      return null;
    }
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting URL to Data URL:', error);
    return null;
  }
}

// Constants for margins (in inches)
const MARGIN_INCHES = 0.5;

export async function generatePDF(book: Book, pages: Page[]): Promise<void> {
  const dimensions: TrimDimensions = TRIM_SIZES[book.trim_size] || TRIM_SIZES['8.5x11'];
  
  // Convert dimensions from inches to points (1 inch = 72 points)
  const widthPt = dimensions.width * 72;
  const heightPt = dimensions.height * 72;
  const marginPt = MARGIN_INCHES * 72;
  
  const doc = new jsPDF({
    orientation: widthPt > heightPt ? 'l' : 'p',
    unit: 'pt',
    format: [widthPt, heightPt],
  });
  
  // Set default font and size
  doc.setFont('helvetica');
  doc.setFontSize(book.font_size);
  
  // Calculate content area
  const contentWidth = widthPt - 2 * marginPt;
  const contentHeight = heightPt - 2 * marginPt;
  
  // Sort pages by pageNumber (0, 1, 2, ..., max+1)
  const sortedPages = pages.sort((a, b) => a.pageNumber - b.pageNumber);

  for (let i = 0; i < sortedPages.length; i++) {
    const page = sortedPages[i];
    
    // Add a new page unless it's the very first iteration (which uses the default page)
    if (i > 0) {
      doc.addPage([widthPt, heightPt], widthPt > heightPt ? 'l' : 'p');
    }
    
    let cursorY = marginPt;
    
    // --- DEBUG HEADER ---
    const pageTitle = page.pageNumber === 0 
      ? 'Front Cover' 
      : page.pageNumber === sortedPages[sortedPages.length - 1].pageNumber && book.has_back_cover
        ? 'Back Cover'
        : `Page ${page.pageNumber}`;
        
    doc.setFontSize(10);
    doc.text(`--- ${book.title} | ${pageTitle} ---`, marginPt, cursorY);
    cursorY += 15; // Move cursor down after header
    doc.setFontSize(book.font_size); // Reset font size
    
    // --- Handle Image Content ---
    if (page.imageUrl) {
      try {
        const dataUrl = await urlToDataUrl(page.imageUrl);
        if (dataUrl) {
          // Calculate image dimensions to fit the content area while maintaining aspect ratio
          const img = new Image();
          img.src = dataUrl;
          
          // Wait for image to load before calculating dimensions
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          
          const imgRatio = img.width / img.height;
          let targetWidth = contentWidth;
          let targetHeight = contentHeight;
          
          if (targetWidth / targetHeight > imgRatio) {
            // Constrained by height
            targetWidth = targetHeight * imgRatio;
          } else {
            // Constrained by width
            targetHeight = targetWidth / imgRatio;
          }
          
          const x = marginPt + (contentWidth - targetWidth) / 2;
          const y = marginPt + (contentHeight - targetHeight) / 2;
          
          doc.addImage(dataUrl, 'PNG', x, y, targetWidth, targetHeight);
        }
      } catch (e) {
        console.error(`Failed to add image for page ${page.pageNumber}:`, e);
        doc.text(`[Image Load Error: ${page.imageUrl}]`, marginPt, cursorY);
        cursorY += book.font_size * 2;
      }
    }
    
    // --- Handle Text Content ---
    if (page.content) {
      // Reset font size for text content
      doc.setFontSize(book.font_size);
      
      // Split text into lines that fit the content width
      const lines = doc.splitTextToSize(page.content, contentWidth);
      
      // Determine starting Y position for text
      let textStartY = cursorY + 10; // Start below the debug header
      
      if (page.imageUrl && page.activityTypes?.includes('tracing')) {
        // If it's a tracing page with an image, place text at the bottom
        textStartY = heightPt - marginPt - (lines.length * book.font_size * 1.2);
      } else if (page.imageUrl && !page.activityTypes?.includes('tracing')) {
        // If it's a coloring page with an image, we assume the image takes the whole page, 
        // so we skip text unless it's tracing.
        // For now, let's place it at the top if no image, or skip if image is present and not tracing.
        if (page.pageNumber > 0) {
            // Skip text if it's a standard coloring page (image only)
            textStartY = -1000; // Effectively hide it
        }
      }
      
      if (textStartY > marginPt) {
        doc.text(lines, marginPt, textStartY);
      }
    }
    
    // Add page number (optional, but helpful for KDP review)
    doc.setFontSize(8);
    doc.text(pageTitle, widthPt - marginPt, heightPt - marginPt + 10, { align: 'right' });
  }

  // Save the PDF
  const filename = sanitizeFilename(book.title || 'book') + '.pdf';
  doc.save(filename);
}