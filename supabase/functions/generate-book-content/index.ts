import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  prompt: string;
  targetPages: number;
  fontSize: number;
  trimSize: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { prompt, targetPages, fontSize }: RequestBody = await req.json();

    if (!prompt || !targetPages) {
      return new Response(
        JSON.stringify({ error: "Prompt and targetPages are required" }),
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
    const estimatedWords = targetPages * wordsPerPage;

    const systemPrompt = `You are a professional book writer and content generator. Generate book content based on the user's description.

CRITICAL REQUIREMENTS:
1. Generate approximately ${estimatedWords} words (for ${targetPages} pages at ${fontSize}pt font)
2. Structure the content with clear chapters
3. Each chapter should have a descriptive title
4. Use proper paragraphs with line breaks
5. Make the content engaging, well-written, and professional
6. Match the tone and style appropriate for the book description
7. For children's books, use simple language and short sentences
8. For adult books, use more sophisticated language and longer paragraphs

Format the response as a JSON object with this structure:
{
  "title": "Generated Book Title",
  "chapters": [
    {
      "title": "Chapter Title",
      "content": "Chapter content with proper paragraphs..."
    }
  ]
}`;

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
            content: `Generate a complete book based on this description: ${prompt}\n\nThe book should be approximately ${targetPages} pages (${estimatedWords} words).`,
          },
        ],
        temperature: 0.8,
        max_tokens: 16000,
        response_format: { type: "json_object" },
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
    const generatedText = data.choices[0].message.content;

    let bookContent;
    try {
      bookContent = JSON.parse(generatedText);
    } catch (parseError) {
      bookContent = {
        title: "Generated Book",
        chapters: [
          {
            title: "Chapter 1",
            content: generatedText,
          },
        ],
      };
    }

    return new Response(
      JSON.stringify(bookContent),
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