import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
}

interface LibraryData {
  materials?: Array<{ name: string; name_ar?: string; unit_price: number; unit: string; category: string; is_verified: boolean; }>;
  labor?: Array<{ name: string; name_ar?: string; unit_rate: number; unit: string; }>;
  equipment?: Array<{ name: string; name_ar?: string; rental_rate: number; unit: string; }>;
}

interface MarketRateSuggestion {
  item_number: string;
  description: string;
  current_price: number;
  suggested_min: number;
  suggested_max: number;
  suggested_avg: number;
  confidence: "High" | "Medium" | "Low";
  trend: "Increasing" | "Stable" | "Decreasing";
  variance_percent: number;
  notes: string;
  source: "library" | "reference" | "ai" | "historical";
}

// Compact reference prices - top 30 categories only
const REF: Record<string, { min: number; max: number; unit: string; kw: string[] }> = {
  "exc_0_2": { min: 8, max: 18, unit: "m³", kw: ["excavation", "حفر", "تربة"] },
  "exc_rock": { min: 40, max: 180, unit: "m³", kw: ["rock", "صخر"] },
  "backfill": { min: 12, max: 65, unit: "m³", kw: ["backfill", "ردم", "fill"] },
  "c15": { min: 320, max: 420, unit: "m³", kw: ["c15", "خرسانة عادية", "lean", "blinding"] },
  "c25": { min: 420, max: 550, unit: "m³", kw: ["c25", "خرسانة c25"] },
  "c30": { min: 480, max: 650, unit: "m³", kw: ["c30", "خرسانة c30", "structural"] },
  "c40": { min: 620, max: 850, unit: "m³", kw: ["c40", "خرسانة c40", "high strength"] },
  "rebar": { min: 4200, max: 5800, unit: "ton", kw: ["rebar", "حديد تسليح", "reinforcement", "steel bar"] },
  "formwork": { min: 80, max: 220, unit: "m²", kw: ["formwork", "شدة", "قوالب"] },
  "block_20": { min: 55, max: 95, unit: "m²", kw: ["block 20", "بلوك 20", "hollow block"] },
  "block_15": { min: 40, max: 70, unit: "m²", kw: ["block 15", "بلوك 15"] },
  "plaster": { min: 25, max: 85, unit: "m²", kw: ["plaster", "بياض", "لياسة", "render"] },
  "waterproof": { min: 35, max: 110, unit: "m²", kw: ["waterproof", "عزل مائي", "bitumen", "membrane"] },
  "insulation": { min: 25, max: 100, unit: "m²", kw: ["insulation", "عزل حراري", "polystyrene", "rockwool"] },
  "tile_ceramic": { min: 60, max: 200, unit: "m²", kw: ["ceramic", "سيراميك", "tiles", "بلاط"] },
  "tile_porcelain": { min: 120, max: 280, unit: "m²", kw: ["porcelain", "بورسلين"] },
  "tile_marble": { min: 250, max: 600, unit: "m²", kw: ["marble", "رخام", "granite", "جرانيت"] },
  "paint": { min: 18, max: 65, unit: "m²", kw: ["paint", "دهان", "emulsion", "بلاستيك"] },
  "door_wood": { min: 400, max: 1800, unit: "no", kw: ["door", "باب", "خشب"] },
  "window_alum": { min: 350, max: 850, unit: "m²", kw: ["window", "نافذة", "شباك", "aluminum"] },
  "ceiling_gyp": { min: 55, max: 150, unit: "m²", kw: ["gypsum board", "جبس بورد", "ceiling", "سقف"] },
  "elec_point": { min: 80, max: 180, unit: "no", kw: ["electrical", "كهرباء", "outlet", "switch"] },
  "pipe_pvc": { min: 35, max: 110, unit: "m", kw: ["pvc", "مواسير", "pipe"] },
  "sanitary_wc": { min: 400, max: 1200, unit: "no", kw: ["wc", "مرحاض", "toilet"] },
  "ac_split": { min: 1200, max: 4000, unit: "no", kw: ["split", "سبليت", "ac", "تكييف"] },
  "steel_str": { min: 8500, max: 14000, unit: "ton", kw: ["steel structure", "هيكل معدني"] },
  "asphalt": { min: 35, max: 90, unit: "m²", kw: ["asphalt", "أسفلت", "wearing", "base course"] },
  "interlock": { min: 80, max: 160, unit: "m²", kw: ["interlock", "انترلوك", "paving"] },
  "curb": { min: 45, max: 100, unit: "m", kw: ["curb", "بردورة", "kerb"] },
  "manhole": { min: 1500, max: 4000, unit: "no", kw: ["manhole", "غرفة تفتيش"] },
};

// Compact city factors
const CITIES: Record<string, number> = {
  "Riyadh": 1, "Jeddah": 1.05, "Dammam": 0.97, "Makkah": 1.08, "Madinah": 1.04,
  "Khobar": 0.98, "Tabuk": 1.12, "Abha": 1.1, "NEOM": 1.35, "Jubail": 1.03,
  "Dubai": 1.25, "Abu Dhabi": 1.2, "Doha": 1.3, "Kuwait City": 1.15, "Muscat": 1.05,
  "Cairo": 0.45, "Manama": 1.1,
};

