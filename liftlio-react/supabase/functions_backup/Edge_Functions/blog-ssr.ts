// =============================================
// Edge Function: blog-ssr
// Description: Serves pre-rendered HTML for blog pages (SEO)
// Created: 2026-01-03
// Cost: Minimal - just fetches pre-generated HTML from database
//
// Routes:
// GET /blog-ssr?slug=my-post → Single post HTML
// GET /blog-ssr              → Blog listing HTML
// =============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    let html: string;

    if (slug) {
      // Get single post HTML
      const { data, error } = await supabase.rpc("get_blog_html", { p_slug: slug });

      if (error) {
        console.error("Error fetching blog post:", error);
        html = get404Html();
      } else {
        html = data || get404Html();
      }
    } else {
      // Get blog listing HTML
      const { data, error } = await supabase.rpc("get_blog_list_html");

      if (error) {
        console.error("Error fetching blog list:", error);
        html = getErrorHtml();
      } else {
        html = data || getErrorHtml();
      }
    }

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Content-Source": "supabase-ssr",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(getErrorHtml(), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
});

function get404Html(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Post Not Found - Liftlio Blog</title>
  <meta name="robots" content="noindex">
  <style>
    body { font-family: Inter, sans-serif; background: #0f0a1a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .container { text-align: center; padding: 40px; }
    h1 { color: #8b5cf6; margin-bottom: 16px; }
    a { color: #8b5cf6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>404 - Post Not Found</h1>
    <p>The blog post you are looking for does not exist.</p>
    <p><a href="https://liftlio.com/blog">Back to Blog</a></p>
  </div>
</body>
</html>`;
}

function getErrorHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - Liftlio Blog</title>
  <meta name="robots" content="noindex">
  <style>
    body { font-family: Inter, sans-serif; background: #0f0a1a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .container { text-align: center; padding: 40px; }
    h1 { color: #8b5cf6; margin-bottom: 16px; }
    a { color: #8b5cf6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Something went wrong</h1>
    <p>Please try again later.</p>
    <p><a href="https://liftlio.com">Back to Home</a></p>
  </div>
</body>
</html>`;
}
