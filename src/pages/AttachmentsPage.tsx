import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { ProjectAttachments } from "@/components/ProjectAttachments";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Paperclip, FolderOpen, Upload, BarChart3 } from "lucide-react";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";

interface Project {
  id: string;
  name: string;
}

const AttachmentsPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("project");
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    projectIdFromUrl || undefined
  );

  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from("project_data")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (!error && data) {
        setProjects(data);
      }
    };

    fetchProjects();
  }, [user]);

  useEffect(() => {
    if (projectIdFromUrl) {
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [projectIdFromUrl]);

  const handleProjectChange = (value: string) => {
    if (value === "all") {
      setSelectedProjectId(undefined);
      setSearchParams({});
    } else {
      setSelectedProjectId(value);
      setSearchParams({ project: value });
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8" dir={isArabic ? "rtl" : "ltr"}>
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Paperclip className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  {isArabic ? "مرفقات المشروع" : "Project Attachments"}
                  {selectedProject && (
                    <Badge variant="secondary" className="text-sm font-normal">
                      {selectedProject.name}
                    </Badge>
                  )}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isArabic 
                    ? "رفع وإدارة جميع ملفات ومستندات المشروع"
                    : "Upload and manage all project files and documents"
                  }
                </p>
              </div>
            </div>

            {/* Project Filter */}
            <div className="w-full sm:w-64">
              <Select
                value={selectedProjectId || "all"}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isArabic ? "جميع المشاريع" : "All Projects"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isArabic ? "جميع المشاريع" : "All Projects"}
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Smart Suggestions */}
        {(() => {
          const suggestions: SmartSuggestion[] = [];
          if (!selectedProjectId && projects.length > 0) {
            suggestions.push({
              id: 'select-project',
              icon: <FolderOpen className="h-4 w-4" />,
              text: isArabic ? 'اختر مشروعاً لعرض مرفقاته وإدارة ملفاته' : 'Select a project to view and manage its attachments',
              action: () => {},
              actionLabel: isArabic ? 'اختيار' : 'Select',
            });
          }
          if (projects.length === 0) {
            suggestions.push({
              id: 'no-projects',
              icon: <Upload className="h-4 w-4" />,
              text: isArabic ? 'لا توجد مشاريع — أنشئ مشروعاً جديداً وارفع ملفات BOQ' : 'No projects yet — create a new project and upload BOQ files',
              action: () => navigate('/projects/new'),
              actionLabel: isArabic ? 'مشروع جديد' : 'New Project',
            });
          }
          if (selectedProjectId) {
            suggestions.push({
              id: 'analyze-files',
              icon: <BarChart3 className="h-4 w-4" />,
              text: isArabic ? 'حلّل الملفات المرفقة باستخدام الذكاء الاصطناعي لاستخراج البيانات' : 'Analyze attached files with AI to extract data',
              action: () => navigate('/drawing-analysis'),
              actionLabel: isArabic ? 'تحليل' : 'Analyze',
            });
          }
          return suggestions.length > 0 ? <SmartSuggestionsBanner suggestions={suggestions} /> : null;
        })()}

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {isArabic ? "إدارة الملفات" : "File Management"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ProjectAttachments projectId={selectedProjectId} />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default AttachmentsPage;
