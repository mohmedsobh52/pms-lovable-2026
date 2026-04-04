import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { userId, error: authError } = await verifyAuth(req);
  if (authError) return authError;

  try {
    const { system, messages, max_tokens = 5000, model } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Convert Anthropic-style messages to OpenAI-style for Lovable AI gateway
    const convertedMessages = [];
    
    if (system) {
      convertedMessages.push({ role: "system", content: system });
    }

    for (const msg of messages) {
      if (typeof msg.content === "string") {
        convertedMessages.push({ role: msg.role, content: msg.content });
      } else if (Array.isArray(msg.content)) {
        // Convert Anthropic content blocks to OpenAI format
        const parts: any[] = [];
        for (const block of msg.content) {
          if (block.type === "text") {
            parts.push({ type: "text", text: block.text });
          } else if (block.type === "image") {
            // Anthropic base64 image format
            parts.push({
              type: "image_url",
              image_url: {
                url: `data:${block.source.media_type};base64,${block.source.data}`,
                detail: "high"
              }
            });
          }
        }
        convertedMessages.push({ role: msg.role, content: parts });
      }
    }

    // Use gemini-2.5-pro for vision tasks, it handles images well
    const aiModel = "google/gemini-2.5-pro";

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'ALIMTYAZ v9 Drawing Analysis',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: convertedMessages,
        max_tokens: max_tokens,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const outputTokens = data.usage?.completion_tokens || 0;

    // Return in Anthropic-compatible format for the frontend
    return new Response(JSON.stringify({
      content: [{ type: "text", text }],
      usage: { output_tokens: outputTokens },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-drawing-v9:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
