import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { History, Loader2, CheckCircle2, TrendingUp, TrendingDown, Minus, Play, Database, FolderOpen, FileStack } from "lucide-react";
import { cn } from "@/lib/utils";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
}

interface BulkMatch {
  itemNumber: string;
  description: string;
  bestMatchDesc: string;
  bestMatchDescAr?: string;
  bestMatchProject: string;
  bestMatchCategory?: string;
  matchScore: number;
  historicalPrice: number;
  currentPrice: number;
  priceDiff: number | null;
  selected: boolean;
  source: "historical" | "saved" | "project";
}

interface BulkHistoricalPricingProps {
  items: BOQItem[];
  onApplyPrices: (prices: Array<{ itemNumber: string; price: number }>) => void;
  currency: string;
  currentProjectId?: string;
}

function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  const normalize = (t: string) => t.toLowerCase().replace(/[^\w\u0600-\u06FF\s]/g, "").split(/\s+/).filter(Boolean);
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));
  if (words1.size === 0 || words2.size === 0) return 0;
  let shared = 0;
  words1.forEach(w => { if (words2.has(w)) shared++; });
  return shared / Math.max(words1.size, words2.size);
}

const sourceConfig = {
  historical: { 
    labelAr: "ملف تاريخي", 
    labelEn: "Historical", 
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    Icon: FileStack 
  },
  saved: { 
    labelAr: "مشروع محفوظ", 
    labelEn: "Saved Project", 
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    Icon: FolderOpen 
  },
  project: { 
    labelAr: "مشروع مسجل", 
    labelEn: "Project", 
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    Icon: Database 
  },
};

