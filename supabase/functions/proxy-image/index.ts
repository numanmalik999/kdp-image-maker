import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

declare const Deno: any;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("url");

    console.log('Proxy request received for:', imageUrl);

    if (!imageUrl) {
      console.error('Missing url parameter');
      return new Response(
        JSON.stringify({ error: "Missing url parameter" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log('Fetching image from:', imageUrl);
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    console.log('Image fetch status:', imageResponse.status);

    if (!imageResponse.ok) {
      console.error('Failed to fetch image:', imageResponse.status, imageResponse.statusText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch image",
          status: imageResponse.status,
          statusText: imageResponse.statusText
        }),
        {
          status: imageResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const imageBlob = await imageResponse.blob();
    const contentType = imageResponse.headers.get("content-type") || "image/png";
    
    // Extract filename for Content-Disposition header
    const filenameMatch = imageUrl.match(/[^/\\?#]+\.\w{3,4}(?=([?#]|$))/);
    const filename = filenameMatch ? filenameMatch[0] : 'image.png';

    console.log('Successfully proxied image, size:', imageBlob.size, 'type:', contentType);

    return new Response(imageBlob, {
      status: 200,
      headers: {
        // CRITICAL: Ensure CORS header is present on the final image response
        'Access-Control-Allow-Origin': '*', 
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
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