function norm(t: string): string {
  return t.toLowerCase().replace(/[أإآ]/g,'ا').replace(/[ى]/g,'ي').replace(/[ة]/g,'ه')
    .replace(/[\s\-_,،.;:()]+/g,' ').trim();
}

// MEP keyword boost list
const MEP_KW = ["mdb","sdb","generator","chiller","ahu","fcu","vrf","vrv","pump","bms","cctv","sprinkler","elevator","مصعد","مولد","تشيلر","مضخة","رشاش"];

function matchScore(desc: string, kws: string[]): number {
  const d = norm(desc);
  let score = 0;
  for (const k of kws) {
    const kn = norm(k);
    if (d.includes(kn)) score += 15;
    else {
      const words = kn.split(' ');
      for (const w of words) { if (w.length > 2 && d.includes(w)) score += 6; }
    }
  }
  // MEP keyword boost
  for (const mk of MEP_KW) { if (d.includes(mk.toLowerCase())) { score += 5; break; } }
  return score;
}

function findRef(desc: string, unit: string): { key: string; min: number; max: number; score: number } | null {
  let best: { key: string; min: number; max: number; score: number } | null = null;
  for (const [key, r] of Object.entries(REF)) {
    let s = matchScore(desc, r.kw);
    const u1 = (unit || '').toLowerCase().replace(/[²³]/g, m => m === '²' ? '2' : '3');
    const u2 = r.unit.toLowerCase().replace(/[²³]/g, m => m === '²' ? '2' : '3');
    // Unit matching: bonus for match, penalty for mismatch
    if (u1 && u2) {
      if (u1 === u2) s += 15;
      else if (s > 0) s -= 5; // penalty for unit mismatch
    }
    if (s > 0 && (!best || s > best.score)) best = { key, min: r.min, max: r.max, score: s };
  }
  return best && best.score >= 18 ? best : null;
}

