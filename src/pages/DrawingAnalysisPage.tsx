import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";

import {
  getTheme, buildCss,
  SAR_REF_2025, DRAW_TYPES, CFG_O, MODS_O, TMPL, QP,
  densityColor, densityLabel, fmtT, fmtN,
  detectDrawingType, extractPipeDiameters, extractPipeDetails, extractInvertLevels,
  buildProjectContext, detectScale,
  SYS_MAIN, SYS_VISUAL_INFRA, SYS_FAST, SYS_HYBRID, SYS_MERGE,
  extractPageData, renderThumb, renderPreview, renderPageImg,
  apiCall, parseRange, parseDWG,
  md, exportCSV, exportMD, exportJSON, exportTXT,
  exportPipeScheduleCSV, exportEarthworksCSV, exportAsphaltCSV,
  buildPipeNetwork, calcTrenchEarthworks, calcAsphalt, extractEarthworksData, extractAsphaltLayers,
  PdfNav, SmartSuggestions,
  PipeNetworkPanel, EarthworksPanel, AsphaltPanel,
  type ExtractedPage, type Suggestion,
} from "@/components/drawing-analysis";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT — ALIMTYAZ v11
// ═══════════════════════════════════════════════════════════════════════════
const DrawingAnalysisPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { theme: globalTheme } = useTheme();
  const darkMode = globalTheme === "dark";

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
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const [savedAnalyses, setSavedAnalyses] = useState<any[]>([]);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showExportToProject, setShowExportToProject] = useState(false);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [exportingToProject, setExportingToProject] = useState(false);
  const [batchFiles, setBatchFiles] = useState<{file:File;name:string;category:string;status:"pending"|"analyzing"|"done"|"error";result?:string}[]>([]);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [pipeNetwork, setPipeNetwork] = useState<any[]>([]);
  const [earthworksData, setEarthworksData] = useState<any>(null);
  const [asphaltData, setAsphaltData] = useState<any>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const totalTokens = useMemo(()=>msgs.reduce((s: number,m: any)=>s+(m.tokens||0),0),[msgs]);
  const boqCount = useMemo(()=>(msgs.filter((m: any)=>m.role==="assistant").map((m: any)=>m.content||"").join("\n").match(/KSA-[A-Z]{2,6}-/g)||[]).length,[msgs]);

  const pushMsg=(role: string,content: string,extra={})=>setMsgs(prev=>[...prev,{role,content,...extra}]);

  const selPages=useCallback((sess: any)=>{
    if(!sess)return [];
    if(sess.mode==="all")return Array.from({length:sess.numPages},(_,i)=>i+1);
    if(sess.mode==="custom")return sess.selPages;
    return parseRange(sess.rangeStr,sess.numPages);
  },[]);

  const suggestChunkSize = useCallback((densities: Record<number,number>, pages: number[]) => {
    if(!pages.length)return 20;
    const ds=pages.map(p=>densities[p]??0);
    const avg=ds.reduce((s,v)=>s+v,0)/ds.length;
    return avg>=2.5?5:avg>=1.5?10:20;
  },[]);

  // Smart suggestions
  const save = (c: any,m: any,d: string)=>{try{localStorage.setItem("alimtyaz_v11",JSON.stringify({cfg:c,mods:m,depth:d}));}catch{}};

  const configSuggestions = useMemo<Suggestion[]>(()=>{
    const s: Suggestion[] = [];
    if(pdfSess){
      const sp=selPages(pdfSess);
      const dens=Object.values(pdfSess.densities||{}) as number[];
      const avgDens=dens.length?dens.reduce((a: number,b: number)=>a+b,0)/dens.length:0;
      if(avgDens>=2&&pdfSess.quality==="fast"){
        s.push({id:"upgrade-quality",icon:"📊",type:"performance",text:"صفحات غنية بالبيانات — جرّب الوضع البصري القياسي لدقة أعلى.",actionLabel:"تغيير للقياسي",action:()=>setPdfSess((prev: any)=>({...prev,quality:"standard"})),priority:1});
      }
      if(sp.length>100&&pdfSess.quality!=="fast"){
        s.push({id:"too-many-pages",icon:"⚡",type:"performance",text:`${sp.length} صفحة — الوضع النصي السريع أنسب لهذا العدد.`,actionLabel:"تغيير للسريع",action:()=>setPdfSess((prev: any)=>({...prev,quality:"fast"})),priority:1});
      }
      const emptyPages=dens.filter(d=>d===0).length;
      if(emptyPages>sp.length*0.3){
        s.push({id:"many-empty",icon:"📄",type:"performance",text:`${emptyPages} صفحة فارغة — ألغِ تحديدها لتسريع التحليل.`,actionLabel:"إلغاء الفارغة",action:()=>{
          const nonEmpty=sp.filter((p: number)=>(pdfSess.densities[p]||0)>0);
          setPdfSess((prev: any)=>({...prev,selPages:nonEmpty,mode:"custom"}));
        },priority:2});
      }
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
    // v11: اقتراح تفعيل وحدة الحفر عند اكتشاف أنابيب
    if(xStats && (xStats.diameters?.length||0) > 0 && !earthworksData){
      s.push({id:"enable-earthworks",icon:"🛣️",type:"accuracy",text:"تم اكتشاف أنابيب — فعّل وحدة الحفر والردم لحساب أحجام الخنادق تلقائياً.",actionLabel:"حساب الحفر",action:()=>{
        if(infraMeta?.extractedData){
          const allText = Object.values(infraMeta.extractedData).map((d:any)=>d.text||"").join("\n");
          const ewData = extractEarthworksData(allText);
          if(ewData) setEarthworksData(ewData);
        }
        setTab("earthworks");
      },priority:2});
    }
    // v11: اقتراح تفعيل قالب الأسفلت عند اكتشاف ROAD
    if(xStats?.typeCount?.ROAD && !asphaltData){
      s.push({id:"enable-asphalt",icon:"🛤️",type:"accuracy",text:"تم اكتشاف مخططات طرق — فعّل قالب الأسفلت لحساب طبقات الرصف.",actionLabel:"حساب الأسفلت",action:()=>{
        if(infraMeta?.extractedData){
          const allText = Object.values(infraMeta.extractedData).map((d:any)=>d.text||"").join("\n");
          const aspData = extractAsphaltLayers(allText);
          if(aspData) setAsphaltData(aspData);
        }
        setTab("asphalt");
      },priority:2});
    }
    return s;
  },[pdfSess,xStats,depth,ocr,mods,cfg]);

  const analysisSuggestions = useMemo<Suggestion[]>(()=>{
    const s: Suggestion[] = [];
    const errorChunks = feState?.chunks?.filter((c:any)=>c.status==="error") || [];
    if(errorChunks.length > 0){
      s.push({id:"error-chunks",icon:"🔄",type:"accuracy",text:`${errorChunks.length} دُفعة فشلت — أعد التحليل للحصول على نتائج كاملة.`,actionLabel:"إعادة التحليل",action:()=>{if(pdfSess)runExtraction();},priority:1});
    }
    const assistantMsgs = msgs.filter((m:any)=>m.role==="assistant"&&m.isChunk);
    const hasMerged = msgs.some((m:any)=>m.isMerged);
    if(assistantMsgs.length > 1 && !hasMerged && feState?.phase==="done"){
      s.push({id:"no-merge",icon:"🔗",type:"accuracy",text:`${assistantMsgs.length} دُفعة بدون دمج — ادمج النتائج للحصول على BOQ موحد.`,actionLabel:"إعادة الدمج",action:()=>{if(pdfSess)runExtraction();},priority:1});
    }
    if(!ocr && pdfSess && feState?.phase==="done"){
      s.push({id:"suggest-ocr-analysis",icon:"🔤",type:"accuracy",text:"فعّل OCR وأعد التحليل لاستخراج الأبعاد والمناسيب من المخططات البصرية.",actionLabel:"تفعيل OCR",action:()=>setOcr(true),priority:3});
    }
    if(depth==="quick" && feState?.phase==="done" && msgs.length > 0){
      s.push({id:"upgrade-depth",icon:"🔬",type:"accuracy",text:"حلّلت بعمق سريع — أعد التحليل بالعمق القياسي أو العميق لنتائج أدق.",actionLabel:"رفع العمق",action:()=>{setDepth("standard");save(cfg,mods,"standard");},priority:2});
    }
    if(pdfSess && selPages(pdfSess).length === 0){
      s.push({id:"no-pages",icon:"📌",type:"performance",text:"لم يتم اختيار صفحات للتحليل — اذهب لمدير PDF واختر الصفحات.",actionLabel:"فتح مدير PDF",action:()=>setTab("pdf"),priority:1});
    }
    // v11: اقتراح استخدام قالب مواسير تفصيلي
    if(pipeNetwork.length > 0 && feState?.phase==="done"){
      s.push({id:"pipe-detail-tmpl",icon:"🔧",type:"accuracy",text:`شبكة أنابيب ${pipeNetwork.length} قطر — استعرض لوحة شبكة المواسير للتفاصيل.`,actionLabel:"عرض المواسير",action:()=>setTab("pipes"),priority:2});
    }
    // v11: حساب الحفر تلقائياً
    if(infraMeta && !earthworksData && feState?.phase==="done"){
      s.push({id:"calc-earthworks",icon:"🛣️",type:"accuracy",text:"بيانات حفر متاحة — احسب الحفر والردم تلقائياً.",actionLabel:"حساب",action:()=>{
        const allText = Object.values(infraMeta.extractedData||{}).map((d:any)=>d.text||"").join("\n");
        const ewData = extractEarthworksData(allText);
        if(ewData) setEarthworksData(ewData);
        setTab("earthworks");
      },priority:2});
    }
    // v11: حساب الأسفلت تلقائياً
    if(infraMeta?.typeCount?.ROAD && !asphaltData && feState?.phase==="done"){
      s.push({id:"calc-asphalt",icon:"🛤️",type:"accuracy",text:"بيانات طرق متاحة — احسب طبقات الأسفلت تلقائياً.",actionLabel:"حساب",action:()=>{
        const allText = Object.values(infraMeta.extractedData||{}).map((d:any)=>d.text||"").join("\n");
        const aspData = extractAsphaltLayers(allText);
        if(aspData) setAsphaltData(aspData);
        setTab("asphalt");
      },priority:2});
    }
    // v11: حفظ التحليل بعد الاكتمال
    if(feState?.phase==="done" && msgs.length > 2 && user){
      s.push({id:"save-analysis",icon:"💾",type:"performance",text:"اكتمل التحليل — احفظ النتائج لمقارنتها لاحقاً.",actionLabel:"حفظ",action:()=>{
        const allText = msgs.filter((m:any)=>m.role==="assistant").map((m:any)=>m.content||"").join("\n");
        supabase.from("drawing_analyses").insert({
          user_id: user.id, drawing_type: Object.keys(xStats?.typeCount||{})[0]||"PLAN",
          file_names: pdfSess?[pdfSess.file?.name]:[],
          results: {text:allText.slice(0,5000)}, summary: {boq_count:boqCount,pipe_count:pipeNetwork.length}
        });
      },priority:3});
    }
    return s;
  },[feState,msgs,ocr,depth,pdfSess,cfg,mods,pipeNetwork,earthworksData,asphaltData,infraMeta,user,boqCount,xStats]);

  const cancelRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const analysisCompleteResolve = useRef<(() => void) | null>(null);
  let fname = "BOQ";

  // Persistence
  useEffect(()=>{
    try {
      const r=localStorage.getItem("alimtyaz_v11") || localStorage.getItem("alimtyaz_v9");
      if(r){const s=JSON.parse(r);if(s.cfg)setCfg(s.cfg);if(s.mods)setMods(s.mods);if(s.depth)setDepth(s.depth);}
      const rr=localStorage.getItem("alimtyaz_v11_batch") || localStorage.getItem("alimtyaz_v9_batch");
      if(rr){const b=JSON.parse(rr);if(b.partialResults?.length>0)setResumable(b);}
    }catch{}
  },[]);
  const saveBatch=(b: any)=>{try{localStorage.setItem("alimtyaz_v11_batch",JSON.stringify(b));}catch{}};
  const clearBatch=()=>{try{localStorage.removeItem("alimtyaz_v11_batch");}catch{}};

  const fetchSavedAnalyses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("drawing_analyses").select("id,created_at,drawing_type,file_names,summary,results").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (data) setSavedAnalyses(data);
  }, [user]);

  useEffect(() => { if (user && tab === "history") fetchSavedAnalyses(); }, [user, tab, fetchSavedAnalyses]);

  // v11: Auto-compute pipe network, earthworks, asphalt when extraction completes
  useEffect(()=>{
    if(feState?.phase==="done" && infraMeta?.extractedData){
      const data = infraMeta.extractedData;
      // Build pipe network
      const network = buildPipeNetwork(data);
      if(network.length > 0) setPipeNetwork(network);
      // Extract earthworks
      const allText = Object.values(data).map((d:any)=>d.text||"").join("\n");
      const ewData = extractEarthworksData(allText);
      if(ewData && (ewData.depths?.length > 0 || ewData.rockRatio > 0)) setEarthworksData(ewData);
      // Extract asphalt
      const aspData = extractAsphaltLayers(allText);
      if(aspData && (aspData.wearing > 0 || aspData.roadWidths?.length > 0)) setAsphaltData(aspData);
    }
  },[feState?.phase, infraMeta]);

  const fetchSavedProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("saved_projects").select("id,name,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (data) setSavedProjects(data);
  }, [user]);

  useEffect(() => { if (showExportToProject) fetchSavedProjects(); }, [showExportToProject, fetchSavedProjects]);

  const exportToProject = useCallback(async (projectId: string) => {
    if (!user || !msgs.length) return;
    setExportingToProject(true);
    try {
      const allText = msgs.filter((m: any) => m.role === "assistant").map((m: any) => m.content || "").join("\n");
      const rows = allText.split("\n").filter(l => l.includes("|") && !l.match(/^[\|\-\s:]+$/) && /KSA-|SAR|ريال|م[²³]|عدد|طن/i.test(l));
      const items: any[] = [];
      rows.forEach((row, idx) => {
        const cells = row.split("|").map(c => c.trim()).filter(Boolean);
        if (cells.length >= 4) {
          const desc = cells.find(c => c.length > 10 && !/^\d/.test(c)) || cells[1] || "";
          const unit = cells.find(c => /^(م[²³]|م\.ط|عدد|طن|كجم|لتر|m[²³]|m\.l|no|ton|kg|ls|set|ea|pcs)$/i.test(c)) || cells[3] || "";
          const qty = parseFloat((cells.find(c => /^\d+[.,]?\d*$/.test(c) && parseFloat(c) < 999999) || "0").replace(",", "."));
          const price = parseFloat((cells.find(c => /^\d+[.,]?\d*$/.test(c) && parseFloat(c) >= 10) || "0").replace(",", "."));
          const code = (cells.find(c => /^KSA-/.test(c)) || "").trim();
          if (desc.length > 3) {
            items.push({
              project_id: projectId, item_number: code || String(idx + 1), description: desc, unit, quantity: qty || 0,
              unit_price: price || null, total_price: (qty && price) ? qty * price : null, sort_order: idx,
              category: code.includes("EARTH") ? "Earthworks" : code.includes("SEWER") ? "Sewer" : code.includes("WATER") ? "Water" : code.includes("ROAD") ? "Roads" : null,
            });
          }
        }
      });
      if (items.length === 0) { alert("لم يتم العثور على بنود BOQ قابلة للتصدير"); return; }
      const { data: pdExists } = await supabase.from("project_data").select("id").eq("id", projectId).maybeSingle();
      if (!pdExists) {
        const proj = savedProjects.find(p => p.id === projectId);
        await supabase.from("project_data").insert({ id: projectId, user_id: user.id, name: proj?.name || "Project", file_name: "", analysis_data: {} });
      }
      const { error } = await supabase.from("project_items").insert(items);
      if (error) throw error;
      setShowExportToProject(false);
      alert(`✅ تم تصدير ${items.length} بند BOQ إلى المشروع بنجاح`);
    } catch (err: any) { alert(`❌ خطأ: ${err.message}`); }
    finally { setExportingToProject(false); }
  }, [user, msgs, savedProjects]);

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

  const classifyFile = useCallback((name: string): string => {
    const n = name.toLowerCase();
    if (/plan|مسقط|layout|general|key.*plan|site/i.test(n)) return "PLAN";
    if (/profile|طولي|longitudinal/i.test(n)) return "PROFILE";
    if (/section|عرضي|cross|typical/i.test(n)) return "SECTION";
    if (/detail|تفصيل/i.test(n)) return "DETAIL";
    if (/boq|كمي|bill|quantity|pricing/i.test(n)) return "BOQ";
    if (/spec|مواصفات/i.test(n)) return "SPEC";
    if (/struct|إنشائي|reinforce/i.test(n)) return "STRUCT";
    if (/road|طريق|أسفلت|pavement/i.test(n)) return "ROAD";
    return "PLAN";
  }, []);

  const handleFiles=useCallback(async(files: FileList | null)=>{
    const allFiles = Array.from(files||[]);
    const pdfFiles = allFiles.filter(f => f.type==="application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    const otherFiles = allFiles.filter(f => !pdfFiles.includes(f));

    for(const file of otherFiles){
      const n=file.name.toLowerCase();
      if(file.type.startsWith("image/")||n.endsWith(".webp")||n.endsWith(".avif")){
        const reader=new FileReader();
        reader.onload=e=>{setQueue(prev=>[...prev,{src:e.target!.result,b64:(e.target!.result as string).split(",")[1],mime:file.type||"image/jpeg",name:file.name,type:"image"}]);};
        reader.readAsDataURL(file);
        setTab("analysis");
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

    if(pdfFiles.length === 1){
      const file = pdfFiles[0];
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
    } else if(pdfFiles.length > 1){
      const newBatch = pdfFiles.map(f => ({ file: f, name: f.name, category: classifyFile(f.name), status: "pending" as const }));
      setBatchFiles(prev => [...prev, ...newBatch]);
      setTab("pdf");
    }
  },[loadThumbs, classifyFile]);

  const handleBatchFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files)
      .filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
      .map(f => ({ file: f, name: f.name, category: classifyFile(f.name), status: "pending" as const }));
    if (newFiles.length === 0) return;
    setBatchFiles(prev => [...prev, ...newFiles]);
    setTab("pdf");
  }, [classifyFile]);

  // ═══ ANALYSIS ENGINE v9 ═══
  const runExtraction=useCallback(async(resumeFrom: any=null, sessionOverride?: any)=>{
    const sess = sessionOverride || pdfSess;
    if(!sess){ if(analysisCompleteResolve.current){analysisCompleteResolve.current();analysisCompleteResolve.current=null;} return; }
    const pages=selPages(sess);
    if(!pages.length){ if(analysisCompleteResolve.current){analysisCompleteResolve.current();analysisCompleteResolve.current=null;} return; }
    const{doc,chunkSize,quality,file}=sess;
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
        total:pages.length,empty:vals.filter(v=>v===0).length,low:vals.filter(v=>v===1).length,
        medium:vals.filter(v=>v===2).length,rich:vals.filter(v=>v>=3).length,
        avgDensity:vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:0,
        totalChars:Object.values(extractedData).reduce((s,d)=>s+(d.charCount||0),0),
        totalTables:Object.values(extractedData).reduce((s,d)=>s+(d.tableCount||0),0),
        typeCount, topTypes,diameters:[...allDiams].sort((a,b)=>a-b),scales:[...allScales],
      };
      setXStats(stats);
      setPdfSess((prev: any)=>prev ? ({...prev,densities:densMap}) : prev);
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

      if(!content.length||cancelRef.current){ return {chunk:chunkLabel,reply:"⏭ تخطي",tokens:0,ci}; }

      try{
        const infoStr=`صفحات:${chunkLabel}|دُفعة:${ci+1}/${chunks.length}|ملف:${file.name}`;
        let sysP: string;
        if(isHybrid) sysP=SYS_HYBRID(cs,infoStr,chunkDrawTypes,projectCtx);
        else if(isFast) sysP=SYS_FAST(cs,infoStr,chunkDrawTypes,chunkScales,projectCtx);
        else sysP=SYS_VISUAL_INFRA(cs,chunkLabel,chunkDrawTypes,chunkScales[0]||null,projectCtx);

        const data=await apiCall({
          max_tokens:depth==="deep"?8000:quality==="infra"||quality==="high"?7000:5000,
          system:sysP,messages:[{role:"user",content}],
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

    if(cancelRef.current){
      setFe((p: any)=>({...p,phase:"done",stage:"⏹ تم الإيقاف"}));
      if(analysisCompleteResolve.current){analysisCompleteResolve.current();analysisCompleteResolve.current=null;}
      return;
    }

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
    if(analysisCompleteResolve.current){ analysisCompleteResolve.current(); analysisCompleteResolve.current = null; }
  },[pdfSess,selPages,cfgStr,depth]);

  const runBatchAnalysis = useCallback(async () => {
    if (batchFiles.length === 0) return;
    setBatchAnalyzing(true);
    setBatchProgress(0);
    for (let i = 0; i < batchFiles.length; i++) {
      if (batchFiles[i].status === "done") continue;
      setBatchFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: "analyzing" } : f));
      try {
        const buf = await batchFiles[i].file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        const numPages = doc.numPages;
        fname = batchFiles[i].name.replace(/\.pdf$/i, "");
        pushMsg("assistant", `\n---\n## 📁 ملف ${i+1}/${batchFiles.length}: ${batchFiles[i].name} (${numPages} صفحة)\n---`);
        const sess = {
          file: batchFiles[i].file, doc, numPages,
          thumbs: {} as Record<number,string>, thumbsLoaded: new Set<number>(),
          mode: "range" as string, rangeStr: `1-${Math.min(numPages, 100)}`,
          selPages: [] as number[], chunkSize: 20, quality: "fast" as string, densities: {} as Record<number,number>
        };
        setPdfSess(sess);
        const analysisPromise = new Promise<void>(resolve => { analysisCompleteResolve.current = resolve; });
        await new Promise(r => setTimeout(r, 150));
        await runExtraction(null, sess);
        await analysisPromise;
        setBatchFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: "done" } : f));
      } catch (err: any) {
        setBatchFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: "error", result: err.message } : f));
        if(analysisCompleteResolve.current){ analysisCompleteResolve.current(); analysisCompleteResolve.current = null; }
      }
      setBatchProgress(Math.round(((i + 1) / batchFiles.length) * 100));
    }
    setBatchAnalyzing(false);
    pushMsg("assistant", `\n---\n## ✅ اكتمل تحليل ${batchFiles.length} ملف بنجاح\n---`);
  }, [batchFiles, runExtraction]);

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

  // Theme — synced with global useTheme
  const D = darkMode;
  const T = useMemo(() => getTheme(D), [D]);
  const css = useMemo(() => buildCss(T, D), [T, D]);

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
              <div style={{fontSize:7.5,color:T.t3}}>v11 · محرك هندسي سعودي</div>
            </div>}
          </div>
          <div style={{flex:1,padding:"10px 7px",overflowY:"auto"}}>
            {[{id:"analysis",i:"💬",l:"التحليل"},{id:"pdf",i:"📄",l:"مدير PDF"},{id:"config",i:"⚙️",l:"الإعداد"},{id:"history",i:"📊",l:"مقارنة التحليلات"}].map(n=>(
              <div key={n.id} className={`nav-i ${tab===n.id?"act":""}`} onClick={()=>setTab(n.id)} style={{justifyContent:sideOpen?"flex-start":"center"}}>
                <span style={{fontSize:16,flexShrink:0}}>{n.i}</span>
                {sideOpen&&<span>{n.l}</span>}
                {n.id==="pdf"&&pdfSess&&sideOpen&&<span style={{marginRight:"auto",fontSize:8,background:D?"#2a1a08":"#FFF5F0",color:T.gold,padding:"1px 7px",borderRadius:9,fontWeight:700}}>{fmtN(pdfSess.numPages)}</span>}
              </div>
            ))}
            {sideOpen&&<div style={{borderTop:`1px solid ${T.bd}`,marginTop:8,paddingTop:8}}>
              <div style={{fontSize:9,color:T.t3,marginBottom:5,fontWeight:700,padding:"0 4px"}}>🛠️ الأدوات</div>
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
              {boqCount>0&&<button className="bo" style={{fontSize:9,padding:"3px 9px",borderColor:T.grn,color:T.grn}} onClick={()=>setShowExportToProject(true)} title="تصدير لمشروع">📤 تصدير لمشروع</button>}
            </>}
          </div>

          {/* EXPORT TO PROJECT DIALOG */}
          {showExportToProject&&(
            <div style={{position:"fixed",inset:0,background:"#000000a0",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowExportToProject(false)}>
              <div className="card" style={{maxWidth:480,width:"100%",maxHeight:"70vh",overflow:"auto",padding:0}} onClick={(e:any)=>e.stopPropagation()}>
                <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,fontWeight:700,color:T.gold}}>📤 تصدير بنود BOQ إلى مشروع</span>
                  <button onClick={()=>setShowExportToProject(false)} style={{background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:18}}>✕</button>
                </div>
                <div style={{padding:"14px 18px"}}>
                  <div style={{fontSize:10,color:T.t3,marginBottom:10}}>اختر المشروع لتصدير {boqCount} بند BOQ إليه:</div>
                  {savedProjects.length===0?<div style={{textAlign:"center",padding:20,color:T.t3,fontSize:11}}>لا توجد مشاريع محفوظة</div>:
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {savedProjects.map((p:any)=>(
                      <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:9,border:`1px solid ${T.bd}`,background:T.bg3,cursor:"pointer",transition:"all .15s"}}
                        onClick={()=>!exportingToProject&&exportToProject(p.id)}
                        onMouseOver={e=>(e.currentTarget.style.borderColor=T.gold)}
                        onMouseOut={e=>(e.currentTarget.style.borderColor=T.bd)}>
                        <span style={{fontSize:14}}>📁</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:600,color:T.t1}}>{p.name}</div>
                          <div style={{fontSize:8,color:T.t3}}>{new Date(p.created_at).toLocaleDateString("ar-SA")}</div>
                        </div>
                        {exportingToProject?<div style={{width:14,height:14,border:`2px solid ${T.gold}`,borderTopColor:"transparent",borderRadius:"50%",animation:"alim-spin .8s linear infinite"}}/>:
                        <span style={{fontSize:9,color:T.grn,fontWeight:700}}>تصدير ←</span>}
                      </div>
                    ))}
                  </div>}
                </div>
              </div>
            </div>
          )}

          {/* CONFIG TAB */}
          {tab==="config"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 16px"}}>
              <div style={{maxWidth:820,margin:"0 auto"}}>
                <div style={{marginBottom:16}}>
                  <span style={{background:D?"#2a1a08":"#FFF5F0",color:T.gold,border:`1px solid ${T.gold}40`,padding:"3px 12px",borderRadius:9,fontSize:10,fontWeight:700}}>تهيئة المنظومة</span>
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
                      <select className="sel" value={cfg[key]} onChange={e=>{const v=+e.target.value;setCfg(p=>({...p,[key]:v}));save({...cfg,[key]:v},mods,depth);}}>
                        {opts.map((o,i)=><option key={i} value={i}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="card" style={{padding:12,marginBottom:10}}>
                  <div style={{fontSize:10,color:T.t3,marginBottom:8,fontWeight:600}}>5️⃣ وحدات التحليل</div>
                  {Object.entries(MODS_O).map(([cat,ms])=>(
                    <div key={cat} style={{marginBottom:7}}>
                      <div style={{fontSize:10,color:T.gold,fontWeight:700,marginBottom:4}}>{cat}</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {ms.map(m=>{const k=`${cat}_${m}`;return(
                          <span key={k} className={`fchip ${mods[k]?"on":""}`} onClick={()=>{const v={...mods,[k]:!mods[k]};setMods(v);save(cfg,v,depth);}}>{m}</span>
                        );})}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{padding:12,marginBottom:10}}>
                  <div style={{fontSize:10,color:T.t3,marginBottom:8,fontWeight:600}}>6️⃣ عمق التحليل</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {[{v:"quick",l:"⚡ سريع",d:"70%"},{v:"standard",l:"📊 قياسي",d:"85%"},{v:"deep",l:"🔬 عميق",d:"95%"}].map(o=>(
                      <div key={o.v} className={`db ${depth===o.v?"on":""}`} onClick={()=>{setDepth(o.v);save(cfg,mods,o.v);}}>
                        <div style={{fontSize:12,marginBottom:2}}>{o.l}</div>
                        <div style={{fontSize:8,opacity:.7}}>دقة {o.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <SmartSuggestions suggestions={configSuggestions} T={T} D={D} context="config"/>
                {xStats&&(
                  <div className="card" style={{padding:12}}>
                    <div style={{fontSize:10,color:T.gold,fontWeight:700,marginBottom:8}}>📊 إحصائيات الاستخراج</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                      {[["📄 الصفحات",`${xStats.total}`],["🔥 غنية",`${xStats.rich}`],["📊 متوسطة",`${xStats.medium}`],["⬜ فارغة",`${xStats.empty}`],
                        ["📝 أحرف",fmtN(xStats.totalChars)],["📊 جداول",`${xStats.totalTables}`],
                        ["🔩 أقطار",`${xStats.diameters?.length||0}`],["📏 مقاييس",`${xStats.scales?.length||0}`]
                      ].map(([k,v])=>(
                        <div key={k} style={{background:T.bg3,padding:"5px 8px",borderRadius:7,border:`1px solid ${T.bd}`}}>
                          <div style={{fontSize:7,color:T.t3}}>{k}</div>
                          <div style={{fontSize:11,fontWeight:600,color:T.t1}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {xStats.topTypes?.length>0&&<div style={{marginTop:6,fontSize:9,color:T.t2}}>📐 الأنواع: {xStats.topTypes.join(" | ")}</div>}
                    {xStats.diameters?.length>0&&<div style={{marginTop:3,fontSize:9,color:T.t2}}>🔩 الأقطار: {xStats.diameters.join(", ")}mm</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PDF TAB */}
          {tab==="pdf"&&(
            pdfSess?(
              <div style={{flex:1,display:"flex",overflow:"hidden"}}>
                <div style={{width:150,borderLeft:`1px solid ${T.bd}`,overflow:"hidden",flexShrink:0}}>
                  <PdfNav sess={pdfSess} T={T} selPages={selPages} setPdfSess={setPdfSess} loadThumbs={loadThumbs} openPreview={openPreview}/>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
                  <div style={{maxWidth:720,margin:"0 auto"}}>
                    <div style={{marginBottom:12}}>
                      <span style={{background:D?"#2a1a08":"#FFF5F0",color:T.gold,border:`1px solid ${T.gold}40`,padding:"3px 12px",borderRadius:9,fontSize:10,fontWeight:700}}>مدير PDF</span>
                      <h2 style={{margin:"8px 0 4px",fontSize:18,fontWeight:900}}>{pdfSess.file?.name}</h2>
                    </div>
                    <div className="card" style={{padding:12,marginBottom:10}}>
                      <div style={{fontSize:10,color:T.t3,marginBottom:6,fontWeight:600}}>📄 اختيار الصفحات</div>
                      <div style={{display:"flex",gap:5,marginBottom:6}}>
                        {[{v:"range",l:"نطاق"},{v:"all",l:"الكل"},{v:"custom",l:"يدوي"}].map(o=>(
                          <span key={o.v} className={`chip ${pdfSess.mode===o.v?"on":""}`} onClick={()=>setPdfSess((p: any)=>({...p,mode:o.v}))}>{o.l}</span>
                        ))}
                      </div>
                      {pdfSess.mode==="range"&&<input className="sinp" style={{width:"100%"}} value={pdfSess.rangeStr} onChange={e=>setPdfSess((p: any)=>({...p,rangeStr:e.target.value}))} placeholder="مثال: 1-10,15,20-30"/>}
                    </div>
                    <div className="card" style={{padding:12,marginBottom:10}}>
                      <div style={{fontSize:10,color:T.t3,marginBottom:6,fontWeight:600}}>🎯 نوع التحليل</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                        {Object.entries(QP).map(([k,v])=>(
                          <div key={k} className={`db ${pdfSess.quality===k?"on":""}`} onClick={()=>setPdfSess((p: any)=>({...p,quality:k}))}>
                            <div style={{fontSize:10,marginBottom:2}}>{v.label}</div>
                            <div style={{fontSize:7,opacity:.7}}>{v.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="card" style={{padding:12,marginBottom:10}}>
                      <div style={{fontSize:10,color:T.t3,marginBottom:6,fontWeight:600}}>📦 حجم الدُفعة</div>
                      <div style={{display:"flex",gap:5,alignItems:"center"}}>
                        <input type="range" min="1" max="50" value={pdfSess.chunkSize} onChange={e=>setPdfSess((p: any)=>({...p,chunkSize:+e.target.value}))} style={{flex:1}}/>
                        <span style={{fontSize:11,fontWeight:700,color:T.gold,minWidth:24,textAlign:"center"}}>{pdfSess.chunkSize}</span>
                        <span style={{fontSize:8,color:T.t3}}>ص/دُفعة</span>
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
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:20}}>
                <div style={{fontSize:48}}>📄</div>
                <div style={{fontSize:14,color:T.t3}}>لا يوجد ملف PDF محمّل</div>
                <div style={{display:"flex",gap:8}}>
                  <button className="bg-btn" onClick={()=>fileRef.current?.click()}>📄 رفع ملف PDF</button>
                  <button className="bo" style={{fontSize:12,padding:"9px 18px"}} onClick={()=>folderRef.current?.click()}>📁 رفع مجلد</button>
                </div>
                <input ref={fileRef} type="file" accept=".pdf" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
                <input ref={folderRef} type="file" accept=".pdf" multiple style={{display:"none"}} {...{webkitdirectory:"",directory:""} as any} onChange={e=>handleBatchFiles(e.target.files)}/>
                {batchFiles.length > 0 && (
                  <div className="card" style={{width:"100%",maxWidth:700,padding:14}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <span style={{fontSize:12,fontWeight:700,color:T.gold}}>📂 ملفات مجمعة ({batchFiles.length})</span>
                      <div style={{display:"flex",gap:6}}>
                        <button className="fe-btn" style={{fontSize:10,padding:"5px 14px"}} onClick={runBatchAnalysis} disabled={batchAnalyzing}>
                          {batchAnalyzing?"⏳ جاري...":"▶️ تحليل الكل"}
                        </button>
                        <button className="bo" style={{fontSize:9}} onClick={()=>setBatchFiles([])}>🗑️ مسح</button>
                      </div>
                    </div>
                    {batchAnalyzing && <div className="prog" style={{marginBottom:8}}><div className="prog-f" style={{background:`linear-gradient(90deg,${T.grn},#4ade80)`,width:`${batchProgress}%`}}/></div>}
                    <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:300,overflowY:"auto"}}>
                      {batchFiles.map((bf, i) => (
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,border:`1px solid ${T.bd}`,background:bf.status==="done"?(D?"#064e3b20":"#dcfce720"):bf.status==="error"?(D?"#450a0a20":"#fee2e220"):T.bg3}}>
                          <span style={{fontSize:14}}>{bf.status==="done"?"✅":bf.status==="error"?"❌":bf.status==="analyzing"?"⏳":"📄"}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:10,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bf.name}</div>
                            <div style={{fontSize:8,color:T.t3}}>{(bf.file.size / 1024).toFixed(0)} KB</div>
                          </div>
                          <select value={bf.category} onChange={e=>setBatchFiles(prev=>prev.map((f,idx)=>idx===i?{...f,category:e.target.value}:f))}
                            style={{background:T.bg3,border:`1px solid ${T.bd}`,color:DRAW_TYPES[bf.category]?.color||T.t2,padding:"3px 8px",borderRadius:6,fontSize:9,fontWeight:700,fontFamily:"inherit"}}>
                            {Object.entries(DRAW_TYPES).map(([k,v])=><option key={k} value={k}>{v.ar}</option>)}
                          </select>
                          <button onClick={()=>setBatchFiles(prev=>prev.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:12}}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* HISTORY TAB */}
          {tab==="history"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 16px"}}>
              <div style={{maxWidth:900,margin:"0 auto"}}>
                <div style={{marginBottom:16}}>
                  <span style={{background:D?"#2a1a08":"#FFF5F0",color:T.gold,border:`1px solid ${T.gold}40`,padding:"3px 12px",borderRadius:9,fontSize:10,fontWeight:700}}>مقارنة التحليلات</span>
                  <h2 style={{margin:"8px 0 4px",fontSize:20,fontWeight:900}}>تتبع <span className="g">تحسن الدقة</span></h2>
                  <div style={{fontSize:10,color:T.t3,marginTop:4}}>اختر تحليلين أو أكثر لمقارنة نتائجهما</div>
                </div>
                {compareIds.size>=2&&(
                  <div style={{background:D?"linear-gradient(135deg,#1a0e02,#201204)":"linear-gradient(135deg,#FFF5F0,#FFE8DB)",border:`1px solid ${D?"#854d0e40":"#FFE8DB"}`,borderRadius:12,padding:16,marginBottom:16}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.gold,marginBottom:12}}>📊 مقارنة {compareIds.size} تحليل</div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead><tr>
                          <th style={{background:D?"#0a1f10":"#f0fdf4",color:T.gold,padding:"8px 12px",textAlign:"right",border:`1px solid ${T.bd}`,fontWeight:700}}>البيان</th>
                          {savedAnalyses.filter(a=>compareIds.has(a.id)).map((a,i)=>(
                            <th key={a.id} style={{background:D?"#0a1f10":"#f0fdf4",color:T.gold,padding:"8px 12px",textAlign:"center",border:`1px solid ${T.bd}`,fontWeight:700,minWidth:130}}>
                              تحليل {i+1}<br/><span style={{fontSize:8,color:T.t3,fontWeight:400}}>{new Date(a.created_at).toLocaleDateString("ar-SA")}</span>
                            </th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {[
                            {l:"📄 الملفات",k:"files",fn:(a:any)=>(a.file_names||[]).join(", ")||"-"},
                            {l:"🏷️ نوع التحليل",k:"type",fn:(a:any)=>DRAW_TYPES[a.drawing_type]?.ar||a.drawing_type||"-"},
                            {l:"📊 عدد النتائج",k:"results",fn:(a:any)=>{const r=a.results;return Array.isArray(r)?r.length:typeof r==="object"?Object.keys(r).length:"-"}},
                            {l:"💰 إجمالي التكلفة",k:"cost",fn:(a:any)=>{const s=a.summary as any;return s?.total_cost?`${Number(s.total_cost).toLocaleString()} SAR`:"-"}},
                            {l:"📐 عدد بنود BOQ",k:"boq",fn:(a:any)=>{const s=a.summary as any;return s?.boq_count||s?.items_count||"-"}},
                            {l:"⚠️ مستوى المخاطر",k:"risk",fn:(a:any)=>{const s=a.summary as any;return s?.risk_level||"-"}},
                          ].map(row=>(
                            <tr key={row.k}>
                              <td style={{padding:"7px 12px",border:`1px solid ${T.bd}`,fontWeight:600,color:T.t2}}>{row.l}</td>
                              {savedAnalyses.filter(a=>compareIds.has(a.id)).map(a=>(
                                <td key={a.id} style={{padding:"7px 12px",border:`1px solid ${T.bd}`,textAlign:"center",color:T.t1}}>{row.fn(a)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {savedAnalyses.length===0?<div style={{textAlign:"center",padding:40,color:T.t3}}><div style={{fontSize:40,marginBottom:10}}>📊</div><div style={{fontSize:12}}>لا توجد تحليلات محفوظة بعد</div><div style={{fontSize:10,marginTop:4}}>حلّل مخططاً واحفظ النتائج لتظهر هنا</div></div>:
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {savedAnalyses.map(a=>{
                    const sel=compareIds.has(a.id);
                    const s=a.summary as any;
                    return(
                      <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:11,border:`2px solid ${sel?T.gold:T.bd}`,background:sel?(D?"#2a1a0820":"#FFF5F020"):T.card,cursor:"pointer",transition:"all .15s"}}
                        onClick={()=>setCompareIds(prev=>{const n=new Set(prev);n.has(a.id)?n.delete(a.id):n.add(a.id);return n;})}>
                        <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${sel?T.gold:T.bd}`,background:sel?T.gold:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {sel&&<span style={{color:"#fff",fontSize:11,fontWeight:900}}>✓</span>}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:600,color:T.t1}}>{(a.file_names||[]).join(", ")||"تحليل بدون ملف"}</div>
                          <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                            <span style={{fontSize:8,color:T.t3}}>📅 {new Date(a.created_at).toLocaleDateString("ar-SA")}</span>
                            <span style={{fontSize:8,color:T.t3}}>🏷️ {DRAW_TYPES[a.drawing_type]?.ar||a.drawing_type}</span>
                            {s?.boq_count&&<span style={{fontSize:8,color:T.grn}}>📊 {s.boq_count} بند</span>}
                            {s?.total_cost&&<span style={{fontSize:8,color:T.gold}}>💰 {Number(s.total_cost).toLocaleString()} SAR</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>}
              </div>
            </div>
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
                  <div className="prog">
                    <div className="prog-f" style={{background:`linear-gradient(90deg,${T.gold},${T.goldL})`,width:`${feState.total>0?Math.round((feState.phase==="extracting"?feState.extracted:feState.analyzed)/feState.total*100):5}%`}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"flex-end",marginTop:3}}>
                    <span style={{fontSize:8,color:T.gold,fontWeight:700}}>{feState.total>0?Math.round((feState.phase==="extracting"?feState.extracted:feState.analyzed)/feState.total*100):0}%</span>
                  </div>
                  {feState.chunks?.length>0&&<div style={{display:"flex",gap:3,marginTop:4,flexWrap:"wrap"}}>
                    {feState.chunks.map((c: any,i: number)=>(
                      <span key={i} style={{background:c.status==="done"?(D?"#064e3b":"#dcfce7"):c.status==="error"?(D?"#450a0a":"#fee2e2"):(D?"#2a1a08":"#FFF5F0"),
                        color:c.status==="done"?T.grn:c.status==="error"?"#ef4444":T.gold,
                        padding:"2px 7px",borderRadius:6,fontSize:8,fontWeight:c.status==="analyzing"?700:400,
                        border:`1px solid ${c.status==="done"?(D?"#065f46":"#bbf7d0"):c.status==="error"?(D?"#7f1d1d":"#fca5a5"):(D?"#854d0e":"#FFE8DB")}`,
                        animation:c.status==="analyzing"?"alim-pulse 1.2s ease infinite":undefined}}>
                        {c.status==="done"?"✓":c.status==="error"?"✗":"⏳"} {c.label}
                      </span>
                    ))}
                  </div>}
                </div>
              )}
              <SmartSuggestions suggestions={analysisSuggestions} T={T} D={D} context="analysis"/>
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
                  {msgs.length>0&&boqCount>0&&(()=>{
                    const allText = msgs.filter((m:any)=>m.role==="assistant").map((m:any)=>m.content||"").join("\n");
                    const ksaLines = allText.match(/KSA-[^\n|]+/g)||[];
                    const hasAr = (allText.match(/[\u0600-\u06FF]{5,}/g)||[]).length;
                    const hasEn = (allText.match(/[a-zA-Z]{5,}/g)||[]).length;
                    const descScore = (hasAr>0&&hasEn>0)?1:(hasAr>0||hasEn>0)?0.6:0;
                    const validUnits = /م³|م²|م\.ط|م\.م|عدد|طن|كجم|لتر|m³|m²|m\.l|no|ton|kg|ls|set|ea|pcs|roll/gi;
                    const unitMatches = (allText.match(validUnits)||[]).length;
                    const unitScore = Math.min(1, unitMatches / Math.max(1, boqCount));
                    const qtyMatches = (allText.match(/الكمية\s*[|:]\s*[\d,.]+|qty\s*[|:]\s*[\d,.]+/gi)||[]).length;
                    const qtyScore = Math.min(1, qtyMatches / Math.max(1, boqCount * 0.5));
                    const priceMatches = (allText.match(/SAR\s*[\d,.]+|ريال\s*[\d,.]+|سعر\s*[|:]\s*[\d,.]+/gi)||[]).length;
                    const priceScore = Math.min(1, priceMatches / Math.max(1, boqCount * 0.3));
                    const cats = ["EARTHWORKS","SEWER","CONCRETE","WATER","ROAD","STORM","MARINE","UTILITY","LABOUR","حفر","ردم","خرسان","أنابيب","صرف","مياه"];
                    const catMatches = cats.filter(c=>allText.toUpperCase().includes(c.toUpperCase())).length;
                    const catScore = Math.min(1, catMatches / 3);
                    const pipeSpecMatches = (allText.match(/(?:PVC|UPVC|HDPE|DI|GRP|PP|Steel|RCP)\s*(?:SN|PN|SDR)\s*\d+/gi)||[]).length;
                    const pipeScore = Math.min(1, pipeSpecMatches / Math.max(1, boqCount * 0.1));
                    const formulaMatches = (allText.match(/\d+[.,]?\d*\s*[×x]\s*\d+[.,]?\d*\s*[×x]\s*\d+[.,]?\d*|العرض\s*[×x]\s*العمق|المساحة\s*[×x]\s*السماكة/gi)||[]).length;
                    const formulaScore = Math.min(1, formulaMatches / Math.max(1, boqCount * 0.05));
                    const overall = Math.round((descScore*0.20 + unitScore*0.15 + qtyScore*0.15 + priceScore*0.15 + catScore*0.10 + pipeScore*0.13 + formulaScore*0.12)*100);
                    const clr = overall>=80?T.grn:overall>=50?T.gold:"#ef4444";
                    const lbl = overall>=80?"ممتاز":overall>=50?"متوسط":"ضعيف";
                    const metrics = [
                      {l:"الأوصاف",s:descScore,i:"📝"},{l:"الوحدات",s:unitScore,i:"📏"},{l:"الكميات",s:qtyScore,i:"🔢"},{l:"الأسعار",s:priceScore,i:"💰"},{l:"التصنيفات",s:catScore,i:"🏷️"},{l:"مواسير",s:pipeScore,i:"🔧"},{l:"معادلات",s:formulaScore,i:"📐"}
                    ];
                    const recs: string[] = [];
                    if(descScore<0.7) recs.push("أضف أوصاف ثنائية اللغة");
                    if(unitScore<0.7) recs.push("تحقق من وحدات القياس");
                    if(priceScore<0.5) recs.push("راجع أسعار SAR المرجعية");
                    if(catScore<0.5) recs.push("فعّل وحدات تحليل إضافية");
                    if(pipeScore<0.5) recs.push("استخدم قالب 'مواسير تفصيلي'");
                    if(formulaScore<0.5) recs.push("استخدم قالب 'حفر وردم'");
                    return(
                      <div style={{background:D?`linear-gradient(135deg,${overall>=80?"#0d1f14":"#1a0e02"},${overall>=80?"#111e18":"#201204"})`:`linear-gradient(135deg,${overall>=80?"#f0fdf4":"#FFF5F0"},${overall>=80?"#dcfce7":"#FFE8DB"})`,
                        border:`1px solid ${overall>=80?(D?"#1a3025":"#bbf7d0"):(D?"#854d0e40":"#FFE8DB")}`,borderRadius:10,padding:"10px 14px",flexShrink:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                          <div style={{width:42,height:42,borderRadius:"50%",border:`2px solid ${clr}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <span style={{fontSize:13,fontWeight:900,color:clr}}>{overall}%</span>
                          </div>
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:11,fontWeight:700,color:T.t1}}>جودة التحليل</span>
                              <span style={{fontSize:8,background:overall>=80?(D?"#064e3b":"#dcfce7"):overall>=50?(D?"#451a03":"#FFF5F0"):(D?"#450a0a":"#fee2e2"),
                                color:clr,padding:"2px 8px",borderRadius:8,fontWeight:600}}>{lbl}</span>
                            </div>
                            <div style={{width:130,height:5,background:D?"#333":"#e5e7eb",borderRadius:4,marginTop:4,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${overall}%`,background:clr,borderRadius:4,transition:"width .5s"}}/>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1,justifyContent:"flex-end"}}>
                            {metrics.map(m=>(
                              <span key={m.l} style={{fontSize:8,background:D?"#ffffff08":"#f9fafb",border:`1px solid ${T.bd}`,padding:"3px 8px",borderRadius:6,display:"flex",alignItems:"center",gap:3}}>
                                {m.i} <span style={{color:T.t3}}>{m.l}:</span>
                                <span style={{fontWeight:700,color:m.s>=0.7?T.grn:m.s>=0.4?T.gold:"#ef4444"}}>{Math.round(m.s*100)}%</span>
                              </span>
                            ))}
                          </div>
                        </div>
                        {recs.length>0&&overall<90&&(
                          <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
                            {recs.slice(0,3).map((r,i)=>(
                              <span key={i} style={{fontSize:8,background:D?"#ffffff06":"#fff",border:`1px solid ${T.bd}`,padding:"3px 9px",borderRadius:8,color:T.t2,display:"flex",alignItems:"center",gap:3}}>
                                ✨ {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                    {[{c:T.grn,i:"⚡",l:"Fast"},{c:"#2563eb",i:"🔀",l:"Hybrid"},{c:"#2563eb",i:"🖼️",l:"PNG/WebP"},{c:"#dc2626",i:"📄",l:"PDF"},{c:T.grn,i:"📐",l:"DWG"},{c:"#7c3aed",i:"📁",l:"مجلد"}].map(f=>(
                      <div key={f.l} style={{textAlign:"center"}} onClick={f.l==="مجلد"?(e:any)=>{e.stopPropagation();folderRef.current?.click()}:undefined}>
                        <div style={{fontSize:14}}>{f.i}</div>
                        <div style={{fontSize:7,color:f.c,marginTop:1,fontWeight:600}}>{f.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:9,color:T.t3}}>اسحب ملفات أو مجلد · PNG, JPG, WebP · PDF حتى 10,000 صفحة</div>
                </div>
                <input ref={fileRef} type="file" accept="image/*,.webp,.pdf,.dwg,.dxf" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
                <input ref={folderRef} type="file" accept=".pdf" multiple style={{display:"none"}} {...{webkitdirectory:"",directory:""} as any} onChange={e=>handleBatchFiles(e.target.files)}/>
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
