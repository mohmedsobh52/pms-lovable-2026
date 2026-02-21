import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

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

const MAX_RETRIES = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { userId, error: authError } = await verifyAuth(req);
  if (authError) return authError;
  console.log(`Authenticated user: ${userId}`);

  try {
    const requestBody = await req.json();
    const { items, ai_provider, analysis_type, language = 'ar', itemName, type } = requestBody;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GENSPARK_API_KEY = Deno.env.get("GENSPARK_API_KEY");
    const MANUS_API_KEY = Deno.env.get("MANUS_API_KEY");

    // Handle excavation productivity analysis
    if (type === 'excavation_productivity' && itemName) {
      console.log(`Analyzing excavation productivity for: ${itemName}`);
      const apiKey = LOVABLE_API_KEY || OPENAI_API_KEY;
      if (!apiKey) throw new Error("No AI API key configured");

      const excavationPrompt = `You are an expert in construction cost estimation for excavation works in Saudi Arabia.
Analyze "${itemName}" and provide realistic estimates.
Return ONLY JSON: {"suggestedProductivity": <number>, "suggestedRent": <number>, "reasoning": "<brief Arabic>"}`;

      const aiResponse = await fetch(
        LOVABLE_API_KEY ? "https://ai.gateway.lovable.dev/v1/chat/completions" : "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: LOVABLE_API_KEY ? "google/gemini-2.5-flash" : "gpt-4o-mini",
            messages: [
              { role: "system", content: "Construction cost estimation expert for Saudi Arabia excavation. Respond with valid JSON only." },
              { role: "user", content: excavationPrompt }
            ],
            temperature: 0.3, max_tokens: 500,
          }),
        }
      );

      if (!aiResponse.ok) throw new Error("AI analysis failed");
      const aiData = await aiResponse.json();
      let content = (aiData.choices?.[0]?.message?.content || "").replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        const result = JSON.parse(content);
        return new Response(JSON.stringify({
          suggestedProductivity: result.suggestedProductivity || 0,
          suggestedRent: result.suggestedRent || 0,
          reasoning: result.reasoning || ""
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ suggestedProductivity: 100, suggestedRent: 50, reasoning: "تقدير عام" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const isArabic = language === 'ar';
    const outputLanguage = isArabic ? 'Arabic' : 'English';

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: isArabic ? "يجب توفير قائمة البنود للتحليل" : "Please provide items to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing costs for ${items.length} items using ${ai_provider} in ${outputLanguage}...`);

    // Compact system prompt focused on cost analysis
    const systemPrompt = `You are a construction cost estimation expert for Saudi Arabia (SAR).

TASK: Analyze each BOQ item and provide detailed cost breakdown.

For each item provide:
- materials: list of {name, quantity, unit, unit_price, total}
- labor: list of {role, hours, hourly_rate, total}
- equipment: list of {name, duration, daily_rate, total}
- subcontractor cost
- overhead (8-12% of direct), admin (3-5%), insurance (2-3%), contingency (5-10%)
- profit_margin (10-15%), profit_amount
- total_direct, total_indirect, total_cost
- unit_price = total_cost / item_quantity
- recommendations (${outputLanguage})

IMPORTANT: unit_price must equal total_cost divided by the item's quantity, NOT equal to total_cost.

All text in ${outputLanguage}. All costs in SAR. Return valid JSON only.`;

    const userPrompt = `Analyze these ${items.length} BOQ items:

${items.map((item: any, idx: number) => 
  `[${idx + 1}] ${item.description || item.item_description || 'Unknown'} | Qty: ${item.quantity || 1} ${item.unit || 'unit'}${item.total_price ? ` | Price: ${item.total_price} SAR` : ''}`
).join('\n')}

Return JSON with:
{
  "cost_analysis": [one entry per item with full breakdown],
  "summary": {total_materials, total_labor, total_equipment, total_subcontractor, total_direct_costs, total_indirect_costs, total_profit, grand_total, key_insights: []}
}`;

    let response;
    let providerUsed = ai_provider || 'lovable';

    // Try Genspark
    if ((ai_provider === 'genspark' || ai_provider === 'all') && GENSPARK_API_KEY) {
      try {
        response = await fetch("https://api.genspark.ai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GENSPARK_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "genspark-pro", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature: 0.2 }),
        });
        if (response.ok) { providerUsed = 'genspark'; } else { response = null; }
      } catch { response = null; }
    } else if (ai_provider === 'genspark' && !GENSPARK_API_KEY) {
      return new Response(JSON.stringify({ error: "Genspark API key not found", requires_api_key: true, provider: 'genspark' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try Manus
    if (!response && (ai_provider === 'manus' || ai_provider === 'all') && MANUS_API_KEY) {
      try {
        response = await fetch("https://api.manus.ai/v1/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${MANUS_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "manus-pro", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature: 0.2 }),
        });
        if (response.ok) { providerUsed = 'manus'; } else { response = null; }
      } catch { response = null; }
    } else if (ai_provider === 'manus' && !MANUS_API_KEY) {
      return new Response(JSON.stringify({ error: "Manus API key not found", requires_api_key: true, provider: 'manus' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try OpenAI
    if (!response && (ai_provider === 'openai' || ai_provider === 'all') && OPENAI_API_KEY) {
      try {
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            temperature: 0.2, response_format: { type: "json_object" },
          }),
        });
        if (response.ok) { providerUsed = 'openai'; } else { response = null; }
      } catch { response = null; }
    }

    // Fallback to Lovable AI
    if (!response || !response.ok) {
      if (!LOVABLE_API_KEY) throw new Error("No AI API keys configured");

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
              temperature: 0.05, max_tokens: 16000,
              tools: [{
                type: "function",
                function: {
                  name: "provide_cost_analysis",
                  description: `Cost analysis for BOQ items. ALL text in ${outputLanguage}.`,
                  parameters: {
                    type: "object",
                    properties: {
                      cost_analysis: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            item_description: { type: "string" },
                            materials: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, quantity: { type: "number" }, unit: { type: "string" }, unit_price: { type: "number" }, total: { type: "number" } } } }, total: { type: "number" } } },
                            labor: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { role: { type: "string" }, hours: { type: "number" }, hourly_rate: { type: "number" }, total: { type: "number" } } } }, total: { type: "number" } } },
                            equipment: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, duration: { type: "string" }, daily_rate: { type: "number" }, total: { type: "number" } } } }, total: { type: "number" } } },
                            subcontractor: { type: "number" },
                            overhead: { type: "number" },
                            admin: { type: "number" },
                            insurance: { type: "number" },
                            contingency: { type: "number" },
                            profit_margin: { type: "number" },
                            profit_amount: { type: "number" },
                            total_direct: { type: "number" },
                            total_indirect: { type: "number" },
                            total_cost: { type: "number" },
                            unit_price: { type: "number" },
                            recommendations: { type: "array", items: { type: "string" } }
                          },
                          required: ["item_description", "total_cost", "materials", "labor", "equipment"]
                        }
                      },
                      summary: {
                        type: "object",
                        properties: {
                          total_materials: { type: "number" },
                          total_labor: { type: "number" },
                          total_equipment: { type: "number" },
                          total_subcontractor: { type: "number" },
                          total_direct_costs: { type: "number" },
                          total_indirect_costs: { type: "number" },
                          total_profit: { type: "number" },
                          grand_total: { type: "number" },
                          key_insights: { type: "array", items: { type: "string" } }
                        }
                      }
                    },
                    required: ["cost_analysis", "summary"]
                  }
                }
              }],
              tool_choice: { type: "function", function: { name: "provide_cost_analysis" } }
            }),
          });
          if (response.ok) break;
        } catch (error) {
          if (attempt === MAX_RETRIES) throw error;
        }
      }
      providerUsed = 'lovable';
    }

    if (!response || !response.ok) {
      if (response?.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response?.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI API error: ${response?.status || 'No response'}`);
    }

    const data = await response.json();
    
    // Extract result
    let result;
    if (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const argsStr = data.choices[0].message.tool_calls[0].function.arguments;
      result = typeof argsStr === 'string' ? JSON.parse(argsStr) : argsStr;
    } else if (data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      result = extractAndParseJSON(content);
    } else {
      throw new Error("No response from AI");
    }

    // Recalculate summary from cost_analysis
    if (result.cost_analysis && Array.isArray(result.cost_analysis)) {
      const ca = result.cost_analysis as CostBreakdown[];
      result.summary = {
        ...result.summary,
        total_materials: ca.reduce((s, i) => s + (i.materials?.total || 0), 0),
        total_labor: ca.reduce((s, i) => s + (i.labor?.total || 0), 0),
        total_equipment: ca.reduce((s, i) => s + (i.equipment?.total || 0), 0),
        total_subcontractor: ca.reduce((s, i) => s + (i.subcontractor || 0), 0),
        total_direct_costs: ca.reduce((s, i) => s + (i.total_direct || 0), 0),
        total_indirect_costs: ca.reduce((s, i) => s + (i.total_indirect || 0), 0),
        total_profit: ca.reduce((s, i) => s + (i.profit_amount || 0), 0),
        grand_total: ca.reduce((s, i) => s + (i.total_cost || 0), 0),
      };
    }

    return new Response(JSON.stringify({ ...result, ai_provider: providerUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[analyze-costs] Error:", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error), errorAr: getSafeErrorMessageAr(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractAndParseJSON(text: string): any {
  try { return JSON.parse(text); } catch {}
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[1].trim()); } catch {} }
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s !== -1 && e > s) {
    let j = text.slice(s, e + 1).replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/[\x00-\x1F\x7F]/g, ' ');
    try { return JSON.parse(j); } catch (err) { throw new Error(`Could not parse AI response: ${err}`); }
  }
  throw new Error("No valid JSON in AI response");
}

function getSafeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  if (msg.includes('rate limit') || msg.includes('429')) return 'Service temporarily busy. Please try again.';
  if (msg.includes('402') || msg.includes('credits')) return 'Service temporarily unavailable.';
  if (msg.includes('api key') || msg.includes('401')) return 'Service configuration error.';
  if (msg.includes('timeout')) return 'Request timed out. Please try again.';
  return 'An error occurred. Please try again.';
}

function getSafeErrorMessageAr(error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  if (msg.includes('rate limit') || msg.includes('429')) return 'الخدمة مشغولة. يرجى المحاولة لاحقاً.';
  if (msg.includes('402') || msg.includes('credits')) return 'الخدمة غير متاحة مؤقتاً.';
  if (msg.includes('api key') || msg.includes('401')) return 'خطأ في تكوين الخدمة.';
  if (msg.includes('timeout')) return 'انتهت المهلة. يرجى المحاولة مرة أخرى.';
  return 'حدث خطأ. يرجى المحاولة مرة أخرى.';
}
