import { Check } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

const steps: Step[] = [
  { id: 1, labelEn: "Upload", labelAr: "رفع", descriptionEn: "Drag and drop", descriptionAr: "اسحب وأفلت" },
  { id: 2, labelEn: "Classify", labelAr: "تصنيف", descriptionEn: "Upload multiple files", descriptionAr: "رفع ملفات متعددة" },
  { id: 3, labelEn: "Project", labelAr: "المشروع", descriptionEn: "Choose project", descriptionAr: "اختر المشروع" },
];

interface FastExtractionStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function FastExtractionStepper({ currentStep, onStepClick }: FastExtractionStepperProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-center gap-0">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = step.id <= currentStep;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle and Content */}
              <button
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center gap-2 min-w-[120px] transition-all",
                  isClickable && "cursor-pointer hover:opacity-80",
                  !isClickable && "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary bg-primary/10 text-primary",
                    !isCompleted && !isCurrent && "border-muted-foreground/30 bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : step.id}
                </div>
                <div className="text-center">
                  <p className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {isArabic ? step.labelAr : step.labelEn}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? step.descriptionAr : step.descriptionEn}
                  </p>
                </div>
              </button>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-16 h-0.5 mx-2",
                    currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
