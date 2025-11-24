import { Chapter } from '../types';

interface GeneratedContent {
  title: string;
  chapters: Array<{
    title: string;
    content: string;
  }>;
}

export async function generateBookContent(
  prompt: string,
  targetPages: number,
  fontSize: number,
  trimSize: string
): Promise<GeneratedContent> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-book-content`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      targetPages,
      fontSize,
      trimSize,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to generate content');
  }

  const data = await response.json();
  return data;
}

export function convertToChapters(generatedContent: GeneratedContent): Chapter[] {
  return generatedContent.chapters.map((chapter, index) => ({
    id: `${Date.now()}-${index}`,
    title: chapter.title,
    content: chapter.content,
  }));
}

export async function generatePageContent(
  prompt: string,
  pageNumber: number,
  totalPages: number,
  fontSize: number,
  bookContext?: string
): Promise<string> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-page-content`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      pageNumber,
      totalPages,
      fontSize,
      bookContext,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to generate page content');
  }

  const data = await response.json();
  return data.content;
}

export async function generateColoringImage(prompt: string, model: string = 'DALL-E 3', bookId?: string): Promise<string> {
  let functionName = 'generate-coloring-image';

  if (model === 'Gemini') {
    throw new Error('Gemini does not support direct image generation. Please use DALL-E 3 for coloring page images.');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      bookId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to generate image');
  }

  const data = await response.json();
  return data.imageUrl;
}

export function convertToSingleText(generatedContent: GeneratedContent): string {
  return generatedContent.chapters
    .map(chapter => `${chapter.title}\n\n${chapter.content}`)
    .join('\n\n\n');
}
