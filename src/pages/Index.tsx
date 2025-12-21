import { useState, useCallback } from "react";
import { FileUp, Sparkles, GitMerge, Download, FileText, Edit3 } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { WorkflowStatus, defaultWorkflowSteps, type WorkflowStep, type StepStatus } from "@/components/WorkflowStatus";
import { AnalysisResults } from "@/components/AnalysisResults";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [manualText, setManualText] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [wbsData, setWbsData] = useState<any>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>(defaultWorkflowSteps);
  const { toast } = useToast();

  const updateStepStatus = (stepId: string, status: StepStatus) => {
    setWorkflowSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    updateStepStatus("upload", "complete");
    
    // Show manual input option since PDF extraction might not work
    toast({
      title: "تم رفع الملف",
      description: "يُفضل نسخ محتوى PDF ولصقه يدوياً للحصول على أفضل النتائج",
    });
    setShowManualInput(true);
  }, [toast]);

  const handleClearFile = () => {
    setSelectedFile(null);
    setExtractedText("");
    setManualText("");
    setShowManualInput(false);
    setAnalysisData(null);
    setWbsData(null);
    setWorkflowSteps(defaultWorkflowSteps);
  };

  const handleManualTextSubmit = () => {
    if (manualText.trim().length < 50) {
      toast({
        title: "النص قصير جداً",
        description: "يرجى إدخال نص BOQ أطول للتحليل",
        variant: "destructive",
      });
      return;
    }
    setExtractedText(manualText);
    updateStepStatus("extract", "complete");
    toast({
      title: "تم حفظ النص",
      description: `تم حفظ ${manualText.length} حرف للتحليل`,
    });
  };

  const runAnalysis = async () => {
    const textToAnalyze = extractedText || manualText;
    
    if (!textToAnalyze || textToAnalyze.length < 50) {
      toast({
        title: "لا يوجد نص كافٍ",
        description: "يرجى إدخال نص BOQ للتحليل",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    updateStepStatus("analyze", "processing");

    try {
      // Extract items analysis
      const { data: itemsResult, error: itemsError } = await supabase.functions.invoke("analyze-boq", {
        body: { text: textToAnalyze, analysis_type: "extract_items" },
      });

      if (itemsError) throw itemsError;
      
      if (itemsResult.error) {
        throw new Error(itemsResult.suggestion || itemsResult.error);
      }

      setAnalysisData(itemsResult);
      updateStepStatus("analyze", "complete");

      toast({
        title: "تم التحليل بنجاح",
        description: `تم استخراج ${itemsResult.items?.length || 0} عنصر`,
      });

      // Create WBS
      updateStepStatus("wbs", "processing");
      
      const { data: wbsResult, error: wbsError } = await supabase.functions.invoke("analyze-boq", {
        body: { text: textToAnalyze, analysis_type: "create_wbs" },
      });

      if (wbsError) throw wbsError;

      if (wbsResult.error) {
        console.warn("WBS creation warning:", wbsResult.error);
      } else {
        setWbsData(wbsResult);
      }
      
      updateStepStatus("wbs", "complete");
      updateStepStatus("export", "complete");

      toast({
        title: "تم إنشاء WBS بنجاح",
        description: `تم إنشاء ${wbsResult.wbs?.length || 0} عنصر في الهيكل`,
      });

    } catch (error) {
      console.error("Analysis error:", error);
      updateStepStatus("analyze", "error");
      toast({
        title: "خطأ في التحليل",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحليل الملف",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <GitMerge className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold gradient-text">BOQ Analyzer</h1>
                <p className="text-xs text-muted-foreground">تحليل جداول الكميات بالذكاء الاصطناعي</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-badge status-complete">
                <span className="pulse-dot bg-success" />
                متصل
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              حلل ملفات <span className="gradient-text">BOQ</span> بسهولة
            </h2>
            <p className="text-lg text-muted-foreground">
              الصق نص جدول الكميات وسنقوم بتحليله واستخراج العناصر وإنشاء WBS تلقائياً
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Upload & Actions */}
            <div className="lg:col-span-2 space-y-6">
              {!showManualInput && !analysisData && (
                <>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    isProcessing={false}
                    selectedFile={selectedFile}
                    onClear={handleClearFile}
                  />
                  
                  <div className="text-center">
                    <span className="text-muted-foreground">أو</span>
                  </div>
                  
                  <button
                    onClick={() => setShowManualInput(true)}
                    className="w-full glass-card p-6 text-center hover:border-primary/50 transition-colors"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Edit3 className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-1">إدخال النص يدوياً</h3>
                    <p className="text-sm text-muted-foreground">الصق محتوى BOQ من Excel أو Word أو PDF</p>
                  </button>
                </>
              )}

              {showManualInput && !extractedText && !analysisData && (
                <div className="glass-card p-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Edit3 className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-semibold">إدخال نص BOQ</h3>
                        <p className="text-sm text-muted-foreground">الصق محتوى جدول الكميات هنا</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClearFile}>
                      إلغاء
                    </Button>
                  </div>
                  
                  <Textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="الصق نص BOQ هنا...

مثال:
1. أعمال الحفر والردم
   - حفر عام للأساسات: 500 م³
   - ردم وتسوية: 200 م³

2. أعمال الخرسانة
   - خرسانة عادية: 100 م³
   - خرسانة مسلحة: 250 م³"
                    className="min-h-[300px] font-mono text-sm"
                    dir="auto"
                  />
                  
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">
                      {manualText.length} حرف
                    </span>
                    <Button
                      onClick={handleManualTextSubmit}
                      disabled={manualText.length < 50}
                      className="btn-gradient gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      حفظ النص
                    </Button>
                  </div>
                </div>
              )}

              {extractedText && !analysisData && (
                <div className="glass-card p-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display text-lg font-semibold">النص جاهز للتحليل</h3>
                      <p className="text-sm text-muted-foreground">
                        {extractedText.length.toLocaleString()} حرف
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleClearFile}>
                        تعديل
                      </Button>
                      <Button
                        onClick={runAnalysis}
                        disabled={isProcessing}
                        className="btn-gradient gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        بدء التحليل
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted rounded-xl p-4 max-h-48 overflow-y-auto">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono" dir="auto">
                      {extractedText.slice(0, 1000)}
                      {extractedText.length > 1000 && "..."}
                    </pre>
                  </div>
                </div>
              )}

              {analysisData && (
                <AnalysisResults data={analysisData} wbsData={wbsData} />
              )}
            </div>

            {/* Right Column - Workflow Status */}
            <div className="space-y-6">
              <WorkflowStatus steps={workflowSteps} />

              {/* Features Card */}
              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold mb-4">المميزات</h3>
                <div className="space-y-3">
                  {[
                    { icon: <FileUp className="w-4 h-4" />, text: "إدخال النص يدوياً" },
                    { icon: <Sparkles className="w-4 h-4" />, text: "تحليل بالذكاء الاصطناعي" },
                    { icon: <GitMerge className="w-4 h-4" />, text: "إنشاء WBS تلقائي" },
                    { icon: <Download className="w-4 h-4" />, text: "تصدير إلى CSV/Excel" },
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {feature.icon}
                      </div>
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {analysisData && (
                <Button
                  onClick={handleClearFile}
                  variant="outline"
                  className="w-full"
                >
                  تحليل ملف جديد
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>مدعوم بالذكاء الاصطناعي • BOQ Analyzer</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
