/// <reference types="https://deno.land/std@0.190.0/http/server.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore: Cannot find module 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  prompt: string;
  bookId?: string;
  activityTypes?: string[]; // Updated to array
}

// @ts-ignore: Deno.serve is available in the runtime environment
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { prompt, bookId, activityTypes }: RequestBody = await req.json(); 

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

    // @ts-ignore: Deno.env is available in the runtime environment
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let styleModifier = "Simple, clean black and white line art illustration suitable for coloring books. Use clear, bold outlines with no shading or colors, just black lines on a white background.";
    
    if (activityTypes?.includes('maze')) {
      styleModifier = "A complex, solvable maze illustration in black and white line art. The maze should be clearly defined and suitable for printing. Subject: ";
    } else if (activityTypes?.includes('dot-to-dot')) {
      styleModifier = "A simple black and white dot-to-dot puzzle illustration, clearly numbered, suitable for children. Subject: ";
    } else if (activityTypes?.includes('image')) {
      styleModifier = "A high-contrast black and white illustration suitable for a full-page image or cover. Style: ";
    } else if (activityTypes?.includes('coloring')) {
      styleModifier = "Simple, clean black and white line art illustration suitable for coloring books. Use clear, bold outlines with no shading or colors, just black lines on a white background. Subject: ";
    }

    const enhancedPrompt = `${styleModifier} Subject: ${prompt}.`;

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

    if (bookId) {
      // @ts-ignore: Deno.env is available in the runtime environment
      const supabase = createClient(
        // @ts-ignore
        Deno.env.get("SUPABASE_URL")!,
        // @ts-ignore
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      const fileName = `${bookId}/${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("book-images")
        .upload(fileName, imageBlob, { contentType: "image/png" });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from("book-images")
          .getPublicUrl(fileName);

        return new Response(
          JSON.stringify({ imageUrl: publicUrlData.publicUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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