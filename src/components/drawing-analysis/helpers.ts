import { supabase } from "@/integrations/supabase/client";
import { SAR_REF_2025, DRAW_TYPES, PIPE_MATERIALS, SOIL_PARAMS, ASPHALT_LAYERS, ROAD_STRUCTURES } from "./constants";

// ── Detection helpers ──
export function detectDrawingType(text: string): string | null {
  if (!text) return null;
  const ar = text;
  if (/marine|outfall|diffuser|تصريف بحري|منفث|نقطة طرح|بحري/i.test(ar)) return "MARINE";
  if (/manhole.?schedule|جدول.*غرف|جدول.*بيارة|chamber.*schedule/i.test(ar)) return "MANHOLE";
  if (/bill.?of.?quant|boq|كشف كميات|جدول الكميات|كميات الأعمال/i.test(ar)) return "BOQ";
  if (/specification|مواصفات|technical.*spec|spec.*section/i.test(ar)) return "SPEC";
  if (/longitudinal.*profile|profile.*chainage|منسوب.*طولي|قطاع طولي|المقطع الطولي/i.test(ar)) return "PROFILE";
  if (/cross.?section|typical.*section|قطاع.*نموذجي|قطاع عرضي|مقطع عرضي/i.test(ar)) return "SECTION";
  if (/road.*plan|pavement|طريق|أسفلت|رصف|carriageway|shoulder/i.test(ar)) return "ROAD";
  if (/structural.*detail|reinforce|armature|حديد.*تسليح|قطاع إنشائي|عارضة|جائز/i.test(ar)) return "STRUCT";
  if (/plan.*view|layout.*plan|مسقط|مخطط موقع|situation.*plan|key.*plan|general.*plan/i.test(ar)) return "PLAN";
  if (/detail.*drawing|تفصيل|detail.*no|رقم التفصيل/i.test(ar)) return "DETAIL";
  if (/utility|duct.*bank|مرافق|crossing|intersection.*utilities/i.test(ar)) return "UTILITY";
  if (/cover.*page|title.*page|صفحة عنوان|title.*block/i.test(ar)) return "COVER";
  const pipeMatches = (ar.match(/[øØΦ]\d+|dn\s*\d+|id\s*\d+|Ø\d+|قطر/gi) || []).length;
  if (pipeMatches >= 3) return "PLAN";
  return null;
}

