import { Book, Page } from '../types';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function createZipContent(files: { path: string; content: string | Uint8Array }[]): Blob {
  throw new Error('EPUB generation requires a ZIP library. This feature is not yet implemented.');
}

export async function generateEPUB(book: Book, pages: Page[]): Promise<void> {
  alert(
    'EPUB export is a premium feature that requires additional libraries.\n\n' +
    'For now, please use PDF export which is fully functional.\n\n' +
    'EPUB support coming soon!'
  );
  return;
}

export function validateEPUBSupport(): boolean {
  return false;
}