function findLibPrice(desc: string, lib?: LibraryData): { price: number; src: string } | null {
  if (!lib) return null;
  const d = norm(desc);
  if (lib.materials) {
    for (const m of lib.materials) {
      const mt = norm((m.name||'') + ' ' + (m.name_ar||''));
      if (mt && d.includes(mt.split(' ')[0]) && mt.split(' ').some(w => w.length > 2 && d.includes(w)))
        return { price: m.unit_price, src: m.is_verified ? 'library_verified' : 'library' };
    }
  }
  if (lib.labor) {
    for (const l of lib.labor) {
      const lt = norm((l.name||'') + ' ' + (l.name_ar||''));
      if (lt && lt.split(' ').filter(w => w.length > 2 && d.includes(w)).length >= 1)
        return { price: l.unit_rate, src: 'library_labor' };
    }
  }
  if (lib.equipment) {
    for (const e of lib.equipment) {
      const et = norm((e.name||'') + ' ' + (e.name_ar||''));
      if (et && et.split(' ').filter(w => w.length > 2 && d.includes(w)).length >= 1)
        return { price: e.rental_rate, src: 'library_equipment' };
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await verifyAuth(req);
  if (authError) return authError;

  try {
    const { items, location = "Riyadh", model = "google/gemini-2.5-flash", libraryData, historicalData }:
      { items: BOQItem[]; location: string; model?: string; libraryData?: LibraryData; historicalData?: any[] } = await req.json();

    if (!items?.length) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get city factor
    let cityFactor = CITIES[location] || 1;
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data } = await sb.from('city_pricing_factors').select('factor').eq('city_name', location).maybeSingle();
      if (data?.factor) cityFactor = Number(data.factor);
    } catch (_) { /* use static */ }

    const applyF = (p: number) => Math.round(p * cityFactor * 100) / 100;

    const suggestions: MarketRateSuggestion[] = [];
    const needAI: BOQItem[] = [];
    let libCount = 0, refCount = 0, aiCount = 0, histCount = 0;

    // Historical lookup
    const histMap = new Map<string, { price: number; src: string }>();
    if (historicalData?.length) {
      for (const h of historicalData) {
        if (h.unit_price > 0) histMap.set(norm(h.description || ''), { price: h.unit_price * 1.04, src: h.source || 'Historical' });
      }
    }

    // Pass 1: library, historical, reference
    for (const item of items) {
      const lib = findLibPrice(item.description, libraryData);
      if (lib) {
        const p = applyF(lib.price);
        const v = item.unit_price && item.unit_price > 0 ? Math.round(((p - item.unit_price) / item.unit_price) * 100) : 0;
        suggestions.push({ item_number: item.item_number, description: item.description, current_price: item.unit_price || 0,
          suggested_min: applyF(lib.price * 0.9), suggested_max: applyF(lib.price * 1.1), suggested_avg: p,
          confidence: "High", trend: "Stable", variance_percent: v, notes: `Library (${lib.src})`, source: "library" });
        libCount++; continue;
      }

      // Historical
      const dn = norm(item.description);
      let foundHist = false;
      for (const [hk, hv] of histMap) {
        if (dn.includes(hk.split(' ')[0]) && hk.split(' ').some(w => w.length > 2 && dn.includes(w))) {
          const p = applyF(hv.price);
          const v = item.unit_price && item.unit_price > 0 ? Math.round(((p - item.unit_price) / item.unit_price) * 100) : 0;
          suggestions.push({ item_number: item.item_number, description: item.description, current_price: item.unit_price || 0,
            suggested_min: applyF(hv.price * 0.9), suggested_max: applyF(hv.price * 1.1), suggested_avg: p,
            confidence: "Medium", trend: "Stable", variance_percent: v, notes: `Historical: ${hv.src}`, source: "historical" });
          histCount++; foundHist = true; break;
        }
      }
      if (foundHist) continue;

      // Reference
      const ref = findRef(item.description, item.unit);
      if (ref) {
        const avg = applyF((ref.min + ref.max) / 2);
        const v = item.unit_price && item.unit_price > 0 ? Math.round(((avg - item.unit_price) / item.unit_price) * 100) : 0;
        suggestions.push({ item_number: item.item_number, description: item.description, current_price: item.unit_price || 0,
          suggested_min: applyF(ref.min), suggested_max: applyF(ref.max), suggested_avg: avg,
          confidence: ref.score >= 30 ? "High" : "Medium", trend: "Stable", variance_percent: v,
          notes: `Reference: ${ref.key}`, source: "reference" });
        refCount++; continue;
      }

      needAI.push(item);
    }

    // Pass 2: AI for remaining items (batch max 20)
    if (needAI.length > 0) {
      const batch = needAI.slice(0, 20);
      const itemsList = batch.map(i => ({ n: i.item_number, d: i.description, u: i.unit, p: i.unit_price || 0 }));

      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: `Construction cost estimator for ${location}. Return JSON array of objects with: item_number, suggested_min, suggested_max, suggested_avg, confidence (High/Medium/Low), trend (Increasing/Stable/Decreasing), notes. Prices in SAR. Be accurate.` },
              { role: "user", content: `Estimate 2025 market rates for:\n${JSON.stringify(itemsList)}` }
            ],
            temperature: 0.3,
            max_tokens: 3000,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content || "";
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          let aiItems: any[] = [];

          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            aiItems = parsed.suggestions || parsed;
          } else if (content) {
            const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
            const match = jsonStr.match(/\[[\s\S]*\]/);
            if (match) aiItems = JSON.parse(match[0]);
          }

          for (const ai of aiItems) {
            const item = batch.find(i => i.item_number === ai.item_number);
            if (!item) continue;
            const avg = applyF(ai.suggested_avg || (ai.suggested_min + ai.suggested_max) / 2);
            const v = item.unit_price && item.unit_price > 0 ? Math.round(((avg - item.unit_price) / item.unit_price) * 100) : 0;
            suggestions.push({ item_number: ai.item_number, description: item.description, current_price: item.unit_price || 0,
              suggested_min: applyF(ai.suggested_min || avg * 0.9), suggested_max: applyF(ai.suggested_max || avg * 1.15),
              suggested_avg: avg, confidence: ai.confidence || "Medium", trend: ai.trend || "Stable",
              variance_percent: v, notes: `AI: ${ai.notes || 'Market estimate'}`, source: "ai" });
            aiCount++;
          }
        } else {
          await resp.text(); // consume body
        }
      } catch (e) { console.error("AI error:", e); }

      // Fallback for unprocessed
      for (const item of needAI) {
        if (!suggestions.find(s => s.item_number === item.item_number)) {
          const p = item.unit_price || 100;
          suggestions.push({ item_number: item.item_number, description: item.description, current_price: p,
            suggested_min: Math.round(p * 0.85), suggested_max: Math.round(p * 1.15), suggested_avg: p,
            confidence: "Low", trend: "Stable", variance_percent: 0, notes: "Fallback - review needed", source: "ai" });
        }
      }
    }

    // Save history (non-blocking)
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await sb.from('pricing_history').insert(suggestions.slice(0, 50).map(s => ({
        item_number: s.item_number, item_description: s.description, suggested_price: s.suggested_avg,
        suggested_min: s.suggested_min, suggested_max: s.suggested_max, confidence: s.confidence,
        source: s.source, location, model_used: model, user_id: userId, is_approved: false
      })));
    } catch (_) { /* non-critical */ }

    const high = suggestions.filter(s => s.confidence === "High").length;
    const med = suggestions.filter(s => s.confidence === "Medium").length;
    const acc = suggestions.length > 0 ? Math.round(((high * 95 + med * 80 + (suggestions.length - high - med) * 65) / suggestions.length)) : 0;

    return new Response(JSON.stringify({
      suggestions, location, analyzed_at: new Date().toISOString(),
      total_items: items.length, analyzed_items: suggestions.length,
      batches_processed: 1, model_used: model,
      data_source: { library_count: libCount, reference_count: refCount, ai_count: aiCount, historical_count: histCount, estimated_accuracy: `${acc}%` },
      accuracy_metrics: { high_confidence: high, medium_confidence: med, low_confidence: suggestions.length - high - med, estimated_accuracy: acc }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
