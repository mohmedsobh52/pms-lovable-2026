import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FileToClassify {
  fileName: string;
  fileType: string;
}

interface ClassificationResult {
  fileName: string;
  category: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { files, language = "en" } = await req.json() as { 
      files: FileToClassify[]; 
      language?: string 
    };

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "No files provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isArabic = language === "ar";

    const systemPrompt = isArabic
      ? `أنت خبير في تصنيف ملفات مشاريع البناء والإنشاءات. 
         صنّف كل ملف إلى إحدى الفئات التالية بناءً على اسم الملف ونوعه:
         - boq: جداول الكميات، المقايسات، التكاليف
         - drawings: الرسومات الهندسية، المخططات، CAD
         - specifications: المواصفات الفنية، المعايير
         - contracts: العقود، الاتفاقيات، الوثائق القانونية
         - quotations: عروض الأسعار، التسعيرات
         - reports: التقارير، الدراسات، التحليلات
         - schedules: الجداول الزمنية، البرامج، Gantt
         - general: ملفات أخرى لا تنتمي لأي فئة`
      : `You are an expert in classifying construction project files.
         Classify each file into one of these categories based on filename and type:
         - boq: Bills of quantities, cost estimates, pricing
         - drawings: Engineering drawings, blueprints, CAD files
         - specifications: Technical specifications, standards
         - contracts: Contracts, agreements, legal documents
         - quotations: Price quotations, bids, proposals
         - reports: Reports, studies, analyses
         - schedules: Timelines, schedules, Gantt charts
         - general: Other files that don't fit any category`;

    const userPrompt = `Classify these construction project files:

${files.map((f, i) => `${i + 1}. ${f.fileName} (${f.fileType})`).join("\n")}

Return ONLY a JSON array with this exact format:
[{"fileName": "exact_filename", "category": "category_id", "confidence": 0.0-1.0}]

Categories: boq, drawings, specifications, contracts, quotations, reports, schedules, general`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        temperature: 0.3,
      }),
    });

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
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let classifications: ClassificationResult[] = [];
    try {
      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        classifications = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback: classify all as general
      classifications = files.map((f) => ({
        fileName: f.fileName,
        category: "general",
        confidence: 0.5,
      }));
    }

    // Validate categories
    const validCategories = ["boq", "drawings", "specifications", "contracts", "quotations", "reports", "schedules", "general"];
    classifications = classifications.map((c) => ({
      ...c,
      category: validCategories.includes(c.category) ? c.category : "general",
    }));

    console.log("Classification results:", classifications);

    return new Response(
      JSON.stringify({ classifications }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Classification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Classification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
