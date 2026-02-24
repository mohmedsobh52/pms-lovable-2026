import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
import { Sparkles, Info, AlertTriangle, CheckCircle, Loader2, Filter, Database, Wrench, Users, History, Globe, Search, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMaterialPrices } from "@/hooks/useMaterialPrices";
import { useLaborRates } from "@/hooks/useLaborRates";
import { useEquipmentRates } from "@/hooks/useEquipmentRates";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ProjectItem } from "./types";
import { REFERENCE_PRICES } from "@/lib/reference-prices";

interface AutoPriceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProjectItem[];
  onApplyPricing: (pricedItems: { id: string; price: number; source: string }[]) => Promise<void>;
  isArabic: boolean;
  currency: string;
}

interface PricingResult {
  itemId: string;
  itemNumber: string;
  description: string;
  suggestedPrice: number;
  confidence: number;
  source: string;
  sourceName: string;
  sourceProject?: string;
}

interface HistoricalItem {
  description: string;
  unit: string;
  unit_price: number;
  project_name: string;
  category?: string;
}

// Infrastructure & construction expert keywords with weights
const EXPERT_KEYWORDS: Record<string, number> = {
  // Concrete works
  concrete: 8, reinforcement: 8, rebar: 8, formwork: 7, shuttering: 7, casting: 6,
  curing: 5, precast: 7, prestressed: 7, "ready mix": 7, lean: 5, blinding: 6,
  // Earthworks
  excavation: 8, backfill: 8, compaction: 7, grading: 6, embankment: 7, trenching: 7,
  dewatering: 7, shoring: 7, "soil improvement": 7, fill: 5, cut: 5,
  // Pipes & utilities
  pipe: 7, pipeline: 7, hdpe: 8, upvc: 8, "ductile iron": 8, manhole: 8,
  valve: 7, hydrant: 7, "fire hydrant": 8, fitting: 6, joint: 5, coupling: 6,
  sewer: 7, drainage: 7, "storm water": 7, culvert: 7, "catch basin": 7, gully: 6,
  // Electrical
  cable: 7, conductor: 7, transformer: 8, switchgear: 8, "cable tray": 7,
  conduit: 7, "street light": 7, lighting: 6, panel: 6, "mdb": 7, "db": 5,
  // Roads & pavement
  asphalt: 8, bitumen: 7, subbase: 7, "base course": 7, curb: 7, kerb: 7,
  pavement: 7, sidewalk: 6, "road marking": 7, guardrail: 7, "traffic sign": 7,
  interlock: 7, "interlocking": 7, paving: 6,
  // Structural
  steel: 7, structural: 6, beam: 6, column: 6, slab: 6, foundation: 7,
  pile: 8, piling: 8, retaining: 7, "sheet pile": 8, anchor: 6,
  // Waterproofing & insulation
  waterproofing: 7, insulation: 7, membrane: 7, epoxy: 7, coating: 6,
  painting: 5, sealant: 6, "damp proof": 7,
  // General construction
  demolition: 7, removal: 5, installation: 4, supply: 3, provide: 3,
  mobilization: 6, demobilization: 6, temporary: 4, permanent: 4,
  // Arabic keywords
  "خرسانة": 8, "حديد": 7, "تسليح": 8, "حفر": 8, "ردم": 8, "دمك": 7,
  "أنابيب": 7, "مواسير": 7, "غرف": 6, "تفتيش": 6, "كابلات": 7,
  "أسفلت": 8, "رصف": 7, "إنارة": 6, "صرف": 7, "مياه": 6,
  "عزل": 7, "دهانات": 5, "بلاط": 6, "أرضيات": 6, "سور": 6,
};

// Common stop words that should NOT contribute to matching
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "all", "any", "per", "etc",
  "supply", "provide", "install", "including", "complete", "as", "in",
  "to", "of", "or", "by", "at", "on", "is", "it", "be", "an", "a",
  "توريد", "تركيب", "شامل", "كامل", "حسب", "طبقا", "وفقا", "من", "إلى",
]);

