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
    const { pdfBase64, fileName } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'No PDF data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing PDF BOQ extraction for file: ${fileName}`);

    // Use Gemini to directly analyze the PDF as it supports PDF input
    const systemPrompt = `أنت خبير في استخراج بيانات جداول الكميات والأسعار (BOQ) من المستندات.
مهمتك هي:
1. تحليل المستند واستخراج جميع بنود BOQ
2. لكل بند، استخرج:
   - رقم البند (item_number)
   - الوصف (description)
   - الوحدة (unit)
   - الكمية (quantity)
   - سعر الوحدة (unit_price)
   - السعر الإجمالي (total_price)

قواعد مهمة:
- استخرج الأرقام بدقة كما هي في المستند
- إذا كان السعر الإجمالي غير موجود، احسبه من الكمية × سعر الوحدة
- احرص على التعامل مع الأرقام العربية والإنجليزية
- أرجع النتائج بتنسيق JSON فقط

أعد الاستجابة بهذا التنسيق بالضبط:
{
  "items": [
    {
      "item_number": "1.1",
      "description": "وصف البند",
      "unit": "م3",
      "quantity": 100,
      "unit_price": 50.00,
      "total_price": 5000.00
    }
  ],
  "total_items": 10,
  "currency": "SAR"
}`;

    const userPrompt = `استخرج جميع بنود BOQ من هذا المستند: ${fileName}

أعد النتائج بتنسيق JSON فقط بدون أي نص إضافي.`;

    // First, try to extract text and BOQ items using vision model
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: pdfBase64.startsWith('data:') ? pdfBase64 : `data:application/pdf;base64,${pdfBase64}` 
                } 
              }
            ]
          }
        ],
        max_tokens: 8192,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI Response received, parsing JSON...');

    // Try to parse JSON from response
    let result;
    try {
      // Find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw content:', content.substring(0, 500));
      
      // Return empty items if parsing fails
      result = { items: [], total_items: 0 };
    }

    console.log(`Extracted ${result.items?.length || 0} BOQ items`);

    return new Response(
      JSON.stringify({
        success: true,
        items: result.items || [],
        total_items: result.items?.length || 0,
        currency: result.currency || 'SAR',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PDF BOQ extraction error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
        items: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
