import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, projectName, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No BOQ items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit items to avoid token overflow
    const limitedItems = items.slice(0, 100);

    const isArabic = language === "ar";

    const systemPrompt = isArabic
      ? `أنت خبير في إدارة مخاطر المشاريع الإنشائية. قم بتحليل بنود جدول الكميات (BOQ) التالية وحدد المخاطر المحتملة.
لكل خطر حدد: العنوان، الوصف، الفئة (technical/financial/schedule/resource/external/legal/safety/quality)، الاحتمالية (very_low/low/medium/high/very_high)، التأثير (very_low/low/medium/high/very_high)، واستراتيجية التخفيف.
ركز على المخاطر العملية المرتبطة بطبيعة البنود والأعمال. حدد بين 3 إلى 8 مخاطر.`
      : `You are an expert in construction project risk management. Analyze the following BOQ items and identify potential risks.
For each risk specify: title, description, category (technical/financial/schedule/resource/external/legal/safety/quality), probability (very_low/low/medium/high/very_high), impact (very_low/low/medium/high/very_high), and mitigation strategy.
Focus on practical risks related to the nature of the items and works. Identify 3 to 8 risks.`;

    const itemsSummary = limitedItems
      .map(
        (item: any, i: number) =>
          `${i + 1}. ${item.description || item.الوصف || item.item_description || "N/A"} | ${item.unit || item.الوحدة || ""} | Qty: ${item.quantity || item.الكمية || ""} | Price: ${item.unit_price || item.سعر_الوحدة || ""}`
      )
      .join("\n");

    const userPrompt = isArabic
      ? `مشروع: ${projectName}\n\nبنود BOQ:\n${itemsSummary}\n\nحلل هذه البنود وحدد المخاطر المحتملة.`
      : `Project: ${projectName}\n\nBOQ Items:\n${itemsSummary}\n\nAnalyze these items and identify potential risks.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "identify_risks",
                description: "Return identified risks from BOQ analysis",
                parameters: {
                  type: "object",
                  properties: {
                    risks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          category: {
                            type: "string",
                            enum: [
                              "technical",
                              "financial",
                              "schedule",
                              "resource",
                              "external",
                              "legal",
                              "safety",
                              "quality",
                            ],
                          },
                          probability: {
                            type: "string",
                            enum: [
                              "very_low",
                              "low",
                              "medium",
                              "high",
                              "very_high",
                            ],
                          },
                          impact: {
                            type: "string",
                            enum: [
                              "very_low",
                              "low",
                              "medium",
                              "high",
                              "very_high",
                            ],
                          },
                          mitigation: { type: "string" },
                        },
                        required: [
                          "title",
                          "description",
                          "category",
                          "probability",
                          "impact",
                          "mitigation",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["risks"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "identify_risks" },
          },
        }),
      }
    );

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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const risks = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(risks), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-risks error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
