import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-info, Apikey",
};

interface RequestBody {
  prompt: string;
  pageNumber: number;
  totalPages: number;
  fontSize: number;
  bookContext?: string;
  activityType?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { prompt, pageNumber, totalPages, fontSize, bookContext, activityType }: RequestBody = await req.json();

    if (!prompt || !pageNumber) {
      return new Response(
        JSON.stringify({ error: "Prompt and pageNumber are required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          error: "AI service not configured. Please contact the administrator."
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let systemPrompt: string;
    let userContent: string;

    if (activityType === 'coloring') {
      // If activity is coloring/tracing, generate simple, repetitive text based on the prompt for tracing practice.
      // We ignore word count limits here as tracing text is short and large.
      systemPrompt = `You are a content generator for children's coloring and tracing books. Your task is to generate simple, repetitive text suitable for tracing practice based on the user's prompt.

CRITICAL REQUIREMENTS:
1. The output must be short, simple, and repetitive (e.g., repeating a word or short phrase 5-10 times).
2. Use the exact text provided in the user prompt as the basis for the tracing content.
3. Do not add any headers, titles, or explanations. Return ONLY the tracing text as plain text, with line breaks between repetitions.
4. The text should be suitable for a large font size (18-24pt) for tracing.`;
      
      userContent = `Generate tracing text based on this phrase: "${prompt}"`;

    } else {
      // Default behavior for story/text pages
      const wordsPerPage = fontSize === 10 ? 300 : fontSize === 11 ? 275 : 250;

      systemPrompt = `You are a professional book writer. Generate content for a single page of a book.

CRITICAL REQUIREMENTS:
1. Generate approximately ${wordsPerPage} words (for one page at ${fontSize}pt font)
2. This is page ${pageNumber} of ${totalPages} total pages
3. Use proper paragraphs with line breaks
4. Make the content engaging and well-written
5. Match the tone and style appropriate for the book description
6. The content should flow naturally and be a complete thought or scene
7. Do not add page numbers or headers - just the content

${bookContext ? `BOOK CONTEXT: ${bookContext}` : ''}

Return ONLY the page content as plain text, no JSON or formatting.`;

      userContent = `Generate page ${pageNumber} content based on: ${prompt}`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.8,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      return new Response(
        JSON.stringify({
          error: "Failed to generate content. Please try again."
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();
    const pageContent = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ content: pageContent }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unexpected error occurred"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});