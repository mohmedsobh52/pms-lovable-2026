import { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ═══════════════════════════════════════════════════════════════════════════
//  ACCURACY ENGINE v3 — ALIMTYAZ v9 — INFRASTRUCTURE SPECIALIST
// ═══════════════════════════════════════════════════════════════════════════

const SAR_REF_2025 = `
══ أسعار السوق السعودي 2025 (مرجع إلزامي — أبلغ عن أي انحراف) ══
EARTHWORKS:
• حفر خنادق يدوي: 45–80 SAR/م³ | آلي: 35–65 | صخر: 150–280
• ردم داخلي مدموك: 20–40 SAR/م³ | ردم رملي: 30–50 | تخلص موقع: 25–45 | نقل خارج: 35–60
• حفر عام: 18–35 SAR/م³ | رمل تسوية: 60–90 | حجر أساس مدموك: 95–130

CONCRETE & STRUCTURAL:
• نظافة C15: 280–350 SAR/م³ | C25: 380–450 | C30: 420–500 | C35: 480–560
• غطاء خرساني Ø1200: 550–900 SAR/قطعة | Ø1500: 900–1400 | Ø1800: 1500–2200
• حديد تسليح: 4,500–5,500 SAR/طن | شبكات: 4,200–4,800
• قوالب: 180–320 SAR/م² | لبادة رغوية: 25–45/م²

GRAVITY SEWER & DRAINAGE:
• PVC SN8 Ø150: 60–85 SAR/م.ط | Ø200: 85–120 | Ø250: 115–155 | Ø300: 140–185 | Ø400: 210–270 | Ø500: 290–370
• HDPE PE100 Ø110: 55–80 SAR/م.ط | Ø160: 95–130 | Ø200: 130–175 | Ø250: 180–240 | Ø315: 250–330
• GRP (FRP) Ø400: 290–380 SAR/م.ط | Ø500: 380–520 | Ø600: 480–640 | Ø700: 620–800 | Ø800: 750–980 | Ø900: 850–1100 | Ø1000: 980–1280 | Ø1200: 1400–1800
• DI (طي دكتايل) Ø100: 180–240 SAR/م.ط | Ø150: 240–320 | Ø200: 310–420 | Ø300: 480–630
• غرفة صرف Ø1000: 3,500–5,500 SAR | Ø1200: 4,500–7,000 | Ø1500: 7,000–12,000 | Ø1800: 12,000–18,000
• إطار وغطاء حديد زهر: 450–750 SAR/قطعة | D400: 650–900

WATER SUPPLY:
• DI PN16 Ø100: 200–280 SAR/م.ط | Ø150: 280–380 | Ø200: 360–490 | Ø300: 580–780 | Ø400: 850–1100
• HDPE PN12.5 Ø63: 45–70 SAR/م.ط | Ø90: 70–100 | Ø110: 90–125 | Ø160: 140–190 | Ø200: 180–250
• صمام بوابة: Ø100: 450–650 SAR | Ø150: 700–1000 | Ø200: 1000–1500 | Ø300: 2500–3500
• صمام هواء: 350–600 SAR/قطعة | كتلة دفع C25: 180–350 SAR/م³

ROADS & PAVEMENT:
• رصف أسفلتي سطحي 50mm: 180–240 SAR/م² | 60mm: 210–275 | 75mm: 240–310
• طبقة رابطة 60mm: 155–200 SAR/م² | أساس أسفلتي: 130–180
• طبقة أساس مدموكة (مجروش) 200mm: 120–160 SAR/م² | 300mm: 165–215
• حواجز خرسانية نيوجرسي: 380–520 SAR/م.ط | رصيف: 85–130 | حافة طريق: 55–90
• علامات مرورية: 180–320 SAR/م² | أعمدة: 850–1400/قطعة | إرشادية: 1200–2500

STORMWATER & MARINE:
• بلاعة أمطار بوكس: 1,800–3,200 SAR/قطعة | شبكية: 1,200–2,000
• مواسير كونكريت RCP Ø300: 185–260 SAR/م.ط | Ø450: 290–420 | Ø600: 420–580 | Ø900: 750–1000
• بوكس كولفرت 1200×1200: 850–1200 SAR/م.ط | 1500×1500: 1300–1800 | 2000×2000: 2200–3000
• خط تصريف بحري HDPE Ø400: 480–680 SAR/م.ط | Ø600: 750–1050 | Ø900: 1200–1700 | Ø1200: 2000–2800
• منظومة موزعات outfall: 8,000–25,000 SAR/وحدة (حسب القطر والعمق)

LABOUR & MISC:
• عمالة ماهرة: 120–180 SAR/ساعة | عادية: 55–85 | مهندس إشراف: 250–400
• حماية أنبوب (concrete encasement): 380–520 SAR/م.ط | رمل دعم: 55–90/م.ط`;

const DRAW_TYPES: Record<string, {ar:string; code:string; color:string}> = {
  PLAN:     {ar:"مسقط أفقي",    code:"PLN", color:"#2563eb"},
  PROFILE:  {ar:"قطاع طولي",    code:"PRF", color:"#7c3aed"},
  SECTION:  {ar:"قطاع عرضي",    code:"XSC", color:"#0ea5e9"},
  STRUCT:   {ar:"تفصيل إنشائي", code:"STR", color:"#d97706"},
  MANHOLE:  {ar:"جدول غرف",     code:"MHC", color:"#059669"},
  BOQ:      {ar:"جدول كميات",   code:"BOQ", color:"#16a34a"},
  SPEC:     {ar:"مواصفات",       code:"SPC", color:"#64748b"},
  COVER:    {ar:"صفحة غلاف",    code:"CVR", color:"#94a3b8"},
  DETAIL:   {ar:"تفصيل بنائي",  code:"DTL", color:"#f59e0b"},
  MARINE:   {ar:"بحري/outfall", code:"MAR", color:"#0284c7"},
  ROAD:     {ar:"طريق/رصف",     code:"RD",  color:"#dc2626"},
  UTILITY:  {ar:"مرافق مدفونة", code:"UTL", color:"#7c3aed"},
};

function detectDrawingType(text: string): string | null {
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
  const pipeMatches = (ar.match(/[øØΦ]\d+|dn\s*\d+|id\s*\d+|Ø\d+|قطر/gi)||[]).length;
  if (pipeMatches >= 3) return "PLAN";
  return null;
}

function detectScale(text: string): string | null {
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

function extractPipeDiameters(text: string): number[] {
  if (!text) return [];
  const found = new Set<number>();
  const patterns = [/[ØøΦ]\s*(\d{2,4})\s*(?:mm)?/gi, /DN\s*(\d{2,4})/gi, /Ø\s*(\d{2,4})/gi, /قطر\s+(\d{2,4})\s*(?:مم|mm)/gi, /ID\s*=?\s*(\d{2,4})\s*(?:mm)/gi];
  patterns.forEach(p => { let m; while ((m = p.exec(text)) !== null) { const d = parseInt(m[1]); if (d >= 50 && d <= 3000) found.add(d); } });
  return [...found].sort((a,b)=>a-b);
}

function extractInvertLevels(text: string): string[] {
  if (!text) return [];
  const levels: string[] = [];
  const p = /(?:IL|INV|invert|منسوب|TW|GL|EGL)\s*[=:]\s*([-+]?\d{1,4}[.,]\d{1,3})/gi;
  let m;
  while ((m = p.exec(text)) !== null) levels.push(m[1]);
  return levels.slice(0, 20);
}

function buildProjectContext(allResults: any[]): string {
  if (!allResults.length) return "";
  const combined = allResults.map((r: any)=>r.reply||"").join("\n");
  const projMatch = combined.match(/مشروع[:：\s]+([^\n|]{5,60})/);
  const scaleMatch = combined.match(/مقياس[:：\s]+(1:\d+)/);
  const authMatch = combined.match(/NWC|MOT|أمانة|بلدية|الهيئة الملكية|MOMRA/i);
  const lines: string[] = [];
  if (projMatch) lines.push(`المشروع: ${projMatch[1].trim()}`);
  if (scaleMatch) lines.push(`المقياس المكتشف: ${scaleMatch[1]}`);
  if (authMatch) lines.push(`الجهة: ${authMatch[0]}`);
  const ksaCodes = (combined.match(/KSA-[A-Z]{2,6}-[A-Z]{2,6}-[A-Z]{1,4}-\d{3}/g)||[]);
  const unique = [...new Set(ksaCodes)].slice(0,8);
  if (unique.length) lines.push(`بنود سبق استخراجها: ${unique.join(", ")}`);
  return lines.length ? `\n══ سياق مكتشف من الصفحات السابقة ══\n${lines.join("\n")}\n` : "";
}

// System prompts
const SYS_MAIN = (cfg: string, depth: string, mods: string[], ocr: boolean) => `أنت نظام ALIMTYAZ ALWATANIA v9 — محرك هندسي وتجاري متخصص للمقاولين السعوديين.
${cfg}
عمق التحليل: ${depth==="deep"?"🔬 عميق — تحقق مزدوج — دقة 95%":depth==="standard"?"📊 قياسي — دقة 85%":"⚡ سريع — دقة 70%"}
الوحدات النشطة: ${mods.join(" | ")||"جميع الوحدات"}

══ منهجية العمل الإلزامية ══
١ كشف نوع المخطط فوراً
٢ استخراج بيانات Title Block
٣ الامتثال السعودي (✓/✗ لكل بند مع رقم المعيار)
٤ الكميات (محور بمحور، منطقة بمنطقة):
  | الكود KSA | الوصف التفصيلي | المعادلة الصريحة | الكمية | الوحدة | الثقة |
  ترميز: KSA-[DISC]-[WORK]-[ZONE]-[SEQ]
٥ BOQ الكامل بالأسعار:
  | الكود KSA | الوصف | الوحدة | الكمية | سعر SAR | إجمالي SAR | الثقة |
  ${SAR_REF_2025}
٦ التكاليف الإجمالية + حساسية ±5% ±10% ±15%
٧ سجل المخاطر (احتمال × تأثير → 1–25)
٨ هندسة القيمة | خلاصة تنفيذية 5 نقاط

══ قواعد الدقة ══
• مقياس الرسم غير واضح → [مقياس غير محدد] — لا تفترض
• بُعد غير مقروء → [قراءة جزئية] — لا تخمّن
• تعارض بين صفحات → اذكره صراحة
• سعر خارج النطاق المرجعي → أبلغ فوراً
${ocr?`\n══ OCR النشط ══\nTitle Block | أبعاد | تعليقات أنابيب | مستويات GL,IL,EGL,TW,INV | إحداثيات | اختصارات`:""}`;

const SYS_VISUAL_INFRA = (cfg: string, chunkLabel: string, drawTypes: string[], scale: string | null, projectCtx: string) => {
  const typeStr = drawTypes.length ? drawTypes.join(" + ") : "بنية تحتية عامة";
  const scaleStr = scale ? `المقياس: ${scale}` : "المقياس: غير محدد — اذكر إن وجد";
  return `أنت نظام ALIMTYAZ v9 — محلل مخططات البنية التحتية السعودية (تحليل بصري).
${cfg}
الدُفعة: ${chunkLabel} | أنواع المخططات المتوقعة: ${typeStr} | ${scaleStr}
${projectCtx}

══ بروتوكول التحليل البصري ══
أ) أعلن نوع كل مخطط فوراً: [PLN] [PRF] [XSC] [STR] [MHC] [BOQ] [SPC] [MAR]
ب) حسب النوع — طبّق البروتوكول المناسب
جدول BOQ الكامل بترميز KSA + أسعار SAR من المرجع المرفق.
${SAR_REF_2025}

✅ تحقق: هل المقاسات متسقة؟ | هل الميول منطقية؟ | هل يوجد تعارض بين مقطعين؟`;
};

const SYS_FAST = (cfg: string, info: string, drawTypes: string[], scales: string[], projectCtx: string) => {
  const typeHint = drawTypes.length ? `أنواع محتملة: ${drawTypes.join(" | ")}` : "";
  const scaleHint = scales.length ? `مقاييس مكتشفة: ${scales.join(", ")}` : "";
  return `أنت محرك ALIMTYAZ للاستخراج السريع v3 — متخصص في البنية التحتية السعودية.
${cfg} | ${info}
${typeHint}${scaleHint ? "\n"+scaleHint : ""}
${projectCtx}
تتلقى نصاً خاماً من PDF هندسي/تجاري.

══ خطوات العمل ══
١ حدّد نوع الوثيقة
٢ استخرج المقياس إن وجد
٣ استخرج الكميات مع معادلاتها
٤ جدول أقطار الأنابيب المكتشفة
٥ BOQ جزئي:
  ${SAR_REF_2025}
٦ مناسيب IL/GL المكتشفة
٧ أي تعارض أو معلومة غامضة → اذكرها صراحة`;
};

const SYS_HYBRID = (cfg: string, info: string, drawTypes: string[], projectCtx: string) => `أنت محرك ALIMTYAZ للتحليل المدمج v3 (نص + صورة بصرية).
${cfg} | ${info}
${drawTypes.length ? `أنواع متوقعة: ${drawTypes.join(" | ")}` : ""}
${projectCtx}
الاستراتيجية:
① الصورة: تحديد نوع المخطط + استخراج الأبعاد الرسومية + المقياس
② النص: استخراج الأرقام الدقيقة + الكودات + المناسيب
③ الدمج: BOQ كامل بترميز KSA + التحقق من التطابق
${SAR_REF_2025}`;

const SYS_MERGE = (projectCtx="", drawTypeSummary="") => `أنت محرك ALIMTYAZ للدمج والتوحيد النهائي v3.
لديك نتائج تحليل من دُفعات متعددة لنفس الملف.
${projectCtx}
${drawTypeSummary ? `أنواع المخططات المحللة: ${drawTypeSummary}` : ""}

══ خطوات الدمج (إلزامية) ══
١ BOQ الموحد النهائي — اجمع الكميات المتطابقة، أزل التكرار
  | الكود KSA | الوصف | الوحدة | الكمية | سعر SAR | إجمالي SAR | المصدر | الثقة |
٢ التحقق من الاتساق بين المخططات
٣ التكاليف الكلية + الحساسية ±5% ±10% ±15%
٤ سجل المخاطر الموحد
٥ KPIs المشروع
٦ أهم 5 توصيات نهائية`;

// ── PDF helpers ──
interface ExtractedPage {
  pageNum: number; dims: string; text: string; tableLines: string; annotations: string;
  charCount: number; lineCount: number; tableCount: number; numCount: number; density: number;
  drawingType: string | null; scale: string | null; diameters: number[]; invertLevels: string[];
}

async function extractPageData(doc: any, pageNum: number, maxChars = 3000): Promise<ExtractedPage> {
  const page = await doc.getPage(pageNum);
  const tc = await page.getTextContent();
  const items = tc.items || [];
  const rows: Record<number, {x:number;text:string}[]> = {};
  items.forEach((item: any) => {
    const y = Math.round(item.transform[5] / 5) * 5;
    if (!rows[y]) rows[y] = [];
    rows[y].push({ x: item.transform[4], text: item.str.trim() });
  });
  const lines = Object.entries(rows)
    .sort(([a],[b]) => +b - +a)
    .map(([,cells]) => cells.sort((a,b)=>a.x-b.x).map(c=>c.text).filter(Boolean).join("  "))
    .filter(Boolean);
  const tableLines = lines.filter(l => { const p = l.split(/\s{2,}/); return p.length >= 3 && p.some(x=>/\d/.test(x)); });
  const numLines = lines.filter(l => /\d+[.,]\d+/.test(l) || /SAR|ريال|م²|م³|لم|طم|كم/.test(l));
  let annotations: string[] = [];
  try { const anns = await page.getAnnotations(); annotations = anns.filter((a:any)=>a.contents||a.subtype==="Text").map((a:any)=>a.contents||"").filter(Boolean); } catch {}
  const vp = page.getViewport({ scale: 1 });
  const raw = lines.join("\n");
  const fullText = raw + (annotations.length ? "\n"+annotations.join(" ") : "");
  const text = raw.length > maxChars ? raw.slice(0, maxChars) + `\n[... +${raw.length-maxChars} حرف محذوف]` : raw;
  page.cleanup?.();
  const drawingType = detectDrawingType(fullText);
  const scale = detectScale(fullText);
  const diameters = extractPipeDiameters(fullText);
  const invertLevels = extractInvertLevels(fullText);
  const infraScore = (diameters.length > 0 ? 1 : 0) + (invertLevels.length > 2 ? 1 : 0) + (scale ? 1 : 0);
  const rawDensity = Math.min(3, Math.floor((tableLines.length * 2 + numLines.length) / 5));
  const density = Math.min(3, rawDensity + (infraScore > 1 ? 1 : 0));
  return { pageNum, dims: `${Math.round(vp.width)}×${Math.round(vp.height)}pt`, text, tableLines: tableLines.join("\n"), annotations: annotations.join(" | "), charCount: raw.length, lineCount: lines.length, tableCount: tableLines.length, numCount: numLines.length, density, drawingType, scale, diameters, invertLevels };
}

async function renderThumb(doc: any, p: number): Promise<string> {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 0.14 });
  const cv = document.createElement("canvas");
  cv.width = vp.width; cv.height = vp.height;
  await page.render({ canvasContext: cv.getContext("2d")!, viewport: vp }).promise;
  const url = cv.toDataURL("image/jpeg", 0.55);
  cv.width = 0; cv.height = 0;
  return url;
}

