import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

interface MarketPriceRequest {
  items: Array<{
    description: string;
    unit: string;
    item_number: string;
  }>;
  city?: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const { userId, error: authError } = await verifyAuth(req);
    if (authError) return authError;

    const { items, city = "Riyadh", language = "ar" } = await req.json() as MarketPriceRequest;

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit to 10 items per request
    const limitedItems = items.slice(0, 10);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const cachedResults: Record<string, any> = {};
    const uncachedItems: typeof limitedItems = [];

    for (const item of limitedItems) {
      const cacheKey = `${item.description}|${city}`.toLowerCase().trim();
      const { data: cached } = await supabase
        .from("market_price_cache")
        .select("result_data")
        .eq("search_query", cacheKey)
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (cached) {
        cachedResults[item.item_number] = cached.result_data;
      } else {
        uncachedItems.push(item);
      }
    }

    // If all cached, return immediately
    if (uncachedItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, results: cachedResults, fromCache: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI (gemini-2.5-flash) to get market price estimates
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const itemsList = uncachedItems.map((item, i) => 
      `${i + 1}. "${item.description}" (Unit: ${item.unit || "N/A"}, Item#: ${item.item_number})`
    ).join("\n");

    const prompt = language === "ar" 
      ? `أنت خبير في تسعير مواد ومقاولات البناء في منطقة الشرق الأوسط. أعطني تقديرات أسعار السوق الحالية (2025) للبنود التالية في مدينة ${city}.

البنود:
${itemsList}

أجب بصيغة JSON فقط بدون أي نص إضافي. الصيغة المطلوبة:
{
  "prices": [
    {
      "item_number": "رقم البند",
      "min_price": الحد الأدنى للسعر (رقم),
      "max_price": الحد الأقصى للسعر (رقم),
      "avg_price": متوسط السعر (رقم),
      "currency": "SAR",
      "confidence": "high/medium/low",
      "notes": "ملاحظات مختصرة عن السعر",
      "sources": ["مصدر 1", "مصدر 2"]
    }
  ]
}

مهم: الأسعار بعملة الريال السعودي أو ما يناسب المدينة. كن واقعياً ودقيقاً.`
      : `You are a construction pricing expert for the Middle East region. Provide current market price estimates (2025) for the following items in ${city}.

Items:
${itemsList}

Respond in JSON only, no extra text. Format:
{
  "prices": [
    {
      "item_number": "item number",
      "min_price": minimum price (number),
      "max_price": maximum price (number),
      "avg_price": average price (number),
      "currency": "SAR",
      "confidence": "high/medium/low",
      "notes": "brief notes about the price",
      "sources": ["source 1", "source 2"]
    }
  ]
}

Important: Use SAR or appropriate currency for the city. Be realistic and accurate.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a construction materials and contractor pricing expert. Always respond with valid JSON only. No markdown, no code blocks, just pure JSON."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI service error", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    let parsed: any;
    try {
      const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cache results and build response
    const newResults: Record<string, any> = {};
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    if (parsed.prices && Array.isArray(parsed.prices)) {
      for (const price of parsed.prices) {
        const itemNum = price.item_number;
        const matchingItem = uncachedItems.find(i => i.item_number === itemNum);
        
        newResults[itemNum] = {
          min_price: price.min_price || 0,
          max_price: price.max_price || 0,
          avg_price: price.avg_price || 0,
          currency: price.currency || "SAR",
          confidence: price.confidence || "medium",
          notes: price.notes || "",
          sources: price.sources || ["AI Estimate"],
          city,
          fetched_at: new Date().toISOString(),
        };

        // Cache the result
        if (matchingItem) {
          const cacheKey = `${matchingItem.description}|${city}`.toLowerCase().trim();
          await supabase.from("market_price_cache").upsert({
            search_query: cacheKey,
            city,
            result_data: newResults[itemNum],
            fetched_at: new Date().toISOString(),
            expires_at: expiresAt,
          }, { onConflict: "search_query" });
        }
      }
    }

    // Merge cached + new results
    const allResults = { ...cachedResults, ...newResults };

    return new Response(
      JSON.stringify({ success: true, results: allResults, fromCache: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fetch-market-prices:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
