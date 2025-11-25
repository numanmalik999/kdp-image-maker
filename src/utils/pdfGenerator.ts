import jsPDF from 'jspdf';
import { BookSettings, Chapter, Page, TRIM_SIZES } from '../types';
import { sanitizeFilename } from './textUtils';
import { Book } from '../lib/supabase';

export interface PDFGeneratorOptions {
  settings: BookSettings;
  content: string;
  chapters?: Chapter[];
  pages?: Page[];
  useChapters: boolean;
  usePages: boolean;
}

export async function generateKDPPDF(options: PDFGeneratorOptions): Promise<void> {
  const { settings, content, chapters, pages, useChapters, usePages } = options;
  const { title, author, trimSize, fontSize } = settings;

  const dimensions = TRIM_SIZES[trimSize];
  const widthInches = dimensions.width;
  const heightInches = dimensions.height;

  const doc = new jsPDF({
    orientation: widthInches > heightInches ? 'landscape' : 'portrait',
    unit: 'in',
    format: [widthInches, heightInches],
  });

  const margin = 0.75;
  const pageWidth = widthInches;
  const pageHeight = heightInches;
  const textWidth = pageWidth - 2 * margin;

  doc.setFont('helvetica');

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(title || 'Untitled Book', textWidth);
  const titleHeight = titleLines.length * 0.35;
  const titleY = (pageHeight - titleHeight) / 2;
  doc.text(titleLines, pageWidth / 2, titleY, { align: 'center' });

  if (author) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(author, pageWidth / 2, titleY + titleHeight + 0.5, { align: 'center' });
  }

  doc.addPage();

  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');

  let yPosition = margin;

  const addTextToPage = (text: string, isChapterTitle = false) => {
    if (isChapterTitle) {
      if (yPosition > margin + 1) {
        doc.addPage();
        yPosition = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize + 2);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
    }

    const lines = doc.splitTextToSize(text, textWidth);
    const lineHeight = fontSize / 72 * 1.2;

    for (const line of lines) {
      if (yPosition + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    }

    if (isChapterTitle) {
      yPosition += lineHeight * 0.5;
    }
  };

  const addImageToPage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const imgWidth = textWidth;
      const imgHeight = imgWidth;

      if (yPosition + imgHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.addImage(base64, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + (fontSize / 72) * 0.5;
    } catch (error) {
      console.error('Error adding image to PDF:', error);
    }
  };

  if (usePages && pages && pages.length > 0) {
    for (const [index, page] of pages.entries()) {
      // Determine if this is a coloring/tracing page
      const isColoringPage = page.activityTypes?.includes('coloring');
      
      // Reset Y position for a new page if needed
      if (index > 0) {
        doc.addPage();
        yPosition = margin;
      }

      if (page.imageUrl) {
        await addImageToPage(page.imageUrl);
      }

      if (page.content) {
        const paragraphs = page.content.split(/\n\n+/);
        
        // Apply larger font size for tracing text
        if (isColoringPage) {
          doc.setFontSize(24); // Use a large font for tracing
          doc.setFont('helvetica', 'normal');
        } else {
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', 'normal');
        }

        paragraphs.forEach((paragraph, pIndex) => {
          if (paragraph.trim()) {
            // Use a custom text adder for coloring pages to handle large font
            const currentFontSize = isColoringPage ? 24 : fontSize;
            const lines = doc.splitTextToSize(paragraph.trim(), textWidth);
            const lineHeight = currentFontSize / 72 * 1.2;

            for (const line of lines) {
              if (yPosition + lineHeight > pageHeight - margin) {
                // If text overflows, add a new page
                doc.addPage();
                yPosition = margin;
                
                // Reapply font settings on new page
                if (isColoringPage) {
                  doc.setFontSize(24);
                } else {
                  doc.setFontSize(fontSize);
                }
              }

              doc.text(line, margin, yPosition);
              yPosition += lineHeight;
            }

            if (pIndex < paragraphs.length - 1) {
              yPosition += (currentFontSize / 72) * 0.5;
            }
          }
        });
      }
    }
  } else if (useChapters && chapters && chapters.length > 0) {
    chapters.forEach((chapter, index) => {
      if (chapter.title) {
        addTextToPage(chapter.title, true);
      }

      if (chapter.content) {
        const paragraphs = chapter.content.split(/\n\n+/);
        paragraphs.forEach((paragraph, pIndex) => {
          if (paragraph.trim()) {
            addTextToPage(paragraph.trim());
            if (pIndex < paragraphs.length - 1) {
              yPosition += (fontSize / 72) * 0.5;
            }
          }
        });
      }

      if (index < chapters.length - 1) {
        yPosition += (fontSize / 72) * 1.5;
      }
    });
  } else {
    const paragraphs = content.split(/\n\n+/);
    paragraphs.forEach((paragraph, index) => {
      if (paragraph.trim()) {
        addTextToPage(paragraph.trim());
        if (index < paragraphs.length - 1) {
          yPosition += (fontSize / 72) * 0.5;
        }
      }
    });
  }

  const filename = `${sanitizeFilename(title)}-kdp.pdf`;
  doc.save(filename);
}

