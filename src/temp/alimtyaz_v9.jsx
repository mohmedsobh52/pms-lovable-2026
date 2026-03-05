import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════
//  ACCURACY ENGINE v3 — ALIMTYAZ v9 — INFRASTRUCTURE SPECIALIST
// ═══════════════════════════════════════════════════════════════════════════

// ── مرجع الأسعار الموسّع 2025 ──
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

// ── كاشف نوع المخطط ──
const DRAW_TYPES = {
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

// ── محرك كشف نوع المخطط من النص ──
function detectDrawingType(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  const ar = text;
  // Priority order — most specific first
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
  // Heuristic: many pipes/diameters → likely plan or profile
  const pipeMatches = (ar.match(/[øØΦ]\d+|dn\s*\d+|id\s*\d+|Ø\d+|قطر/gi)||[]).length;
  if (pipeMatches >= 3) return "PLAN";
  return null;
}

// ── كاشف المقياس من النص ──
function detectScale(text) {
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

// ── استخراج أقطار الأنابيب من النص ──
function extractPipeDiameters(text) {
  if (!text) return [];
  const found = new Set();
  const patterns = [
    /[ØøΦ]\s*(\d{2,4})\s*(?:mm)?/gi,
    /DN\s*(\d{2,4})/gi,
    /Ø\s*(\d{2,4})/gi,
    /قطر\s+(\d{2,4})\s*(?:مم|mm)/gi,
    /ID\s*=?\s*(\d{2,4})\s*(?:mm)/gi,
  ];
  patterns.forEach(p => {
    let m;
    while ((m = p.exec(text)) !== null) {
      const d = parseInt(m[1]);
      if (d >= 50 && d <= 3000) found.add(d);
    }
  });
  return [...found].sort((a,b)=>a-b);
}

// ── استخراج مستويات المناسيب من النص ──
function extractInvertLevels(text) {
  if (!text) return [];
  const levels = [];
  const p = /(?:IL|INV|invert|منسوب|TW|GL|EGL)\s*[=:]\s*([-+]?\d{1,4}[.,]\d{1,3})/gi;
  let m;
  while ((m = p.exec(text)) !== null) levels.push(m[1]);
  return levels.slice(0, 20); // max 20
}

// ── بناء سياق المشروع من النتائج السابقة ──
function buildProjectContext(allResults) {
  if (!allResults.length) return "";
  const combined = allResults.map(r=>r.reply||"").join("\n");
  // Extract project name
  const projMatch = combined.match(/مشروع[:：\s]+([^\n|]{5,60})/);
  // Extract scale
  const scaleMatch = combined.match(/مقياس[:：\s]+(1:\d+)/);
  // Extract authority
  const authMatch = combined.match(/NWC|MOT|أمانة|بلدية|الهيئة الملكية|MOMRA/i);
  const lines = [];
  if (projMatch) lines.push(`المشروع: ${projMatch[1].trim()}`);
  if (scaleMatch) lines.push(`المقياس المكتشف: ${scaleMatch[1]}`);
  if (authMatch) lines.push(`الجهة: ${authMatch[0]}`);
  // BOQ items already found
  const ksaCodes = (combined.match(/KSA-[A-Z]{2,6}-[A-Z]{2,6}-[A-Z]{1,4}-\d{3}/g)||[]);
  const unique = [...new Set(ksaCodes)].slice(0,8);
  if (unique.length) lines.push(`بنود سبق استخراجها: ${unique.join(", ")}`);
  return lines.length ? `\n══ سياق مكتشف من الصفحات السابقة ══\n${lines.join("\n")}\n` : "";
}

// ─── System Prompts الجديدة المتخصصة ───────────────────────────────────────

const SYS_MAIN = (cfg, depth, mods, ocr) => `أنت نظام ALIMTYAZ ALWATANIA v9 — محرك هندسي وتجاري متخصص للمقاولين السعوديين.
${cfg}
عمق التحليل: ${depth==="deep"?"🔬 عميق — تحقق مزدوج — دقة 95%":depth==="standard"?"📊 قياسي — دقة 85%":"⚡ سريع — دقة 70%"}
الوحدات النشطة: ${mods.join(" | ")||"جميع الوحدات"}

══ منهجية العمل الإلزامية ══
١ كشف نوع المخطط فوراً:
  → مسقط أفقي | قطاع طولي | قطاع عرضي | تفصيل إنشائي | جدول غرف | BOQ | مواصفات | غلاف
٢ استخراج بيانات Title Block:
  | المشروع | الجهة | المصمم | التاريخ | المقياس | رقم اللوحة | المراجعة |
٣ الامتثال السعودي (✓/✗ لكل بند مع رقم المعيار):
  • MOT: سماكة الرصف ≥50mm | عرض الكتف ≥1.5م | ميل عرضي 2–3% | R_min حسب التصنيف
  • NWC: عمق أدنى للأنابيب ≥1.0م | PN مناسب | صمام هواء كل 500م | كتلة دفع عند الانحناء
  • SBC 304/305: غطاء تسليح ≥40mm | نسبة ρ 0.25–4% | فرد ≥100mm
  • MOMRA: إنارة الطريق | علامات مرورية | تصريف الأمطار
٤ الكميات (محور بمحور، منطقة بمنطقة):
  | الكود KSA | الوصف التفصيلي | المعادلة الصريحة | الكمية | الوحدة | الثقة |
  ترميز: KSA-[DISC]-[WORK]-[ZONE]-[SEQ]
  مثال: KSA-SWR-PIP-ZA-001 | أنبوب PVC SN8 Ø300mm | 245×1.0 | 245 | م.ط | ✅
  DISC: CIV=مدني | RD=طريق | SWR=صرف | WAT=مياه | STM=أمطار | STR=إنشائي | UTL=مرافق | MAR=بحري
٥ BOQ الكامل بالأسعار:
  | الكود KSA | الوصف | الوحدة | الكمية | سعر SAR | إجمالي SAR | الثقة |
  ${SAR_REF_2025}
٦ التكاليف الإجمالية + حساسية ±5% ±10% ±15%
٧ سجل المخاطر (احتمال × تأثير → 1–25):
  | الكود | الخطر | الاحتمال/5 | التأثير/5 | الدرجة | SAR | الإجراء |
٨ هندسة القيمة | خلاصة تنفيذية 5 نقاط

══ قواعد الدقة ══
• مقياس الرسم غير واضح → [مقياس غير محدد] — لا تفترض
• بُعد غير مقروء → [قراءة جزئية] — لا تخمّن
• تعارض بين صفحات → اذكره صراحة
• سعر خارج النطاق المرجعي → أبلغ فوراً
${ocr?`\n══ OCR النشط ══\nTitle Block | أبعاد | تعليقات أنابيب (Ø/مادة/PN/منسوب) | مستويات GL,IL,EGL,TW,INV | إحداثيات | اختصارات`:""}`;

// ── نظام متخصص للمخططات البصرية حسب النوع ──
const SYS_VISUAL_INFRA = (cfg, chunkLabel, drawTypes, scale, projectCtx) => {
  const typeStr = drawTypes.length ? drawTypes.join(" + ") : "بنية تحتية عامة";
  const scaleStr = scale ? `المقياس: ${scale}` : "المقياس: غير محدد — اذكر إن وجد";
  return `أنت نظام ALIMTYAZ v9 — محلل مخططات البنية التحتية السعودية (تحليل بصري).
${cfg}
الدُفعة: ${chunkLabel} | أنواع المخططات المتوقعة: ${typeStr} | ${scaleStr}
${projectCtx}

══ بروتوكول التحليل البصري ══
أ) أعلن نوع كل مخطط فوراً: [PLN] [PRF] [XSC] [STR] [MHC] [BOQ] [SPC] [MAR]

ب) حسب النوع — طبّق البروتوكول المناسب:

📐 [PLN] مسقط أفقي:
• استخرج: محاور الأنابيب/الطرق | أرقام التشاينج/Chainages | قطر وعمق ونوع مادة كل خط
• احسب الطول الكلي لكل خط (من Chainage إلى Chainage) | مواقع الغرف/الانحناءات
• انتبه لـ: نقاط تقاطع المرافق | مواقع صمامات الهواء | كتل الدفع المطلوبة

📉 [PRF] قطاع طولي:
• استخرج: منسوب GL و IL لكل غرفة | ميل الأنبوب (‰ أو %) | طول كل وصلة
• احسب: أعماق الحفر (GL–IL) لكل نقطة | حجم الحفر الكلي = Σ(طول × عرض × عمق)
• أبلغ عن: أي منسوب سالب | ميل خارج المعيار (< 2‰ أو > 15‰ للصرف)

✂️ [XSC] قطاع عرضي:
• قطاع الطريق: عرض الأكتاف | طبقات الرصف بالسماكات | الميل العرضي
• قطاع الخندق: عرض القطع | انحدار الجدران (1:0.5 etc.) | عمق التغطية

🏗️ [STR] إنشائي:
• استخرج: أبعاد الأعضاء | كثافة التسليح | درجة الخرسانة | تفاصيل الوصلات

📋 [MHC] جدول الغرف:
• استخرج لكل غرفة: الرقم | المنسوب (Inv In/Out) | القطر | النوع | الإحداثيات

جدول BOQ الكامل بترميز KSA + أسعار SAR من المرجع المرفق.
${SAR_REF_2025}

✅ تحقق: هل المقاسات متسقة؟ | هل الميول منطقية؟ | هل يوجد تعارض بين مقطعين؟`;
};

// ── نظام الاستخراج السريع المحسّن للبنية التحتية ──
const SYS_FAST = (cfg, info, drawTypes, scales, projectCtx) => {
  const typeHint = drawTypes.length ? `أنواع محتملة (من التحليل المسبق): ${drawTypes.join(" | ")}` : "";
  const scaleHint = scales.length ? `مقاييس مكتشفة: ${scales.join(", ")}` : "";
  return `أنت محرك ALIMTYAZ للاستخراج السريع v3 — متخصص في البنية التحتية السعودية.
${cfg} | ${info}
${typeHint}${scaleHint ? "\n"+scaleHint : ""}
${projectCtx}
تتلقى نصاً خاماً من PDF هندسي/تجاري.

══ خطوات العمل ══
١ حدّد نوع الوثيقة: [PLN] مسقط | [PRF] قطاع طولي | [XSC] قطاع عرضي | [BOQ] كميات | [MHC] جداول | [SPC] مواصفات | [MAR] بحري | [RD] طريق
٢ استخرج المقياس إن وجد (1:X) → أهمية قصوى لحساب الكميات
٣ استخرج الكميات مع معادلاتها (اكتب [مستنتج] أو [قطع جزئي])
٤ جدول أقطار الأنابيب المكتشفة:
  | القطر | المادة | الطول التقديري م.ط | PN/SN | المنسوب |
٥ BOQ جزئي:
  | الكود KSA | الوصف | الوحدة | الكمية | سعر SAR | إجمالي SAR | الثقة |
  ${SAR_REF_2025}
٦ مناسيب IL/GL المكتشفة | أعماق الحفر التقديرية
٧ أي تعارض أو معلومة غامضة → اذكرها صراحة
خلاصة الدُفعة: أهم 3 نتائج + الإجمالي التقديري SAR`;
};

const SYS_HYBRID = (cfg, info, drawTypes, projectCtx) => `أنت محرك ALIMTYAZ للتحليل المدمج v3 (نص + صورة بصرية).
${cfg} | ${info}
${drawTypes.length ? `أنواع متوقعة: ${drawTypes.join(" | ")}` : ""}
${projectCtx}
الاستراتيجية:
① الصورة: تحديد نوع المخطط + استخراج الأبعاد الرسومية + المقياس + أنماط الأنابيب
② النص: استخراج الأرقام الدقيقة + الكودات + المناسيب + جداول المواصفات
③ الدمج: BOQ كامل بترميز KSA + التحقق من التطابق
تحقق: هل الأرقام النصية متوافقة مع الأبعاد البصرية؟ أبلغ عن أي تناقض.
${SAR_REF_2025}`;

const SYS_MERGE = (projectCtx="",drawTypeSummary="") => `أنت محرك ALIMTYAZ للدمج والتوحيد النهائي v3.
لديك نتائج تحليل من دُفعات متعددة لنفس الملف.
${projectCtx}
${drawTypeSummary ? `أنواع المخططات المحللة: ${drawTypeSummary}` : ""}

══ خطوات الدمج (إلزامية) ══
١ BOQ الموحد النهائي:
  - اجمع الكميات المتطابقة (نفس الكود KSA أو نفس الوصف والوحدة)
  - أزل التكرار الحرفي بالكامل
  - وحّد الأسعار بالمتوسط المرجّح بالكمية
  - أضف عمود "المصدر" (رقم الدُفعة/اللوحة)
  | الكود KSA | الوصف | الوحدة | الكمية | سعر SAR | إجمالي SAR | المصدر | الثقة |

٢ التحقق من الاتساق بين المخططات:
  - هل أطوال الأنابيب في المسقط تتطابق مع القطاع الطولي؟
  - هل أعماق الغرف في الجدول تتطابق مع القطاع الطولي؟
  - هل سماكات الرصف في القطاع العرضي تتطابق مع BOQ؟
  - أبلغ عن أي تعارض صراحةً مع تقدير التأثير بـ SAR

٣ التكاليف الكلية + الحساسية ±5% ±10% ±15%
  | البند | SAR | % |
  تكاليف مباشرة | مصاريف عامة 12% | أرباح 8% | احتياطي مخاطر 5% | المجموع

٤ سجل المخاطر الموحد (مرتّب تنازلياً بالدرجة):
  | الكود | الخطر | الاحتمال/5 | التأثير/5 | الدرجة | SAR | الإجراء |

٥ KPIs المشروع:
  | المؤشر | القيمة | الوحدة |
  إجمالي طول الأنابيب | متوسط عمق الحفر | تكلفة/م.ط | عدد الغرف | إجمالي الخرسانة | إجمالي الحفر | التكلفة الكلية

٦ أهم 5 توصيات نهائية قابلة للتنفيذ الفوري

أنتج تقريراً احترافياً بجداول كاملة ومرتبة.`;



// ═══════════════════════════════════════════════════════════════════════════
//  PDF.JS
// ═══════════════════════════════════════════════════════════════════════════
let _pdf = null;
async function loadPdf() {
  if (_pdf) return _pdf;
  if (window.pdfjsLib) { _pdf = window.pdfjsLib; return _pdf; }
  await new Promise((ok, err) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = ok; s.onerror = err;
    document.head.appendChild(s);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  _pdf = window.pdfjsLib; return _pdf;
}
async function openPdf(file) {
  const lib = await loadPdf();
  const buf = await file.arrayBuffer();
  const doc = await lib.getDocument({ data: buf }).promise;
  return { doc, numPages: doc.numPages };
}

// ── استخراج ذكي للصفحة مع تحليل البنية التحتية ──
async function extractPageData(doc, pageNum, maxChars = 3000) {
  const page = await doc.getPage(pageNum);
  const tc   = await page.getTextContent();
  const items = tc.items || [];
  const rows  = {};
  items.forEach(item => {
    const y = Math.round(item.transform[5] / 5) * 5;
    if (!rows[y]) rows[y] = [];
    rows[y].push({ x: item.transform[4], text: item.str.trim() });
  });
  const lines = Object.entries(rows)
    .sort(([a],[b]) => +b - +a)
    .map(([,cells]) => cells.sort((a,b)=>a.x-b.x).map(c=>c.text).filter(Boolean).join("  "))
    .filter(Boolean);
  const tableLines = lines.filter(l => { const p = l.split(/\s{2,}/); return p.length >= 3 && p.some(x=>/\d/.test(x)); });
  const numLines   = lines.filter(l => /\d+[.,]\d+/.test(l) || /SAR|ريال|م²|م³|لم|طم|كم/.test(l));
  let annotations = [];
  try {
    const anns = await page.getAnnotations();
    annotations = anns.filter(a=>a.contents||a.subtype==="Text").map(a=>a.contents||"").filter(Boolean);
  } catch {}
  const vp  = page.getViewport({ scale: 1 });
  const raw = lines.join("\n");
  const fullText = raw + (annotations.length ? "\n"+annotations.join(" ") : "");
  // Smart token budget
  const text = raw.length > maxChars ? raw.slice(0, maxChars) + `\n[... +${raw.length-maxChars} حرف محذوف]` : raw;
  page.cleanup?.();

  // ── تحليل البنية التحتية ──
  const drawingType = detectDrawingType(fullText);
  const scale       = detectScale(fullText);
  const diameters   = extractPipeDiameters(fullText);
  const invertLevels= extractInvertLevels(fullText);

  // ── كثافة محسّنة تشمل مؤشرات البنية التحتية ──
  const infraScore = (diameters.length > 0 ? 1 : 0) + (invertLevels.length > 2 ? 1 : 0) + (scale ? 1 : 0);
  const rawDensity = Math.min(3, Math.floor((tableLines.length * 2 + numLines.length) / 5));
  const density    = Math.min(3, rawDensity + (infraScore > 1 ? 1 : 0));

  return {
    pageNum,
    dims: `${Math.round(vp.width)}×${Math.round(vp.height)}pt`,
    text,
    tableLines: tableLines.join("\n"),
    annotations: annotations.join(" | "),
    charCount: raw.length,
    lineCount: lines.length,
    tableCount: tableLines.length,
    numCount: numLines.length,
    density,
    // ── بيانات البنية التحتية ──
    drawingType,
    scale,
    diameters,
    invertLevels,
  };
}

async function renderThumb(doc, p) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 0.14 });
  const cv = document.createElement("canvas");
  cv.width = vp.width; cv.height = vp.height;
  await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
  const url = cv.toDataURL("image/jpeg", 0.55);
  cv.width = 0; cv.height = 0;
  return url;
}

