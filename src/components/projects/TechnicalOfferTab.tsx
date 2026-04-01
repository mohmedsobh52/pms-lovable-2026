import { useState } from "react";
import { Sparkles, CloudUpload, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";

export function TechnicalOfferTab() {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);

  const handleStartAI = () => {
    setIsStarting(true);
    // Navigate to a future AI offer creation flow
    setTimeout(() => {
      navigate("/projects/new");
      setIsStarting(false);
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {isArabic ? "إنشاء العرض الفني" : "Create Technical Offer"}
        </h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          {isArabic
            ? "أنشئ يدوياً أو ارفع مستند طلب العروض أو كراسة الشروط أو ارفع عرضاً فنياً سابقاً. سيقوم الذكاء الاصطناعي بقراءته وتحسينه بالكامل"
            : "Create manually, upload an RFP or specifications document, or upload a previous technical offer. AI will read and enhance it completely"}
        </p>
      </div>

      {/* Option 1: AI Full Creation */}
      <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center space-y-4 hover:border-primary/60 transition-colors bg-primary/5">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold">
          {isArabic ? "إنشاء كامل بالذكاء الاصطناعي" : "Full AI Creation"}
        </h3>
        <p className="text-muted-foreground text-sm">
          {isArabic
            ? "دع الذكاء الاصطناعي يُنشئ عرضك الفني الكامل"
            : "Let AI create your complete technical offer"}
        </p>
        <Button size="lg" className="px-10" onClick={handleStartAI} disabled={isStarting}>
          {isStarting ? (
            <><Loader2 className="w-4 h-4 animate-spin me-2" />{isArabic ? "جارٍ البدء..." : "Starting..."}</>
          ) : (
            isArabic ? "ابدأ الآن" : "Start Now"
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-border" />
        <span className="text-sm text-muted-foreground">{isArabic ? "أو" : "or"}</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Option 2: Drag & Drop Upload */}
      <div className="relative border-2 border-dashed border-border rounded-xl p-8 text-center space-y-4 hover:border-muted-foreground/40 transition-colors">
        <Badge variant="secondary" className="absolute top-3 end-3 text-xs">
          {isArabic ? "قريباً" : "Coming Soon"}
        </Badge>
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <CloudUpload className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground">
          {isArabic ? "اسحب وأفلت الملف للرفع" : "Drag & Drop File to Upload"}
        </h3>
        <p className="text-muted-foreground text-xs">
          {isArabic
            ? "ارفع مستند طلب العروض أو كراسة الشروط وسيقوم الذكاء الاصطناعي بتحليله"
            : "Upload an RFP or specifications document and AI will analyze it"}
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-border" />
        <span className="text-sm text-muted-foreground">{isArabic ? "أو" : "or"}</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Option 3: Upload Previous Offer */}
      <div className="relative border-2 border-dashed border-border rounded-xl p-8 text-center space-y-4 hover:border-muted-foreground/40 transition-colors">
        <Badge variant="secondary" className="absolute top-3 end-3 text-xs">
          {isArabic ? "قريباً" : "Coming Soon"}
        </Badge>
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <FileText className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold">
          {isArabic ? "رفع عرض فني سابق" : "Upload Previous Technical Offer"}
        </h3>
        <p className="text-muted-foreground text-xs max-w-md mx-auto">
          {isArabic
            ? "سيقوم الذكاء الاصطناعي باستخراج بيانات شركتك وملء مكتبة الشركة تلقائياً"
            : "AI will extract your company data and auto-fill the company library"}
        </p>
      </div>
    </div>
  );
}
