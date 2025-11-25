import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  prompt: string;
  bookId?: string;
  activityTypes?: string[];
  tracingWord?: string;
}

// @ts-ignore: Deno is available in edge runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { prompt, bookId, activityTypes, tracingWord }: RequestBody = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // @ts-ignore: OpenAI key provided in environment by edge runtime
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt with tracing word if provided
    let styleModifier = "A simple, clean black and white line art coloring page illustration suitable for coloring books. Use clear, bold outlines with no shading or colors, just black lines on a white background.";

    if (activityTypes?.includes('maze')) {
      styleModifier = "A complex, solvable maze illustration in black and white line art. The maze should be clearly defined and suitable for printing. Subject: ";
    } else if (activityTypes?.includes('dot-to-dot')) {
      styleModifier = "A simple black and white dot-to-dot puzzle illustration, clearly numbered, suitable for children. Subject: ";
    } else if (activityTypes?.includes('image')) {
      styleModifier = "A high-contrast black and white illustration suitable for a full-page image or cover. Style: ";
    } else if (activityTypes?.includes('coloring')) {
      styleModifier = "Simple, clean black and white line art illustration suitable for coloring books. Use clear, bold outlines with no shading or colors, just black lines on a white background. Subject: ";
    }

    // If tracingWord is provided, request it to appear in the image
    const tracingNote = tracingWord && tracingWord.trim()
      ? ` Include the tracing word '${tracingWord}' in large bold letters at the bottom of the image for tracing practice.`
      : '';

    const enhancedPrompt = `${styleModifier} Subject: ${prompt}.` + tracingNote;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error");
      return new Response(
        JSON.stringify({ error: "Failed to generate image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    // If a bookId is provided, attempt to upload to storage (best-effort)
    // Storage path handling is omitted in this patch to keep things lean.
    // Return the public URL directly for now.
    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? 'Internal error' }),
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