export async function generatePDF(book: Book, pages: Page[]): Promise<void> {
  const dimensions = TRIM_SIZES[book.trim_size];
  const widthInches = dimensions.width;
  const heightInches = dimensions.height;

  const doc = new jsPDF({
    orientation: widthInches > heightInches ? 'landscape' : 'portrait',
    unit: 'in',
    format: [widthInches, heightInches],
  });

  const margin = 0.5;
  const pageWidth = widthInches;
  const pageHeight = heightInches;
  const textWidth = pageWidth - 2 * margin;

  doc.setFont('helvetica');

  const loadImageAsBase64 = async (url: string): Promise<{ base64: string; width: number; height: number }> => {
    if (url.includes('oaidalleapiprodscus.blob.core.windows.net')) {
      throw new Error('EXPIRED_DALLE_URL');
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ base64, width: img.width, height: img.height });
      img.onerror = reject;
      img.src = base64;
    });
  };

  const addImageToPage = async (imageUrl: string, reserveTextSpace: boolean = false): Promise<number> => {
    try {
      const { base64, width, height } = await loadImageAsBase64(imageUrl);

      const imgAspectRatio = width / height;
      const maxWidth = pageWidth - 2 * margin;
      // Reserve more space for coloring pages (e.g., 75% of height)
      const maxHeight = reserveTextSpace ? (pageHeight * 0.75 - margin) : (pageHeight - 2 * margin);

      let finalWidth = maxWidth;
      let finalHeight = maxWidth / imgAspectRatio;

      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = maxHeight * imgAspectRatio;
      }

      const x = margin + (maxWidth - finalWidth) / 2;
      const y = margin;

      doc.addImage(base64, 'PNG', x, y, finalWidth, finalHeight);

      return y + finalHeight + 0.3;
    } catch (error: any) {
      console.error('Error adding image to PDF:', error);
      doc.setFontSize(10);
      doc.setTextColor(255, 0, 0);

      if (error?.message === 'EXPIRED_DALLE_URL') {
        doc.text('[Image expired - please regenerate]', pageWidth / 2, pageHeight / 3, { align: 'center' });
      } else {
        doc.text('[Image could not be loaded]', pageWidth / 2, pageHeight / 3, { align: 'center' });
      }

      doc.setTextColor(0, 0, 0);
      return pageHeight / 3 + 0.5;
    }
  };

  const addTextToPage = (text: string, startY: number = margin, isTracing: boolean = false) => {
    const baseFontSize = book.font_size;
    const tracingFontSize = 24; // Large font for tracing

    doc.setFontSize(isTracing ? tracingFontSize : baseFontSize);
    doc.setFont('helvetica', 'normal');

    const currentFontSize = isTracing ? tracingFontSize : baseFontSize;
    const lineHeight = currentFontSize / 72 * 1.2;

    const lines = doc.splitTextToSize(text, textWidth);
    let yPosition = startY;

    for (const line of lines) {
      if (yPosition + lineHeight > pageHeight - margin) {
        break;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    }
  };

  let isFirstPage = true;

  for (const page of pages) {
    if (!isFirstPage) doc.addPage();
    isFirstPage = false;

    const isTracingPage = page.activityTypes?.includes('tracing');
    const hasImageActivity = page.activityTypes?.some(t => ['coloring', 'maze', 'dot-to-dot', 'image'].includes(t));
    
    let textStartY = margin;

    if (page.imageUrl && hasImageActivity) {
      // Reserve space for text if it's a tracing page or story page
      const reserveSpace = isTracingPage || page.activityTypes?.includes('story');
      textStartY = await addImageToPage(page.imageUrl, reserveSpace);
    }

    if (page.content) {
      addTextToPage(page.content, textStartY, isTracingPage);
    }
  }

  doc.save(`${sanitizeFilename(book.title)}.pdf`);
}