async function renderPreview(doc: any, p: number, scale = 1.2): Promise<string> {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale });
  const cv = document.createElement("canvas");
  cv.width = vp.width; cv.height = vp.height;
  await page.render({ canvasContext: cv.getContext("2d")!, viewport: vp }).promise;
  const url = cv.toDataURL("image/jpeg", 0.88);
  cv.width = 0; cv.height = 0;
  return url;
}

async function renderPageImg(doc: any, p: number, scale=1.5, q=0.85): Promise<string> {
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
async function apiCall(body: any, maxRetries = 3): Promise<any> {
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

function parseRange(str: string, max: number): number[] {
  const s = new Set<number>();
  str.split(",").forEach(seg => {
    const m = seg.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return;
    const a = +m[1], b = m[2] ? +m[2] : a;
    for (let i=Math.min(a,b); i<=Math.min(Math.max(a,b),max); i++) s.add(i);
  });
  return [...s].sort((a,b)=>a-b);
}

const fmtT = (s: number) => s<60?`${s}ث`:s<3600?`${Math.round(s/60)}د`:`${(s/3600).toFixed(1)}س`;
const fmtN = (n: number) => n>=1e6?(n/1e6).toFixed(1)+"م":n>=1e3?(n/1e3).toFixed(0)+"ك":String(n);
const tokCost = (t: number) => t > 0 ? `~${(t * 0.000003).toFixed(4)}$` : "";

const DWG_V: Record<string,string> = {"AC1006":"R10","AC1009":"R12","AC1012":"R13","AC1014":"R14","AC1015":"2000","AC1018":"2004","AC1021":"2007","AC1024":"2010","AC1027":"2013","AC1032":"2018","AC1037":"2023"};
async function parseDWG(file: File): Promise<any> {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const b = new Uint8Array(e.target!.result as ArrayBuffer);
        const v = String.fromCharCode(...b.slice(0,6));
        res({ ok:true, version:DWG_V[v]||`Unknown(${v})`, verCode:v, fileSizeKB:Math.round((e.target!.result as ArrayBuffer).byteLength/1024), name:file.name });
      } catch(err: any) { res({ ok:false, error:err.message, name:file.name }); }
    };
    r.readAsArrayBuffer(file);
  });
}

// ── Export helpers ──
function extractAllTables(msgs: any[]) { return msgs.filter(m=>m.role==="assistant").map(m=>typeof m.content==="string"?m.content:"").join("\n"); }
function exportCSV(msgs: any[], fnameStr="BOQ_ALIMTYAZ_v9") {
  const text = extractAllTables(msgs);
  const rows = text.split("\n").filter(l=>l.includes("|")&&!l.match(/^[\|\-\s:]+$/));
  const csv = rows.map(r=>r.split("|").map(c=>`"${c.trim()}"`).filter((_,i,a)=>i>0&&i<a.length-1).join(",")).join("\n");
  dl(new Blob(["\uFEFF"+csv],{type:"text/csv"}), fnameStr+".csv");
}
function exportMD(msgs: any[], cfgLabel: string) {
  const text = `# تقرير ALIMTYAZ v9\n**الإعداد:** ${cfgLabel}\n**التاريخ:** ${new Date().toLocaleString("ar-SA")}\n\n---\n\n` +
    msgs.filter(m=>m.role==="assistant").map(m=>`## ${m.chunkLabel||"تحليل"}\n\n${m.content}`).join("\n\n---\n\n");
  dl(new Blob([text],{type:"text/markdown"}), "Report_ALIMTYAZ_v9.md");
}
function exportJSON(msgs: any[], feState: any, cfgLabel: string) {
  const data = {
    system:"ALIMTYAZ v9", config:cfgLabel, exported:new Date().toISOString(),
    summary:{ totalMessages:msgs.length, totalTokens:msgs.reduce((s: number,m: any)=>s+(m.tokens||0),0) },
    messages: msgs.filter(m=>m.role==="assistant").map(m=>({ label:m.chunkLabel||"chat", content:m.content, tokens:m.tokens||0, isMerged:!!m.isMerged })),
  };
  dl(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}), "BOQ_ALIMTYAZ_v9.json");
}
function exportTXT(feState: any) {
  if (!feState?.extractedData) return;
  const lines = Object.entries(feState.extractedData).sort(([a],[b])=>+a-+b).map(([p,d]: [string,any])=>`${"=".repeat(50)}\nصفحة ${p} | ${d.dims} | ${d.lineCount} سطر\n${"=".repeat(50)}\n${d.text}\n`).join("\n");
  dl(new Blob([lines],{type:"text/plain;charset=utf-8"}), "ExtractedText_ALIMTYAZ_v9.txt");
}
function dl(blob: Blob, name: string) { Object.assign(document.createElement("a"),{href:URL.createObjectURL(blob),download:name}).click(); }

