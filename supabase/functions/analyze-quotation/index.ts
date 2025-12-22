import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quotationText, quotationName, supplierName } = await req.json();

    if (!quotationText || quotationText.trim().length < 20) {
      return new Response(
        JSON.stringify({ 
          error: "النص قصير جداً للتحليل",
          suggestion: "يرجى تقديم محتوى عرض السعر للتحليل"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Analyzing quotation:", quotationName, "from:", supplierName);
    console.log("Text length:", quotationText.length);
    console.log("First 500 chars of text:", quotationText.substring(0, 500));
    console.log("Has Arabic:", /[\u0600-\u06FF]/.test(quotationText));
    console.log("Has numbers:", /\d/.test(quotationText));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert quotation and procurement analyst. You will analyze price quotations that may contain Arabic text.

CRITICAL INSTRUCTIONS:
- Extract data ONLY from the provided text - do NOT invent or assume any data
- If information is not found, leave it empty or null
- Keep all numbers, quantities, and prices exactly as they appear in the original text
- Read Arabic text carefully and extract ALL items found
- If you find tables, extract each row as a separate item
- ALL text output should be in ENGLISH, translate Arabic descriptions to English

Your task:
1. Extract supplier information (name, address, phone, email)
2. Extract quotation information (date, quotation number, validity period, payment terms)
3. Extract ALL items/materials with:
   - Item number (if available)
   - Description (translate to English if in Arabic)
   - Unit (m³, m², kg, ton, piece, etc.)
   - Quantity (number only)
   - Unit price (number only)
   - Total (quantity × unit price)
4. Calculate totals (subtotal, tax, discounts, grand total)
5. Extract notes and terms (translate to English)

IMPORTANT: Extract data from the given text ONLY. Do NOT add data from your own knowledge.

Respond with JSON ONLY in the following structure:
{
  "supplier": {
    "name": "Supplier Name",
    "address": "Address",
    "phone": "Phone Number",
    "email": "Email"
  },
  "quotation_info": {
    "number": "Quotation Number",
    "date": "Date",
    "validity": "Validity Period",
    "payment_terms": "Payment Terms"
  },
  "items": [
    {
      "item_number": "Item Number",
      "description": "Description in English",
      "unit": "Unit",
      "quantity": 0,
      "unit_price": 0,
      "total": 0
    }
  ],
  "totals": {
    "subtotal": 0,
    "tax": 0,
    "tax_percentage": 0,
    "discount": 0,
    "grand_total": 0
  },
  "notes": ["Note 1", "Note 2"],
  "summary": "Brief summary of the quotation"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Analyze the following price quotation:

Quotation Name: ${quotationName || 'Not specified'}
Supplier: ${supplierName || 'Not specified'}

========================
EXTRACTED TEXT FROM QUOTATION:
========================

${quotationText}

========================

Please analyze the above text carefully and extract ALL items, quantities, and prices found in it.
DO NOT invent any data - use ONLY what is present in the text.
Translate all Arabic text to English in your response.` 
          }
        ],
        temperature: 0.1,
        max_tokens: 8000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار في استخدام التحليل" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Try to parse the JSON response
    let analysisResult;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return a structured error with the raw content
      analysisResult = {
        raw_response: content,
        parse_error: true,
        supplier: { name: supplierName || "غير محدد" },
        items: [],
        totals: { grand_total: 0 },
        summary: "تعذر تحليل العرض بشكل كامل"
      };
    }

    console.log("Analysis complete:", {
      itemsCount: analysisResult.items?.length || 0,
      grandTotal: analysisResult.totals?.grand_total || 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        analyzed_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-quotation function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "حدث خطأ أثناء التحليل",
        suggestion: "يرجى المحاولة مرة أخرى"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
