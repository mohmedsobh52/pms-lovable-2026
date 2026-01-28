import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const { userId, error: authError } = await verifyAuth(req);
  if (authError) {
    return authError;
  }
  console.log(`Authenticated user: ${userId}`);

  try {
    const { fileContent, fileUrl, imageBase64, images, fileName, fileType, drawingType, language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Analyzing drawing: ${fileName}, type: ${drawingType}, language: ${language || 'en'}`);

    const isArabic = language === 'ar';

    const systemPromptEnglish = `You are an expert quantity surveyor and construction estimator. You specialize in analyzing architectural and engineering drawings (PDF, DWG) to extract quantities for Bill of Quantities (BOQ).

Your expertise includes:
- Reading and interpreting construction drawings
- Measuring quantities from drawings (areas, lengths, volumes, counts)
- Categorizing items according to standard BOQ formats
- Estimating material requirements
- Understanding construction specifications

Always respond in JSON format with structured quantity data.`;

    const systemPromptArabic = `أنت خبير مساحة كميات ومقاول إنشائي متخصص في قراءة وتحليل المخططات الهندسية.

مهامك:
1. قراءة المخطط وفهم جميع العناصر الإنشائية
2. حساب الكميات بدقة (المساحات، الأطوال، الأحجام، الأعداد)
3. تصنيف البنود حسب نظام BOQ القياسي
4. تقدير متطلبات المواد

أنواع الكميات المطلوبة:
- أعمال الحفر والردم (م³)
- الخرسانة بأنواعها (م³)
- حديد التسليح (كجم/طن)
- أعمال البناء (م²/م³)
- التشطيبات (م²)
- أعمال MEP (عدد/متر طولي)

ملاحظات مهمة:
- استخرج الكميات من المقاسات المكتوبة على المخطط
- إذا لم تجد مقاساً، قدّر من المقياس
- اذكر أساس القياس لكل بند

يجب الرد بصيغة JSON مع بيانات الكميات المهيكلة.`;

    const systemPrompt = isArabic ? systemPromptArabic : systemPromptEnglish;

    const userPromptEnglish = `Analyze this construction drawing and extract all quantities for BOQ:

File Name: ${fileName}
Drawing Type: ${drawingType || 'General'}
${fileContent ? `File Content/Description:\n${fileContent}` : ''}

Extract and return JSON with:
{
  "drawing_info": {
    "title": "Drawing title",
    "type": "${drawingType || 'General'}",
    "scale": "Drawing scale if mentioned",
    "date": "Date if found"
  },
  "quantities": [
    {
      "item_number": "Sequential number",
      "category": "Category (Concrete, Steel, Masonry, Finishes, MEP, etc.)",
      "description": "Detailed item description",
      "quantity": number,
      "unit": "m2, m3, m, nos, kg, etc.",
      "measurement_basis": "How the quantity was calculated",
      "notes": "Any relevant notes"
    }
  ],
  "summary": {
    "total_items": number,
    "categories": ["List of categories found"],
    "main_materials": ["List of main materials"],
    "estimated_area": "If applicable",
    "estimated_volume": "If applicable"
  },
  "recommendations": ["List of recommendations for accurate estimation"],
  "assumptions": ["List of assumptions made during quantity takeoff"]
}`;

    const userPromptArabic = `قم بتحليل هذا المخطط الإنشائي واستخراج جميع الكميات لجدول الكميات (BOQ):

اسم الملف: ${fileName}
نوع المخطط: ${drawingType || 'عام'}
${fileContent ? `محتوى الملف/الوصف:\n${fileContent}` : ''}

استخرج وأرجع JSON بالتنسيق التالي:
{
  "drawing_info": {
    "title": "عنوان المخطط",
    "type": "${drawingType || 'عام'}",
    "scale": "مقياس الرسم إن وجد",
    "date": "التاريخ إن وجد"
  },
  "quantities": [
    {
      "item_number": "رقم تسلسلي",
      "category": "الفئة (خرسانة، حديد، بناء، تشطيبات، أعمال كهروميكانيكية، إلخ)",
      "description": "وصف تفصيلي للبند",
      "quantity": رقم,
      "unit": "م²، م³، م.ط، عدد، كجم، إلخ",
      "measurement_basis": "أساس حساب الكمية",
      "notes": "أي ملاحظات ذات صلة"
    }
  ],
  "summary": {
    "total_items": رقم,
    "categories": ["قائمة الفئات الموجودة"],
    "main_materials": ["قائمة المواد الرئيسية"],
    "estimated_area": "إن وجد",
    "estimated_volume": "إن وجد"
  },
  "recommendations": ["قائمة التوصيات للتقدير الدقيق"],
  "assumptions": ["قائمة الافتراضات المستخدمة في حصر الكميات"]
}`;

    const userPrompt = isArabic ? userPromptArabic : userPromptEnglish;

    // Build message content based on what's provided
    let messageContent: any;

    // Check if PDF URL was provided without base64 conversion - this won't work
    if (fileUrl && fileType?.includes('pdf') && !imageBase64 && (!images || images.length === 0)) {
      console.error('PDF URL provided without base64 images - PDFs must be converted to images first');
      return new Response(JSON.stringify({ 
        error: isArabic 
          ? 'يجب تحويل ملفات PDF إلى صور قبل التحليل. يرجى المحاولة مرة أخرى.'
          : 'PDF files must be converted to images before analysis. Please try again.',
        success: false,
        requiresImageConversion: true
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If we have multiple images (multi-page PDF converted to images)
    if (images && Array.isArray(images) && images.length > 0) {
      messageContent = [
        { type: 'text', text: userPrompt },
        ...images.map((img: string) => ({
          type: 'image_url',
          image_url: {
            url: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
            detail: 'high'
          }
        }))
      ];
    } else if (imageBase64) {
      // Single image (base64)
      const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;
      messageContent = [
        { type: 'text', text: userPrompt },
        { 
          type: 'image_url', 
          image_url: { 
            url: imageUrl,
            detail: 'high'
          } 
        }
      ];
    } else if (fileUrl && fileType?.includes('image')) {
      // Direct image URL (not PDF) - can be used directly
      messageContent = [
        { type: 'text', text: userPrompt },
        { 
          type: 'image_url', 
          image_url: { 
            url: fileUrl,
            detail: 'high'
          } 
        }
      ];
    } else if (images && Array.isArray(images) && images.length > 0) {
      // Multiple images (multi-page PDF)
      messageContent = [
        { type: 'text', text: userPrompt },
        ...images.map((img: string) => ({
          type: 'image_url',
          image_url: {
            url: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
            detail: 'high'
          }
        }))
      ];
    } else {
      // Text only - no images provided
      messageContent = userPrompt;
    }

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
          { role: 'user', content: messageContent }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          suggestion: isArabic ? 'يرجى المحاولة مرة أخرى بعد لحظات' : 'Please try again in a few moments'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits exhausted',
          suggestion: isArabic ? 'يرجى إضافة رصيد للاستمرار في استخدام ميزات الذكاء الاصطناعي' : 'Please add credits to continue using AI features'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    let analysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch {
      analysisResult = { raw_analysis: content };
    }

    console.log('Drawing analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisResult,
      file_name: fileName,
      drawing_type: drawingType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Drawing analysis error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
