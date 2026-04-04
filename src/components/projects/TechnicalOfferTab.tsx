import { useState, useEffect } from "react";
import { Sparkles, CloudUpload, FileText, ArrowLeft, Loader2, Search, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TechnicalOfferSections } from "./TechnicalOfferSections";

type Step = "main" | "select-project" | "select-sections";

interface SavedProject {
  id: string;
  name: string;
  created_at: string;
}

export function TechnicalOfferTab() {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("main");
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<SavedProject | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("saved_projects")
      .select("id, name, created_at")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  const handleStartAI = () => {
    setStep("select-project");
    loadProjects();
  };

  const handleSelectProject = (project: SavedProject) => {
    setSelectedProject(project);
    setStep("select-sections");
  };

  const filtered = projects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (step === "select-sections" && selectedProject) {
    return (
      <TechnicalOfferSections
        projectId={selectedProject.id}
        projectName={selectedProject.name}
        onBack={() => setStep("select-project")}
      />
    );
  }

  if (step === "select-project") {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep("main")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold">
            {isArabic ? "اختر المشروع" : "Select Project"}
          </h2>
        </div>

        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? "ابحث عن مشروع..." : "Search projects..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects found"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(project => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-start"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString(isArabic ? "ar-SA" : "en-US")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
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

      <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center space-y-4 hover:border-primary/60 transition-colors bg-primary/5">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold">
          {isArabic ? "إنشاء كامل بالذكاء الاصطناعي" : "Full AI Creation"}
        </h3>
        <p className="text-muted-foreground text-sm">
          {isArabic ? "دع الذكاء الاصطناعي يُنشئ عرضك الفني الكامل" : "Let AI create your complete technical offer"}
        </p>
        <Button size="lg" className="px-10" onClick={handleStartAI}>
          {isArabic ? "ابدأ الآن" : "Start Now"}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-border" />
        <span className="text-sm text-muted-foreground">{isArabic ? "أو" : "or"}</span>
        <div className="flex-1 border-t border-border" />
      </div>

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
          {isArabic ? "ارفع مستند طلب العروض أو كراسة الشروط وسيقوم الذكاء الاصطناعي بتحليله" : "Upload an RFP or specifications document and AI will analyze it"}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-border" />
        <span className="text-sm text-muted-foreground">{isArabic ? "أو" : "or"}</span>
        <div className="flex-1 border-t border-border" />
      </div>

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
          {isArabic ? "سيقوم الذكاء الاصطناعي باستخراج بيانات شركتك وملء مكتبة الشركة تلقائياً" : "AI will extract your company data and auto-fill the company library"}
        </p>
      </div>
    </div>
  );
}
