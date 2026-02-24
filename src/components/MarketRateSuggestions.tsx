import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, MapPin, Loader2, Check, AlertTriangle, CheckCheck, BarChart3, Bot, Globe, BookOpen, Database, Search, RefreshCw, Info, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ApplyRateDialog } from "./ApplyRateDialog";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisTracking, useTrackAnalysis } from "@/hooks/useAnalysisTracking";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
}

interface MarketRateSuggestion {
  item_number: string;
  description: string;
  current_price: number;
  suggested_min: number;
  suggested_max: number;
  suggested_avg: number;
  confidence: "High" | "Medium" | "Low";
  trend: "Increasing" | "Stable" | "Decreasing";
  variance_percent: number;
  notes: string;
  source?: "library" | "reference" | "ai" | "historical";
}

interface MarketRateSuggestionsProps {
  items: BOQItem[];
  projectId?: string;
  onApplyRate?: (itemNumber: string, newRate: number) => void;
  onApplyAIRates?: (rates: Array<{ itemId: string; rate: number }>) => void;
  onApplyAIRatesToCalcPrice?: (rates: Array<{ itemId: string; rate: number }>) => void;
}

interface CachedResults {
  suggestions: MarketRateSuggestion[];
  timestamp: number;
  itemCount: number;
  location: string;
  region: string;
}

const CACHE_KEY = "market_rate_suggestions_cache";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// City factors matching edge function
const CITY_FACTORS: Record<string, { factor: number; label: string }> = {
  "Riyadh": { factor: 1.00, label: "Baseline" },
  "Jeddah": { factor: 1.05, label: "+5%" },
  "Dammam": { factor: 0.97, label: "-3%" },
  "Makkah": { factor: 1.08, label: "+8%" },
  "Madinah": { factor: 1.04, label: "+4%" },
  "Khobar": { factor: 0.98, label: "-2%" },
  "Tabuk": { factor: 1.12, label: "+12%" },
  "Abha": { factor: 1.10, label: "+10%" },
  "Dubai": { factor: 1.25, label: "+25%" },
  "Abu Dhabi": { factor: 1.20, label: "+20%" },
  "Sharjah": { factor: 1.15, label: "+15%" },
  "Ajman": { factor: 1.10, label: "+10%" },
  "Cairo": { factor: 0.45, label: "-55%" },
  "Alexandria": { factor: 0.42, label: "-58%" },
  "Giza": { factor: 0.44, label: "-56%" },
  "Doha": { factor: 1.30, label: "+30%" },
  "Al Wakrah": { factor: 1.25, label: "+25%" },
  "Kuwait City": { factor: 1.15, label: "+15%" },
  "Hawalli": { factor: 1.12, label: "+12%" },
  "Manama": { factor: 1.10, label: "+10%" },
  "Muharraq": { factor: 1.08, label: "+8%" },
  "Muscat": { factor: 1.05, label: "+5%" },
  "Salalah": { factor: 1.08, label: "+8%" },
};

const REGION_CITIES: Record<string, Array<{ value: string; label: string }>> = {
  saudi: [
    { value: "Riyadh", label: "الرياض / Riyadh" },
    { value: "Jeddah", label: "جدة / Jeddah" },
    { value: "Dammam", label: "الدمام / Dammam" },
    { value: "Makkah", label: "مكة / Makkah" },
    { value: "Madinah", label: "المدينة / Madinah" },
    { value: "Khobar", label: "الخبر / Khobar" },
    { value: "Tabuk", label: "تبوك / Tabuk" },
    { value: "Abha", label: "أبها / Abha" },
  ],
  uae: [
    { value: "Dubai", label: "دبي / Dubai" },
    { value: "Abu Dhabi", label: "أبو ظبي / Abu Dhabi" },
    { value: "Sharjah", label: "الشارقة / Sharjah" },
    { value: "Ajman", label: "عجمان / Ajman" },
  ],
  egypt: [
    { value: "Cairo", label: "القاهرة / Cairo" },
    { value: "Alexandria", label: "الإسكندرية / Alexandria" },
    { value: "Giza", label: "الجيزة / Giza" },
  ],
  qatar: [
    { value: "Doha", label: "الدوحة / Doha" },
    { value: "Al Wakrah", label: "الوكرة / Al Wakrah" },
  ],
  kuwait: [
    { value: "Kuwait City", label: "مدينة الكويت / Kuwait City" },
    { value: "Hawalli", label: "حولي / Hawalli" },
  ],
  bahrain: [
    { value: "Manama", label: "المنامة / Manama" },
    { value: "Muharraq", label: "المحرق / Muharraq" },
  ],
  oman: [
    { value: "Muscat", label: "مسقط / Muscat" },
    { value: "Salalah", label: "صلالة / Salalah" },
  ],
};