// ── Markdown renderer ──
function md(text: string): string {
  if (!text) return "";
  let h = text;
  h = h.replace(/(\|.+\|\n?)+/g, tb => {
    const rows=tb.trim().split("\n").filter(r=>r.trim());
    if(rows.length<2) return tb;
    const isSep=(r: string)=>/^\|[\s\-:|]+\|/.test(r);
    let th="",td="",done=false;
    rows.forEach(row=>{
      if(isSep(row)){done=true;return;}
      const cells=row.split("|").map(c=>c.trim()).filter((_,i,a)=>i>0&&i<a.length-1);
      const tag=done?"td":"th";
      const tr=`<tr>${cells.map(c=>`<${tag}>${c}</${tag}>`).join("")}</tr>`;
      done?td+=tr:th+=tr;
    });
    return `<div class="tw"><table><thead>${th}</thead><tbody>${td}</tbody></table></div>`;
  });
  h=h.replace(/^### (.+)$/gm,'<h3 class="h3">$1</h3>');
  h=h.replace(/^## (.+)$/gm,'<h2 class="h2">$1</h2>');
  h=h.replace(/^# (.+)$/gm,'<h1 class="h1">$1</h1>');
  h=h.replace(/\*\*(.*?)\*\*/g,'<strong class="b">$1</strong>');
  h=h.replace(/✅/g,'<span class="bk ok">✅ عالي</span>');
  h=h.replace(/⚠️/g,'<span class="bk wn">⚠️ متوسط</span>');
  h=h.replace(/🔍/g,'<span class="bk ck">🔍 تأكيد</span>');
  h=h.replace(/🟢/g,'<span class="bk lo">🟢 منخفض</span>');
  h=h.replace(/🟡/g,'<span class="bk me">🟡 متوسط</span>');
  h=h.replace(/🔴/g,'<span class="bk hi">🔴 عالي</span>');
  h=h.replace(/⛔/g,'<span class="bk cr">⛔ حرج</span>');
  h=h.replace(/`([^`]+)`/g,'<code class="code">$1</code>');
  h=h.replace(/\[مستنتج\]/g,'<span class="bk inf">[مستنتج]</span>');
  h=h.replace(/\[قراءة جزئية\]/g,'<span class="bk prt">[جزئي]</span>');
  h=h.replace(/^[-•]\s(.+)$/gm,'<div class="li">• $1</div>');
  h=h.replace(/\n\n/g,'</p><p class="p">');
  return `<p class="p">${h}</p>`;
}

// ── Static data ──
const CFG_O: Record<string, string[]> = {
  authority:   ["بلدية / أمانة","وزارة النقل MOT","NWC شركة المياه","الهيئة الملكية","مطور خاص","حكومي مختلط"],
  projectType: ["بنية تحتية متكاملة","طرق وأكتاف","مرافق (ماء/صرف)","إنشائي صناعي","تطوير ميغا"],
  roleMode:    ["مقاول رئيسي","استشاري / مراجعة","مالك مشروع","مراجعة تكاليف"],
  zoneStr:     ["ZA/ZB/ZC","ZA فقط","ZB فقط","ZC فقط","Custom"],
};
const MODS_O: Record<string, string[]> = {
  "🔧 هندسية":    ["استخراج الكميات","تحسين الترابية","تنسيق التخصصات","مراجعة التعارضات","الامتثال السعودي"],
  "💼 تجارية":   ["توليد BOQ","تقدير SAR","تحليل الربحية","حساسية ±5%±10%","مخاطر التصعيد","أوامر التغيير"],
  "💰 مالية":    ["التدفق النقدي","متطلبات التمويل","نقطة التعادل","لوحة الهامش"],
  "⚠️ مخاطر":   ["محرك المخاطر","حفر عميق","أقطار كبيرة","سماكة الأسفلت","منسوب المياه"],
  "📊 استراتيجية":["سير المناقصات","جاهزية الحكومة","KPI","CBS/WBS"],
};
const TMPL = [
  {i:"📐",l:"تحليل شامل",       p:"حلّل هذا المخطط الهندسي شاملاً: الكميات، التكاليف، المخاطر، الامتثال (MOT/NWC/SBC). BOQ كامل بترميز KSA + جدول حساسية ±5% ±10%."},
  {i:"📋",l:"BOQ كامل",          p:"استخرج BOQ الكامل منطقة بمنطقة: كود KSA، وصف تفصيلي، معادلة صريحة، كمية، وحدة، سعر SAR، إجمالي، درجة ثقة."},
  {i:"💰",l:"تقدير SAR",         p:"قدّر التكاليف SAR: مباشرة، مصاريف عامة 12%، أرباح 8%، احتياطي مخاطر 5%. جدول حساسية +5% +10% -5% -10% -15%."},
  {i:"⚠️",l:"تحليل المخاطر",    p:"مصفوفة مخاطر: حفر عميق، أقطار كبيرة، منسوب مياه، سماكة أسفلت. احتمال × تأثير × الدرجة (1–25) × التكلفة SAR × الإجراء."},
  {i:"💡",l:"هندسة القيمة",     p:"فرص هندسة القيمة: لكل مقترح: الوصف، التوفير SAR، النسبة، التأثير على الجودة، التوصية."},
  {i:"🔍",l:"مراجعة الامتثال",  p:"مراجعة شاملة MOT/NWC/SBC/MOMRA: كل بند مع رقم المعيار، الحالة ✓/✗، التصحيح المطلوب."},
  {i:"📉",l:"قطاع طولي",         p:"حلّل القطاع الطولي: منسوب GL و IL لكل غرفة | ميل الأنبوب (‰) | طول كل وصلة | أعماق الحفر (GL–IL)."},
  {i:"✂️",l:"قطاع عرضي",         p:"حلّل القطاع العرضي: عرض الطريق/الخندق | طبقات الرصف | الميل العرضي | متطلبات MOT."},
  {i:"🏗️",l:"كميات الحفر",      p:"جدول كميات الحفر والردم المفصّل: حفر خنادق، حفر عام، ردم داخلي، ردم رملي، تخلص بعيد — بالم³."},
  {i:"📊",l:"ملخص تنفيذي",      p:"ملخص تنفيذي 5 نقاط: حجم العمل، التكلفة الإجمالية SAR، المخاطر الرئيسية، فرص التوفير، توصيات."},
  {i:"🔤",l:"OCR نصوص",         p:"استخرج منظماً: Title Block | الأبعاد | أقطار الأنابيب | مستويات GL,IL,EGL,TW,INV | الإحداثيات."},
  {i:"🌊",l:"تصريف بحري",        p:"حلّل منظومة التصريف البحري: خط الـ outfall | موزعات الـ diffuser | BOQ مفصّل."},
  {i:"🔩",l:"جدول غرف MH",       p:"استخرج جدول الغرف الكامل: رقم الغرفة | Inv In/Out | منسوب GL | قطر الغرفة | BOQ تجميعي."},
];
const FT: Record<string,{c:string;i:string}> = {image:{c:"#2563eb",i:"🖼️"},pdf:{c:"#dc2626",i:"📄"},dwg:{c:"#16a34a",i:"📐"}};
const QP: Record<string,{scale:number;quality:number;label:string;desc:string;tokEst:number;parallel:number}> = {
  fast:    {scale:0,   quality:0,    label:"⚡ نصي سريع",    desc:"100× أسرع، نصوص وجداول",   tokEst:200,  parallel:3},
  hybrid:  {scale:0.5, quality:0.65, label:"🔀 مدمج",        desc:"نص + صورة مصغرة",           tokEst:500,  parallel:2},
  draft:   {scale:0.9, quality:0.70, label:"🖼️ بصري سريع",  desc:"مخططات عامة",              tokEst:700,  parallel:1},
  standard:{scale:1.5, quality:0.85, label:"📊 بصري قياسي",  desc:"جودة متوازنة",              tokEst:1300, parallel:1},
  infra:   {scale:2.2, quality:0.90, label:"🏗️ بنية تحتية",  desc:"مُحسَّن لـ plan+profile+section",tokEst:1800,parallel:1},
  high:    {scale:2.8, quality:0.94, label:"🔬 بصري عالي",   desc:"أعلى دقة",tokEst:2400, parallel:1},
};
const densityColor = (d: number) => d>=3?"#16a34a":d>=2?"#ca8a04":d>=1?"#2563eb":"#9ca3af";
const densityLabel = (d: number) => d>=3?"🔥 غني":d>=2?"📊 متوسط":d>=1?"📄 خفيف":"⬜ فارغ";

// ═══════════════════════════════════════════════════════════════════════════
//  SMART PERFORMANCE & ACCURACY SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════
interface Suggestion {
  id: string;
  icon: string;
  type: "performance" | "accuracy";
  text: string;
  actionLabel: string;
  action: () => void;
  priority: number; // 1=high, 2=medium, 3=low
}

function SmartSuggestions({suggestions, T, D, context}: {suggestions: Suggestion[]; T: any; D: boolean; context: "config"|"analysis"}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = suggestions.filter(s => !dismissed.has(s.id)).sort((a,b) => a.priority - b.priority).slice(0, 5);
  if (!visible.length) return null;

  const perfSugs = visible.filter(s => s.type === "performance");
  const accSugs = visible.filter(s => s.type === "accuracy");

  const renderGroup = (title: string, icon: string, color: string, borderColor: string, bgGrad: string, items: Suggestion[]) => {
    if (!items.length) return null;
    return (
      <div style={{
        background: bgGrad,
        border: `1px solid ${borderColor}`,
        borderRadius: 11,
        padding: "10px 14px",
        marginBottom: 8,
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:10,color,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
            <span>{icon}</span> {title}
          </div>
          <span style={{fontSize:8,color:T.t3,background:D?"#ffffff10":"#00000008",padding:"1px 7px",borderRadius:8}}>{items.length} اقتراح</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {items.map(s => (
            <div key={s.id} style={{
              display:"flex",alignItems:"center",gap:8,
              background:D?"#ffffff06":"#ffffff80",
              border:`1px solid ${D?"#ffffff10":"#00000010"}`,
              borderRadius:9,padding:"7px 10px",
              transition:"all .15s",
            }}>
              <span style={{fontSize:16,flexShrink:0}}>{s.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,color:T.t1,lineHeight:1.6}}>{s.text}</div>
              </div>
              <button
                onClick={s.action}
                style={{
                  background:`linear-gradient(135deg,${color}20,${color}10)`,
                  border:`1px solid ${color}40`,
                  color,padding:"4px 10px",borderRadius:7,
                  cursor:"pointer",fontSize:9,fontWeight:700,
                  fontFamily:"inherit",whiteSpace:"nowrap",
                  transition:"all .15s",
                }}
                onMouseOver={e=>(e.currentTarget.style.background=`${color}25`)}
                onMouseOut={e=>(e.currentTarget.style.background=`linear-gradient(135deg,${color}20,${color}10)`)}
              >
                {s.actionLabel}
              </button>
              <button
                onClick={()=>setDismissed(prev=>{const n=new Set(prev);n.add(s.id);return n;})}
                style={{background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:10,padding:"2px",opacity:0.5}}
                title="إخفاء"
              >✕</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderGroup(
        "اقتراحات تحسين الأداء", "⚡", D?"#f59e0b":"#b45309",
        D?"#854d0e40":"#fde68a", D?"linear-gradient(135deg,#1a140a,#201808)":"linear-gradient(135deg,#fffbeb,#fef3c7)",
        perfSugs
      )}
      {renderGroup(
        "اقتراحات رفع الدقة", "🎯", D?"#34d399":"#15803d",
        D?"#065f4640":"#bbf7d0", D?"linear-gradient(135deg,#0a1f14,#0d2810)":"linear-gradient(135deg,#f0fdf4,#dcfce7)",
        accSugs
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PDF NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════════
function PdfNav({sess, T, selPages, setPdfSess, loadThumbs, openPreview}: any) {
  const[scroll,setScroll]=useState(0);
  const TH=88,VIS=20;
  const sp=selPages(sess);
  const spSet=new Set(sp);
  const viewStart=Math.floor(scroll/TH);
  const viewEnd=Math.min(viewStart+VIS,sess.numPages);
  const visPgs=Array.from({length:viewEnd-viewStart},(_,i)=>viewStart+i+1);
  useEffect(()=>{
    const miss=visPgs.filter((p: number)=>!sess.thumbsLoaded.has(p));
    if(miss.length)loadThumbs(sess.doc,miss);
  },[scroll]);
  const toggle=(p: number)=>setPdfSess((prev: any)=>{
    const cur=new Set(prev.selPages);cur.has(p)?cur.delete(p):cur.add(p);
    return{...prev,selPages:[...cur].sort((a: number,b: number)=>a-b),mode:"custom"};
  });
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"4px 7px",borderBottom:`1px solid ${T.bd}`,display:"flex",gap:5,flexShrink:0}}>
        <span style={{fontSize:9,color:T.gold,fontWeight:700}}>{fmtN(sess.numPages)}ص</span>
        <span style={{fontSize:9,color:T.t3}}>✓{sp.length}</span>
        <span style={{fontSize:9,color:T.grn}}>÷{Math.ceil(sp.length/(sess.chunkSize||20))}</span>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"3px"}}
        onScroll={(e: any)=>{
          const sc=e.target.scrollTop;setScroll(sc);
          const ns=Math.floor(sc/TH);
          const ahead=Array.from({length:40},(_,i)=>ns+i+1).filter(p=>p>=1&&p<=sess.numPages&&!sess.thumbsLoaded.has(p));
          if(ahead.length)loadThumbs(sess.doc,ahead);
        }}>
        <div style={{height:sess.numPages*TH,position:"relative"}}>
          {visPgs.map((p: number)=>{
            const dens=sess.densities?.[p]??-1;
            const dc=dens>=0?densityColor(dens):T.bd;
            return(
              <div key={p} style={{position:"absolute",top:(p-1)*TH,left:0,right:0,padding:"2px"}}>
                <div style={{borderRadius:7,border:`2px solid ${spSet.has(p)?T.gold:dc}`,overflow:"hidden",
                  background:T.bg2,cursor:"pointer",transition:"border .15s",display:"flex",gap:4,alignItems:"center",padding:"3px 4px",boxShadow:spSet.has(p)?`0 0 6px ${T.gold}30`:"none"}} onClick={()=>toggle(p)}>
                  {sess.thumbs[p]
                    ?<img src={sess.thumbs[p]} style={{width:42,height:56,objectFit:"contain",borderRadius:3,flexShrink:0}} onDoubleClick={(e: any)=>{e.stopPropagation();openPreview(p);}}/>
                    :<div style={{width:42,height:56,background:T.bg3,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:T.t3}}>⏳</div>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:9,color:spSet.has(p)?T.gold:T.t2,fontWeight:700}}>ص{p}</div>
                    {dens>=0&&<div style={{fontSize:7,color:dc}}>{densityLabel(dens)}</div>}
                    {spSet.has(p)&&<div style={{fontSize:7,color:T.gold,fontWeight:700}}>✓</div>}
                    <div onClick={(e: any)=>{e.stopPropagation();openPreview(p);}} style={{fontSize:8,cursor:"pointer",marginTop:1,opacity:.6}} title="معاينة">🔍</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT — ALIMTYAZ v9
// ═══════════════════════════════════════════════════════════════════════════
const DrawingAnalysisPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();

  const [tab, setTab] = useState("config");
  const [cfg, setCfg] = useState<Record<string,number>>({authority:0,projectType:0,roleMode:0,zoneStr:0});
  const [mods, setMods] = useState<Record<string,boolean>>({});
  const [depth, setDepth] = useState("standard");
  const [ocr, setOcr] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [pdfSess, setPdfSess] = useState<any>(null);
  const [feState, setFe] = useState<any>(null);
  const [proc, setProc] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lmsg, setLmsg] = useState("");
  const [drag, setDrag] = useState(false);
  const [xStats, setXStats] = useState<any>(null);
  const [infraMeta, setInfraMeta] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [searchOn, setSearchOn] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [resumable, setResumable] = useState<any>(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const totalTokens = useMemo(()=>msgs.reduce((s: number,m: any)=>s+(m.tokens||0),0),[msgs]);
  const boqCount = useMemo(()=>(msgs.filter((m: any)=>m.role==="assistant").map((m: any)=>m.content||"").join("\n").match(/KSA-[A-Z]{2,6}-/g)||[]).length,[msgs]);

  // Smart suggestions logic
  const configSuggestions = useMemo<Suggestion[]>(()=>{
    const s: Suggestion[] = [];
    // Performance suggestions
    if(pdfSess && pdfSess.chunkSize > 25 && xStats && xStats.avgDensity >= 2){
      s.push({id:"chunk-high-density",icon:"📦",type:"performance",text:"حجم الدُفعة كبير مع صفحات غنية المحتوى — قلّل حجم الدُفعة لتحسين دقة الاستخراج.",actionLabel:"تعيين 15 صفحة",action:()=>setPdfSess((p:any)=>({...p,chunkSize:15})),priority:1});
    }
    if(pdfSess && pdfSess.quality==="high" && pdfSess.numPages > 50){
      s.push({id:"high-quality-large",icon:"🐢",type:"performance",text:`الوضع البصري العالي مع ${pdfSess.numPages} صفحة سيستغرق وقتاً طويلاً — جرّب المدمج أو البنية التحتية.`,actionLabel:"تبديل للمدمج",action:()=>setPdfSess((p:any)=>({...p,quality:"hybrid"})),priority:1});
    }
    if(pdfSess && pdfSess.quality==="fast" && xStats && xStats.rich > 3){
      s.push({id:"fast-visual-miss",icon:"🖼️",type:"performance",text:"الوضع النصي السريع قد يفقد تفاصيل بصرية من الصفحات الغنية — جرّب الوضع المدمج.",actionLabel:"تبديل للمدمج",action:()=>setPdfSess((p:any)=>({...p,quality:"hybrid"})),priority:2});
    }
    if(xStats && xStats.empty > xStats.total * 0.3 && pdfSess){
      s.push({id:"many-empty",icon:"⬜",type:"performance",text:`${xStats.empty} صفحة فارغة من أصل ${xStats.total} — استبعدها لتوفير الوقت والتكلفة.`,actionLabel:"تصفية تلقائية",action:()=>{
        const densMap = pdfSess.densities || {};
        const nonEmpty = Object.entries(densMap).filter(([,d]:any)=>d>0).map(([p]:any)=>+p).sort((a:number,b:number)=>a-b);
        if(nonEmpty.length) setPdfSess((p:any)=>({...p,selPages:nonEmpty,mode:"custom"}));
      },priority:2});
    }

    // Accuracy suggestions
    if(depth === "quick"){
      s.push({id:"depth-low",icon:"📉",type:"accuracy",text:"التحليل السريع بدقة ~70% — ارفع العمق للحصول على BOQ أدق وتحقق مزدوج.",actionLabel:"رفع للقياسي",action:()=>{setDepth("standard");save(cfg,mods,"standard");},priority:1});
    }
    if(!ocr && xStats && (xStats.rich > 2 || (xStats.diameters?.length||0) > 3)){
      s.push({id:"ocr-off-visual",icon:"🔤",type:"accuracy",text:"مخططات غنية بالتفاصيل البصرية — فعّل OCR لاستخراج الأبعاد والنصوص بدقة أعلى.",actionLabel:"تفعيل OCR",action:()=>setOcr(true),priority:1});
    }
    const activeMods = Object.entries(mods).filter(([,v])=>v).length;
    if(activeMods === 0){
      s.push({id:"no-mods",icon:"🔧",type:"accuracy",text:"لا توجد وحدات تحليلية مختارة — فعّل الوحدات المناسبة للحصول على تحليل متخصص.",actionLabel:"تفعيل الكل",action:()=>{
        const allMods: Record<string,boolean> = {};
        Object.entries(MODS_O).forEach(([cat,ms])=>ms.forEach(m=>{allMods[`${cat}_${m}`]=true;}));
        setMods(allMods); save(cfg,allMods,depth);
      },priority:2});
    }
    if(xStats && (xStats.diameters?.length||0) > 0 && !mods["⚠️ مخاطر_أقطار كبيرة"] && !mods["🔧 هندسية_مراجعة التعارضات"]){
      s.push({id:"pipe-no-conflict",icon:"🔩",type:"accuracy",text:`تم اكتشاف ${xStats.diameters?.length} قطر أنبوب — فعّل وحدة "مراجعة التعارضات" لتحليل شبكات المواسير.`,actionLabel:"تفعيل",action:()=>{
        setMods(prev=>({...prev,"🔧 هندسية_مراجعة التعارضات":true,"⚠️ مخاطر_أقطار كبيرة":true}));
      },priority:2});
    }
    return s;
  },[pdfSess,xStats,depth,ocr,mods,cfg]);

  const analysisSuggestions = useMemo<Suggestion[]>(()=>{
    const s: Suggestion[] = [];
    // Check for error chunks
    const errorChunks = feState?.chunks?.filter((c:any)=>c.status==="error") || [];
    if(errorChunks.length > 0){
      s.push({id:"error-chunks",icon:"🔄",type:"accuracy",text:`${errorChunks.length} دُفعة فشلت — أعد التحليل للحصول على نتائج كاملة.`,actionLabel:"إعادة التحليل",action:()=>{if(pdfSess)runExtraction();},priority:1});
    }
    // Check for unmerged results
    const assistantMsgs = msgs.filter((m:any)=>m.role==="assistant"&&m.isChunk);
    const hasMerged = msgs.some((m:any)=>m.isMerged);
    if(assistantMsgs.length > 1 && !hasMerged && feState?.phase==="done"){
      s.push({id:"no-merge",icon:"🔗",type:"accuracy",text:`${assistantMsgs.length} دُفعة بدون دمج — ادمج النتائج للحصول على BOQ موحد.`,actionLabel:"إعادة الدمج",action:()=>{if(pdfSess)runExtraction();},priority:1});
    }
    // Suggest OCR if not enabled and in analysis
    if(!ocr && pdfSess && feState?.phase==="done"){
      s.push({id:"suggest-ocr-analysis",icon:"🔤",type:"accuracy",text:"فعّل OCR وأعد التحليل لاستخراج الأبعاد والمناسيب من المخططات البصرية.",actionLabel:"تفعيل OCR",action:()=>setOcr(true),priority:3});
    }
    // Suggest deeper analysis
    if(depth==="quick" && feState?.phase==="done" && msgs.length > 0){
      s.push({id:"upgrade-depth",icon:"🔬",type:"accuracy",text:"حلّلت بعمق سريع — أعد التحليل بالعمق القياسي أو العميق لنتائج أدق.",actionLabel:"رفع العمق",action:()=>{setDepth("standard");save(cfg,mods,"standard");},priority:2});
    }
    // No pages selected warning
    if(pdfSess && selPages(pdfSess).length === 0){
      s.push({id:"no-pages",icon:"📌",type:"performance",text:"لم يتم اختيار صفحات للتحليل — اذهب لمدير PDF واختر الصفحات.",actionLabel:"فتح مدير PDF",action:()=>setTab("pdf"),priority:1});
    }
    return s;
  },[feState,msgs,ocr,depth,pdfSess,cfg,mods]);

  const cancelRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  let fname = "BOQ";

  // Persistence via localStorage
  useEffect(()=>{
    try {
      const r=localStorage.getItem("alimtyaz_v9");
      if(r){const s=JSON.parse(r);if(s.cfg)setCfg(s.cfg);if(s.mods)setMods(s.mods);if(s.depth)setDepth(s.depth);}
      const rr=localStorage.getItem("alimtyaz_v9_batch");
      if(rr){const b=JSON.parse(rr);if(b.partialResults?.length>0)setResumable(b);}
    }catch{}
  },[]);
  const save = (c: any,m: any,d: string)=>{try{localStorage.setItem("alimtyaz_v9",JSON.stringify({cfg:c,mods:m,depth:d}));}catch{}};
  const saveBatch=(b: any)=>{try{localStorage.setItem("alimtyaz_v9_batch",JSON.stringify(b));}catch{}};
  const clearBatch=()=>{try{localStorage.removeItem("alimtyaz_v9_batch");}catch{}};

  const cfgStr=useCallback(()=>{
    const ml=Object.entries(mods).filter(([,v])=>v).map(([k])=>k.split("_").slice(1).join(" "));
    return `الجهة:${CFG_O.authority[cfg.authority]}|النوع:${CFG_O.projectType[cfg.projectType]}|الدور:${CFG_O.roleMode[cfg.roleMode]}|المناطق:${CFG_O.zoneStr[cfg.zoneStr]}|الوحدات:${ml.join(",")|| "الكل"}`;
  },[cfg,mods]);

  const loadThumbs=useCallback(async(doc: any,pages: number[])=>{
    for(const p of pages){
      if(cancelRef.current)break;
      try{
        const url=await renderThumb(doc,p);
        setPdfSess((prev: any)=>{
          if(!prev)return prev;
          return{...prev,thumbs:{...prev.thumbs,[p]:url},thumbsLoaded:new Set([...prev.thumbsLoaded,p])};
        });
      }catch{}
      await new Promise(r=>setTimeout(r,0));
    }
  },[]);

  const handleFiles=useCallback(async(files: FileList | null)=>{
    for(const file of Array.from(files||[])){
      const n=file.name.toLowerCase();
      if(file.type.startsWith("image/")||n.endsWith(".webp")||n.endsWith(".avif")){
        const reader=new FileReader();
        reader.onload=e=>{setQueue(prev=>[...prev,{src:e.target!.result,b64:(e.target!.result as string).split(",")[1],mime:file.type||"image/jpeg",name:file.name,type:"image"}]);};
        reader.readAsDataURL(file);
        setTab("analysis");
      }else if(file.type==="application/pdf"||n.endsWith(".pdf")){
        setProc({stage:"⏳ فتح الملف...",pct:5});
        try{
          const buf = await file.arrayBuffer();
          const doc = await pdfjsLib.getDocument({ data: buf }).promise;
          const numPages = doc.numPages;
          setProc(null);
          fname=file.name.replace(/\.pdf$/i,"");
          setPdfSess({file,doc,numPages,thumbs:{} as Record<number,string>,thumbsLoaded:new Set<number>(),mode:"range",
            rangeStr:`1-${Math.min(numPages,100)}`,selPages:[] as number[],chunkSize:20,quality:"fast",densities:{} as Record<number,number>});
          setTab("pdf");
          loadThumbs(doc,Array.from({length:Math.min(60,numPages)},(_,i)=>i+1));
        }catch(err: any){setProc(null);pushMsg("assistant",`❌ خطأ في فتح PDF: ${err.message}`);}
      }else if(n.endsWith(".dwg")||n.endsWith(".dxf")){
        const meta=await parseDWG(file);
        const cv=document.createElement("canvas");cv.width=520;cv.height=200;
        const ctx=cv.getContext("2d")!;
        ctx.fillStyle="#f0fdf4";ctx.fillRect(0,0,520,200);
        ctx.strokeStyle="#16a34a";ctx.lineWidth=2;ctx.strokeRect(8,8,504,184);
        ctx.font="bold 22px sans-serif";ctx.textAlign="center";ctx.fillStyle="#15803d";ctx.fillText("📐 AutoCAD DWG / DXF",260,46);
        ctx.font="12px monospace";ctx.textAlign="right";
        [["الملف:",meta.name],["الإصدار:",`${meta.version} (${meta.verCode})`],["الحجم:",`${meta.fileSizeKB} KB`],["الحالة:",meta.ok?"✅ تم":"⚠️ "+meta.error]].forEach(([k,v]: string[],i: number)=>{
          ctx.fillStyle="#166534";ctx.fillText(k,175,90+i*28);
          ctx.fillStyle="#14532d";ctx.fillText(v,505,90+i*28);
        });
        const du=cv.toDataURL("image/jpeg",0.9);cv.width=0;cv.height=0;
        setQueue(prev=>[...prev,{src:du,b64:du.split(",")[1],mime:"image/jpeg",name:file.name,type:"dwg",dwgMeta:meta}]);
        pushMsg("assistant",`## 📐 ملف AutoCAD\n|البيان|القيمة|\n|---|---|\n|الملف|${meta.name}|\n|الإصدار|${meta.version} (${meta.verCode})|\n|الحجم|${meta.fileSizeKB} KB|\n|الحالة|${meta.ok?"✅ تم القراءة":"⚠️ "+meta.error}|\n\n**ملاحظة:** صدّر PDF أو PNG من AutoCAD للحصول على التحليل البصري الكامل.`);
        setTab("analysis");
      }
    }
  },[loadThumbs]);

  const pushMsg=(role: string,content: string,extra={})=>setMsgs(prev=>[...prev,{role,content,...extra}]);

  const selPages=useCallback((sess: any)=>{
    if(!sess)return [];
    if(sess.mode==="all")return Array.from({length:sess.numPages},(_,i)=>i+1);
    if(sess.mode==="custom")return sess.selPages;
    return parseRange(sess.rangeStr,sess.numPages);
  },[]);

  const suggestChunkSize = useCallback((densities: Record<number,number>, pages: number[]) => {
    if(!pages.length)return 20;
    const avg = pages.reduce((s,p)=>s+(densities[p]||0),0)/pages.length;
    if(avg>=2.5)return 10;
    if(avg>=1.5)return 15;
    if(avg>=0.5)return 25;
    return 30;
  },[]);

  // ═══ ANALYSIS ENGINE v9 ═══
  const runExtraction=useCallback(async(resumeFrom: any=null)=>{
    if(!pdfSess)return;
    const pages=selPages(pdfSess);
    if(!pages.length)return;
    const{doc,chunkSize,quality,file}=pdfSess;
    const isFast=quality==="fast"||quality==="hybrid";
    const isHybrid=quality==="hybrid";
    const isVisual=!isFast;
    const preset=QP[quality]||QP.standard;
    const parallelCount=preset.parallel||1;
    cancelRef.current=false;
    const t0=Date.now();

    const chunks: number[][] =[];
    for(let i=0;i<pages.length;i+=chunkSize)chunks.push(pages.slice(i,i+chunkSize));

    setFe({phase:"extracting",total:pages.length,extracted:0,analyzed:0,
      chunks:[],results:[],merged:null,stage:"🚀 بدء...",eta:null,startTime:t0,extractedData:{},speed:0});
    setTab("analysis");

    const cs=cfgStr();
    const allResults: any[]=resumeFrom||[];
    let extractedData: Record<number,ExtractedPage>={};

    // PHASE 1: TEXT EXTRACTION
    if(isFast||quality==="infra"||isVisual){
      setFe((p: any)=>({...p,stage:`⚡ استخراج ومصنّفة ${fmtN(pages.length)} صفحة...`}));
      let extracted=0;
      const XBATCH=40;
      const maxCharsPerPage = Math.min(3000, Math.round(15000/chunkSize));
      for(let xi=0;xi<pages.length;xi+=XBATCH){
        if(cancelRef.current)break;
        const batch=pages.slice(xi,xi+XBATCH);
        const res=await Promise.all(batch.map(p=>extractPageData(doc,p,maxCharsPerPage).catch(()=>({pageNum:p,text:"",tableLines:"",annotations:"",charCount:0,lineCount:0,tableCount:0,numCount:0,density:0,drawingType:null,scale:null,diameters:[],invertLevels:[]} as ExtractedPage))));
        res.forEach(r=>{extractedData[r.pageNum]=r;});
        extracted+=batch.length;
        const elapsed=(Date.now()-t0)/1000;
        const spd=Math.round(extracted/Math.max(elapsed,0.1));
        const eta=extracted>0?Math.round((elapsed/extracted)*(pages.length-extracted)):null;
        setFe((p: any)=>({...p,extracted,eta,speed:spd,stage:`⚡ استخراج+تصنيف: ${extracted}/${pages.length} (${Math.round(extracted/pages.length*100)}%) — ${spd}ص/ث`,extractedData:{...p.extractedData,...extractedData}}));
        await new Promise(r=>setTimeout(r,0));
      }

      const densMap: Record<number,number>={};
      const allDiams=new Set<number>();
      const allScales=new Set<string>();
      const typeCount: Record<string,number>={};
      Object.entries(extractedData).forEach(([p,d])=>{
        densMap[+p]=d.density;
        (d.diameters||[]).forEach(x=>allDiams.add(x));
        if(d.scale)allScales.add(d.scale);
        if(d.drawingType)typeCount[d.drawingType]=(typeCount[d.drawingType]||0)+1;
      });
      const vals=Object.values(densMap);
      const topTypes=Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`${DRAW_TYPES[t]?.ar||t}(${n})`);
      const stats={
        total:pages.length,
        empty:vals.filter(v=>v===0).length,
        low:vals.filter(v=>v===1).length,
        medium:vals.filter(v=>v===2).length,
        rich:vals.filter(v=>v>=3).length,
        avgDensity:vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:0,
        totalChars:Object.values(extractedData).reduce((s,d)=>s+(d.charCount||0),0),
        totalTables:Object.values(extractedData).reduce((s,d)=>s+(d.tableCount||0),0),
        typeCount, topTypes,
        diameters:[...allDiams].sort((a,b)=>a-b),
        scales:[...allScales],
      };
      setXStats(stats);
      setPdfSess((prev: any)=>({...prev,densities:densMap}));
      setInfraMeta({drawTypes:topTypes,scales:[...allScales],diameters:[...allDiams].sort((a,b)=>a-b),typeCount,extractedData});
    }

    // PHASE 2: AI ANALYSIS
    const startChunkIdx=resumeFrom?allResults.length:0;
    const preChunks = resumeFrom
      ? resumeFrom.map((r: any,ci: number)=>({label:r.chunk,status:r.reply.startsWith("❌")?"error":"done",ci,tokens:r.tokens||0}))
      : [];
    setFe((p: any)=>({...p,phase:"analyzing",stage:`🤖 تحليل ${chunks.length} دُفعة...`,chunks:preChunks,analyzed:startChunkIdx*chunkSize}));

    const processChunk = async (ci: number) => {
      const chunk=chunks[ci];
      const chunkLabel=chunk.length===1?`ص${chunk[0]}`:`ص${chunk[0]}–${chunk[chunk.length-1]}`;
      const projectCtx = buildProjectContext(allResults.slice(0, ci));
      const chunkDrawTypes = [...new Set(chunk.map(p=>extractedData[p]?.drawingType).filter(Boolean))] as string[];
      const chunkScales = [...new Set(chunk.map(p=>extractedData[p]?.scale).filter(Boolean))] as string[];

      setFe((p: any)=>({...p,stage:`🤖 دُفعة ${ci+1}/${chunks.length} (${chunkLabel})`,
        chunks:[...p.chunks,{label:chunkLabel,status:"analyzing",ci,drawTypes:chunkDrawTypes}]}));

      const content: any[]=[];

      if(isFast){
        let payload=`=== دُفعة ${ci+1}/${chunks.length} — ${chunkLabel} ===\nملف: ${file.name}\n`;
        if(chunkDrawTypes.length) payload+=`الأنواع: ${chunkDrawTypes.map(t=>DRAW_TYPES[t]?.ar||t).join(" | ")}\n`;
        if(chunkScales.length) payload+=`المقاييس: ${chunkScales.join(", ")}\n`;
        payload+="\n";
        const maxCharsPerPage2=Math.round(15000/chunkSize);
        for(const p of chunk){
          const d=extractedData[p]||{} as any;
          if(!d.charCount)continue;
          const typeTag=d.drawingType?`[${DRAW_TYPES[d.drawingType]?.code||d.drawingType}]`:"";
          payload+=`${"═".repeat(36)}\n📄 ص${p} ${typeTag}\n${d.dims||""}|${d.lineCount||0}سطر|كثافة:${densityLabel(d.density||0)}\n${"═".repeat(36)}\n`;
          if(d.text)payload+=d.text.slice(0,maxCharsPerPage2)+"\n";
          if(d.tableLines)payload+=`[جداول]\n${d.tableLines}\n`;
          if(d.annotations)payload+=`[تعليقات] ${d.annotations}\n`;
          if(d.invertLevels?.length)payload+=`[مناسيب] ${d.invertLevels.join(" | ")}\n`;
        }
        content.push({type:"text",text:payload});
        if(isHybrid){
          try{
            const midPage=chunk[Math.floor(chunk.length/2)];
            const b64=await renderPageImg(doc,midPage,0.6,0.70);
            content.unshift({type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}});
          }catch{}
        }
      }else{
        for(const p of chunk){
          if(cancelRef.current)break;
          try{
            setFe((prev: any)=>({...prev,stage:`🖼️ تحويل ص${p}...`}));
            const b64=await renderPageImg(doc,p,preset.scale,preset.quality);
            content.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}});
          }catch{}
          await new Promise(r=>setTimeout(r,0));
        }
        content.push({type:"text",text:`حلّل (${chunkLabel}) من "${file.name}". BOQ مع تسمية [${chunkLabel}] + تحقق من الامتثال.`});
      }

      if(!content.length||cancelRef.current){
        return {chunk:chunkLabel,reply:"⏭ تخطي",tokens:0,ci};
      }

      try{
        const infoStr=`صفحات:${chunkLabel}|دُفعة:${ci+1}/${chunks.length}|ملف:${file.name}`;
        let sysP: string;
        if(isHybrid)    sysP=SYS_HYBRID(cs,infoStr,chunkDrawTypes,projectCtx);
        else if(isFast) sysP=SYS_FAST(cs,infoStr,chunkDrawTypes,chunkScales,projectCtx);
        else            sysP=SYS_VISUAL_INFRA(cs,chunkLabel,chunkDrawTypes,chunkScales[0]||null,projectCtx);

        const data=await apiCall({
          max_tokens:depth==="deep"?8000:quality==="infra"||quality==="high"?7000:5000,
          system:sysP,
          messages:[{role:"user",content}],
        });
        const reply=data.content?.map((b: any)=>b.text||"").join("")||"لا يوجد رد";
        const toks=data.usage?.output_tokens||0;
        return {chunk:chunkLabel,pages:chunk,reply,tokens:toks,retries:data._attempt||0,drawTypes:chunkDrawTypes,ci};
      }catch(err: any){
        return {chunk:chunkLabel,pages:chunk,reply:`❌ خطأ: ${err.message}`,tokens:0,error:true,ci};
      }
    };

    let ci=startChunkIdx;
    while(ci<chunks.length){
      if(cancelRef.current)break;
      const elapsed=(Date.now()-t0)/1000;
      const pDone=(ci-startChunkIdx)*chunkSize;
      const eta=pDone>0?Math.round((elapsed/pDone)*((chunks.length-ci)*chunkSize)):null;
      setFe((p: any)=>({...p,eta}));

      const batch: number[]=[];
      for(let j=0;j<parallelCount&&ci+j<chunks.length;j++) batch.push(ci+j);
      ci+=batch.length;

      const batchResults=await Promise.all(batch.map(idx=>processChunk(idx)));

      for(const r of batchResults){
        allResults.push(r);
        if(r.error){
          setFe((p: any)=>({...p,chunks:p.chunks.map((c: any)=>c.label===r.chunk?{...c,status:"error"}:c)}));
          pushMsg("assistant",`❌ دُفعة ${r.chunk}: ${r.reply.replace("❌ خطأ: ","")}`);
        }else if(r.reply!=="⏭ تخطي"){
          setFe((p: any)=>({...p,analyzed:p.analyzed+chunks[r.ci]?.length||0,
            results:[...p.results,{chunk:r.chunk,reply:r.reply,tokens:r.tokens}],
            chunks:p.chunks.map((c: any)=>c.label===r.chunk?{...c,status:"done",tokens:r.tokens}:c)
          }));
          saveBatch({partialResults:allResults,file:file.name,pages:pages.length,chunkSize,quality,timestamp:Date.now()});
          setMsgs(prev=>[...prev,{role:"assistant",
            content:`## 📄 دُفعة ${r.ci+1}/${chunks.length} — ${r.chunk}\n\n${r.reply}`,
            tokens:r.tokens,isChunk:true,chunkLabel:r.chunk,isFast:isFast&&!isHybrid,isHybrid}]);
        }
      }
      if(parallelCount===1)await new Promise(r=>setTimeout(r,100));
    }

    if(cancelRef.current){setFe((p: any)=>({...p,phase:"done",stage:"⏹ تم الإيقاف"}));return;}

    // PHASE 3: SMART MERGE
    const goodResults=allResults.filter((r: any)=>!r.error&&r.reply!=="⏭ تخطي");
    if(goodResults.length>1){
      setFe((p: any)=>({...p,phase:"merging",stage:`🔗 دمج ذكي لـ ${goodResults.length} دُفعة...`}));
      try{
        const projectCtxFinal=buildProjectContext(allResults);
        const drawTypeSummary=[...new Set(allResults.flatMap((r: any)=>r.drawTypes||[]))].map(t=>DRAW_TYPES[t]?.ar||t).join(" | ");
        const mergeText=goodResults.map((r: any,i: number)=>`=== دُفعة ${i+1} (${r.chunk}) ===\n${r.reply}`).join("\n\n");
        const mData=await apiCall({max_tokens:8000,
          system:SYS_MERGE(projectCtxFinal,drawTypeSummary),
          messages:[{role:"user",content:`دمج نتائج "${file.name}" — ${pages.length} صفحة | ${goodResults.length} دُفعة\n\n${mergeText}`}]});
        const merged=mData.content?.map((b: any)=>b.text||"").join("")||"";
        const elapsedFinal=Math.round((Date.now()-t0)/1000);
        setFe((p: any)=>({...p,phase:"done",merged,stage:`✅ اكتمل: ${pages.length} ص في ${fmtT(elapsedFinal)}`}));
        setMsgs(prev=>[...prev,{role:"assistant",
          content:`## 🔗 التقرير الموحد النهائي\n### ${file.name} — ${pages.length} صفحة | ${goodResults.length} دُفعة\n\n${merged}`,
          tokens:mData.usage?.output_tokens,isMerged:true}]);
      }catch(err: any){
        setFe((p: any)=>({...p,phase:"done",stage:`✅ اكتملت (خطأ دمج: ${err.message})`}));
      }
    }else{
      setFe((p: any)=>({...p,phase:"done",stage:`✅ اكتمل في ${fmtT(Math.round((Date.now()-t0)/1000))}`}));
    }
    clearBatch();
    setResumable(null);
  },[pdfSess,selPages,cfgStr,depth]);

  const mdCache = useRef(new Map<string,string>());
  const mdCached = useCallback((text: string) => {
    if (!text) return "";
    if (mdCache.current.has(text)) return mdCache.current.get(text)!;
    const result = md(text);
    if (mdCache.current.size > 200) mdCache.current.clear();
    mdCache.current.set(text, result);
    return result;
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTo({top:chatRef.current.scrollHeight,behavior:"smooth"});
  }, [msgs.length]);

  const sendMsg=useCallback(async()=>{
    const hasFile=queue.length>0;
    if(!prompt.trim()&&!hasFile)return;
    setLoading(true);
    const active=queue[qIdx]||queue[0];
    const content: any[]=[];
    if(active)content.push({type:"image",source:{type:"base64",media_type:active.mime,data:active.b64}});
    content.push({type:"text",text:prompt.trim()||"حلّل هذا المخطط الهندسي بالكامل."});
    const ml=Object.entries(mods).filter(([,v])=>v).map(([k])=>k.split("_").slice(1).join(" "));
    const sys=SYS_MAIN(cfgStr(),depth,ml,ocr);
    const newMsgs=[...msgs,{role:"user",content,displayImage:active?.src,displayText:prompt,fileType:active?.type}];
    setMsgs(newMsgs);setPrompt("");setQueue([]);setQIdx(0);
    const PH=["📐 قراءة المخطط...","🔍 الامتثال السعودي...","📊 استخراج الكميات...","💰 حساب التكاليف...","⚠️ تحليل المخاطر...","✅ التقرير النهائي..."];
    let pi=0;const pt=setInterval(()=>{if(pi<PH.length)setLmsg(PH[pi++]);else clearInterval(pt);},depth==="deep"?3000:2000);
    try{
      const api=newMsgs.slice(-10).map((m: any)=>({role:m.role,content:m.content}));
      const data=await apiCall({max_tokens:depth==="deep"?8000:5000,system:sys,messages:api});
      const reply=data.content?.map((b: any)=>b.text||"").join("")||"لم يتم الحصول على رد.";
      setMsgs(prev=>[...prev,{role:"assistant",content:reply,tokens:data.usage?.output_tokens}]);
    }catch(e: any){
      setMsgs(prev=>[...prev,{role:"assistant",content:`❌ خطأ في الاتصال: ${e.message}`}]);
    }finally{
      clearInterval(pt);setLoading(false);setLmsg("");
    }
  },[prompt,queue,qIdx,msgs,mods,depth,ocr,cfgStr]);

  const openPreview=useCallback(async(p: number)=>{
    if(!pdfSess)return;
    setPreview({page:p,src:null,loading:true});
    try{const src=await renderPreview(pdfSess.doc,p);setPreview({page:p,src,loading:false});}
    catch{setPreview(null);}
  },[pdfSess]);

  const filteredMsgs=useMemo(()=>{
    if(!search.trim())return msgs;
    const q=search.toLowerCase();
    return msgs.filter((m: any)=>(typeof m.content==="string"?m.content:"").toLowerCase().includes(q)||(m.displayText||"").toLowerCase().includes(q));
  },[msgs,search]);

  const copyMsg = useCallback((content: string, idx: number) => {
    navigator.clipboard?.writeText(content).then(()=>{
      setCopiedIdx(idx);
      setTimeout(()=>setCopiedIdx(-1), 1500);
    }).catch(()=>{});
  }, []);

  // Theme
  const D=darkMode;
  const T={
    bg:D?"#0f1623":"#f0f4fa",bg2:D?"#162130":"#ffffff",bg3:D?"#1e2d3d":"#f8fafc",
    bd:D?"#2a3f55":"#d1dde8",t1:D?"#e8f0f8":"#1a2535",t2:D?"#94aec4":"#3a5068",
    t3:D?"#4a6880":"#7a92a8",gold:D?"#f0b429":"#b45309",goldL:D?"#fcd34d":"#d97706",
    grn:D?"#34d399":"#15803d",
    msgUser:D?"linear-gradient(135deg,#1e2d44,#243650)":"linear-gradient(135deg,#eff6ff,#dbeafe)",
    msgAi:D?"linear-gradient(135deg,#0d1f14,#111e18)":"linear-gradient(135deg,#f0fdf4,#dcfce7)",
    msgFast:D?"linear-gradient(135deg,#0a1f12,#0c2616)":"linear-gradient(135deg,#ecfdf5,#d1fae5)",
    msgMerge:D?"linear-gradient(135deg,#1a1400,#201800)":"linear-gradient(135deg,#fffbeb,#fef3c7)",
    msgHybrid:D?"linear-gradient(135deg,#0a1828,#0d2035)":"linear-gradient(135deg,#eff6ff,#dbeafe)",
    card:D?"#162130":"#ffffff",bar:D?"#0a1020":"#e8f0f8",
    shadow:D?"0 1px 3px #00000060":"0 1px 4px #0001",
  };

  const css=useMemo(()=>`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;600;700;900&display=swap');
    .alimtyaz-root *{box-sizing:border-box}
    .alimtyaz-root ::-webkit-scrollbar{width:5px;height:5px}
    .alimtyaz-root ::-webkit-scrollbar-track{background:${T.bg3}}
    .alimtyaz-root ::-webkit-scrollbar-thumb{background:${T.gold}55;border-radius:4px}
    .alimtyaz-root .card{background:${T.card};border:1px solid ${T.bd};border-radius:12px;box-shadow:${T.shadow}}
    .alimtyaz-root .g{color:${T.gold};font-weight:700}
    .alimtyaz-root .bg-btn{background:linear-gradient(135deg,${T.gold},${T.goldL});color:#fff;font-weight:800;border:none;padding:9px 20px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:13px;transition:all .2s;box-shadow:0 2px 10px ${T.gold}30}
    .alimtyaz-root .bg-btn:hover{transform:translateY(-1px);box-shadow:0 5px 18px ${T.gold}50}
    .alimtyaz-root .bg-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
    .alimtyaz-root .bo{background:${T.bg3};color:${T.t2};border:1px solid ${T.bd};padding:6px 13px;border-radius:9px;cursor:pointer;font-family:inherit;font-size:11px;transition:all .18s}
    .alimtyaz-root .bo:hover{background:${T.bg2};border-color:${T.t3};color:${T.t1}}
    .alimtyaz-root .fe-btn{background:linear-gradient(135deg,#064e3b,#065f46);color:#6ee7b7;border:1px solid #059669;padding:9px 18px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:800;transition:all .2s}
    .alimtyaz-root .fe-btn:hover{filter:brightness(1.12)}
    .alimtyaz-root .fe-btn:disabled{opacity:.4;cursor:not-allowed}
    .alimtyaz-root .chip{background:${T.bg3};border:1px solid ${T.bd};color:${T.t2};padding:4px 10px;border-radius:14px;cursor:pointer;font-size:10px;transition:all .18s;display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
    .alimtyaz-root .chip:hover{border-color:${T.t3};color:${T.t1}}
    .alimtyaz-root .chip.on{background:${D?"#1c1404":"#fef3c7"};border-color:${T.gold};color:${T.gold};font-weight:700}
    .alimtyaz-root .fchip{background:${D?"#ecfdf510":"#ecfdf5"};border:1px solid ${D?"#bbf7d030":"#bbf7d0"};color:${T.grn};padding:4px 10px;border-radius:14px;cursor:pointer;font-size:10px;transition:all .18s;display:inline-flex;align-items:center;gap:3px}
    .alimtyaz-root .fchip.on{background:${D?"#064e3b":"#dcfce7"};border-color:#16a34a;color:${T.grn};font-weight:700}
    .alimtyaz-root .inp{background:${T.bg3};border:1px solid ${T.bd};color:${T.t1};padding:10px 14px;border-radius:10px;font-family:inherit;font-size:13px;width:100%;resize:none;outline:none;transition:border .2s;line-height:1.8}
    .alimtyaz-root .inp:focus{border-color:${T.gold};box-shadow:0 0 0 3px ${T.gold}18}
    .alimtyaz-root .sinp{background:${T.bg3};border:1px solid ${T.bd};color:${T.t1};padding:5px 10px;border-radius:8px;font-family:inherit;font-size:11px;outline:none;width:150px}
    .alimtyaz-root .sel{background:${T.bg3};border:1px solid ${T.bd};color:${T.t1};padding:8px 11px;border-radius:9px;font-family:inherit;font-size:12px;width:100%;outline:none}
    .alimtyaz-root .drop{border:2px dashed ${T.bd};border-radius:12px;padding:12px;text-align:center;transition:all .2s;cursor:pointer}
    .alimtyaz-root .drop:hover,.alimtyaz-root .drop.on{border-color:${T.gold};background:${T.gold}10}
    .alimtyaz-root .db{background:${T.bg3};border:1px solid ${T.bd};color:${T.t2};padding:9px;border-radius:9px;cursor:pointer;font-family:inherit;font-size:10px;transition:all .18s;text-align:center}
    .alimtyaz-root .db.on{background:${D?"#1c1404":"#fef3c7"};border-color:${T.gold};color:${T.gold};font-weight:700}
    .alimtyaz-root .mu{background:${T.msgUser};border-radius:14px 14px 4px 14px;padding:12px 16px;margin:4px 0;max-width:86%;border:1px solid ${T.bd}}
    .alimtyaz-root .ma{background:${T.msgAi};border-radius:14px 14px 14px 4px;padding:14px 18px;margin:4px 0;width:100%;border:1px solid ${D?"#1a3025":"#bbf7d0"};border-right:3px solid ${T.grn}}
    .alimtyaz-root .mf{background:${T.msgFast};border-radius:14px 14px 14px 4px;padding:14px 18px;margin:4px 0;width:100%;border:1px solid ${D?"#204a25":"#a7f3d0"};border-right:3px solid #22c55e}
    .alimtyaz-root .mh{background:${T.msgHybrid};border-radius:14px 14px 14px 4px;padding:14px 18px;margin:4px 0;width:100%;border:1px solid ${D?"#1a4055":"#bfdbfe"};border-right:3px solid #3b82f6}
    .alimtyaz-root .mm{background:${T.msgMerge};border-radius:16px;padding:16px 20px;margin:6px 0;width:100%;border:2px solid ${D?"#854d0e":"#fcd34d"};border-right:4px solid ${T.gold};box-shadow:0 3px 16px ${T.gold}15}
    .alimtyaz-root .ma .p,.alimtyaz-root .mf .p,.alimtyaz-root .mh .p,.alimtyaz-root .mm .p{margin:5px 0;line-height:1.9;font-size:13px;color:${T.t1}}
    .alimtyaz-root .ma .h1,.alimtyaz-root .mf .h1,.alimtyaz-root .mh .h1,.alimtyaz-root .mm .h1{color:${T.gold};font-size:15px;font-weight:900;margin:13px 0 5px;border-bottom:2px solid ${T.gold}25;padding-bottom:4px}
    .alimtyaz-root .ma .h2,.alimtyaz-root .mf .h2,.alimtyaz-root .mh .h2,.alimtyaz-root .mm .h2{color:${T.gold};font-size:13px;font-weight:700;margin:10px 0 4px}
    .alimtyaz-root .ma .h3,.alimtyaz-root .mf .h3,.alimtyaz-root .mh .h3,.alimtyaz-root .mm .h3{color:${T.grn};font-size:12px;font-weight:700;margin:8px 0 3px}
    .alimtyaz-root .ma .b,.alimtyaz-root .mf .b,.alimtyaz-root .mh .b,.alimtyaz-root .mm .b{color:${T.gold};font-weight:700}
    .alimtyaz-root .ma .code,.alimtyaz-root .mf .code,.alimtyaz-root .mh .code,.alimtyaz-root .mm .code{background:${T.bg3};color:${T.grn};padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid ${T.bd}}
    .alimtyaz-root .ma .li,.alimtyaz-root .mf .li,.alimtyaz-root .mh .li,.alimtyaz-root .mm .li{margin:3px 0;padding-right:8px;color:${T.t1};font-size:12.5px}
    .alimtyaz-root .tw{overflow-x:auto;margin:8px 0;border-radius:8px;border:1px solid ${T.bd}}
    .alimtyaz-root table{border-collapse:collapse;width:100%;min-width:360px;font-size:11.5px}
    .alimtyaz-root th{background:${D?"#0a1f10":"#f0fdf4"};color:${T.gold};padding:7px 11px;text-align:right;border:1px solid ${T.bd};white-space:nowrap;font-weight:700}
    .alimtyaz-root td{padding:6px 11px;text-align:right;border:1px solid ${T.bd};line-height:1.5;color:${T.t1}}
    .alimtyaz-root tr:nth-child(even){background:${T.bg3}}
    .alimtyaz-root .bk{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap;margin:1px}
    .alimtyaz-root .ok{background:#dcfce7;color:#15803d}.alimtyaz-root .wn{background:#fef9c3;color:#854d0e}
    .alimtyaz-root .ck{background:#ede9fe;color:#6d28d9}.alimtyaz-root .lo{background:#dcfce7;color:#15803d}
    .alimtyaz-root .me{background:#fef3c7;color:#92400e}.alimtyaz-root .hi{background:#fee2e2;color:#b91c1c}
    .alimtyaz-root .cr{background:#fff1f2;color:#be123c;border:1px solid #fecdd3}
    .alimtyaz-root .inf{background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe}
    .alimtyaz-root .prt{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}
    .alimtyaz-root .nav-i{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:9px;cursor:pointer;transition:all .18s;font-size:12px;color:${T.t2};border:1px solid transparent;margin-bottom:3px;white-space:nowrap}
    .alimtyaz-root .nav-i:hover{background:${T.bg3};color:${T.t1}}
    .alimtyaz-root .nav-i.act{background:${D?"#1c1404":"#fef3c7"};border-color:${T.gold}40;color:${T.gold};font-weight:700}
    .alimtyaz-root .prog{height:6px;background:${T.bg3};border-radius:4px;overflow:hidden}
    .alimtyaz-root .prog-f{height:100%;border-radius:4px;transition:width .4s}
    .alimtyaz-root mark.hl{background:${T.gold}40;border-radius:3px;padding:0 2px;color:${T.gold}}
    @keyframes alim-spin{to{transform:rotate(360deg)}}
    @keyframes alim-pulse{0%,100%{opacity:.25;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}
    @keyframes alim-fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes alim-grow{0%{width:2%}75%{width:90%}100%{width:95%}}
    @keyframes alim-glow{0%,100%{box-shadow:none}50%{box-shadow:0 0 22px ${T.grn}30}}
    .alimtyaz-root .fi{animation:alim-fi .25s ease forwards}
    .alimtyaz-root .glow{animation:alim-glow 3s ease infinite}
  `,[T,D]);

  const sp=pdfSess?selPages(pdfSess):[];
  const spLen=sp.length;
  const cks=pdfSess?Math.ceil(spLen/(pdfSess.chunkSize||20)):0;
  const estSec=spLen*(pdfSess?.quality==="fast"?0.08:pdfSess?.quality==="hybrid"?0.3:pdfSess?.quality==="draft"?0.9:pdfSess?.quality==="standard"?1.6:3.2)+cks*5;
  const preset=pdfSess?QP[pdfSess.quality]:QP.fast;

  return(
    <PageLayout>
      <div className="alimtyaz-root" dir="rtl" style={{fontFamily:"'Noto Kufi Arabic','Segoe UI',sans-serif",background:T.bg,color:T.t1,display:"flex",height:"calc(100vh - 180px)",overflow:"hidden",borderRadius:16,border:`1px solid ${T.bd}`}}>
        <style>{css}</style>

        {/* SIDEBAR */}
        <div style={{width:sideOpen?192:52,background:T.bar,borderLeft:`1px solid ${T.bd}`,display:"flex",flexDirection:"column",flexShrink:0,transition:"width .22s ease",overflow:"hidden",zIndex:20}}>
          <div style={{padding:"13px 10px",borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <div style={{width:34,height:34,background:`linear-gradient(135deg,${T.gold},${T.goldL})`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,boxShadow:`0 2px 8px ${T.gold}30`}}>🏗️</div>
            {sideOpen&&<div>
              <div style={{fontSize:12,fontWeight:900,color:T.gold,letterSpacing:.5}}>ALIMTYAZ</div>
              <div style={{fontSize:7.5,color:T.t3}}>v9 · محرك هندسي سعودي</div>
            </div>}
          </div>
          <div style={{flex:1,padding:"10px 7px",overflowY:"auto"}}>
            {[{id:"analysis",i:"💬",l:"التحليل"},{id:"pdf",i:"📄",l:"مدير PDF"},{id:"config",i:"⚙️",l:"الإعداد"}].map(n=>(
              <div key={n.id} className={`nav-i ${tab===n.id?"act":""}`} onClick={()=>setTab(n.id)} style={{justifyContent:sideOpen?"flex-start":"center"}}>
                <span style={{fontSize:16,flexShrink:0}}>{n.i}</span>
                {sideOpen&&<span>{n.l}</span>}
                {n.id==="pdf"&&pdfSess&&sideOpen&&<span style={{marginRight:"auto",fontSize:8,background:D?"#1c1404":"#fef3c7",color:T.gold,padding:"1px 7px",borderRadius:9,fontWeight:700}}>{fmtN(pdfSess.numPages)}</span>}
              </div>
            ))}
            {sideOpen&&<div style={{borderTop:`1px solid ${T.bd}`,marginTop:8,paddingTop:8}}>
              <div style={{fontSize:9,color:T.t3,marginBottom:5,fontWeight:700,padding:"0 4px"}}>🛠️ الأدوات</div>
              <div className="nav-i" onClick={()=>setDarkMode(v=>!v)} style={{fontSize:11}}>
                <span>{D?"☀️":"🌙"}</span><span>{D?"وضع فاتح":"وضع داكن"}</span>
              </div>
              {msgs.length>0&&<div className="nav-i" onClick={()=>{setMsgs([]);setFe(null);setXStats(null);}} style={{fontSize:11,color:"#ef4444"}}><span>🗑️</span><span>مسح المحادثة</span></div>}
            </div>}
          </div>
          {sideOpen&&(totalTokens>0||boqCount>0)&&<div style={{padding:"8px 10px",borderTop:`1px solid ${T.bd}`,display:"flex",flexDirection:"column",gap:4}}>
            {totalTokens>0&&<div style={{fontSize:8,color:T.t3,display:"flex",justifyContent:"space-between"}}><span>Tokens</span><span style={{color:T.gold,fontWeight:700}}>{totalTokens.toLocaleString()}</span></div>}
            {boqCount>0&&<div style={{fontSize:8,color:T.t3,display:"flex",justifyContent:"space-between"}}><span>بنود BOQ</span><span style={{color:T.grn,fontWeight:700}}>{boqCount}</span></div>}
          </div>}
          <button onClick={()=>setSideOpen(v=>!v)} style={{background:"none",border:"none",borderTop:`1px solid ${T.bd}`,padding:"10px",cursor:"pointer",color:T.t3,fontSize:13,transition:"color .18s",fontFamily:"inherit"}}>
            {sideOpen?"◀":"▶"}
          </button>
        </div>

        {/* MAIN */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
          {/* Top bar */}
          <div style={{background:T.bar,borderBottom:`1px solid ${T.bd}`,padding:"7px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <div style={{flex:1,fontSize:10,color:T.t3,display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{color:T.gold,fontWeight:700}}>{CFG_O.authority[cfg.authority]}</span>
              <span style={{color:T.bd}}>·</span><span>{CFG_O.projectType[cfg.projectType]}</span>
              <span style={{color:T.bd}}>·</span><span>{CFG_O.roleMode[cfg.roleMode]}</span>
            </div>
            {msgs.length>0&&<>
              <button className="bo" style={{fontSize:9,padding:"3px 9px"}} onClick={()=>exportCSV(msgs,fname)} title="CSV">⬇️ CSV</button>
              <button className="bo" style={{fontSize:9,padding:"3px 9px"}} onClick={()=>exportMD(msgs,cfgStr())} title="MD">⬇️ MD</button>
              <button className="bo" style={{fontSize:9,padding:"3px 9px"}} onClick={()=>exportJSON(msgs,feState,cfgStr())} title="JSON">⬇️ JSON</button>
              {feState?.extractedData&&Object.keys(feState.extractedData).length>0&&<button className="bo" style={{fontSize:9,padding:"3px 9px"}} onClick={()=>exportTXT(feState)} title="TXT">⬇️ TXT</button>}
            </>}
          </div>

          {/* CONFIG TAB */}
          {tab==="config"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 16px"}}>
              <div style={{maxWidth:820,margin:"0 auto"}}>
                <div style={{marginBottom:16}}>
                  <span style={{background:D?"#1c1404":"#fef3c7",color:T.gold,border:`1px solid ${T.gold}40`,padding:"3px 12px",borderRadius:9,fontSize:10,fontWeight:700}}>تهيئة المنظومة</span>
                  <h2 style={{margin:"8px 0 4px",fontSize:20,fontWeight:900}}>إعدادات <span className="g">ALIMTYAZ v9</span></h2>
                  <div style={{width:46,height:3,background:`linear-gradient(90deg,${T.gold},${T.goldL})`,borderRadius:2}}/>
                </div>
                {resumable&&(
                  <div style={{background:D?"#0a2010":"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div><div style={{fontSize:11,color:T.grn,fontWeight:700}}>🔄 جلسة محفوظة — {resumable.file}</div>
                    <div style={{fontSize:9,color:T.t3}}>{resumable.partialResults?.length} دُفعة</div></div>
                    <div style={{display:"flex",gap:6}}>
                      <button className="fe-btn" style={{fontSize:10,padding:"5px 12px"}} onClick={()=>{setTab("analysis");runExtraction(resumable.partialResults);}}>▶️ استكمال</button>
                      <button className="bo" style={{fontSize:10}} onClick={()=>{clearBatch();setResumable(null);}}>✕</button>
                    </div>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  {[{label:"1️⃣ الجهة المالكة",key:"authority",opts:CFG_O.authority},{label:"2️⃣ نوع المشروع",key:"projectType",opts:CFG_O.projectType},{label:"3️⃣ دور المستخدم",key:"roleMode",opts:CFG_O.roleMode},{label:"4️⃣ هيكل المناطق",key:"zoneStr",opts:CFG_O.zoneStr}].map(({label,key,opts})=>(
                    <div key={key} className="card" style={{padding:12}}>
                      <div style={{fontSize:10,color:T.t3,marginBottom:6,fontWeight:600}}>{label}</div>
                      <select className="sel" value={cfg[key]} onChange={e=>{const n={...cfg,[key]:+e.target.value};setCfg(n);save(n,mods,depth);}}>
                        {opts.map((o,i)=><option key={i} value={i}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="card" style={{padding:13,marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,marginBottom:10,color:T.t1}}>5️⃣ الوحدات التحليلية النشطة</div>
                  {Object.entries(MODS_O).map(([cat,ms])=>(
                    <div key={cat} style={{marginBottom:9}}>
                      <div style={{fontSize:9,color:T.gold,marginBottom:4,fontWeight:700}}>{cat}</div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {ms.map(m=>{const k=`${cat}_${m}`;return <span key={m} className={`chip ${mods[k]?"on":""}`} onClick={()=>{const n={...mods,[k]:!mods[k]};setMods(n);save(cfg,n,depth);}}>{m}</span>;})}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{padding:13,marginBottom:18}}>
                  <div style={{fontSize:10,color:T.t3,marginBottom:8,fontWeight:600}}>6️⃣ عمق التحليل ودقة النتائج</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[{k:"quick",l:"⚡ سريع",d:"نظرة عامة",acc:"~70%"},{k:"standard",l:"📊 قياسي",d:"BOQ + مخاطر",acc:"~85%"},{k:"deep",l:"🔬 عميق",d:"تحقق مزدوج",acc:"~95%"}].map(d=>(
                      <div key={d.k} className={`db ${depth===d.k?"on":""}`} onClick={()=>{setDepth(d.k);save(cfg,mods,d.k);}}>
                        <div style={{fontWeight:700,marginBottom:2,fontSize:12}}>{d.l}</div>
                        <div style={{fontSize:8,opacity:.7}}>{d.d}</div>
                        <div style={{fontSize:9,color:depth===d.k?T.gold:T.t3,marginTop:3,fontWeight:700}}>{d.acc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <SmartSuggestions suggestions={configSuggestions} T={T} D={D} context="config"/>
                <div style={{display:"flex",gap:8}}>
                  <button className="bg-btn" style={{fontSize:14,padding:"12px 30px"}} onClick={()=>{save(cfg,mods,depth);setTab("analysis");}}>🚀 بدء التحليل</button>
                  <button className="bo" onClick={()=>{setMods({});setMsgs([]);setQueue([]);setPdfSess(null);setFe(null);setXStats(null);}}>🔄 إعادة ضبط</button>
                </div>
              </div>
            </div>
          )}

          {/* PDF TAB */}
          {tab==="pdf"&&(
            pdfSess?(
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"12px 14px",gap:10}}>
                <div className="card" style={{padding:"9px 14px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
                  <span style={{fontSize:13,color:T.gold,fontWeight:700}}>📄 {pdfSess.file.name}</span>
                  <span style={{fontSize:10,color:T.t3}}>· {fmtN(pdfSess.numPages)} صفحة</span>
                  <div style={{marginRight:"auto",display:"flex",gap:7}}>
                    <button className="fe-btn" onClick={()=>runExtraction()} disabled={spLen===0}>
                      {pdfSess.quality==="fast"?"⚡":"▶️"} تحليل ({spLen}ص / {cks}د)
                    </button>
                    <button className="bo" style={{fontSize:10}} onClick={()=>setTab("analysis")}>💬 الدردشة</button>
                  </div>
                </div>
                <div style={{flex:1,display:"flex",gap:12,overflow:"hidden"}}>
                  <div className="card" style={{width:142,display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
                    <div style={{padding:"5px 8px",borderBottom:`1px solid ${T.bd}`,fontSize:9,color:T.t3,fontWeight:700,flexShrink:0}}>🗂️ الصفحات</div>
                    <div style={{flex:1,overflow:"hidden"}}><PdfNav sess={pdfSess} T={T} selPages={selPages} setPdfSess={setPdfSess} loadThumbs={loadThumbs} openPreview={openPreview}/></div>
                  </div>
                  <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
                    {/* Stats */}
                    {xStats&&(
                      <div style={{display:"flex",flexDirection:"column",gap:7}}>
                        <div style={{background:D?"linear-gradient(135deg,#0a1628,#0f1e38)":"linear-gradient(135deg,#eff6ff,#dbeafe)",border:`1px solid ${D?"#1e3a5f":"#bfdbfe"}`,borderRadius:11,padding:12}}>
                          <div style={{fontSize:10,color:"#2563eb",fontWeight:700,marginBottom:8}}>📊 تحليل محتوى الصفحات</div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                            {[["🔥 غنية",xStats.rich,"#16a34a"],["📊 متوسطة",xStats.medium,"#ca8a04"],["📄 خفيفة",xStats.low,"#2563eb"],["⬜ فارغة",xStats.empty,"#9ca3af"]].map(([l,v,c]: any[])=>(
                              <div key={l} style={{background:D?"#020817":"#fff",padding:"6px 8px",borderRadius:7,textAlign:"center",border:`1px solid ${c}20`}}>
                                <div style={{fontSize:8,color:c}}>{l}</div>
                                <div style={{fontSize:16,color:T.t1,fontWeight:700}}>{v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {(xStats.topTypes?.length>0||xStats.diameters?.length>0)&&(
                          <div style={{background:D?"linear-gradient(135deg,#0a1f14,#0d2810)":"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:`1px solid ${D?"#065f46":"#6ee7b7"}`,borderRadius:11,padding:12}}>
                            <div style={{fontSize:10,color:T.grn,fontWeight:700,marginBottom:8}}>🏗️ تصنيف مخططات البنية التحتية</div>
                            {Object.entries(xStats.typeCount||{}).sort(([,a]: any,[,b]: any)=>b-a).map(([type,count]: [string,any])=>{
                              const dt=DRAW_TYPES[type];
                              return dt?<span key={type} style={{background:D?dt.color+"20":dt.color+"15",border:`1px solid ${dt.color}50`,color:dt.color,padding:"2px 8px",borderRadius:10,fontSize:9,fontWeight:700,display:"inline-block",margin:2}}>
                                [{dt.code}] {dt.ar} ×{count}
                              </span>:null;
                            })}
                            {xStats.diameters?.length>0&&<div style={{marginTop:6}}><div style={{fontSize:8,color:T.t3,marginBottom:3}}>أقطار أنابيب (mm):</div>
                              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                                {xStats.diameters.slice(0,16).map((d: number)=><span key={d} style={{background:D?"#0a1a30":"#dbeafe",border:"1px solid #bfdbfe",color:"#2563eb",padding:"2px 7px",borderRadius:9,fontSize:9,fontWeight:700}}>Ø{d}</span>)}
                              </div>
                            </div>}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Page selection */}
                    <div className="card" style={{padding:13}}>
                      <div style={{fontSize:10,color:T.t3,marginBottom:7,fontWeight:600}}>📌 اختيار الصفحات</div>
                      <div style={{display:"flex",gap:6,marginBottom:8}}>
                        {[{k:"range",l:"نطاق"},{k:"custom",l:"مخصص"},{k:"all",l:`الكل (${fmtN(pdfSess.numPages)})`}].map(m=>(
                          <span key={m.k} className={`chip ${pdfSess.mode===m.k?"on":""}`} onClick={()=>setPdfSess((p: any)=>({...p,mode:m.k}))}>{m.l}</span>
                        ))}
                      </div>
                      {pdfSess.mode==="range"&&<input className="inp" style={{marginBottom:7,fontSize:12}} value={pdfSess.rangeStr} onChange={e=>setPdfSess((p: any)=>({...p,rangeStr:e.target.value}))} placeholder="1-100, 150, 200-300"/>}
                    </div>
                    {/* Chunk & quality */}
                    <div className="card" style={{padding:13}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <div>
                          <div style={{fontSize:9,color:T.t3,marginBottom:6,fontWeight:600}}>📦 حجم الدُفعة</div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {[5,10,15,20,25,30,50].map(n=><span key={n} className={`chip ${pdfSess.chunkSize===n?"on":""}`} style={{fontSize:9}} onClick={()=>setPdfSess((p: any)=>({...p,chunkSize:n}))}>{n}ص</span>)}
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:9,color:T.t3,marginBottom:6,fontWeight:600}}>🎨 نوع التحليل</div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {Object.entries(QP).map(([k,v])=>(
                              <span key={k} className={`${k==="fast"||k==="hybrid"?"fchip":"chip"} ${pdfSess.quality===k?"on":""}`} style={{fontSize:9}} onClick={()=>setPdfSess((p: any)=>({...p,quality:k}))}>{v.label}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Summary */}
                    <div style={{background:D?"linear-gradient(135deg,#0a1a10,#0d2018)":"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:`1px solid ${D?"#1a4025":"#bbf7d0"}`,borderRadius:12,padding:13}}>
                      <div style={{fontSize:11,color:T.gold,fontWeight:700,marginBottom:9}}>📊 ملخص العملية</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
                        {[["الصفحات",`${spLen}/${fmtN(pdfSess.numPages)}`],["الدُفعات",`${cks}`],["النوع",preset.label],["الوقت",fmtT(Math.round(estSec))]].map(([k,v])=>(
                          <div key={k} style={{background:D?"#020817":"#fff",padding:"6px 10px",borderRadius:7,border:`1px solid ${T.bd}`}}>
                            <div style={{fontSize:8,color:T.t3}}>{k}</div>
                            <div style={{fontSize:11,color:T.t1,fontWeight:600}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {spLen>0&&<button className="fe-btn" style={{width:"100%",fontSize:13}} onClick={()=>runExtraction()}>
                        ▶️ بدء التحليل — {spLen} صفحة
                      </button>}
                    </div>
                  </div>
                </div>
              </div>
            ):(
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
                <div style={{fontSize:48}}>📄</div>
                <div style={{fontSize:14,color:T.t3}}>لا يوجد ملف PDF محمّل</div>
                <button className="bg-btn" onClick={()=>fileRef.current?.click()}>📁 رفع ملف PDF</button>
                <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
              </div>
            )
          )}

          {/* ANALYSIS TAB */}
          {tab==="analysis"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"9px 14px",gap:8}}>
              {feState&&feState.phase!=="done"&&(
                <div style={{background:D?"linear-gradient(135deg,#022c22,#064e3b)":"linear-gradient(135deg,#ecfdf5,#d1fae5)",border:`1px solid ${D?"#05966960":"#6ee7b7"}`,borderRadius:10,padding:"10px 14px",flexShrink:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{fontSize:11,color:T.grn,fontWeight:700}}>{feState.stage}</div>
                    <div style={{display:"flex",gap:7,alignItems:"center"}}>
                      {feState.eta!=null&&<span style={{fontSize:9,color:T.t3}}>⏱️ ~{fmtT(feState.eta)}</span>}
                      {feState.phase!=="merging"&&<button onClick={()=>cancelRef.current=true} style={{background:"#fee2e2",border:"1px solid #fca5a5",color:"#b91c1c",padding:"2px 8px",borderRadius:6,cursor:"pointer",fontSize:9,fontFamily:"inherit"}}>⏹ إيقاف</button>}
                    </div>
                  </div>
                  <div className="prog"><div className="prog-f" style={{background:`linear-gradient(90deg,${T.grn},#4ade80)`,width:`${feState.total>0?Math.round((feState.phase==="extracting"?feState.extracted:feState.analyzed)/feState.total*100):5}%`}}/></div>
                  {feState.chunks?.length>0&&<div style={{display:"flex",gap:3,marginTop:6,flexWrap:"wrap"}}>
                    {feState.chunks.map((c: any,i: number)=>(
                      <span key={i} style={{background:c.status==="done"?(D?"#064e3b":"#dcfce7"):c.status==="error"?(D?"#450a0a":"#fee2e2"):(D?"#1c1404":"#fef9c3"),
                        color:c.status==="done"?T.grn:c.status==="error"?"#ef4444":T.gold,
                        padding:"2px 7px",borderRadius:6,fontSize:8,fontWeight:c.status==="analyzing"?700:400,
                        border:`1px solid ${c.status==="done"?(D?"#065f46":"#bbf7d0"):c.status==="error"?(D?"#7f1d1d":"#fca5a5"):(D?"#854d0e":"#fde68a")}`,
                        animation:c.status==="analyzing"?"alim-pulse 1.2s ease infinite":undefined}}>
                        {c.status==="done"?"✓":c.status==="error"?"✗":"⏳"} {c.label}
                      </span>
                    ))}
                  </div>}
                </div>
              )}
              <div style={{display:"flex",gap:4,flexWrap:"wrap",flexShrink:0,alignItems:"center"}}>
                {TMPL.map(t=>(
                  <span key={t.l} className="chip" style={{fontSize:9}} onClick={()=>{setPrompt(t.p);}}>{t.i} {t.l}</span>
                ))}
                <div style={{marginRight:"auto",display:"flex",gap:4,alignItems:"center"}}>
                  {searchOn&&<input className="sinp" placeholder="🔍 بحث..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus/>}
                  <button className="bo" style={{fontSize:9,padding:"3px 8px"}} onClick={()=>{setSearchOn(v=>!v);if(searchOn)setSearch("");}}>🔍</button>
                </div>
              </div>
              <div style={{flex:1,display:"flex",gap:10,overflow:"hidden"}}>
                {queue.length>0&&(
                  <div className="card" style={{width:122,flexShrink:0,display:"flex",flexDirection:"column",overflow:"hidden",padding:7}}>
                    <div style={{fontSize:8,color:T.t3,marginBottom:5,fontWeight:600}}>🗂️ الملفات ({queue.length})</div>
                    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
                      {queue.map((f: any,i: number)=>(
                        <div key={i} style={{cursor:"pointer",position:"relative"}} onClick={()=>setQIdx(i)}>
                          <img src={f.src} style={{width:"100%",borderRadius:6,border:`2px solid ${qIdx===i?T.gold:T.bd}`,objectFit:"contain",maxHeight:85}}/>
                          <div onClick={e=>{e.stopPropagation();setQueue(p=>{const n=[...p];n.splice(i,1);return n;});}} style={{position:"absolute",top:-4,left:-4,width:14,height:14,borderRadius:"50%",background:"#ef4444",color:"#fff",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontWeight:800}}>✕</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatRef} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
                  {filteredMsgs.length===0&&msgs.length===0&&(
                    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 16px",textAlign:"center"}}>
                      <div style={{fontSize:54,marginBottom:12}}>🏗️</div>
                      <div style={{fontSize:17,fontWeight:900,marginBottom:6,color:T.gold}}>جاهز للتحليل الهندسي المتقدم</div>
                      <div style={{fontSize:10,color:T.t3,maxWidth:420,lineHeight:2,marginBottom:4}}>ارفع مخططاً هندسياً أو اختر قالباً للبدء</div>
                      <div style={{marginTop:14,display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center"}}>
                        {TMPL.slice(0,4).map(t=><span key={t.l} className="chip" style={{fontSize:9,padding:"7px 13px"}} onClick={()=>setPrompt(t.p)}>{t.i} {t.l}</span>)}
                      </div>
                    </div>
                  )}
                  {msgs.length>0&&boqCount>0&&(
                    <div style={{background:D?"linear-gradient(135deg,#0d1f14,#111e18)":"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:`1px solid ${D?"#1a3025":"#bbf7d0"}`,borderRadius:10,padding:"8px 14px",display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",flexShrink:0}}>
                      <span style={{fontSize:9,color:T.grn,fontWeight:700}}>📊 ملخص الجلسة</span>
                      <span style={{fontSize:9,color:T.t2}}><span style={{color:T.gold,fontWeight:700}}>{boqCount}</span> بند BOQ</span>
                      <span style={{fontSize:9,color:T.t2}}><span style={{color:T.gold,fontWeight:700}}>{msgs.filter((m: any)=>m.role==="assistant").length}</span> تحليل</span>
                    </div>
                  )}
                  {filteredMsgs.map((m: any,i: number)=>{
                    const isCol=collapsed.has(i);
                    const cls=m.role==="user"?"mu":m.isMerged?"mm":m.isHybrid?"mh":m.isFast?"mf":"ma";
                    const lbl=m.role==="user"?"👤":m.isMerged?"🔗 التقرير الموحد":m.isChunk?`📄 ${m.chunkLabel||""}`:"🤖 ALIMTYAZ";
                    const lclr=m.role==="user"?"#2563eb":m.isMerged?T.gold:m.isFast?T.grn:"#374151";
                    const content=typeof m.content==="string"?m.content:"";
                    const hlContent=search.trim()&&m.role==="assistant"?mdCached(content).replace(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi"),'<mark class="hl">$1</mark>'):null;
                    return(
                      <div key={i} className={`fi ${cls}`}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                          <div style={{fontSize:9,fontWeight:700,color:lclr}}>{lbl}</div>
                          {m.role==="assistant"&&(
                            <div style={{display:"flex",gap:4,alignItems:"center"}}>
                              {m.tokens&&<span style={{fontSize:7,color:T.t3}}>{m.tokens.toLocaleString()}t</span>}
                              {(m.isChunk||m.isFast||m.isHybrid)&&<button onClick={()=>setCollapsed(prev=>{const n=new Set(prev);n.has(i)?n.delete(i):n.add(i);return n;})} style={{background:"none",border:`1px solid ${T.bd}`,cursor:"pointer",color:T.t3,fontSize:8,borderRadius:5,padding:"1px 6px",fontFamily:"inherit"}}>{isCol?"▼":"▲"}</button>}
                              <button onClick={()=>copyMsg(content,i)} style={{background:copiedIdx===i?"#dcfce7":"none",border:`1px solid ${copiedIdx===i?"#bbf7d0":T.bd}`,cursor:"pointer",color:copiedIdx===i?T.grn:T.t3,fontSize:10,borderRadius:6,padding:"1px 7px",fontFamily:"inherit"}} title="نسخ">{copiedIdx===i?"✓":"📋"}</button>
                            </div>
                          )}
                        </div>
                        {m.displayImage&&!isCol&&<img src={m.displayImage} style={{maxWidth:"100%",maxHeight:120,borderRadius:7,marginBottom:7,objectFit:"contain",border:`1px solid ${T.bd}`}}/>}
                        {!isCol&&(m.role==="user"
                          ?<div style={{fontSize:12,lineHeight:1.8,color:T.t1}}>{m.displayText||"📎 ملف مرفق"}</div>
                          :<div dangerouslySetInnerHTML={{__html:hlContent||mdCached(content)}}/>
                        )}
                        {isCol&&<div style={{fontSize:9,color:T.t3,fontStyle:"italic"}}>··· {content.slice(0,90)}...</div>}
                      </div>
                    );
                  })}
                  {loading&&(
                    <div className="ma fi">
                      <div style={{fontSize:9,color:T.t3,marginBottom:5,fontWeight:600}}>🤖 ALIMTYAZ Engine</div>
                      <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:5}}>
                        {[0,1,2,3].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.gold,animation:"alim-pulse 1.4s ease-in-out infinite",animationDelay:`${i*.28}s`}}/>)}
                      </div>
                      <div style={{fontSize:11,color:T.t3}}>{lmsg||"جارٍ التحليل..."}</div>
                      <div className="prog" style={{marginTop:6}}><div style={{height:"100%",background:`linear-gradient(90deg,${T.gold},${T.goldL})`,borderRadius:4,animation:"alim-grow 3s ease-in-out infinite"}}/></div>
                    </div>
                  )}
                </div>
              </div>
              {/* Input */}
              <div className="card" style={{padding:11,flexShrink:0}}>
                {queue.length>0&&(
                  <div style={{display:"flex",gap:4,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
                    {queue.map((f: any,i: number)=>(
                      <div key={i} style={{position:"relative",cursor:"pointer"}} onClick={()=>setQIdx(i)}>
                        <img src={f.src} style={{width:40,height:40,borderRadius:6,objectFit:"cover",border:`2px solid ${qIdx===i?T.gold:T.bd}`}}/>
                        <div onClick={e=>{e.stopPropagation();setQueue(p=>{const n=[...p];n.splice(i,1);return n;});}} style={{position:"absolute",top:-4,left:-4,width:14,height:14,borderRadius:"50%",background:"#ef4444",color:"#fff",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontWeight:800}}>✕</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`drop ${drag?"on":""}`} style={{marginBottom:8,padding:"10px"}}
                  onClick={()=>fileRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
                  onDrop={e=>{e.preventDefault();setDrag(false);handleFiles(e.dataTransfer.files);}}>
                  <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:4}}>
                    {[{c:T.grn,i:"⚡",l:"Fast"},{c:"#2563eb",i:"🔀",l:"Hybrid"},{c:"#2563eb",i:"🖼️",l:"PNG/WebP"},{c:"#dc2626",i:"📄",l:"PDF"},{c:T.grn,i:"📐",l:"DWG"}].map(f=>(
                      <div key={f.l} style={{textAlign:"center"}}>
                        <div style={{fontSize:14}}>{f.i}</div>
                        <div style={{fontSize:7,color:f.c,marginTop:1,fontWeight:600}}>{f.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:9,color:T.t3}}>اسحب مخططاً أو أكثر · PNG, JPG, WebP · PDF حتى 10,000 صفحة</div>
                </div>
                <input ref={fileRef} type="file" accept="image/*,.webp,.pdf,.dwg,.dxf" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
                <div style={{display:"flex",gap:5,marginBottom:6,alignItems:"center"}}>
                  <button className={`bo ${ocr?"chip on":""}`} style={{fontSize:9,padding:"3px 9px",borderColor:ocr?T.gold:T.bd}} onClick={()=>setOcr(v=>!v)}>🔤 OCR{ocr?" ✓":""}</button>
                  <span style={{fontSize:8,color:T.t3}}>{ocr?"استخراج نصوص وأبعاد":"تحليل هندسي شامل"}</span>
                </div>
                <div style={{display:"flex",gap:5}}>
                  <textarea className="inp" rows={3} placeholder="اكتب سؤالك أو اختر قالباً... (Ctrl+Enter للإرسال)"
                    value={prompt} onChange={e=>setPrompt(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&e.ctrlKey)sendMsg();}}/>
                  <button className="bg-btn" onClick={sendMsg} disabled={loading||(!prompt.trim()&&queue.length===0)} style={{minWidth:52,fontSize:20,padding:"0 14px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {loading?<div style={{width:16,height:16,border:"3px solid #ffffff40",borderTopColor:"#fff",borderRadius:"50%",animation:"alim-spin .8s linear infinite"}}/>:"⬅️"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {proc&&(
          <div style={{position:"fixed",inset:0,background:"#000000a0",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div className="card" style={{padding:"22px 30px",textAlign:"center",minWidth:240}}>
              <div style={{width:32,height:32,border:`4px solid ${T.bd}`,borderTopColor:T.gold,borderRadius:"50%",animation:"alim-spin .8s linear infinite",margin:"0 auto 12px"}}/>
              <div style={{fontSize:12,color:T.gold,fontWeight:700}}>{proc.stage}</div>
            </div>
          </div>
        )}
        {preview&&(
          <div style={{position:"fixed",inset:0,background:"#000000c0",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setPreview(null)}>
            <div className="card" style={{maxWidth:720,maxHeight:"90vh",overflow:"auto",padding:0,borderRadius:14}} onClick={(e: any)=>e.stopPropagation()}>
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:T.gold,fontWeight:700}}>📄 معاينة الصفحة {preview.page}</span>
                <button onClick={()=>setPreview(null)} style={{background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
              </div>
              {preview.loading?<div style={{padding:48,textAlign:"center",color:T.t3}}>⏳ جارٍ التحميل...</div>:<img src={preview.src} style={{width:"100%",display:"block"}}/>}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default DrawingAnalysisPage;
