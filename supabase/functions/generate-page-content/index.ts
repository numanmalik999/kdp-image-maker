import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  prompt: string;
  pageNumber: number;
  totalPages: number;
  fontSize: number;
  bookContext?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { prompt, pageNumber, totalPages, fontSize, bookContext }: RequestBody = await req.json();

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

    const wordsPerPage = fontSize === 10 ? 300 : fontSize === 11 ? 275 : 250;

    const systemPrompt = `You are a professional book writer. Generate content for a single page of a book.

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
            content: `Generate page ${pageNumber} content based on: ${prompt}`,
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