import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportTab } from "@/components/reports/ExportTab";
import { ProjectSummaryTab } from "@/components/reports/ProjectSummaryTab";
import { RecentProjectsTab } from "@/components/reports/RecentProjectsTab";
import { ProjectsComparisonExport } from "@/components/reports/ProjectsComparisonExport";
import { ReportsStatCards } from "@/components/reports/ReportsStatCards";
import { RefreshCw, Filter } from "lucide-react";
import { PROJECT_STATUSES } from "@/lib/project-constants";

interface Project {
  id: string;
  name: string;
  file_name?: string;
  analysis_data: any;
  status?: string;
  created_at: string;
  updated_at: string;
}

const ReportsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_projects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleDeleteProject = async (projectId: string) => {
    const { error } = await supabase
      .from("saved_projects")
      .delete()
      .eq("id", projectId);

    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  const filteredProjects = useMemo(() => {
    if (statusFilter === "all") return projects;
    return projects.filter(p => (p.status || "draft") === statusFilter);
  }, [projects, statusFilter]);

  // Calculate stats from all projects (not filtered)
  const stats = {
    totalProjects: projects.length,
    inProgressProjects: projects.filter(p => p.status === "in_progress").length,
    completedProjects: projects.filter(p => p.status === "completed").length,
    draftProjects: projects.filter(p => !p.status || p.status === "draft").length,
    pendingProjects: projects.filter(p => p.status === "suspended").length,
    totalBOQValue: projects.reduce((sum, p) => {
      const value = p.analysis_data?.summary?.total_value || 
                   p.analysis_data?.totalValue || 
                   0;
      return sum + value;
    }, 0),
  };

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            {isArabic ? "التقارير" : "Reports"}
          </h1>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={isArabic ? "الحالة" : "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الحالات" : "All Status"}</SelectItem>
                {PROJECT_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                      {isArabic ? status.label : status.label_en}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchProjects} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <ReportsStatCards 
          totalProjects={stats.totalProjects}
          inProgressProjects={stats.inProgressProjects}
          completedProjects={stats.completedProjects}
          draftProjects={stats.draftProjects}
          pendingProjects={stats.pendingProjects}
          totalBOQValue={stats.totalBOQValue}
        />

        <Tabs defaultValue="export" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="export">
              {isArabic ? "التصدير" : "Export"}
            </TabsTrigger>
            <TabsTrigger value="comparison">
              {isArabic ? "مقارنة الأسعار" : "Price Comparison"}
            </TabsTrigger>
            <TabsTrigger value="summary">
              {isArabic ? "ملخص المشاريع" : "Project Summary"}
            </TabsTrigger>
            <TabsTrigger value="recent">
              {isArabic ? "المشاريع الأخيرة" : "Recent Projects"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="mt-4">
            <ExportTab projects={filteredProjects} isLoading={loading} />
          </TabsContent>

          <TabsContent value="comparison" className="mt-4">
            <ProjectsComparisonExport projects={filteredProjects} />
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <ProjectSummaryTab projects={filteredProjects} />
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
            <RecentProjectsTab 
              projects={filteredProjects} 
              onDeleteProject={handleDeleteProject}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default ReportsPage;
