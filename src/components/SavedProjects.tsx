import { useState, useEffect, useMemo } from "react";
import { FolderOpen, Trash2, Loader2, Calendar, FileText, Sparkles, Pencil, Check, X, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PROJECT_STATUSES, getStatusInfo } from "@/lib/project-constants";

interface SavedProject {
  id: string;
  name: string;
  file_name: string | null;
  analysis_data: any;
  wbs_data: any;
  created_at: string;
  status: string | null;
  has_ai_rates?: boolean;
}

interface SavedProjectsProps {
  onLoadProject: (analysisData: any, wbsData: any, projectId?: string) => void;
}

export function SavedProjects({ onLoadProject }: SavedProjectsProps) {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { user } = useAuth();
  const { toast } = useToast();
  const { isArabic } = useLanguage();

  const fetchProjects = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from("saved_projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      const projectsWithRates = (projectsData || []).map((project) => {
        const analysisData = project.analysis_data as { items?: Array<{ aiSuggestedRate?: number }> } | null;
        const hasAiRates = analysisData?.items?.some(
          (item) => item.aiSuggestedRate && item.aiSuggestedRate > 0
        );
        return { ...project, has_ai_rates: hasAiRates || false };
      });

      setProjects(projectsWithRates);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast({
        title: isArabic ? "خطأ في تحميل المشاريع" : "Error loading projects",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const filteredProjects = useMemo(() => {
    let filtered = projects;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => (p.status || "draft") === statusFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.file_name && p.file_name.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [projects, statusFilter, searchQuery]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("saved_projects")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: isArabic ? "خطأ في حذف المشروع" : "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: isArabic ? "تم حذف المشروع" : "Project deleted",
      });
      fetchProjects();
    }
  };

  const handleStartEdit = (project: SavedProject) => {
    setEditingId(project.id);
    setEditName(project.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "اسم المشروع لا يمكن أن يكون فارغاً" : "Project name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("saved_projects")
        .update({ 
          name: editName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: isArabic ? "تم تحديث اسم المشروع" : "Project name updated",
      });
      setEditingId(null);
      setEditName("");
      fetchProjects();
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في تحديث الاسم" : "Error updating name",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("saved_projects")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", projectId);

      if (error) throw error;
      
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, status: newStatus } : p
      ));
      
      const statusInfo = getStatusInfo(newStatus);
      toast({
        title: isArabic 
          ? `تم تحديث الحالة إلى: ${statusInfo.label}` 
          : `Status updated to: ${statusInfo.label_en}`,
      });
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في تحديث الحالة" : "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      handleSaveEdit(id);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleLoad = async (project: SavedProject) => {
    const analysisData = project.analysis_data;
    
    try {
      const { data: projectItems } = await supabase
        .from("project_items")
        .select("id, item_number")
        .eq("project_id", project.id);

      if (projectItems && projectItems.length > 0 && analysisData?.items) {
        let syncedCount = 0;
        
        for (const projectItem of projectItems) {
          const analysisItem = analysisData.items.find(
            (item: any) => item.itemNo === projectItem.item_number || 
                          item.item_number === projectItem.item_number
          );
          
          if (analysisItem?.aiSuggestedRate && analysisItem.aiSuggestedRate > 0) {
            const { error } = await supabase
              .from("item_costs")
              .upsert({
                project_item_id: projectItem.id,
                ai_suggested_rate: analysisItem.aiSuggestedRate
              }, { onConflict: 'project_item_id' });
            
            if (!error) syncedCount++;
          }
        }
        
        if (syncedCount > 0) {
          console.log(`Synced ${syncedCount} AI rates to item_costs`);
        }
      }
    } catch (error) {
      console.error("Error syncing AI rates:", error);
    }

    onLoadProject(analysisData, project.wbs_data, project.id);
    toast({
      title: isArabic ? "تم تحميل المشروع" : "Project loaded",
      description: project.name,
    });
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">
          {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
        <FolderOpen className="w-5 h-5 text-primary" />
        {isArabic ? "المشاريع المحفوظة" : "Saved Projects"}
      </h3>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? "البحث..." : "Search..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 h-8">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder={isArabic ? "الحالة" : "Status"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
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
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-2">
        {isArabic 
          ? `${filteredProjects.length} من ${projects.length}`
          : `${filteredProjects.length} of ${projects.length}`
        }
      </p>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {filteredProjects.map((project) => {
          const statusInfo = getStatusInfo(project.status);
          
          return (
            <div
              key={project.id}
              className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {editingId === project.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, project.id)}
                        className="h-8 text-sm"
                        autoFocus
                        disabled={isSaving}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveEdit(project.id)}
                        disabled={isSaving}
                        className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{project.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(project)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {project.file_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <FileText className="w-3 h-3" />
                      {project.file_name}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(project.created_at).toLocaleDateString(isArabic ? "ar-SA" : "en-US")}
                    </p>
                    {project.has_ai_rates && (
                      <Badge variant="secondary" className="gap-1 text-xs px-1.5 py-0 h-5">
                        <Sparkles className="w-3 h-3 text-primary" />
                        AI
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-1 items-end sm:items-center">
                  {/* Status Selector */}
                  <Select 
                    value={project.status || "draft"} 
                    onValueChange={(value) => handleStatusChange(project.id, value)}
                  >
                    <SelectTrigger className="w-28 h-7 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`} />
                        <span>{isArabic ? statusInfo.label : statusInfo.label_en}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
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

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLoad(project)}
                      className="text-primary h-7 text-xs"
                    >
                      {isArabic ? "فتح" : "Open"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive h-7 w-7 p-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir={isArabic ? "rtl" : "ltr"}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {isArabic ? "حذف المشروع" : "Delete Project"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {isArabic 
                              ? `هل أنت متأكد من حذف "${project.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                              : `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
                            }
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel>
                            {isArabic ? "إلغاء" : "Cancel"}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(project.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            {isArabic ? "حذف" : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
