export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function estimatePages(wordCount: number, fontSize: number): number {
  let wordsPerPage = 250;

  if (fontSize === 10) {
    wordsPerPage = 300;
  } else if (fontSize === 11) {
    wordsPerPage = 275;
  } else if (fontSize === 12) {
    wordsPerPage = 250;
  }

  return Math.ceil(wordCount / wordsPerPage);
}

export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'book';
}