export function detectScale(text: string): string | null {
  if (!text) return null;
  const patterns = [
    /مقياس\s*[:=]?\s*1\s*[:/]\s*(\d+)/i,
    /scale\s*[:=]?\s*1\s*[:/]\s*(\d+)/i,
    /1\s*[:/]\s*(\d{2,5})\s*(?:m|meter|metre|مت)?(?!\d)/i,
    /AS\s+NOTED|NTS|not\s+to\s+scale/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      if (/NTS|not\s+to\s+scale|AS\s+NOTED/i.test(m[0])) return "NTS";
      return `1:${m[1]}`;
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════════
//  Pipe Engine v5 — Material Detection + Slopes + Network
// ══════════════════════════════════════════════════════════════════════════

export function detectPipeMaterial(context: string): string | null {
  const t = context.toLowerCase();
  if (/\bgrp\b|\bfrp\b|fiberglass|زجاجي/.test(t)) return "grp";
  if (/\bhdpe\b|pe100|pe80|بولي إيثيلين/.test(t)) return "hdpe";
  if (/\bupvc\b|\bpvc\b|بولي فينيل/.test(t)) return "pvc";
  if (/\bdi\b|ductile|دكتايل/.test(t)) return "di";
  if (/\brcp\b|reinforced concrete|خرساني مسلح/.test(t)) return "rcp";
  if (/\bgi\b|galvaniz/.test(t)) return "gi";
  if (/steel|فولاذ/.test(t)) return "steel";
  if (/clay|فخار/.test(t)) return "clay";
  return null;
}

export function detectPipeClass(context: string): string | null {
  const t = context.toUpperCase();
  const snM = t.match(/SN\s*(\d+)/); if (snM) return `SN${snM[1]}`;
  const pnM = t.match(/PN\s*(\d+)/); if (pnM) return `PN${pnM[1]}`;
  const clM = t.match(/CLASS\s*([A-Z0-9]+)/); if (clM) return `Class${clM[1]}`;
  return null;
}

export interface PipeDetail {
  diameter: number;
  material: string | null;
  type: string | null;
  pnClass: string | null;
}

export interface PipeDetailV5 {
  dia: number;
  matKey: string;
  mat: string;
  cls: string;
  color: string;
  type: string;
}

export function extractPipeDiameters(text: string): number[] {
  return extractPipeDetailsV5(text).map(p => p.dia);
}

export function extractPipeDetails(text: string): PipeDetail[] {
  if (!text) return [];
  const found = new Map<number, PipeDetail>();
  const diamPatterns = [
    /[ØøΦ]\s*(\d{2,4})\s*(?:mm)?/gi,
    /DN\s*(\d{2,4})/gi,
    /Ø\s*(\d{2,4})/gi,
    /قطر\s+(\d{2,4})\s*(?:مم|mm)/gi,
    /ID\s*=?\s*(\d{2,4})\s*(?:mm)/gi,
    /OD\s*=?\s*(\d{2,4})\s*(?:mm)/gi,
    /NB\s*(\d{2,4})/gi,
    /NPS\s*(\d{1,3})/gi,
    /قطر\s*(?:خارجي|داخلي)\s*(\d{2,4})/gi,
  ];
  const matPatterns: [RegExp, string][] = [
    [/PVC|UPVC|uPVC/i, "PVC"],
    [/HDPE|PE100|PE80|بولي\s*إيثيلين/i, "HDPE"],
    [/DI|دكتايل|ductile/i, "DI"],
    [/GRP|FRP|فايبر/i, "GRP"],
    [/RCP|كونكريت|خرسان/i, "RCP"],
    [/PP|بولي\s*بروبيلين/i, "PP"],
    [/Steel|حديد|فولاذ/i, "Steel"],
    [/Corrugated|مموج/i, "Corrugated HDPE"],
  ];
  const pnPatterns = /(?:PN|SN|SDR)\s*(\d+(?:\.\d+)?)/gi;

  diamPatterns.forEach(p => {
    let m;
    while ((m = p.exec(text)) !== null) {
      const d = parseInt(m[1]);
      if (d >= 50 && d <= 3000) {
        const ctx = text.substring(Math.max(0, m.index - 80), Math.min(text.length, m.index + 80));
        let material: string | null = null;
        for (const [mp, mn] of matPatterns) {
          if (mp.test(ctx)) { material = mn; break; }
        }
        let pnClass: string | null = null;
        const pnMatch = ctx.match(pnPatterns);
        if (pnMatch) pnClass = pnMatch[0];
        if (!found.has(d) || (material && !found.get(d)!.material)) {
          found.set(d, { diameter: d, material, type: material ? (material.includes("PE") ? "pressure" : "gravity") : null, pnClass });
        }
      }
    }
  });
  return [...found.values()].sort((a, b) => a.diameter - b.diameter);
}

// ── Enhanced v5 pipe extraction with material dictionary ──
export function extractPipeDetailsV5(text: string): PipeDetailV5[] {
  if (!text) return [];
  const found = new Map<string, PipeDetailV5>();
  const patterns = [
    /(?:[ØøΦ]|DN|OD|ID)\s*(\d{2,4})\s*(?:mm)?\s*(PVC|UPVC|HDPE|PE100|PE80|GRP|FRP|DI|RCP|CONC|GI|STEEL|CLAY)?\s*(SN\d+|PN\d+|CLASS\s*[A-Z0-9]+)?/gi,
    /قطر\s+(\d{2,4})\s*(?:مم|mm)?\s*(PVC|HDPE|GRP|DI|RCP)?/gi,
    /(\d{2,4})\s*mm\s*(PVC|UPVC|HDPE|GRP|FRP|DI|RCP)?/gi,
  ];
  patterns.forEach(p => {
    let m;
    while ((m = new RegExp(p.source, p.flags).exec(text)) !== null) {
      const d = parseInt(m[1]);
      if (d < 50 || d > 3600) continue;
      const rawMat = (m[2] || "").toLowerCase();
      const matKey = rawMat ? ((PIPE_MATERIALS as any)[rawMat] ? rawMat : detectPipeMaterial(rawMat) || "unknown") : detectPipeMaterial(text.slice(Math.max(0, m.index - 40), m.index + 40)) || "unknown";
      const cls = detectPipeClass(m[3] || text.slice(Math.max(0, m.index - 30), m.index + 50)) || (PIPE_MATERIALS as any)[matKey]?.std || "";
      const key = `${d}_${matKey}_${cls}`;
      if (!found.has(key)) found.set(key, {
        dia: d,
        matKey,
        mat: (PIPE_MATERIALS as any)[matKey]?.ar || (rawMat || "غير محدد").toUpperCase(),
        cls,
        color: (PIPE_MATERIALS as any)[matKey]?.color || "#6b7280",
        type: (PIPE_MATERIALS as any)[matKey]?.cls || "",
      });
    }
  });
  return [...found.values()].sort((a, b) => a.dia - b.dia);
}

// ── Pipe slopes extraction ──
export function extractPipeSlopes(text: string): { val: number; unit: string; warn: boolean }[] {
  if (!text) return [];
  const slopes: { val: number; unit: string; warn: boolean }[] = [];
  const p = /(?:slope|ميل|gradient|grade)\s*[=:≈]?\s*(\d+\.?\d*)\s*(?:%|‰|per\s*mille|in\s*(\d+))/gi;
  let m;
  while ((m = p.exec(text)) !== null) {
    const v = parseFloat(m[1]);
    const unit = m[0].toLowerCase().includes("‰") ? "‰" : "%";
    if (v > 0 && v < 50) slopes.push({ val: v, unit, warn: (unit === "%" && (v < 0.2 || v > 15)) || (unit === "‰" && (v < 2 || v > 150)) });
  }
  return slopes;
}

// ── Build pipe network from extracted data across pages ──
export function buildPipeNetwork(extractedData: Record<string, any>): any[] {
  const network = new Map<string, any>();
  Object.values(extractedData || {}).forEach((d: any) => {
    if (!d.pipeEntries) return;
    d.pipeEntries.forEach((pe: any) => {
      const key = `${pe.dia}_${pe.mat}_${pe.cls}`;
      if (!network.has(key)) network.set(key, { ...pe, segments: [], totalLength: 0, minDepth: Infinity, maxDepth: 0 });
      const e = network.get(key);
      if (pe.length) e.totalLength += pe.length;
      if (pe.depth) { e.minDepth = Math.min(e.minDepth, pe.depth); e.maxDepth = Math.max(e.maxDepth, pe.depth); }
      e.segments.push(pe);
    });
  });
  return [...network.values()].sort((a, b) => a.dia - b.dia);
}

export function extractInvertLevels(text: string): string[] {
  if (!text) return [];
  const levels: string[] = [];
  const p = /(?:IL|INV|invert|منسوب|TW|GL|EGL)\s*[=:]\s*([-+]?\d{1,4}[.,]\d{1,3})/gi;
  let m;
  while ((m = p.exec(text)) !== null) levels.push(m[1]);
  return levels.slice(0, 20);
}

// ══════════════════════════════════════════════════════════════════════════
//  Earthworks Engine v6 — Soil/Rock Split + Sheeting + Dewatering
// ══════════════════════════════════════════════════════════════════════════

export function trenchWidth(diaMM: number, depthM = 2.0): number {
  const d_m = diaMM / 1000;
  let tw: number;
  if (diaMM <= 300) tw = d_m + 0.60;
  else if (diaMM <= 600) tw = d_m + 0.70;
  else if (diaMM <= 900) tw = d_m + 0.80;
  else if (diaMM <= 1200) tw = d_m + 0.90;
  else tw = d_m + 1.10;
  if (depthM > 1.5) tw += 0.10;
  return +tw.toFixed(2);
}

function pipeVolumePerMeter(diaMM: number): number {
  const od_m = diaMM / 1000;
  return +((Math.PI / 4) * od_m * od_m).toFixed(4);
}

function slopeVolumeFactor(depthM: number, sideSlope = 0): number {
  if (sideSlope <= 0) return 1.0;
  const extraWidth = 2 * sideSlope * depthM;
  return 1 + (extraWidth / 2);
}

export interface TrenchEarthworksInput {
  lengthM: number;
  diaMM: number;
  depthM: number;
  soilType?: string;
  sandBedMM?: number;
  hasSheeting?: boolean;
  hasDewatering?: boolean;
  rockDepthM?: number;
  sideSlope?: number;
}

export interface TrenchEarthworksResult {
  lengthM: number; diaMM: number; depthM: number; soilType: string; tw: number; slpFactor: number;
  excav_soil_m3: number; excav_rock_m3: number; excav_total_m3: number;
  pipe_m3: number; sandBed_m3: number; backfill_m3: number; backfill_loose_m3: number; disposal_m3: number; reinstat_m2: number;
  hasSheeting: boolean; hasDewatering: boolean;
  cost: { excav_soil_sar: number; excav_rock_sar: number; backfill_sar: number; sandBed_sar: number; disposal_sar: number; sheeting_sar: number; dewater_sar: number; total_sar: number };
  soilAr: string; soilColor: string;
  alerts: string[];
}

export function calcTrenchEarthworks(input: TrenchEarthworksInput): TrenchEarthworksResult {
  const { lengthM, diaMM, depthM, soilType = "normal", sandBedMM = 150, hasSheeting = false, hasDewatering = false, rockDepthM = 0, sideSlope = 0 } = input;
  const soil = SOIL_PARAMS[soilType] || SOIL_PARAMS.normal;
  const tw = trenchWidth(diaMM, depthM);
  const sb_m = sandBedMM / 1000;
  const rockDepth = Math.min(rockDepthM, depthM);
  const soilDepth = depthM - rockDepth;
  const slpFactor = slopeVolumeFactor(depthM, sideSlope);
  const excav_soil = +(lengthM * tw * soilDepth * slpFactor).toFixed(2);
  const excav_rock = +(lengthM * tw * rockDepth * 1.15).toFixed(2);
  const excav_total = +(excav_soil + excav_rock).toFixed(2);
  const pipe_vol = +(pipeVolumePerMeter(diaMM) * lengthM).toFixed(2);
  const sandBed_vol = +(lengthM * tw * sb_m).toFixed(2);
  const backfill_comp = +(excav_total - pipe_vol - sandBed_vol).toFixed(2);
  const backfill_loose = +(backfill_comp / (soil.compact || 0.90)).toFixed(2);
  const disposal_vol = +((excav_total * soil.swell) - backfill_comp).toFixed(2);
  const reinstat_m2 = +(lengthM * (tw + 0.30)).toFixed(2);
  const excav_soil_sar = +(excav_soil * soil.excav_sar).toFixed(0);
  const excav_rock_sar = +(excav_rock * SOIL_PARAMS.rock.excav_sar).toFixed(0);
  const backfill_sar = +(backfill_comp * soil.backfill_sar).toFixed(0);
  const sandBed_sar = +(sandBed_vol * 80).toFixed(0);
  const disposal_sar = +(disposal_vol > 0 ? disposal_vol * 50 : 0).toFixed(0);
  const sheeting_sar = hasSheeting ? +(lengthM * depthM * 2 * 45).toFixed(0) : 0;
  const dewater_sar = hasDewatering ? +(lengthM * 35).toFixed(0) : 0;
  const total_sar = +(+excav_soil_sar + +excav_rock_sar + +backfill_sar + +sandBed_sar + +disposal_sar + sheeting_sar + dewater_sar).toFixed(0);

  return {
    lengthM, diaMM, depthM, soilType, tw, slpFactor,
    excav_soil_m3: excav_soil, excav_rock_m3: excav_rock, excav_total_m3: excav_total,
    pipe_m3: pipe_vol, sandBed_m3: sandBed_vol,
    backfill_m3: backfill_comp > 0 ? backfill_comp : 0,
    backfill_loose_m3: backfill_loose > 0 ? backfill_loose : 0,
    disposal_m3: disposal_vol > 0 ? disposal_vol : 0,
    reinstat_m2, hasSheeting, hasDewatering,
    cost: { excav_soil_sar, excav_rock_sar, backfill_sar, sandBed_sar, disposal_sar, sheeting_sar, dewater_sar, total_sar },
    soilAr: soil.ar, soilColor: soil.color,
    alerts: [
      depthM > 4 ? `⚠️ عمق ${depthM}م — يستلزم دعم جوانب ومراجعة أمان` : null,
      depthM > 1.5 && !hasSheeting ? `💡 عمق ${depthM}م — يُنصح بدعم الجوانب` : null,
      rockDepthM > 0 ? `🪨 صخر ${rockDepthM}م — سعر حفر مضاعف` : null,
      hasDewatering ? `💧 تصريف مياه جوفية مضاف` : null,
    ].filter(Boolean) as string[],
  };
}

export function sumEarthworks(trenchList: TrenchEarthworksResult[]): any {
  const out = { excav_soil: 0, excav_rock: 0, excav_total: 0, backfill: 0, disposal: 0, sandBed: 0, reinstat: 0, cost_total: 0, lines: [] as TrenchEarthworksResult[] };
  trenchList.forEach(t => {
    out.excav_soil += t.excav_soil_m3 || 0;
    out.excav_rock += t.excav_rock_m3 || 0;
    out.excav_total += t.excav_total_m3 || 0;
    out.backfill += t.backfill_m3 || 0;
    out.disposal += t.disposal_m3 || 0;
    out.sandBed += t.sandBed_m3 || 0;
    out.reinstat += t.reinstat_m2 || 0;
    out.cost_total += t.cost?.total_sar || 0;
    out.lines.push(t);
  });
  return out;
}

export function extractEarthworksData(text: string): any | null {
  if (!text) return null;
  const data: any = {
    soilTypes: [] as string[], depths: [] as number[], trenchWidths: [] as number[],
    hasSheeting: false, hasDewatering: false, hasRock: false, rockDepth: 0, gwl: null,
  };
  if (/rock|صخر|bedrock|كرستال/i.test(text)) { data.soilTypes.push("rock"); data.hasRock = true; }
  if (/sand|رمل|sandy|ناعم/i.test(text)) data.soilTypes.push("sand");
  if (/clay|طين|silty|ليموني/i.test(text)) data.soilTypes.push("clay");
  if (/gravel|حصى|حصوية/i.test(text)) data.soilTypes.push("gravel");
  const rockDepthP = /(?:rock\s*at|صخر\s*(?:على|عند))\s*(\d+(?:[.,]\d+)?)\s*(?:m|م)/gi;
  let rd; while ((rd = rockDepthP.exec(text)) !== null) { data.rockDepth = parseFloat(rd[1].replace(",", ".")); }
  const gwlP = /(?:GWL|water\s*table|مياه\s*جوفية|منسوب\s*مياه)\s*[=:@]?\s*(\d+(?:[.,]\d+)?)\s*(?:m|م)/gi;
  let gw; if ((gw = gwlP.exec(text)) !== null) data.gwl = parseFloat(gw[1].replace(",", "."));
  const depthP = /(?:depth|عمق|حفر)\s*[=:≈]?\s*(\d+(?:[.,]\d+)?)\s*(?:m|م)/gi;
  let dm; while ((dm = depthP.exec(text)) !== null) { const v = parseFloat(dm[1].replace(",", ".")); if (v > 0 && v < 15) data.depths.push(v); }
  const twP = /(?:trench\s*width|عرض\s*الخندق)\s*[=:]\s*(\d+(?:[.,]\d+)?)\s*(?:m|م)/gi;
  let tw; while ((tw = twP.exec(text)) !== null) { const v = parseFloat(tw[1].replace(",", ".")); if (v > 0.3 && v < 5) data.trenchWidths.push(v); }
  if (/sheet|shoring|دعم\s*(جوانب|جانب)|برواز|propping/i.test(text)) data.hasSheeting = true;
  if (/dewater|pump|ضخ|مياه\s*جوفية|drain\s*pump/i.test(text)) data.hasDewatering = true;
  return data;
}

// ══════════════════════════════════════════════════════════════════════════
//  Asphalt Engine v6 — MOT 2024 + Cut & Reinstate
// ══════════════════════════════════════════════════════════════════════════

export interface AsphaltInput {
  lengthM: number; widthM: number;
  wearing_mm: number; binder_mm: number; baseCourse_mm: number; base_mm: number; subbase_mm: number;
  shoulderWidthM?: number; hasCutting?: boolean; reinstateOnly?: boolean; cuttingWidthM?: number;
}

export function calcAsphalt(input: AsphaltInput): any {
  const { lengthM, widthM, wearing_mm, binder_mm, baseCourse_mm, base_mm, subbase_mm, shoulderWidthM = 0, hasCutting = false, cuttingWidthM = 0 } = input;
  const mainArea = +(lengthM * widthM).toFixed(2);
  const shArea = +(lengthM * 2 * shoulderWidthM).toFixed(2);
  const totalArea = +(mainArea + shArea).toFixed(2);
  const cutArea = hasCutting && cuttingWidthM > 0 ? +(lengthM * cuttingWidthM).toFixed(2) : 0;
  const layers: any[] = [];

  const addLayer = (key: string, thickMM: number, areaM2: number) => {
    if (!thickMM || thickMM <= 0 || areaM2 <= 0) return;
    const lyr = (ASPHALT_LAYERS as any)[key];
    if (!lyr) return;
    const t_m = thickMM / 1000;
    const vol = +(areaM2 * t_m).toFixed(2);
    const tons = lyr.density > 0 && lyr.type === "AC" ? +(vol * lyr.density).toFixed(2) : 0;
    const ltrs = lyr.ltrPerM2 ? +(areaM2 * lyr.ltrPerM2).toFixed(0) : 0;
    const cost = lyr.type === "AC" && lyr.sar_t
      ? +(tons * lyr.sar_t).toFixed(0)
      : lyr.type === "Agg" && lyr.sar_m2
        ? +(areaM2 * (thickMM / 1000) * 1000 * lyr.sar_m2 / 1000).toFixed(0)
        : lyr.type === "Spray"
          ? +(areaM2 * lyr.sar_m2).toFixed(0)
          : 0;
    layers.push({ key, ar: lyr.ar, thickMM, area_m2: areaM2, vol_m3: vol, tons, ltrs, color: lyr.color, type: lyr.type, cost_sar: cost });
  };

  addLayer("subbase", subbase_mm, totalArea);
  addLayer("base", base_mm, totalArea);
  addLayer("primeCoat", 1, totalArea);
  addLayer("baseCourse", baseCourse_mm, mainArea);
  addLayer("tackCoat", 1, mainArea);
  addLayer("binder", binder_mm, mainArea);
  addLayer("tackCoat", 1, mainArea);
  addLayer("wearing", wearing_mm, totalArea);

  const totalAspTons = +layers.filter(l => l.type === "AC").reduce((s: number, l: any) => s + l.tons, 0).toFixed(2);
  const totalAggM3 = +layers.filter(l => l.type === "Agg").reduce((s: number, l: any) => s + l.vol_m3, 0).toFixed(2);
  const totalSprayLtr = +layers.filter(l => l.type === "Spray").reduce((s: number, l: any) => s + (l.ltrs || 0), 0).toFixed(0);
  const totalThickMM = (wearing_mm || 0) + (binder_mm || 0) + (baseCourse_mm || 0) + (base_mm || 0) + (subbase_mm || 0);
  const layerCost = +layers.reduce((s: number, l: any) => s + (l.cost_sar || 0), 0).toFixed(0);
  const cuttingCost = +(cutArea * 18).toFixed(0);
  const totalCost = +(layerCost + cuttingCost).toFixed(0);
  const costPerM2 = mainArea > 0 ? +(totalCost / mainArea).toFixed(1) : 0;

  return { lengthM, widthM, shoulderWidthM, mainArea, shArea, totalArea, cutArea, layers, totalAspTons, totalAggM3, totalSprayLtr, totalThickMM, totalCost, layerCost, cuttingCost, costPerM2 };
}

export function extractAsphaltLayers(text: string): any | null {
  if (!text) return null;
  const f: any = { wearing: 0, binder: 0, baseCourse: 0, base: 0, subbase: 0, roadWidths: [], roadLengths: [], roadType: null, hasCutting: false };
  if (/highway|motorway|سريع|express/i.test(text)) f.roadType = "highway";
  else if (/arterial|شرياني|رئيسي|primary/i.test(text)) f.roadType = "arterial";
  else if (/collector|جامع|secondary/i.test(text)) f.roadType = "collector";
  else if (/local|محلي|خدمي|service/i.test(text)) f.roadType = "local";
  if (/cut|milling|قطع|كور|تكسير/i.test(text)) f.hasCutting = true;
  const pats: [RegExp, string][] = [
    [/wearing\s*(?:course)?\s*(?:t\s*=\s*|=\s*|:)?\s*(\d{2,3})\s*mm/gi, "wearing"],
    [/surface\s*(?:course)?\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*mm/gi, "wearing"],
    [/(?:طبقة\s*)?سطحية\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*(?:mm|مم)/gi, "wearing"],
    [/binder\s*(?:course)?\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*mm/gi, "binder"],
    [/(?:طبقة\s*)?رابطة\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*(?:mm|مم)/gi, "binder"],
    [/base\s*course\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*mm/gi, "baseCourse"],
    [/أساس\s*أسفلت\w*\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*(?:mm|مم)/gi, "baseCourse"],
    [/(?:crushed|مجروش)\s*(?:stone|base)?\s*(?:t\s*=\s*|=\s*)?(\d{3,4})\s*mm/gi, "base"],
    [/(?:طبقة\s*)?أساس\s*(?:مجروش|حصوي)\s*(?:t\s*=\s*|=\s*)?(\d{3,4})\s*(?:mm|مم)/gi, "base"],
    [/sub.?base\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*mm/gi, "subbase"],
    [/(?:طبقة\s*)?(?:رمل|أساس\s*رملي)\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*(?:mm|مم)/gi, "subbase"],
  ];
  pats.forEach(([pat, key]) => {
    let m;
    while ((m = new RegExp(pat.source, pat.flags).exec(text)) !== null) {
      const v = parseInt(m[1]);
      if (v >= 20 && v <= 600 && f[key] === 0) f[key] = v;
    }
  });
  if (f.roadType && !f.wearing && !f.binder && !f.base) {
    const struct = ROAD_STRUCTURES[f.roadType];
    if (struct) Object.assign(f, { wearing: struct.wearing, binder: struct.binder, baseCourse: struct.baseCourse, base: struct.base, subbase: struct.subbase });
  }
  const wPat = /(?:road\s*width|carriageway|عرض\s*(?:الطريق|الرصف|الخط))\s*[=:≈]?\s*(\d+(?:[.,]\d+)?)\s*(?:م|m)/gi;
  let wm; while ((wm = wPat.exec(text)) !== null) { const v = parseFloat(wm[1]); if (v > 2 && v < 60) f.roadWidths.push(v); }
  return f;
}

// ══════════════════════════════════════════════════════════════════════════
//  buildProjectContext v11 — Enhanced with earthworks & asphalt
// ══════════════════════════════════════════════════════════════════════════

export function buildProjectContext(allResults: any[]): string {
  if (!allResults.length) return "";
  const combined = allResults.map((r: any) => r.reply || "").join("\n");
  const projMatch = combined.match(/مشروع[:：\s]+([^\n|]{5,60})/);
  const scaleMatch = combined.match(/مقياس[:：\s]+(1:\d+)/);
  const authMatch = combined.match(/NWC|MOT|أمانة|بلدية|الهيئة الملكية|MOMRA/i);

  const pipeRows: string[] = [];
  const pipeRE = /Ø(\d{2,4})\s*mm?\s*(PVC\s*SN\d*|HDPE\s*PE\d*|GRP|DI\s*PN\d*|RCP)?/gi;
  let pm; while ((pm = pipeRE.exec(combined)) !== null) pipeRows.push(`Ø${pm[1]}${pm[2] ? " " + pm[2] : ""}`);
  const uniquePipes = [...new Set(pipeRows)].slice(0, 12);

  const ksaCodes = (combined.match(/KSA-[A-Z]{2,6}-[A-Z]{2,6}-[A-Z]{1,4}-\d{3}/g) || []);
  const uniqueCodes = [...new Set(ksaCodes)].slice(0, 10);

  const ilLevels: string[] = [];
  const ilRE = /(?:IL|INV)\s*=?\s*([-+]?\d{1,4}[.,]\d{1,2})/g;
  let il; while ((il = ilRE.exec(combined)) !== null) ilLevels.push(il[1]);
  const uniqueIL = [...new Set(ilLevels)].slice(0, 6);

  // Earthworks accumulation
  const excavNums = [...combined.matchAll(/(?:حفر|EXC)[^\d]*(\d[\d,]+)\s*م³/g)].map(m => parseFloat(m[1].replace(/,/g, "")));
  const backfillNums = [...combined.matchAll(/(?:ردم|BKF)[^\d]*(\d[\d,]+)\s*م³/g)].map(m => parseFloat(m[1].replace(/,/g, "")));
  const disposalNums = [...combined.matchAll(/(?:تخلص|DSP)[^\d]*(\d[\d,]+)\s*م³/g)].map(m => parseFloat(m[1].replace(/,/g, "")));
  const totalExcav = excavNums.length ? Math.max(...excavNums).toLocaleString() : null;
  const totalBkf = backfillNums.length ? Math.max(...backfillNums).toLocaleString() : null;
  const totalDisp = disposalNums.length ? Math.max(...disposalNums).toLocaleString() : null;

  const soilType = combined.match(/(?:تربة|soil)\s*(رملية|طينية|صخرية|عادية|مشكّلة)/i)?.[1];
  const hasRock = /صخر|rock|تفجير|blasting/i.test(combined);
  const hasGWL = /مياه جوفية|groundwater|GWL|water table/i.test(combined);

  // Asphalt accumulation
  const aspNums = [...combined.matchAll(/(?:أسفلت|asphalt)[^\d]*(\d[\d,]+)\s*طن/g)].map(m => parseFloat(m[1].replace(/,/g, "")));
  const areaRe = combined.match(/(?:مساحة|area)[^\d]*(\d[\d,]+)\s*م²/i);
  const roadTypes = [...combined.matchAll(/(?:طريق|road)\s*(سريع|شرياني|جامع|محلي|خدمة)/ig)].map(m => m[1]);
  const totalTons = aspNums.length ? Math.max(...aspNums).toFixed(0) : null;
  const totalArea = areaRe ? (+areaRe[1].replace(/,/g, "")).toLocaleString() : null;

  const costNums = [...combined.matchAll(/(?:إجمالي|total)[^\d]*(\d[\d,]{4,})\s*SAR/g)].map(m => parseFloat(m[1].replace(/,/g, "")));
  const maxCost = costNums.length ? Math.max(...costNums).toLocaleString() : null;

  const lines: string[] = [];
  if (projMatch) lines.push(`المشروع: ${projMatch[1].trim()}`);
  if (scaleMatch) lines.push(`المقياس: ${scaleMatch[1]}`);
  if (authMatch) lines.push(`الجهة: ${authMatch[0]}`);
  if (uniquePipes.length) lines.push(`أقطار مكتشفة: ${uniquePipes.join(" | ")}`);
  if (uniqueIL.length) lines.push(`مناسيب IL مكتشفة: ${uniqueIL.join(" | ")}`);
  if (soilType || hasRock || hasGWL) {
    const soilLine = [`نوع التربة: ${soilType || "عادية"}`];
    if (hasRock) soilLine.push("صخر مكتشف ← عامل ×1.15");
    if (hasGWL) soilLine.push("مياه جوفية ← ضخ مطلوب");
    lines.push(soilLine.join(" | "));
  }
  if (totalExcav || totalBkf) {
    const ewLine: string[] = [];
    if (totalExcav) ewLine.push(`حفر: ${totalExcav} م³`);
    if (totalBkf) ewLine.push(`ردم: ${totalBkf} م³`);
    if (totalDisp) ewLine.push(`تخلص: ${totalDisp} م³`);
    lines.push(`أعمال ترابية متراكمة: ${ewLine.join(" | ")}`);
  }
  if (totalTons || totalArea) {
    const aspLine: string[] = [];
    if (totalArea) aspLine.push(`مساحة: ${totalArea} م²`);
    if (totalTons) aspLine.push(`أسفلت: ${totalTons} طن`);
    if (roadTypes.length) aspLine.push(`نوع الطريق: ${[...new Set(roadTypes)].join("/")}`);
    lines.push(`أعمال رصف متراكمة: ${aspLine.join(" | ")}`);
  }
  if (maxCost) lines.push(`أعلى إجمالي SAR مكتشف: ${maxCost}`);
  if (uniqueCodes.length) lines.push(`بنود KSA سابقة: ${uniqueCodes.join(", ")}`);
  return lines.length
    ? `\n══ سياق مكتشف من الدُفعات السابقة ══\n${lines.join("\n")}\n← لا تكرر البنود المذكورة — أضف فقط ما هو جديد ومختلف.\n`
    : "";
}

// ── System prompts v11 ──
export const SYS_MAIN = (cfg: string, depth: string, mods: string[], ocr: boolean) => `أنت نظام ALIMTYAZ ALWATANIA v11 — محرك هندسي وتجاري متخصص للمقاولين السعوديين.
${cfg}
عمق التحليل: ${depth === "deep" ? "🔬 عميق — تحقق مزدوج — دقة 95%" : depth === "standard" ? "📊 قياسي — دقة 85%" : "⚡ سريع — دقة 70%"}
الوحدات النشطة: ${mods.join(" | ") || "جميع الوحدات"}

══ منهجية العمل الإلزامية ══
١ كشف نوع المخطط فوراً:
  → مسقط أفقي | قطاع طولي | قطاع عرضي | تفصيل إنشائي | جدول غرف | BOQ | مواصفات | غلاف
٢ استخراج بيانات Title Block
٣ الامتثال السعودي (✓/✗ لكل بند مع رقم المعيار)
٤ الكميات (بالمعادلة الصريحة لكل بند — v6 engines):
  أنابيب: L م.ط لكل قطر/مادة
  ── الحفر والردم (فصل التربة/الصخر إلزامي) ──
  W = Ø≤300→Ø+0.60 | Ø≤600→Ø+0.70 | Ø≤900→Ø+0.80 | Ø>900→Ø+1.10 م
  إضافة 0.10م عند عمق >1.5م
  حفر_تربة = L×W×D_تربة | حفر_صخر = L×W×D_صخر×1.15
  ردم_مدموك = حفر_كلي − أنبوب − فرشة_150mm
  ردم_فعلي = ردم ÷ {0.90/عادي|0.95/رمل|0.85/طين}
  تخلص = حفر × {1.25/عادي|1.12/رمل|1.30/طين|1.45/صخر} − ردم
  ── الرصف والأسفلت (MOT 2024) ──
  Wearing(طن)=A_كلية×t_m×2.35 | Binder=A×t_m×2.30 | BaseAC=A×t_m×2.25
  | الكود KSA | الوصف | المعادلة | الكمية | الوحدة | الثقة |
٥ BOQ الكامل بالأسعار:
  | الكود | الوصف | الوحدة | الكمية | سعر SAR | إجمالي SAR | الثقة |
  ${SAR_REF_2025}
٦ التكاليف الإجمالية + حساسية ±5% ±10% ±15%
٧ سجل المخاطر | هندسة القيمة | خلاصة تنفيذية 5 نقاط

══ قواعد الدقة ══
• مقياس غير واضح → [NTS] — لا تفترض
• بُعد غير مقروء → [قراءة جزئية] — لا تخمّن
• تعارض بين صفحات → أبلغ صراحةً
• سعر خارج النطاق → أبلغ فوراً
${ocr ? `\n══ OCR النشط ══\nTitle Block | أبعاد | أنابيب Ø/مادة/PN | مناسيب GL,IL | إحداثيات | طبقات رصف` : ""}`;

export const SYS_VISUAL_INFRA = (cfg: string, chunkLabel: string, drawTypes: string[], scale: string | null, projectCtx: string) => {
  const typeStr = drawTypes.length ? drawTypes.join(" + ") : "بنية تحتية عامة";
  const scaleHint = scale && scale !== "NTS"
    ? `المقياس المؤكد: ${scale} — استخدمه لحساب الأبعاد الحقيقية`
    : "المقياس: غير محدد — اذكر [NTS] واستخرج الأبعاد المدوّنة فقط";
  return `أنت محرك ALIMTYAZ v11 للحصر الدقيق — البنية التحتية السعودية (تحليل بصري).
${cfg}
الدُفعة: ${chunkLabel} | الأنواع: ${typeStr} | ${scaleHint}
${projectCtx}

══ بروتوكول حصر الأنابيب الدقيق v5 (إلزامي) ══

STEP 1 — تحديد نوع المخطط [إلزامي في السطر الأول]:
  [PLN] مسقط | [PRF] قطاع طولي | [XSC] قطاع عرضي | [MHC] جدول غرف | [BOQ] | [STR] | [MAR] | [SPC]

STEP 2 — استخراج Title Block

STEP 3 — جدول الأنابيب الشامل (لكل وصلة):
  | # | من | إلى | القطر mm | المادة | SN/PN | الطول م | الميل % | IL In م | IL Out م | عمق الحفر م | الثقة |
  ✦ اذكر دائماً: PVC SN8 / HDPE PE100 / GRP SN10000 / DI PN16 / RCP Class3
  ✦ إذا لم تُذكر المادة: [مادة غير محددة] — لا تفترض

STEP 4–7 — بروتوكولات المناسيب والغرف والقطاعات

STEP 8 — BOQ التفصيلي بترميز KSA + أسعار SAR

STEP 8B — بروتوكول الحفر والردم الدقيق v6:
  W = Ø≤300→Ø+0.60 | Ø≤600→Ø+0.70 | Ø≤900→Ø+0.80 | Ø>900→Ø+1.10 م
  حفر_تربة = L×W×D_تربة | حفر_صخر = L×W×D_صخر×1.15
  ردم_مدموك = حفر_كلي − أنبوب − فرشة_150mm
  ردم_فعلي = ردم ÷ عامل_انضغاط | تخلص = حفر × عامل_انتفاش − ردم
  دعم_جوانب: L×D×2 م² (عمق>1.5م) | ضخ مياه: أيام×سعر/يوم

STEP 8C — بروتوكول أعمال الأسفلت والرصف v6:
  Wearing(طن)=A_كلية×t_m×2.35 | Binder=A×t_m×2.30 | BaseAC=A×t_m×2.25
  Prime = A × 0.80 لتر/م² | Tack = A × 0.30 لتر/م²
  إعادة الرصف: L × (W_خندق + 0.30) م²

${SAR_REF_2025}

✅ تحقق: هل المقاسات متسقة؟ | هل الميول منطقية؟ | هل يوجد تعارض بين مقطعين؟`;
};

export const SYS_FAST = (cfg: string, info: string, drawTypes: string[], scales: string[], projectCtx: string) => {
  const typeHint = drawTypes.length ? `أنواع محتملة: ${drawTypes.map(t => (DRAW_TYPES as any)[t]?.ar || t).join(" | ")}` : "";
  const scaleHint = scales.length ? `مقاييس مكتشفة: ${scales.join(", ")}` : "";
  return `أنت محرك ALIMTYAZ v11 للحصر الدقيق من النصوص — البنية التحتية السعودية.
${cfg} | ${info}
${typeHint}${scaleHint ? "\n" + scaleHint : ""}
${projectCtx}

══ بروتوكول استخراج الأنابيب الدقيق (8 خطوات) ══
١ نوع كل صفحة
٢ Title Block
٣ جدول الأنابيب الكامل: | القطر mm | المادة | SN/PN | الطول م | الميل % | IL In | IL Out | عمق الحفر م | الثقة |
٤ جدول الغرف/البيارات
٥ حساب الكميات بالمعادلة الصريحة:
  ── حفر خنادق ──
  W = Ø≤300→Ø+0.60 | Ø≤600→Ø+0.70 | Ø≤900→Ø+0.80 | Ø>900→Ø+1.10 م
  حفر_تربة = L×W×D_تربة | حفر_صخر = L×W×D_صخر×1.15
  ردم_مدموك = حفر_كلي − أنبوب − فرشة | تخلص = حفر × عامل_انتفاش − ردم
  ── رصف وأسفلت ──
  Wearing(طن)=A×t_m×2.35 | Binder=A×t_m×2.30 | BaseAC=A×t_m×2.25
  Prime = A × 0.80 | Tack = A × 0.30
٦ جدول BOQ التفصيلي:
  ${SAR_REF_2025}
٧ ملاحظات الامتثال NWC/MOT
٨ خلاصة الدُفعة`;
};

export const SYS_HYBRID = (cfg: string, info: string, drawTypes: string[], projectCtx: string) => `أنت محرك ALIMTYAZ v11 للتحليل المدمج (نص + صورة بصرية).
${cfg} | ${info}
${drawTypes.length ? `أنواع متوقعة: ${drawTypes.join(" | ")}` : ""}
${projectCtx}
الاستراتيجية:
① الصورة: نوع المخطط + مقياس الرسم + أنماط الأنابيب (قطر/مادة) + أماكن الغرف
② النص: أرقام دقيقة + مناسيب IL/GL + كودات SN/PN + جداول المواصفات + Chainages
③ الدمج: جدول أنابيب موحد + BOQ بـKSA + تحقق تطابق نص↔صورة
قاعدة الأنابيب: لا تكتب "PVC" فقط — دائماً "PVC SN8" أو "HDPE PE100 PN12.5"
${SAR_REF_2025}`;

export const SYS_MERGE = (projectCtx = "", drawTypeSummary = "") => `أنت محرك ALIMTYAZ v11 للدمج والحصر النهائي — متخصص في شبكات الأنابيب والحفر والرصف.
لديك نتائج تحليل من دُفعات متعددة لنفس الملف.
${projectCtx}
${drawTypeSummary ? `أنواع المخططات: ${drawTypeSummary}` : ""}

══ بروتوكول الدمج النهائي v6 (12 خطوة إلزامية) ══

١ جدول الأنابيب الموحد النهائي (مرتّب بالقطر تصاعدياً):
  | القطر mm | المادة | SN/PN | الطول م.ط | متوسط عمق م | حجم حفر م³ | حجم ردم م³ | تخلص م³ | سعر/م.ط | إجمالي SAR |

٢ جدول الحفر والردم الشامل v6:
  W = Ø≤300→Ø+0.60 | Ø≤600→Ø+0.70 | Ø≤900→Ø+0.80 | Ø>900→Ø+1.10 م
  حفر_تربة = L×W×D_تربة | حفر_صخر = L×W×D_صخر×1.15
  ردم_مدموك = حفر_كلي − أنبوب − فرشة_150mm
  تخلص = حفر × عامل_انتفاش − ردم

٣ جدول BOQ الحفر المفصّل v6

٤ جدول أعمال الرصف والأسفلت v6:
  Wearing(طن)=A_كلية×t_m×2.35 | Binder=A×t_m×2.30 | BaseAC=A×t_m×2.25
  Prime = A × 0.80 | Tack = A × 0.30

٥ جدول الغرف/البيارات الموحد
٦ BOQ الموحد الكامل
٧ تحقق الاتساق الشامل
٨ لوحة KPIs المشروع الشاملة
٩ هيكل التكاليف الإجمالي + حساسية ±5% ±10% ±15%
١٠ سجل المخاطر
١١ تقرير الامتثال NWC/MOT
١٢ أهم 5 توصيات فنية وتجارية فورية للمقاول

أنتج تقريراً احترافياً كاملاً — لا اختصار في أي جدول.`;

// ── PDF helpers ──
export interface ExtractedPage {
  pageNum: number; dims: string; text: string; tableLines: string; annotations: string;
  charCount: number; lineCount: number; tableCount: number; numCount: number; density: number;
  drawingType: string | null; scale: string | null; diameters: number[]; invertLevels: string[];
  slopes?: { val: number; unit: string; warn: boolean }[];
  chainages?: string[];
  manholes?: string[];
  pipeSpecs?: PipeDetailV5[];
  pipeEntries?: any[];
  ewData?: any;
  aspData?: any;
}

export async function extractPageData(doc: any, pageNum: number, maxChars = 3000): Promise<ExtractedPage> {
  const page = await doc.getPage(pageNum);
  const tc = await page.getTextContent();
  const items = tc.items || [];
  const rows: Record<number, { x: number; text: string }[]> = {};
  items.forEach((item: any) => {
    const y = Math.round(item.transform[5] / 5) * 5;
    if (!rows[y]) rows[y] = [];
    rows[y].push({ x: item.transform[4], text: item.str.trim() });
  });
  const lines = Object.entries(rows)
    .sort(([a], [b]) => +b - +a)
    .map(([, cells]) => cells.sort((a, b) => a.x - b.x).map(c => c.text).filter(Boolean).join("  "))
    .filter(Boolean);
  const tableLines = lines.filter(l => { const p = l.split(/\s{2,}/); return p.length >= 3 && p.some(x => /\d/.test(x)); });
  const numLines = lines.filter(l => /\d+[.,]\d+/.test(l) || /SAR|ريال|م²|م³|لم|طم|كم/.test(l));
  let annotations: string[] = [];
  try { const anns = await page.getAnnotations(); annotations = anns.filter((a: any) => a.contents || a.subtype === "Text").map((a: any) => a.contents || "").filter(Boolean); } catch { }
  const vp = page.getViewport({ scale: 1 });
  const raw = lines.join("\n");
  const fullText = raw + (annotations.length ? "\n" + annotations.join(" ") : "");
  const text = raw.length > maxChars ? raw.slice(0, maxChars) + `\n[... +${raw.length - maxChars} حرف محذوف]` : raw;
  page.cleanup?.();
  const drawingType = detectDrawingType(fullText);
  const scale = detectScale(fullText);
  const diameters = extractPipeDiameters(fullText);
  const invertLevels = extractInvertLevels(fullText);

  // v11 enhanced extractions
  const slopes = extractPipeSlopes(fullText);
  const pipeSpecs = extractPipeDetailsV5(fullText);
  const ewData = extractEarthworksData(fullText);
  const aspData = extractAsphaltLayers(fullText);

  // Chainages
  const chainages: string[] = [];
  const chRE = /CH\s*(\d+\+\d{3}|\d+[.,]\d+)/gi;
  let chM; while ((chM = chRE.exec(fullText)) !== null) chainages.push(chM[1]);

  // Manholes
  const manholes: string[] = [];
  const mhRE = /(?:MH|GH|غرفة|بيارة)\s*[-#]?\s*(\d{1,5})/gi;
  let mhM; while ((mhM = mhRE.exec(fullText)) !== null) manholes.push(mhM[1]);

  const infraScore = (diameters.length > 0 ? 1 : 0) + (invertLevels.length > 2 ? 1 : 0) + (scale ? 1 : 0);
  const rawDensity = Math.min(3, Math.floor((tableLines.length * 2 + numLines.length) / 5));
  const density = Math.min(3, rawDensity + (infraScore > 1 ? 1 : 0));
  return {
    pageNum, dims: `${Math.round(vp.width)}×${Math.round(vp.height)}pt`, text,
    tableLines: tableLines.join("\n"), annotations: annotations.join(" | "),
    charCount: raw.length, lineCount: lines.length, tableCount: tableLines.length,
    numCount: numLines.length, density, drawingType, scale, diameters, invertLevels,
    slopes, chainages: chainages.length ? [...new Set(chainages)] : undefined,
    manholes: manholes.length ? [...new Set(manholes)] : undefined,
    pipeSpecs: pipeSpecs.length ? pipeSpecs : undefined,
    pipeEntries: pipeSpecs.length ? pipeSpecs : undefined,
    ewData: ewData?.soilTypes?.length || ewData?.depths?.length ? ewData : undefined,
    aspData: aspData?.wearing || aspData?.roadType ? aspData : undefined,
  };
}

export async function renderThumb(doc: any, p: number): Promise<string> {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 0.14 });
  const cv = document.createElement("canvas");
  cv.width = vp.width; cv.height = vp.height;
  await page.render({ canvasContext: cv.getContext("2d")!, viewport: vp }).promise;
  const url = cv.toDataURL("image/jpeg", 0.55);
  cv.width = 0; cv.height = 0;
  return url;
}

export async function renderPreview(doc: any, p: number, scale = 1.2): Promise<string> {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale });
  const cv = document.createElement("canvas");
  cv.width = vp.width; cv.height = vp.height;
  await page.render({ canvasContext: cv.getContext("2d")!, viewport: vp }).promise;
  const url = cv.toDataURL("image/jpeg", 0.88);
  cv.width = 0; cv.height = 0;
  return url;
}

