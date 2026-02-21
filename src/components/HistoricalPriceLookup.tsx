import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { Search, CheckCircle2, TrendingUp, TrendingDown, Minus, MapPin, Calendar, ShieldCheck, ArrowRight, Loader2, History, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoricalMatch {
  id: string;
  projectName: string;
  projectLocation: string | null;
  projectDate: string | null;
  isVerified: boolean;
  itemDescription: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  matchScore: number;
  source: "historical" | "saved";
}

interface HistoricalPriceLookupProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    item_number: string;
    description: string;
    unit: string;
    quantity: number;
    unit_price?: number;
  };
  onApplyPrice: (price: number) => void;
  currency: string;
}

// Calculate text similarity based on shared words
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

export function HistoricalPriceLookup({ isOpen, onClose, item, onApplyPrice, currency }: HistoricalPriceLookupProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<HistoricalMatch[]>([]);
  const [searchOverride, setSearchOverride] = useState("");

  const fetchHistoricalData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch historical pricing files
      const { data: historicalFiles } = await supabase
        .from("historical_pricing_files")
        .select("id, project_name, project_location, project_date, is_verified, items, currency")
        .eq("user_id", user.id);

      // Fetch saved projects with analysis data
      const { data: savedProjects } = await supabase
        .from("saved_projects" as any)
        .select("id, name, location, created_at, analysis_data")
        .eq("user_id", user.id);

      const allMatches: HistoricalMatch[] = [];
      const searchDesc = searchOverride || item.description;

      // Process historical files
      (historicalFiles || []).forEach(file => {
        const items = (file.items as any[]) || [];
        items.forEach((hItem: any) => {
          const desc = hItem.description || hItem.Description || "";
          const unitPrice = Number(hItem.unit_price || hItem.unitPrice || hItem["Unit Price"] || 0);
          const unit = hItem.unit || hItem.Unit || "";
          if (!desc || unitPrice <= 0) return;

          const textScore = calculateTextSimilarity(searchDesc, desc);
          const unitMatch = unit.toLowerCase().trim() === item.unit.toLowerCase().trim() ? 0.15 : 0;
          const verifiedBonus = file.is_verified ? 0.1 : 0;
          const recencyScore = file.project_date
            ? Math.max(0, 1 - (Date.now() - new Date(file.project_date).getTime()) / (3 * 365 * 24 * 60 * 60 * 1000)) * 0.1
            : 0;
          const totalScore = textScore * 0.65 + unitMatch + verifiedBonus + recencyScore;

          if (totalScore >= 0.2) {
            allMatches.push({
              id: `h-${file.id}-${desc.substring(0, 10)}`,
              projectName: file.project_name,
              projectLocation: file.project_location,
              projectDate: file.project_date,
              isVerified: file.is_verified || false,
              itemDescription: desc,
              unit,
              unitPrice,
              quantity: Number(hItem.quantity || hItem.Quantity || 0),
              matchScore: Math.min(totalScore, 1),
              source: "historical",
            });
          }
        });
      });

      // Process saved projects
      (savedProjects || []).forEach((proj: any) => {
        const analysisData = proj.analysis_data as any;
        const projItems = analysisData?.items || [];
        projItems.forEach((sItem: any) => {
          const desc = sItem.description || "";
          const unitPrice = Number(sItem.unit_price || 0);
          const unit = sItem.unit || "";
          if (!desc || unitPrice <= 0) return;

          const textScore = calculateTextSimilarity(searchDesc, desc);
          const unitMatch = unit.toLowerCase().trim() === item.unit.toLowerCase().trim() ? 0.15 : 0;
          const totalScore = textScore * 0.75 + unitMatch + 0.1;

          if (totalScore >= 0.2) {
            allMatches.push({
              id: `s-${proj.id}-${sItem.item_number || desc.substring(0, 10)}`,
              projectName: proj.name,
              projectLocation: proj.location || null,
              projectDate: proj.created_at,
              isVerified: false,
              itemDescription: desc,
              unit,
              unitPrice,
              quantity: Number(sItem.quantity || 0),
              matchScore: Math.min(totalScore, 1),
              source: "saved",
            });
          }
        });
      });

      // Sort by match score descending, take top 15
      allMatches.sort((a, b) => b.matchScore - a.matchScore);
      setMatches(allMatches.slice(0, 15));
    } catch (error) {
      console.error("Error fetching historical data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, item.description, item.unit, searchOverride]);

  useEffect(() => {
    if (isOpen) fetchHistoricalData();
  }, [isOpen, fetchHistoricalData]);

  const stats = useMemo(() => {
    if (matches.length === 0) return null;
    const prices = matches.map(m => m.unitPrice);
    return {
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      count: matches.length,
    };
  }, [matches]);

  const getPriceDiff = (historicalPrice: number) => {
    if (!item.unit_price || item.unit_price === 0) return null;
    return ((historicalPrice - item.unit_price) / item.unit_price) * 100;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            {isArabic ? "البحث في الأسعار التاريخية" : "Historical Price Lookup"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? `البحث عن بنود مشابهة لـ: ${item.description?.substring(0, 60)}...`
              : `Finding similar items for: ${item.description?.substring(0, 60)}...`}
          </DialogDescription>
        </DialogHeader>

        {/* Search override */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? "تعديل البحث..." : "Refine search..."}
            value={searchOverride}
            onChange={(e) => setSearchOverride(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchHistoricalData()}
            className="pl-10"
          />
        </div>

        {/* Stats summary */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground">{isArabic ? "عدد التطابقات" : "Matches"}</p>
              <p className="text-xl font-bold text-primary">{stats.count}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
              <p className="text-xs text-muted-foreground">{isArabic ? "المتوسط" : "Average"}</p>
              <p className="text-lg font-bold text-emerald-600">{stats.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center">
              <p className="text-xs text-muted-foreground">{isArabic ? "الأدنى" : "Min"}</p>
              <p className="text-lg font-bold text-blue-600">{stats.min.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 text-center">
              <p className="text-xs text-muted-foreground">{isArabic ? "الأعلى" : "Max"}</p>
              <p className="text-lg font-bold text-orange-600">{stats.max.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        )}

        {/* Apply average button */}
        {stats && (
          <Button
            onClick={() => onApplyPrice(stats.avg)}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <BarChart3 className="w-4 h-4" />
            {isArabic
              ? `تطبيق المتوسط: ${stats.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`
              : `Apply Average: ${stats.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`}
          </Button>
        )}

        {/* Results table */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{isArabic ? "لم يتم العثور على تطابقات" : "No matches found"}</p>
            <p className="text-sm mt-1">{isArabic ? "جرب تعديل نص البحث" : "Try refining your search"}</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[30%]">{isArabic ? "المشروع" : "Project"}</TableHead>
                  <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "التطابق" : "Match"}</TableHead>
                  <TableHead className="text-right">{isArabic ? "السعر" : "Price"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "الفرق" : "Diff"}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match) => {
                  const diff = getPriceDiff(match.unitPrice);
                  return (
                    <TableRow key={match.id} className="hover:bg-primary/5">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm truncate max-w-[200px]">{match.projectName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {match.projectLocation && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" /> {match.projectLocation}
                              </span>
                            )}
                            {match.projectDate && (
                              <span className="flex items-center gap-0.5">
                                <Calendar className="w-3 h-3" /> {new Date(match.projectDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {match.isVerified && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5 text-emerald-600 border-emerald-300">
                                <ShieldCheck className="w-3 h-3" />
                                {isArabic ? "موثق" : "Verified"}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {match.source === "historical" ? (isArabic ? "تاريخي" : "Historical") : (isArabic ? "محفوظ" : "Saved")}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm truncate max-w-[200px]" title={match.itemDescription}>
                          {match.itemDescription}
                        </p>
                        <p className="text-xs text-muted-foreground">{match.unit}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex flex-col items-center gap-1">
                                <span className={cn(
                                  "text-sm font-bold",
                                  match.matchScore >= 0.7 ? "text-emerald-600" :
                                  match.matchScore >= 0.4 ? "text-amber-600" : "text-muted-foreground"
                                )}>
                                  {Math.round(match.matchScore * 100)}%
                                </span>
                                <Progress value={match.matchScore * 100} className="h-1.5 w-12" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isArabic ? "نسبة تطابق الوصف والوحدة" : "Description & unit match score"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-sm">{match.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span className="text-xs text-muted-foreground ml-1">{currency}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {diff !== null ? (
                          <span className={cn(
                            "text-xs font-medium flex items-center justify-center gap-0.5",
                            diff > 5 ? "text-red-600" : diff < -5 ? "text-emerald-600" : "text-muted-foreground"
                          )}>
                            {diff > 0 ? <TrendingUp className="w-3 h-3" /> : diff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onApplyPrice(match.unitPrice)}
                          className="gap-1 text-primary hover:text-primary hover:bg-primary/10 h-7 px-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isArabic ? "تطبيق" : "Apply"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
