import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { History, Loader2, CheckCircle2, TrendingUp, TrendingDown, Minus, Play, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
  bestMatchProject: string;
  matchScore: number;
  historicalPrice: number;
  currentPrice: number;
  priceDiff: number | null;
  selected: boolean;
}

interface BulkHistoricalPricingProps {
  items: BOQItem[];
  onApplyPrices: (prices: Array<{ itemNumber: string; price: number }>) => void;
  currency: string;
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

export function BulkHistoricalPricing({ items, onApplyPrices, currency }: BulkHistoricalPricingProps) {
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
      // Fetch all historical data
      const { data: historicalFiles } = await supabase
        .from("historical_pricing_files")
        .select("id, project_name, project_location, project_date, is_verified, items")
        .eq("user_id", user.id);

      const { data: savedProjects } = await supabase
        .from("saved_projects" as any)
        .select("id, name, analysis_data")
        .eq("user_id", user.id);

      // Build flat historical items list
      const historicalItems: Array<{ desc: string; unit: string; price: number; project: string; verified: boolean }> = [];

      (historicalFiles || []).forEach(file => {
        const fileItems = (file.items as any[]) || [];
        fileItems.forEach((hi: any) => {
          const price = Number(hi.unit_price || hi.unitPrice || hi["Unit Price"] || 0);
          const desc = hi.description || hi.Description || "";
          if (price > 0 && desc) {
            historicalItems.push({
              desc,
              unit: hi.unit || hi.Unit || "",
              price,
              project: file.project_name,
              verified: file.is_verified || false,
            });
          }
        });
      });

      (savedProjects || []).forEach((proj: any) => {
        const analysisData = proj.analysis_data as any;
        (analysisData?.items || []).forEach((si: any) => {
          const price = Number(si.unit_price || 0);
          if (price > 0 && si.description) {
            historicalItems.push({
              desc: si.description,
              unit: si.unit || "",
              price,
              project: proj.name,
              verified: false,
            });
          }
        });
      });

      // Match each BOQ item
      const results: BulkMatch[] = [];
      const totalItems = items.length;

      for (let i = 0; i < totalItems; i++) {
        const boqItem = items[i];
        setProgress(Math.round(((i + 1) / totalItems) * 100));

        let bestMatch: { desc: string; price: number; project: string; score: number } | null = null;

        for (const hi of historicalItems) {
          const textScore = calculateTextSimilarity(boqItem.description, hi.desc);
          const unitBonus = hi.unit.toLowerCase().trim() === boqItem.unit.toLowerCase().trim() ? 0.15 : 0;
          const score = textScore * 0.85 + unitBonus;

          if (score > (bestMatch?.score || 0)) {
            bestMatch = { desc: hi.desc, price: hi.price, project: hi.project, score };
          }
        }

        if (bestMatch && bestMatch.score >= 0.15) {
          const currentPrice = boqItem.unit_price || 0;
          const diff = currentPrice > 0 ? ((bestMatch.price - currentPrice) / currentPrice) * 100 : null;
          results.push({
            itemNumber: boqItem.item_number,
            description: boqItem.description,
            bestMatchDesc: bestMatch.desc,
            bestMatchProject: bestMatch.project,
            matchScore: Math.min(bestMatch.score, 1),
            historicalPrice: bestMatch.price,
            currentPrice,
            priceDiff: diff,
            selected: bestMatch.score >= 0.5,
          });
        }
      }

      results.sort((a, b) => b.matchScore - a.matchScore);
      setMatches(results);
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
  }, [user, items, isArabic, toast]);

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
                  ? `مقارنة ${items.length} بند بالأسعار التاريخية من مشاريعك السابقة`
                  : `Comparing ${items.length} items against historical prices from your past projects`}
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
                <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10"></TableHead>
                        <TableHead>{isArabic ? "البند" : "Item"}</TableHead>
                        <TableHead>{isArabic ? "أفضل تطابق" : "Best Match"}</TableHead>
                        <TableHead className="text-center">{isArabic ? "التطابق" : "Match"}</TableHead>
                        <TableHead className="text-right">{isArabic ? "السعر التاريخي" : "Hist. Price"}</TableHead>
                        <TableHead className="text-right">{isArabic ? "السعر الحالي" : "Current"}</TableHead>
                        <TableHead className="text-center">{isArabic ? "الفرق" : "Diff"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMatches.map(match => (
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
                            <p className="text-sm truncate max-w-[180px]">{match.description}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm truncate max-w-[180px]" title={match.bestMatchDesc}>{match.bestMatchDesc}</p>
                            <p className="text-xs text-muted-foreground">{match.bestMatchProject}</p>
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