const REGIONS = [
  { value: "saudi", label: "Saudi Arabia", labelAr: "السعودية", emoji: "🇸🇦" },
  { value: "uae", label: "UAE", labelAr: "الإمارات", emoji: "🇦🇪" },
  { value: "egypt", label: "Egypt", labelAr: "مصر", emoji: "🇪🇬" },
  { value: "qatar", label: "Qatar", labelAr: "قطر", emoji: "🇶🇦" },
  { value: "kuwait", label: "Kuwait", labelAr: "الكويت", emoji: "🇰🇼" },
  { value: "bahrain", label: "Bahrain", labelAr: "البحرين", emoji: "🇧🇭" },
  { value: "oman", label: "Oman", labelAr: "عمان", emoji: "🇴🇲" },
];

export function MarketRateSuggestions({ items, projectId, onApplyRate, onApplyAIRates, onApplyAIRatesToCalcPrice }: MarketRateSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState("Riyadh");
  const [region, setRegion] = useState("saudi");
  const [suggestions, setSuggestions] = useState<MarketRateSuggestion[]>([]);
  const [appliedItems, setAppliedItems] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MarketRateSuggestion | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [analyzedItemsCount, setAnalyzedItemsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isArabic] = useState(() => document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl');
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { selectedModel } = useAnalysisTracking();
  const { startTracking, completeTracking } = useTrackAnalysis(
    'suggest-market-rates',
    'Market Rate Suggestions',
    'اقتراحات أسعار السوق'
  );

  // Reset city when region changes
  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    const cities = REGION_CITIES[newRegion];
    if (cities && cities.length > 0) {
      setLocation(cities[0].value);
    }
  };

  // Get current city factor
  const currentCityFactor = CITY_FACTORS[location] || { factor: 1.0, label: "Baseline" };
  const currentCities = REGION_CITIES[region] || REGION_CITIES.saudi;

  // Load cached results on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedResults = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL && parsed.itemCount === items?.length) {
          setSuggestions(parsed.suggestions);
          setAnalyzedItemsCount(parsed.suggestions.length);
          setTotalItemsCount(parsed.itemCount);
          setLocation(parsed.location);
          setRegion(parsed.region);
          setAnalysisProgress(100);
        }
      }
    } catch {}
  }, []);

  // Realistic progress simulation
  useEffect(() => {
    if (!isLoading) return;
    setAnalysisProgress(0);
    const stages = [
      { target: 15, duration: 800 },
      { target: 35, duration: 1500 },
      { target: 55, duration: 2000 },
      { target: 70, duration: 3000 },
      { target: 85, duration: 4000 },
      { target: 92, duration: 6000 },
    ];
    let currentStage = 0;
    let progress = 0;
    
    const interval = setInterval(() => {
      if (currentStage >= stages.length) {
        clearInterval(interval);
        return;
      }
      const stage = stages[currentStage];
      progress += (stage.target - progress) * 0.15;
      if (progress >= stage.target - 1) {
        currentStage++;
      }
      setAnalysisProgress(Math.round(progress));
    }, 300);
    
    return () => clearInterval(interval);
  }, [isLoading]);

  // Filter suggestions by search
  const filteredSuggestions = suggestions.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.item_number.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  // Stats
  const libCount = suggestions.filter(s => s.source === "library").length;
  const refCount = suggestions.filter(s => s.source === "reference").length;
  const aiCount = suggestions.filter(s => s.source === "ai").length;
  const histCount = suggestions.filter(s => s.source === "historical").length;
  const highConfCount = suggestions.filter(s => s.confidence === "High").length;
  const avgVariance = suggestions.length > 0
    ? Math.round(suggestions.reduce((sum, s) => sum + Math.abs(s.variance_percent), 0) / suggestions.length * 10) / 10
    : 0;
  const estimatedAccuracy = suggestions.length > 0
    ? Math.round(((highConfCount * 95) + (suggestions.filter(s => s.confidence === "Medium").length * 80) + (suggestions.filter(s => s.confidence === "Low").length * 65)) / suggestions.length)
    : 0;

  // Get source icon + label
  const getSourceInfo = (source?: string) => {
    switch (source) {
      case "library":
        return { icon: <BookOpen className="w-3 h-3" />, label: isArabic ? "المكتبة" : "Library", color: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400" };
      case "reference":
        return { icon: <Database className="w-3 h-3" />, label: isArabic ? "مرجعي" : "Reference", color: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400" };
      case "ai":
        return { icon: <Bot className="w-3 h-3" />, label: "AI", color: "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400" };
      case "historical":
        return { icon: <History className="w-3 h-3" />, label: isArabic ? "تاريخي" : "Historical", color: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400" };
      default:
        return { icon: <Bot className="w-3 h-3" />, label: "—", color: "bg-muted border-border text-muted-foreground" };
    }
  };

  // Update pricing history when rate is applied
  const updatePricingHistory = async (itemNumber: string, finalPrice: number, suggestedPrice: number) => {
    if (!user) return;
    try {
      const deviation = suggestedPrice > 0 ? ((finalPrice - suggestedPrice) / suggestedPrice) * 100 : 0;
      const accuracy = Math.max(0, 100 - Math.abs(deviation));
      await supabase
        .from('pricing_history')
        .update({
          final_price: finalPrice,
          is_approved: true,
          approved_at: new Date().toISOString(),
          deviation_percent: Math.round(deviation * 100) / 100,
          accuracy_score: Math.round(accuracy * 100) / 100
        })
        .eq('item_number', itemNumber)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
    } catch (error) {
      console.error('Error updating pricing history:', error);
    }
  };

  // Fetch library data for enhanced pricing
  const fetchLibraryData = async () => {
    try {
      const [materialsRes, laborRes, equipmentRes, historicalRes] = await Promise.all([
        supabase.from('material_prices').select('name, name_ar, unit_price, unit, category, is_verified, price_date'),
        supabase.from('labor_rates').select('name, name_ar, unit_rate, unit, category'),
        supabase.from('equipment_rates').select('name, name_ar, rental_rate, unit, category'),
        supabase.from('project_items').select('description, description_ar, unit, unit_price, project_data(name)').gt('unit_price', 0).order('created_at', { ascending: false }).limit(200)
      ]);
      
      // Transform historical data
      const historicalData = (historicalRes.data || []).map((item: any) => ({
        description: item.description || '',
        description_ar: item.description_ar,
        unit: item.unit || '',
        unit_price: item.unit_price || 0,
        source: item.project_data?.name
      }));

      return {
        materials: materialsRes.data || [],
        labor: laborRes.data || [],
        equipment: equipmentRes.data || [],
        historicalData
      };
    } catch (error) {
      console.error('Error fetching library data:', error);
      return undefined;
    }
  };

  const handleSuggestRates = async () => {
    if (!items || items.length === 0) {
      toast({ title: isArabic ? "لا توجد بنود" : "No items", description: isArabic ? "يرجى رفع بيانات BOQ أولاً" : "Please upload BOQ data first", variant: "destructive" });
      return;
    }
    const validItems = items.filter(item => !!item.item_number);
    if (validItems.length === 0) {
      toast({ title: isArabic ? "لا توجد بنود صالحة" : "No valid items", description: isArabic ? "جميع البنود بدون أرقام" : "All items are missing item numbers", variant: "destructive" });
      return;
    }

    const trackingId = startTracking(validItems.length);
    setIsLoading(true);
    setSuggestions([]);
    setTotalItemsCount(validItems.length);
    setAnalyzedItemsCount(0);
    setAnalysisProgress(0);

    try {
      const libraryData = await fetchLibraryData();
      const regionInfo = REGIONS.find(r => r.value === region);
      const { data, error } = await supabase.functions.invoke("suggest-market-rates", {
        body: { items: validItems, location, region: regionInfo?.label || "Saudi Arabia", model: selectedModel, libraryData, historicalData: libraryData?.historicalData },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const receivedSuggestions = data.suggestions || [];
      setSuggestions(receivedSuggestions);
      setAnalyzedItemsCount(data.analyzed_items || receivedSuggestions.length);
      setAnalysisProgress(100);
      
      // Cache results
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          suggestions: receivedSuggestions,
          timestamp: Date.now(),
          itemCount: validItems.length,
          location,
          region,
        } as CachedResults));
      } catch {}

      completeTracking(trackingId, true, false, { itemsAnalyzed: receivedSuggestions.length });
      
      if (receivedSuggestions.length > 0 && onApplyAIRates) {
        const rates = receivedSuggestions.map((s: MarketRateSuggestion) => ({ itemId: s.item_number, rate: s.suggested_avg }));
        onApplyAIRates(rates);
      }

      const accuracy = data.accuracy_metrics?.estimated_accuracy || 0;
      const sourceInfo = data.data_source;
      toast({
        title: isArabic ? `تم التحليل بدقة ${accuracy}%` : `Analysis complete - ${accuracy}% accuracy`,
        description: isArabic
          ? `${data.analyzed_items} items: Library(${sourceInfo?.library_count || 0}) + Reference(${sourceInfo?.reference_count || 0}) + AI(${sourceInfo?.ai_count || 0}) + Historical(${sourceInfo?.historical_count || 0})`
          : `${data.analyzed_items} بند: مكتبة(${sourceInfo?.library_count || 0}) + مرجعي(${sourceInfo?.reference_count || 0}) + AI(${sourceInfo?.ai_count || 0}) + تاريخي(${sourceInfo?.historical_count || 0})`,
      });
    } catch (error: any) {
      console.error("Error getting market rates:", error);
      completeTracking(trackingId, false, false, { error: error.message || "Failed to get market rate suggestions" });
      toast({ title: isArabic ? "فشل التحليل" : "Analysis failed", description: error.message || "Failed to get market rate suggestions", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openApplyDialog = (suggestion: MarketRateSuggestion) => {
    setSelectedSuggestion(suggestion);
    setConfirmDialogOpen(true);
  };

  const handleConfirmApply = async () => {
    if (!selectedSuggestion || !onApplyRate) return;
    onApplyRate(selectedSuggestion.item_number, selectedSuggestion.suggested_avg);
    setAppliedItems(prev => new Set([...prev, selectedSuggestion.item_number]));
    setConfirmDialogOpen(false);
    await updatePricingHistory(selectedSuggestion.item_number, selectedSuggestion.suggested_avg, selectedSuggestion.suggested_avg);
    toast({ title: isArabic ? "تم تطبيق السعر" : "Rate applied", description: isArabic ? `تم تحديث سعر البند ${selectedSuggestion.item_number}` : `Updated unit price for item ${selectedSuggestion.item_number}` });
    setSelectedSuggestion(null);
  };

  const handleApplyAll = async () => {
    if (!onApplyRate) return;
    const unappliedSuggestions = suggestions.filter(s => !appliedItems.has(s.item_number));
    for (const suggestion of unappliedSuggestions) {
      onApplyRate(suggestion.item_number, suggestion.suggested_avg);
      await updatePricingHistory(suggestion.item_number, suggestion.suggested_avg, suggestion.suggested_avg);
    }
    setAppliedItems(new Set(suggestions.map(s => s.item_number)));
    toast({ title: isArabic ? "تم تطبيق جميع الأسعار" : "All rates applied", description: isArabic ? `تم تحديث ${unappliedSuggestions.length} بند` : `Updated ${unappliedSuggestions.length} items with suggested market rates` });
  };

  const getSelectedItem = (): BOQItem | null => {
    if (!selectedSuggestion) return null;
    return items.find(i => i.item_number === selectedSuggestion.item_number) || {
      item_number: selectedSuggestion.item_number,
      description: selectedSuggestion.description,
      unit: 'Unit',
      quantity: 1,
      unit_price: selectedSuggestion.current_price,
      total_price: selectedSuggestion.current_price
    };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "Increasing": return <TrendingUp className="w-3.5 h-3.5 text-destructive" />;
      case "Decreasing": return <TrendingDown className="w-3.5 h-3.5 text-green-600" />;
      default: return <Minus className="w-3.5 h-3.5 text-yellow-600" />;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      High: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return colors[confidence as keyof typeof colors] || colors.Low;
  };

  const getRowConfidenceClass = (confidence: string) => {
    switch (confidence) {
      case "High": return "bg-green-50/50 dark:bg-green-950/20";
      case "Medium": return "bg-yellow-50/50 dark:bg-yellow-950/20";
      case "Low": return "bg-red-50/30 dark:bg-red-950/15";
      default: return "";
    }
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) > 20) return "text-destructive font-bold";
    if (Math.abs(variance) > 10) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const highVarianceCount = suggestions.filter(s => Math.abs(s.variance_percent) > 20).length;

  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const dialogContent = (
    <div className="space-y-4">
      {/* Header with total items count */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-sm">{isArabic ? "إجمالي بنود BOQ" : "Total BOQ Items"}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? "جاهزة للتحليل" : "Ready for analysis"}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-1">
          {items?.length || 0} {isArabic ? "بند" : "items"}
        </Badge>
      </div>

      {/* Analysis Progress */}
      {isLoading && (
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg space-y-3 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <div>
                <p className="font-semibold text-sm">{isArabic ? "جارٍ تحليل البنود..." : "Analyzing items..."}</p>
                <p className="text-xs text-muted-foreground">
                  {analysisProgress < 30 
                    ? (isArabic ? "جاري تحميل بيانات المكتبة..." : "Loading library data...") 
                    : analysisProgress < 60 
                    ? (isArabic ? "مطابقة الأسعار المرجعية..." : "Matching reference prices...")
                    : analysisProgress < 85
                    ? (isArabic ? "تحليل AI للبنود المتبقية..." : "AI analyzing remaining items...")
                    : (isArabic ? "التحقق من النتائج..." : "Validating results...")}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{analysisProgress}%</p>
            </div>
          </div>
          <Progress value={analysisProgress} className="h-3" />
        </div>
      )}
      
      {/* Completed Analysis Summary with Stats */}
      {suggestions.length > 0 && !isLoading && (
        <div className="space-y-3">
          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-sm text-green-700 dark:text-green-400">
                    {isArabic ? "تم اكتمال التحليل بنجاح!" : "Analysis completed successfully!"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? `تم تحليل ${analyzedItemsCount} من ${totalItemsCount} بند` : `Analyzed ${analyzedItemsCount} of ${totalItemsCount} items`}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleSuggestRates} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                {isArabic ? "إعادة التحليل" : "Re-analyze"}
              </Button>
            </div>
          </div>

          {/* Visual Stats Cards */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">{isArabic ? "المكتبة" : "Library"}</span>
              </div>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">{libCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">{isArabic ? "مرجعي" : "Reference"}</span>
              </div>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{refCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <History className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{isArabic ? "تاريخي" : "Historical"}</span>
              </div>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{histCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Bot className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-400">AI</span>
              </div>
              <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{aiCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-center">
              <span className="text-xs font-medium text-primary">{isArabic ? "الدقة" : "Accuracy"}</span>
              <p className="text-lg font-bold text-primary">{estimatedAccuracy}%</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted border text-center">
              <span className="text-xs font-medium text-muted-foreground">{isArabic ? "متوسط الانحراف" : "Avg Deviation"}</span>
              <p className={cn("text-lg font-bold", avgVariance > 15 ? "text-destructive" : "text-foreground")}>{avgVariance}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Location selector and analyze button */}
      <div className="flex flex-col gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{isArabic ? "المنطقة:" : "Region:"}</span>
          </div>
          <Select value={region} onValueChange={handleRegionChange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map(r => (
                <SelectItem key={r.value} value={r.value}>
                  <span className="flex items-center gap-2">
                    <span>{r.emoji}</span>
                    <span>{isArabic ? r.labelAr : r.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{isArabic ? "المدينة:" : "City:"}</span>
          </div>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentCities.map(city => (
                <SelectItem key={city.value} value={city.value}>
                  {city.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* City Factor Badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={currentCityFactor.factor > 1 ? "destructive" : currentCityFactor.factor < 1 ? "default" : "secondary"}
                  className="gap-1 text-xs cursor-help"
                >
                  <MapPin className="w-3 h-3" />
                  {currentCityFactor.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {isArabic 
                    ? `معامل المدينة: ${currentCityFactor.factor}x - يؤثر على جميع الأسعار المقترحة`
                    : `City factor: ${currentCityFactor.factor}x - affects all suggested prices`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button 
            onClick={handleSuggestRates} 
            disabled={isLoading || !items?.length}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isArabic ? "جارٍ التحليل..." : "Analyzing..."}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {isArabic ? `تحليل الكل (${items?.length || 0} بند)` : `Analyze All (${items?.length || 0} items)`}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search + Results summary */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isArabic ? "بحث بالرقم أو الوصف..." : "Search by item number or description..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <span className="text-muted-foreground">
              {isArabic 
                ? `${filteredSuggestions.length} اقتراح سعر متاح` 
                : `${filteredSuggestions.length} rate suggestions available`}
            </span>
            <div className="flex items-center gap-2">
              {highVarianceCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {highVarianceCount} {isArabic ? "انحراف عالي" : "high variance"}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyAll}
                disabled={suggestions.length === 0 || appliedItems.size === suggestions.length}
                className="gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                {isArabic ? `تطبيق الكل (${suggestions.length - appliedItems.size})` : `Apply All (${suggestions.length - appliedItems.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions table */}
      {suggestions.length > 0 ? (
        <ScrollArea className="h-[350px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b z-10">
              <tr>
                <th className="p-2 text-right">{isArabic ? "البند" : "Item"}</th>
                <th className="p-2 text-right">{isArabic ? "الوصف" : "Description"}</th>
                <th className="p-2 text-center">{isArabic ? "المصدر" : "Source"}</th>
                <th className="p-2 text-right">{isArabic ? "الحالي" : "Current"}</th>
                <th className="p-2 text-right">{isArabic ? "المقترح" : "Suggested"}</th>
                <th className="p-2 text-center">{isArabic ? "النطاق" : "Range"}</th>
                <th className="p-2 text-right">{isArabic ? "الانحراف" : "Variance"}</th>
                <th className="p-2 text-right">{isArabic ? "الثقة" : "Confidence"}</th>
                <th className="p-2 text-right">{isArabic ? "إجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuggestions.map((suggestion) => {
                const sourceInfo = getSourceInfo(suggestion.source);
                return (
                  <TooltipProvider key={suggestion.item_number}>
                    <tr className={cn(
                      "border-b hover:bg-muted/50 transition-colors",
                      appliedItems.has(suggestion.item_number) 
                        ? "bg-green-50 dark:bg-green-900/20" 
                        : getRowConfidenceClass(suggestion.confidence),
                      Math.abs(suggestion.variance_percent) > 20 && "border-l-2 border-l-destructive"
                    )}>
                      <td className="p-2.5 font-mono text-xs">{suggestion.item_number}</td>
                      <td className="p-2.5 max-w-[180px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block cursor-help">{suggestion.description}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-medium mb-1">{suggestion.description}</p>
                            {suggestion.notes && (
                              <p className="text-xs text-muted-foreground flex items-start gap-1">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                {suggestion.notes}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge variant="outline" className={cn("gap-1 text-xs", sourceInfo.color)}>
                          {sourceInfo.icon}
                          <span>{sourceInfo.label}</span>
                        </Badge>
                      </td>
                      <td className="p-2.5 font-mono text-xs">
                        {suggestion.current_price?.toLocaleString() || "N/A"}
                      </td>
                      <td className="p-2.5">
                        <span className="font-semibold text-primary">
                          {suggestion.suggested_avg?.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="text-xs text-muted-foreground font-mono">
                          {suggestion.suggested_min?.toLocaleString()} - {suggestion.suggested_max?.toLocaleString()}
                        </span>
                      </td>
                      <td className={cn("p-2.5 font-mono text-xs", getVarianceColor(suggestion.variance_percent))}>
                        <span className="flex items-center gap-1 justify-end">
                          {getTrendIcon(suggestion.trend)}
                          {suggestion.variance_percent > 0 ? "+" : ""}{suggestion.variance_percent?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-2.5">
                        <Badge className={cn("text-xs", getConfidenceBadge(suggestion.confidence))}>
                          {suggestion.confidence === "High" ? (isArabic ? "عالية" : "High") 
                           : suggestion.confidence === "Medium" ? (isArabic ? "متوسطة" : "Medium") 
                           : (isArabic ? "منخفضة" : "Low")}
                        </Badge>
                      </td>
                      <td className="p-2.5">
                        {appliedItems.has(suggestion.item_number) ? (
                          <Badge variant="outline" className="gap-1 text-green-600 text-xs">
                            <Check className="w-3 h-3" />
                            {isArabic ? "مطبق" : "Applied"}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openApplyDialog(suggestion)}
                            disabled={!onApplyRate}
                            className="text-xs h-7"
                          >
                            {isArabic ? "تطبيق" : "Apply"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  </TooltipProvider>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>{isArabic ? `جارٍ تحليل أسعار السوق لـ ${location}...` : `Analyzing market rates for ${location}...`}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Sparkles className="w-12 h-12 text-muted-foreground/50" />
              <p>{isArabic ? 'اضغط "تحليل الكل" للحصول على اقتراحات أسعار السوق بالذكاء الاصطناعي' : 'Click "Analyze All" to get AI-powered market rate suggestions'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 analysis-action-btn hover:bg-primary/10 hover:border-primary/50 transition-all duration-100"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">{isArabic ? "اقتراح أسعار" : "Suggest Rates"}</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {items?.length || 0}
            </Badge>
          </Button>
        </DialogTrigger>
        {isOpen && (
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {isArabic ? "اقتراحات أسعار السوق بالذكاء الاصطناعي" : "AI Market Rate Suggestions"}
              </DialogTitle>
            </DialogHeader>
            {dialogContent}
          </DialogContent>
        )}
      </Dialog>
      <ApplyRateDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        item={getSelectedItem()}
        suggestedRate={selectedSuggestion?.suggested_avg || 0}
        onConfirm={handleConfirmApply}
      />
    </>
  );
}
