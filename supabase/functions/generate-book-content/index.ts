import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: any;

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
  apiKey: string; // New: User's API Key
  model: string; // New: User's selected model
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { prompt, targetPages, fontSize, apiKey, model }: RequestBody = await req.json();

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
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI API Key is required for generation." }),
        {
          status: 401,
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

    let response;
    let generatedText;

    if (model.startsWith('gpt')) {
      // OpenAI API Call
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate a complete book based on this description: ${prompt}\n\nThe book should be approximately ${targetPages} pages (${estimatedWords} words).` },
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
          JSON.stringify({ error: "Failed to generate content with OpenAI. Check your API key and usage limits." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const data = await response.json();
      generatedText = data.choices[0].message.content;

    } else if (model.startsWith('gemini')) {
      // Gemini API Call
      const geminiApiKey = apiKey; // Assuming apiKey holds the Gemini key if selected
      
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\nUser Request: Generate a complete book based on this description: ${prompt}\n\nThe book should be approximately ${targetPages} pages (${estimatedWords} words).`
              }]
            }],
            config: {
              temperature: 0.8,
              responseMimeType: "application/json",
            }
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Gemini API error:", errorData);
        return new Response(
          JSON.stringify({ error: "Failed to generate content with Gemini. Check your API key and usage limits." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const data = await response.json();
      generatedText = data.candidates[0].content.parts[0].text;

    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported model: ${model}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let bookContent;
    try {
      bookContent = JSON.parse(generatedText);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", generatedText);
      bookContent = {
        title: "Generated Book (Parse Error)",
        chapters: [{ title: "Content", content: generatedText }],
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