export async function renderPageImg(doc: any, p: number, scale = 1.5, q = 0.85): Promise<string> {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale });
  const cv = document.createElement("canvas");
  cv.width = vp.width; cv.height = vp.height;
  await page.render({ canvasContext: cv.getContext("2d")!, viewport: vp }).promise;
  const b64 = cv.toDataURL("image/jpeg", q).split(",")[1];
  cv.width = 0; cv.height = 0;
  return b64;
}

// ── API call via Supabase edge function ──
export async function apiCall(body: any, maxRetries = 3): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke("analyze-drawing-v9", { body });
      if (error) {
        if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue; }
        throw error;
      }
      data._attempt = attempt;
      return data;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

export function parseRange(str: string, max: number): number[] {
  const s = new Set<number>();
  str.split(",").forEach(seg => {
    const m = seg.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return;
    const a = +m[1], b = m[2] ? +m[2] : a;
    for (let i = Math.min(a, b); i <= Math.min(Math.max(a, b), max); i++) s.add(i);
  });
  return [...s].sort((a, b) => a - b);
}

const DWG_V: Record<string, string> = { "AC1006": "R10", "AC1009": "R12", "AC1012": "R13", "AC1014": "R14", "AC1015": "2000", "AC1018": "2004", "AC1021": "2007", "AC1024": "2010", "AC1027": "2013", "AC1032": "2018", "AC1037": "2023" };
export async function parseDWG(file: File): Promise<any> {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const b = new Uint8Array(e.target!.result as ArrayBuffer);
        const v = String.fromCharCode(...b.slice(0, 6));
        res({ ok: true, version: DWG_V[v] || `Unknown(${v})`, verCode: v, fileSizeKB: Math.round((e.target!.result as ArrayBuffer).byteLength / 1024), name: file.name });
      } catch (err: any) { res({ ok: false, error: err.message, name: file.name }); }
    };
    r.readAsArrayBuffer(file);
  });
}

