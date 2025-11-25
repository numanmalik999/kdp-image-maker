import { Chapter, PageActivityType } from '../types';
import { SUPABASE_URL } from '../lib/config'; // Removed SUPABASE_ANON_KEY import

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
  trimSize: string,
  token: string
): Promise<GeneratedContent> {
  const apiUrl = `${SUPABASE_URL}/functions/v1/generate-book-content`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
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
  token: string,
  bookContext?: string,
  activityType?: PageActivityType // Added activityType
): Promise<string> {
  const apiUrl = `${SUPABASE_URL}/functions/v1/generate-page-content`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      pageNumber,
      totalPages,
      fontSize,
      bookContext,
      activityType, // Passed activityType to Edge Function
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to generate page content');
  }

  const data = await response.json();
  return data.content;
}

export async function generateColoringImage(
  prompt: string, 
  model: string = 'DALL-E 3', 
  bookId?: string, 
  token?: string,
  activityType?: PageActivityType // Added activityType
): Promise<string> {
  let functionName = 'generate-coloring-image';

  if (model === 'Gemini') {
    throw new Error('Gemini does not support direct image generation. Please use DALL-E 3 for coloring page images.');
  }

  const apiUrl = `${SUPABASE_URL}/functions/v1/${functionName}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      // Use token if provided, otherwise rely on function configuration (though this function should ideally be authenticated too)
      'Authorization': `Bearer ${token || ''}`, 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      bookId,
      activityType, // Passed activityType to Edge Function
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