import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  prompt: string;
  activityTypes?: string[];
  tracingWord?: string;
  apiKey: string; // New: User's API Key
  model: string; // New: User's selected model (should be dall-e-3)
  referenceImageUrl?: string; // New: Reference image URL
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
    const requestBody = await req.json();
    const { prompt, activityTypes, tracingWord, apiKey, model, referenceImageUrl } = requestBody as RequestBody;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI API Key is required for generation." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (model !== 'dall-e-3') {
      return new Response(JSON.stringify({ error: `Unsupported image model: ${model}. Only DALL-E 3 is supported.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const tracingNote = tracingWord && activityTypes?.includes('tracing')
      ? ` Include the tracing word '${tracingWord}' in large bold letters at the bottom of the image for tracing practice.`
      : '';
      
    // If a reference image is provided, add a note to the prompt to guide the style
    const referenceNote = referenceImageUrl 
      ? ` IMPORTANT: Use the style and composition of the image found at this URL as a strong reference: ${referenceImageUrl}`
      : '';

    const enhancedPrompt = `${styleModifier} Subject: ${prompt}.` + tracingNote + referenceNote;
    
    console.log("Enhanced Prompt:", enhancedPrompt);
    console.log("Reference Image URL:", referenceImageUrl);

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`, // Use client-provided key
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
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to generate image with DALL-E 3. Check your API key and usage limits." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    // Return the image URL directly
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