import { useState, useEffect } from "react";
import { AnalysisResults } from "@/components/AnalysisResults";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Upload, FolderOpen, FileSpreadsheet, Clock, ChevronRight } from "lucide-react";
import { BOQUploadDialog } from "@/components/project-details/BOQUploadDialog";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const BOQItemsPage = () => {
  const { analysisData, wbsData, setAnalysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    if (!analysisData && user) {
      setLoadingRecent(true);
      supabase
        .from("saved_projects")
        .select("id, name, file_name, analysis_data, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(4)
        .then(({ data }) => {
          setRecentProjects(data || []);
          setLoadingRecent(false);
        });
    }
  }, [analysisData, user]);

  const handleApplyRate = (itemNumber: string, rate: number) => {
    if (!analysisData?.items) return;
    const updatedItems = analysisData.items.map((item: any) => {
      if (item.item_number === itemNumber) {
        return { ...item, unit_price: rate, total_price: (item.quantity || 1) * rate };
      }
      return item;
    });
    setAnalysisData({ ...analysisData, items: updatedItems });
  };

  const handleOpenProject = (project: any) => {
    if (project.analysis_data) {
      setAnalysisData({
        ...project.analysis_data,
        file_name: project.file_name || project.name,
      });
    }
  };

  if (!analysisData) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-12 gap-8 max-w-2xl mx-auto px-4">
          {/* Icon + title */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">
              {isArabic ? "بنود جدول الكميات" : "BOQ Items"}
            </h2>
            <p className="text-muted-foreground">
              {isArabic
                ? "لا توجد بيانات تحليل. ارفع ملف BOQ أو افتح مشروعاً محفوظاً."
                : "No analysis data. Upload a BOQ file or open a saved project."}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <Button size="lg" className="flex-1 gap-2" onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-5 h-5" />
              {isArabic ? "رفع ملف BOQ" : "Upload BOQ File"}
            </Button>
            <Button size="lg" variant="outline" className="flex-1 gap-2" asChild>
              <Link to="/projects">
                <FolderOpen className="w-5 h-5" />
                {isArabic ? "فتح مشروع" : "Open Project"}
              </Link>
            </Button>
          </div>

          {/* Recent Projects */}
          <div className="w-full max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                {isArabic ? "المشاريع الأخيرة" : "Recent Projects"}
              </h3>
            </div>

            {loadingRecent ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-[68px] rounded-lg" />
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isArabic ? "لا توجد مشاريع محفوظة بعد" : "No saved projects yet"}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentProjects.map((project) => {
                  const itemCount = project.analysis_data?.items?.length || 0;
                  const hasData = itemCount > 0;
                  return (
                    <div
                      key={project.id}
                      className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {hasData
                            ? `${itemCount} ${isArabic ? "بند" : "items"}`
                            : isArabic ? "لا توجد بنود" : "No items"}
                        </p>
                      </div>
                      {hasData ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 ms-3 shrink-0"
                          onClick={() => handleOpenProject(project)}
                        >
                          {isArabic ? "فتح" : "Open"}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="ms-3 shrink-0" asChild>
                          <Link to={`/projects/${project.id}`}>
                            {isArabic ? "عرض" : "View"}
                          </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {recentProjects.length > 0 && (
              <div className="text-center mt-3">
                <Button variant="link" size="sm" asChild className="text-muted-foreground">
                  <Link to="/projects">
                    {isArabic ? "عرض جميع المشاريع" : "View all projects"}
                    <ChevronRight className="w-3.5 h-3.5 ms-1" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        <BOQUploadDialog
          open={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          isArabic={isArabic}
          onSuccess={() => setShowUploadDialog(false)}
          onSuccessWithData={(data) => {
            setAnalysisData(data);
            setShowUploadDialog(false);
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <AnalysisResults
        data={analysisData}
        wbsData={wbsData}
        onApplyRate={handleApplyRate}
        fileName={(analysisData as any)?.file_name}
      />
    </PageLayout>
  );
};

export default BOQItemsPage;
