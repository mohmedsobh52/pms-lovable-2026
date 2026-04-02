import { useState, useEffect } from "react";
import { Sparkles, CloudUpload, FileText, Loader2, FolderOpen, CheckCircle2, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { TechnicalOfferSections } from "./TechnicalOfferSections";

interface SavedProject {
  id: string;
  name: string;
  created_at: string;
  total_items?: number;
}

type Step = "main" | "select-project" | "select-sections";

export function TechnicalOfferTab() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("main");
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<SavedProject | null>(null);

  useEffect(() => {
    if (step === "select-project" && user) {
      loadProjects();
    }
  }, [step, user]);

  const loadProjects = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("saved_projects")
        .select("id, name, created_at")
        .eq("is_deleted", false)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        // Get item counts
        const projectsWithCounts = await Promise.all(
          data.map(async (p) => {
            const { count } = await supabase
              .from("project_items")
              .select("*", { count: "exact", head: true })
              .eq("project_id", p.id);
            return { ...p, total_items: count || 0 };
          })
        );
        setProjects(projectsWithCounts);
      }
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectSelect = (project: SavedProject) => {
    setSelectedProject(project);
  };

  const handleContinueToSections = () => {
    if (selectedProject) {
      setStep("select-sections");
    }
  };

  // Step 3: Section selection
  if (step === "select-sections" && selectedProject) {
    return (
      <TechnicalOfferSections
        onBack={() => setStep("select-project")}
        projectId={selectedProject.id}
        projectName={selectedProject.name}
      />
    );
  }

  // Step 2: Project selection
  if (step === "select-project") {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">
            {isArabic ? "اختر المشروع" : "Select Project"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isArabic
              ? "اختر المشروع الذي تريد إنشاء العرض الفني له"
              : "Choose the project you want to create a technical offer for"}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? "ابحث عن مشروع..." : "Search projects..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Projects List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ms-2 text-muted-foreground text-sm">
              {isArabic ? "جارٍ تحميل المشاريع..." : "Loading projects..."}
            </span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">
              {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects found"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pe-1">
            {filteredProjects.map((project) => {
              const isSelected = selectedProject?.id === project.id;
              return (
                <div
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {project.total_items} {isArabic ? "بند" : "items"} • {new Date(project.created_at).toLocaleDateString(isArabic ? "ar-SA" : "en-US")}
                    </p>
                  </div>
                  {isSelected && (
                    <Badge variant="default" className="shrink-0 text-xs">
                      {isArabic ? "محدد" : "Selected"}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <Button
            size="lg"
            className="px-12"
            onClick={handleContinueToSections}
            disabled={!selectedProject}
          >
            {isArabic ? "متابعة" : "Continue"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setStep("main"); setSelectedProject(null); }}>
            <ArrowLeft className="w-4 h-4 me-1" />
            {isArabic ? "رجوع" : "Back"}
          </Button>
        </div>
      </div>
    );
  }

  // Step 1: Main options
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
          {isArabic
            ? "دع الذكاء الاصطناعي يُنشئ عرضك الفني الكامل"
            : "Let AI create your complete technical offer"}
        </p>
        <Button size="lg" className="px-10" onClick={() => setStep("select-project")}>
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
          {isArabic
            ? "ارفع مستند طلب العروض أو كراسة الشروط وسيقوم الذكاء الاصطناعي بتحليله"
            : "Upload an RFP or specifications document and AI will analyze it"}
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
          {isArabic
            ? "سيقوم الذكاء الاصطناعي باستخراج بيانات شركتك وملء مكتبة الشركة تلقائياً"
            : "AI will extract your company data and auto-fill the company library"}
        </p>
      </div>
    </div>
  );
}
