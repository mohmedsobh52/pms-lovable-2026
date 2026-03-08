import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════
//  ACCURACY ENGINE v4 — ALIMTYAZ v11 — EARTHWORKS + ASPHALT SPECIALIST
// ═══════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════
//  ALIMTYAZ v11 — محرك حسابات الحفر والردم والأسفلت الدقيق
//  v11: تربة+صخر | دعم جوانب | ضخ مياه | عامل انضغاط | كثافة طبقات | رش
// ══════════════════════════════════════════════════════════════════════════

// ── مرجع الأسعار الشامل 2025 ──
const SAR_REF_2025 = `
══ أسعار السوق السعودي 2025 (مرجع إلزامي — أبلغ عن أي انحراف) ══

━━ EARTHWORKS — حفر وردم (أسعار مفصّلة) ━━
حفر خنادق آلي تربة عادية عمق ≤2م:   35–55 SAR/م³
حفر خنادق آلي تربة عادية عمق 2–4م:  45–70 SAR/م³
حفر خنادق آلي تربة عادية عمق 4–6م:  65–95 SAR/م³
حفر خنادق يدوي (مناطق ضيقة):        75–120 SAR/م³
حفر صخر بالتفجير:                    180–320 SAR/م³
حفر صخر بالهدم الميكانيكي:           220–380 SAR/م³
حفر عام (open cut) بالآليات:         18–38 SAR/م³
حفر في منطقة حضرية (احتياطات):       55–90 SAR/م³

ردم رمل ناعم مدموك (تحت الأنبوب):   65–95 SAR/م³
ردم رملي مدموك (جوانب + فوق):       40–65 SAR/م³
ردم تربة مدموكة من الموقع:           20–38 SAR/م³
ردم حجر مجروش مدموك:                 95–140 SAR/م³
ردم خرساني فقير C10:                 250–320 SAR/م³
تخلص من الحفريات بالموقع:            25–45 SAR/م³
نقل وتخلص خارج الموقع (<5كم):       40–65 SAR/م³
نقل وتخلص خارج الموقع (5–15كم):     60–90 SAR/م³
دعم جوانب الخندق (sheeting):         85–150 SAR/م²
ضخ مياه جوفية (dewatering):          1,500–3,500 SAR/يوم

فرشة رملية 150mm تحت أنبوب:         55–85 SAR/م.ط
حماية خرسانية encasement:            380–560 SAR/م.ط
رمل تسوية/تربة مستوردة:             60–95 SAR/م³

━━ ASPHALT & ROAD PAVEMENT — رصف طرق مفصّل ━━
طبقة سطحية Wearing Course 40mm:      155–205 SAR/م²  (كثافة 2.35 t/m³ → 0.094 t/م²)
طبقة سطحية Wearing Course 50mm:      185–245 SAR/م²  (0.1175 t/م²)
طبقة سطحية Wearing Course 60mm:      215–280 SAR/م²  (0.141 t/م²)
طبقة سطحية Wearing Course 75mm:      255–320 SAR/م²  (0.176 t/م²)
طبقة رابطة Binder Course 50mm:       155–205 SAR/م²  (كثافة 2.30 t/m³ → 0.115 t/م²)
طبقة رابطة Binder Course 60mm:       180–240 SAR/م²  (0.138 t/م²)
طبقة رابطة Binder Course 75mm:       215–280 SAR/م²  (0.173 t/م²)
طبقة أساس أسفلتي Base Course 75mm:   140–185 SAR/م²  (كثافة 2.25 t/m³ → 0.169 t/م²)
طبقة أساس أسفلتي Base Course 100mm:  175–230 SAR/م²  (0.225 t/م²)
طبقة أساس أسفلتي Base Course 125mm:  210–270 SAR/م²  (0.281 t/م²)
Prime Coat رش تمهيدي (0.8–1.2 L/م²): 8–15 SAR/م²
Tack Coat رش لاصق (0.3–0.6 L/م²):    5–10 SAR/م²
أسفلت بالوزن (طن مفروش في الموقع):  480–650 SAR/طن

طبقة أساس مجروش (Crushed Stone Base) 150mm: 100–145 SAR/م²
طبقة أساس مجروش 200mm:              125–165 SAR/م²
طبقة أساس مجروش 250mm:              155–200 SAR/م²
طبقة أساس مجروش 300mm:              180–230 SAR/م²
طبقة أساس مجروش 400mm:              235–300 SAR/م²
طبقة فرشة رمل (sub-base) 200mm:     65–95 SAR/م²
طبقة فرشة رمل 300mm:                90–130 SAR/م²
توليف ورص طبقة أساس (compaction):   25–45 SAR/م²

مقاطعة (cutting) رصف أسفلت قائم:    35–60 SAR/م.ط
إزالة رصف أسفلت قائم:               45–75 SAR/م²
إزالة حجر كبس:                       30–55 SAR/م²
ترقيع محلي رصف Patching:             85–140 SAR/م²

أرصفة مشاة خرسانية 150mm:           120–170 SAR/م²
حافة طريق kerb 150×300mm:           55–90 SAR/م.ط
حافة طريق kerb 200×400mm:           80–125 SAR/م.ط
نيوجرسي Jersey barrier:             380–540 SAR/م.ط

علامات أرضية Paint Marking 100mm:   12–22 SAR/م.ط
علامات مرورية لوحة:                 1,200–2,800 SAR/لوحة
أعمدة إنارة طريق:                   1,800–3,500 SAR/عمود

━━ CONCRETE & STRUCTURAL ━━
نظافة C10/C15:  260–350 SAR/م³  |  C20: 340–420  |  C25: 380–460
C30: 420–510  |  C35: 480–570  |  C40: 540–640
حديد تسليح fy420: 4,500–5,500 SAR/طن  |  شبكات welded: 4,200–4,800
قوالب خشبية: 160–280 SAR/م²  |  معدنية: 240–360 SAR/م²
غطاء خرساني Ø1000: 450–700  |  Ø1200: 550–900  |  Ø1500: 900–1,400

━━ GRAVITY SEWER ━━
PVC SN8: Ø150: 60–85  |  Ø200: 85–120  |  Ø250: 115–155  |  Ø300: 140–185
         Ø400: 210–270  |  Ø500: 290–370  (SAR/م.ط)
HDPE PE100: Ø110: 55–80  |  Ø160: 95–130  |  Ø200: 130–175  |  Ø250: 180–240
            Ø315: 250–330  |  Ø400: 330–440  (SAR/م.ط)
GRP/FRP: Ø400: 290–380  |  Ø600: 480–640  |  Ø900: 850–1,100  |  Ø1200: 1,400–1,800
RCP Class3: Ø300: 185–260  |  Ø450: 290–420  |  Ø600: 420–580  |  Ø900: 750–1,000

━━ MANHOLES ━━
مسبق الصنع Ø1000: 3,500–5,500  |  Ø1200: 4,500–7,000  |  Ø1500: 7,000–12,000
إطار D400: 650–900 SAR  |  B125: 350–550  |  GRP منظومة: 1,200–1,800

━━ WATER SUPPLY ━━
DI PN16: Ø100: 200–280  |  Ø150: 280–380  |  Ø200: 360–490  |  Ø300: 580–780
HDPE PE100 PN12.5: Ø63: 45–70  |  Ø110: 90–125  |  Ø200: 180–250  |  Ø315: 350–480
صمام بوابة Ø100: 450–650  |  Ø150: 700–1,000  |  Ø200: 1,000–1,500

━━ STORMWATER & MARINE ━━
RCP: Ø300: 185–260  |  Ø600: 420–580  |  Ø900: 750–1,000  |  Ø1200: 1,100–1,500
بوكس كولفرت 1200×1200: 850–1,200/م.ط  |  2000×2000: 2,200–3,000
HDPE بحري Ø400: 480–680  |  Ø600: 750–1,050  |  Ø900: 1,200–1,700  |  Ø1200: 2,000–2,800

══ مواصفات NWC الإلزامية ══
PVC SN≥8 للشبكات | عمق أدنى: 1.2م طرق | 1.5م طرق رئيسية
ميل أدنى: 5‰ للقطر≤150 | 2‰ للقطر<300 | 1‰ للقطر≥300
صمام هواء كل 500م | كتلة دفع C25 عند كل انحناء ≥22.5°

══ معادلات حفر الخنادق المعتمدة ══
عرض الخندق = قطر_m + 0.60م (للقطر ≤600mm)
عرض الخندق = قطر_m + 0.80م (للقطر 600–900mm)
عرض الخندق = قطر_m + 1.00م (للقطر >900mm)
حجم الحفر = طول × عرض × عمق_متوسط
حجم الردم = حجم_الحفر − حجم_الأنبوب − حجم_الفرشة
حجم_الأنبوب = (π/4) × (قطر_خارجي)² × طول
عامل انتفاش التربة العادية = 1.25 | التربة الرملية = 1.15 | الصخر = 1.40
حجم_التخلص = حجم_الحفر × عامل_الانتفاش − حجم_الردم

══ معادلات الأسفلت المعتمدة ══
الوزن (طن) = المساحة (م²) × السماكة (م) × الكثافة (t/m³)
كثافة Wearing Course = 2.35 t/m³
كثافة Binder Course = 2.30 t/m³
كثافة Base Course = 2.25 t/m³
مساحة الإعادة بعد الحفر = طول × (عرض الخندق + 0.30م رقعة)
سماكة الإعادة = نفس الهيكل الأصلي + Prime Coat`;



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

// ══════════════════════════════════════════════════════════════════════════
//  محرك استخراج الأنابيب الدقيق v5 — كشف المادة + الضغط + الميل + المنسوب
// ══════════════════════════════════════════════════════════════════════════

// قاموس المواد الشامل
const PIPE_MATERIALS = {
  pvc:   {ar:"PVC",         std:"SN8",  color:"#2563eb", cls:"جاذبية"},
  upvc:  {ar:"uPVC",        std:"SN8",  color:"#1d4ed8", cls:"جاذبية"},
  hdpe:  {ar:"HDPE PE100",  std:"PN10", color:"#059669", cls:"ضغط"},
  grp:   {ar:"GRP/FRP",     std:"SN10000",color:"#7c3aed",cls:"جاذبية"},
  frp:   {ar:"GRP/FRP",     std:"SN10000",color:"#7c3aed",cls:"جاذبية"},
  di:    {ar:"DI دكتايل",   std:"PN16", color:"#dc2626", cls:"ضغط"},
  rcp:   {ar:"RCP خرساني",  std:"Class3",color:"#64748b",cls:"جاذبية"},
  conc:  {ar:"RCP خرساني",  std:"Class3",color:"#64748b",cls:"جاذبية"},
  gi:    {ar:"GI Galv.",    std:"PN25", color:"#0369a1", cls:"ضغط"},
  steel: {ar:"Steel",       std:"PN40", color:"#475569", cls:"ضغط"},
  clay:  {ar:"Vitrified Clay",std:"700",color:"#92400e",cls:"جاذبية"},
};

// كشف المادة من السياق المحيط
function detectPipeMaterial(context) {
  const t = context.toLowerCase();
  if (/\bgrp\b|\bfrp\b|fiberglass|زجاجي/.test(t))  return "grp";
  if (/\bhdpe\b|pe100|pe80|بولي إيثيلين/.test(t))   return "hdpe";
  if (/\bupvc\b|\bpvc\b|بولي فينيل/.test(t))         return "pvc";
  if (/\bdi\b|ductile|دكتايل/.test(t))               return "di";
  if (/\brcp\b|reinforced concrete|خرساني مسلح/.test(t)) return "rcp";
  if (/\bgi\b|galvaniz/.test(t))                      return "gi";
  if (/steel|فولاذ/.test(t))                          return "steel";
  if (/clay|فخار/.test(t))                            return "clay";
  return null;
}

// كشف الضغط / الصلابة الحلقية
function detectPipeClass(context) {
  const t = context.toUpperCase();
  const snM = t.match(/SN\s*(\d+)/);     if (snM) return `SN${snM[1]}`;
  const pnM = t.match(/PN\s*(\d+)/);     if (pnM) return `PN${pnM[1]}`;
  const clM = t.match(/CLASS\s*([A-Z0-9]+)/); if (clM) return `Class${clM[1]}`;
  return null;
}

// استخراج الأنابيب مع المواصفات الكاملة
function extractPipeDiameters(text) {
  if (!text) return [];
  const found = new Map(); // key: "dia_mat_cls"
  // نمط شامل: قطر + مادة اختيارية + فئة اختيارية
  const patterns = [
    // Ø300 PVC SN8 أو DN300 HDPE PN10
    /(?:[ØøΦ]|DN|OD|ID)\s*(\d{2,4})\s*(?:mm)?\s*(PVC|UPVC|HDPE|PE100|PE80|GRP|FRP|DI|RCP|CONC|GI|STEEL|CLAY)?\s*(SN\d+|PN\d+|CLASS\s*[A-Z0-9]+)?/gi,
    // قطر عربي: قطر 300مم PVC
    /قطر\s+(\d{2,4})\s*(?:مم|mm)?\s*(PVC|HDPE|GRP|DI|RCP)?/gi,
    // Pipe 300mm or 300mm pipe
    /(\d{2,4})\s*mm\s*(PVC|UPVC|HDPE|GRP|FRP|DI|RCP)?/gi,
  ];
  patterns.forEach(p => {
    let m;
    while ((m = new RegExp(p.source, p.flags).exec(text)) !== null) {
      const d = parseInt(m[1]);
      if (d < 50 || d > 3600) continue;
      const rawMat = (m[2]||"").toLowerCase();
      const matKey = rawMat ? (PIPE_MATERIALS[rawMat] ? rawMat : detectPipeMaterial(rawMat)||"unknown") : detectPipeMaterial(text.slice(Math.max(0,m.index-40), m.index+40)) || "unknown";
      const cls = detectPipeClass(m[3]||text.slice(Math.max(0,m.index-30),m.index+50)) || PIPE_MATERIALS[matKey]?.std || "";
      const key = `${d}_${matKey}_${cls}`;
      if (!found.has(key)) found.set(key, { dia: d, matKey, mat: PIPE_MATERIALS[matKey]?.ar || (rawMat||"غير محدد").toUpperCase(), cls, color: PIPE_MATERIALS[matKey]?.color || "#6b7280", type: PIPE_MATERIALS[matKey]?.cls||"" });
    }
  });
  return [...found.values()].sort((a,b)=>a.dia-b.dia);
}

// استخراج ميل الأنابيب
function extractPipeSlopes(text) {
  if (!text) return [];
  const slopes = [];
  const p = /(?:slope|ميل|gradient|grade)\s*[=:≈]?\s*(\d+\.?\d*)\s*(?:%|‰|per\s*mille|in\s*(\d+))/gi;
  let m;
  while ((m = p.exec(text)) !== null) {
    const v = parseFloat(m[1]);
    const unit = m[0].toLowerCase().includes("‰") ? "‰" : "%";
    if (v > 0 && v < 50) slopes.push({ val: v, unit, warn: (unit==="%" && (v < 0.2 || v > 15)) || (unit==="‰" && (v < 2 || v > 150)) });
  }
  return slopes;
}

// استخراج مستويات المناسيب من النص
function extractInvertLevels(text) {
  if (!text) return [];
  const levels = [];
  const p = /(?:IL|INV|invert|منسوب|TW|GL|EGL)\s*[=:]\s*([-+]?\d{1,4}[.,]\d{1,3})/gi;
  let m;
  while ((m = p.exec(text)) !== null) levels.push(m[1]);
  return levels.slice(0, 20);
}

// بناء جدول الأنابيب الموحد من نتائج الاستخراج عبر الصفحات
function buildPipeNetwork(extractedData) {
  const network = new Map(); // key: dia_mat_cls → {dia, mat, cls, count, totalLength, avgDepth, slopes}
  Object.values(extractedData || {}).forEach(d => {
    if (!d.pipeEntries) return;
    d.pipeEntries.forEach(pe => {
      const key = `${pe.dia}_${pe.mat}_${pe.cls}`;
      if (!network.has(key)) network.set(key, { ...pe, segments: [], totalLength: 0, minDepth: Infinity, maxDepth: 0 });
      const e = network.get(key);
      if (pe.length) e.totalLength += pe.length;
      if (pe.depth) { e.minDepth = Math.min(e.minDepth, pe.depth); e.maxDepth = Math.max(e.maxDepth, pe.depth); }
      e.segments.push(pe);
    });
  });
  return [...network.values()].sort((a,b) => a.dia - b.dia);
}

