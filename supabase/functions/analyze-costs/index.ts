import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CostBreakdown {
  item_description: string;
  materials: {
    items: Array<{ name: string; quantity: number; unit: string; unit_price: number; total: number }>;
    total: number;
  };
  labor: {
    items: Array<{ role: string; hours: number; hourly_rate: number; total: number }>;
    total: number;
  };
  equipment: {
    items: Array<{ name: string; duration: string; daily_rate: number; total: number }>;
    total: number;
  };
  subcontractor: number;
  overhead: number;
  admin: number;
  insurance: number;
  contingency: number;
  profit_margin: number;
  profit_amount: number;
  total_direct: number;
  total_indirect: number;
  total_cost: number;
  unit_price: number;
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, ai_provider, analysis_type } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GENSPARK_API_KEY = Deno.env.get("GENSPARK_API_KEY");
    const MANUS_API_KEY = Deno.env.get("MANUS_API_KEY");

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "يجب توفير قائمة البنود للتحليل" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing costs for ${items.length} items using ${ai_provider}...`);

    const systemPrompt = `You are an expert construction cost analyst. Analyze the provided items and provide a comprehensive cost breakdown.

IMPORTANT INSTRUCTIONS:
1. You will receive text that may be in Arabic - read and understand it carefully
2. Extract quantities, units, and descriptions accurately
3. Use market prices from Saudi Arabia/Gulf region
4. Calculate ALL costs in Saudi Riyals (SAR)
5. ALL output text must be in ENGLISH - translate Arabic descriptions

The analysis should include:

1. Direct Costs:
   - Materials: List required materials with quantities and prices
   - Labor: Types of labor required, work hours, and wages
   - Equipment: Required equipment, duration, and costs
   - Subcontractors

2. Indirect Costs:
   - Overhead: typically 8-12% of direct costs
   - Administrative: typically 3-5%
   - Insurance: typically 2-3%
   - Contingency: typically 5-10%

3. Profit Margin: typically 10-15%

Return JSON in the following format:
{
  "cost_analysis": [
    {
      "item_description": "Item Description in English",
      "materials": {
        "items": [{"name": "Material Name", "quantity": 100, "unit": "m³", "unit_price": 500, "total": 50000}],
        "total": 50000
      },
      "labor": {
        "items": [{"role": "Carpenter", "hours": 40, "hourly_rate": 50, "total": 2000}],
        "total": 2000
      },
      "equipment": {
        "items": [{"name": "Crane", "duration": "5 days", "daily_rate": 1000, "total": 5000}],
        "total": 5000
      },
      "subcontractor": 0,
      "overhead": 5700,
      "admin": 2850,
      "insurance": 1710,
      "contingency": 2850,
      "profit_margin": 10,
      "profit_amount": 7011,
      "total_direct": 57000,
      "total_indirect": 13110,
      "total_cost": 77121,
      "unit_price": 771.21,
      "recommendations": ["Recommendation 1", "Recommendation 2"]
    }
  ],
  "summary": {
    "total_materials": 0,
    "total_labor": 0,
    "total_equipment": 0,
    "total_subcontractor": 0,
    "total_direct_costs": 0,
    "total_indirect_costs": 0,
    "total_profit": 0,
    "grand_total": 0,
    "key_insights": ["Insight 1", "Insight 2"]
  }
}

Use current market prices from Saudi Arabia/Gulf region. All costs in SAR.
CRITICAL: Return ONLY valid JSON. No explanatory text before or after.`;

    const userPrompt = `Analyze detailed costs for the following construction items:

${items.map((item: any, idx: number) => `
${idx + 1}. Description: ${item.description || item.item_description}
   - Quantity: ${item.quantity || 1} ${item.unit || 'unit'}
   ${item.total_price ? `- Proposed Total Price: ${item.total_price} SAR` : ''}
`).join('\n')}

Provide comprehensive cost breakdown for each item. ALL text in response must be in ENGLISH.
Respond with valid JSON only.`;

    let response;
    let providerUsed = ai_provider || 'lovable';

    // Try Genspark first if available and requested
    if ((ai_provider === 'genspark' || ai_provider === 'all') && GENSPARK_API_KEY) {
      try {
        console.log("Trying Genspark API...");
        // Placeholder for Genspark API - implement when API details are available
        console.log("Genspark not yet implemented, falling back...");
        response = null;
      } catch (error) {
        console.error("Genspark error:", error);
        response = null;
      }
    }

    // Try Manus if available and requested
    if (!response && (ai_provider === 'manus' || ai_provider === 'all') && MANUS_API_KEY) {
      try {
        console.log("Trying Manus API...");
        // Placeholder for Manus API - implement when API details are available
        console.log("Manus not yet implemented, falling back...");
        response = null;
      } catch (error) {
        console.error("Manus error:", error);
        response = null;
      }
    }

    // Try OpenAI if available and requested
    if (!response && (ai_provider === 'openai' || ai_provider === 'all') && OPENAI_API_KEY) {
      try {
        console.log("Trying OpenAI API...");
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            response_format: { type: "json_object" },
          }),
        });

        if (response.ok) {
          providerUsed = 'openai';
          console.log("OpenAI API succeeded");
        } else {
          console.log("OpenAI API failed, falling back to Lovable AI");
          response = null;
        }
      } catch (error) {
        console.error("OpenAI error:", error);
        response = null;
      }
    }

    // Fallback to Lovable AI
    if (!response || !response.ok) {
      if (!LOVABLE_API_KEY) {
        throw new Error("No AI API keys configured");
      }

      console.log("Using Lovable AI (Gemini Pro for better Arabic support)...");
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 8000,
          response_format: { type: "json_object" },
        }),
      });
      providerUsed = 'lovable';
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response received, parsing...");

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1].trim());
      } else {
        const jsonStart = content.indexOf("{");
        const jsonEnd = content.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          result = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
        } else {
          throw new Error("Could not parse AI response");
        }
      }
    }

    console.log(`Cost analysis complete using ${providerUsed}`);

    return new Response(
      JSON.stringify({
        ...result,
        ai_provider: providerUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-costs function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});