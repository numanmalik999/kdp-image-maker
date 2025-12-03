import { PageActivityType, TextModel, ImageModel } from '../types';
import { SUPABASE_URL } from '../lib/config';
import { supabase } from '../lib/supabase'; // Import supabase client

export interface GeneratedContent {
  title: string;
  chapters: Array<{
    title: string;
    content: string;
  }>;
}

// ... (existing functions: generateBookContent, convertToChapters, generatePageContent)

export async function generateColoringImage(
  prompt: string,
  token: string,
  apiKey: string, // New: User's API Key
  model: ImageModel, // New: User's selected model
  bookId?: string,
  activityTypes?: PageActivityType[],
  tracingWord?: string,
  referenceImageUrl?: string // New: Reference image URL
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
      apiKey,
      referenceImageUrl, // Pass reference image URL
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

/**
 * Uploads a reference image file to temporary storage and returns the public URL.
 * @param file The image file to upload.
 * @param userId The ID of the authenticated user.
 * @returns The public URL of the uploaded image.
 */
export async function uploadReferenceImage(file: File, userId: string): Promise<string> {
  const filename = `references/${userId}/${Date.now()}-${file.name.replace(/\.[^/.]+$/, "")}.png`;
  
  const { error: uploadError } = await supabase.storage
    .from('coloring_images') // Using the existing bucket
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error('Reference Image Upload Error:', uploadError);
    throw new Error(`Reference Image Upload Failed: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('coloring_images')
    .getPublicUrl(filename);

  return publicUrlData.publicUrl;
}