// لوحة ملخص الأنابيب — مكوّن React
function PipeNetworkPanel({ xStats, T, D }) {
  const pipes = xStats?.pipeNetwork || [];
  const [expanded, setExpanded] = useState(false);
  if (!pipes.length) return null;

  const totalLength = pipes.reduce((s,p) => s + (p.totalLength||0), 0);
  const byMat = pipes.reduce((acc,p) => { acc[p.mat] = (acc[p.mat]||0) + (p.totalLength||0); return acc; }, {});

  return (
    <div style={{background:D?"linear-gradient(135deg,#0c0a1a,#140f2a)":"linear-gradient(135deg,#faf5ff,#ede9fe)",border:`2px solid ${D?"#4c1d9560":"#c4b5fd"}`,borderRadius:12,padding:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>🔵</span>
          <div>
            <div style={{fontSize:11,color:"#7c3aed",fontWeight:900}}>شبكة الأنابيب المستخرجة</div>
            <div style={{fontSize:8.5,color:T.t3}}>{pipes.length} مواصفة · إجمالي {totalLength.toFixed(0)} م.ط</div>
          </div>
        </div>
        <button className="bo" style={{fontSize:8,padding:"3px 9px",borderColor:"#7c3aed",color:"#7c3aed"}} onClick={()=>setExpanded(!expanded)}>
          {expanded?"▲ طيّ":"▼ تفاصيل"}
        </button>
      </div>

      {/* شريط الألوان حسب المادة */}
      <div style={{height:8,borderRadius:4,overflow:"hidden",display:"flex",marginBottom:8}}>
        {Object.entries(byMat).map(([mat,len]) => {
          const pipe = pipes.find(p=>p.mat===mat);
          return <div key={mat} style={{flex:len,background:pipe?.color||"#6b7280",title:mat}}/>;
        })}
      </div>

      {/* بطاقات الأنابيب */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:5}}>
        {pipes.map((p,i) => (
          <div key={i} style={{background:D?"#1a1535":"#fff",borderRadius:8,padding:"7px 10px",border:`1.5px solid ${p.color}40`}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:p.color,flexShrink:0}}/>
              <span style={{fontSize:12,fontWeight:900,color:p.color}}>Ø{p.dia}mm</span>
            </div>
            <div style={{fontSize:8.5,color:T.t2,fontWeight:700}}>{p.mat}</div>
            <div style={{fontSize:7.5,color:T.t3}}>{p.cls||"—"} · {p.type}</div>
            {p.totalLength>0&&<div style={{fontSize:9,color:T.gold,fontWeight:700,marginTop:3}}>{p.totalLength.toFixed(1)} م.ط</div>}
          </div>
        ))}
      </div>

      {expanded && (
        <div style={{marginTop:8,background:D?"#0a0818":"#f5f3ff",borderRadius:8,padding:"8px 10px",border:`1px solid ${D?"#2d1b69":"#ddd6fe"}`}}>
          <div style={{fontSize:9,color:"#7c3aed",fontWeight:700,marginBottom:5}}>📊 توزيع حسب المادة</div>
          {Object.entries(byMat).map(([mat,len]) => {
            const pipe = pipes.find(p=>p.mat===mat);
            const pct = totalLength > 0 ? (len/totalLength*100).toFixed(1) : 0;
            return (
              <div key={mat} style={{marginBottom:4}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:8.5,marginBottom:2}}>
                  <span style={{color:pipe?.color}}>{mat}</span>
                  <span style={{color:T.t2,fontWeight:700}}>{len.toFixed(0)} م.ط ({pct}%)</span>
                </div>
                <div style={{height:4,background:D?"#1e293b":"#e2e8f0",borderRadius:2,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:pipe?.color||"#7c3aed",borderRadius:2}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════
//  محرك حسابات الحفر والردم الدقيق v6 — شامل الصخر والمياه الجوفية والميل
// ══════════════════════════════════════════════════════════════════════════

// عوامل الانتفاش والكثافة حسب نوع التربة
const SOIL_PARAMS = {
  sand:   { swell:1.12, compact:0.95, excav_sar:40,  backfill_sar:30, ar:"رملية",    color:"#f59e0b" },
  normal: { swell:1.25, compact:0.90, excav_sar:50,  backfill_sar:40, ar:"طبيعية",   color:"#92400e" },
  clay:   { swell:1.30, compact:0.85, excav_sar:60,  backfill_sar:45, ar:"طينية",    color:"#78350f" },
  gravel: { swell:1.18, compact:0.92, excav_sar:55,  backfill_sar:38, ar:"حصوية",    color:"#d97706" },
  rock:   { swell:1.45, compact:1.00, excav_sar:220, backfill_sar:0,  ar:"صخرية",    color:"#6b7280" },
};

// عامل الميل للخندق (لحساب الجوانب المائلة)
function slopeVolumeFactor(depthM, sideSlope = 0) {
  // sideSlope: 0 = عمودي | 0.5 = 1H:2V | 1.0 = 45°
  if (sideSlope <= 0) return 1.0;
  const extraWidth = 2 * sideSlope * depthM;
  return 1 + (extraWidth / 2); // نسبة الزيادة في المساحة
}

// عرض الخندق المعياري حسب القطر (NWC/MOT)
function trenchWidth(diaMM, depthM = 2.0) {
  const d_m = diaMM / 1000;
  let tw;
  if (diaMM <= 300)      tw = d_m + 0.60;
  else if (diaMM <= 600) tw = d_m + 0.70;
  else if (diaMM <= 900) tw = d_m + 0.80;
  else if (diaMM <= 1200)tw = d_m + 0.90;
  else                   tw = d_m + 1.10;
  // إضافة دعم جوانب إذا العمق > 1.5م
  if (depthM > 1.5) tw += 0.10;
  return +tw.toFixed(2);
}

// حجم الأنبوب لكل متر طولي م³/م.ط
function pipeVolumePerMeter(diaMM) {
  const od_m = diaMM / 1000;
  return +((Math.PI / 4) * od_m * od_m).toFixed(4);
}

// الحساب الكامل لخندق أنبوب واحد مع تفاصيل كل بند
function calcTrenchEarthworks({
  lengthM, diaMM, depthM,
  soilType = "normal",
  sandBedMM = 150,     // فرشة رملية تحت الأنبوب
  hasSheeting = false, // دعم جوانب
  hasDewatering = false, // ضخ مياه جوفية
  rockDepthM = 0,       // عمق الطبقة الصخرية من السطح
  sideSlope = 0,        // ميل جوانب الخندق
}) {
  const soil    = SOIL_PARAMS[soilType] || SOIL_PARAMS.normal;
  const tw      = trenchWidth(diaMM, depthM);
  const sb_m    = sandBedMM / 1000;

  // فصل الصخر عن التربة العادية
  const rockDepth   = Math.min(rockDepthM, depthM);
  const soilDepth   = depthM - rockDepth;
  const slpFactor   = slopeVolumeFactor(depthM, sideSlope);

  // الحجوم الأساسية
  const excav_soil  = +(lengthM * tw * soilDepth * slpFactor).toFixed(2);
  const excav_rock  = +(lengthM * tw * rockDepth * 1.15).toFixed(2); // 15% إضافي للصخر
  const excav_total = +(excav_soil + excav_rock).toFixed(2);
  const pipe_vol    = +(pipeVolumePerMeter(diaMM) * lengthM).toFixed(2);
  const sandBed_vol = +(lengthM * tw * sb_m).toFixed(2);
  const backfill_comp = +(excav_total - pipe_vol - sandBed_vol).toFixed(2);
  // الردم المدموك يحتاج كميّة أكبر بعامل الانضغاط
  const backfill_loose= +(backfill_comp / (soil.compact || 0.90)).toFixed(2);
  const disposal_vol  = +((excav_total * soil.swell) - backfill_comp).toFixed(2);
  const reinstat_m2   = +(lengthM * (tw + 0.30)).toFixed(2);

  // التكاليف المفصّلة
  const excav_soil_sar  = +(excav_soil  * soil.excav_sar).toFixed(0);
  const excav_rock_sar  = +(excav_rock  * SOIL_PARAMS.rock.excav_sar).toFixed(0);
  const backfill_sar    = +(backfill_comp * soil.backfill_sar).toFixed(0);
  const sandBed_sar     = +(sandBed_vol * 80).toFixed(0);
  const disposal_sar    = +(disposal_vol > 0 ? disposal_vol * 50 : 0).toFixed(0);
  const sheeting_sar    = hasSheeting    ? +(lengthM * depthM * 2 * 45).toFixed(0) : 0;  // برواز جانبين
  const dewater_sar     = hasDewatering  ? +(lengthM * 35).toFixed(0)              : 0;  // ضخ مياه
  const total_sar = +(+excav_soil_sar + +excav_rock_sar + +backfill_sar + +sandBed_sar + +disposal_sar + sheeting_sar + dewater_sar).toFixed(0);

  return {
    lengthM, diaMM, depthM, soilType, tw, slpFactor,
    excav_soil_m3: excav_soil,
    excav_rock_m3: excav_rock,
    excav_total_m3: excav_total,
    pipe_m3:       pipe_vol,
    sandBed_m3:    sandBed_vol,
    backfill_m3:   backfill_comp > 0 ? backfill_comp : 0,
    backfill_loose_m3: backfill_loose > 0 ? backfill_loose : 0,
    disposal_m3:   disposal_vol > 0 ? disposal_vol  : 0,
    reinstat_m2,
    hasSheeting, hasDewatering,
    cost: { excav_soil_sar, excav_rock_sar, backfill_sar, sandBed_sar, disposal_sar, sheeting_sar, dewater_sar, total_sar },
    soilAr: soil.ar, soilColor: soil.color,
    alerts: [
      depthM > 4  ? `⚠️ عمق ${depthM}م — يستلزم دعم جوانب ومراجعة أمان` : null,
      depthM > 1.5 && !hasSheeting ? `💡 عمق ${depthM}م — يُنصح بدعم الجوانب` : null,
      rockDepth > 0 ? `🪨 صخر ${rockDepth}م — سعر حفر مضاعف` : null,
      hasDewatering ? `💧 تصريف مياه جوفية مضاف` : null,
    ].filter(Boolean),
  };
}

// جمع عدة خنادق لنفس المشروع
function sumEarthworks(trenchList) {
  const out = { excav_soil:0, excav_rock:0, excav_total:0, backfill:0, disposal:0, sandBed:0, reinstat:0, cost_total:0, lines:[] };
  trenchList.forEach(t => {
    out.excav_soil  += t.excav_soil_m3  || 0;
    out.excav_rock  += t.excav_rock_m3  || 0;
    out.excav_total += t.excav_total_m3 || 0;
    out.backfill    += t.backfill_m3    || 0;
    out.disposal    += t.disposal_m3    || 0;
    out.sandBed     += t.sandBed_m3     || 0;
    out.reinstat    += t.reinstat_m2    || 0;
    out.cost_total  += t.cost?.total_sar|| 0;
    out.lines.push(t);
  });
  return out;
}

// استخراج بيانات الحفر والتربة من النص
function extractEarthworksData(text) {
  if (!text) return null;
  const data = {
    soilTypes: [], depths: [], trenchWidths: [],
    hasSheeting: false, hasDewatering: false, hasRock: false,
    rockDepth: 0, gwl: null, // groundwater level
  };

  // نوع التربة
  if (/rock|صخر|bedrock|كرستال/i.test(text))   { data.soilTypes.push("rock");   data.hasRock = true; }
  if (/sand|رمل|sandy|ناعم/i.test(text))         data.soilTypes.push("sand");
  if (/clay|طين|silty|ليموني/i.test(text))        data.soilTypes.push("clay");
  if (/gravel|حصى|حصوية/i.test(text))             data.soilTypes.push("gravel");

  // عمق الصخر
  const rockDepthP = /(?:rock\s*at|صخر\s*(?:على|عند))\s*(\d+(?:[.,]\d+)?)\s*(?:m|م)/gi;
  let rd; while((rd=rockDepthP.exec(text))!==null) { data.rockDepth = parseFloat(rd[1].replace(",",".")); }

  // منسوب المياه الجوفية
  const gwlP = /(?:GWL|water\s*table|مياه\s*جوفية|منسوب\s*مياه)\s*[=:@]?\s*(\d+(?:[.,]\d+)?)\s*(?:m|م)/gi;
  let gw; if((gw=gwlP.exec(text))!==null) data.gwl = parseFloat(gw[1].replace(",","."));

  // أعماق مذكورة
  const depthP = /(?:depth|عمق|حفر)\s*[=:≈]?\s*(\d+(?:[.,]\d+)?)\s*(?:m|م)/gi;
  let dm; while((dm=depthP.exec(text))!==null) { const v=parseFloat(dm[1].replace(",",".")); if(v>0&&v<15) data.depths.push(v); }

  // عروض الخنادق المذكورة
  const twP = /(?:trench\s*width|عرض\s*الخندق)\s*[=:]\s*(\d+(?:[.,]\d+)?)\s*(?:m|م)/gi;
  let tw; while((tw=twP.exec(text))!==null) { const v=parseFloat(tw[1].replace(",",".")); if(v>0.3&&v<5) data.trenchWidths.push(v); }

  // دعم جوانب
  if (/sheet|shoring|دعم\s*(جوانب|جانب)|برواز|propping/i.test(text)) data.hasSheeting = true;
  if (/dewater|pump|ضخ|مياه\s*جوفية|drain\s*pump/i.test(text))       data.hasDewatering = true;

  return data;
}

// ══════════════════════════════════════════════════════════════════════════
//  محرك حسابات الأسفلت والرصف الدقيق v6 — MOT معيار + قطع وإعادة رصف
// ══════════════════════════════════════════════════════════════════════════

// طبقات الأسفلت + رش التمهيدي/اللاصق
const ASPHALT_LAYERS = {
  wearing:    { ar:"طبقة سطحية Wearing",    density:2.35, color:"#0f172a", type:"AC",    sar_t: 315, sar_m2: null },
  binder:     { ar:"طبقة رابطة Binder",     density:2.30, color:"#1e293b", type:"AC",    sar_t: 290, sar_m2: null },
  baseCourse: { ar:"أساس أسفلتي Base",      density:2.25, color:"#334155", type:"AC",    sar_t: 265, sar_m2: null },
  base:       { ar:"أساس مجروش Base",       density:2.10, color:"#78350f", type:"Agg",   sar_t: null, sar_m2: 145 },
  subbase:    { ar:"أساس رملي Sub-base",    density:1.85, color:"#92400e", type:"Agg",   sar_t: null, sar_m2: 110 },
  primeCoat:  { ar:"رش تمهيدي Prime 0.8L",  density:0.92, color:"#7c3aed", type:"Spray", sar_m2: 4.5, ltrPerM2: 0.8 },
  tackCoat:   { ar:"رش لاصق Tack 0.3L",    density:0.92, color:"#6d28d9", type:"Spray", sar_m2: 2.5, ltrPerM2: 0.3 },
};

// هياكل رصف MOT 2024 — سماكات mm
const ROAD_STRUCTURES = {
  local:     { name:"طريق محلي Class D",   wearing:50,  binder:0,  baseCourse:0,   base:200, subbase:150, maxSpeed:40,  cbr:4  },
  collector: { name:"طريق جامع Class C",   wearing:50,  binder:60, baseCourse:0,   base:200, subbase:200, maxSpeed:60,  cbr:5  },
  arterial:  { name:"طريق شرياني Class B", wearing:60,  binder:60, baseCourse:75,  base:250, subbase:250, maxSpeed:80,  cbr:6  },
  highway:   { name:"طريق سريع Class A",   wearing:60,  binder:75, baseCourse:100, base:300, subbase:300, maxSpeed:120, cbr:8  },
  service:   { name:"طريق خدمي",           wearing:40,  binder:0,  baseCourse:0,   base:150, subbase:100, maxSpeed:30,  cbr:3  },
};

// حساب شامل لقطاع طريق
function calcAsphalt({
  lengthM, widthM,
  wearing_mm, binder_mm, baseCourse_mm, base_mm, subbase_mm,
  shoulderWidthM = 0,
  hasCutting = false,    // قطع الرصف القديم
  reinstateOnly = false, // إعادة رصف فقط (بعد تمديد مواسير)
  cuttingWidthM = 0,     // عرض القطع
}) {
  const mainArea  = +(lengthM * widthM).toFixed(2);
  const shArea    = +(lengthM * 2 * shoulderWidthM).toFixed(2);
  const totalArea = +(mainArea + shArea).toFixed(2);
  const cutArea   = hasCutting && cuttingWidthM > 0 ? +(lengthM * cuttingWidthM).toFixed(2) : 0;

  const layers = [];
  const addLayer = (key, thickMM, areaM2) => {
    if (!thickMM || thickMM <= 0 || areaM2 <= 0) return;
    const lyr  = ASPHALT_LAYERS[key];
    const t_m  = thickMM / 1000;
    const vol  = +(areaM2 * t_m).toFixed(2);
    const tons = lyr.density > 0 && lyr.type === "AC" ? +(vol * lyr.density).toFixed(2) : 0;
    const m3   = lyr.type === "Agg" ? vol : 0;
    const ltrs = lyr.ltrPerM2 ? +(areaM2 * lyr.ltrPerM2).toFixed(0) : 0;
    const cost = lyr.type === "AC" && lyr.sar_t
      ? +(tons * lyr.sar_t).toFixed(0)
      : lyr.type === "Agg" && lyr.sar_m2
      ? +(areaM2 * (thickMM/1000) * 1000 * lyr.sar_m2 / 1000).toFixed(0) // م² × سُمك بالسم × سعر/م²/10سم
      : lyr.type === "Spray"
      ? +(areaM2 * lyr.sar_m2).toFixed(0)
      : 0;
    layers.push({ key, ar:lyr.ar, thickMM, area_m2:areaM2, vol_m3:vol, tons, ltrs, color:lyr.color, type:lyr.type, cost_sar:cost });
  };

  addLayer("subbase",    subbase_mm,    totalArea);
  addLayer("base",       base_mm,       totalArea);
  addLayer("primeCoat",  1,             totalArea);   // رش رمزي
  addLayer("baseCourse", baseCourse_mm, mainArea);
  addLayer("tackCoat",   1,             mainArea);
  addLayer("binder",     binder_mm,     mainArea);
  addLayer("tackCoat",   1,             mainArea);
  addLayer("wearing",    wearing_mm,    totalArea);

  const totalAspTons = +layers.filter(l=>l.type==="AC").reduce((s,l)=>s+l.tons,0).toFixed(2);
  const totalAggM3   = +layers.filter(l=>l.type==="Agg").reduce((s,l)=>s+l.vol_m3,0).toFixed(2);
  const totalSprayLtr= +layers.filter(l=>l.type==="Spray").reduce((s,l)=>s+(l.ltrs||0),0).toFixed(0);
  const totalThickMM = (wearing_mm||0)+(binder_mm||0)+(baseCourse_mm||0)+(base_mm||0)+(subbase_mm||0);
  const layerCost    = +layers.reduce((s,l)=>s+(l.cost_sar||0),0).toFixed(0);
  const cuttingCost  = +(cutArea * 18).toFixed(0); // قطع كور 18 SAR/م²
  const totalCost    = +(layerCost + cuttingCost).toFixed(0);
  const costPerM2    = mainArea > 0 ? +(totalCost / mainArea).toFixed(1) : 0;

  return {
    lengthM, widthM, shoulderWidthM,
    mainArea, shArea, totalArea, cutArea,
    layers, totalAspTons, totalAggM3, totalSprayLtr,
    totalThickMM, totalCost, layerCost, cuttingCost, costPerM2,
  };
}

// استخراج طبقات الأسفلت والطريق من النص — محسّن
function extractAsphaltLayers(text) {
  if (!text) return null;
  const f = { wearing:0, binder:0, baseCourse:0, base:0, subbase:0,
    roadWidths:[], roadLengths:[], roadType:null, hasCutting:false };

  // كشف نوع الطريق
  if (/highway|motorway|سريع|express/i.test(text))     f.roadType = "highway";
  else if (/arterial|شرياني|رئيسي|primary/i.test(text)) f.roadType = "arterial";
  else if (/collector|جامع|secondary/i.test(text))      f.roadType = "collector";
  else if (/local|محلي|خدمي|service/i.test(text))       f.roadType = "local";

  // قطع الرصف
  if (/cut|milling|قطع|كور|تكسير/i.test(text)) f.hasCutting = true;

  // أنماط السُمك
  const pats = [
    [/wearing\s*(?:course)?\s*(?:t\s*=\s*|=\s*|:)?\s*(\d{2,3})\s*mm/gi,      "wearing"],
    [/surface\s*(?:course)?\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*mm/gi,            "wearing"],
    [/(?:طبقة\s*)?سطحية\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*(?:mm|مم)/gi,        "wearing"],
    [/binder\s*(?:course)?\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*mm/gi,             "binder"],
    [/(?:طبقة\s*)?رابطة\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*(?:mm|مم)/gi,        "binder"],
    [/base\s*course\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*mm/gi,                    "baseCourse"],
    [/أساس\s*أسفلت\w*\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*(?:mm|مم)/gi,          "baseCourse"],
    [/(?:crushed|مجروش)\s*(?:stone|base)?\s*(?:t\s*=\s*|=\s*)?(\d{3,4})\s*mm/gi, "base"],
    [/(?:طبقة\s*)?أساس\s*(?:مجروش|حصوي)\s*(?:t\s*=\s*|=\s*)?(\d{3,4})\s*(?:mm|مم)/gi, "base"],
    [/sub.?base\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*mm/gi,                        "subbase"],
    [/(?:طبقة\s*)?(?:رمل|أساس\s*رملي)\s*(?:t\s*=\s*|=\s*)?(\d{2,3})\s*(?:mm|مم)/gi,"subbase"],
  ];
  pats.forEach(([pat,key]) => {
    let m;
    while ((m = new RegExp(pat.source, pat.flags).exec(text)) !== null) {
      const v = parseInt(m[1]);
      if (v >= 20 && v <= 600 && f[key] === 0) f[key] = v;
    }
  });

  // تطبيق هيكل MOT الافتراضي إذا لم تُكتشف سُمكات
  if (f.roadType && !f.wearing && !f.binder && !f.base) {
    const struct = ROAD_STRUCTURES[f.roadType];
    Object.assign(f, { wearing: struct.wearing, binder: struct.binder, baseCourse: struct.baseCourse, base: struct.base, subbase: struct.subbase });
  }

  // عرض الطريق
  const wPat = /(?:road\s*width|carriageway|عرض\s*(?:الطريق|الرصف|الخط))\s*[=:≈]?\s*(\d+(?:[.,]\d+)?)\s*(?:م|m)/gi;
  let wm; while((wm=wPat.exec(text))!==null) { const v=parseFloat(wm[1]); if(v>2&&v<60) f.roadWidths.push(v); }

  // طول الطريق من chainage
  const chs = [];
  const chPat = /CH\s*(\d+\+\d{3}|\d+[.,]\d+)/gi;
  let cm; while((cm=chPat.exec(text))!==null) chs.push(cm[1]);
  if (chs.length >= 2) {
    const parse = s => { const p=s.replace(",","+").split("+"); return parseInt(p[0])*1000+(parseInt(p[1])||0); };
    const span = parse(chs[chs.length-1]) - parse(chs[0]);
    if (span > 0) f.roadLengths.push(span);
  }

  return f;
}

// ── مكوّن لوحة الحفر والردم المحسّنة v6 ──
function EarthworksPanel({ xStats, T, D }) {
  const ew = xStats?.earthworksSummary;
  const [expanded, setExpanded] = useState(false);
  if (!ew || ew.excav_total < 1) return null;

  const alerts = xStats?.earthworkAlerts || [];
  const pipes  = xStats?.pipeNetwork || [];
  const hasRock = ew.excav_rock > 0;

  return (
    <div style={{background:D?"linear-gradient(135deg,#1a0800,#2d1400)":"linear-gradient(135deg,#fff7ed,#ffedd5)",border:`2px solid ${D?"#c2410c50":"#fed7aa"}`,borderRadius:12,padding:12}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>⛏️</span>
          <div>
            <div style={{fontSize:11,color:"#ea580c",fontWeight:900}}>حسابات الحفر والردم</div>
            <div style={{fontSize:8.5,color:T.t3}}>محسوب تلقائياً · {pipes.length} خط أنابيب</div>
          </div>
        </div>
        <button className="bo" style={{fontSize:8,padding:"3px 9px",borderColor:"#ea580c",color:"#ea580c"}} onClick={()=>setExpanded(!expanded)}>{expanded?"▲ طيّ":"▼ تفاصيل"}</button>
      </div>

      {/* تنبيهات */}
      {alerts.length > 0 && (
        <div style={{marginBottom:8,display:"flex",flexDirection:"column",gap:3}}>
          {alerts.slice(0,3).map((a,i)=>(
            <div key={i} style={{background:D?"#431407":"#fff7ed",border:"1px solid #fb923c",borderRadius:6,padding:"4px 9px",fontSize:8.5,color:"#ea580c"}}>{a}</div>
          ))}
        </div>
      )}

      {/* KPIs رئيسية */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:8}}>
        {[
          ["⛏️ حفر تربة",  `${(ew.excav_soil||0).toFixed(0)} م³`,    "#dc2626"],
          ["🪨 حفر صخر",   `${(ew.excav_rock||0).toFixed(0)} م³`,    "#6b7280"],
          ["🔄 ردم مدموك", `${(ew.backfill||0).toFixed(0)} م³`,     "#16a34a"],
          ["🚛 تخلص/نقل",  `${(ew.disposal||0).toFixed(0)} م³`,     "#64748b"],
          ["🏖️ فرشة رملية",`${(ew.sandBed||0).toFixed(0)} م³`,      "#ca8a04"],
          ["🔷 تكلفة",     `${((ew.cost_total||0)/1000).toFixed(0)}ك SAR`,"#2563eb"],
        ].map(([l,v,c])=>(
          <div key={l} style={{background:D?"#1a0808":"#fff",borderRadius:7,padding:"7px 9px",border:`1px solid ${c}25`}}>
            <div style={{fontSize:7.5,color:T.t3}}>{l}</div>
            <div style={{fontSize:12,color:c,fontWeight:800}}>{v}</div>
          </div>
        ))}
      </div>

      {/* شريط التكوين */}
      {(ew.excav_total||0) > 0 && (
        <div style={{height:7,borderRadius:4,overflow:"hidden",display:"flex",marginBottom:6}}>
          {[["#dc2626",ew.excav_soil||0],["#6b7280",ew.excav_rock||0]].map(([c,v])=>
            <div key={c} style={{flex:v,background:c}}/>)}
        </div>
      )}

      {/* تفاصيل حسب خط */}
      {expanded && pipes.filter(p=>p.totalLength>0).length > 0 && (
        <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:8}}>
          <div style={{fontSize:8.5,color:"#ea580c",fontWeight:700,marginBottom:5}}>📋 تفصيل حسب القطر</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",fontSize:7.5,borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:D?"#2a1000":"#fff7ed"}}>
                  {["القطر","الطول م.ط","العمق م","عرض خندق","حفر م³","ردم م³","تخلص م³","SAR"].map(h=>(
                    <th key={h} style={{padding:"3px 6px",color:"#ea580c",fontWeight:700,textAlign:"center",borderBottom:`1px solid ${D?"#431407":"#fed7aa"}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pipes.filter(p=>p.totalLength>0).map((p,i)=>{
                  const avgD = p.maxDepth > 0 ? (+(p.minDepth+p.maxDepth)/2).toFixed(1) : "2.0";
                  const tw   = trenchWidth(p.dia, +avgD);
                  const ew2  = calcTrenchEarthworks({ lengthM:p.totalLength, diaMM:p.dia, depthM:+avgD });
                  return (
                    <tr key={i} style={{borderBottom:`1px solid ${T.bd}`}}>
                      <td style={{padding:"3px 6px",color:p.color,fontWeight:700}}>Ø{p.dia}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",color:T.t2}}>{p.totalLength.toFixed(0)}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",color:T.t2}}>{avgD}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",color:T.t3}}>{tw}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",color:"#dc2626",fontWeight:700}}>{ew2.excav_total_m3}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",color:"#16a34a",fontWeight:700}}>{ew2.backfill_m3}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",color:"#64748b"}}>{ew2.disposal_m3}</td>
                      <td style={{padding:"3px 6px",textAlign:"center",color:"#2563eb",fontWeight:700}}>{((ew2.cost?.total_sar||0)/1000).toFixed(0)}ك</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* تفاصيل التكلفة */}
          {ew.costBreakdown && (
            <div style={{marginTop:8}}>
              <div style={{fontSize:8.5,color:"#ea580c",fontWeight:700,marginBottom:5}}>💰 تفصيل التكلفة</div>
              {Object.entries(ew.costBreakdown).filter(([,v])=>v>0).map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:8,marginBottom:3,color:T.t2}}>
                  <span>{k}</span>
                  <span style={{color:T.gold,fontWeight:700}}>{(v/1000).toFixed(1)}ك SAR</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── مكوّن لوحة الأسفلت المحسّنة v6 ──
function AsphaltPanel({ xStats, T, D }) {
  const asp = xStats?.asphaltSummary;
  const [expanded, setExpanded] = useState(false);
  if (!asp || (!asp.totalTons && !asp.totalArea)) return null;

  const costPerM2 = asp.totalArea > 0 ? (asp.totalCost / asp.totalArea).toFixed(0) : 0;

  return (
    <div style={{background:D?"linear-gradient(135deg,#0a0a0c,#18181b)":"linear-gradient(135deg,#f8fafc,#f1f5f9)",border:`2px solid ${D?"#52525b50":"#cbd5e1"}`,borderRadius:12,padding:12}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>🛣️</span>
          <div>
            <div style={{fontSize:11,color:D?"#e2e8f0":"#1e293b",fontWeight:900}}>حسابات الأسفلت والرصف</div>
            <div style={{fontSize:8.5,color:T.t3}}>{asp.roadType ? ROAD_STRUCTURES[asp.roadType]?.name : "رصف عام"} · {asp.totalThickMM||0}mm إجمالي</div>
          </div>
        </div>
        <button className="bo" style={{fontSize:8}} onClick={()=>setExpanded(!expanded)}>{expanded?"▲ طيّ":"▼ تفاصيل"}</button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:8}}>
        {[
          ["📐 المساحة",     `${(asp.totalArea||0).toFixed(0)} م²`,         "#2563eb"],
          ["⚖️ أسفلت",       `${(asp.totalTons||0).toFixed(1)} طن`,          "#1e293b"],
          ["🪨 أساس مجروش",  `${(asp.totalAggM3||0).toFixed(0)} م³`,         "#92400e"],
          ["💧 رش أسفلتي",  `${(asp.totalSprayLtr||0).toFixed(0)} لتر`,      "#7c3aed"],
          ["💰 سعر/م²",      `${costPerM2} SAR`,                             "#ca8a04"],
          ["🏷️ الإجمالي",   `${((asp.totalCost||0)/1000).toFixed(0)}ك SAR`, "#16a34a"],
        ].map(([l,v,c])=>(
          <div key={l} style={{background:D?"#11111180":"#fff",borderRadius:7,padding:"7px 9px",border:`1px solid ${c}25`}}>
            <div style={{fontSize:7.5,color:T.t3}}>{l}</div>
            <div style={{fontSize:12,color:c,fontWeight:800}}>{v}</div>
          </div>
        ))}
      </div>

      {/* مقياس الطبقات — مقطع عرضي مبسّط */}
      {asp.layers && asp.layers.length > 0 && (() => {
        const totalMM = asp.layers.reduce((s,l)=>s+(l.thickMM||0),0)||1;
        return (
          <div style={{marginBottom:8}}>
            <div style={{fontSize:8,color:T.t3,marginBottom:4}}>مقطع الطبقات (نسبي):</div>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {[...asp.layers].reverse().filter(l=>l.thickMM>1).map((l,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{height:Math.max(6,l.thickMM/totalMM*50),flex:1,background:l.color,borderRadius:2,minWidth:60}}/>
                  <div style={{fontSize:7.5,color:T.t3,whiteSpace:"nowrap"}}>{l.thickMM}mm — {l.ar.split(" ")[0]} — {l.type==="AC"?`${l.tons}t`:l.type==="Agg"?`${l.vol_m3}م³`:`${l.ltrs||0}L`}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* تفاصيل موسّعة */}
      {expanded && (
        <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:8}}>
          <div style={{fontSize:8.5,color:T.t1,fontWeight:700,marginBottom:5}}>📊 جدول الطبقات الكامل</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",fontSize:7.5,borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:D?"#18181b":"#f1f5f9"}}>
                  {["الطبقة","السُمك mm","المساحة م²","الحجم م³","الوزن طن","التكلفة SAR"].map(h=>(
                    <th key={h} style={{padding:"3px 7px",color:T.t2,fontWeight:700,textAlign:"center",borderBottom:`1px solid ${T.bd}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asp.layers.filter(l=>l.thickMM>1).map((l,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${T.bd}`}}>
                    <td style={{padding:"3px 7px",display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:8,height:8,background:l.color,borderRadius:2,flexShrink:0}}/>
                      <span style={{color:T.t2,fontSize:7.5}}>{l.ar}</span>
                    </td>
                    <td style={{padding:"3px 7px",textAlign:"center",color:T.t2,fontWeight:700}}>{l.thickMM}</td>
                    <td style={{padding:"3px 7px",textAlign:"center",color:T.t3}}>{l.area_m2}</td>
                    <td style={{padding:"3px 7px",textAlign:"center",color:T.t3}}>{l.vol_m3}</td>
                    <td style={{padding:"3px 7px",textAlign:"center",color:T.t1,fontWeight:700}}>{l.tons||"—"}</td>
                    <td style={{padding:"3px 7px",textAlign:"center",color:T.gold,fontWeight:700}}>{(l.cost_sar||0).toLocaleString()}</td>
                  </tr>
                ))}
                <tr style={{background:D?"#18181b":"#f8fafc",fontWeight:700}}>
                  <td colSpan={5} style={{padding:"5px 7px",color:T.t1,textAlign:"right"}}>الإجمالي</td>
                  <td style={{padding:"5px 7px",textAlign:"center",color:T.gold}}>{(asp.totalCost||0).toLocaleString()} SAR</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* BOQ نصوص جاهزة للنسخ */}
          <div style={{marginTop:8,background:D?"#0f172a":"#f8fafc",borderRadius:8,padding:"8px 10px",border:`1px solid ${T.bd}`}}>
            <div style={{fontSize:8,color:T.t3,marginBottom:4}}>بنود BOQ جاهزة:</div>
            {asp.layers.filter(l=>l.thickMM>1&&l.type==="AC").map((l,i)=>(
              <div key={i} style={{fontSize:7.5,color:T.t2,marginBottom:2}}>
                KSA-RD-ASP-ZA-{String(i+1).padStart(3,"0")} | {l.ar} {l.thickMM}mm | م² | {l.area_m2} | {(l.cost_sar/l.area_m2||0).toFixed(0)} | {l.cost_sar?.toLocaleString()} | ✅
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function buildProjectContext(allResults) {
  if (!allResults.length) return "";
  const combined = allResults.map(r=>r.reply||"").join("\n");
  const projMatch  = combined.match(/مشروع[:：\s]+([^\n|]{5,60})/);
  const scaleMatch = combined.match(/مقياس[:：\s]+(1:\d+)/);
  const authMatch  = combined.match(/NWC|MOT|أمانة|بلدية|الهيئة الملكية|MOMRA/i);

  // أقطار الأنابيب المتراكمة
  const pipeRows = [];
  const pipeRE = /Ø(\d{2,4})\s*mm?\s*(PVC\s*SN\d*|HDPE\s*PE\d*|GRP|DI\s*PN\d*|RCP)?/gi;
  let pm; while((pm=pipeRE.exec(combined))!==null) pipeRows.push(`Ø${pm[1]}${pm[2]?" "+pm[2]:""}`);
  const uniquePipes = [...new Set(pipeRows)].slice(0,12);

  // بنود KSA المستخرجة
  const ksaCodes = (combined.match(/KSA-[A-Z]{2,6}-[A-Z]{2,6}-[A-Z]{1,4}-\d{3}/g)||[]);
  const uniqueCodes = [...new Set(ksaCodes)].slice(0,10);

  // مناسيب IL المكتشفة
  const ilLevels = [];
  const ilRE = /(?:IL|INV)\s*=?\s*([-+]?\d{1,4}[.,]\d{1,2})/g;
  let il; while((il=ilRE.exec(combined))!==null) ilLevels.push(il[1]);
  const uniqueIL = [...new Set(ilLevels)].slice(0,6);

  // ── استخراج إجماليات الحفر والردم المتراكمة ──
  const excavNums = [...combined.matchAll(/(?:حفر|EXC)[^\d]*(\d[\d,]+)\s*م³/g)].map(m=>parseFloat(m[1].replace(/,/g,"")));
  const backfillNums = [...combined.matchAll(/(?:ردم|BKF)[^\d]*(\d[\d,]+)\s*م³/g)].map(m=>parseFloat(m[1].replace(/,/g,"")));
  const disposalNums = [...combined.matchAll(/(?:تخلص|DSP)[^\d]*(\d[\d,]+)\s*م³/g)].map(m=>parseFloat(m[1].replace(/,/g,"")));
  const totalExcav   = excavNums.length   ? Math.max(...excavNums).toLocaleString()   : null;
  const totalBkf     = backfillNums.length ? Math.max(...backfillNums).toLocaleString() : null;
  const totalDisp    = disposalNums.length ? Math.max(...disposalNums).toLocaleString() : null;

  // ── استخراج نوع التربة والصخر ──
  const soilType = combined.match(/(?:تربة|soil)\s*(رملية|طينية|صخرية|عادية|مشكّلة)/i)?.[1];
  const hasRock  = /صخر|rock|تفجير|blasting/i.test(combined);
  const hasGWL   = /مياه جوفية|groundwater|GWL|water table/i.test(combined);

  // ── استخراج بيانات الأسفلت المتراكمة ──
  const aspNums   = [...combined.matchAll(/(?:أسفلت|asphalt)[^\d]*(\d[\d,]+)\s*طن/g)].map(m=>parseFloat(m[1].replace(/,/g,"")));
  const areaRe    = combined.match(/(?:مساحة|area)[^\d]*(\d[\d,]+)\s*م²/i);
  const roadTypes = [...combined.matchAll(/(?:طريق|road)\s*(سريع|شرياني|جامع|محلي|خدمة)/ig)].map(m=>m[1]);
  const totalTons = aspNums.length ? Math.max(...aspNums).toFixed(0) : null;
  const totalArea = areaRe ? (+areaRe[1].replace(/,/g,"")).toLocaleString() : null;

  // ── إجمالي التكلفة التراكمي ──
  const costNums = [...combined.matchAll(/(?:إجمالي|total)[^\d]*(\d[\d,]{4,})\s*SAR/g)].map(m=>parseFloat(m[1].replace(/,/g,"")));
  const maxCost  = costNums.length ? Math.max(...costNums).toLocaleString() : null;

  const lines = [];
  if (projMatch)              lines.push(`المشروع: ${projMatch[1].trim()}`);
  if (scaleMatch)             lines.push(`المقياس: ${scaleMatch[1]}`);
  if (authMatch)              lines.push(`الجهة: ${authMatch[0]}`);
  if (uniquePipes.length)     lines.push(`أقطار مكتشفة: ${uniquePipes.join(" | ")}`);
  if (uniqueIL.length)        lines.push(`مناسيب IL مكتشفة: ${uniqueIL.join(" | ")}`);
  if (soilType||hasRock||hasGWL) {
    const soilLine = [`نوع التربة: ${soilType||"عادية"}`];
    if (hasRock) soilLine.push("صخر مكتشف ← عامل ×1.15");
    if (hasGWL)  soilLine.push("مياه جوفية ← ضخ مطلوب");
    lines.push(soilLine.join(" | "));
  }
  if (totalExcav||totalBkf) {
    const ewLine = [];
    if (totalExcav) ewLine.push(`حفر: ${totalExcav} م³`);
    if (totalBkf)   ewLine.push(`ردم: ${totalBkf} م³`);
    if (totalDisp)  ewLine.push(`تخلص: ${totalDisp} م³`);
    lines.push(`أعمال ترابية متراكمة: ${ewLine.join(" | ")}`);
  }
  if (totalTons||totalArea) {
    const aspLine = [];
    if (totalArea) aspLine.push(`مساحة: ${totalArea} م²`);
    if (totalTons) aspLine.push(`أسفلت: ${totalTons} طن`);
    if (roadTypes.length) aspLine.push(`نوع الطريق: ${[...new Set(roadTypes)].join("/")} `);
    lines.push(`أعمال رصف متراكمة: ${aspLine.join(" | ")}`);
  }
  if (maxCost)                lines.push(`أعلى إجمالي SAR مكتشف: ${maxCost}`);
  if (uniqueCodes.length)     lines.push(`بنود KSA سابقة: ${uniqueCodes.join(", ")}`);
  return lines.length
    ? `\n══ سياق مكتشف من الدُفعات السابقة ══\n${lines.join("\n")}\n← لا تكرر البنود المذكورة — أضف فقط ما هو جديد ومختلف.\n`
    : "";
}

// ─── System Prompts الجديدة المتخصصة ───────────────────────────────────────

const SYS_MAIN = (cfg, depth, mods, ocr) => `أنت نظام ALIMTYAZ ALWATANIA v11 — محرك هندسي وتجاري متخصص للمقاولين السعوديين.
${cfg}
عمق التحليل: ${depth==="deep"?"🔬 عميق — تحقق مزدوج — دقة 95%":depth==="standard"?"📊 قياسي — دقة 85%":"⚡ سريع — دقة 70%"}
الوحدات النشطة: ${mods.join(" | ")||"جميع الوحدات"}

══ منهجية العمل الإلزامية ══
١ كشف نوع المخطط فوراً:
  → مسقط أفقي | قطاع طولي | قطاع عرضي | تفصيل إنشائي | جدول غرف | BOQ | مواصفات | غلاف
٢ استخراج بيانات Title Block:
  | المشروع | الجهة | المصمم | التاريخ | المقياس | رقم اللوحة | المراجعة |
٣ الامتثال السعودي (✓/✗ لكل بند مع رقم المعيار):
  • MOT: سماكة Wearing≥50mm | عرض الكتف≥1.5م | ميل عرضي 2–3% | R_min حسب التصنيف
  • NWC: عمق أدنى≥1.2م | SN/PN مناسب | صمام هواء كل 500م | كتلة دفع عند الانحناء
  • SBC 304/305: غطاء تسليح≥40mm | نسبة ρ 0.25–4%
  • MOMRA: إنارة | علامات | تصريف
٤ الكميات (بالمعادلة الصريحة لكل بند — v6 engines):
  أنابيب: L م.ط لكل قطر/مادة
  ── الحفر والردم (فصل التربة/الصخر إلزامي) ──
  W = Ø≤300→Ø+0.60 | Ø≤600→Ø+0.70 | Ø≤900→Ø+0.80 | Ø>900→Ø+1.10 م
  إضافة 0.10م عند عمق >1.5م
  حفر_تربة = L×W×D_تربة (م³)
  حفر_صخر  = L×W×D_صخر×1.15 (م³) [إضافة 15% تفجير]
  ردم_مدموك = حفر_كلي − أنبوب − فرشة_150mm
  ردم_فعلي  = ردم ÷ {0.90/عادي|0.95/رمل|0.85/طين}
  تخلص = حفر × {1.25/عادي|1.12/رمل|1.30/طين|1.45/صخر} − ردم
  دعم_جوانب: L×D×2 م² (عمق>1.5م) | ضخ مياه: أيام×سعر/يوم
  ── الرصف والأسفلت (MOT 2024) ──
  مساحة_رئيسية=L×W | مساحة_كلية=L×(W+2×كتف)
  Wearing(طن)=A_كلية×t_m×2.35 | Binder=A×t_m×2.30 | BaseAC=A×t_m×2.25
  مجروش(م³)=A×t_m | Prime=A×0.80لتر/م² | Tack=A×0.30×عدد_فواصل
  | الكود KSA | الوصف | المعادلة | الكمية | الوحدة | الثقة |
  DISC: EXC=حفر تربة|EXR=حفر صخر|SHT=دعم جوانب|DWT=ضخ مياه|PIP=أنابيب|MH=غرف|BKF=ردم|BED=فرشة|DSP=تخلص|RD=رصف|STR=إنشائي|MAR=بحري
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
${ocr?`\n══ OCR النشط ══\nTitle Block | أبعاد | أنابيب Ø/مادة/PN | مناسيب GL,IL | إحداثيات | طبقات رصف`:""}`;
// ── نظام متخصص للمخططات البصرية — محرك حصر الأنابيب الدقيق v5 ──
const SYS_VISUAL_INFRA = (cfg, chunkLabel, drawTypes, scale, projectCtx) => {
  const typeStr = drawTypes.length ? drawTypes.join(" + ") : "بنية تحتية عامة";
  const scaleHint = scale && scale!=="NTS"
    ? `المقياس المؤكد: ${scale} — استخدمه لحساب الأبعاد الحقيقية`
    : "المقياس: غير محدد — اذكر [NTS] واستخرج الأبعاد المدوّنة فقط";
  return `أنت محرك ALIMTYAZ v10 للحصر الدقيق — البنية التحتية السعودية (تحليل بصري).
${cfg}
الدُفعة: ${chunkLabel} | الأنواع: ${typeStr} | ${scaleHint}
${projectCtx}

══ بروتوكول حصر الأنابيب الدقيق v5 (إلزامي) ══

STEP 1 — تحديد نوع المخطط [إلزامي في السطر الأول]:
  [PLN] مسقط | [PRF] قطاع طولي | [XSC] قطاع عرضي | [MHC] جدول غرف | [BOQ] | [STR] | [MAR] | [SPC]

STEP 2 — استخراج Title Block:
  | المشروع | الجهة | المصمم | التاريخ | المقياس | رقم اللوحة | المراجعة |

STEP 3 — جدول الأنابيب الشامل (لكل وصلة):
  | # | من | إلى | القطر mm | المادة | SN/PN | الطول م | الميل % | IL In م | IL Out م | عمق الحفر م | الثقة |
  قواعد المادة الإلزامية:
  ✦ اذكر دائماً: PVC SN8 / PVC SN4 / HDPE PE100 / GRP SN10000 / DI PN16 / RCP Class3
  ✦ لا تكتب "PVC" فقط — اذكر فئة الصلابة (SN) أو الضغط (PN)
  ✦ إذا لم تُذكر المادة: [مادة غير محددة] — لا تفترض
  ✦ الميل: احسب = (IL_In − IL_Out) / طول × 100 → أبلغ إذا < 0.2% أو > 15%

STEP 4 — [PRF] قطاع طولي — بروتوكول المناسيب:
  جدول الغرف الكامل:
  | GH# | Chainage م | GL م | IL In م | IL Out م | عمق الحفر م | قطر الغرفة mm | النوع |
  عمق الحفر = GL − min(IL_In, IL_Out)
  جدول الأنابيب بين الغرف:
  | من | إلى | الطول م | الميل % | القطر mm | المادة/SN | حجم حفر م³ |
  حجم حفر = طول × (قطر/1000 + 0.6) × عمق_متوسط
  ⚠️ أبلغ عن: ميل < 0.2% | ميل > 15% | انعكاس منسوب | عمق > 5م

STEP 5 — [PLN] مسقط أفقي:
  | الخط | من | إلى | القطر mm | المادة/SN | الطول م | الغرف # | ملاحظة |
  إجماليات: Σ(طول) لكل قطر/مادة | عدد الغرف حسب القطر

STEP 6 — [XSC] قطاع عرضي:
  | الطبقة | المادة | السماكة mm | العرض م | الكمية م²/م.ط |
  جسم الطريق: | طول × عرض | المساحة م² |
  خندق الأنبوب: عرض = قطر + 0.6م | حجم = طول × عرض × عمق

STEP 7 — [MHC] جدول الغرف:
  | GH# | X | Y | Z(GL) | Inv In | Inv Out | Depth م | Ø غرفة mm | Type | Pipe In Ø | Pipe Out Ø |
  إجماليات: عدد حسب النوع والقطر

STEP 8 — BOQ التفصيلي (إلزامي بجميع البنود):
  | الكود KSA | الوصف الكامل (مادة+قطر+SN/PN+طريقة التركيب) | المعادلة | الكمية | الوحدة | سعر SAR | إجمالي SAR | الثقة |
  ترميز: KSA-[DISC]-[WORK]-[ZONE]-[SEQ]
  أمثلة:
  KSA-SWR-PIP-ZA-001 | أنبوب PVC SN8 Ø300mm بالمواصفة NWC | 245×1.0 | 245 | م.ط | 162 | 39,690 | ✅
  KSA-SWR-EXC-ZA-001 | حفر خنادق آلي عمق 2م Ø300 | 245×0.9×2.0 | 441 | م³ | 50 | 22,050 | ✅
  KSA-SWR-MH-ZA-001 | غرفة صرف خرسانية Ø1200mm عمق 3م | عدد | 12 | عدد | 5,500 | 66,000 | 🔍

STEP 8B — بروتوكول الحفر والردم الدقيق v6 (لكل خط أنبوب):
  ══ معادلات NWC/MOT الإلزامية ══
  عرض الخندق W (بحسب القطر والعمق):
    • Ø≤300mm → W = Ø_m + 0.60م
    • Ø≤600mm → W = Ø_m + 0.70م
    • Ø≤900mm → W = Ø_m + 0.80م
    • Ø≤1200mm→ W = Ø_m + 0.90م
    • Ø>1200mm → W = Ø_m + 1.10م
    • إضافة 0.10م للعمق > 1.5م (دعم جوانب)

  حجوم الحفر (اذكر نوع التربة دائماً):
    حفر_تربة = L × W × D_تربة (م³)
    حفر_صخر  = L × W × D_صخر × 1.15 (م³)  ← إضافة 15% للتفجير
    حفر_إجمالي = حفر_تربة + حفر_صخر

  الردم والتخلص:
    حجم_أنبوب = (π/4) × Ø_OD² × L (م³)
    فرشة_رمل = L × W × 0.15 (م³)
    ردم_مدموك = حفر_إجمالي − حجم_أنبوب − فرشة_رمل (م³)
    ردم_فعلي = ردم_مدموك / عامل_انضغاط
      • تربة عادية: ÷ 0.90 | رملية: ÷ 0.95 | طينية: ÷ 0.85
    تخلص = حفر × عامل_انتفاش − ردم_مدموك (م³)
      • تربة عادية: ×1.25 | رملية: ×1.12 | طينية: ×1.30 | صخرية: ×1.45

  بنود BOQ إلزامية مفصّلة:
  KSA-SWR-EXC-ZA-001 | حفر خنادق آلي تربة [النوع] عمق [X]م Ø[Y]  | L×W×D | م³ | [35–95 SAR]
  KSA-SWR-EXR-ZA-002 | حفر صخر [نوعه] | L×W×D×1.15 | م³ | [180–380 SAR]
  KSA-SWR-SHT-ZA-003 | دعم جوانب خندق عمق>[1.5م] | L×D×2 | م² | [85–150 SAR] ← إن وُجد
  KSA-SWR-DWT-ZA-004 | ضخ مياه جوفية [يومي/مستمر] | أيام | يوم | [1500–3500 SAR] ← إن وُجد
  KSA-SWR-BED-ZA-005 | فرشة رملية 150mm تحت الأنبوب | L×W×0.15 | م³ | 80 SAR
  KSA-SWR-BKF-ZA-006 | ردم رملي مدموك ≥95% Proctor | ردم_مدموك | م³ | [40–65 SAR]
  KSA-SWR-DSP-ZA-007 | نقل وتخلص من الحفريات خارج الموقع | تخلص | م³ | [40–90 SAR]
  KSA-SWR-ENC-ZA-008 | حماية خرسانية encasement C25 | L | م.ط | [380–560 SAR] ← عند التقاطعات

  تنبيهات إلزامية:
  ⚠️ عمق >4م → مطلوب دعم جوانب + إشراف مهندس سلامة
  ⚠️ مياه جوفية → ضخ مستمر + حماية قاعدة الخندق
  ⚠️ صخر → تأكيد بتقرير التربة قبل التسعير

STEP 8C — بروتوكول أعمال الأسفلت والرصف v6 (للمخططات [XSC] و [PLN]):
  ══ حساب الكميات الإلزامي (كل طبقة منفصلة) ══
  المساحة_رئيسية = طول × عرض_الرصف (م²)
  المساحة_الكتف  = طول × 2 × عرض_الكتف (م²)
  المساحة_الكلية = رئيسي + كتف

  وزن الأسفلت (كل طبقة = طن):
    Wearing Course:   مساحة_كلية × سماكة_م × 2.35
    Binder Course:    مساحة_رئيسية × سماكة_م × 2.30
    Base Course AC:   مساحة_رئيسية × سماكة_م × 2.25
    [اذكر هيكل الطريق: محلي/جامع/شرياني/سريع]

  حجوم الركام:
    أساس مجروش = مساحة_كلية × سماكة_م (م³)
    طبقة رمل   = مساحة_كلية × سماكة_م (م³)

  كميات الرش:
    Prime Coat: مساحة × 0.80 لتر/م² (لتر)
    Tack Coat:  مساحة × 0.30 لتر/م² بين كل طبقتين (لتر)

  قطع الرصف القائم (إن وُجد):
    مساحة القطع = طول × عرض_المقطوع (م²)

  جدول طبقات الرصف الكامل:
  | الطبقة | السماكة mm | المساحة م² | الحجم/الوزن | الكثافة | التكلفة SAR | الثقة |

  بنود BOQ إلزامية للرصف:
  KSA-RD-CUT-ZA-001 | قطع وإزالة رصف قائم | A_قطع | م² | [35–60 SAR]
  KSA-RD-SUB-ZA-002 | طبقة رمل Sub-base [X]mm | A×X_m | م³ | [65–130 SAR/م²]
  KSA-RD-BSE-ZA-003 | طبقة أساس مجروش [X]mm | A×X_m | م³ | [100–230 SAR/م²]
  KSA-RD-PRM-ZA-004 | رش تمهيدي Prime Coat 0.8L/م² | A | م² | [8–15 SAR]
  KSA-RD-BAC-ZA-005 | أساس أسفلتي Base Course [X]mm | طن | [265–285 SAR/طن]
  KSA-RD-TCK-ZA-006 | رش لاصق Tack Coat 0.3L/م² | A | م² | [5–10 SAR]
  KSA-RD-BND-ZA-007 | طبقة رابطة Binder [X]mm | طن | [290–300 SAR/طن]
  KSA-RD-TCK-ZA-008 | رش لاصق Tack Coat 0.3L/م² | A | م² | [5–10 SAR]
  KSA-RD-WRG-ZA-009 | طبقة سطحية Wearing [X]mm | طن | [315–330 SAR/طن]
  KSA-RD-RST-ZA-010 | إعادة رصف بعد حفر الخنادق | L×(W+0.30) | م² | [185–245 SAR]
  ${SAR_REF_2025}

STEP 9 — تحقق الاتساق:
  • طول PLN مقابل Σ(طول PRF) → فرق مقبول < 2%
  • أعماق MHC مقابل PRF → تعارض؟
  • مواصفات SN/PN مطابقة لمتطلبات NWC للعمق؟
  • هيكل الرصف مطابق للتصنيف الوظيفي للطريق (MOT)?

STEP 10 — ملخص + حساسية + 3 توصيات تنفيذية فورية
  التكلفة الإجمالية: مباشرة + 12% مصاريف + 8% ربح + 5% احتياطي
  جدول حساسية ±5% ±10% ±15%`;
};

// ── نظام الاستخراج السريع المحسّن — حصر الأنابيب الدقيق v5 ──
const SYS_FAST = (cfg, info, drawTypes, scales, projectCtx) => {
  const typeHint = drawTypes.length ? `أنواع محتملة: ${drawTypes.map(t=>DRAW_TYPES[t]?.ar||t).join(" | ")}` : "";
  const scaleHint = scales.length ? `مقاييس مكتشفة: ${scales.join(", ")}` : "";
  return `أنت محرك ALIMTYAZ v10 للحصر الدقيق من النصوص — البنية التحتية السعودية.
${cfg} | ${info}
${typeHint}${scaleHint ? "\n"+scaleHint : ""}
${projectCtx}

══ بروتوكول استخراج الأنابيب الدقيق (8 خطوات) ══
١ نوع كل صفحة: [PLN] [PRF] [XSC] [MHC] [BOQ] [SPC] [STR] [MAR] [CVR]
٢ Title Block: مشروع | جهة | مقياس | تاريخ | رقم اللوحة

٣ جدول الأنابيب الكامل (لكل وصلة أو قطر مذكور):
  | القطر mm | المادة | SN/PN | الطول م | الميل % | IL In | IL Out | عمق الحفر م | الثقة |
  ← المادة إلزامية: PVC SN8 / HDPE PE100 / GRP SN10000 / DI PN16 / RCP Class3
  ← إذا غير مذكورة: [مادة غير محددة] — لا تفترض أبداً
  ← الميل = (IL_In − IL_Out) / طول × 100 [تنبيه: < 0.2% أو > 15%]

٤ جدول الغرف/البيارات:
  | GH# | Chainage | GL م | IL In م | IL Out م | عمق م | قطر mm | النوع |
  عمق = GL − min(IL_In, IL_Out) | تنبيه: عمق > 5م → مخطر

٥ حساب الكميات بالمعادلة الصريحة:
  ── أنابيب ──
  طول = Σ(Chainage_نهاية − Chainage_بداية) لكل قطر/مادة

  ── حفر خنادق (لكل وصلة بمفردها) ──
  W = Ø≤300→Ø+0.60 | Ø≤600→Ø+0.70 | Ø≤900→Ø+0.80 | Ø>900→Ø+1.10 (م)
  إضافة 0.10م للعمق >1.5م (دعم جوانب)
  حجم_حفر_تربة = L × W × D_تربة (م³)
  حجم_حفر_صخر  = L × W × D_صخر × 1.15 (م³)
  حجم_أنبوب = (π/4) × Ø² × L (م³)
  فرشة_رمل  = L × W × 0.15 (م³)
  ردم_مدموك  = حفر_كلي − أنبوب − فرشة (م³)
  ردم_فعلي  = ردم_مدموك ÷ عامل_انضغاط [0.90/عادي | 0.95/رمل | 0.85/طين]
  تخلص       = حفر × عامل_انتفاش − ردم [1.25/عادي | 1.12/رمل | 1.30/طين | 1.45/صخر]
  دعم_جوانب = L × D × 2 × 45–150 SAR/م² ← إن العمق >1.5م
  ضخ_مياه   = أيام_ضخ × 1500–3500 SAR ← إن وُجدت مياه جوفية

  ── رصف وأسفلت (من [XSC] أو [PLN]) ──
  مساحة_رئيسية = L × W_رصف
  مساحة_كلية   = L × (W_رصف + 2×W_كتف)
  وزن Wearing (طن) = مساحة_كلية × سماكة_م × 2.35
  وزن Binder  (طن) = مساحة_رئيسية × سماكة_م × 2.30
  وزن Base AC (طن) = مساحة_رئيسية × سماكة_م × 2.25
  أساس مجروش (م³) = مساحة_كلية × سماكة_م
  رمل Sub-base (م³)= مساحة_كلية × سماكة_م
  Prime Coat (لتر) = مساحة × 0.80
  Tack Coat  (لتر) = مساحة × 0.30 × عدد الطبقات
  إعادة الرصف: L × (W_خندق + 0.30) م²
  قطع رصف قائم: L × W_قطع م²

  ── غرف ──
  عدد × (تركيب + حفر + غطاء + ردم)

٦ جدول BOQ التفصيلي:
  | الكود KSA | الوصف الكامل (مادة+قطر+SN/PN) | المعادلة | الكمية | الوحدة | سعر SAR | إجمالي SAR | الثقة |
  فئات حفر: EXC=حفر | BED=فرشة | BKF=ردم | DSP=تخلص
  فئات رصف: SUBBASE | BASE | PRIME | BASE-AC | TACK | BINDER | WEARING | REINST
  ${SAR_REF_2025}

٧ ملاحظات الامتثال NWC/MOT:
  • SN8 للعمق ≥2م | SN4 مسموح للعمق <1م فقط
  • PN ≥ضغط تشغيل × 1.5 | صمام هواء كل 500م
  • ميل أدنى: 2‰ للقطر<300 | 1‰ للقطر≥300

٨ خلاصة الدُفعة:
  إجمالي SAR | أهم 3 اكتشافات | تعارضات | بنود تحتاج تحقق ⚠️`;
};

const SYS_HYBRID = (cfg, info, drawTypes, projectCtx) => `أنت محرك ALIMTYAZ v10 للتحليل المدمج (نص + صورة بصرية).
${cfg} | ${info}
${drawTypes.length ? `أنواع متوقعة: ${drawTypes.join(" | ")}` : ""}
${projectCtx}
الاستراتيجية:
① الصورة: نوع المخطط + مقياس الرسم + أنماط الأنابيب (قطر/مادة) + أماكن الغرف
② النص: أرقام دقيقة + مناسيب IL/GL + كودات SN/PN + جداول المواصفات + Chainages
③ الدمج: جدول أنابيب موحد + BOQ بـKSA + تحقق تطابق نص↔صورة
قاعدة الأنابيب: لا تكتب "PVC" فقط — دائماً "PVC SN8" أو "HDPE PE100 PN12.5"
${SAR_REF_2025}`;

const SYS_MERGE = (projectCtx="", drawTypeSummary="") => `أنت محرك ALIMTYAZ v11 للدمج والحصر النهائي — متخصص في شبكات الأنابيب والحفر والرصف.
لديك نتائج تحليل من دُفعات متعددة لنفس الملف.
${projectCtx}
${drawTypeSummary ? `أنواع المخططات: ${drawTypeSummary}` : ""}

══ بروتوكول الدمج النهائي v6 (12 خطوة إلزامية) ══

١ جدول الأنابيب الموحد النهائي (مرتّب بالقطر تصاعدياً):
  | القطر mm | المادة | SN/PN | الطول م.ط | متوسط عمق م | حجم حفر م³ | حجم ردم م³ | تخلص م³ | سعر/م.ط | إجمالي SAR |
  ✦ إجماليات: Σ لكل مادة | Σ كلي | تكلفة/م.ط متوسط

٢ جدول الحفر والردم الشامل v6 (مرتّب بالقطر — فصل التربة والصخر):
  ══ معادلات الحساب المعتمدة ══
  W = Ø≤300→Ø+0.60 | Ø≤600→Ø+0.70 | Ø≤900→Ø+0.80 | Ø≤1200→Ø+0.90 | Ø>1200→Ø+1.10 (م)
  إضافة 0.10م إن عمق >1.5م (مسافة دعم جوانب)
  حفر_تربة = L × W × D_تربة | حفر_صخر = L × W × D_صخر × 1.15
  ردم_مدموك = حفر_كلي − أنبوب − فرشة_150mm
  ردم_فعلي  = ردم ÷ {0.90/عادي | 0.95/رمل | 0.85/طين}
  تخلص = حفر × {1.25/عادي | 1.12/رمل | 1.30/طين | 1.45/صخر} − ردم

  | الخط | Ø mm | L م | W م | D م | حفر_تربة م³ | حفر_صخر م³ | أنبوب م³ | فرشة م³ | ردم م³ | تخلص م³ | تكلفة SAR |
  ← إلزامي: أبلغ عن عمق>4م | صخر | مياه جوفية | دعم مطلوب

٣ جدول BOQ الحفر المفصّل v6:
  | الكود KSA | الوصف | المعادلة | الكمية | الوحدة | سعر SAR | إجمالي SAR |
  EXC-001 | حفر خنادق آلي تربة عادية عمق ≤2م    | Σ(L×W×D≤2)      | م³ | [35–55]
  EXC-002 | حفر خنادق آلي تربة عادية عمق 2–4م   | Σ(L×W×D_2-4)    | م³ | [45–70]
  EXC-003 | حفر خنادق آلي تربة عادية عمق >4م    | Σ(L×W×D>4)      | م³ | [65–95]
  EXC-004 | حفر صخر بالهدم الميكانيكي            | Σ(حجم_صخر)      | م³ | [220–380]
  SHT-001 | دعم جوانب خندق (عمق>1.5م)            | Σ(L×D×2)        | م² | [85–150]
  DWT-001 | ضخ مياه جوفية (إن وُجد)              | الأيام          | يوم| [1500–3500]
  BED-001 | فرشة رملية 150mm تحت الأنابيب        | Σ(L×W×0.15)     | م³ | [65–95/م.ط]
  BKF-001 | ردم رملي ناعم حول الأنابيب           | Σ(ردم_رملي)     | م³ | [40–65]
  BKF-002 | ردم تربة مدموكة ≥95% Proctor         | Σ(ردم_تربة)     | م³ | [20–38]
  DSP-001 | نقل وتخلص خارج الموقع <5كم           | Σ(تخلص)         | م³ | [40–65]
  ENC-001 | حماية خرسانية encasement C25          | Σ(L_حماية)      | م.ط| [380–560]

٤ جدول أعمال الرصف والأسفلت v6 (كل طبقة منفصلة):
  ══ معادلات الأسفلت المعتمدة MOT 2024 ══
  مساحة_رئيسية = طول × عرض_رصف
  مساحة_كلية   = طول × (عرض_رصف + 2×عرض_كتف)
  Wearing (طن) = مساحة_كلية × t_m × 2.35
  Binder  (طن) = مساحة_رئيسية × t_m × 2.30
  Base AC (طن) = مساحة_رئيسية × t_m × 2.25
  أساس مجروش = مساحة_كلية × t_m (م³)
  Sub-base    = مساحة_كلية × t_m (م³)
  Prime Coat  = مساحة × 0.80 لتر/م²
  Tack Coat   = مساحة × 0.30 لتر/م² × عدد الفواصل

  | القطاع | L م | W_رصف م | W_كتف م | مساحة م² | Wear طن | Bind طن | Base طن | مجروش م³ | Sub م³ | تكلفة SAR |

  BOQ الرصف المفصّل:
  | الكود KSA | الوصف | الكمية | الوحدة | سعر SAR | إجمالي SAR |
  CUT-001 | قطع وإزالة رصف قائم                   | م²  | [35–60]
  SUB-001 | طبقة أساس رملي Sub-base [X]mm          | م³  | [65–130/م²]
  BSE-001 | طبقة أساس مجروش Crushed Stone [X]mm   | م³  | [100–230/م²]
  PRM-001 | رش تمهيدي Prime Coat 0.8L/م²           | م²  | [8–15]
  BAC-001 | أساس أسفلتي Base Course [X]mm          | طن  | [265–285/طن]
  TCK-001 | رش لاصق Tack Coat 0.3L/م²              | م²  | [5–10]
  BND-001 | طبقة رابطة Binder Course [X]mm         | طن  | [290–300/طن]
  TCK-002 | رش لاصق Tack Coat 0.3L/م²              | م²  | [5–10]
  WRG-001 | طبقة سطحية Wearing Course [X]mm        | طن  | [315–330/طن]
  RST-001 | إعادة رصف بعد حفر الشبكة L×(W+0.30)  | م²  | [185–245]
  PAT-001 | ترقيع محلي Patching                    | م²  | [85–140]
  KRB-001 | حافة طريق Kerb 150×300mm               | م.ط | [55–90]

٥ جدول الغرف/البيارات الموحد:
  | GH# | Chainage | GL م | IL In م | IL Out م | عمق م | قطر mm | النوع | تكلفة SAR |
  إجماليات: حسب النوع | حسب القطر | الغرف العميقة >4م

٦ BOQ الموحد الكامل:
  | الكود KSA | الوصف | الوحدة | الكمية | سعر SAR | إجمالي SAR | المصدر | الثقة |
  مجموعات: EXC حفر | PIP أنابيب | MH غرف | BKF ردم | RD رصف | MIS متفرقات

٧ تحقق الاتساق الشامل:
  | التحقق | PLN/XSC | PRF/MHC | الفرق | %الفرق | التأثير SAR |
  • طول الأنابيب PLN vs PRF (<2% مقبول)
  • أعماق الغرف MHC vs PRF
  • هيكل الرصف XSC vs طلب المواصفات
  • حجم الحفر المحسوب vs BOQ المذكور

٨ لوحة KPIs المشروع الشاملة:
  | المؤشر | القيمة | الوحدة |
  Σ طول أنابيب | Σ حجم حفر | Σ حجم ردم | Σ تخلص | % حفر صخر
  Σ مساحة رصف | Σ طن أسفلت | Σ م³ مجروش | تكلفة/م.ط | تكلفة/م² رصف

٩ هيكل التكاليف الإجمالي:
  | الفئة | SAR | % |
  أعمال الحفر والردم | أنابيب وتوصيلات | غرف وبلاعات | رصف وأسفلت | متفرقات
  مصاريف عامة 12% | ربح مقاول 8% | احتياطي مخاطر 5% | الإجمالي
  جدول حساسية: | −15% | −10% | −5% | الأساس | +5% | +10% | +15% |

١٠ سجل المخاطر (مرتّب بالدرجة تنازلياً):
  | الخطر | الموقع | الاحتمال/5 | التأثير/5 | الدرجة | SAR | الإجراء |
  ← يشمل: ميل غير كافٍ | عمق >4م | مياه جوفية | مناطق صخر | هيكل رصف غير مطابق

١١ تقرير الامتثال NWC/MOT:
  | المتطلب | المعيار | القيمة الفعلية | ✓/✗ | الإجراء |
  • SN/PN vs العمق | ميل vs الحد الأدنى | عمق التغطية | هيكل الرصف MOT

١٢ أهم 5 توصيات فنية وتجارية فورية للمقاول

أنتج تقريراً احترافياً كاملاً — لا اختصار في أي جدول.`;



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
// ── فتح PDF — محرك موثوق متعدد الاستراتيجيات ──
async function openPdf(file, onProgress) {
  const lib = await loadPdf();

  // قراءة الملف مرة واحدة إلى Uint8Array (ليس ArrayBuffer مباشرة)
  // السبب: ArrayBuffer ينتقل ملكيته (transfer) إلى PDF.js Worker عند الاستخدام الأول
  // ولا يمكن استخدامه مجدداً — لذا نحتفظ بنسخة Uint8Array
  const rawBytes = await new Promise((resolve, reject) => {
    if (onProgress) onProgress(5);
    // محاولة ١: arrayBuffer API (أسرع في المتصفحات الحديثة)
    if (file.arrayBuffer) {
      file.arrayBuffer()
        .then(ab => {
          if (onProgress) onProgress(60);
          resolve(new Uint8Array(ab));
        })
        .catch(() => {
          // fallback: FileReader
          readViaFileReader(file, onProgress, resolve, reject);
        });
    } else {
      readViaFileReader(file, onProgress, resolve, reject);
    }
  });

  if (!rawBytes || rawBytes.byteLength === 0) throw new Error("الملف فارغ أو تالف (0 bytes)");

  // دالة مساعدة: صنع نسخة جديدة من البيانات لكل محاولة
  const freshData = () => rawBytes.slice(0); // ← نسخة جديدة في كل مرة

  if (onProgress) onProgress(65);

  let doc = null;
  let lastErr = null;

  // المحاولة ١ — إعدادات كاملة
  try {
    const task = lib.getDocument({ data: freshData(), useSystemFonts: true, disableAutoFetch: file.size > 15*1024*1024, disableFontFace: false });
    task.onProgress = p => { if (p.total && onProgress) onProgress(65 + Math.round((p.loaded||0)/Math.max(p.total,1)*30)); };
    doc = await task.promise;
  } catch (e1) { lastErr = e1; }

  // المحاولة ٢ — بدون خطوط النظام (يحل 80% من مشاكل التوافق)
  if (!doc) {
    try {
      const task = lib.getDocument({ data: freshData(), useSystemFonts: false, disableAutoFetch: true, disableFontFace: true, disableStream: true });
      doc = await task.promise;
    } catch (e2) { lastErr = e2; }
  }

  // المحاولة ٣ — الحد الأدنى الكامل (يفتح حتى PDF التالفة جزئياً)
  if (!doc) {
    try {
      const task = lib.getDocument({ data: freshData(), useSystemFonts: false, disableAutoFetch: true, disableFontFace: true, disableStream: true, isEvalSupported: false, ignoreErrors: true });
      doc = await task.promise;
    } catch (e3) { lastErr = e3; }
  }

  if (!doc) {
    const msg = (lastErr?.message || "").toLowerCase();
    if (/password|encrypt/.test(msg))     throw new Error("🔒 الملف محمي بكلمة مرور — أزل الحماية أولاً (File → Remove Password)");
    if (/invalid|corrupt|not a pdf/.test(msg)) throw new Error("⚠️ الملف تالف أو ليس PDF صحيحاً — جرب إعادة الحفظ من AutoCAD/Adobe");
    if (/worker|script/.test(msg))        throw new Error("⚙️ خطأ في Worker — أعد تحميل الصفحة");
    throw new Error(`فشل فتح PDF (${lastErr?.message?.slice(0,60) || "سبب غير معروف"})`);
  }

  if (onProgress) onProgress(100);
  return { doc, numPages: doc.numPages, fileSizeMB: +(file.size / 1024 / 1024).toFixed(1) };
}

function readViaFileReader(file, onProgress, resolve, reject) {
  const reader = new FileReader();
  reader.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded/e.total*58)+2); };
  reader.onload  = e => { if (onProgress) onProgress(60); resolve(new Uint8Array(e.target.result)); };
  reader.onerror = e => reject(new Error(`فشل قراءة الملف: ${e.target?.error?.message || "خطأ غير معروف"}`));
  reader.readAsArrayBuffer(file);
}

// ── استخراج ذكي للصفحة مع تحليل البنية التحتية المعمّق ──
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
  const text = raw.length > maxChars ? raw.slice(0, maxChars) + `\n[... +${raw.length-maxChars} حرف محذوف]` : raw;
  page.cleanup?.();

  // ── تحليل البنية التحتية المعمّق ──
  const drawingType = detectDrawingType(fullText);
  const scale       = detectScale(fullText);
  const diameters   = extractPipeDiameters(fullText);
  const invertLevels= extractInvertLevels(fullText);
  const slopes      = extractPipeSlopes(fullText);
  const ewData      = extractEarthworksData(fullText);
  const aspData     = extractAsphaltLayers(fullText);

  // ── استخراج Chainages وأرقام الغرف ──
  const chainages = [];
  const chPat = /(?:CH|STA|Chainage)\s*(\d+\+\d{3}|\d+[.,]\d+)/gi;
  let cm; while((cm=chPat.exec(fullText))!==null) chainages.push(cm[1]);

  const manholes = [];
  const mhPat = /(?:GH|MH|GH-|MH-|Manhole|GULLY|BM)\s*[-#]?\s*(\d{1,4}[A-Z]?)/gi;
  let mm2; while((mm2=mhPat.exec(fullText))!==null) manholes.push(mm2[1]);

  // ── استخراج مواصفات الأنابيب الكاملة (مادة + قطر + فئة) ──
  const pipeSpecs = [];
  const psPat = /(?:[ØøΦ]|DN|ID)\s*(\d{2,4})\s*(?:mm)?\s*(?:PVC|HDPE|PE100|GRP|FRP|DI|RCP|CONC|CLAY)?(?:\s*SN\d+|\s*PN\d+)?/gi;
  let ps; while((ps=psPat.exec(fullText))!==null) { const s=ps[0].trim(); if(!pipeSpecs.includes(s)) pipeSpecs.push(s); }

  // ── بناء سجل الأنابيب التفصيلي لهذه الصفحة ──
  // محاولة استخراج وصلات مع طول ومنسوب من الجداول النصية
  const pipeEntries = [];
  if (drawingType === "PROFILE" || drawingType === "PLAN" || drawingType === "MANHOLE") {
    // استخراج سطور جدولية تحتوي قطر + طول/منسوب
    tableLines.forEach(line => {
      const dM = line.match(/(?:[ØøΦ]|DN)\s*(\d{2,4})/i);
      const lM = line.match(/(\d{2,5}(?:[.,]\d{1,2})?)\s*(?:م\.ط|م|m\.?l?)/i);
      const depM = line.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:م|m)\s*(?:عمق|depth|حفر)/i);
      const slopeM = line.match(/(\d+[.,]?\d*)\s*(?:%|‰)/);
      if (dM) {
        const dia = parseInt(dM[1]);
        if (dia >= 100 && dia <= 3000) {
          const matCtx = line + (lines[lines.indexOf(line)-1]||"");
          const matKey = detectPipeMaterial(matCtx) || "pvc";
          const cls = detectPipeClass(line) || PIPE_MATERIALS[matKey]?.std || "";
          pipeEntries.push({
            dia, mat: PIPE_MATERIALS[matKey]?.ar || matKey.toUpperCase(), matKey, cls,
            color: PIPE_MATERIALS[matKey]?.color || "#6b7280",
            type: PIPE_MATERIALS[matKey]?.cls || "",
            length: lM ? parseFloat(lM[1].replace(",",".")) : 0,
            depth:  depM ? parseFloat(depM[1].replace(",",".")) : 0,
            slope:  slopeM ? parseFloat(slopeM[1].replace(",",".")) : 0,
            source: `ص${pageNum}`,
          });
        }
      }
    });
  }

  // ── كثافة محسّنة ──
  const infraScore = (diameters.length>0?1:0)+(invertLevels.length>2?1:0)+(scale?1:0)+(chainages.length>0?1:0)+(manholes.length>0?1:0);
  const rawDensity = Math.min(3, Math.floor((tableLines.length*2+numLines.length)/5));
  const density    = Math.min(3, rawDensity + (infraScore>2?1:infraScore>0?0:0));

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
    slopes,
    chainages: chainages.slice(0,20),
    manholes:  manholes.slice(0,30),
    pipeSpecs: pipeSpecs.slice(0,15),
    pipeEntries,
    ewData,
    aspData,
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

async function renderPageImg(doc, p, scale=1.5, q=0.85, maxPx=4096) {
  const page = await doc.getPage(p);
  let vp = page.getViewport({ scale });
  // تحديد الحد الأقصى للبيكسل لحماية الذاكرة مع الملفات الكبيرة
  const maxDim = Math.max(vp.width, vp.height);
  if (maxDim > maxPx) {
    const cap = page.getViewport({ scale: scale * (maxPx / maxDim) });
    vp = cap;
  }
  const cv = document.createElement("canvas");
  cv.width  = Math.round(vp.width);
  cv.height = Math.round(vp.height);
  const ctx = cv.getContext("2d", { alpha: false, willReadFrequently: false });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cv.width, cv.height);
  await page.render({ canvasContext: ctx, viewport: vp, intent: "print" }).promise;
  const b64 = cv.toDataURL("image/jpeg", q).split(",")[1];
  // تحرير الذاكرة فوراً
  cv.width = 0; cv.height = 0;
  page.cleanup?.();
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

// تصدير BOQ CSV مع ترويسة محسّنة وترميز عربي
function exportCSV(msgs, fname="BOQ_ALIMTYAZ_v11") {
  const text = extractAllTables(msgs);
  const rows = text.split("\n").filter(l=>l.includes("|")&&!l.match(/^[\|\-\s:]+$/));
  const header = `"نظام ALIMTYAZ v11","تاريخ التصدير: ${new Date().toLocaleDateString("ar-SA")}",""\n\n`;
  const csv = rows.map(r=>r.split("|").map(c=>`"${c.trim()}"`).filter((_,i,a)=>i>0&&i<a.length-1).join(",")).join("\n");
  dl(new Blob(["\uFEFF"+header+csv],{type:"text/csv;charset=utf-8"}), fname+".csv");
}

// تصدير جدول الأنابيب المفصّل
function exportPipeScheduleCSV(msgs, fname="PipeSchedule_ALIMTYAZ_v11") {
  const text = extractAllTables(msgs);
  const lines = text.split("\n");
  const pipeRows = [];
  let inPipeTable = false;
  lines.forEach(l => {
    const hasPipe = /قطر|Ø|DN|مادة|SN|PN|م\.ط|طول/i.test(l);
    const isTableRow = l.includes("|") && !l.match(/^[\|\-\s:]+$/);
    if (hasPipe && isTableRow) inPipeTable = true;
    if (inPipeTable && isTableRow) pipeRows.push(l);
    if (inPipeTable && !isTableRow && l.trim()) inPipeTable = false;
  });
  const header = `"جدول الأنابيب — ALIMTYAZ v11","تاريخ: ${new Date().toLocaleDateString("ar-SA")}","","","","",""\n`;
  const csv = pipeRows.map(r=>r.split("|").map(c=>`"${c.trim()}"`).filter((_,i,a)=>i>0&&i<a.length-1).join(",")).join("\n");
  dl(new Blob(["\uFEFF"+header+"\n"+csv],{type:"text/csv;charset=utf-8"}), fname+".csv");
}

// تصدير جدول الحفر والردم CSV
function exportEarthworksCSV(xStats, fname="Earthworks_ALIMTYAZ_v11") {
  const ew = xStats?.earthworksSummary;
  if (!ew) return;
  const pipes = xStats?.pipeNetwork || [];
  const now = new Date().toLocaleDateString("ar-SA");
  let csv = "\uFEFF";
  csv += `"جدول الحفر والردم — ALIMTYAZ v11","تاريخ: ${now}"\n\n`;
  csv += `"القطر","المادة","الطول م","عرض خندق م","متوسط عمق م","حفر م³","ردم م³","تخلص م³","فرشة م³","تكلفة SAR"\n`;
  pipes.filter(p=>p.totalLength>0).forEach(p => {
    const avgD = p.maxDepth > 0 ? +((p.minDepth+p.maxDepth)/2).toFixed(1) : 2.0;
    const tw = trenchWidth(p.dia, avgD);
    const t = calcTrenchEarthworks({ lengthM:p.totalLength, diaMM:p.dia, depthM:avgD });
    csv += `"Ø${p.dia}mm","${p.mat}","${p.totalLength.toFixed(0)}","${tw}","${avgD}","${t.excav_total_m3}","${t.backfill_m3}","${t.disposal_m3}","${t.sandBed_m3}","${t.cost?.total_sar||0}"\n`;
  });
  csv += `\n"الإجمالي","","","","","${(ew.excav_total||0).toFixed(0)}","${(ew.backfill||0).toFixed(0)}","${(ew.disposal||0).toFixed(0)}","${(ew.sandBed||0).toFixed(0)}","${(ew.cost_total||0).toFixed(0)}"\n`;
  csv += `\n"تفصيل التكلفة"\n`;
  Object.entries(ew.costBreakdown||{}).filter(([,v])=>v>0).forEach(([k,v]) => {
    csv += `"${k}","${v.toLocaleString()} SAR"\n`;
  });
  dl(new Blob([csv],{type:"text/csv;charset=utf-8"}), fname+".csv");
}

// تصدير جدول الأسفلت CSV
function exportAsphaltCSV(xStats, fname="Asphalt_ALIMTYAZ_v11") {
  const asp = xStats?.asphaltSummary;
  if (!asp || !asp.layers?.length) return;
  const now = new Date().toLocaleDateString("ar-SA");
  let csv = "\uFEFF";
  csv += `"جدول الأسفلت والرصف — ALIMTYAZ v11","تاريخ: ${now}"\n\n`;
  if (asp.roadType) csv += `"نوع الطريق","${ROAD_STRUCTURES[asp.roadType]?.name||asp.roadType}"\n\n`;
  csv += `"الطبقة","السماكة mm","المساحة م²","الحجم م³","الوزن طن","التكلفة SAR"\n`;
  asp.layers.filter(l=>l.thickMM>1).forEach(l => {
    csv += `"${l.ar}","${l.thickMM}","${l.area_m2}","${l.vol_m3}","${l.tons||"—"}","${(l.cost_sar||0).toLocaleString()}"\n`;
  });
  csv += `\n"الإجمالي","${asp.totalThickMM||0} mm","${(asp.totalArea||0).toFixed(0)} م²","","${(asp.totalTons||0).toFixed(1)} طن","${(asp.totalCost||0).toLocaleString()} SAR"\n`;
  dl(new Blob([csv],{type:"text/csv;charset=utf-8"}), fname+".csv");
}

function exportJSON(msgs, feState, cfgLabel) {
  const allText = extractAllTables(msgs);
  const pipeMatches = [...allText.matchAll(/Ø(\d{2,4})\s*mm?\s*(PVC\s*SN\d*|HDPE\s*PE\d*|GRP\s*SN\d*|DI\s*PN\d*|RCP)?/gi)];
  const pipeSummary = {};
  pipeMatches.forEach(m => { const k=`${m[1]}mm ${m[2]||"غير محدد"}`; pipeSummary[k]=(pipeSummary[k]||0)+1; });
  const data = {
    system:"ALIMTYAZ v11", version:"11.0.0",
    config:cfgLabel, exported:new Date().toISOString(),
    summary:{
      totalMessages:msgs.length,
      totalTokens:msgs.reduce((s,m)=>s+(m.tokens||0),0),
      chunks:feState?.chunks?.length||0,
      pipeTypesFound:Object.keys(pipeSummary).length,
    },
    pipeSchedule: Object.entries(pipeSummary).map(([spec,count])=>({spec,mentions:count})),
    messages: msgs.filter(m=>m.role==="assistant").map(m=>({
      label:m.chunkLabel||"chat", content:m.content,
      tokens:m.tokens||0, isMerged:!!m.isMerged, drawTypes:m.drawTypes||[]
    })),
  };
  dl(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}), (fname||"BOQ")+"_ALIMTYAZ_v11.json");
}

function exportMD(msgs, cfgLabel) {
  const pipeSection = `## 📊 ملخص شبكة الأنابيب\n> مُولَّد تلقائياً بواسطة ALIMTYAZ v11\n\n`;
  const text = `# تقرير ALIMTYAZ v11 — حصر الكميات والأنابيب\n**الإعداد:** ${cfgLabel}\n**التاريخ:** ${new Date().toLocaleString("ar-SA")}\n\n---\n\n${pipeSection}` +
    msgs.filter(m=>m.role==="assistant").map(m=>{
      const badge = m.isMerged?"🔗 التقرير الموحد":m.isChunk?`📄 دُفعة ${m.chunkLabel}`:"💬 تحليل";
      return `## ${badge}\n\n${m.content}`;
    }).join("\n\n---\n\n");
  dl(new Blob([text],{type:"text/markdown;charset=utf-8"}), "Report_ALIMTYAZ_v11.md");
}

function exportTXT(feState) {
  if (!feState?.extractedData) return;
  const pipeHeader = "═══════════════════════════════════\nشبكة الأنابيب المستخرجة — ALIMTYAZ v11\n═══════════════════════════════════\n";
  const pipeData = Object.entries(feState.extractedData)
    .filter(([,d])=>d.pipeEntries?.length>0)
    .map(([p,d])=>`صفحة ${p}:\n${d.pipeEntries.map(pe=>`  Ø${pe.dia}mm ${pe.mat} ${pe.cls} | ${pe.length||0}م | عمق:${pe.depth||0}م | ميل:${pe.slope||0}%`).join("\n")}`)
    .join("\n\n");
  const textData = Object.entries(feState.extractedData).sort(([a],[b])=>+a-+b)
    .map(([p,d])=>`${"=".repeat(50)}\nصفحة ${p} | ${d.dims} | ${d.lineCount} سطر | ${d.drawingType||"?"}\n${"=".repeat(50)}\n${d.text}\n`).join("\n");
  dl(new Blob([pipeHeader+pipeData+"\n\n"+textData],{type:"text/plain;charset=utf-8"}), "Extracted_ALIMTYAZ_v11.txt");
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
//  محرك التصنيف التلقائي للملفات v1
// ═══════════════════════════════════════════════════════════════════════════

// تصنيف الملف بناءً على اسمه فقط (قبل فتحه)
function classifyFileByName(filename) {
  const n = filename.toLowerCase().replace(/[_\-\s]/g," ");
  // أنواع المخططات الهندسية
  if (/manhole|chamber|غرف|بيارة|mh.?schedule|غرفة/.test(n))    return {cat:"MANHOLE", ar:"جداول الغرف",    icon:"📋", color:"#059669", disc:"SWR"};
  if (/boq|bill.?of.?quant|كميات|schedule.?of.?price/.test(n))   return {cat:"BOQ",     ar:"كشوف الكميات",  icon:"📊", color:"#16a34a", disc:"BOQ"};
  if (/longitudinal|profile|قطاع طولي|l.?section/.test(n))       return {cat:"PROFILE", ar:"قطاعات طولية",  icon:"📉", color:"#7c3aed", disc:"CIV"};
  if (/cross.?section|x.?section|قطاع عرضي|typical/.test(n))     return {cat:"SECTION", ar:"قطاعات عرضية",  icon:"✂️", color:"#0ea5e9", disc:"CIV"};
  if (/plan|مسقط|layout|general|situation|key.?plan/.test(n))     return {cat:"PLAN",    ar:"مساقط أفقية",   icon:"📐", color:"#2563eb", disc:"CIV"};
  if (/road|pavement|رصف|طريق|carriageway/.test(n))               return {cat:"ROAD",    ar:"مخططات الطرق",  icon:"🛣️", color:"#dc2626", disc:"RD"};
  if (/sewer|صرف|drainage|sani/.test(n))                          return {cat:"SEWER",   ar:"شبكة الصرف",    icon:"🔵", color:"#2563eb", disc:"SWR"};
  if (/water|مياه|supply|ماء/.test(n))                            return {cat:"WATER",   ar:"شبكة المياه",   icon:"💧", color:"#0ea5e9", disc:"WAT"};
  if (/storm|أمطار|تصريف/.test(n))                                return {cat:"STORM",   ar:"تصريف أمطار",  icon:"🌧️", color:"#6366f1", disc:"STM"};
  if (/marine|outfall|بحري|منفث/.test(n))                         return {cat:"MARINE",  ar:"بحري/Outfall",  icon:"🌊", color:"#0284c7", disc:"MAR"};
  if (/struct|إنشائي|reinforce|foundation|قاعدة/.test(n))        return {cat:"STRUCT",  ar:"إنشائي",        icon:"🏗️", color:"#d97706", disc:"STR"};
  if (/elec|كهرب|lighting|إنارة|cable/.test(n))                   return {cat:"ELEC",    ar:"كهرباء/إنارة",  icon:"⚡", color:"#f59e0b", disc:"ELC"};
  if (/spec|مواصفات|technical/.test(n))                           return {cat:"SPEC",    ar:"مواصفات فنية",  icon:"📝", color:"#64748b", disc:"SPC"};
  if (/detail|تفصيل/.test(n))                                     return {cat:"DETAIL",  ar:"تفاصيل",        icon:"🔍", color:"#f59e0b", disc:"DTL"};
  if (/cover|title|غلاف|عنوان/.test(n))                           return {cat:"COVER",   ar:"صفحة الغلاف",   icon:"📁", color:"#94a3b8", disc:"GEN"};
  if (/utility|مرافق|duct/.test(n))                               return {cat:"UTILITY", ar:"مرافق مدفونة",  icon:"🔌", color:"#7c3aed", disc:"UTL"};
  return {cat:"GENERAL", ar:"عام",  icon:"📄", color:"#6b7280", disc:"GEN"};
}

// تصنيف مجمّع لقائمة من الملفات
function classifyFilesBatch(files) {
  const groups = {};
  const classified = [];
  files.forEach((file, idx) => {
    const cls = classifyFileByName(file.name);
    const key = cls.cat;
    if (!groups[key]) groups[key] = { ...cls, files: [], count: 0 };
    groups[key].files.push(idx);
    groups[key].count++;
    classified.push({ ...cls, file, idx, folder: file.webkitRelativePath?.split("/")?.[0] || "" });
  });
  return { classified, groups, total: files.length };
}

// ── مكوّن واجهة التصنيف ──
function ClassificationModal({ files, onConfirm, onCancel, T, D }) {
  const { classified, groups } = classifyFilesBatch(files);
  const [overrides, setOverrides] = useState({}); // {idx: newCat}
  const [step, setStep] = useState("review"); // review | confirm

  // تجميع مع overrides
  const finalGroups = {};
  classified.forEach(item => {
    const cat = overrides[item.idx] || item.cat;
    const cls = overrides[item.idx]
      ? Object.values({PLAN:{ar:"مسقط",icon:"📐",color:"#2563eb"},PROFILE:{ar:"قطاع طولي",icon:"📉",color:"#7c3aed"},SECTION:{ar:"قطاع عرضي",icon:"✂️",color:"#0ea5e9"},MANHOLE:{ar:"جداول غرف",icon:"📋",color:"#059669"},BOQ:{ar:"كشف كميات",icon:"📊",color:"#16a34a"},SEWER:{ar:"صرف صحي",icon:"🔵",color:"#2563eb"},WATER:{ar:"مياه",icon:"💧",color:"#0ea5e9"},STORM:{ar:"أمطار",icon:"🌧️",color:"#6366f1"},MARINE:{ar:"بحري",icon:"🌊",color:"#0284c7"},STRUCT:{ar:"إنشائي",icon:"🏗️",color:"#d97706"},ROAD:{ar:"طرق",icon:"🛣️",color:"#dc2626"},ELEC:{ar:"كهرباء",icon:"⚡",color:"#f59e0b"},SPEC:{ar:"مواصفات",icon:"📝",color:"#64748b"},GENERAL:{ar:"عام",icon:"📄",color:"#6b7280"}}).find(c=>c.ar)||item
      : item;
    if (!finalGroups[cat]) finalGroups[cat] = { ...item, ...cls, cat, files: [] };
    finalGroups[cat].files.push(item.file);
  });

  return (
    <div style={{position:"fixed",inset:0,background:"#000000c0",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:D?"#0f172a":"#fff",borderRadius:18,width:"100%",maxWidth:860,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 25px 80px #00000060",border:`1px solid ${T.bd}`}}>
        {/* Header */}
        <div style={{padding:"16px 22px",borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{fontSize:26}}>🗂️</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:T.gold}}>تصنيف الملفات التلقائي</div>
            <div style={{fontSize:10,color:T.t3}}>تم رصد {files.length} ملف — راجع التصنيف قبل الرفع</div>
          </div>
          <button onClick={onCancel} style={{marginRight:"auto",background:"none",border:"none",color:T.t3,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        {/* Stats bar */}
        <div style={{padding:"10px 22px",background:D?"#0a1628":"#f8fafc",borderBottom:`1px solid ${T.bd}`,display:"flex",gap:10,flexWrap:"wrap",flexShrink:0}}>
          {Object.entries(finalGroups).sort((a,b)=>b[1].files.length-a[1].files.length).map(([cat,g])=>(
            <span key={cat} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:12,border:`1px solid ${g.color}40`,background:g.color+"15",fontSize:9,fontWeight:700,color:g.color}}>
              {g.icon} {g.ar} <span style={{opacity:.7,fontWeight:400}}>×{g.files.length}</span>
            </span>
          ))}
        </div>
        {/* File list */}
        <div style={{flex:1,overflowY:"auto",padding:"12px 22px"}}>
          {Object.entries(finalGroups).map(([cat,g])=>(
            <div key={cat} style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,paddingBottom:5,borderBottom:`2px solid ${g.color}30`}}>
                <span style={{fontSize:16}}>{g.icon}</span>
                <span style={{fontSize:11,fontWeight:800,color:g.color}}>{g.ar}</span>
                <span style={{fontSize:9,color:T.t3,padding:"1px 7px",background:g.color+"15",borderRadius:8}}>{g.files.length} ملف</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:6}}>
                {g.files.map((file,fi)=>{
                  const origIdx=classified.find(c=>c.file===file)?.idx??fi;
                  return(
                    <div key={fi} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 9px",borderRadius:8,border:`1px solid ${T.bd}`,background:D?"#1e293b20":"#f8fafc",cursor:"pointer"}}
                      title="انقر لتغيير التصنيف">
                      <span style={{fontSize:12}}>{g.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:9,color:T.t1,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</div>
                        <div style={{fontSize:7,color:T.t3}}>{(file.size/1024/1024).toFixed(1)}MB{file.webkitRelativePath?` · ${file.webkitRelativePath.split("/")[0]}`:""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{padding:"14px 22px",borderTop:`1px solid ${T.bd}`,display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontSize:9,color:T.t3}}>
            {Object.keys(finalGroups).length} مجموعة · {files.length} ملف · التصنيف بناءً على اسم الملف
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onCancel} style={{padding:"9px 18px",borderRadius:9,border:`1px solid ${T.bd}`,background:"none",color:T.t2,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>إلغاء</button>
            <button onClick={()=>onConfirm(finalGroups)} style={{padding:"9px 22px",borderRadius:9,border:"none",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,color:"#1a0a00",fontWeight:800,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
              ✅ بدء الرفع ({files.length} ملف)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


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
// ══════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════
//  اقتراحات ذكية تلقائية بناءً على xStats — SmartSuggestionsPanel v1
// ══════════════════════════════════════════════════════════════════════════
function SmartSuggestionsPanel({ xStats, T, D, msgs }) {
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());

  const suggestions = useMemo(() => {
    const list = [];
    const ew  = xStats?.earthworksSummary;
    const asp = xStats?.asphaltSummary;
    const pn  = xStats?.pipeNetwork || [];
    const ea  = xStats?.earthworkAlerts || [];

    // ── اقتراحات الحفر ──
    if (ew) {
      if (ew.excav_rock > 0 && ew.excav_rock / (ew.excav_total||1) > 0.2) {
        list.push({
          id:"rock_pct", cat:"⛏️ حفر", sev:"high",
          text:`نسبة الصخر ${(ew.excav_rock/(ew.excav_total||1)*100).toFixed(0)}% — تحقق من تقرير التربة قبل الإقرار النهائي`,
          action:"طلب تقرير التربة Geotechnical"
        });
      }
      if ((ew.cost_total||0) > 500000) {
        list.push({
          id:"excav_cost", cat:"💰 تكلفة", sev:"med",
          text:`تكلفة الحفر والردم تتجاوز ${(ew.cost_total/1000).toFixed(0)}K SAR — فرصة لمراجعة عامل انتفاش التربة`,
          action:"مراجعة عروض شركات الحفر"
        });
      }
      if (ea.length > 0) {
        list.push({
          id:"ew_alerts", cat:"⚠️ سلامة", sev:"high",
          text:`${ea.length} تنبيه حفر نشط: ${ea[0]}`,
          action:"مراجعة تقرير سلامة الحفر"
        });
      }
    }

    // ── اقتراحات الأسفلت ──
    if (asp) {
      const totalThick = asp.totalThickMM || 0;
      if (totalThick > 0 && totalThick < 180) {
        list.push({
          id:"thin_asphalt", cat:"🛣️ رصف", sev:"med",
          text:`إجمالي سماكة الرصف ${totalThick}mm — أقل من الحد الأدنى MOT للطرق الجامعة (200mm)`,
          action:"مراجعة تصنيف الطريق مع المصمم"
        });
      }
      if ((asp.totalCost||0) > 300000) {
        list.push({
          id:"asp_costperm2", cat:"💰 تكلفة", sev:"low",
          text:`تكلفة الرصف: ${asp.costPerM2 || "؟"} SAR/م² — قارن بالسوق المحلي (185–260 SAR/م²)`,
          action:"الحصول على 3 عروض أسعار للرصف"
        });
      }
    }

    // ── اقتراحات شبكة الأنابيب ──
    const unknownPipes = pn.filter(p=>p.mat==="غير محدد"||p.matKey==="unknown");
    if (unknownPipes.length > 0) {
      list.push({
        id:"unknown_mat", cat:"🔵 أنابيب", sev:"high",
        text:`${unknownPipes.length} قطر بمادة غير محددة — يتأثر سعر BOQ بشكل كبير`,
        action:"مراجعة المواصفات الفنية للتأكيد"
      });
    }
    const deepPipes = pn.filter(p=>p.maxDepth>4);
    if (deepPipes.length > 0) {
      list.push({
        id:"deep_pipes", cat:"⚠️ سلامة", sev:"high",
        text:`${deepPipes.length} خط أنابيب بعمق >4م — يتطلب تصميم دعم جوانب واعتماد مهندس سلامة`,
        action:"تقديم خطة سلامة للحفر العميق"
      });
    }

    // ── اقتراحات جودة التحليل ──
    const boqCount = (msgs.filter(m=>m.role==="assistant").map(m=>m.content||"").join("").match(/KSA-[A-Z]{2,6}-/g)||[]).length;
    if (boqCount > 0 && boqCount < 10) {
      list.push({
        id:"low_boq", cat:"📊 جودة", sev:"low",
        text:`عدد بنود BOQ المستخرجة: ${boqCount} — مخططات معقدة قد تحتاج مزيداً من الدُفعات`,
        action:"إضافة مخططات إضافية أو رفع دقة التحليل"
      });
    }
    if (xStats?.totalPages > 30 && xStats?.avgDensity < 1.0) {
      list.push({
        id:"low_density", cat:"📄 استخراج", sev:"med",
        text:`كثافة نص منخفضة (${xStats.avgDensity?.toFixed(2)}/3) — قد تكون المخططات مسح ضوئي (Scan)`,
        action:"تفعيل وضع OCR لتحسين استخراج النصوص"
      });
    }

    return list.filter(s=>!dismissed.has(s.id));
  }, [xStats, msgs, dismissed]);

  if (!suggestions.length) return null;

  const sevColor = { high:"#dc2626", med:"#ca8a04", low:"#2563eb" };
  const sevBg    = { high:D?"#431407":"#fef2f2", med:D?"#422006":"#fefce8", low:D?"#0f1e38":"#eff6ff" };

  return (
    <div style={{border:`2px solid ${D?"#854d0e":"#fde68a"}`,borderRadius:12,overflow:"hidden",marginTop:8}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 14px",
        background:D?"linear-gradient(135deg,#1c1404,#2a1d05)":"linear-gradient(135deg,#fffbeb,#fef3c7)",
        cursor:"pointer"}} onClick={()=>setOpen(v=>!v)}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>💡</span>
          <div>
            <div style={{fontSize:10,fontWeight:800,color:D?"#fbbf24":"#92400e"}}>اقتراحات ذكية</div>
            <div style={{fontSize:8,color:T.t3}}>{suggestions.length} توصية نشطة</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {suggestions.filter(s=>s.sev==="high").length>0&&(
            <span style={{fontSize:8,background:"#dc2626",color:"#fff",padding:"1px 7px",borderRadius:9,fontWeight:700}}>
              {suggestions.filter(s=>s.sev==="high").length} عاجل
            </span>
          )}
          <span style={{color:T.t3,fontSize:10}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open&&(
        <div style={{padding:"10px 12px",background:D?"#0a0f1a":"#fffdf5",display:"flex",flexDirection:"column",gap:7}}>
          {suggestions.map(s=>(
            <div key={s.id} style={{
              background:sevBg[s.sev], borderRadius:9, padding:"9px 11px",
              border:`1px solid ${sevColor[s.sev]}30`,
              display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8
            }}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:8,fontWeight:700,color:sevColor[s.sev],background:`${sevColor[s.sev]}20`,padding:"1px 7px",borderRadius:8}}>
                    {s.sev==="high"?"⚡ عاجل":s.sev==="med"?"⚠️ مهم":"💡 ملاحظة"}
                  </span>
                  <span style={{fontSize:9,color:T.gold,fontWeight:700}}>{s.cat}</span>
                </div>
                <div style={{fontSize:10,color:T.t1,marginBottom:4,lineHeight:1.5}}>{s.text}</div>
                <div style={{fontSize:8.5,color:sevColor[s.sev],fontWeight:600}}>→ {s.action}</div>
              </div>
              <button onClick={()=>setDismissed(prev=>new Set([...prev,s.id]))}
                style={{background:"none",border:"none",cursor:"pointer",color:T.t3,fontSize:10,flexShrink:0,padding:"0 3px"}}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

//  حاسبة الحفر والردم والأسفلت التفاعلية v6 — مكوّن مستقل
// ══════════════════════════════════════════════════════════════════════════
function EarthAsphaltCalc({ T, D }) {
  const [mode, setMode] = useState("earth");
  const [earthIn, setEarthIn] = useState({
    dia: 300, depth: 2.5, length: 100, soil: "normal",
    sandBed: 150, rockDepth: 0, hasSheeting: false, hasDewatering: false,
  });
  const [aspIn, setAspIn] = useState({
    length: 500, width: 7, shoulder: 1.5,
    wearing: 50, binder: 60, baseCourse: 0, base: 200, subbase: 200,
    hasCutting: false,
  });
  const [showRes, setShowRes] = useState(false);

  const ewRes  = useMemo(() => calcTrenchEarthworks({
    lengthM: earthIn.length, diaMM: earthIn.dia, depthM: earthIn.depth,
    soilType: earthIn.soil, sandBedMM: earthIn.sandBed,
    rockDepthM: earthIn.rockDepth, hasSheeting: earthIn.hasSheeting,
    hasDewatering: earthIn.hasDewatering,
  }), [earthIn]);

  const aspRes = useMemo(() => calcAsphalt({
    lengthM: aspIn.length, widthM: aspIn.width, shoulderWidthM: aspIn.shoulder,
    wearing_mm: aspIn.wearing, binder_mm: aspIn.binder, baseCourse_mm: aspIn.baseCourse,
    base_mm: aspIn.base, subbase_mm: aspIn.subbase, hasCutting: aspIn.hasCutting,
  }), [aspIn]);

  const inStyle = { width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${T.bd}`, background:T.bg3, color:T.t1, fontSize:11, boxSizing:"border-box", marginTop:3 };
  const rowStyle = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 };
  const labelStyle = { fontSize:8.5, color:T.t3, fontWeight:600 };
  const checkStyle = { display:"flex", alignItems:"center", gap:5, marginTop:6, fontSize:9, color:T.t2, cursor:"pointer" };

  return (
    <div style={{border:`2px solid ${D?"#1e3a5f50":"#bfdbfe"}`,borderRadius:14,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:`1px solid ${T.bd}`}}>
        {[["earth","⛏️ حاسبة الحفر والردم"],["asphalt","🛣️ حاسبة الأسفلت"]].map(([k,l])=>(
          <button key={k} onClick={()=>{setMode(k);setShowRes(false);}} style={{flex:1,padding:"10px",border:"none",borderRadius:0,fontSize:10,fontWeight:700,cursor:"pointer",
            background:mode===k?(D?"#1e3a5f":"#eff6ff"):(D?"#0f172a":"#f8fafc"),
            color:mode===k?"#2563eb":T.t3,borderBottom:mode===k?"3px solid #2563eb":"3px solid transparent"}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{padding:14,background:D?"#0a0f1a":"#f8fafc"}}>
        {mode==="earth"&&(
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>قطر الأنبوب (mm)</div>
                <select style={inStyle} value={earthIn.dia} onChange={e=>setEarthIn(p=>({...p,dia:+e.target.value}))}>
                  {[110,150,200,250,315,400,500,600,700,800,900,1000,1200,1500].map(d=><option key={d} value={d}>Ø{d}mm</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>نوع التربة</div>
                <select style={inStyle} value={earthIn.soil} onChange={e=>setEarthIn(p=>({...p,soil:e.target.value}))}>
                  {Object.entries(SOIL_PARAMS).map(([k,v])=><option key={k} value={k}>{v.ar} (انتفاش ×{v.swell})</option>)}
                </select>
              </div>
            </div>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>عمق الحفر (م)</div>
                <input type="number" style={inStyle} min=".5" max="15" step=".1" value={earthIn.depth} onChange={e=>setEarthIn(p=>({...p,depth:+e.target.value}))}/>
              </div>
              <div>
                <div style={labelStyle}>طول الخط (م)</div>
                <input type="number" style={inStyle} min="1" max="50000" step="1" value={earthIn.length} onChange={e=>setEarthIn(p=>({...p,length:+e.target.value}))}/>
              </div>
            </div>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>فرشة رملية (mm)</div>
                <select style={inStyle} value={earthIn.sandBed} onChange={e=>setEarthIn(p=>({...p,sandBed:+e.target.value}))}>
                  {[100,150,200,300].map(v=><option key={v} value={v}>{v}mm</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>عمق الطبقة الصخرية (م) [0=لا يوجد]</div>
                <input type="number" style={inStyle} min="0" max="15" step=".1" value={earthIn.rockDepth} onChange={e=>setEarthIn(p=>({...p,rockDepth:+e.target.value}))}/>
              </div>
            </div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <label style={checkStyle}>
                <input type="checkbox" checked={earthIn.hasSheeting} onChange={e=>setEarthIn(p=>({...p,hasSheeting:e.target.checked}))}/>
                دعم جوانب (Sheeting)
              </label>
              <label style={checkStyle}>
                <input type="checkbox" checked={earthIn.hasDewatering} onChange={e=>setEarthIn(p=>({...p,hasDewatering:e.target.checked}))}/>
                ضخ مياه جوفية
              </label>
            </div>
            <button className="bg" style={{width:"100%",padding:"9px",fontSize:10,borderRadius:9}} onClick={()=>setShowRes(true)}>
              🔢 احسب الكميات والتكاليف
            </button>
            {showRes&&mode==="earth"&&(
              <div style={{background:D?"#0f1e38":"#eff6ff",borderRadius:10,padding:"11px 13px",border:`1px solid ${D?"#1e3a5f":"#bfdbfe"}`}}>
                <div style={{fontSize:10,color:"#2563eb",fontWeight:700,marginBottom:8}}>
                  📊 Ø{earthIn.dia}mm عمق {earthIn.depth}م × {earthIn.length}م — خندق عرض {ewRes.tw}م
                </div>
                {/* تنبيهات */}
                {ewRes.alerts.length>0&&(
                  <div style={{marginBottom:7,display:"flex",flexDirection:"column",gap:3}}>
                    {ewRes.alerts.map((a,i)=><div key={i} style={{fontSize:8.5,color:"#ea580c",background:D?"#431407":"#fff7ed",padding:"3px 8px",borderRadius:5}}>{a}</div>)}
                  </div>
                )}
                {/* حجوم */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:8}}>
                  {[
                    ["حفر تربة",`${ewRes.excav_soil_m3}م³`,"#dc2626"],
                    ["حفر صخر",`${ewRes.excav_rock_m3}م³`,"#6b7280"],
                    ["فرشة رملية",`${ewRes.sandBed_m3}م³`,"#ca8a04"],
                    ["ردم مدموك",`${ewRes.backfill_m3}م³`,"#16a34a"],
                    ["ردم فعلي",`${ewRes.backfill_loose_m3}م³`,"#059669"],
                    ["تخلص/نقل",`${ewRes.disposal_m3}م³`,"#7c3aed"],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{background:D?"#1e293b":"#fff",borderRadius:7,padding:"6px 8px",border:`1px solid ${c}20`}}>
                      <div style={{fontSize:7.5,color:T.t3}}>{l}</div>
                      <div style={{fontSize:11,color:c,fontWeight:700}}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* تكلفة مفصّلة */}
                <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:7}}>
                  <div style={{fontSize:9,color:T.t3,marginBottom:5}}>التكلفة التفصيلية:</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                    {[
                      ["حفر تربة",ewRes.cost?.excav_soil_sar,"#dc2626"],
                      ["حفر صخر",ewRes.cost?.excav_rock_sar,"#6b7280"],
                      ["ردم مدموك",ewRes.cost?.backfill_sar,"#16a34a"],
                      ["فرشة رملية",ewRes.cost?.sandBed_sar,"#ca8a04"],
                      ["تخلص/نقل",ewRes.cost?.disposal_sar,"#7c3aed"],
                      ["دعم جوانب",ewRes.cost?.sheeting_sar,"#ea580c"],
                      ["ضخ مياه",ewRes.cost?.dewater_sar,"#0284c7"],
                    ].filter(([,v])=>v>0).map(([l,v,c])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:8.5,padding:"3px 6px",background:D?"#1e293b20":"#f8fafc",borderRadius:5}}>
                        <span style={{color:T.t2}}>{l}</span>
                        <b style={{color:c}}>{(+v).toLocaleString()} SAR</b>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:7,display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:800,padding:"6px 10px",background:D?"#1e3a5f30":"#dbeafe",borderRadius:7}}>
                    <span style={{color:T.t1}}>الإجمالي</span>
                    <span style={{color:"#2563eb"}}>{(ewRes.cost?.total_sar||0).toLocaleString()} SAR</span>
                  </div>
                  <div style={{marginTop:5,fontSize:7.5,color:T.t3}}>
                    إعادة الرصف: {ewRes.reinstat_m2} م² | عامل الانتفاش: ×{SOIL_PARAMS[earthIn.soil]?.swell}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {mode==="asphalt"&&(
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>طول الطريق (م)</div>
                <input type="number" style={inStyle} min="1" max="100000" value={aspIn.length} onChange={e=>setAspIn(p=>({...p,length:+e.target.value}))}/>
              </div>
              <div>
                <div style={labelStyle}>عرض الرصف (م)</div>
                <input type="number" style={inStyle} min="2" max="60" step=".5" value={aspIn.width} onChange={e=>setAspIn(p=>({...p,width:+e.target.value}))}/>
              </div>
            </div>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>عرض الكتف (م)</div>
                <input type="number" style={inStyle} min="0" max="10" step=".5" value={aspIn.shoulder} onChange={e=>setAspIn(p=>({...p,shoulder:+e.target.value}))}/>
              </div>
              <div>
                <div style={labelStyle}>هيكل MOT (تطبيق سريع)</div>
                <select style={inStyle} onChange={e=>{const s=ROAD_STRUCTURES[e.target.value];if(s)setAspIn(p=>({...p,wearing:s.wearing,binder:s.binder,baseCourse:s.baseCourse,base:s.base,subbase:s.subbase}));}}>
                  <option value="">— اختر تصنيف الطريق —</option>
                  {Object.entries(ROAD_STRUCTURES).map(([k,v])=><option key={k} value={k}>{v.name} ({v.maxSpeed}كم/س)</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
              {[["wearing","Wearing mm"],["binder","Binder mm"],["baseCourse","Base AC mm"],["base","مجروش mm"],["subbase","رمل mm"]].map(([k,l])=>(
                <div key={k}>
                  <div style={{...labelStyle,fontSize:7.5}}>{l}</div>
                  <input type="number" style={inStyle} min="0" max="500" step="5" value={aspIn[k]} onChange={e=>setAspIn(p=>({...p,[k]:+e.target.value}))}/>
                </div>
              ))}
            </div>
            <label style={checkStyle}>
              <input type="checkbox" checked={aspIn.hasCutting} onChange={e=>setAspIn(p=>({...p,hasCutting:e.target.checked}))}/>
              قطع رصف قائم (Milling/Cutting)
            </label>
            <button className="bg" style={{width:"100%",padding:"9px",fontSize:10,borderRadius:9}} onClick={()=>setShowRes(true)}>
              🔢 احسب الكميات
            </button>
            {showRes&&mode==="asphalt"&&(
              <div style={{background:D?"#0c0c10":"#f8fafc",borderRadius:10,padding:"11px 13px",border:`1px solid ${T.bd}`}}>
                <div style={{fontSize:10,color:T.t1,fontWeight:700,marginBottom:8}}>
                  📊 {aspIn.length}م × {aspIn.width}م (كتف {aspIn.shoulder}م) — مساحة {aspRes.mainArea.toLocaleString()}م²
                </div>
                {/* KPIs */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:8}}>
                  {[
                    ["المساحة الكلية",`${aspRes.totalArea.toLocaleString()}م²`,"#2563eb"],
                    ["أسفلت AC",`${aspRes.totalAspTons.toFixed(1)} طن`,"#1e293b"],
                    ["أساس+رمل",`${aspRes.totalAggM3.toFixed(0)} م³`,"#92400e"],
                    ["رش أسفلتي",`${aspRes.totalSprayLtr||0} لتر`,"#7c3aed"],
                    ["تكلفة/م²",`${aspRes.costPerM2} SAR`,"#ca8a04"],
                    ["الإجمالي",`${(aspRes.totalCost||0).toLocaleString()} SAR`,"#16a34a"],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{background:D?"#1e293b":"#fff",borderRadius:7,padding:"6px 8px",border:`1px solid ${c}20`}}>
                      <div style={{fontSize:7.5,color:T.t3}}>{l}</div>
                      <div style={{fontSize:11,color:c,fontWeight:700}}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* طبقات */}
                <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:6}}>
                  {aspRes.layers.filter(l=>l.thickMM>1).map((l,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",background:D?"#1e293b20":"#f1f5f9",borderRadius:6,fontSize:8.5}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <div style={{width:8,height:8,borderRadius:2,background:l.color}}/>
                        <span style={{color:T.t2}}>{l.ar}</span>
                        <span style={{color:T.t3,fontSize:8}}>{l.thickMM}mm</span>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{color:T.t3,fontSize:8}}>{l.type==="AC"?`${l.tons}t`:l.type==="Agg"?`${l.vol_m3}م³`:`${l.ltrs||0}L`}</span>
                        <span style={{color:T.gold,fontWeight:700}}>{(l.cost_sar||0).toLocaleString()} SAR</span>
                      </div>
                    </div>
                  ))}
                </div>
                {aspRes.cuttingCost>0&&(
                  <div style={{fontSize:8.5,color:"#ea580c",background:D?"#431407":"#fff7ed",padding:"4px 9px",borderRadius:6}}>
                    قطع رصف قائم: {(aspRes.cuttingCost).toLocaleString()} SAR
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export default function AlimtyazV9() {
  const [tab,      setTab]     = useState("config");   // config|pdf|analysis
  const [cfg,      setCfg]     = useState({authority:0,projectType:0,roleMode:0,zoneStr:0});
  const [mods,     setMods]    = useState({});
  const [depth,    setDepth]   = useState("standard");
  const [ocr,      setOcr]     = useState(false);
  const [queue,    setQueue]   = useState([]);
  const [qIdx,     setQIdx]    = useState(0);
  const [pdfSess,  setPdfSess] = useState(null);
  // ── Multi-PDF Queue v9 ──
  const [pdfQueue,  setPdfQueue]  = useState([]);   // [{name,numPages,fileSizeMB,doc,file,status}]
  const [activePdf, setActivePdf] = useState(0);    // index في pdfQueue
  const [uploadProgress, setUploadProgress] = useState({}); // {fileName: 0–100}
  // ── نظام التصنيف المجمّع ──
  const [classifyQueue, setClassifyQueue] = useState(null); // قائمة الملفات المنتظرة للتصنيف
  const [showClassify,  setShowClassify]  = useState(false);
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
  const folderRef = useRef();
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

  // Thumbnail loader — يحدث pdfSess والقائمة معاً
  const loadThumbs=useCallback(async(doc,pages,queueIdx=null)=>{
    for(const p of pages){
      if(cancelRef.current)break;
      try{
        const url=await renderThumb(doc,p);
        // تحديث pdfSess دائماً
        setPdfSess(prev=>{
          if(!prev||prev.doc!==doc)return prev;
          return{...prev,thumbs:{...prev.thumbs,[p]:url},thumbsLoaded:new Set([...prev.thumbsLoaded,p])};
        });
        // تحديث إدخال pdfQueue إن عُرِف الـ index
        if(queueIdx!=null){
          setPdfQueue(prev=>{
            const next=[...prev];
            if(next[queueIdx]&&next[queueIdx].doc===doc){
              next[queueIdx]={...next[queueIdx],
                thumbs:{...next[queueIdx].thumbs,[p]:url},
                thumbsLoaded:new Set([...next[queueIdx].thumbsLoaded,p])};
            }
            return next;
          });
        }
      }catch{}
      await new Promise(r=>setTimeout(r,0));
    }
  },[]);

  // ── رفع الملفات: متوازي + تقدم + متعدد PDF ──
  const handleFiles=useCallback(async(files)=>{
    const arr=Array.from(files||[]);
    if(!arr.length)return;

    const images=[], pdfs=[], dwgs=[];
    arr.forEach(f=>{
      const n=f.name.toLowerCase();
      if(f.type.startsWith("image/")||n.endsWith(".webp")||n.endsWith(".avif")) images.push(f);
      else if(f.type==="application/pdf"||n.endsWith(".pdf")) pdfs.push(f);
      else if(n.endsWith(".dwg")||n.endsWith(".dxf")) dwgs.push(f);
    });

    // ── صور: رفع متوازي فوري ──
    if(images.length){
      await Promise.all(images.map(file=>new Promise(res=>{
        const reader=new FileReader();
        reader.onload=e=>{
          setQueue(prev=>[...prev,{src:e.target.result,b64:e.target.result.split(",")[1],mime:file.type||"image/jpeg",name:file.name,type:"image"}]);
          res();
        };
        reader.readAsDataURL(file);
      })));
      setTab("analysis");
    }

    // ── PDFs: تحميل تسلسلي مع شريط تقدم لكل ملف ──
    // ملاحظة: تسلسلي (وليس متوازي) لمنع تعارض Worker الذاكرة عند ملفات كبيرة
    if(pdfs.length){
      const initProg={};
      pdfs.forEach(f=>{initProg[f.name]=1;});
      setUploadProgress(prev=>({...prev,...initProg}));

      const successEntries=[];
      const failedEntries=[];

      for(const file of pdfs){
        try{
          const {doc,numPages,fileSizeMB}=await openPdf(file,pct=>{
            setUploadProgress(prev=>({...prev,[file.name]:pct}));
          });
          const entry={
            file,doc,numPages,fileSizeMB:fileSizeMB||0,
            name:file.name.replace(/\.pdf$/i,""),
            status:"ready",
            thumbs:{},thumbsLoaded:new Set(),
            mode:"range",rangeStr:`1-${Math.min(numPages,200)}`,
            selPages:[],chunkSize:20,quality:"fast",densities:{},
          };
          setPdfQueue(prev=>{
            const next=[...prev,entry];
            const newIdx=next.length-1;
            setActivePdf(newIdx);
            setPdfSess(entry);
            fname=file.name.replace(/\.pdf$/i,"");
            setTimeout(()=>loadThumbs(doc,Array.from({length:Math.min(60,numPages)},(_,i)=>i+1),newIdx),80);
            return next;
          });
          successEntries.push(file.name);
        }catch(err){
          failedEntries.push({name:file.name,reason:err.message});
          // أضف رسالة خطأ واضحة مع سبب تفصيلي
          setMsgs(prev=>[...prev,{role:"assistant",
            content:`## ❌ خطأ في فتح الملف\n**الملف:** ${file.name}\n**السبب:** ${err.message}\n\n**الحلول المقترحة:**\n• تأكد أن الملف ليس محمياً بكلمة مرور\n• جرب فتحه وإعادة حفظه من Adobe Acrobat أو أي PDF viewer\n• إذا كان من AutoCAD، تأكد من نجاح التصدير إلى PDF`}]);
        }finally{
          setUploadProgress(prev=>{const n={...prev};delete n[file.name];return n;});
        }
      }

      setTab("pdf");
      if(pdfs.length>1&&successEntries.length>0){
        setMsgs(prev=>[...prev,{role:"assistant",
          content:`## ✅ تم تحميل الملفات\n**نجح:** ${successEntries.length}/${pdfs.length} ملف\n${successEntries.map(n=>`• ✅ ${n}`).join("\n")}${failedEntries.length?`\n\n**فشل:** ${failedEntries.length} ملف\n${failedEntries.map(f=>`• ❌ ${f.name}: ${f.reason}`).join("\n")}`:""}`}]);
      }
    }

    // ── DWG/DXF ──
    if(dwgs.length){
      await Promise.all(dwgs.map(async file=>{
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
      }));
      setTab("analysis");
    }
  },[loadThumbs]);

  // ── رفع مجمّع: يعرض نافذة التصنيف أولاً ──
  const handleBulkUpload = useCallback((files) => {
    const arr = Array.from(files || []).filter(f => {
      const n = f.name.toLowerCase();
      return n.endsWith(".pdf") || f.type.startsWith("image/") || n.endsWith(".webp") || n.endsWith(".dwg") || n.endsWith(".dxf");
    });
    if (!arr.length) return;
    if (arr.length === 1) { handleFiles([arr[0]]); return; }
    // عرض نافذة التصنيف للملفات المتعددة
    setClassifyQueue(arr);
    setShowClassify(true);
  }, [handleFiles]);

  // ── بعد تأكيد التصنيف: رفع كل مجموعة ──
  const handleClassifyConfirm = useCallback(async (groups) => {
    setShowClassify(false);
    const allFiles = Object.values(groups).flatMap(g => g.files);
    // رفع كل الملفات مع إضافة metadata التصنيف
    const pdfs = allFiles.filter(f => f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf");
    const images = allFiles.filter(f => f.type.startsWith("image/") || f.name.toLowerCase().endsWith(".webp"));

    // تحميل الـ PDFs مع التصنيف المضاف
    await handleFiles([...pdfs, ...images]);

    // تحديث pdfQueue بـ metadata التصنيف
    if (pdfs.length > 0) {
      setPdfQueue(q => q.map(entry => {
        const grp = Object.entries(groups).find(([, g]) => g.files.some(f => f.name === (entry.file?.name || "")));
        if (grp) return { ...entry, classification: grp[1] };
        return entry;
      }));
    }
    setClassifyQueue(null);
    pushMsg("assistant", `## 🗂️ تم رفع الملفات المصنّفة\n${Object.entries(groups).map(([,g])=>`**${g.icon} ${g.ar}** — ${g.files.length} ملف: ${g.files.map(f=>f.name).join(", ")}`).join("\n")}\n\n✅ اختر أي ملف من القائمة أعلاه وابدأ التحليل.`);
  }, [handleFiles]);

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

      // بناء شبكة الأنابيب من بيانات كل الصفحات
      const pipeNetwork = buildPipeNetwork(extractedData);

      // إحصاءات المواد المكتشفة
      const matStats = {};
      pipeNetwork.forEach(p => { matStats[p.mat] = (matStats[p.mat]||0) + (p.totalLength||1); });

      // ── تجميع بيانات الحفر والردم المحسّن ──
      const trenchList = [];
      const earthworkAlerts = [];
      pipeNetwork.forEach(pipe => {
        if (pipe.totalLength > 0) {
          const avgDepth = pipe.maxDepth > 0 ? +((pipe.minDepth + pipe.maxDepth) / 2).toFixed(1) : 2.0;
          // كشف التربة من الصفحات
          let soilType = "normal";
          let hasRock = false, hasSheeting = false, hasDewatering = false, rockDepth = 0;
          Object.values(extractedData).forEach(d => {
            if (d.ewData) {
              if (d.ewData.hasRock)        { hasRock = true; rockDepth = d.ewData.rockDepth || avgDepth * 0.3; }
              if (d.ewData.hasSheeting)      hasSheeting = true;
              if (d.ewData.hasDewatering)    hasDewatering = true;
              if (d.ewData.soilTypes?.length) soilType = d.ewData.soilTypes[0];
            }
          });
          const ew = calcTrenchEarthworks({
            lengthM: pipe.totalLength, diaMM: pipe.dia, depthM: avgDepth,
            soilType, hasRock: soilType==="rock", rockDepthM: rockDepth,
            hasSheeting, hasDewatering,
          });
          trenchList.push({ ...ew, pipeLabel: `Ø${pipe.dia}mm ${pipe.mat}` });
          ew.alerts.forEach(a => { if (!earthworkAlerts.includes(a)) earthworkAlerts.push(a); });
        }
      });

      const ewSum = sumEarthworks(trenchList);
      const costBreakdown = trenchList.length > 0 ? {
        "حفر تربة عادية": trenchList.reduce((s,t)=>s+(t.cost?.excav_soil_sar||0),0),
        "حفر صخر":         trenchList.reduce((s,t)=>s+(t.cost?.excav_rock_sar||0),0),
        "ردم مدموك":        trenchList.reduce((s,t)=>s+(t.cost?.backfill_sar||0),0),
        "فرشة رملية":       trenchList.reduce((s,t)=>s+(t.cost?.sandBed_sar||0),0),
        "نقل وتخلص":        trenchList.reduce((s,t)=>s+(t.cost?.disposal_sar||0),0),
        "دعم جوانب":        trenchList.reduce((s,t)=>s+(t.cost?.sheeting_sar||0),0),
        "ضخ مياه جوفية":    trenchList.reduce((s,t)=>s+(t.cost?.dewater_sar||0),0),
      } : {};

      const earthworksSummary = ewSum.excav_total > 0 ? {
        excav_soil:   ewSum.excav_soil,
        excav_rock:   ewSum.excav_rock,
        excav_total:  ewSum.excav_total,
        backfill:     ewSum.backfill,
        disposal:     ewSum.disposal,
        sandBed:      ewSum.sandBed,
        reinstat:     ewSum.reinstat,
        cost_total:   ewSum.cost_total,
        costBreakdown,
        trenchList,
      } : null;

      // ── تجميع بيانات الأسفلت المحسّن ──
      let aspTotal = { area:0, tons:0, aggM3:0, sprayLtr:0, cost:0 };
      let aspLayersAgg = [], aspRoadType = null, aspThickMM = 0;
      const aspPages = Object.values(extractedData).filter(d => d.aspData && (d.aspData.wearing > 0 || d.aspData.binder > 0 || d.aspData.base > 0));
      aspPages.forEach(d => {
        const a = d.aspData;
        if (!aspRoadType && a.roadType) aspRoadType = a.roadType;
        const useLen = a.roadLengths?.[0] || 100; // تقديري إذا لم يكن محدداً
        const useWid = a.roadWidths?.[0]  || 7;
        const result = calcAsphalt({
          lengthM: useLen, widthM: useWid,
          wearing_mm: a.wearing, binder_mm: a.binder, baseCourse_mm: a.baseCourse,
          base_mm: a.base, subbase_mm: a.subbase, hasCutting: a.hasCutting,
        });
        aspTotal.area     += result.mainArea;
        aspTotal.tons     += result.totalAspTons;
        aspTotal.aggM3    += result.totalAggM3;
        aspTotal.sprayLtr += result.totalSprayLtr||0;
        aspTotal.cost     += result.totalCost;
        if (aspLayersAgg.length === 0) { aspLayersAgg = result.layers; aspThickMM = result.totalThickMM; }
      });
      const asphaltSummary = aspTotal.area > 0 ? {
        totalArea:     aspTotal.area,
        totalTons:     aspTotal.tons,
        totalAggM3:    aspTotal.aggM3,
        totalSprayLtr: aspTotal.sprayLtr,
        totalCost:     aspTotal.cost,
        layers:        aspLayersAgg,
        roadType:      aspRoadType,
        totalThickMM:  aspThickMM,
      } : null;

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
        pipeNetwork,
        matStats,
        earthworksSummary,
        earthworkAlerts,
        asphaltSummary,
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
          if(d.invertLevels?.length)payload+=`[مناسيب IL/GL] ${d.invertLevels.join(" | ")}\n`;
          if(d.chainages?.length)payload+=`[Chainages] ${d.chainages.join(" | ")}\n`;
          if(d.manholes?.length)payload+=`[غرف/بيارات] GH${d.manholes.join(", GH")}\n`;
          if(d.pipeSpecs?.length)payload+=`[مواصفات أنابيب] ${d.pipeSpecs.join(" | ")}\n`;
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
            const b64=await renderPageImg(doc,p,preset.scale,preset.quality,preset.maxPx||4096);
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
  const qKey=pdfSess?.quality||"fast";
  const secPerPage={fast:0.08,hybrid:0.3,draft:0.9,standard:1.6,infra:2.8,high:4.0};
  const estSec=spLen*(secPerPage[qKey]||1.6)+cks*5;
  const preset=pdfSess?QP[pdfSess.quality]||QP.fast:QP.fast;

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
            <button className="bo" style={{fontSize:9,padding:"3px 9px",borderColor:"#7c3aed",color:"#7c3aed"}} onClick={()=>exportPipeScheduleCSV(msgs)} title="جدول الأنابيب">🔵 أنابيب</button>
            {xStats?.earthworksSummary&&<button className="bo" style={{fontSize:9,padding:"3px 9px",borderColor:"#ea580c",color:"#ea580c"}} onClick={()=>exportEarthworksCSV(xStats)} title="جدول الحفر والردم">⛏️ حفر</button>}
            {xStats?.asphaltSummary&&<button className="bo" style={{fontSize:9,padding:"3px 9px",borderColor:"#475569",color:"#475569"}} onClick={()=>exportAsphaltCSV(xStats)} title="جدول الأسفلت">🛣️ أسفلت</button>}
            <button className="bo" style={{fontSize:9,padding:"3px 9px"}} onClick={()=>exportMD(msgs,cfgStr())} title="MD">⬇️ MD</button>
            <button className="bo" style={{fontSize:9,padding:"3px 9px"}} onClick={()=>exportJSON(msgs,feState,cfgStr())} title="JSON">⬇️ JSON</button>
            {feState?.extractedData&&Object.keys(feState.extractedData).length>0&&<button className="bo" style={{fontSize:9,padding:"3px 9px"}} onClick={()=>exportTXT(feState)} title="TXT">⬇️ TXT</button>}
          </>}
          {totalTokens>0&&<span style={{fontSize:9,color:T.t3,background:T.bg3,border:`1px solid ${T.bd}`,padding:"2px 8px",borderRadius:8}}>{totalTokens.toLocaleString()}t</span>}
          {boqCount>0&&<span style={{fontSize:9,color:T.grn,background:D?"#064e3b20":"#dcfce7",border:"1px solid #bbf7d0",padding:"2px 8px",borderRadius:8,fontWeight:700}}>{boqCount} BOQ</span>}
        </div>

        {/* ══ CONFIG ══ */}
        {tab==="config"&&(
          <div style={{flex:1,overflowY:"auto",padding:"20px 18px"}}>
            <div style={{maxWidth:860,margin:"0 auto",display:"flex",flexDirection:"column",gap:14}}>

              {/* ── Header ── */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                <div>
                  <div style={{fontSize:10,color:T.gold,fontWeight:700,marginBottom:3,letterSpacing:".5px"}}>⚙️ إعداد الجلسة التحليلية</div>
                  <h2 style={{margin:0,fontSize:22,fontWeight:900,color:T.t1}}>ALIMTYAZ <span style={{background:`linear-gradient(90deg,${T.gold},${T.goldL})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>محلل المخططات</span></h2>
                </div>
                <div style={{textAlign:"center",padding:"8px 16px",borderRadius:12,border:`1px solid ${T.gold}30`,background:D?"#1c1404":"#fef9ec"}}>
                  <div style={{fontSize:10,color:T.t3}}>الدقة المتوقعة</div>
                  <div style={{fontSize:24,fontWeight:900,color:T.gold}}>{depth==="deep"?"95%":depth==="standard"?"85%":"70%"}</div>
                </div>
              </div>

              {/* ── Resumable session ── */}
              {resumable&&(
                <div style={{background:D?"#0a2010":"#f0fdf4",border:"1px solid #86efac",borderRadius:12,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:11,color:T.grn,fontWeight:700}}>🔄 جلسة محفوظة غير مكتملة</div>
                    <div style={{fontSize:9,color:T.t3}}>{resumable.file} · {resumable.partialResults?.length} دُفعة · {new Date(resumable.timestamp).toLocaleString("ar-SA")}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="fe-btn" style={{fontSize:10,padding:"5px 14px"}} onClick={()=>{setTab("analysis");runExtraction(resumable.partialResults);}}>▶️ استكمال</button>
                    <button className="bo" style={{fontSize:10}} onClick={()=>{clearBatch();setResumable(null);}}>✕ تجاهل</button>
                  </div>
                </div>
              )}

              {/* ── Step 1: Quick Presets ── */}
              <div className="card" style={{padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#1a0a00",flexShrink:0}}>1</div>
                  <div style={{fontSize:12,fontWeight:800,color:T.t1}}>اختر إعداداً جاهزاً <span style={{fontSize:9,color:T.t3,fontWeight:400}}>— أو خصّص يدوياً أدناه</span></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {[
                    {icon:"🔵",label:"صرف صحي",sub:"سيور / بيارات / مناسيب",auth:0,type:0,disc:["استخراج الكميات","مراجعة التعارضات","توليد BOQ","تقدير SAR","محرك المخاطر","حفر عميق","أقطار كبيرة","منسوب المياه"],depth:"deep",color:"#2563eb"},
                    {icon:"🛣️",label:"طرق ورصف",sub:"طبقات / أكتاف / ميول",auth:1,type:1,disc:["استخراج الكميات","تحسين الترابية","توليد BOQ","تقدير SAR","حساسية ±5%±10%","سماكة الأسفلت"],depth:"standard",color:"#dc2626"},
                    {icon:"💧",label:"شبكة مياه",sub:"خطوط / صمامات / غرف",auth:2,type:2,disc:["استخراج الكميات","تنسيق التخصصات","توليد BOQ","تقدير SAR","محرك المخاطر","منسوب المياه"],depth:"standard",color:"#0ea5e9"},
                    {icon:"🌊",label:"بحري / Outfall",sub:"outfall / diffuser / حماية",auth:0,type:2,disc:["استخراج الكميات","توليد BOQ","تقدير SAR","محرك المخاطر"],depth:"deep",color:"#0284c7"},
                    {icon:"🏗️",label:"إنشائي",sub:"أساسات / تسليح / خرسانة",auth:0,type:3,disc:["استخراج الكميات","تنسيق التخصصات","توليد BOQ","تقدير SAR"],depth:"standard",color:"#d97706"},
                    {icon:"⚡",label:"تحليل سريع",sub:"نظرة عامة / BOQ مبدئي",auth:0,type:0,disc:["استخراج الكميات","توليد BOQ","تقدير SAR"],depth:"quick",color:T.grn},
                  ].map(p=>{
                    const isMatch=CFG_O.authority[cfg.authority]===CFG_O.authority[p.auth]&&depth===p.depth;
                    return(
                      <div key={p.label} onClick={()=>{
                        setCfg(prev=>({...prev,authority:p.auth,projectType:p.type}));
                        const nm={};
                        Object.entries(MODS_O).forEach(([cat,ms])=>ms.forEach(m=>{const k=`${cat}_${m}`;nm[k]=p.disc.includes(m);}));
                        setMods(nm);setDepth(p.depth);save({...cfg,authority:p.auth,projectType:p.type},nm,p.depth);
                      }} style={{cursor:"pointer",borderRadius:12,border:`2px solid ${p.color}40`,background:p.color+"10",padding:"12px 14px",transition:"all .18s",position:"relative",overflow:"hidden"}}
                        onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                        onMouseLeave={e=>e.currentTarget.style.transform=""}>
                        <div style={{fontSize:24,marginBottom:6}}>{p.icon}</div>
                        <div style={{fontSize:11,fontWeight:800,color:p.color,marginBottom:2}}>{p.label}</div>
                        <div style={{fontSize:8.5,color:T.t3,lineHeight:1.4}}>{p.sub}</div>
                        <div style={{position:"absolute",top:8,left:8,fontSize:7,fontWeight:700,color:p.color,background:p.color+"20",padding:"2px 6px",borderRadius:6}}>{p.depth==="deep"?"~95%":p.depth==="standard"?"~85%":"~70%"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Step 2: Context Settings ── */}
              <div className="card" style={{padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#1a0a00",flexShrink:0}}>2</div>
                  <div style={{fontSize:12,fontWeight:800,color:T.t1}}>بيانات السياق <span style={{fontSize:9,color:T.t3,fontWeight:400}}>— تُحسّن دقة الترميز والأسعار</span></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    {label:"🏛️ الجهة المالكة",key:"authority",opts:CFG_O.authority,tip:"يحدد معايير الامتثال المطلوبة"},
                    {label:"📂 نوع المشروع",key:"projectType",opts:CFG_O.projectType,tip:"يوجّه نموذج التسعير"},
                    {label:"👤 دور المستخدم",key:"roleMode",opts:CFG_O.roleMode,tip:"يكيّف أسلوب التقرير"},
                    {label:"📍 هيكل المناطق",key:"zoneStr",opts:CFG_O.zoneStr,tip:"للكود KSA"},
                  ].map(({label,key,opts,tip})=>(
                    <div key={key} style={{background:D?"#0f172a":"#f8fafc",borderRadius:10,padding:"10px 12px",border:`1px solid ${T.bd}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                        <div style={{fontSize:10,color:T.t2,fontWeight:700}}>{label}</div>
                        <div style={{fontSize:7.5,color:T.t3,background:D?"#1e293b":"#e2e8f0",padding:"1px 6px",borderRadius:4}}>{tip}</div>
                      </div>
                      <select className="sel" value={cfg[key]} onChange={e=>{const n={...cfg,[key]:+e.target.value};setCfg(n);save(n,mods,depth);}}>
                        {opts.map((o,i)=><option key={i} value={i}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Step 3: Analysis Modules ── */}
              <div className="card" style={{padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#1a0a00",flexShrink:0}}>3</div>
                    <div style={{fontSize:12,fontWeight:800,color:T.t1}}>الوحدات التحليلية النشطة <span style={{fontSize:9,color:T.t3,fontWeight:400}}>— {Object.values(mods).filter(Boolean).length} مُفعَّل</span></div>
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    <button className="bo" style={{fontSize:8,padding:"3px 9px"}} onClick={()=>{const nm={};Object.entries(MODS_O).forEach(([c,ms])=>ms.forEach(m=>{nm[`${c}_${m}`]=true;}));setMods(nm);save(cfg,nm,depth);}}>تحديد الكل</button>
                    <button className="bo" style={{fontSize:8,padding:"3px 9px"}} onClick={()=>{setMods({});save(cfg,{},depth);}}>مسح الكل</button>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {Object.entries(MODS_O).map(([cat,ms])=>{
                    const catActive=ms.filter(m=>mods[`${cat}_${m}`]).length;
                    return(
                      <div key={cat} style={{background:D?"#0a0f1a":"#f8fafc",borderRadius:10,padding:"10px 12px",border:`1px solid ${T.bd}`}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
                          <div style={{fontSize:10,color:T.gold,fontWeight:800}}>{cat}</div>
                          <div style={{fontSize:8,color:T.t3}}>{catActive}/{ms.length} نشط</div>
                        </div>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          {ms.map(m=>{
                            const k=`${cat}_${m}`;
                            const on=!!mods[k];
                            return(
                              <span key={m} onClick={()=>{const n={...mods,[k]:!on};setMods(n);save(cfg,n,depth);}}
                                style={{cursor:"pointer",padding:"6px 13px",borderRadius:20,fontSize:10,fontWeight:on?700:400,
                                  border:`1.5px solid ${on?T.gold:T.bd}`,
                                  background:on?(D?"#1c1404":"#fef3c7"):(D?"#1e293b":"#fff"),
                                  color:on?T.gold:T.t2,transition:"all .15s",
                                  boxShadow:on?`0 0 0 2px ${T.gold}25`:"none"}}>
                                {on?"✓ ":""}{m}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Step 4: Analysis Depth ── */}
              <div className="card" style={{padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#1a0a00",flexShrink:0}}>4</div>
                  <div style={{fontSize:12,fontWeight:800,color:T.t1}}>عمق التحليل ودقة النتائج</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {[
                    {k:"quick",icon:"⚡",l:"سريع",d:"نظرة عامة عامة",acc:"~70%",time:"أسرع",pros:["سريع جداً","مناسب للتصفح"],cons:["BOQ تقريبي","لا تحقق"]},
                    {k:"standard",icon:"📊",l:"قياسي",d:"BOQ + مخاطر",acc:"~85%",time:"متوسط",pros:["BOQ دقيق","تحليل مخاطر"],cons:["بدون تحقق مزدوج"]},
                    {k:"deep",icon:"🔬",l:"عميق",d:"تحقق مزدوج شامل",acc:"~95%",time:"أطول",pros:["أعلى دقة","تحقق تبادلي","اتساق المخططات"],cons:["أبطأ"]},
                  ].map(d=>{
                    const on=depth===d.k;
                    return(
                      <div key={d.k} onClick={()=>{setDepth(d.k);save(cfg,mods,d.k);}}
                        style={{cursor:"pointer",borderRadius:12,padding:"14px",
                          border:`2px solid ${on?T.gold:T.bd}`,
                          background:on?(D?"#1c1404":"#fef9ec"):(D?"#0f172a":"#f8fafc"),
                          transition:"all .18s",position:"relative"}}>
                        {on&&<div style={{position:"absolute",top:8,left:8,width:8,height:8,borderRadius:"50%",background:T.gold,boxShadow:`0 0 8px ${T.gold}`}}/>}
                        <div style={{fontSize:26,marginBottom:6,textAlign:"center"}}>{d.icon}</div>
                        <div style={{fontWeight:800,fontSize:13,color:on?T.gold:T.t1,textAlign:"center",marginBottom:2}}>{d.l}</div>
                        <div style={{fontSize:9,color:T.t3,textAlign:"center",marginBottom:8}}>{d.d}</div>
                        <div style={{textAlign:"center",marginBottom:10}}>
                          <span style={{fontSize:18,fontWeight:900,color:on?T.gold:T.t2}}>{d.acc}</span>
                        </div>
                        <div style={{borderTop:`1px solid ${T.bd}`,paddingTop:8}}>
                          {d.pros.map(p=><div key={p} style={{fontSize:8,color:T.grn,marginBottom:2}}>✓ {p}</div>)}
                          {d.cons.map(c=><div key={c} style={{fontSize:8,color:T.t3,marginBottom:2}}>· {c}</div>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Accuracy Tips ── */}
              <div style={{background:D?"linear-gradient(135deg,#0a1a10,#0d2018)":"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:`1px solid ${D?"#1a4025":"#86efac"}`,borderRadius:12,padding:"12px 16px"}}>
                <div style={{fontSize:10,color:T.grn,fontWeight:800,marginBottom:8}}>💡 نصائح لرفع دقة الحصر</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {[
                    {i:"📐",t:"أضف مخططات PLN + PRF معاً","d":"يرفع دقة أطوال الأنابيب ~30%"},
                    {i:"🔬",t:"اختر وضع «بنية تحتية» في PDF","d":"يرفع دقة القراءة البصرية"},
                    {i:"📋",t:"أرفق جدول الغرف MH Schedule","d":"يُلغي الحاجة للاستنتاج"},
                    {i:"⚙️",t:"استخدم «عميق» للمشاريع الكبيرة","d":"تحقق تبادلي بين المخططات"},
                  ].map(tip=>(
                    <div key={tip.t} style={{display:"flex",gap:7,alignItems:"flex-start",background:D?"#0a2010":"#fff",padding:"8px 10px",borderRadius:8,border:`1px solid ${D?"#1a4025":"#bbf7d0"}`}}>
                      <span style={{fontSize:14}}>{tip.i}</span>
                      <div>
                        <div style={{fontSize:9,fontWeight:700,color:T.t1}}>{tip.t}</div>
                        <div style={{fontSize:8,color:T.t3,marginTop:1}}>{tip.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── حاسبة الحفر والأسفلت التفاعلية ── */}
              <EarthAsphaltCalc T={T} D={D}/>

              {/* ── Action Buttons ── */}
              <div style={{display:"flex",gap:8,paddingBottom:8}}>
                <button className="bg" style={{fontSize:15,padding:"13px 32px",borderRadius:12,fontWeight:900,flex:1,maxWidth:320}}
                  onClick={()=>{save(cfg,mods,depth);setTab("analysis");}}>
                  🚀 بدء التحليل
                </button>
                <button className="bg" style={{fontSize:13,padding:"13px 20px",borderRadius:12,background:"none",border:`2px solid ${T.bd}`,color:T.t2,fontWeight:700,boxShadow:"none"}}
                  onClick={()=>setTab("pdf")}>
                  📄 رفع PDF أولاً
                </button>
                <button className="bo" style={{fontSize:11,padding:"13px 16px",borderRadius:12,marginRight:"auto"}}
                  onClick={()=>{setMods({});setMsgs([]);setQueue([]);setPdfSess(null);setPdfQueue([]);setFe(null);setXStats(null);setCfg({authority:0,projectType:0,roleMode:0,zoneStr:0});setDepth("standard");}}>
                  🔄 إعادة ضبط
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ══ PDF ══ */}
        {tab==="pdf"&&(
          pdfSess?(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"12px 14px",gap:10}}>

              {/* ── شريط تقدم الرفع ── */}
              {Object.keys(uploadProgress).length>0&&(
                <div style={{background:D?"#0a1628":"#eff6ff",border:`1px solid ${D?"#1e3a5f":"#bfdbfe"}`,borderRadius:10,padding:"10px 14px",flexShrink:0}}>
                  <div style={{fontSize:10,color:"#2563eb",fontWeight:700,marginBottom:7}}>📤 جارٍ رفع الملفات...</div>
                  {Object.entries(uploadProgress).map(([name,pct])=>(
                    <div key={name} style={{marginBottom:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:9,color:T.t2}}>
                        <span style={{maxWidth:"80%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📄 {name}</span>
                        <span style={{color:"#2563eb",fontWeight:700}}>{pct}%</span>
                      </div>
                      <div className="prog"><div style={{height:"100%",background:"linear-gradient(90deg,#2563eb,#60a5fa)",width:`${pct}%`,borderRadius:4,transition:"width .3s"}}/></div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── قائمة الـ PDFs المحملة ── */}
              {pdfQueue.length>1&&(
                <div style={{background:T.bar,border:`1px solid ${T.bd}`,borderRadius:10,padding:"8px 12px",flexShrink:0}}>
                  <div style={{fontSize:9,color:T.t3,fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span>📂 الملفات المحملة ({pdfQueue.length})</span>
                    <div style={{display:"flex",gap:5}}>
                      <label style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:6,cursor:"pointer",border:`1px solid ${T.bd}`,color:T.t2,fontSize:8,background:D?"#1e293b":"#f8fafc"}}>
                        <span>+ ملفات</span>
                        <input type="file" accept=".pdf,image/*,.webp,.dwg,.dxf" multiple style={{display:"none"}} onChange={e=>handleBulkUpload(e.target.files)}/>
                      </label>
                      <label style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:6,cursor:"pointer",border:`1px solid ${T.gold}`,color:T.gold,fontSize:8,background:D?"#1c1404":"#fef9ec"}}>
                        <span>📂 فولدر</span>
                        <input type="file" multiple style={{display:"none"}} {...{webkitdirectory:"",directory:""}} onChange={e=>handleBulkUpload(e.target.files)}/>
                      </label>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {pdfQueue.map((pdf,i)=>{
                      const cls=pdf.classification;
                      return(
                        <div key={i} onClick={()=>{setActivePdf(i);setPdfSess(pdf);}}
                          style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,cursor:"pointer",
                            border:`2px solid ${activePdf===i?T.gold:(cls?.color||T.bd)}`,
                            background:activePdf===i?(D?"#1c1404":"#fef3c7"):T.bg3,
                            transition:"all .15s"}}>
                          <span style={{fontSize:10}}>{cls?.icon||"📄"}</span>
                          <div>
                            <div style={{fontSize:9,fontWeight:700,color:activePdf===i?T.gold:T.t1,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pdf.name}</div>
                            <div style={{fontSize:7,color:T.t3}}>{fmtN(pdf.numPages)}ص · {pdf.fileSizeMB||0}MB{cls?` · ${cls.ar}`:""}</div>
                          </div>
                          <div onClick={e=>{e.stopPropagation();setPdfQueue(q=>{const n=[...q];n.splice(i,1);if(n.length){setActivePdf(0);setPdfSess(n[0]);}else{setPdfSess(null);}return n;})}}
                            style={{fontSize:8,color:"#ef4444",cursor:"pointer",padding:"0 3px",borderRadius:3,background:"#fee2e220"}}>✕</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="card" style={{padding:"9px 14px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",flexShrink:0}}
                onDragOver={e=>{e.preventDefault();e.currentTarget.style.border=`1px solid ${T.gold}`;}}
                onDragLeave={e=>{e.currentTarget.style.border="";}}
                onDrop={e=>{e.preventDefault();e.currentTarget.style.border="";handleBulkUpload(e.dataTransfer.files);}}>
                <span style={{fontSize:13,color:T.gold,fontWeight:700}}>📄 {pdfSess.file?.name||pdfSess.name}</span>
                <span style={{fontSize:10,color:T.t3}}>· {fmtN(pdfSess.numPages)} صفحة{pdfSess.fileSizeMB?` · ${pdfSess.fileSizeMB}MB`:""}{pdfSess.classification?` · ${pdfSess.classification.icon} ${pdfSess.classification.ar}`:""}</span>
                <div style={{marginRight:"auto",display:"flex",gap:7,alignItems:"center"}}>
                  <label style={{display:"flex",alignItems:"center",gap:3,padding:"4px 10px",borderRadius:7,cursor:"pointer",border:`1px solid ${T.bd}`,color:T.t2,fontSize:9,background:D?"#1e293b":"#f8fafc"}}>
                    <span>📂 فولدر</span>
                    <input type="file" multiple style={{display:"none"}} {...{webkitdirectory:"",directory:""}} onChange={e=>handleBulkUpload(e.target.files)}/>
                  </label>
                  <button className="fe-btn" onClick={()=>runExtraction()} disabled={spLen===0}>
                    {pdfSess.quality==="fast"?"⚡":pdfSess.quality==="hybrid"?"🔀":pdfSess.quality==="infra"?"🏗️":"▶️"} {pdfSess.quality==="fast"?"استخراج سريع":pdfSess.quality==="hybrid"?"تحليل مدمج":pdfSess.quality==="infra"?"تحليل بنية تحتية":"تحليل بصري"} ({spLen}ص / {cks}د)
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
                      <div><div style={{fontSize:13,color:T.grn,fontWeight:900}}>Fast Extraction Engine v3</div>
                      <div style={{fontSize:9,color:T.t3}}>استخراج النص + كشف الكيانات الهندسية · أسرع 100×</div></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:xStats?10:0}}>
                      {[["⚡ السرعة","~0.08ث/صفحة"],["💾 الذاكرة","لا صور"],["🎯 الدقة","87–95%"]].map(([l,v])=>(
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
                  {/* لوحة شبكة الأنابيب — جديد v10 */}
                  {xStats&&<PipeNetworkPanel xStats={xStats} T={T} D={D}/>}
                  {/* لوحة الحفر والردم — جديد v11 */}
                  {xStats&&<EarthworksPanel xStats={xStats} T={T} D={D}/>}
                  {/* لوحة الاقتراحات الذكية — v11 */}
                  {xStats&&<SmartSuggestionsPanel xStats={xStats} T={T} D={D} msgs={msgs}/>}
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
                          {xStats.pipeNetwork?.length>0?(
                            <div>
                              <div style={{fontSize:8,color:T.t3,marginBottom:5}}>شبكة الأنابيب المكتشفة ({xStats.pipeNetwork.length} مواصفة):</div>
                              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                                {xStats.pipeNetwork.slice(0,14).map((p,i)=>(
                                  <span key={i} style={{background:p.color+"18",border:`1.5px solid ${p.color}50`,color:p.color,padding:"3px 9px",borderRadius:10,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",gap:3}}>
                                    <span style={{width:6,height:6,borderRadius:"50%",background:p.color,display:"inline-block"}}/>
                                    Ø{p.dia} <span style={{fontWeight:400,opacity:.8}}>{p.mat}</span>
                                  </span>
                                ))}
                                {xStats.pipeNetwork.length>14&&<span style={{fontSize:8,color:T.t3}}>+{xStats.pipeNetwork.length-14} أخرى</span>}
                              </div>
                            </div>
                          ):xStats.diameters?.length>0&&(
                            <div>
                              <div style={{fontSize:8,color:T.t3,marginBottom:3}}>أقطار مكتشفة (mm):</div>
                              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                                {xStats.diameters.slice(0,16).map(d=>(
                                  <span key={typeof d==="object"?d.dia:d} style={{background:D?"#0a1a30":"#dbeafe",border:"1px solid #bfdbfe",color:"#2563eb",padding:"2px 7px",borderRadius:9,fontSize:9,fontWeight:700}}>
                                    Ø{typeof d==="object"?d.dia:d}
                                  </span>
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
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:0,padding:24}}
              onDragOver={e=>{e.preventDefault();e.currentTarget.dataset.drag="1";e.currentTarget.style.background=D?"#0a1628":"#eff6ff";}}
              onDragLeave={e=>{e.currentTarget.style.background="";}}
              onDrop={e=>{e.preventDefault();e.currentTarget.style.background="";handleBulkUpload(e.dataTransfer.files);}}>

              {/* Upload progress bars */}
              {Object.keys(uploadProgress).length>0&&(
                <div style={{width:"100%",maxWidth:560,marginBottom:20,background:D?"#0a1628":"#eff6ff",border:`1px solid ${D?"#1e3a5f":"#bfdbfe"}`,borderRadius:12,padding:"12px 16px"}}>
                  <div style={{fontSize:11,color:"#2563eb",fontWeight:700,marginBottom:8}}>📤 جارٍ رفع الملفات...</div>
                  {Object.entries(uploadProgress).map(([name,pct])=>(
                    <div key={name} style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:T.t2,marginBottom:3}}>
                        <span style={{maxWidth:"82%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📄 {name}</span>
                        <span style={{color:"#2563eb",fontWeight:700}}>{pct}%</span>
                      </div>
                      <div style={{height:6,background:D?"#1e293b":"#e2e8f0",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",background:"linear-gradient(90deg,#2563eb,#60a5fa)",width:`${pct}%`,borderRadius:3,transition:"width .25s"}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop Zone */}
              <div style={{width:"100%",maxWidth:580,border:`2px dashed ${D?"#334155":"#cbd5e1"}`,borderRadius:20,padding:"36px 28px",textAlign:"center",cursor:"pointer",transition:"all .2s",background:D?"#0f172a":"#fafbfc"}}
                onClick={()=>fileRef.current?.click()}>
                <div style={{fontSize:60,marginBottom:14}}>📁</div>
                <div style={{fontSize:18,fontWeight:900,color:T.t1,marginBottom:8}}>اسحب ملفات PDF أو انقر للرفع</div>
                <div style={{fontSize:11,color:T.t3,marginBottom:20}}>يدعم رفع أكثر من ملف في آنٍ واحد · حتى 10,000 صفحة لكل ملف</div>
                <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:22}}>
                  {[{i:"📄",l:"PDF",c:"#dc2626"},{i:"🖼️",l:"PNG/JPG",c:"#2563eb"},{i:"📐",l:"DWG/DXF",c:T.grn}].map(f=>(
                    <div key={f.l} style={{padding:"10px 16px",borderRadius:10,border:`1px solid ${f.c}30`,background:f.c+"10",textAlign:"center",minWidth:72}}>
                      <div style={{fontSize:22}}>{f.i}</div>
                      <div style={{fontSize:9,color:f.c,fontWeight:700,marginTop:3}}>{f.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                  <button className="bg" style={{fontSize:13,padding:"10px 24px"}} onClick={e=>{e.stopPropagation();fileRef.current?.click();}}>
                    📄 اختيار ملفات
                  </button>
                  <button style={{fontSize:13,padding:"10px 24px",borderRadius:10,border:`2px solid ${T.gold}`,background:"none",color:T.gold,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}
                    onClick={e=>{e.stopPropagation();folderRef.current?.click();}}>
                    📂 رفع فولدر كامل
                  </button>
                </div>
              </div>

              {/* Hidden inputs */}
              <input ref={fileRef} type="file" accept=".pdf,image/*,.webp,.dwg,.dxf" multiple style={{display:"none"}}
                onChange={e=>handleBulkUpload(e.target.files)}/>
              <input ref={folderRef} type="file" multiple style={{display:"none"}}
                {...{webkitdirectory:"",directory:""}}
                onChange={e=>handleBulkUpload(e.target.files)}/>

              <div style={{marginTop:16,fontSize:10,color:T.t3,textAlign:"center",maxWidth:460,lineHeight:1.8}}>
                💡 <strong>رفع مجمّع:</strong> اختر عدة ملفات بـ Ctrl+A، أو اسحب مجلداً كاملاً<br/>
                سيقوم البرنامج بتصنيف الملفات تلقائياً بناءً على اسمها قبل الرفع
              </div>
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

      {showClassify&&classifyQueue&&(
        <ClassificationModal
          files={classifyQueue}
          onConfirm={handleClassifyConfirm}
          onCancel={()=>{setShowClassify(false);setClassifyQueue(null);}}
          T={T} D={D}
        />
      )}
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