// Unit normalization map
const UNIT_ALIASES: Record<string, string> = {
  "m3": "m3", "cu.m": "m3", "cum": "m3", "cubic meter": "m3", "م3": "m3", "م.م": "m3",
  "m2": "m2", "sq.m": "m2", "sqm": "m2", "square meter": "m2", "م2": "m2", "م.م2": "m2",
  "m": "m", "l.m": "m", "lm": "m", "linear meter": "m", "م.ط": "m", "م ط": "m",
  "kg": "kg", "kgs": "kg", "kilogram": "kg", "كجم": "kg",
  "ton": "ton", "t": "ton", "tonnes": "ton", "طن": "ton",
  "no": "no", "nos": "no", "number": "no", "ea": "no", "each": "no", "pcs": "no", "piece": "no", "عدد": "no",
  "ls": "ls", "lump sum": "ls", "l.s": "ls", "lumpsum": "ls", "مقطوعية": "ls", "مقطوع": "ls",
  "day": "day", "days": "day", "يوم": "day",
  "hr": "hr", "hour": "hr", "hours": "hr", "ساعة": "hr",
  "set": "set", "sets": "set", "طقم": "set",
  "roll": "roll", "rolls": "roll", "لفة": "roll",
};

function normalizeUnit(unit: string): string {
  if (!unit) return "";
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] || lower;
}

// N-gram similarity for fuzzy matching (especially Arabic text)
function ngramSimilarity(str1: string, str2: string, n: number = 3): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (s1.length < n || s2.length < n) {
    // Fallback to substring check for short strings
    return s1.includes(s2) || s2.includes(s1) ? 0.6 : 0;
  }
  const ngrams1 = new Set<string>();
  const ngrams2 = new Set<string>();
  for (let i = 0; i <= s1.length - n; i++) ngrams1.add(s1.slice(i, i + n));
  for (let i = 0; i <= s2.length - n; i++) ngrams2.add(s2.slice(i, i + n));
  let intersection = 0;
  ngrams1.forEach(ng => { if (ngrams2.has(ng)) intersection++; });
  const union = ngrams1.size + ngrams2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Arabic root matching - common suffix/prefix variations
function arabicRootMatch(word1: string, word2: string): boolean {
  if (!word1 || !word2 || word1.length < 3 || word2.length < 3) return false;
  // Check if they share a 3-char root
  const root1 = word1.slice(0, Math.min(word1.length, 4));
  const root2 = word2.slice(0, Math.min(word2.length, 4));
  return root1 === root2 || word1.includes(word2.slice(0, 3)) || word2.includes(word1.slice(0, 3));
}