// ── IMPROVEMENT 9: Full-page preview render ──
async function renderPreview(doc, p, scale = 1.2) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale });
  const cv = document.createElement("canvas");
  cv.width = vp.width; cv.height = vp.height;
  await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
  const url = cv.toDataURL("image/jpeg", 0.88);
  cv.width = 0; cv.height = 0;
  return url;
}

async function renderPageImg(doc, p, scale=1.5, q=0.85) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale });
  const cv = document.createElement("canvas");
  cv.width = vp.width; cv.height = vp.height;
  await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
  const b64 = cv.toDataURL("image/jpeg", q).split(",")[1];
  cv.width = 0; cv.height = 0;
  return b64;
}

// ── IMPROVEMENT 2: API call with retry + rate-limit handling ──
async function apiCall(body, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        // Rate limit — exponential backoff
        const wait = Math.min(60000, 4000 * Math.pow(2, attempt));
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (!res.ok && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      const data = await res.json();
      data._attempt = attempt;
      return data;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

function parseRange(str, max) {
  const s = new Set();
  str.split(",").forEach(seg => {
    const m = seg.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return;
    const a = +m[1], b = m[2] ? +m[2] : a;
    for (let i=Math.min(a,b); i<=Math.min(Math.max(a,b),max); i++) s.add(i);
  });
  return [...s].sort((a,b)=>a-b);
}

const fmtT = s => s<60?`${s}ث`:s<3600?`${Math.round(s/60)}د`:`${(s/3600).toFixed(1)}س`;
const fmtN = n => n>=1e6?(n/1e6).toFixed(1)+"م":n>=1e3?(n/1e3).toFixed(0)+"ك":String(n);
// ── IMPROVEMENT 10: Token → cost estimate (rough) ──
const tokCost = t => t > 0 ? `~${(t * 0.000003).toFixed(4)}$` : "";

const DWG_V = {"AC1006":"R10","AC1009":"R12","AC1012":"R13","AC1014":"R14","AC1015":"2000","AC1018":"2004","AC1021":"2007","AC1024":"2010","AC1027":"2013","AC1032":"2018","AC1037":"2023"};
async function parseDWG(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const b = new Uint8Array(e.target.result);
        const v = String.fromCharCode(...b.slice(0,6));
        res({ ok:true, version:DWG_V[v]||`Unknown(${v})`, verCode:v, fileSizeKB:Math.round(e.target.result.byteLength/1024), name:file.name });
      } catch(err) { res({ ok:false, error:err.message, name:file.name }); }
    };
    r.readAsArrayBuffer(file);
  });
}

// ── IMPROVEMENT 6: Multi-format export helpers ──
function extractAllTables(msgs) {
  return msgs.filter(m=>m.role==="assistant").map(m=>typeof m.content==="string"?m.content:"").join("\n");
}
function exportCSV(msgs, fname="BOQ_ALIMTYAZ_v7") {
  const text = extractAllTables(msgs);
  const rows = text.split("\n").filter(l=>l.includes("|")&&!l.match(/^[\|\-\s:]+$/));
  const csv  = rows.map(r=>r.split("|").map(c=>`"${c.trim()}"`).filter((_,i,a)=>i>0&&i<a.length-1).join(",")).join("\n");
  dl(new Blob(["\uFEFF"+csv],{type:"text/csv"}), fname+".csv");
}
function exportJSON(msgs, feState, cfgLabel) {
  const data = {
    system:"ALIMTYAZ v7", config:cfgLabel, exported:new Date().toISOString(),
    summary:{ totalMessages:msgs.length, totalTokens:msgs.reduce((s,m)=>s+(m.tokens||0),0), chunks:feState?.chunks?.length||0 },
    messages: msgs.filter(m=>m.role==="assistant").map(m=>({ label:m.chunkLabel||"chat", content:m.content, tokens:m.tokens||0, isMerged:!!m.isMerged })),
  };
  dl(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}), (fname||"BOQ")+"_ALIMTYAZ_v7.json");
}
function exportMD(msgs, cfgLabel) {
  const text = `# تقرير ALIMTYAZ v7\n**الإعداد:** ${cfgLabel}\n**التاريخ:** ${new Date().toLocaleString("ar-SA")}\n\n---\n\n` +
    msgs.filter(m=>m.role==="assistant").map(m=>`## ${m.chunkLabel||"تحليل"}\n\n${m.content}`).join("\n\n---\n\n");
  dl(new Blob([text],{type:"text/markdown"}), "Report_ALIMTYAZ_v7.md");
}
function exportTXT(feState) {
  if (!feState?.extractedData) return;
  const lines = Object.entries(feState.extractedData).sort(([a],[b])=>+a-+b).map(([p,d])=>`${"=".repeat(50)}\nصفحة ${p} | ${d.dims} | ${d.lineCount} سطر\n${"=".repeat(50)}\n${d.text}\n`).join("\n");
  dl(new Blob([lines],{type:"text/plain;charset=utf-8"}), "ExtractedText_ALIMTYAZ_v7.txt");
}
function dl(blob, name) {
  Object.assign(document.createElement("a"),{href:URL.createObjectURL(blob),download:name}).click();
}
let fname = "BOQ";

