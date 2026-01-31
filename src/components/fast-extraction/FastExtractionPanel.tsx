import { useState } from "react";
import { Zap, X, Upload, Lightbulb, FolderOpen } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FastExtractionStepper from "@/components/FastExtractionStepper";
import FastExtractionUploader, { UploadedFile } from "@/components/FastExtractionUploader";
import FastExtractionClassifier from "@/components/FastExtractionClassifier";
import FastExtractionDrawingAnalyzer from "@/components/FastExtractionDrawingAnalyzer";
import FastExtractionProjectSelector from "@/components/FastExtractionProjectSelector";
import { ProjectFilesViewer } from "@/components/ProjectFilesViewer";

interface FastExtractionPanelProps {
  onComplete?: (projectId: string) => void;
  onCancel?: () => void;
  defaultProjectId?: string;
}

export function FastExtractionPanel({
  onComplete,
  onCancel,
  defaultProjectId,
}: FastExtractionPanelProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showProjectFiles, setShowProjectFiles] = useState(false);
  const [drawingResults, setDrawingResults] = useState<any[]>([]);

  const readyFilesCount = files.filter((f) => f.status === "success").length;
  const hasDrawingFiles = files.some(
    (f) => f.category === "drawings" && f.status === "success"
  );

  const handleUploadComplete = () => {
    // Auto-advance to classify when files are uploaded
  };

  const handleClassifyComplete = () => {
    // Check if there are drawing files to analyze
    if (hasDrawingFiles) {
      setCurrentStep(3); // Go to drawing analysis
    } else {
      setCurrentStep(4); // Skip to project selection
    }
  };

  const handleDrawingAnalysisComplete = (results: any[]) => {
    setDrawingResults(results);
    setCurrentStep(4);
  };

  const handleDrawingAnalysisSkip = () => {
    setCurrentStep(4);
  };

  const goToClassify = () => {
    if (readyFilesCount > 0) {
      setCurrentStep(2);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setDrawingResults([]);
    setCurrentStep(1);
  };

  const tips = isArabic
    ? [
        "ارفع مستندات BOQ، رسومات، عقود",
        "سيقوم الذكاء الاصطناعي بتصنيف الملفات تلقائياً",
        "يمكن استخراج الكميات من المخططات",
        "يمكنك إنشاء مشروع جديد أو الربط بمشروع موجود",
      ]
    : [
        "Upload BOQ documents, drawings, contracts",
        "AI will automatically classify the files",
        "Quantities can be extracted from drawings",
        "Create a new project or link to existing one",
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              {isArabic ? "الاستخراج السريع" : "Fast Extraction"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProjectFiles(true)}
                className="gap-1.5"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isArabic ? "ملفات المشاريع" : "Project Files"}
                </span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleReset}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isArabic ? "رفع جديد" : "New Upload"}
                </span>
              </Button>
              {onCancel && (
                <Button variant="ghost" size="icon" onClick={onCancel}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isArabic
              ? "رفع الملفات وتصنيفها بالذكاء الاصطناعي ومتابعة التقدم"
              : "Upload files, classify with AI, and track progress"}
          </p>
        </CardHeader>
      </Card>

      {/* Stepper */}
      <FastExtractionStepper
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

      {/* Content Grid */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Ready Files Counter */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">
                  {isArabic ? "الملفات الجاهزة" : "Ready Files"}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {readyFilesCount}
                </span>
              </div>
              <Button
                className="w-full gap-2"
                onClick={goToClassify}
                disabled={readyFilesCount === 0}
              >
                ✨ {isArabic ? "تصنيف الملفات" : "Classify Files"}
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">
                  {isArabic ? "نصائح" : "Tips"}
                </span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Main Area */}
        <Card className="glass-card">
          <CardContent className="p-6">
            {currentStep === 1 && (
              <FastExtractionUploader
                files={files}
                onFilesChange={setFiles}
                onUploadComplete={handleUploadComplete}
              />
            )}
            {currentStep === 2 && (
              <FastExtractionClassifier
                files={files}
                onFilesChange={setFiles}
                onComplete={handleClassifyComplete}
              />
            )}
            {currentStep === 3 && (
              <FastExtractionDrawingAnalyzer
                files={files}
                onComplete={handleDrawingAnalysisComplete}
                onSkip={handleDrawingAnalysisSkip}
              />
            )}
            {currentStep === 4 && (
              <FastExtractionProjectSelector
                files={files}
                drawingResults={drawingResults}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Files Viewer */}
      <ProjectFilesViewer
        isOpen={showProjectFiles}
        onClose={() => setShowProjectFiles(false)}
      />
    </div>
  );
}

export default FastExtractionPanel;
