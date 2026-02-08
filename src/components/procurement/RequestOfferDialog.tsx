import { useState, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, Send, Mic, Sparkles, CheckCircle, Lightbulb, Info, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RequestOfferDialogProps {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface EstimatedItem {
  name: string;
  estimated_price_min: number;
  estimated_price_max: number;
  currency: string;
  suppliers: string[];
}

interface SearchResult {
  summary: string;
  estimated_items: EstimatedItem[];
  recommendations: string[];
  market_notes: string;
  search_sources: string[];
  total_estimated_min?: number;
  total_estimated_max?: number;
}

const suggestions = [
  { en: "Need 10 laptops for development team", ar: "نحتاج 10 أجهزة لابتوب لفريق التطوير" },
  { en: "Office furniture for 50 employees", ar: "أثاث مكتبي لـ 50 موظف" },
  { en: "Construction materials for building project", ar: "مواد بناء لمشروع إنشائي" },
  { en: "Electrical equipment and supplies", ar: "معدات ولوازم كهربائية" },
  { en: "HVAC systems for commercial building", ar: "أنظمة تكييف لمبنى تجاري" },
];

type DialogStep = 'input' | 'processing' | 'results';

export const RequestOfferDialog = ({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: RequestOfferDialogProps) => {
  const { isArabic } = useLanguage();
  const [request, setRequest] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>('input');
  const [progress, setProgress] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const onOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    controlledOnOpenChange?.(newOpen);
    
    if (!newOpen) {
      setTimeout(() => {
        setStep('input');
        setProgress(0);
        setRequest("");
        setSearchResults(null);
      }, 300);
    }
  };

  const handleSuggestionClick = (suggestion: { en: string; ar: string }) => {
    const text = isArabic ? suggestion.ar : suggestion.en;
    setRequest(text);
    handleSubmitWithQuery(text);
  };

  const saveToDatabase = async (query: string, results: SearchResult) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('offer_requests').insert([{
        user_id: user.id,
        request_text: query,
        language: isArabic ? 'ar' : 'en',
        summary: results.summary,
        estimated_items: JSON.parse(JSON.stringify(results.estimated_items)),
        recommendations: results.recommendations,
        market_notes: results.market_notes,
        search_sources: results.search_sources,
        total_estimated_min: results.total_estimated_min,
        total_estimated_max: results.total_estimated_max,
        currency: 'SAR',
      }]);
    } catch (error) {
      console.error('Error saving offer request:', error);
    }
  };

  const handleSubmitWithQuery = async (query: string) => {
    if (!query.trim()) return;

    setStep('processing');
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return p;
        return p + Math.random() * 5 + 2;
      });
    }, 200);

    try {
      const { data, error } = await supabase.functions.invoke('search-offers', {
        body: { query, language: isArabic ? 'ar' : 'en' }
      });

      clearInterval(progressInterval);

      if (error) {
        console.error('Search offers error:', error);
        throw new Error(error.message || 'Failed to search offers');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setProgress(100);

      // Parse and structure the results
      const results: SearchResult = {
        summary: data?.summary || '',
        estimated_items: data?.estimated_items || [],
        recommendations: data?.recommendations || [],
        market_notes: data?.market_notes || '',
        search_sources: data?.search_sources || [],
        total_estimated_min: data?.total_estimated_min,
        total_estimated_max: data?.total_estimated_max,
      };

      setSearchResults(results);
      setStep('results');

      // Save to database
      await saveToDatabase(query, results);

      toast.success(
        isArabic ? "تم تحليل الطلب بنجاح" : "Request analyzed successfully"
      );

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Submit error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast.error(
        isArabic ? "حدث خطأ أثناء البحث" : "Error during search",
        { description: errorMessage }
      );
      
      setStep('input');
      setProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitWithQuery(request);
  };

  const handleNewRequest = () => {
    setStep('input');
    setProgress(0);
    setRequest("");
    setSearchResults(null);
  };

  // Results View
  const renderResultsView = () => {
    if (!searchResults) return null;

    return (
      <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
        {/* Success Header */}
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">
              {isArabic ? "تم تحليل الطلب بنجاح" : "Request analyzed successfully"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{searchResults.summary}</p>
        </div>

        {/* Estimated Items Table */}
        {searchResults.estimated_items.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <h4 className="font-medium text-sm">
                {isArabic ? "قائمة الموردين والأسعار" : "Suppliers & Prices"}
              </h4>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">{isArabic ? "المادة" : "Item"}</TableHead>
                  <TableHead className="w-[30%]">{isArabic ? "السعر (ر.س)" : "Price (SAR)"}</TableHead>
                  <TableHead className="w-[30%]">{isArabic ? "الموردين" : "Suppliers"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.estimated_items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-primary font-medium">
                      {item.estimated_price_min?.toLocaleString()} - {item.estimated_price_max?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.suppliers?.join(isArabic ? "، " : ", ") || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Total Row */}
            {searchResults.total_estimated_min && searchResults.total_estimated_max && (
              <div className="bg-muted/30 px-4 py-3 border-t flex justify-between items-center">
                <span className="font-medium">{isArabic ? "الإجمالي التقديري" : "Estimated Total"}</span>
                <span className="text-primary font-bold">
                  {searchResults.total_estimated_min.toLocaleString()} - {searchResults.total_estimated_max.toLocaleString()} {isArabic ? "ر.س" : "SAR"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {searchResults.recommendations.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
              <Lightbulb className="w-4 h-4" />
              {isArabic ? "التوصيات" : "Recommendations"}
            </h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {searchResults.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Market Notes */}
        {searchResults.market_notes && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
              <Info className="w-4 h-4" />
              {isArabic ? "ملاحظات السوق" : "Market Notes"}
            </h4>
            <p className="text-sm text-muted-foreground">{searchResults.market_notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-background pb-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleNewRequest}
          >
            <RotateCcw className="w-4 h-4 me-2" />
            {isArabic ? "طلب جديد" : "New Request"}
          </Button>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
          >
            {isArabic ? "إغلاق" : "Close"}
          </Button>
        </div>
      </div>
    );
  };

  // Processing View
  const renderProcessingView = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <div className="absolute inset-0 border-2 border-dashed border-muted-foreground/30 rounded-lg animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          <div className="flex gap-1">
            <Sparkles className="w-4 h-4 text-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <Sparkles className="w-4 h-4 text-primary/80 animate-bounce" style={{ animationDelay: '150ms' }} />
            <Sparkles className="w-4 h-4 text-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-primary">
          {isArabic ? "جاري المعالجة..." : "Processing..."}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {isArabic 
            ? "يقوم الذكاء الاصطناعي بتحليل عروض الشركاء من قواعد البيانات ومصادر الويب"
            : "AI analyzes partner offers from databases and web sources"}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{isArabic ? "جاري التحميل..." : "Loading..."}</span>
          <span className="text-primary font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );

  // Input View
  const renderInputView = () => (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          {isArabic
            ? "أدخل طلبك بالتفصيل للحصول على أفضل عروض الأسعار من الموردين"
            : "Enter your request in detail to get the best price quotes from suppliers"}
        </p>

        <div className="relative">
          <Textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder={
              isArabic
                ? "اكتب طلبك هنا..."
                : "Write your request here..."
            }
            rows={4}
            className="resize-none pe-10 bg-background"
          />
          <button
            type="button"
            className="absolute end-3 top-3 text-muted-foreground hover:text-primary transition-colors"
            title={isArabic ? "تسجيل صوتي" : "Voice input"}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          {isArabic ? "اقتراحات جاهزة:" : "Suggested requests:"}
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-3 py-1.5 text-xs rounded-full border border-border bg-background hover:bg-accent hover:border-primary/50 transition-colors"
            >
              {isArabic ? suggestion.ar : suggestion.en}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          {isArabic ? "إلغاء" : "Cancel"}
        </Button>
        <Button
          type="submit"
          disabled={!request.trim()}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="w-4 h-4 me-2" />
          {isArabic ? "إرسال الطلب" : "Submit Request"}
        </Button>
      </div>
    </form>
  );

  const renderContent = () => {
    switch (step) {
      case 'processing':
        return renderProcessingView();
      case 'results':
        return renderResultsView();
      default:
        return renderInputView();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isArabic ? "طلب عرض سعر" : "Request Offer"}
          </DialogTitle>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
