import { supabase } from "@/integrations/supabase/client";
import { SAR_REF_2025, DRAW_TYPES } from "./constants";

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

export interface PipeDetail {
  diameter: number;
  material: string | null;
  type: string | null;
  pnClass: string | null;
}

export function extractPipeDiameters(text: string): number[] {
  return extractPipeDetails(text).map(p => p.diameter);
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

export function extractInvertLevels(text: string): string[] {
  if (!text) return [];
  const levels: string[] = [];
  const p = /(?:IL|INV|invert|منسوب|TW|GL|EGL)\s*[=:]\s*([-+]?\d{1,4}[.,]\d{1,3})/gi;
  let m;
  while ((m = p.exec(text)) !== null) levels.push(m[1]);
  return levels.slice(0, 20);
}

export function buildProjectContext(allResults: any[]): string {
  if (!allResults.length) return "";
  const combined = allResults.map((r: any) => r.reply || "").join("\n");
  const projMatch = combined.match(/مشروع[:：\s]+([^\n|]{5,60})/);
  const scaleMatch = combined.match(/مقياس[:：\s]+(1:\d+)/);
  const authMatch = combined.match(/NWC|MOT|أمانة|بلدية|الهيئة الملكية|MOMRA/i);
  const lines: string[] = [];
  if (projMatch) lines.push(`المشروع: ${projMatch[1].trim()}`);
  if (scaleMatch) lines.push(`المقياس المكتشف: ${scaleMatch[1]}`);
  if (authMatch) lines.push(`الجهة: ${authMatch[0]}`);
  const ksaCodes = (combined.match(/KSA-[A-Z]{2,6}-[A-Z]{2,6}-[A-Z]{1,4}-\d{3}/g) || []);
  const unique = [...new Set(ksaCodes)].slice(0, 8);
  if (unique.length) lines.push(`بنود سبق استخراجها: ${unique.join(", ")}`);
  return lines.length ? `\n══ سياق مكتشف من الصفحات السابقة ══\n${lines.join("\n")}\n` : "";
}

// ── System prompts ──
export const SYS_MAIN = (cfg: string, depth: string, mods: string[], ocr: boolean) => `أنت نظام ALIMTYAZ ALWATANIA v9 — محرك هندسي وتجاري متخصص للمقاولين السعوديين.
${cfg}
عمق التحليل: ${depth === "deep" ? "🔬 عميق — تحقق مزدوج — دقة 95%" : depth === "standard" ? "📊 قياسي — دقة 85%" : "⚡ سريع — دقة 70%"}
الوحدات النشطة: ${mods.join(" | ") || "جميع الوحدات"}

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
${ocr ? `\n══ OCR النشط ══\nTitle Block | أبعاد | تعليقات أنابيب | مستويات GL,IL,EGL,TW,INV | إحداثيات | اختصارات` : ""}`;

export const SYS_VISUAL_INFRA = (cfg: string, chunkLabel: string, drawTypes: string[], scale: string | null, projectCtx: string) => {
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

══ بروتوكول المواسير (إلزامي) ══
• لكل خط أنابيب: اذكر المادة (PVC/UPVC/HDPE/DI/GRP/PP/Steel/RCP) + القطر + PN/SN/SDR
• احسب أطوال الأنابيب من القطاعات الطولية (المسافة بين الغرف)
• احسب الوصلات والملحقات لكل خط: كوع، تي، ريديوسر، فلانجة

══ بروتوكول الحفر والردم ══
• حفر الخنادق: العرض × العمق × الطول لكل خط (من GL إلى IL + 150mm فرشة)
• الردم = حجم الحفر − حجم الأنبوب − حجم الفرشة الرملية
• حدد نوع التربة إن أمكن (رملية/طينية/صخرية)

══ بروتوكول الأسفلت والطرق ══
• لكل طبقة: المساحة × السماكة = الحجم
• الطبقات: Sub-grade → Sub-base → Base Course → Binder → Wearing Course
• Prime Coat و Tack Coat: بالمساحة (م²)

${SAR_REF_2025}

✅ تحقق: هل المقاسات متسقة؟ | هل الميول منطقية؟ | هل يوجد تعارض بين مقطعين؟`;
};

export const SYS_FAST = (cfg: string, info: string, drawTypes: string[], scales: string[], projectCtx: string) => {
  const typeHint = drawTypes.length ? `أنواع محتملة: ${drawTypes.join(" | ")}` : "";
  const scaleHint = scales.length ? `مقاييس مكتشفة: ${scales.join(", ")}` : "";
  return `أنت محرك ALIMTYAZ للاستخراج السريع v3 — متخصص في البنية التحتية السعودية.
${cfg} | ${info}
${typeHint}${scaleHint ? "\n" + scaleHint : ""}
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

export const SYS_HYBRID = (cfg: string, info: string, drawTypes: string[], projectCtx: string) => `أنت محرك ALIMTYAZ للتحليل المدمج v3 (نص + صورة بصرية).
${cfg} | ${info}
${drawTypes.length ? `أنواع متوقعة: ${drawTypes.join(" | ")}` : ""}
${projectCtx}
الاستراتيجية:
① الصورة: تحديد نوع المخطط + استخراج الأبعاد الرسومية + المقياس
② النص: استخراج الأرقام الدقيقة + الكودات + المناسيب
③ الدمج: BOQ كامل بترميز KSA + التحقق من التطابق
${SAR_REF_2025}`;

export const SYS_MERGE = (projectCtx = "", drawTypeSummary = "") => `أنت محرك ALIMTYAZ للدمج والتوحيد النهائي v3.
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
export interface ExtractedPage {
  pageNum: number; dims: string; text: string; tableLines: string; annotations: string;
  charCount: number; lineCount: number; tableCount: number; numCount: number; density: number;
  drawingType: string | null; scale: string | null; diameters: number[]; invertLevels: string[];
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
  const infraScore = (diameters.length > 0 ? 1 : 0) + (invertLevels.length > 2 ? 1 : 0) + (scale ? 1 : 0);
  const rawDensity = Math.min(3, Math.floor((tableLines.length * 2 + numLines.length) / 5));
  const density = Math.min(3, rawDensity + (infraScore > 1 ? 1 : 0));
  return {
    pageNum, dims: `${Math.round(vp.width)}×${Math.round(vp.height)}pt`, text,
    tableLines: tableLines.join("\n"), annotations: annotations.join(" | "),
    charCount: raw.length, lineCount: lines.length, tableCount: tableLines.length,
    numCount: numLines.length, density, drawingType, scale, diameters, invertLevels
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

export function exportCSV(msgs: any[], fnameStr = "BOQ_ALIMTYAZ_v9") {
  const text = extractAllTables(msgs);
  const rows = text.split("\n").filter(l => l.includes("|") && !l.match(/^[\|\-\s:]+$/));
  const csv = rows.map(r => r.split("|").map(c => `"${c.trim()}"`).filter((_, i, a) => i > 0 && i < a.length - 1).join(",")).join("\n");
  dl(new Blob(["\uFEFF" + csv], { type: "text/csv" }), fnameStr + ".csv");
}

export function exportMD(msgs: any[], cfgLabel: string) {
  const text = `# تقرير ALIMTYAZ v9\n**الإعداد:** ${cfgLabel}\n**التاريخ:** ${new Date().toLocaleString("ar-SA")}\n\n---\n\n` +
    msgs.filter(m => m.role === "assistant").map(m => `## ${m.chunkLabel || "تحليل"}\n\n${m.content}`).join("\n\n---\n\n");
  dl(new Blob([text], { type: "text/markdown" }), "Report_ALIMTYAZ_v9.md");
}

export function exportJSON(msgs: any[], feState: any, cfgLabel: string) {
  const data = {
    system: "ALIMTYAZ v9", config: cfgLabel, exported: new Date().toISOString(),
    summary: { totalMessages: msgs.length, totalTokens: msgs.reduce((s: number, m: any) => s + (m.tokens || 0), 0) },
    messages: msgs.filter(m => m.role === "assistant").map(m => ({ label: m.chunkLabel || "chat", content: m.content, tokens: m.tokens || 0, isMerged: !!m.isMerged })),
  };
  dl(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "BOQ_ALIMTYAZ_v9.json");
}

export function exportTXT(feState: any) {
  if (!feState?.extractedData) return;
  const lines = Object.entries(feState.extractedData).sort(([a], [b]) => +a - +b).map(([p, d]: [string, any]) => `${"=".repeat(50)}\nصفحة ${p} | ${d.dims} | ${d.lineCount} سطر\n${"=".repeat(50)}\n${d.text}\n`).join("\n");
  dl(new Blob([lines], { type: "text/plain;charset=utf-8" }), "ExtractedText_ALIMTYAZ_v9.txt");
}

function dl(blob: Blob, name: string) { Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name }).click(); }