function AutoPriceDialogComponent({
  isOpen,
  onClose,
  items,
  onApplyPricing,
  isArabic,
  currency,
}: AutoPriceDialogProps) {
  const [confidenceThreshold, setConfidenceThreshold] = useState([30]);
  const [isApplying, setIsApplying] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [historicalItems, setHistoricalItems] = useState<HistoricalItem[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [marketPrices, setMarketPrices] = useState<Record<string, any>>({});
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [marketSearchDone, setMarketSearchDone] = useState(false);

  const { materials, findMatchingPrice } = useMaterialPrices();
  const { laborRates } = useLaborRates();
  const { equipmentRates } = useEquipmentRates();
  const { user } = useAuth();

  // Fetch historical data when dialog opens
  useEffect(() => {
    if (!isOpen || !user) return;
    
    const fetchHistorical = async () => {
      setLoadingHistorical(true);
      try {
        const [projectItemsRes, historicalFilesRes] = await Promise.all([
          supabase
            .from("project_items")
            .select("description, unit, unit_price, project_id")
            .gt("unit_price", 0)
            .limit(500),
          supabase
            .from("historical_pricing_files")
            .select("project_name, items")
            .eq("user_id", user.id)
            .limit(50),
        ]);

        const items: HistoricalItem[] = [];

        // From project_items
        if (projectItemsRes.data) {
          for (const pi of projectItemsRes.data) {
            if (pi.description && pi.unit_price) {
              items.push({
                description: pi.description,
                unit: pi.unit || "",
                unit_price: pi.unit_price,
                project_name: "Saved Project",
              });
            }
          }
        }

        // From historical_pricing_files
        if (historicalFilesRes.data) {
          for (const file of historicalFilesRes.data) {
            const fileItems = file.items as any[];
            if (Array.isArray(fileItems)) {
              for (const hi of fileItems.slice(0, 200)) {
                const price = Number(hi.unit_price || hi.unitPrice || hi["Unit Price"] || 0);
                if (price > 0) {
                  items.push({
                    description: hi.description || hi.Description || hi["Item Description"] || "",
                    unit: hi.unit || hi.Unit || "",
                    unit_price: price,
                    project_name: file.project_name,
                  });
                }
              }
            }
          }
        }

        setHistoricalItems(items);
      } catch (e) {
        console.error("Failed to fetch historical data:", e);
      } finally {
        setLoadingHistorical(false);
      }
    };

    fetchHistorical();
  }, [isOpen, user]);

  // Get unpriced items
  const unpricedItems = useMemo(() => {
    return items.filter(item => !item.unit_price || item.unit_price === 0);
  }, [items]);

  // Enhanced matching algorithm
  function calculateEnhancedScore(
    itemDesc: string,
    itemUnit: string,
    refName: string,
    refNameAr: string | null | undefined,
    refUnit: string,
    refCategory?: string | null
  ): number {
    const descLower = itemDesc.toLowerCase();
    const nameLower = refName.toLowerCase();
    const nameArLower = (refNameAr || "").toLowerCase();
    
    let score = 0;
    
    // 1. Exact substring match (high value)
    if (descLower.includes(nameLower) || nameLower.includes(descLower)) {
      score += 50;
    }
    if (nameArLower && (descLower.includes(nameArLower) || nameArLower.includes(descLower))) {
      score += 50;
    }
    
    // 1b. N-gram similarity bonus
    const ngramScore = ngramSimilarity(descLower, nameLower);
    if (ngramScore > 0.3) {
      score += Math.round(ngramScore * 30);
    }
    if (nameArLower) {
      const ngramScoreAr = ngramSimilarity(descLower, nameArLower);
      if (ngramScoreAr > 0.3) {
        score += Math.round(ngramScoreAr * 30);
      }
    }
    
    // 2. Tokenized word matching with expert weights
    const descTokens = descLower.split(/[\s,،.\-_/()]+/).filter(w => w.length > 1);
    const refTokens = [...nameLower.split(/[\s,،.\-_/()]+/), ...nameArLower.split(/[\s,،.\-_/()]+/)].filter(w => w.length > 1);
    const catTokens = (refCategory || "").toLowerCase().split(/[\s,،.\-_/()]+/).filter(w => w.length > 1);
    const allRefTokens = [...refTokens, ...catTokens];
    
    let matchedSignificantWords = 0;
    let totalSignificantWords = 0;
    
    for (const word of descTokens) {
      if (STOP_WORDS.has(word)) continue;
      totalSignificantWords++;
      
      const expertWeight = EXPERT_KEYWORDS[word] || 0;
      const isLongWord = word.length > 4;
      
      // Check direct match OR Arabic root match
      const matched = allRefTokens.some(rw => 
        rw.includes(word) || word.includes(rw) || arabicRootMatch(word, rw)
      );
      if (matched) {
        matchedSignificantWords++;
        if (expertWeight > 0) {
          score += expertWeight;
        } else if (isLongWord) {
          score += 6;
        } else {
          score += 4;
        }
      }
    }
    
    // 3. Unit matching bonus (+20)
    const normItemUnit = normalizeUnit(itemUnit);
    const normRefUnit = normalizeUnit(refUnit);
    if (normItemUnit && normRefUnit && normItemUnit === normRefUnit) {
      score += 20;
    }
    
    // 4. Category matching bonus (+15) 
    if (refCategory) {
      const catLower = refCategory.toLowerCase();
      if (descLower.includes(catLower) || catLower.split(/\s+/).some(c => c.length > 3 && descLower.includes(c))) {
        score += 15;
      }
    }
    
    // 5. Penalty for low-quality matches
    if (matchedSignificantWords <= 1 && totalSignificantWords > 3) {
      score = Math.max(score - 20, 0);
    }
    
    // Normalize to 0-98
    return Math.min(Math.round(score * 1.2), 98);
  }

  // Calculate pricing suggestions with confidence scores
  const pricingResults = useMemo((): PricingResult[] => {
    const results: PricingResult[] = [];

    for (const item of unpricedItems) {
      const description = item.description || "";
      const itemUnit = item.unit || "";
      
      let bestMatch: { price: number; confidence: number; source: string; sourceName: string; sourceProject?: string } | null = null;

      // 1. Check material_prices
      for (const mat of materials) {
        const confidence = calculateEnhancedScore(description, itemUnit, mat.name, mat.name_ar, mat.unit, mat.category);
        if (confidence >= 20 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = { price: mat.unit_price, confidence, source: "library", sourceName: mat.name };
        }
      }

      // 2. Check labor_rates
      for (const labor of laborRates) {
        const confidence = calculateEnhancedScore(description, itemUnit, labor.name, labor.name_ar, labor.unit, labor.category);
        if (confidence >= 20 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = { price: labor.unit_rate, confidence, source: "labor", sourceName: labor.name };
        }
      }

      // 3. Check equipment_rates
      for (const equipment of equipmentRates) {
        const confidence = calculateEnhancedScore(description, itemUnit, equipment.name, equipment.name_ar, equipment.unit, equipment.category);
        if (confidence >= 20 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = { price: equipment.rental_rate, confidence, source: "equipment", sourceName: equipment.name };
        }
      }

      // 4. Check historical items
      for (const hi of historicalItems) {
        if (!hi.description) continue;
        const confidence = calculateEnhancedScore(description, itemUnit, hi.description, null, hi.unit);
        if (confidence >= 20 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = { price: hi.unit_price, confidence, source: "historical", sourceName: hi.description.slice(0, 60), sourceProject: hi.project_name };
        }
      }

      // 5. Check built-in reference prices (fallback)
      if (!bestMatch || bestMatch.confidence < 50) {
        for (const ref of REFERENCE_PRICES) {
          const descLower = description.toLowerCase();
          let refScore = 0;
          
          // Check English keywords
          for (const kw of ref.keywords) {
            if (descLower.includes(kw)) refScore += 15;
          }
          // Check Arabic keywords
          for (const kw of ref.keywordsAr) {
            if (descLower.includes(kw)) refScore += 15;
          }
          // N-gram bonus against keywords
          for (const kw of [...ref.keywords, ...ref.keywordsAr]) {
            const ng = ngramSimilarity(descLower, kw);
            if (ng > 0.35) refScore += Math.round(ng * 12);
          }
          // Unit match bonus
          const normItemUnit2 = normalizeUnit(itemUnit);
          const normRefUnit2 = normalizeUnit(ref.unit);
          if (normItemUnit2 && normRefUnit2 && normItemUnit2 === normRefUnit2) {
            refScore += 15;
          }
          
          // Cap reference confidence at 55%
          const refConfidence = Math.min(refScore, 55);
          if (refConfidence >= 20 && (!bestMatch || refConfidence > bestMatch.confidence)) {
            bestMatch = { 
              price: ref.avgPrice, 
              confidence: refConfidence, 
              source: "reference", 
              sourceName: ref.keywords[0] + " (" + ref.category + ")" 
            };
          }
        }
      }

      if (bestMatch && bestMatch.confidence >= confidenceThreshold[0]) {
        results.push({
          itemId: item.id,
          itemNumber: item.item_number,
          description: description.slice(0, 80) + (description.length > 80 ? "..." : ""),
          suggestedPrice: bestMatch.price,
          confidence: bestMatch.confidence,
          source: bestMatch.source,
          sourceName: bestMatch.sourceName,
          sourceProject: bestMatch.sourceProject,
        });
      }
    }

    // 6. Check market prices from AI search
    for (const item of unpricedItems) {
      const description = item.description || "";
      const mp = marketPrices[item.item_number];
      if (mp && mp.avg_price > 0) {
        const existingResult = results.find(r => r.itemId === item.id);
        const marketConfidence = mp.confidence === "high" ? 85 : mp.confidence === "medium" ? 65 : 45;
        if (!existingResult || marketConfidence > existingResult.confidence) {
          const idx = results.findIndex(r => r.itemId === item.id);
          if (idx >= 0) results.splice(idx, 1);
          results.push({
            itemId: item.id,
            itemNumber: item.item_number,
            description: description.slice(0, 80) + (description.length > 80 ? "..." : ""),
            suggestedPrice: mp.avg_price,
            confidence: marketConfidence,
            source: "market",
            sourceName: mp.notes || "AI Market Search",
          });
        }
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }, [unpricedItems, materials, laborRates, equipmentRates, historicalItems, confidenceThreshold, marketPrices]);

  // Source statistics
  const sourceStats = useMemo(() => {
    const stats = { library: 0, labor: 0, equipment: 0, historical: 0, market: 0, reference: 0 };
    for (const r of pricingResults) {
      if (r.source in stats) stats[r.source as keyof typeof stats]++;
    }
    return stats;
  }, [pricingResults]);

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!sourceFilter) return pricingResults;
    return pricingResults.filter(r => r.source === sourceFilter);
  }, [pricingResults, sourceFilter]);

  // Market price search handler
  const handleMarketSearch = async () => {
    const itemsToSearch = unpricedItems.filter(item => {
      const hasResult = pricingResults.find(r => r.itemId === item.id);
      return !hasResult || (hasResult && hasResult.confidence < 60);
    }).slice(0, 10);

    if (itemsToSearch.length === 0) return;

    setLoadingMarket(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-market-prices", {
        body: {
          items: itemsToSearch.map(item => ({
            description: item.description || "",
            unit: item.unit || "",
            item_number: item.item_number,
          })),
          city: "Riyadh",
          language: isArabic ? "ar" : "en",
        },
      });

      if (error) {
        console.error("Market search error:", error);
      } else if (data?.results) {
        setMarketPrices(prev => ({ ...prev, ...data.results }));
      }
    } catch (e) {
      console.error("Market search failed:", e);
    } finally {
      setLoadingMarket(false);
      setMarketSearchDone(true);
    }
  };

  // Auto-trigger market search when all libraries are empty
  const autoSearchTriggered = useRef(false);
  useEffect(() => {
    if (!isOpen || loadingHistorical || loadingMarket || autoSearchTriggered.current) return;
    if (materials.length === 0 && laborRates.length === 0 && equipmentRates.length === 0 && historicalItems.length === 0) {
      autoSearchTriggered.current = true;
      handleMarketSearch();
    }
  }, [isOpen, loadingHistorical, materials.length, laborRates.length, equipmentRates.length, historicalItems.length]);

  // Reset auto-search flag when dialog closes
  useEffect(() => {
    if (!isOpen) {
      autoSearchTriggered.current = false;
      setMarketSearchDone(false);
    }
  }, [isOpen]);

  const handleApply = async () => {
    if (pricingResults.length === 0) return;
    setIsApplying(true);
    try {
      const pricedItems = pricingResults.map(r => ({
        id: r.itemId,
        price: r.suggestedPrice,
        source: r.source,
      }));
      await onApplyPricing(pricedItems);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-blue-600";
    if (confidence >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getConfidenceBarColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500";
    if (confidence >= 60) return "bg-blue-500";
    if (confidence >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const getSourceBadge = (source: string, sourceProject?: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string; labelAr: string }> = {
      library: { color: "bg-green-500/10 text-green-700 border-green-200", icon: <Database className="w-3 h-3" />, label: "Materials", labelAr: "مواد" },
      labor: { color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: <Users className="w-3 h-3" />, label: "Labor", labelAr: "عمالة" },
      equipment: { color: "bg-orange-500/10 text-orange-700 border-orange-200", icon: <Wrench className="w-3 h-3" />, label: "Equipment", labelAr: "معدات" },
      historical: { color: "bg-purple-500/10 text-purple-700 border-purple-200", icon: <History className="w-3 h-3" />, label: "Historical", labelAr: "تاريخي" },
      market: { color: "bg-teal-500/10 text-teal-700 border-teal-200", icon: <Globe className="w-3 h-3" />, label: "Market AI", labelAr: "سوق AI" },
      reference: { color: "bg-cyan-500/10 text-cyan-700 border-cyan-200", icon: <BookOpen className="w-3 h-3" />, label: "Reference", labelAr: "مرجعي" },
    };
    const cfg = configs[source] || configs.library;
    
    const badge = (
      <Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>
        {cfg.icon}
        {isArabic ? cfg.labelAr : cfg.label}
      </Badge>
    );

    if (source === "historical" && sourceProject) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent><p>{sourceProject}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return badge;
  };

  const avgConfidence = pricingResults.length > 0
    ? Math.round(pricingResults.reduce((s, r) => s + r.confidence, 0) / pricingResults.length)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-4xl max-h-[85vh] overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isArabic ? "التسعير التلقائي الذكي" : "Smart Auto Pricing"}
          </DialogTitle>
          <DialogDescription>
            {isArabic 
              ? "تسعير البنود تلقائياً من 6 مصادر: مكتبة المواد، العمالة، المعدات، البيانات التاريخية، أسعار مرجعية مدمجة، وأسعار السوق AI"
              : "Auto-price items from 6 sources: Materials, Labor, Equipment, Historical, Built-in References & AI Market Prices"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Estimation Warning Banner */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {isArabic 
              ? "تنبيه: جميع الأسعار المعروضة تقديرية وقد تختلف عن أسعار السوق الفعلية. يجب مراجعتها والتحقق منها قبل الاعتماد."
              : "Notice: All prices shown are estimates and may differ from actual market prices. Review and verify before approval."
            }
          </p>
        </div>

        <div className="space-y-4 py-2">
          {/* Confidence Threshold Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {isArabic ? "الحد الأدنى للثقة" : "Minimum Confidence"}
              </label>
              <Badge variant="outline" className="text-lg font-bold">
                {confidenceThreshold[0]}%
              </Badge>
            </div>
            <Slider
              value={confidenceThreshold}
              onValueChange={setConfidenceThreshold}
              min={15}
              max={90}
              step={5}
              className="w-full"
            />
          </div>

          {/* What will happen info */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 text-xs space-y-1 text-muted-foreground">
                <p>{isArabic ? "• مطابقة ذكية مع مكتبة الأسعار + البيانات التاريخية" : "• Smart matching with price library + historical data"}</p>
                <p>{isArabic ? "• مطابقة الوحدات والفئات لدقة أعلى" : "• Unit & category matching for higher accuracy"}</p>
                <p>{isArabic ? "• البنود المسعرة مسبقاً لن تتأثر" : "• Already priced items won't be affected"}</p>
              </div>
            </div>
          </div>

          {/* Statistics - 4 cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2.5 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">{unpricedItems.length}</p>
              <p className="text-[10px] text-muted-foreground">{isArabic ? "غير مسعرة" : "Unpriced"}</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-green-500/10">
              <p className="text-xl font-bold text-green-600">{pricingResults.length}</p>
              <p className="text-[10px] text-muted-foreground">{isArabic ? "يمكن تسعيرها" : "Can Price"}</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-amber-500/10">
              <p className="text-xl font-bold text-amber-600">{unpricedItems.length - pricingResults.length}</p>
              <p className="text-[10px] text-muted-foreground">{isArabic ? "بدون مطابقة" : "No Match"}</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-primary/10">
              <p className="text-xl font-bold text-primary">{avgConfidence}%</p>
              <p className="text-[10px] text-muted-foreground">{isArabic ? "متوسط الثقة" : "Avg Confidence"}</p>
            </div>
          </div>

          {/* Source summary with filter buttons */}
          {pricingResults.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <Button
                variant={sourceFilter === null ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setSourceFilter(null)}
              >
                {isArabic ? "الكل" : "All"} ({pricingResults.length})
              </Button>
              {sourceStats.library > 0 && (
                <Button
                  variant={sourceFilter === "library" ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2 gap-1"
                  onClick={() => setSourceFilter(sourceFilter === "library" ? null : "library")}
                >
                  <Database className="w-3 h-3" /> {sourceStats.library}
                </Button>
              )}
              {sourceStats.labor > 0 && (
                <Button
                  variant={sourceFilter === "labor" ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2 gap-1"
                  onClick={() => setSourceFilter(sourceFilter === "labor" ? null : "labor")}
                >
                  <Users className="w-3 h-3" /> {sourceStats.labor}
                </Button>
              )}
              {sourceStats.equipment > 0 && (
                <Button
                  variant={sourceFilter === "equipment" ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2 gap-1"
                  onClick={() => setSourceFilter(sourceFilter === "equipment" ? null : "equipment")}
                >
                  <Wrench className="w-3 h-3" /> {sourceStats.equipment}
                </Button>
              )}
              {sourceStats.historical > 0 && (
                <Button
                  variant={sourceFilter === "historical" ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2 gap-1"
                  onClick={() => setSourceFilter(sourceFilter === "historical" ? null : "historical")}
                >
                  <History className="w-3 h-3" /> {sourceStats.historical}
                </Button>
              )}
              {sourceStats.market > 0 && (
                <Button
                  variant={sourceFilter === "market" ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2 gap-1"
                  onClick={() => setSourceFilter(sourceFilter === "market" ? null : "market")}
                >
                  <Globe className="w-3 h-3" /> {sourceStats.market}
                </Button>
              )}
              {sourceStats.reference > 0 && (
                <Button
                  variant={sourceFilter === "reference" ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2 gap-1"
                  onClick={() => setSourceFilter(sourceFilter === "reference" ? null : "reference")}
                >
                  <BookOpen className="w-3 h-3" /> {sourceStats.reference}
                </Button>
              )}
            </div>
          )}

          {/* Market Search Button */}
          {unpricedItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-950/30"
              onClick={handleMarketSearch}
              disabled={loadingMarket}
            >
              {loadingMarket ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {loadingMarket
                ? (isArabic ? "جاري البحث عن أسعار السوق..." : "Searching market prices...")
                : marketSearchDone
                  ? (isArabic ? "تم البحث عن أسعار السوق ✓" : "Market prices searched ✓")
                  : (isArabic ? "🔍 بحث أسعار السوق الحقيقية (AI)" : "🔍 Search Real Market Prices (AI)")
              }
            </Button>
          )}
          {/* Auto Preview Results */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              {isArabic ? "نتائج المطابقة" : "Match Results"}
              {loadingHistorical && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </h4>
            {filteredResults.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <p className="text-sm">{isArabic ? "لم يتم العثور على تطابقات" : "No matches found"}</p>
                <p className="text-xs mt-1">
                  {isArabic 
                    ? "جرب تقليل الحد الأدنى للثقة أو أضف أسعار للمكتبة"
                    : "Try lowering confidence threshold or add prices to library"
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[220px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                      <TableHead className="w-[90px]">{isArabic ? "السعر" : "Price"}</TableHead>
                      <TableHead className="w-[100px]">{isArabic ? "الثقة" : "Confidence"}</TableHead>
                      <TableHead className="w-[90px]">{isArabic ? "المصدر" : "Source"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result) => (
                      <TableRow key={result.itemId}>
                        <TableCell className="font-mono text-xs">{result.itemNumber}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={result.description}>
                          {result.description}
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          {result.suggestedPrice.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${getConfidenceBarColor(result.confidence)}`}
                                style={{ width: `${result.confidence}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${getConfidenceColor(result.confidence)}`}>
                              {result.confidence}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getSourceBadge(result.source, result.sourceProject)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={pricingResults.length === 0 || isApplying}
            className="gap-2"
          >
            {isApplying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isArabic ? `تطبيق (${pricingResults.length} بند)` : `Apply (${pricingResults.length} items)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const AutoPriceDialog = memo(AutoPriceDialogComponent);
AutoPriceDialog.displayName = "AutoPriceDialog";

export { AutoPriceDialog };
