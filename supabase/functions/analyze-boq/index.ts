import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisResult {
  analysis_type: string;
  items: Array<{
    item_number: string;
    description: string;
    unit: string;
    quantity: number;
    unit_price?: number;
    total_price?: number;
    category?: string;
    notes?: string;
  }>;
  wbs?: Array<{
    code: string;
    title: string;
    level: number;
    parent_code?: string;
    items: string[];
  }>;
  summary?: {
    total_items: number;
    total_value?: number;
    categories: string[];
    currency?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, analysis_type, language = 'en' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isArabic = language === 'ar';
    const outputLanguage = isArabic ? 'Arabic' : 'English';

    // Validate that text is readable
    if (!text || typeof text !== "string" || text.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: isArabic ? "النص المُدخل قصير جداً أو غير صالح" : "Input text is too short or invalid",
          suggestion: isArabic ? "يرجى إدخال نص BOQ يدوياً أو استخدام ملف PDF يحتوي على نص قابل للتحديد" : "Please enter BOQ text manually or use a PDF with selectable text"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if text contains too many invalid characters (binary data)
    const invalidCharCount = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
    const invalidRatio = invalidCharCount / text.length;
    
    if (invalidRatio > 0.1) {
      console.log(`Text appears to be binary data. Invalid char ratio: ${invalidRatio}`);
      return new Response(
        JSON.stringify({ 
          error: isArabic ? "لا يمكن قراءة محتوى الملف" : "Cannot read file content",
          suggestion: isArabic ? "يبدو أن ملف PDF يحتوي على صور أو نص غير قابل للتحديد. يرجى إدخال النص يدوياً." : "The PDF appears to contain images or non-selectable text. Please enter text manually."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting ${analysis_type} analysis with ${text.length} characters in ${outputLanguage}...`);

    let systemPrompt = "";
    let userPrompt = "";

    switch (analysis_type) {
      case "extract_items":
        systemPrompt = `You are a BOQ (Bill of Quantities) expert specialized in construction cost estimation.
CRITICAL: You MUST extract ALL pricing information including unit prices and total prices.
IMPORTANT: ALL output text (descriptions, categories, notes) must be in ${outputLanguage}.

Analyze the document carefully to find:
1. Item numbers/codes
2. Descriptions (translate to ${outputLanguage} if needed)
3. Units (${isArabic ? 'م، م²، م³، كجم، عدد، طن' : 'm, m², m³, kg, pcs, ton'}, etc.)
4. Quantities (numbers)
5. Unit prices
6. Total prices (total = quantity × unit_price)
7. Categories (group similar items)

Return ONLY a valid JSON object with this structure:
{
  "analysis_type": "extract_items",
  "items": [
    {
      "item_number": "string",
      "description": "string (in ${outputLanguage})",
      "unit": "string",
      "quantity": number,
      "unit_price": number (REQUIRED - estimate if not explicitly stated based on typical construction costs),
      "total_price": number (REQUIRED - calculate as quantity × unit_price),
      "category": "string (in ${outputLanguage}, e.g., ${isArabic ? 'أعمال الحفر, الخرسانة, الكهرباء, السباكة, التشطيبات' : 'Excavation, Concrete, Electrical, Plumbing, Finishes'})",
      "notes": "string or null (in ${outputLanguage})"
    }
  ],
  "summary": {
    "total_items": number,
    "total_value": number (REQUIRED - sum of all total_prices),
    "categories": ["array of unique category names in ${outputLanguage}"],
    "currency": "${isArabic ? 'ر.س' : 'SAR'}" (or detect from document),
    "average_item_value": number (total_value / total_items)
  }
}

IMPORTANT RULES:
- ALL text output must be in ${outputLanguage}
- If prices are not explicitly stated, make reasonable estimates based on typical Saudi/Gulf construction costs
- Always calculate total_price = quantity × unit_price
- Always provide total_value in summary
- Group items into logical categories
- Return ONLY valid JSON, no markdown or explanation`;
        userPrompt = `Extract ALL BOQ items with PRICES from this construction document. Output all text in ${outputLanguage}. Look for quantities, rates, and totals:\n\n${text.slice(0, 20000)}`;
        break;

      case "create_wbs":
        systemPrompt = `You are a project management expert specializing in Work Breakdown Structure (WBS) creation.
IMPORTANT: ALL output text (titles, descriptions) must be in ${outputLanguage}.
Analyze the BOQ text and create a hierarchical WBS structure.
Return ONLY a valid JSON object (no markdown, no code blocks, no explanation) with this structure:
{
  "analysis_type": "create_wbs",
  "wbs": [
    {
      "code": "string (e.g., 1, 1.1, 1.1.1)",
      "title": "string (in ${outputLanguage})",
      "level": number (1, 2, or 3),
      "parent_code": "string or null",
      "items": ["array of related item numbers"]
    }
  ]
}
Create a logical hierarchy grouping related work items together. All titles must be in ${outputLanguage}. Return ONLY valid JSON.`;
        userPrompt = `Create a WBS structure from this BOQ. Output all text in ${outputLanguage}:\n\n${text.slice(0, 15000)}`;
        break;

      default:
        systemPrompt = `You are a document analysis expert. Analyze the provided text and extract structured information.
Return ONLY a valid JSON object with relevant analysis results.`;
        userPrompt = `Analyze this document:\n\n${text.slice(0, 15000)}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response received, parsing...");
    console.log("Full AI response:", content);

    // Extract JSON from response with improved handling
    let result: AnalysisResult;
    try {
      // Try to parse directly first
      result = JSON.parse(content);
      console.log("Successfully parsed JSON directly");
    } catch (directParseError) {
      console.log("Direct parse failed, trying extraction methods...");
      
      try {
        // Try to extract JSON from markdown code block
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          console.log("Found JSON in markdown code block");
          result = JSON.parse(jsonMatch[1].trim());
        } else {
          // Try to find JSON object in the response by matching braces
          const jsonStart = content.indexOf("{");
          const jsonEnd = content.lastIndexOf("}");
          
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonStr = content.slice(jsonStart, jsonEnd + 1);
            console.log("Extracted JSON string:", jsonStr.slice(0, 200));
            
            try {
              result = JSON.parse(jsonStr);
              console.log("Successfully parsed extracted JSON");
            } catch (parseError) {
              console.error("Failed to parse extracted JSON:", parseError);
              console.error("Extracted string:", jsonStr);
              throw new Error(`فشل تحليل استجابة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.`);
            }
          } else {
            console.error("Could not find JSON structure in response");
            console.error("Response content:", content);
            throw new Error(`الاستجابة لا تحتوي على JSON صالح. يرجى المحاولة مرة أخرى.`);
          }
        }
      } catch (extractError) {
        console.error("All JSON extraction methods failed");
        console.error("Original error:", directParseError);
        console.error("Extraction error:", extractError);
        console.error("Full response:", content);
        throw new Error(`تعذر معالجة استجابة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.`);
      }
    }

    console.log(`Analysis complete: ${result.items?.length || result.wbs?.length || 0} items found`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-boq function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