// ── Markdown renderer ──
function md(text) {
  if (!text) return "";
  let h = text;
  h = h.replace(/(\|.+\|\n?)+/g, tb => {
    const rows=tb.trim().split("\n").filter(r=>r.trim());
    if(rows.length<2) return tb;
    const isSep=r=>/^\|[\s\-:|]+\|/.test(r);
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
const CFG_O = {
  authority:   ["بلدية / أمانة","وزارة النقل MOT","NWC شركة المياه","الهيئة الملكية","مطور خاص","حكومي مختلط"],
  projectType: ["بنية تحتية متكاملة","طرق وأكتاف","مرافق (ماء/صرف)","إنشائي صناعي","تطوير ميغا"],
  roleMode:    ["مقاول رئيسي","استشاري / مراجعة","مالك مشروع","مراجعة تكاليف"],
  zoneStr:     ["ZA/ZB/ZC","ZA فقط","ZB فقط","ZC فقط","Custom"],
};
const MODS_O = {
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
  {i:"📉",l:"قطاع طولي",         p:"حلّل القطاع الطولي: منسوب GL و IL لكل غرفة | ميل الأنبوب (‰) | طول كل وصلة | أعماق الحفر (GL–IL) | جدول الغرف الكامل | تنبيه عن أي ميل < 2‰ أو > 15‰."},
  {i:"✂️",l:"قطاع عرضي",         p:"حلّل القطاع العرضي: عرض الطريق/الخندق | طبقات الرصف (material/thickness) | الميل العرضي | متطلبات MOT | حجم الحفر/م.ط بالمعادلة الصريحة."},
  {i:"🏗️",l:"كميات الحفر",      p:"جدول كميات الحفر والردم المفصّل: حفر خنادق، حفر عام، ردم داخلي، ردم رملي، تخلص بعيد — بالم³ مع الكود KSA والمعادلات."},
  {i:"📊",l:"ملخص تنفيذي",      p:"ملخص تنفيذي 5 نقاط: حجم العمل، التكلفة الإجمالية SAR، المخاطر الرئيسية، فرص التوفير، توصيات القرار الفوري."},
  {i:"🔤",l:"OCR نصوص",         p:"استخرج منظماً: Title Block | الأبعاد الكاملة | أقطار الأنابيب (Ø/مادة/PN/منسوب) | مستويات GL,IL,EGL,TW,INV | الإحداثيات | الاختصارات مع معانيها."},
  {i:"🌊",l:"تصريف بحري",        p:"حلّل منظومة التصريف البحري: خط الـ outfall (Ø، مادة، طول، عمق تغطية) | موزعات الـ diffuser | الحماية الكاثودية | الامتثال لـ PME | BOQ مفصّل."},
  {i:"🔩",l:"جدول غرف MH",       p:"استخرج جدول الغرف الكامل: رقم الغرفة | Inv In/Out | منسوب GL | قطر الغرفة | النوع | إحداثيات X,Y | الملاحظات | BOQ تجميعي."},
];
const FT = {image:{c:"#2563eb",i:"🖼️"},pdf:{c:"#dc2626",i:"📄"},dwg:{c:"#16a34a",i:"📐"}};
const QP = {
  fast:    {scale:0,   quality:0,    label:"⚡ نصي سريع",    desc:"100× أسرع، نصوص وجداول",   tokEst:200,  parallel:3},
  hybrid:  {scale:0.5, quality:0.65, label:"🔀 مدمج",        desc:"نص + صورة مصغرة",           tokEst:500,  parallel:2},
  draft:   {scale:0.9, quality:0.70, label:"🖼️ بصري سريع",  desc:"مخططات عامة",              tokEst:700,  parallel:1},
  standard:{scale:1.5, quality:0.85, label:"📊 بصري قياسي",  desc:"جودة متوازنة",              tokEst:1300, parallel:1},
  infra:   {scale:2.2, quality:0.90, label:"🏗️ بنية تحتية",  desc:"مُحسَّن لـ plan+profile+section",tokEst:1800,parallel:1},
  high:    {scale:2.8, quality:0.94, label:"🔬 بصري عالي",   desc:"أعلى دقة — مخططات التفصيل",tokEst:2400, parallel:1},
};
// ── density helpers (theme-aware) ──
const densityColor = (d, dark=false) => d>=3?"#16a34a":d>=2?"#ca8a04":d>=1?"#2563eb":"#9ca3af";
const densityLabel = d => d>=3?"🔥 غني":d>=2?"📊 متوسط":d>=1?"📄 خفيف":"⬜ فارغ";

// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
//  PDF NAVIGATOR — standalone component (prevents re-creation on every render)
// ═══════════════════════════════════════════════════════════════════════════
function PdfNav({sess, T, selPages, setPdfSess, loadThumbs, openPreview}) {
  const[scroll,setScroll]=useState(0);
  const TH=88,VIS=20;
  const sp=selPages(sess);
  const spSet=new Set(sp);
  const viewStart=Math.floor(scroll/TH);
  const viewEnd=Math.min(viewStart+VIS,sess.numPages);
  const visPgs=Array.from({length:viewEnd-viewStart},(_,i)=>viewStart+i+1);
  useEffect(()=>{
    const miss=visPgs.filter(p=>!sess.thumbsLoaded.has(p));
    if(miss.length)loadThumbs(sess.doc,miss);
  },[scroll]);
  const toggle=p=>setPdfSess(prev=>{
    const cur=new Set(prev.selPages);cur.has(p)?cur.delete(p):cur.add(p);
    return{...prev,selPages:[...cur].sort((a,b)=>a-b),mode:"custom"};
  });
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"4px 7px",borderBottom:`1px solid ${T.bd}`,display:"flex",gap:5,flexShrink:0}}>
        <span style={{fontSize:9,color:T.gold,fontWeight:700}}>{fmtN(sess.numPages)}ص</span>
        <span style={{fontSize:9,color:T.t3}}>✓{sp.length}</span>
        <span style={{fontSize:9,color:T.grn}}>÷{Math.ceil(sp.length/(sess.chunkSize||20))}</span>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"3px"}}
        onScroll={e=>{
          const sc=e.target.scrollTop;setScroll(sc);
          const ns=Math.floor(sc/TH);
          const ahead=Array.from({length:40},(_,i)=>ns+i+1).filter(p=>p>=1&&p<=sess.numPages&&!sess.thumbsLoaded.has(p));
          if(ahead.length)loadThumbs(sess.doc,ahead);
        }}>
        <div style={{height:sess.numPages*TH,position:"relative"}}>
          {visPgs.map(p=>{
            const dens=sess.densities?.[p]??-1;
            const dc=dens>=0?densityColor(dens):T.bd;
            return(
              <div key={p} style={{position:"absolute",top:(p-1)*TH,left:0,right:0,padding:"2px"}}>
                <div style={{borderRadius:7,border:`2px solid ${spSet.has(p)?T.gold:dc}`,overflow:"hidden",
                  background:T.bg2,cursor:"pointer",transition:"border .15s",display:"flex",gap:4,alignItems:"center",padding:"3px 4px",boxShadow:spSet.has(p)?`0 0 6px ${T.gold}30`:"none"}} onClick={()=>toggle(p)}>
                  {sess.thumbs[p]
                    ?<img src={sess.thumbs[p]} style={{width:42,height:56,objectFit:"contain",borderRadius:3,flexShrink:0}} onDoubleClick={e=>{e.stopPropagation();openPreview(p);}}/>
                    :<div style={{width:42,height:56,background:T.bg3,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:T.t3}}>⏳</div>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:9,color:spSet.has(p)?T.gold:T.t2,fontWeight:700}}>ص{p}</div>
                    {dens>=0&&<div style={{fontSize:7,color:dc}}>{densityLabel(dens)}</div>}
                    {spSet.has(p)&&<div style={{fontSize:7,color:T.gold,fontWeight:700}}>✓</div>}
                    <div onClick={e=>{e.stopPropagation();openPreview(p);}} style={{fontSize:8,cursor:"pointer",marginTop:1,opacity:.6}} title="معاينة">🔍</div>
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

//  MAIN COMPONENT — v7
// ═══════════════════════════════════════════════════════════════════════════
export default function AlimtyazV9() {
  const [tab,      setTab]     = useState("config");   // config|pdf|analysis
  const [cfg,      setCfg]     = useState({authority:0,projectType:0,roleMode:0,zoneStr:0});
  const [mods,     setMods]    = useState({});
  const [depth,    setDepth]   = useState("standard");
  const [ocr,      setOcr]     = useState(false);
  const [queue,    setQueue]   = useState([]);
  const [qIdx,     setQIdx]    = useState(0);
  const [pdfSess,  setPdfSess] = useState(null);
  const [feState,  setFe]      = useState(null);
  const [proc,     setProc]    = useState(null);
  const [prompt,   setPrompt]  = useState("");
  const [msgs,     setMsgs]    = useState([]);
  const [loading,  setLoading] = useState(false);
  const [lmsg,     setLmsg]    = useState("");
  const [drag,     setDrag]    = useState(false);
  const [xStats,   setXStats]  = useState(null);
  const [infraMeta,setInfraMeta]=useState(null); // {drawTypes,scales,diameters,projectCtx}
  const [preview,  setPreview] = useState(null);
  const [search,   setSearch]  = useState("");
  const [searchOn, setSearchOn]= useState(false);
  const [collapsed,setCollapsed]=useState(new Set());
  const [resumable,setResumable]=useState(null);
  const [sideOpen, setSideOpen]= useState(true);
  const [darkMode, setDarkMode]= useState(false);
  const [copiedIdx, setCopiedIdx]=useState(-1);
  const totalTokens = useMemo(()=>msgs.reduce((s,m)=>s+(m.tokens||0),0),[msgs]);
  const boqCount    = useMemo(()=>(msgs.filter(m=>m.role==="assistant").map(m=>m.content||"").join("\n").match(/KSA-[A-Z]{2,6}-/g)||[]).length,[msgs]);

  const cancelRef = useRef(false);
  const fileRef   = useRef();
  const chatRef   = useRef();

  // Persistence
  useEffect(()=>{
    (async()=>{
      try {
        const r=await window.storage?.get("alimtyaz_v7");
        if(r?.value){const s=JSON.parse(r.value);if(s.cfg)setCfg(s.cfg);if(s.mods)setMods(s.mods);if(s.depth)setDepth(s.depth);}
        const rr=await window.storage?.get("alimtyaz_v7_batch");
        if(rr?.value){const b=JSON.parse(rr.value);if(b.partialResults?.length>0)setResumable(b);}
      }catch{}
    })();
  },[]);
  const save = async(c,m,d)=>{try{await window.storage?.set("alimtyaz_v7",JSON.stringify({cfg:c,mods:m,depth:d}));}catch{}};
  const saveBatch=async(b)=>{try{await window.storage?.set("alimtyaz_v7_batch",JSON.stringify(b));}catch{}};
  const clearBatch=async()=>{try{await window.storage?.delete("alimtyaz_v7_batch");}catch{}};

  const cfgStr=useCallback(()=>{
    const ml=Object.entries(mods).filter(([,v])=>v).map(([k])=>k.split("_").slice(1).join(" "));
    return `الجهة:${CFG_O.authority[cfg.authority]}|النوع:${CFG_O.projectType[cfg.projectType]}|الدور:${CFG_O.roleMode[cfg.roleMode]}|المناطق:${CFG_O.zoneStr[cfg.zoneStr]}|الوحدات:${ml.join(",")|| "الكل"}`;
  },[cfg,mods]);

  // Thumbnail loader
  const loadThumbs=useCallback(async(doc,pages)=>{
    for(const p of pages){
      if(cancelRef.current)break;
      try{
        const url=await renderThumb(doc,p);
        setPdfSess(prev=>{
          if(!prev)return prev;
          return{...prev,thumbs:{...prev.thumbs,[p]:url},thumbsLoaded:new Set([...prev.thumbsLoaded,p])};
        });
      }catch{}
      await new Promise(r=>setTimeout(r,0));
    }
  },[]);

  // File handler
  const handleFiles=useCallback(async(files)=>{
    for(const file of Array.from(files||[])){
      const n=file.name.toLowerCase();
      if(file.type.startsWith("image/")||n.endsWith(".webp")||n.endsWith(".avif")){
        const reader=new FileReader();
        reader.onload=e=>{setQueue(prev=>[...prev,{src:e.target.result,b64:e.target.result.split(",")[1],mime:file.type||"image/jpeg",name:file.name,type:"image"}]);};
        reader.readAsDataURL(file);
        setTab("analysis");
      }else if(file.type==="application/pdf"||n.endsWith(".pdf")){
        setProc({stage:"⏳ فتح الملف...",pct:5});
        try{
          const{doc,numPages}=await openPdf(file);
          setProc(null);
          fname=file.name.replace(/\.pdf$/i,"");
          setPdfSess({file,doc,numPages,thumbs:{},thumbsLoaded:new Set(),mode:"range",
            rangeStr:`1-${Math.min(numPages,100)}`,selPages:[],chunkSize:20,quality:"fast",densities:{}});
          setTab("pdf");
          loadThumbs(doc,Array.from({length:Math.min(60,numPages)},(_,i)=>i+1));
        }catch(err){setProc(null);pushMsg("assistant",`❌ خطأ في فتح PDF: ${err.message}`);}
      }else if(n.endsWith(".dwg")||n.endsWith(".dxf")){
        const meta=await parseDWG(file);
        const cv=document.createElement("canvas");cv.width=520;cv.height=200;
        const ctx=cv.getContext("2d");
        ctx.fillStyle="#f0fdf4";ctx.fillRect(0,0,520,200);
        ctx.strokeStyle="#16a34a";ctx.lineWidth=2;ctx.strokeRect(8,8,504,184);
        ctx.font="bold 22px sans-serif";ctx.textAlign="center";ctx.fillStyle="#15803d";ctx.fillText("📐 AutoCAD DWG / DXF",260,46);
        ctx.font="12px monospace";ctx.textAlign="right";
        [["الملف:",meta.name],["الإصدار:",`${meta.version} (${meta.verCode})`],["الحجم:",`${meta.fileSizeKB} KB`],["الحالة:",meta.ok?"✅ تم":"⚠️ "+meta.error]].forEach(([k,v],i)=>{
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

  const pushMsg=(role,content,extra={})=>setMsgs(prev=>[...prev,{role,content,...extra}]);

  const selPages=useCallback((sess)=>{
    if(!sess)return[];
    if(sess.mode==="all")return Array.from({length:sess.numPages},(_,i)=>i+1);
    if(sess.mode==="custom")return sess.selPages;
    return parseRange(sess.rangeStr,sess.numPages);
  },[]);

  // ── IMPROVEMENT 12: smart auto chunk size based on avg density ──
  const suggestChunkSize = useCallback((densities, pages) => {
    if(!pages.length)return 20;
    const avg = pages.reduce((s,p)=>s+(densities[p]||0),0)/pages.length;
    if(avg>=2.5)return 10; // rich content — small chunks
    if(avg>=1.5)return 15;
    if(avg>=0.5)return 25; // moderate
    return 30;             // sparse/empty — large chunks
  },[]);

  // ═══════════════════════════════════════════════════════════════════════
  //  ANALYSIS ENGINE v9 — Parallel + Context-Aware + Infrastructure
  // ═══════════════════════════════════════════════════════════════════════
  const runExtraction=useCallback(async(resumeFrom=null)=>{
    if(!pdfSess)return;
    const pages=selPages(pdfSess);
    if(!pages.length)return;
    const{doc,chunkSize,quality,file}=pdfSess;
    const isFast=quality==="fast"||quality==="hybrid";
    const isHybrid=quality==="hybrid";
    const isVisual=!isFast; // draft / standard / infra / high
    const preset=QP[quality]||QP.standard;
    const parallelCount=preset.parallel||1;
    cancelRef.current=false;
    const t0=Date.now();

    const chunks=[];
    for(let i=0;i<pages.length;i+=chunkSize)chunks.push(pages.slice(i,i+chunkSize));

    setFe({phase:"extracting",total:pages.length,extracted:0,analyzed:0,
      chunks:[],results:[],merged:null,stage:"🚀 بدء...",eta:null,startTime:t0,extractedData:{},speed:0});
    setTab("analysis");

    const cs=cfgStr();
    const allResults=resumeFrom||[];
    let extractedData={};

    // ══ PHASE 1: TEXT EXTRACTION + INFRA METADATA ══════════════════════
    if(isFast||quality==="infra"||isVisual){
      setFe(p=>({...p,stage:`⚡ استخراج ومصنّفة ${fmtN(pages.length)} صفحة...`}));
      let extracted=0;
      const XBATCH=40;
      const maxCharsPerPage = Math.min(3000, Math.round(15000/chunkSize));
      for(let xi=0;xi<pages.length;xi+=XBATCH){
        if(cancelRef.current)break;
        const batch=pages.slice(xi,xi+XBATCH);
        const res=await Promise.all(batch.map(p=>extractPageData(doc,p,maxCharsPerPage).catch(()=>({pageNum:p,text:"",tableLines:"",annotations:"",charCount:0,lineCount:0,tableCount:0,numCount:0,density:0,drawingType:null,scale:null,diameters:[],invertLevels:[]}))));
        res.forEach(r=>{extractedData[r.pageNum]=r;});
        extracted+=batch.length;
        const elapsed=(Date.now()-t0)/1000;
        const spd=Math.round(extracted/Math.max(elapsed,0.1));
        const eta=extracted>0?Math.round((elapsed/extracted)*(pages.length-extracted)):null;
        setFe(p=>({...p,extracted,eta,speed:spd,stage:`⚡ استخراج+تصنيف: ${extracted}/${pages.length} (${Math.round(extracted/pages.length*100)}%) — ${spd}ص/ث`,extractedData:{...p.extractedData,...extractedData}}));
        await new Promise(r=>setTimeout(r,0));
      }

      // ── تحليل بيانات البنية التحتية من الاستخراج ──
      const densMap={};
      const allDiams=new Set();
      const allScales=new Set();
      const typeCount={};
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
      setPdfSess(prev=>({...prev,densities:densMap}));
      setInfraMeta({
        drawTypes:topTypes,
        scales:[...allScales],
        diameters:[...allDiams].sort((a,b)=>a-b),
        typeCount,
        extractedData,
      });
    }

    // ══ PHASE 2: AI ANALYSIS — Parallel + Context-Aware ════════════════
    const startChunkIdx=resumeFrom?allResults.length:0;
    const preChunks = resumeFrom
      ? resumeFrom.map((r,ci)=>({label:r.chunk,status:r.reply.startsWith("❌")?"error":"done",ci,tokens:r.tokens||0}))
      : [];
    setFe(p=>({...p,phase:"analyzing",stage:`🤖 تحليل ${chunks.length} دُفعة (${parallelCount > 1 ? `${parallelCount} متوازية` : "متسلسل"})...`,chunks:preChunks,analyzed:startChunkIdx*chunkSize}));

    // ── Parallel chunk processor ──
    const processChunk = async (ci) => {
      const chunk=chunks[ci];
      const chunkLabel=chunk.length===1?`ص${chunk[0]}`:`ص${chunk[0]}–${chunk[chunk.length-1]}`;

      // ── حقن سياق المشروع من النتائج السابقة ──
      const projectCtx = buildProjectContext(allResults.slice(0, ci));

      // ── كشف أنواع المخططات في هذه الدُفعة ──
      const chunkDrawTypes = [...new Set(chunk.map(p=>extractedData[p]?.drawingType).filter(Boolean))];
      const chunkScales = [...new Set(chunk.map(p=>extractedData[p]?.scale).filter(Boolean))];
      const chunkDiams = [...new Set(chunk.flatMap(p=>extractedData[p]?.diameters||[]))].sort((a,b)=>a-b);

      setFe(p=>({...p,stage:`🤖 دُفعة ${ci+1}/${chunks.length} (${chunkLabel}) ${chunkDrawTypes.map(t=>DRAW_TYPES[t]?.code||t).join("+")||""}`,
        chunks:[...p.chunks,{label:chunkLabel,status:"analyzing",ci,drawTypes:chunkDrawTypes}]}));

      const content=[];

      if(isFast){
        let payload=`=== دُفعة ${ci+1}/${chunks.length} — ${chunkLabel} ===\nملف: ${file.name}\n`;
        if(chunkDrawTypes.length) payload+=`الأنواع: ${chunkDrawTypes.map(t=>DRAW_TYPES[t]?.ar||t).join(" | ")}\n`;
        if(chunkScales.length) payload+=`المقاييس: ${chunkScales.join(", ")}\n`;
        if(chunkDiams.length) payload+=`أقطار مكتشفة: ${chunkDiams.join(", ")}mm\n`;
        payload+="\n";
        const maxCharsPerPage=Math.round(15000/chunkSize);
        for(const p of chunk){
          const d=extractedData[p]||{};
          if(!d.charCount)continue;
          const typeTag=d.drawingType?`[${DRAW_TYPES[d.drawingType]?.code||d.drawingType}]`:"";
          const scaleTag=d.scale?`مقياس:${d.scale}`:"";
          const diamTag=d.diameters?.length?`أقطار:${d.diameters.join(",")}mm`:"";
          payload+=`${"═".repeat(36)}\n📄 ص${p} ${typeTag} ${scaleTag} ${diamTag}\n${d.dims||""}|${d.lineCount||0}سطر|كثافة:${densityLabel(d.density||0)}\n${"═".repeat(36)}\n`;
          if(d.text)payload+=d.text.slice(0,maxCharsPerPage)+"\n";
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
        // Visual analysis — render pages at preset quality
        for(const p of chunk){
          if(cancelRef.current)break;
          try{
            setFe(prev=>({...prev,stage:`🖼️ تحويل ص${p} (${DRAW_TYPES[extractedData[p]?.drawingType]?.code||"?"})...`}));
            const b64=await renderPageImg(doc,p,preset.scale,preset.quality);
            content.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}});
          }catch{}
          await new Promise(r=>setTimeout(r,0));
        }
        const typeNote=chunkDrawTypes.map(t=>DRAW_TYPES[t]?.ar||t).join(" + ")||"بنية تحتية";
        const scaleNote=chunkScales.length?`المقياس: ${chunkScales[0]}`:"";
        content.push({type:"text",text:`حلّل ${typeNote} (${chunkLabel}) من "${file.name}". ${scaleNote}\nBOQ مع تسمية [${chunkLabel}] + تحقق من الامتثال.`});
      }

      if(!content.length||cancelRef.current){
        return {chunk:chunkLabel,reply:"⏭ تخطي",tokens:0,ci};
      }

      try{
        const infoStr=`صفحات:${chunkLabel}|دُفعة:${ci+1}/${chunks.length}|ملف:${file.name}|إجمالي:${pages.length}`;
        let sysP;
        if(isHybrid)    sysP=SYS_HYBRID(cs,infoStr,chunkDrawTypes,projectCtx);
        else if(isFast) sysP=SYS_FAST(cs,infoStr,chunkDrawTypes,chunkScales,projectCtx);
        else            sysP=SYS_VISUAL_INFRA(cs,chunkLabel,chunkDrawTypes,chunkScales[0]||null,projectCtx);

        const data=await apiCall({
          model:"claude-sonnet-4-20250514",
          max_tokens:depth==="deep"?8000:quality==="infra"||quality==="high"?7000:5000,
          system:sysP,
          messages:[{role:"user",content}],
        });
        const reply=data.content?.map(b=>b.text||"").join("")||"لا يوجد رد";
        const toks=data.usage?.output_tokens||0;
        return {chunk:chunkLabel,pages:chunk,reply,tokens:toks,retries:data._attempt||0,drawTypes:chunkDrawTypes,ci};
      }catch(err){
        return {chunk:chunkLabel,pages:chunk,reply:`❌ خطأ: ${err.message}`,tokens:0,error:true,ci};
      }
    };

    // ── التنفيذ: متوازي أو متسلسل حسب الوضع ──
    let ci=startChunkIdx;
    while(ci<chunks.length){
      if(cancelRef.current)break;
      const elapsed=(Date.now()-t0)/1000;
      const pDone=(ci-startChunkIdx)*chunkSize;
      const spd2=elapsed>0?Math.round(pDone/Math.max(elapsed,1)):0;
      const eta=pDone>0?Math.round((elapsed/pDone)*((chunks.length-ci)*chunkSize)):null;
      setFe(p=>({...p,eta,speed:spd2}));

      // جمع الدُفعات للمعالجة المتوازية
      const batch=[];
      for(let j=0;j<parallelCount&&ci+j<chunks.length;j++) batch.push(ci+j);
      ci+=batch.length;

      // تنفيذ متوازٍ
      const batchResults=await Promise.all(batch.map(idx=>processChunk(idx)));

      // تسجيل النتائج بالترتيب الصحيح
      for(const r of batchResults){
        allResults.push(r);
        if(r.error){
          setFe(p=>({...p,chunks:p.chunks.map(c=>c.label===r.chunk?{...c,status:"error"}:c)}));
          pushMsg("assistant",`❌ دُفعة ${r.chunk}: ${r.reply.replace("❌ خطأ: ","")}`);
        }else if(r.reply!=="⏭ تخطي"){
          setFe(p=>({...p,analyzed:p.analyzed+chunks[r.ci]?.length||0,
            results:[...p.results,{chunk:r.chunk,reply:r.reply,tokens:r.tokens}],
            chunks:p.chunks.map(c=>c.label===r.chunk?{...c,status:"done",tokens:r.tokens,drawTypes:r.drawTypes}:c)
          }));
          saveBatch({partialResults:allResults,file:file.name,pages:pages.length,chunkSize,quality,timestamp:Date.now()});
          const typeLabel=r.drawTypes?.map(t=>DRAW_TYPES[t]?.code).filter(Boolean).join("+");
          setMsgs(prev=>[...prev,{role:"assistant",
            content:`## 📄 دُفعة ${r.ci+1}/${chunks.length} — ${r.chunk}${typeLabel?` [${typeLabel}]`:""}${r.retries?` (إعادة×${r.retries})`:""}${batch.length>1?" ⚡🔀":""}  \n\n${r.reply}`,
            tokens:r.tokens,isChunk:true,chunkLabel:r.chunk,isFast:isFast&&!isHybrid,isHybrid}]);
        }
      }
      if(parallelCount===1)await new Promise(r=>setTimeout(r,100));
    }

    if(cancelRef.current){setFe(p=>({...p,phase:"done",stage:"⏹ تم الإيقاف"}));return;}

    // ══ PHASE 3: SMART MERGE ═══════════════════════════════════════════
    const goodResults=allResults.filter(r=>!r.error&&r.reply!=="⏭ تخطي");
    if(goodResults.length>1){
      setFe(p=>({...p,phase:"merging",stage:`🔗 دمج ذكي لـ ${goodResults.length} دُفعة...`}));
      try{
        const projectCtxFinal=buildProjectContext(allResults);
        const drawTypeSummary=[...new Set(allResults.flatMap(r=>r.drawTypes||[]))].map(t=>DRAW_TYPES[t]?.ar||t).join(" | ");
        const mergeText=goodResults.map((r,i)=>`=== دُفعة ${i+1} (${r.chunk}) [${(r.drawTypes||[]).map(t=>DRAW_TYPES[t]?.code||t).join("+")||"?"}] ===\n${r.reply}`).join("\n\n");
        const mData=await apiCall({model:"claude-sonnet-4-20250514",max_tokens:8000,
          system:SYS_MERGE(projectCtxFinal,drawTypeSummary),
          messages:[{role:"user",content:`دمج نتائج "${file.name}" — ${pages.length} صفحة | ${goodResults.length} دُفعة | ${drawTypeSummary||"بنية تحتية"}\n\n${mergeText}`}]});
        const merged=mData.content?.map(b=>b.text||"").join("")||"";
        const elapsed=Math.round((Date.now()-t0)/1000);
        setFe(p=>({...p,phase:"done",merged,stage:`✅ اكتمل: ${pages.length} ص في ${fmtT(elapsed)}`}));
        setMsgs(prev=>[...prev,{role:"assistant",
          content:`## 🔗 التقرير الموحد النهائي\n### ${file.name} — ${pages.length} صفحة | ${goodResults.length} دُفعة | ${drawTypeSummary||""}\n\n${merged}`,
          tokens:mData.usage?.output_tokens,isMerged:true}]);
      }catch(err){
        setFe(p=>({...p,phase:"done",stage:`✅ اكتملت (خطأ دمج: ${err.message})`}));
      }
    }else{
      setFe(p=>({...p,phase:"done",stage:`✅ اكتمل في ${fmtT(Math.round((Date.now()-t0)/1000))}`}));
    }
    await clearBatch();
    setResumable(null);

  },[pdfSess,selPages,cfgStr,depth]);



  // md() result cache — avoids reprocessing same content on every render
  const mdCache = useRef(new Map());
  const mdCached = useCallback((text) => {
    if (!text) return "";
    if (mdCache.current.has(text)) return mdCache.current.get(text);
    const result = md(text);
    if (mdCache.current.size > 200) mdCache.current.clear(); // prevent unbounded growth
    mdCache.current.set(text, result);
    return result;
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTo({top:chatRef.current.scrollHeight,behavior:"smooth"});
  }, [msgs.length]);

  // Single chat message
  const sendMsg=useCallback(async()=>{
    const hasFile=queue.length>0;
    if(!prompt.trim()&&!hasFile)return;
    setLoading(true);
    const active=queue[qIdx]||queue[0];
    const content=[];
    if(active)content.push({type:"image",source:{type:"base64",media_type:active.mime,data:active.b64}});
    content.push({type:"text",text:prompt.trim()||"حلّل هذا المخطط الهندسي بالكامل."});
    const ml=Object.entries(mods).filter(([,v])=>v).map(([k])=>k.split("_").slice(1).join(" "));
    const sys=SYS_MAIN(cfgStr(),depth,ml,ocr);
    const newMsgs=[...msgs,{role:"user",content,displayImage:active?.src,displayText:prompt,fileType:active?.type}];
    setMsgs(newMsgs);setPrompt("");setQueue([]);setQIdx(0);
    const PH=["📐 قراءة المخطط...","🔍 الامتثال السعودي...","📊 استخراج الكميات...","💰 حساب التكاليف...","⚠️ تحليل المخاطر...","✅ التقرير النهائي..."];
    let pi=0;const pt=setInterval(()=>{if(pi<PH.length)setLmsg(PH[pi++]);else clearInterval(pt);},depth==="deep"?3000:2000);
    try{
      // Fix: use m.content directly (both user and assistant content are sent as-is)
      const api=newMsgs.slice(-10).map(m=>({role:m.role,content:m.content}));
      const data=await apiCall({model:"claude-sonnet-4-20250514",max_tokens:depth==="deep"?8000:5000,system:sys,messages:api});
      const reply=data.content?.map(b=>b.text||"").join("")||"لم يتم الحصول على رد.";
      setMsgs(prev=>[...prev,{role:"assistant",content:reply,tokens:data.usage?.output_tokens}]);
    }catch(e){
      setMsgs(prev=>[...prev,{role:"assistant",content:`❌ خطأ في الاتصال: ${e.message}\n\nتحقق من الاتصال بالإنترنت أو حاول مرة أخرى.`}]);
    }finally{
      clearInterval(pt);setLoading(false);setLmsg("");
    }
  },[prompt,queue,qIdx,msgs,mods,depth,ocr,cfgStr]);

  // ── IMPROVEMENT 9: Page preview handler ──
  const openPreview=useCallback(async(p)=>{
    if(!pdfSess)return;
    setPreview({page:p,src:null,loading:true});
    try{const src=await renderPreview(pdfSess.doc,p);setPreview({page:p,src,loading:false});}
    catch{setPreview(null);}
  },[pdfSess]);

  // ── IMPROVEMENT 11: filtered messages for search ──
  const filteredMsgs=useMemo(()=>{
    if(!search.trim())return msgs;
    const q=search.toLowerCase();
    return msgs.filter(m=>(typeof m.content==="string"?m.content:"").toLowerCase().includes(q)||(m.displayText||"").toLowerCase().includes(q));
  },[msgs,search]);

  const copyMsg = useCallback((content, idx) => {
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
    *{box-sizing:border-box}
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:${T.bg3}}
    ::-webkit-scrollbar-thumb{background:${T.gold}55;border-radius:4px}
    ::-webkit-scrollbar-thumb:hover{background:${T.gold}}
    .card{background:${T.card};border:1px solid ${T.bd};border-radius:12px;box-shadow:${T.shadow}}
    .g{color:${T.gold};font-weight:700}
    .bg{background:linear-gradient(135deg,${T.gold},${T.goldL});color:#fff;font-weight:800;border:none;padding:9px 20px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:13px;transition:all .2s;box-shadow:0 2px 10px ${T.gold}30}
    .bg:hover{transform:translateY(-1px);box-shadow:0 5px 18px ${T.gold}50}
    .bg:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
    .bo{background:${T.bg3};color:${T.t2};border:1px solid ${T.bd};padding:6px 13px;border-radius:9px;cursor:pointer;font-family:inherit;font-size:11px;transition:all .18s}
    .bo:hover{background:${T.bg2};border-color:${T.t3};color:${T.t1}}
    .fe-btn{background:linear-gradient(135deg,#064e3b,#065f46);color:#6ee7b7;border:1px solid #059669;padding:9px 18px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:800;transition:all .2s;box-shadow:0 2px 8px #05966920}
    .fe-btn:hover{filter:brightness(1.12);box-shadow:0 4px 16px #05966940;transform:translateY(-1px)}
    .fe-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;filter:none}
    .chip{background:${T.bg3};border:1px solid ${T.bd};color:${T.t2};padding:4px 10px;border-radius:14px;cursor:pointer;font-size:10px;transition:all .18s;display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
    .chip:hover{border-color:${T.t3};color:${T.t1}}
    .chip.on{background:${D?"#1c1404":"#fef3c7"};border-color:${T.gold};color:${T.gold};font-weight:700}
    .fchip{background:${D?"#ecfdf510":"#ecfdf5"};border:1px solid ${D?"#bbf7d030":"#bbf7d0"};color:${T.grn};padding:4px 10px;border-radius:14px;cursor:pointer;font-size:10px;transition:all .18s;display:inline-flex;align-items:center;gap:3px}
    .fchip:hover{border-color:#4ade80}
    .fchip.on{background:${D?"#064e3b":"#dcfce7"};border-color:#16a34a;color:${T.grn};font-weight:700}
    .inp{background:${T.bg3};border:1px solid ${T.bd};color:${T.t1};padding:10px 14px;border-radius:10px;font-family:inherit;font-size:13px;width:100%;resize:none;outline:none;transition:border .2s;line-height:1.8}
    .inp:focus{border-color:${T.gold};box-shadow:0 0 0 3px ${T.gold}18}
    .sinp{background:${T.bg3};border:1px solid ${T.bd};color:${T.t1};padding:5px 10px;border-radius:8px;font-family:inherit;font-size:11px;outline:none;width:150px}
    .sinp:focus{border-color:${T.gold}}
    .sel{background:${T.bg3};border:1px solid ${T.bd};color:${T.t1};padding:8px 11px;border-radius:9px;font-family:inherit;font-size:12px;width:100%;outline:none}
    .sel:focus{border-color:${T.gold}}
    .drop{border:2px dashed ${T.bd};border-radius:12px;padding:12px;text-align:center;transition:all .2s;cursor:pointer}
    .drop:hover,.drop.on{border-color:${T.gold};background:${T.gold}10}
    .db{background:${T.bg3};border:1px solid ${T.bd};color:${T.t2};padding:9px;border-radius:9px;cursor:pointer;font-family:inherit;font-size:10px;transition:all .18s;text-align:center}
    .db:hover{border-color:${T.t3}}
    .db.on{background:${D?"#1c1404":"#fef3c7"};border-color:${T.gold};color:${T.gold};font-weight:700}
    .mu{background:${T.msgUser};border-radius:14px 14px 4px 14px;padding:12px 16px;margin:4px 0;max-width:86%;border:1px solid ${T.bd}}
    .ma{background:${T.msgAi};border-radius:14px 14px 14px 4px;padding:14px 18px;margin:4px 0;width:100%;border:1px solid ${D?"#1a3025":"#bbf7d0"};border-right:3px solid ${T.grn}}
    .mf{background:${T.msgFast};border-radius:14px 14px 14px 4px;padding:14px 18px;margin:4px 0;width:100%;border:1px solid ${D?"#204a25":"#a7f3d0"};border-right:3px solid #22c55e}
    .mh{background:${T.msgHybrid};border-radius:14px 14px 14px 4px;padding:14px 18px;margin:4px 0;width:100%;border:1px solid ${D?"#1a4055":"#bfdbfe"};border-right:3px solid #3b82f6}
    .mm{background:${T.msgMerge};border-radius:16px;padding:16px 20px;margin:6px 0;width:100%;border:2px solid ${D?"#854d0e":"#fcd34d"};border-right:4px solid ${T.gold};box-shadow:0 3px 16px ${T.gold}15}
    .ma .p,.mf .p,.mh .p,.mm .p{margin:5px 0;line-height:1.9;font-size:13px;color:${T.t1}}
    .ma .h1,.mf .h1,.mh .h1,.mm .h1{color:${T.gold};font-size:15px;font-weight:900;margin:13px 0 5px;border-bottom:2px solid ${T.gold}25;padding-bottom:4px}
    .ma .h2,.mf .h2,.mh .h2,.mm .h2{color:${T.gold};font-size:13px;font-weight:700;margin:10px 0 4px}
    .ma .h3,.mf .h3,.mh .h3,.mm .h3{color:${T.grn};font-size:12px;font-weight:700;margin:8px 0 3px}
    .ma .b,.mf .b,.mh .b,.mm .b{color:${T.gold};font-weight:700}
    .ma .code,.mf .code,.mh .code,.mm .code{background:${T.bg3};color:${T.grn};padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid ${T.bd}}
    .ma .li,.mf .li,.mh .li,.mm .li{margin:3px 0;padding-right:8px;color:${T.t1};font-size:12.5px}
    .tw{overflow-x:auto;margin:8px 0;border-radius:8px;border:1px solid ${T.bd}}
    .ma table,.mf table,.mh table,.mm table{border-collapse:collapse;width:100%;min-width:360px;font-size:11.5px}
    .ma th,.mf th,.mh th,.mm th{background:${D?"#0a1f10":"#f0fdf4"};color:${T.gold};padding:7px 11px;text-align:right;border:1px solid ${T.bd};white-space:nowrap;font-weight:700}
    .ma td,.mf td,.mh td,.mm td{padding:6px 11px;text-align:right;border:1px solid ${T.bd};line-height:1.5;color:${T.t1}}
    .ma tr:nth-child(even),.mf tr:nth-child(even),.mh tr:nth-child(even),.mm tr:nth-child(even){background:${T.bg3}}
    .ma tr:hover,.mf tr:hover,.mh tr:hover,.mm tr:hover{background:${D?"#0e2a12":"#f0fdf4"}}
    .bk{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap;margin:1px}
    .ok{background:#dcfce7;color:#15803d}.wn{background:#fef9c3;color:#854d0e}
    .ck{background:#ede9fe;color:#6d28d9}.lo{background:#dcfce7;color:#15803d}
    .me{background:#fef3c7;color:#92400e}.hi{background:#fee2e2;color:#b91c1c}
    .cr{background:#fff1f2;color:#be123c;border:1px solid #fecdd3}
    .inf{background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe}
    .prt{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}
    .nav-i{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:9px;cursor:pointer;transition:all .18s;font-size:12px;color:${T.t2};border:1px solid transparent;margin-bottom:3px;white-space:nowrap}
    .nav-i:hover{background:${T.bg3};color:${T.t1}}
    .nav-i.act{background:${D?"#1c1404":"#fef3c7"};border-color:${T.gold}40;color:${T.gold};font-weight:700}
    .prog{height:6px;background:${T.bg3};border-radius:4px;overflow:hidden}
    .prog-f{height:100%;border-radius:4px;transition:width .4s}
    mark.hl{background:${T.gold}40;border-radius:3px;padding:0 2px;color:${T.gold}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:.25;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}
    @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes grow{0%{width:2%}75%{width:90%}100%{width:95%}}
    @keyframes glow{0%,100%{box-shadow:none}50%{box-shadow:0 0 22px ${T.grn}30}}
    .fi{animation:fi .25s ease forwards}
    .glow{animation:glow 3s ease infinite}
    input[type=number]{-moz-appearance:textfield}
  `,[T,D]);

  const sp=pdfSess?selPages(pdfSess):[];
  const spLen=sp.length;
  const cks=pdfSess?Math.ceil(spLen/(pdfSess.chunkSize||20)):0;
  const estSec=spLen*(pdfSess?.quality==="fast"?0.08:pdfSess?.quality==="hybrid"?0.3:pdfSess?.quality==="draft"?0.9:pdfSess?.quality==="standard"?1.6:3.2)+cks*5;
  const preset=pdfSess?QP[pdfSess.quality]:QP.fast;

  return(
    <div dir="rtl" style={{fontFamily:"'Noto Kufi Arabic','Segoe UI',sans-serif",background:T.bg,minHeight:"100vh",color:T.t1,display:"flex",height:"100vh",overflow:"hidden"}}>
      <style>{css}</style>

      {/* ═══ SIDEBAR ═══ */}
      <div style={{width:sideOpen?192:52,background:T.bar,borderLeft:`1px solid ${T.bd}`,display:"flex",flexDirection:"column",flexShrink:0,transition:"width .22s ease",overflow:"hidden",zIndex:20,boxShadow:D?"2px 0 12px #00000030":"2px 0 12px #0000000a"}}>
        <div style={{padding:"13px 10px",borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{width:34,height:34,background:`linear-gradient(135deg,${T.gold},${T.goldL})`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,boxShadow:`0 2px 8px ${T.gold}30`}}>🏗️</div>
          {sideOpen&&<div>
            <div style={{fontSize:12,fontWeight:900,color:T.gold,letterSpacing:.5}}>ALIMTYAZ</div>
            <div style={{fontSize:7.5,color:T.t3}}>v7 · محرك هندسي سعودي</div>
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
            <div className={`nav-i`} onClick={()=>setDarkMode(v=>!v)} style={{fontSize:11}}>
              <span>{D?"☀️":"🌙"}</span><span>{D?"وضع فاتح":"وضع داكن"}</span>
            </div>
            {msgs.length>0&&<div className="nav-i" onClick={()=>{setMsgs([]);setFe(null);setXStats(null);}} style={{fontSize:11,color:"#ef4444"}}><span>🗑️</span><span>مسح المحادثة</span></div>}
          </div>}
        </div>
        {sideOpen&&(totalTokens>0||boqCount>0)&&<div style={{padding:"8px 10px",borderTop:`1px solid ${T.bd}`,display:"flex",flexDirection:"column",gap:4}}>
          {totalTokens>0&&<div style={{fontSize:8,color:T.t3,display:"flex",justifyContent:"space-between"}}><span>Tokens</span><span style={{color:T.gold,fontWeight:700}}>{totalTokens.toLocaleString()} <span style={{opacity:.7,fontSize:7}}>{tokCost(totalTokens)}</span></span></div>}
          {boqCount>0&&<div style={{fontSize:8,color:T.t3,display:"flex",justifyContent:"space-between"}}><span>بنود BOQ</span><span style={{color:T.grn,fontWeight:700}}>{boqCount}</span></div>}
        </div>}
        <button onClick={()=>setSideOpen(v=>!v)} style={{background:"none",border:"none",borderTop:`1px solid ${T.bd}`,padding:"10px",cursor:"pointer",color:T.t3,fontSize:13,transition:"color .18s",fontFamily:"inherit"}} onMouseEnter={e=>e.target.style.color=T.gold} onMouseLeave={e=>e.target.style.color=T.t3}>
          {sideOpen?"◀":"▶"}
        </button>
      </div>

      {/* ═══ MAIN ═══ */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        {/* Top bar */}
        <div style={{background:T.bar,borderBottom:`1px solid ${T.bd}`,padding:"7px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{flex:1,fontSize:10,color:T.t3,display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{color:T.gold,fontWeight:700}}>{CFG_O.authority[cfg.authority]}</span>
            <span style={{color:T.bd}}>·</span><span>{CFG_O.projectType[cfg.projectType]}</span>
            <span style={{color:T.bd}}>·</span><span>{CFG_O.roleMode[cfg.roleMode]}</span>
            {ocr&&<span style={{background:"#ede9fe",color:"#6d28d9",padding:"1px 7px",borderRadius:6,fontSize:9,fontWeight:700}}>🔤 OCR</span>}
            {feState?.phase&&feState.phase!=="done"&&<span style={{background:D?"#064e3b":"#dcfce7",color:T.grn,padding:"1px 8px",borderRadius:6,fontSize:9,fontWeight:700}}>⚡ {feState.stage?.slice(0,40)}</span>}
          </div>
          {msgs.length>0&&<>
            <button className="bo" style={{fontSize:9,padding:"3px 9px"}} onClick={()=>exportCSV(msgs,fname)} title="CSV">⬇️ CSV</button>
            <button className="bo" style={{fontSize:9,padding:"3px 9px"}} onClick={()=>exportMD(msgs,cfgStr())} title="MD">⬇️ MD</button>
            <button className="bo" style={{fontSize:9,padding:"3px 9px"}} onClick={()=>exportJSON(msgs,feState,cfgStr())} title="JSON">⬇️ JSON</button>
            {feState?.extractedData&&Object.keys(feState.extractedData).length>0&&<button className="bo" style={{fontSize:9,padding:"3px 9px"}} onClick={()=>exportTXT(feState)} title="TXT">⬇️ TXT</button>}
          </>}
          {totalTokens>0&&<span style={{fontSize:9,color:T.t3,background:T.bg3,border:`1px solid ${T.bd}`,padding:"2px 8px",borderRadius:8}}>{totalTokens.toLocaleString()}t</span>}
          {boqCount>0&&<span style={{fontSize:9,color:T.grn,background:D?"#064e3b20":"#dcfce7",border:"1px solid #bbf7d0",padding:"2px 8px",borderRadius:8,fontWeight:700}}>{boqCount} BOQ</span>}
        </div>

        {/* ══ CONFIG ══ */}
        {tab==="config"&&(
          <div style={{flex:1,overflowY:"auto",padding:"18px 16px"}}>
            <div style={{maxWidth:820,margin:"0 auto"}}>
              <div style={{marginBottom:16}}>
                <span style={{background:D?"#1c1404":"#fef3c7",color:T.gold,border:`1px solid ${T.gold}40`,padding:"3px 12px",borderRadius:9,fontSize:10,fontWeight:700}}>تهيئة المنظومة</span>
                <h2 style={{margin:"8px 0 4px",fontSize:20,fontWeight:900}}>إعدادات <span className="g">ALIMTYAZ v7</span></h2>
                <div style={{width:46,height:3,background:`linear-gradient(90deg,${T.gold},${T.goldL})`,borderRadius:2}}/>
              </div>
              {resumable&&(
                <div style={{background:D?"#0a2010":"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div><div style={{fontSize:11,color:T.grn,fontWeight:700}}>🔄 جلسة محفوظة — {resumable.file}</div>
                  <div style={{fontSize:9,color:T.t3}}>{resumable.partialResults?.length} دُفعة · {new Date(resumable.timestamp).toLocaleString("ar-SA")}</div></div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="fe-btn" style={{fontSize:10,padding:"5px 12px"}} onClick={()=>{setTab("analysis");runExtraction(resumable.partialResults);}}>▶️ استكمال</button>
                    <button className="bo" style={{fontSize:10}} onClick={()=>{clearBatch();setResumable(null);}}>✕</button>
                  </div>
                </div>
              )}
              <div className="card" style={{padding:"10px 14px",marginBottom:12,display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:9,color:T.t3,fontWeight:700}}>📁 الصيغ:</span>
                {[{i:"⚡",l:"Fast Extract",d:"نص 10K",c:"#16a34a"},{i:"🖼️",l:"PNG/JPG/WebP",d:"صور",c:"#2563eb"},{i:"📄",l:"PDF",d:"10K صفحة",c:"#dc2626"},{i:"📐",l:"DWG/DXF",d:"AutoCAD",c:"#16a34a"},{i:"🔀",l:"Hybrid",d:"نص+صورة",c:"#7c3aed"}].map(f=>(
                  <div key={f.l} style={{display:"flex",alignItems:"center",gap:5,background:T.bg3,padding:"4px 9px",borderRadius:8,border:`1px solid ${f.c}20`}}>
                    <span>{f.i}</span><div><div style={{fontSize:9,color:f.c,fontWeight:700}}>{f.l}</div><div style={{fontSize:7.5,color:T.t3}}>{f.d}</div></div>
                  </div>
                ))}
              </div>
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
              <div style={{display:"flex",gap:8}}>
                <button className="bg" style={{fontSize:14,padding:"12px 30px"}} onClick={()=>{save(cfg,mods,depth);setTab("analysis");}}>🚀 بدء التحليل</button>
                <button className="bo" onClick={()=>{setMods({});setMsgs([]);setQueue([]);setPdfSess(null);setFe(null);setXStats(null);}}>🔄 إعادة ضبط</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ PDF ══ */}
        {tab==="pdf"&&(
          pdfSess?(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"12px 14px",gap:10}}>
              <div className="card" style={{padding:"9px 14px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
                <span style={{fontSize:13,color:T.gold,fontWeight:700}}>📄 {pdfSess.file.name}</span>
                <span style={{fontSize:10,color:T.t3}}>· {fmtN(pdfSess.numPages)} صفحة</span>
                <div style={{marginRight:"auto",display:"flex",gap:7}}>
                  <button className="fe-btn" onClick={()=>runExtraction()} disabled={spLen===0}>
                    {pdfSess.quality==="fast"?"⚡":pdfSess.quality==="hybrid"?"🔀":"▶️"} {pdfSess.quality==="fast"?"استخراج سريع":pdfSess.quality==="hybrid"?"تحليل مدمج":"تحليل بصري"} ({spLen}ص / {cks}د)
                  </button>
                  {resumable&&<button className="bo" style={{fontSize:10,borderColor:T.gold,color:T.gold}} onClick={()=>runExtraction(resumable.partialResults)}>▶️ استئناف ({resumable.partialResults.length}✓)</button>}
                  <button className="bo" style={{fontSize:10}} onClick={()=>setTab("analysis")}>💬 الدردشة</button>
                </div>
              </div>
              <div style={{flex:1,display:"flex",gap:12,overflow:"hidden"}}>
                <div className="card" style={{width:142,display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
                  <div style={{padding:"5px 8px",borderBottom:`1px solid ${T.bd}`,fontSize:9,color:T.t3,fontWeight:700,flexShrink:0}}>🗂️ الصفحات<br/><span style={{fontSize:7,fontWeight:400}}>انقر للتحديد · دبل-كليك للمعاينة</span></div>
                  <div style={{flex:1,overflow:"hidden"}}><PdfNav sess={pdfSess} T={T} selPages={selPages} setPdfSess={setPdfSess} loadThumbs={loadThumbs} openPreview={openPreview}/></div>
                </div>
                <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
                  {/* Fast Extraction card */}
                  <div style={{background:D?"linear-gradient(135deg,#022c22,#064e3b)":"linear-gradient(135deg,#ecfdf5,#d1fae5)",border:`2px solid ${D?"#05966960":"#6ee7b7"}`,borderRadius:12,padding:14}} className="glow">
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                      <span style={{fontSize:22}}>⚡</span>
                      <div><div style={{fontSize:13,color:T.grn,fontWeight:900}}>Fast Extraction Engine v2</div>
                      <div style={{fontSize:9,color:T.t3}}>استخراج النص مباشرة · أسرع 100× · مناسب للـ BOQ والمواصفات</div></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:xStats?10:0}}>
                      {[["⚡ السرعة","~0.08ث/صفحة"],["💾 الذاكرة","لا صور"],["🎯 الدقة","85–95%"]].map(([l,v])=>(
                        <div key={l} style={{background:D?"#020817":"#f0fdf4",padding:"6px 9px",borderRadius:7,border:`1px solid ${D?"#064e3b":"#bbf7d0"}`}}>
                          <div style={{fontSize:8,color:T.t3}}>{l}</div>
                          <div style={{fontSize:11,color:T.grn,fontWeight:700}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {xStats&&Object.keys(pdfSess.densities||{}).length>0&&(
                      <div style={{background:D?"#020817":"#f0fdf4",padding:"6px 10px",borderRadius:7,display:"flex",gap:8,alignItems:"center",border:`1px solid ${D?"#064e3b":"#bbf7d0"}`}}>
                        <span style={{fontSize:9,color:T.grn}}>💡 الحجم المقترح:</span>
                        <span style={{fontSize:13,color:T.gold,fontWeight:700}}>{suggestChunkSize(pdfSess.densities,sp)} صفحة</span>
                        <button className="fchip" style={{fontSize:9}} onClick={()=>setPdfSess(p=>({...p,chunkSize:suggestChunkSize(p.densities,selPages(p))}))}>تطبيق</button>
                      </div>
                    )}
                  </div>
                  {xStats&&(
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {/* كثافة الصفحات */}
                      <div style={{background:D?"linear-gradient(135deg,#0a1628,#0f1e38)":"linear-gradient(135deg,#eff6ff,#dbeafe)",border:`1px solid ${D?"#1e3a5f":"#bfdbfe"}`,borderRadius:11,padding:12}}>
                        <div style={{fontSize:10,color:"#2563eb",fontWeight:700,marginBottom:8}}>📊 تحليل محتوى الصفحات</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:8}}>
                          {[["🔥 غنية",xStats.rich,"#16a34a"],["📊 متوسطة",xStats.medium,"#ca8a04"],["📄 خفيفة",xStats.low,"#2563eb"],["⬜ فارغة",xStats.empty,"#9ca3af"]].map(([l,v,c])=>(
                            <div key={l} style={{background:D?"#020817":"#fff",padding:"6px 8px",borderRadius:7,textAlign:"center",border:`1px solid ${c}20`}}>
                              <div style={{fontSize:8,color:c}}>{l}</div>
                              <div style={{fontSize:16,color:T.t1,fontWeight:700}}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div className="prog"><div style={{display:"flex",height:"100%"}}>
                          {[["#16a34a",xStats.rich],["#ca8a04",xStats.medium],["#2563eb",xStats.low],["#d1d5db",xStats.empty]].map(([c,v])=><div key={c} style={{background:c,width:`${xStats.total>0?v/xStats.total*100:0}%`,height:"100%"}}/>)}
                        </div></div>
                        <div style={{display:"flex",gap:10,marginTop:5,fontSize:8,color:T.t3}}>
                          <span>كثافة: <b style={{color:T.gold}}>{xStats.avgDensity.toFixed(2)}/3</b></span>
                          <span>نصوص: <b style={{color:"#2563eb"}}>{fmtN(xStats.totalChars)} حرف</b></span>
                          <span>جداول: <b style={{color:T.grn}}>{xStats.totalTables}</b></span>
                        </div>
                      </div>
                      {/* لوحة البنية التحتية */}
                      {(xStats.topTypes?.length>0||xStats.diameters?.length>0||xStats.scales?.length>0)&&(
                        <div style={{background:D?"linear-gradient(135deg,#0a1f14,#0d2810)":"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:`1px solid ${D?"#065f46":"#6ee7b7"}`,borderRadius:11,padding:12}}>
                          <div style={{fontSize:10,color:T.grn,fontWeight:700,marginBottom:8}}>🏗️ تصنيف مخططات البنية التحتية</div>
                          {xStats.topTypes?.length>0&&(
                            <div style={{marginBottom:7}}>
                              <div style={{fontSize:8,color:T.t3,marginBottom:4}}>أنواع المخططات المكتشفة:</div>
                              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                                {Object.entries(xStats.typeCount||{}).sort((a,b)=>b[1]-a[1]).map(([type,count])=>{
                                  const dt=DRAW_TYPES[type];
                                  return dt?(
                                    <span key={type} style={{background:D?dt.color+"20":dt.color+"15",border:`1px solid ${dt.color}50`,color:dt.color,padding:"2px 8px",borderRadius:10,fontSize:9,fontWeight:700}}>
                                      [{dt.code}] {dt.ar} <span style={{opacity:.7}}>×{count}</span>
                                    </span>
                                  ):null;
                                })}
                              </div>
                            </div>
                          )}
                          {xStats.scales?.length>0&&(
                            <div style={{marginBottom:7}}>
                              <div style={{fontSize:8,color:T.t3,marginBottom:3}}>مقاييس الرسم المكتشفة:</div>
                              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                                {xStats.scales.map(s=>(
                                  <span key={s} style={{background:D?"#1c1404":"#fef3c7",border:`1px solid ${T.gold}`,color:T.gold,padding:"2px 8px",borderRadius:10,fontSize:9,fontWeight:700}}>{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {xStats.diameters?.length>0&&(
                            <div>
                              <div style={{fontSize:8,color:T.t3,marginBottom:3}}>أقطار أنابيب مكتشفة (mm):</div>
                              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                                {xStats.diameters.slice(0,16).map(d=>(
                                  <span key={d} style={{background:D?"#0a1a30":"#dbeafe",border:"1px solid #bfdbfe",color:"#2563eb",padding:"2px 7px",borderRadius:9,fontSize:9,fontWeight:700}}>Ø{d}</span>
                                ))}
                                {xStats.diameters.length>16&&<span style={{fontSize:8,color:T.t3}}>+{xStats.diameters.length-16} أخرى</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="card" style={{padding:13}}>
                    <div style={{fontSize:10,color:T.t3,marginBottom:7,fontWeight:600}}>📌 اختيار الصفحات</div>
                    <div style={{display:"flex",gap:6,marginBottom:8}}>
                      {[{k:"range",l:"نطاق"},{k:"custom",l:"مخصص (انقر)"},{k:"all",l:`الكل (${fmtN(pdfSess.numPages)})`}].map(m=>(
                        <span key={m.k} className={`chip ${pdfSess.mode===m.k?"on":""}`} onClick={()=>setPdfSess(p=>({...p,mode:m.k}))}>{m.l}</span>
                      ))}
                    </div>
                    {pdfSess.mode==="range"&&(
                      <div>
                        <input className="inp" style={{marginBottom:7,fontSize:12}} value={pdfSess.rangeStr} onChange={e=>setPdfSess(p=>({...p,rangeStr:e.target.value}))} placeholder="1-100, 150, 200-300"/>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {[{l:"50",v:`1-${Math.min(50,pdfSess.numPages)}`},{l:"100",v:`1-${Math.min(100,pdfSess.numPages)}`},{l:"500",v:`1-${Math.min(500,pdfSess.numPages)}`},{l:"1K",v:`1-${Math.min(1000,pdfSess.numPages)}`},{l:"5K",v:`1-${Math.min(5000,pdfSess.numPages)}`},{l:"الكل",v:`1-${pdfSess.numPages}`},{l:"آخر50",v:`${Math.max(1,pdfSess.numPages-49)}-${pdfSess.numPages}`}].map(q=>(
                            <span key={q.l} className="chip" style={{fontSize:9}} onClick={()=>setPdfSess(p=>({...p,rangeStr:q.v,mode:"range"}))}>{q.l}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {pdfSess.mode==="custom"&&<div style={{fontSize:9,color:T.t3}}>انقر الصفحات في المتصفح · محدد: <span style={{color:T.gold,fontWeight:700}}>{pdfSess.selPages.length}</span>{pdfSess.selPages.length>0&&<button className="bo" style={{fontSize:8,padding:"2px 8px",marginRight:8}} onClick={()=>setPdfSess(p=>({...p,selPages:[]}))}>مسح</button>}</div>}
                  </div>
                  <div className="card" style={{padding:13}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div>
                        <div style={{fontSize:9,color:T.t3,marginBottom:6,fontWeight:600}}>📦 حجم الدُفعة</div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {[5,10,15,20,25,30,50].map(n=><span key={n} className={`chip ${pdfSess.chunkSize===n?"on":""}`} style={{fontSize:9}} onClick={()=>setPdfSess(p=>({...p,chunkSize:n}))}>{n}ص</span>)}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:9,color:T.t3,marginBottom:6,fontWeight:600}}>🎨 نوع التحليل</div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {Object.entries(QP).map(([k,v])=>(
                            <span key={k} className={`${k==="fast"||k==="hybrid"?"fchip":"chip"} ${pdfSess.quality===k?"on":""}`} style={{fontSize:9}} onClick={()=>setPdfSess(p=>({...p,quality:k}))}>{v.label}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{background:D?"linear-gradient(135deg,#0a1a10,#0d2018)":"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:`1px solid ${D?"#1a4025":"#bbf7d0"}`,borderRadius:12,padding:13}}>
                    <div style={{fontSize:11,color:T.gold,fontWeight:700,marginBottom:9}}>📊 ملخص العملية</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
                      {[["الصفحات",`${spLen}/${fmtN(pdfSess.numPages)}`],["الدُفعات",`${cks}`],["النوع",preset.label],["الوقت",fmtT(Math.round(estSec))],["Token تقديري",`~${fmtN(spLen*preset.tokEst)}`],["الدمج",cks>1?"تلقائي ذكي":"مباشر"]].map(([k,v])=>(
                        <div key={k} style={{background:D?"#020817":"#fff",padding:"6px 10px",borderRadius:7,border:`1px solid ${T.bd}`}}>
                          <div style={{fontSize:8,color:T.t3}}>{k}</div>
                          <div style={{fontSize:11,color:T.t1,fontWeight:600}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {spLen>0&&<button className="fe-btn" style={{width:"100%",fontSize:13}} onClick={()=>runExtraction()}>
                      {pdfSess.quality==="fast"?"⚡ بدء الاستخراج السريع":pdfSess.quality==="hybrid"?"🔀 بدء التحليل المدمج":"▶️ بدء التحليل البصري"} — {spLen} صفحة
                    </button>}
                  </div>
                </div>
              </div>
            </div>
          ):(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
              <div style={{fontSize:48}}>📄</div>
              <div style={{fontSize:14,color:T.t3}}>لا يوجد ملف PDF محمّل</div>
              <button className="bg" onClick={()=>fileRef.current?.click()}>📁 رفع ملف PDF</button>
              <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
            </div>
          )
        )}

        {/* ══ ANALYSIS ══ */}
        {tab==="analysis"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"9px 14px",gap:8}}>
            {feState&&feState.phase!=="done"&&(
              <div style={{background:D?"linear-gradient(135deg,#022c22,#064e3b)":"linear-gradient(135deg,#ecfdf5,#d1fae5)",border:`1px solid ${D?"#05966960":"#6ee7b7"}`,borderRadius:10,padding:"10px 14px",flexShrink:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{fontSize:11,color:T.grn,fontWeight:700}}>{feState.stage}</div>
                  <div style={{display:"flex",gap:7,alignItems:"center"}}>
                    {feState.eta!=null&&<span style={{fontSize:9,color:T.t3}}>⏱️ ~{fmtT(feState.eta)}</span>}
                    {feState.speed>0&&<span style={{fontSize:9,color:T.t3}}>{feState.speed}ص/ث</span>}
                    {feState.phase!=="merging"&&<button onClick={()=>cancelRef.current=true} style={{background:"#fee2e2",border:"1px solid #fca5a5",color:"#b91c1c",padding:"2px 8px",borderRadius:6,cursor:"pointer",fontSize:9,fontFamily:"inherit"}}>⏹ إيقاف</button>}
                  </div>
                </div>
                <div className="prog"><div className="prog-f" style={{background:`linear-gradient(90deg,${T.grn},#4ade80)`,width:`${feState.total>0?Math.round((feState.phase==="extracting"?feState.extracted:feState.analyzed)/feState.total*100):5}%`}}/></div>
                {feState.chunks?.length>0&&<div style={{display:"flex",gap:3,marginTop:6,flexWrap:"wrap"}}>
                  {feState.chunks.map((c,i)=>(
                    <span key={i} title={c.tokens?`${c.tokens.toLocaleString()} tokens`:c.label}
                      style={{background:c.status==="done"?(D?"#064e3b":"#dcfce7"):c.status==="error"?(D?"#450a0a":"#fee2e2"):c.status==="analyzing"?(D?"#1c1404":"#fef9c3"):(D?"#1e293b":"#f8fafc"),
                        color:c.status==="done"?T.grn:c.status==="error"?"#ef4444":c.status==="analyzing"?T.gold:T.t3,
                        padding:"2px 7px",borderRadius:6,fontSize:8,fontWeight:c.status==="analyzing"?700:400,
                        border:`1px solid ${c.status==="done"?(D?"#065f46":"#bbf7d0"):c.status==="error"?(D?"#7f1d1d":"#fca5a5"):c.status==="analyzing"?(D?"#854d0e":"#fde68a"):(D?T.bd:"#e5e7eb")}`,
                        animation:c.status==="analyzing"?"pulse 1.2s ease infinite":undefined}}>
                      {c.status==="done"?"✓":c.status==="error"?"✗":"⏳"} {c.label}
                      {c.tokens>0&&<span style={{opacity:.6,marginRight:3,fontSize:7}}> {Math.round(c.tokens/1000)}k</span>}
                    </span>
                  ))}
                </div>}
              </div>
            )}
            <div style={{display:"flex",gap:4,flexWrap:"wrap",flexShrink:0,alignItems:"center"}}>
              {TMPL.map(t=>(
                <span key={t.l} className={`chip ${ocr&&t.l.includes("OCR")?"on":""}`} style={{fontSize:9}} onClick={()=>{setPrompt(t.p);if(t.l.includes("OCR"))setOcr(true);}}>{t.i} {t.l}</span>
              ))}
              <div style={{marginRight:"auto",display:"flex",gap:4,alignItems:"center"}}>
                {msgs.filter(m=>m.isChunk||m.isFast||m.isHybrid).length>1&&<>
                  <button className="bo" style={{fontSize:8,padding:"2px 8px"}} onClick={()=>setCollapsed(new Set(msgs.map((_,i)=>i)))}>طي الكل</button>
                  <button className="bo" style={{fontSize:8,padding:"2px 8px"}} onClick={()=>setCollapsed(new Set())}>فتح الكل</button>
                </>}
                {searchOn&&<input className="sinp" placeholder="🔍 بحث في النتائج..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus/>}
                <button className="bo" style={{fontSize:9,padding:"3px 8px",borderColor:searchOn?T.gold:T.bd,color:searchOn?T.gold:T.t2}} onClick={()=>{setSearchOn(v=>!v);if(searchOn)setSearch("");}}>🔍</button>
                {search&&<span style={{fontSize:8,color:T.t3}}>{filteredMsgs.length} نتيجة</span>}
                {msgs.length>0&&!search&&<span style={{fontSize:8,color:T.t3}}>{msgs.filter(m=>m.role==="assistant").length} رد</span>}
              </div>
            </div>
            <div style={{flex:1,display:"flex",gap:10,overflow:"hidden"}}>
              {queue.length>0&&(
                <div className="card" style={{width:122,flexShrink:0,display:"flex",flexDirection:"column",overflow:"hidden",padding:7}}>
                  <div style={{fontSize:8,color:T.t3,marginBottom:5,fontWeight:600}}>🗂️ الملفات ({queue.length})</div>
                  <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
                    {queue.map((f,i)=>(
                      <div key={i} style={{cursor:"pointer",position:"relative"}} onClick={()=>setQIdx(i)}>
                        <img src={f.src} style={{width:"100%",borderRadius:6,border:`2px solid ${qIdx===i?T.gold:T.bd}`,objectFit:"contain",maxHeight:85}}/>
                        <span style={{position:"absolute",bottom:2,right:2,fontSize:7,background:FT[f.type]?.c+"cc",color:"#fff",padding:"1px 4px",borderRadius:3,fontWeight:700}}>{FT[f.type]?.i}</span>
                        <div onClick={e=>{e.stopPropagation();setQueue(p=>{const n=[...p];n.splice(i,1);return n;});}} style={{position:"absolute",top:-4,left:-4,width:14,height:14,borderRadius:"50%",background:"#ef4444",color:"#fff",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontWeight:800}}>✕</div>
                      </div>
                    ))}
                  </div>
                  <button className="bo" style={{fontSize:8,padding:"3px",marginTop:5,width:"100%"}} onClick={()=>{setQueue([]);setQIdx(0);}}>🗑️ مسح</button>
                </div>
              )}
              <div ref={chatRef} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
                {filteredMsgs.length===0&&msgs.length===0&&(
                  <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 16px",textAlign:"center"}}>
                    <div style={{fontSize:54,marginBottom:12}}>🏗️</div>
                    <div style={{fontSize:17,fontWeight:900,marginBottom:6,color:T.gold}}>جاهز للتحليل الهندسي المتقدم</div>
                    <div style={{fontSize:10,color:T.t3,maxWidth:420,lineHeight:2,marginBottom:4}}>ارفع مخططاً هندسياً أو اختر قالباً للبدء</div>
                    <div style={{fontSize:9,color:T.t3,maxWidth:440,lineHeight:2}}>
                      يدعم: <span style={{color:"#2563eb"}}>مخططات الطرق</span> · <span style={{color:T.grn}}>الصرف الصحي</span> · <span style={{color:"#0ea5e9"}}>المياه</span> · <span style={{color:T.gold}}>الإنشائيات</span> · <span style={{color:"#7c3aed"}}>المرافق</span>
                    </div>
                    <div style={{marginTop:14,display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center"}}>
                      {TMPL.slice(0,4).map(t=><span key={t.l} className="chip" style={{fontSize:9,padding:"7px 13px"}} onClick={()=>setPrompt(t.p)}>{t.i} {t.l}</span>)}
                    </div>
                    <div style={{marginTop:7,display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
                      {TMPL.slice(4).map(t=><span key={t.l} className="chip" style={{fontSize:8,padding:"4px 10px",opacity:.7}} onClick={()=>setPrompt(t.p)}>{t.i} {t.l}</span>)}
                    </div>
                  </div>
                )}
                {msgs.length>0&&boqCount>0&&(
                  <div style={{background:D?"linear-gradient(135deg,#0d1f14,#111e18)":"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:`1px solid ${D?"#1a3025":"#bbf7d0"}`,borderRadius:10,padding:"8px 14px",display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",flexShrink:0}}>
                    <span style={{fontSize:9,color:T.grn,fontWeight:700}}>📊 ملخص الجلسة</span>
                    <span style={{fontSize:9,color:T.t2}}><span style={{color:T.gold,fontWeight:700}}>{boqCount}</span> بند BOQ</span>
                    <span style={{fontSize:9,color:T.t2}}><span style={{color:T.gold,fontWeight:700}}>{msgs.filter(m=>m.role==="assistant").length}</span> تحليل</span>
                    {totalTokens>0&&<span style={{fontSize:9,color:T.t2}}><span style={{color:T.gold,fontWeight:700}}>{totalTokens.toLocaleString()}</span> token</span>}
                    {feState?.phase==="done"&&<span style={{fontSize:9,color:T.grn,fontWeight:700,marginRight:"auto"}}>✅ {feState.stage}</span>}
                  </div>
                )}
                {search.trim()&&filteredMsgs.length===0&&<div style={{padding:20,textAlign:"center",color:T.t3,fontSize:12}}>لا توجد نتائج لـ "{search}"</div>}
                {filteredMsgs.map((m,i)=>{
                  const isCol=collapsed.has(i);
                  const cls=m.role==="user"?"mu":m.isMerged?"mm":m.isHybrid?"mh":m.isFast?"mf":"ma";
                  const lbl=m.role==="user"?"👤":m.isMerged?"🔗 التقرير الموحد":m.isHybrid?`🔀 Hybrid ${m.chunkLabel||""}`:m.isFast?`⚡ Fast ${m.chunkLabel||""}`:m.isChunk?`📄 ${m.chunkLabel||""}`:"🤖 ALIMTYAZ Engine";
                  const lclr=m.role==="user"?"#2563eb":m.isMerged?T.gold:m.isHybrid?"#7c3aed":m.isFast?T.grn:"#374151";
                  const content=typeof m.content==="string"?m.content:"";
                  const hlContent=search.trim()&&m.role==="assistant"?mdCached(content).replace(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi"),'<mark class="hl">$1</mark>'):null;
                  return(
                    <div key={i} className={`fi ${cls}`}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                        <div style={{fontSize:9,fontWeight:700,color:lclr}}>{lbl}</div>
                        {m.role==="assistant"&&(
                          <div style={{display:"flex",gap:4,alignItems:"center"}}>
                            {m.tokens&&<span style={{fontSize:7,color:T.t3}}>{m.tokens.toLocaleString()}t</span>}
                            {(m.isChunk||m.isFast||m.isHybrid)&&<button onClick={()=>setCollapsed(prev=>{const n=new Set(prev);n.has(i)?n.delete(i):n.add(i);return n;})} style={{background:"none",border:`1px solid ${T.bd}`,cursor:"pointer",color:T.t3,fontSize:8,borderRadius:5,padding:"1px 6px",fontFamily:"inherit"}}>{isCol?"▼ عرض":"▲ طي"}</button>}
                            <button onClick={()=>copyMsg(content,i)} style={{background:copiedIdx===i?"#dcfce7":"none",border:`1px solid ${copiedIdx===i?"#bbf7d0":T.bd}`,cursor:"pointer",color:copiedIdx===i?T.grn:T.t3,fontSize:10,borderRadius:6,padding:"1px 7px",fontFamily:"inherit",transition:"all .2s"}} title="نسخ">{copiedIdx===i?"✓":"📋"}</button>
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
                  <div className={`ma fi`}>
                    <div style={{fontSize:9,color:T.t3,marginBottom:5,fontWeight:600}}>🤖 ALIMTYAZ Engine</div>
                    <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:5}}>
                      {[0,1,2,3].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.gold,animation:"pulse 1.4s ease-in-out infinite",animationDelay:`${i*.28}s`}}/>)}
                    </div>
                    <div style={{fontSize:11,color:T.t3}}>{lmsg||"جارٍ التحليل..."}</div>
                    <div className="prog" style={{marginTop:6}}><div style={{height:"100%",background:`linear-gradient(90deg,${T.gold},${T.goldL})`,borderRadius:4,animation:"grow 3s ease-in-out infinite"}}/></div>
                  </div>
                )}
              </div>
            </div>
            {/* Input */}
            <div className="card" style={{padding:11,flexShrink:0}}>
              {queue.length>0&&(
                <div style={{display:"flex",gap:4,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
                  {queue.map((f,i)=>(
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
                <span style={{marginRight:"auto",fontSize:8,color:T.t3,opacity:.6}}>Ctrl+Enter للإرسال</span>
              </div>
              <div style={{display:"flex",gap:5}}>
                <textarea className="inp" rows={3} placeholder="اكتب سؤالك أو اختر قالباً من الأعلى... (Ctrl+Enter للإرسال)"
                  value={prompt} onChange={e=>setPrompt(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&e.ctrlKey)sendMsg();}}/>
                <button className="bg" onClick={sendMsg} disabled={loading||(!prompt.trim()&&queue.length===0)} style={{minWidth:52,fontSize:20,padding:"0 14px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {loading?<div style={{width:16,height:16,border:"3px solid #ffffff40",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>:"⬅️"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {proc&&(
        <div style={{position:"fixed",inset:0,background:"#000000a0",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div className="card" style={{padding:"22px 30px",textAlign:"center",minWidth:240}}>
            <div style={{width:32,height:32,border:`4px solid ${T.bd}`,borderTopColor:T.gold,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
            <div style={{fontSize:12,color:T.gold,fontWeight:700}}>{proc.stage}</div>
          </div>
        </div>
      )}
      {preview&&(
        <div style={{position:"fixed",inset:0,background:"#000000c0",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setPreview(null)}>
          <div className="card" style={{maxWidth:720,maxHeight:"90vh",overflow:"auto",padding:0,borderRadius:14}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:T.gold,fontWeight:700}}>📄 معاينة الصفحة {preview.page}</span>
              <button onClick={()=>setPreview(null)} style={{background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
            </div>
            {preview.loading?<div style={{padding:48,textAlign:"center",color:T.t3}}>⏳ جارٍ التحميل...</div>:<img src={preview.src} style={{width:"100%",display:"block"}}/>}
          </div>
        </div>
      )}
    </div>
  );
}