export function BulkHistoricalPricing({ items, onApplyPrices, currency, currentProjectId }: BulkHistoricalPricingProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matches, setMatches] = useState<BulkMatch[]>([]);
  const [minMatchThreshold, setMinMatchThreshold] = useState([40]);

  const runBulkComparison = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setProgress(0);
    setMatches([]);

    try {
      // Fetch all 3 data sources in parallel
      const [historicalRes, savedRes, projectItemsRes] = await Promise.all([
        supabase
          .from("historical_pricing_files")
          .select("id, project_name, project_location, project_date, is_verified, items")
          .eq("user_id", user.id),
        supabase
          .from("saved_projects" as any)
          .select("id, name, analysis_data")
          .eq("user_id", user.id),
        supabase
          .from("project_items")
          .select("description, description_ar, unit, unit_price, quantity, category, project_id, project_data!inner(name)")
          .gt("unit_price", 0)
          .neq("is_section", true),
      ]);

      const historicalFiles = historicalRes.data;
      const savedProjects = savedRes.data;
      const projectItems = projectItemsRes.data;

      // Build flat historical items list with source tracking
      const historicalItems: Array<{
        desc: string;
        descAr?: string;
        unit: string;
        price: number;
        project: string;
        verified: boolean;
        category?: string;
        source: "historical" | "saved" | "project";
      }> = [];

      // Source 1: historical_pricing_files
      (historicalFiles || []).forEach(file => {
        const fileItems = (file.items as any[]) || [];
        fileItems.forEach((hi: any) => {
          const price = Number(hi.unit_price || hi.unitPrice || hi["Unit Price"] || 0);
          const desc = hi.description || hi.Description || "";
          if (price > 0 && desc) {
            historicalItems.push({
              desc,
              descAr: hi.description_ar || hi.descriptionAr || undefined,
              unit: hi.unit || hi.Unit || "",
              price,
              project: file.project_name,
              verified: file.is_verified || false,
              category: hi.category || undefined,
              source: "historical",
            });
          }
        });
      });

      // Source 2: saved_projects
      (savedProjects || []).forEach((proj: any) => {
        const analysisData = proj.analysis_data as any;
        (analysisData?.items || []).forEach((si: any) => {
          const price = Number(si.unit_price || 0);
          if (price > 0 && si.description) {
            historicalItems.push({
              desc: si.description,
              descAr: si.description_ar || undefined,
              unit: si.unit || "",
              price,
              project: proj.name,
              verified: false,
              category: si.category || undefined,
              source: "saved",
            });
          }
        });
      });

      // Source 3: project_items + project_data (exclude current project)
      (projectItems || []).forEach((pi: any) => {
        if (currentProjectId && pi.project_id === currentProjectId) return;
        const price = Number(pi.unit_price || 0);
        const projectName = pi.project_data?.name || "Unknown Project";
        if (price > 0 && pi.description) {
          historicalItems.push({
            desc: pi.description,
            descAr: pi.description_ar || undefined,
            unit: pi.unit || "",
            price,
            project: projectName,
            verified: false,
            category: pi.category || undefined,
            source: "project",
          });
        }
      });

      // Match each BOQ item with enhanced algorithm
      const results: BulkMatch[] = [];
      const totalItems = items.length;

      for (let i = 0; i < totalItems; i++) {
        const boqItem = items[i];
        setProgress(Math.round(((i + 1) / totalItems) * 100));

        let bestMatch: { desc: string; descAr?: string; price: number; project: string; score: number; source: "historical" | "saved" | "project"; category?: string } | null = null;

        for (const hi of historicalItems) {
          // Enhanced: match against both English and Arabic descriptions
          const textScoreEn = calculateTextSimilarity(boqItem.description, hi.desc);
          const textScoreAr = hi.descAr ? calculateTextSimilarity(boqItem.description, hi.descAr) : 0;
          const textScore = Math.max(textScoreEn, textScoreAr);

          const unitBonus = hi.unit.toLowerCase().trim() === boqItem.unit.toLowerCase().trim() ? 0.15 : 0;
          const categoryBonus = hi.category && (boqItem as any).category && hi.category.toLowerCase() === (boqItem as any).category.toLowerCase() ? 0.1 : 0;
          const verifiedBonus = hi.verified ? 0.05 : 0;
          // Slight bonus for project_items (detailed pricing)
          const sourceBonus = hi.source === "project" ? 0.03 : 0;

          const score = textScore * 0.7 + unitBonus + categoryBonus + verifiedBonus + sourceBonus;

          if (score > (bestMatch?.score || 0)) {
            bestMatch = { 
              desc: hi.desc, 
              descAr: hi.descAr, 
              price: hi.price, 
              project: hi.project, 
              score, 
              source: hi.source,
              category: hi.category,
            };
          }
        }

        if (bestMatch && bestMatch.score >= 0.15) {
          const currentPrice = boqItem.unit_price || 0;
          const diff = currentPrice > 0 ? ((bestMatch.price - currentPrice) / currentPrice) * 100 : null;
          results.push({
            itemNumber: boqItem.item_number,
            description: boqItem.description,
            bestMatchDesc: bestMatch.desc,
            bestMatchDescAr: bestMatch.descAr,
            bestMatchProject: bestMatch.project,
            bestMatchCategory: bestMatch.category,
            matchScore: Math.min(bestMatch.score, 1),
            historicalPrice: bestMatch.price,
            currentPrice,
            priceDiff: diff,
            selected: bestMatch.score >= 0.5,
            source: bestMatch.source,
          });
        }
      }

      results.sort((a, b) => b.matchScore - a.matchScore);
      setMatches(results);

      // Summary toast
      const sourceCounts = { historical: 0, saved: 0, project: 0 };
      results.forEach(r => sourceCounts[r.source]++);
      toast({
        title: isArabic ? "اكتملت المقارنة" : "Comparison Complete",
        description: isArabic
          ? `تم العثور على ${results.length} تطابق (${sourceCounts.historical} تاريخي، ${sourceCounts.saved} محفوظ، ${sourceCounts.project} مشروع)`
          : `Found ${results.length} matches (${sourceCounts.historical} historical, ${sourceCounts.saved} saved, ${sourceCounts.project} project)`,
      });
    } catch (error) {
      console.error("Bulk historical pricing error:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في تحميل البيانات التاريخية" : "Failed to load historical data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, items, isArabic, toast, currentProjectId]);

  const filteredMatches = useMemo(() => {
    return matches.filter(m => m.matchScore * 100 >= minMatchThreshold[0]);
  }, [matches, minMatchThreshold]);

  const selectedMatches = useMemo(() => {
    return filteredMatches.filter(m => m.selected);
  }, [filteredMatches]);

  const toggleSelect = (itemNumber: string) => {
    setMatches(prev => prev.map(m => m.itemNumber === itemNumber ? { ...m, selected: !m.selected } : m));
  };

  const selectAll = () => {
    setMatches(prev => prev.map(m => ({ ...m, selected: m.matchScore * 100 >= minMatchThreshold[0] })));
  };

  const deselectAll = () => {
    setMatches(prev => prev.map(m => ({ ...m, selected: false })));
  };

  const handleApplySelected = () => {
    const prices = selectedMatches.map(m => ({ itemNumber: m.itemNumber, price: m.historicalPrice }));
    onApplyPrices(prices);
    toast({
      title: isArabic ? "تم تطبيق الأسعار" : "Prices Applied",
      description: isArabic
        ? `تم تطبيق ${prices.length} سعر تاريخي`
        : `Applied ${prices.length} historical prices`,
    });
    setIsOpen(false);
  };

  // Source counts for summary
  const sourceCounts = useMemo(() => {
    const counts = { historical: 0, saved: 0, project: 0 };
    filteredMatches.forEach(r => counts[r.source]++);
    return counts;
  }, [filteredMatches]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => { setIsOpen(true); if (matches.length === 0) runBulkComparison(); }}
        className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
      >
        <History className="w-4 h-4" />
        {isArabic ? "تسعير تاريخي شامل" : "Bulk Historical Pricing"}
      </Button>

      {isOpen && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                {isArabic ? "التسعير التاريخي الشامل" : "Bulk Historical Pricing"}
              </DialogTitle>
              <DialogDescription>
                {isArabic
                  ? `مقارنة ${items.length} بند بالأسعار التاريخية من مشاريعك السابقة (3 مصادر)`
                  : `Comparing ${items.length} items against historical prices from 3 data sources`}
              </DialogDescription>
            </DialogHeader>

            {/* Progress bar during loading */}
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isArabic ? `جاري المقارنة... ${progress}%` : `Comparing... ${progress}%`}
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Summary stats */}
            {!loading && matches.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                    <p className="text-xs text-muted-foreground">{isArabic ? "تم العثور على تطابق" : "Matches Found"}</p>
                    <p className="text-2xl font-bold text-primary">{filteredMatches.length}</p>
                    <p className="text-xs text-muted-foreground">{isArabic ? `من ${items.length} بند` : `of ${items.length} items`}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                    <p className="text-xs text-muted-foreground">{isArabic ? "محدد للتطبيق" : "Selected"}</p>
                    <p className="text-2xl font-bold text-emerald-600">{selectedMatches.length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center">
                    <p className="text-xs text-muted-foreground">{isArabic ? "متوسط التطابق" : "Avg Match"}</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {filteredMatches.length > 0
                        ? Math.round(filteredMatches.reduce((s, m) => s + m.matchScore, 0) / filteredMatches.length * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* Source breakdown badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{isArabic ? "المصادر:" : "Sources:"}</span>
                  {Object.entries(sourceCounts).map(([source, count]) => {
                    if (count === 0) return null;
                    const config = sourceConfig[source as keyof typeof sourceConfig];
                    const Icon = config.Icon;
                    return (
                      <Badge key={source} variant="secondary" className={cn("gap-1 text-xs", config.className)}>
                        <Icon className="w-3 h-3" />
                        {isArabic ? config.labelAr : config.labelEn}: {count}
                      </Badge>
                    );
                  })}
                </div>

                {/* Threshold slider */}
                <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium whitespace-nowrap">
                    {isArabic ? "حد أدنى للتطابق:" : "Min match:"}
                  </span>
                  <Slider
                    value={minMatchThreshold}
                    onValueChange={setMinMatchThreshold}
                    min={10}
                    max={90}
                    step={5}
                    className="flex-1"
                  />
                  <Badge variant="secondary">{minMatchThreshold[0]}%</Badge>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={selectAll} className="gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isArabic ? "تحديد الكل" : "Select All"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={deselectAll} className="gap-1">
                    {isArabic ? "إلغاء التحديد" : "Deselect All"}
                  </Button>
                  <div className="flex-1" />
                  <Button
                    onClick={handleApplySelected}
                    disabled={selectedMatches.length === 0}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isArabic
                      ? `تطبيق ${selectedMatches.length} سعر`
                      : `Apply ${selectedMatches.length} Prices`}
                  </Button>
                </div>

                {/* Results table */}
                <TooltipProvider>
                  <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-10"></TableHead>
                          <TableHead>{isArabic ? "البند" : "Item"}</TableHead>
                          <TableHead>{isArabic ? "أفضل تطابق" : "Best Match"}</TableHead>
                          <TableHead className="text-center">{isArabic ? "المصدر" : "Source"}</TableHead>
                          <TableHead className="text-center">{isArabic ? "التطابق" : "Match"}</TableHead>
                          <TableHead className="text-right">{isArabic ? "السعر التاريخي" : "Hist. Price"}</TableHead>
                          <TableHead className="text-right">{isArabic ? "السعر الحالي" : "Current"}</TableHead>
                          <TableHead className="text-center">{isArabic ? "الفرق" : "Diff"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMatches.map(match => {
                          const config = sourceConfig[match.source];
                          const SourceIcon = config.Icon;
                          return (
                            <TableRow
                              key={match.itemNumber}
                              className={cn(
                                "cursor-pointer",
                                match.selected && "bg-emerald-500/5"
                              )}
                              onClick={() => toggleSelect(match.itemNumber)}
                            >
                              <TableCell>
                                <Checkbox checked={match.selected} />
                              </TableCell>
                              <TableCell>
                                <p className="text-xs font-mono text-primary">{match.itemNumber}</p>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-sm truncate max-w-[180px]">{match.description}</p>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p>{match.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-sm truncate max-w-[180px]">{match.bestMatchDesc}</p>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs space-y-1">
                                    <p>{match.bestMatchDesc}</p>
                                    {match.bestMatchDescAr && (
                                      <p className="text-muted-foreground" dir="rtl">{match.bestMatchDescAr}</p>
                                    )}
                                    {match.bestMatchCategory && (
                                      <p className="text-xs text-muted-foreground">
                                        {isArabic ? "الفئة:" : "Category:"} {match.bestMatchCategory}
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <SourceIcon className="w-3 h-3 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">{match.bestMatchProject}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", config.className)}>
                                  {isArabic ? config.labelAr : config.labelEn}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={cn(
                                  "text-sm font-bold",
                                  match.matchScore >= 0.7 ? "text-emerald-600" :
                                  match.matchScore >= 0.4 ? "text-amber-600" : "text-muted-foreground"
                                )}>
                                  {Math.round(match.matchScore * 100)}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-bold text-sm">
                                {match.historicalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {match.currentPrice > 0 ? match.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                {match.priceDiff !== null ? (
                                  <span className={cn(
                                    "text-xs font-medium flex items-center justify-center gap-0.5",
                                    match.priceDiff > 5 ? "text-red-600" : match.priceDiff < -5 ? "text-emerald-600" : "text-muted-foreground"
                                  )}>
                                    {match.priceDiff > 0 ? <TrendingUp className="w-3 h-3" /> : match.priceDiff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                    {match.priceDiff > 0 ? "+" : ""}{match.priceDiff.toFixed(1)}%
                                  </span>
                                ) : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TooltipProvider>
              </>
            )}

            {/* Empty state */}
            {!loading && matches.length === 0 && (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-medium text-muted-foreground">{isArabic ? "اضغط لبدء المقارنة" : "Click to start comparison"}</p>
                <Button onClick={runBulkComparison} className="mt-4 gap-2">
                  <Play className="w-4 h-4" />
                  {isArabic ? "بدء المقارنة" : "Start Comparison"}
                </Button>
              </div>
            )}

            {/* Re-run button */}
            {!loading && matches.length > 0 && (
              <Button variant="outline" size="sm" onClick={runBulkComparison} className="gap-2">
                <Play className="w-4 h-4" />
                {isArabic ? "إعادة المقارنة" : "Re-run Comparison"}
              </Button>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