// ── Markdown renderer ──
export function md(text: string): string {
  if (!text) return "";
  let h = text;
  h = h.replace(/(\|.+\|\n?)+/g, tb => {
    const rows = tb.trim().split("\n").filter(r => r.trim());
    if (rows.length < 2) return tb;
    const isSep = (r: string) => /^\|[\s\-:|]+\|/.test(r);
    let th = "", td = "", done = false;
    rows.forEach(row => {
      if (isSep(row)) { done = true; return; }
      const cells = row.split("|").map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
      const tag = done ? "td" : "th";
      const tr = `<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join("")}</tr>`;
      done ? td += tr : th += tr;
    });
    return `<div class="tw"><table><thead>${th}</thead><tbody>${td}</tbody></table></div>`;
  });
  h = h.replace(/^### (.+)$/gm, '<h3 class="h3">$1</h3>');
  h = h.replace(/^## (.+)$/gm, '<h2 class="h2">$1</h2>');
  h = h.replace(/^# (.+)$/gm, '<h1 class="h1">$1</h1>');
  h = h.replace(/\*\*(.*?)\*\*/g, '<strong class="b">$1</strong>');
  h = h.replace(/✅/g, '<span class="bk ok">✅ عالي</span>');
  h = h.replace(/⚠️/g, '<span class="bk wn">⚠️ متوسط</span>');
  h = h.replace(/🔍/g, '<span class="bk ck">🔍 تأكيد</span>');
  h = h.replace(/🟢/g, '<span class="bk lo">🟢 منخفض</span>');
  h = h.replace(/🟡/g, '<span class="bk me">🟡 متوسط</span>');
  h = h.replace(/🔴/g, '<span class="bk hi">🔴 عالي</span>');
  h = h.replace(/⛔/g, '<span class="bk cr">⛔ حرج</span>');
  h = h.replace(/`([^`]+)`/g, '<code class="code">$1</code>');
  h = h.replace(/\[مستنتج\]/g, '<span class="bk inf">[مستنتج]</span>');
  h = h.replace(/\[قراءة جزئية\]/g, '<span class="bk prt">[جزئي]</span>');
  h = h.replace(/^[-•]\s(.+)$/gm, '<div class="li">• $1</div>');
  h = h.replace(/\n\n/g, '</p><p class="p">');
  return `<p class="p">${h}</p>`;
}

// ── Export helpers ──
function extractAllTables(msgs: any[]) { return msgs.filter(m => m.role === "assistant").map(m => typeof m.content === "string" ? m.content : "").join("\n"); }

export function exportCSV(msgs: any[], fnameStr = "BOQ_ALIMTYAZ_v11") {
  const text = extractAllTables(msgs);
  const rows = text.split("\n").filter(l => l.includes("|") && !l.match(/^[\|\-\s:]+$/));
  const csv = rows.map(r => r.split("|").map(c => `"${c.trim()}"`).filter((_, i, a) => i > 0 && i < a.length - 1).join(",")).join("\n");
  dl(new Blob(["\uFEFF" + csv], { type: "text/csv" }), fnameStr + ".csv");
}

export function exportMD(msgs: any[], cfgLabel: string) {
  const text = `# تقرير ALIMTYAZ v11\n**الإعداد:** ${cfgLabel}\n**التاريخ:** ${new Date().toLocaleString("ar-SA")}\n\n---\n\n` +
    msgs.filter(m => m.role === "assistant").map(m => `## ${m.chunkLabel || "تحليل"}\n\n${m.content}`).join("\n\n---\n\n");
  dl(new Blob([text], { type: "text/markdown" }), "Report_ALIMTYAZ_v11.md");
}

export function exportJSON(msgs: any[], feState: any, cfgLabel: string) {
  const data = {
    system: "ALIMTYAZ v11", config: cfgLabel, exported: new Date().toISOString(),
    summary: { totalMessages: msgs.length, totalTokens: msgs.reduce((s: number, m: any) => s + (m.tokens || 0), 0) },
    messages: msgs.filter(m => m.role === "assistant").map(m => ({ label: m.chunkLabel || "chat", content: m.content, tokens: m.tokens || 0, isMerged: !!m.isMerged })),
  };
  dl(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "BOQ_ALIMTYAZ_v11.json");
}

export function exportTXT(feState: any) {
  if (!feState?.extractedData) return;
  const lines = Object.entries(feState.extractedData).sort(([a], [b]) => +a - +b).map(([p, d]: [string, any]) => `${"=".repeat(50)}\nصفحة ${p} | ${d.dims} | ${d.lineCount} سطر\n${"=".repeat(50)}\n${d.text}\n`).join("\n");
  dl(new Blob([lines], { type: "text/plain;charset=utf-8" }), "ExtractedText_ALIMTYAZ_v11.txt");
}

// ── Specialized CSV exports v11 ──
export function exportPipeScheduleCSV(pipeNetwork: any[]) {
  if (!pipeNetwork?.length) return;
  const header = "القطر mm,المادة,SN/PN,الطول م.ط,أدنى عمق م,أقصى عمق م,النوع";
  const rows = pipeNetwork.map(p => `${p.dia},${p.mat},${p.cls},${p.totalLength?.toFixed(1) || 0},${p.minDepth === Infinity ? "-" : p.minDepth},${p.maxDepth || "-"},${p.type}`);
  dl(new Blob(["\uFEFF" + header + "\n" + rows.join("\n")], { type: "text/csv" }), "PipeSchedule_v11.csv");
}

export function exportEarthworksCSV(earthworksSummary: any) {
  if (!earthworksSummary) return;
  const header = "البند,الكمية,الوحدة";
  const rows = [
    `حفر تربة,${earthworksSummary.excav_soil?.toFixed(0) || 0},م³`,
    `حفر صخر,${earthworksSummary.excav_rock?.toFixed(0) || 0},م³`,
    `ردم مدموك,${earthworksSummary.backfill?.toFixed(0) || 0},م³`,
    `فرشة رملية,${earthworksSummary.sandBed?.toFixed(0) || 0},م³`,
    `تخلص ونقل,${earthworksSummary.disposal?.toFixed(0) || 0},م³`,
    `إعادة رصف,${earthworksSummary.reinstat?.toFixed(0) || 0},م²`,
    `التكلفة الإجمالية,${earthworksSummary.cost_total?.toFixed(0) || 0},SAR`,
  ];
  dl(new Blob(["\uFEFF" + header + "\n" + rows.join("\n")], { type: "text/csv" }), "Earthworks_v11.csv");
}

export function exportAsphaltCSV(asphaltSummary: any) {
  if (!asphaltSummary) return;
  const header = "الطبقة,السماكة mm,المساحة م²,الحجم/الوزن,التكلفة SAR";
  const rows = (asphaltSummary.layers || []).map((l: any) =>
    `${l.ar},${l.thickMM},${l.area_m2},${l.type === "AC" ? l.tons + " طن" : l.type === "Spray" ? (l.ltrs || 0) + " لتر" : l.vol_m3 + " م³"},${l.cost_sar}`
  );
  dl(new Blob(["\uFEFF" + header + "\n" + rows.join("\n")], { type: "text/csv" }), "Asphalt_v11.csv");
}

function dl(blob: Blob, name: string) { Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name }).click(); }
