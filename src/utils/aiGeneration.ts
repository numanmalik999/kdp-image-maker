import { PageActivityType, TextModel, ImageModel } from '../types';
import { SUPABASE_URL } from '../lib/config';

export interface GeneratedContent {
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
  token: string,
  apiKey: string, // New: User's API Key
  model: TextModel // New: User's selected model
): Promise<GeneratedContent> {
  const apiUrl = `${SUPABASE_URL}/functions/v1/generate-book-content`;
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, targetPages, fontSize, trimSize, apiKey, model }),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to generate book content');
  }

  return await res.json() as GeneratedContent;
}

export function convertToChapters(generatedContent: GeneratedContent): { id: string; title: string; content: string }[] {
  return generatedContent.chapters.map((chapter, idx) => ({
    id: `${Date.now()}-${idx}`,
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
  apiKey: string, // New: User's API Key
  model: TextModel, // New: User's selected model
  bookContext?: string,
  activityTypes?: PageActivityType[]
): Promise<string> {
  const apiUrl = `${SUPABASE_URL}/functions/v1/generate-page-content`;
  const res = await fetch(apiUrl, {
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
      activityTypes,
      apiKey, // Pass API Key
      model, // Pass Model
    }),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to generate page content');
  }

  const data = await res.json();
  return data.content;
}

export async function generateColoringImage(
  prompt: string,
  token: string,
  apiKey: string, // New: User's API Key
  model: ImageModel, // New: User's selected model
  bookId?: string,
  activityTypes?: PageActivityType[],
  tracingWord?: string
): Promise<string> {
  const apiUrl = `${SUPABASE_URL}/functions/v1/generate-coloring-image`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`,
    },
    body: JSON.stringify({
      prompt,
      model,
      bookId,
      activityTypes,
      tracingWord,
      apiKey, // Pass API Key
    }),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to generate image');
  }

  const data = await res.json();
  return data.imageUrl;
}

export function convertToSingleText(generatedContent: GeneratedContent): string {
  return generatedContent.chapters.map(ch => `${ch.title}\n\n${ch.content}`).join('\n\n\n');
}