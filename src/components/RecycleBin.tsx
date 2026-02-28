import { useState, useEffect } from "react";
import { Trash2, RotateCcw, Loader2, Clock, AlertTriangle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

interface DeletedProject {
  id: string;
  name: string;
  file_name: string | null;
  deleted_at: string;
  created_at: string;
  items_count?: number;
}

interface RecycleBinProps {
  onRestored: () => void;
}

export function RecycleBin({ onRestored }: RecycleBinProps) {
  const [deletedProjects, setDeletedProjects] = useState<DeletedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [isDeletingPermanently, setIsDeletingPermanently] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isArabic } = useLanguage();

  const fetchDeletedProjects = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_projects")
        .select("id, name, file_name, deleted_at, created_at, analysis_data")
        .eq("user_id", user.id)
        .eq("is_deleted", true)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;

      const projects = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        file_name: p.file_name,
        deleted_at: p.deleted_at,
        created_at: p.created_at,
        items_count: p.analysis_data?.items?.length || 0,
      }));

      // Filter out projects older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      setDeletedProjects(projects.filter(p => new Date(p.deleted_at) > thirtyDaysAgo));
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في تحميل المحذوفات" : "Error loading deleted projects",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedProjects();
  }, [user]);

  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted);
    expiry.setDate(expiry.getDate() + 30);
    const now = new Date();
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await Promise.all([
        supabase.from("saved_projects").update({ is_deleted: false, deleted_at: null }).eq("id", id),
        supabase.from("project_data").update({ is_deleted: false, deleted_at: null }).eq("id", id),
      ]);

      toast({
        title: isArabic ? "تم استعادة المشروع بنجاح" : "Project restored successfully",
      });

      if (user) sessionStorage.removeItem(`pms_projects_${user.id}`);
      fetchDeletedProjects();
      onRestored();
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في الاستعادة" : "Error restoring",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteId) return;
    const project = deletedProjects.find(p => p.id === permanentDeleteId);
    if (!project) return;

    const expectedConfirm = isArabic ? "حذف نهائي" : "DELETE";
    if (confirmName !== expectedConfirm) {
      toast({
        title: isArabic ? "نص التأكيد غير صحيح" : "Confirmation text incorrect",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingPermanently(true);
    try {
      const id = permanentDeleteId;

      // Cascading hard delete
      const { data: projectItems } = await supabase
        .from("project_items")
        .select("id")
        .eq("project_id", id);

      const itemIds = (projectItems || []).map((i: any) => i.id);

      if (itemIds.length > 0) {
        await supabase.from("item_costs").delete().in("project_item_id", itemIds);
        await supabase.from("item_pricing_details").delete().in("project_item_id", itemIds);
      }

      await supabase.from("edited_boq_prices").delete().or(`project_id.eq.${id},saved_project_id.eq.${id}`);
      await supabase.from("project_items").delete().eq("project_id", id);
      await supabase.from("project_data").delete().eq("id", id);
      await supabase.from("saved_projects").delete().eq("id", id);

      toast({
        title: isArabic ? "تم الحذف النهائي" : "Permanently deleted",
      });

      setPermanentDeleteId(null);
      setConfirmName("");
      fetchDeletedProjects();
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في الحذف" : "Error deleting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingPermanently(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (deletedProjects.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Trash2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">
          {isArabic ? "سلة المحذوفات فارغة" : "Recycle bin is empty"}
        </h3>
        <p className="text-muted-foreground text-sm">
          {isArabic ? "المشاريع المحذوفة تظهر هنا لمدة 30 يوم قبل الحذف النهائي" : "Deleted projects appear here for 30 days before permanent deletion"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 bg-amber-500/5 border-amber-500/20">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="font-medium">
            {isArabic 
              ? `${deletedProjects.length} مشروع في سلة المحذوفات — يتم حذفها نهائياً بعد 30 يوم`
              : `${deletedProjects.length} project(s) in recycle bin — permanently deleted after 30 days`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deletedProjects.map((project) => {
          const daysRemaining = getDaysRemaining(project.deleted_at);
          return (
            <div key={project.id} className="glass-card p-5 border-dashed opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold truncate">{project.name}</h3>
                </div>
                <Badge 
                  variant={daysRemaining <= 5 ? "destructive" : "secondary"} 
                  className="shrink-0 text-xs"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {daysRemaining} {isArabic ? "يوم" : "days"}
                </Badge>
              </div>

              {project.file_name && (
                <p className="text-xs text-muted-foreground mb-2 truncate">{project.file_name}</p>
              )}

              <p className="text-xs text-muted-foreground mb-4">
                {isArabic ? "حُذف في" : "Deleted"}: {new Date(project.deleted_at).toLocaleDateString(isArabic ? "ar-SA" : "en-US")}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleRestore(project.id)}
                  disabled={restoringId === project.id}
                >
                  {restoringId === project.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  {isArabic ? "استعادة" : "Restore"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive gap-2"
                  onClick={() => {
                    setPermanentDeleteId(project.id);
                    setConfirmName("");
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  {isArabic ? "حذف نهائي" : "Delete"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={!!permanentDeleteId} onOpenChange={(open) => { if (!open) { setPermanentDeleteId(null); setConfirmName(""); } }}>
        <AlertDialogContent dir={isArabic ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {isArabic ? "حذف نهائي - لا يمكن التراجع" : "Permanent Delete - Cannot Undo"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {isArabic
                  ? `سيتم حذف "${deletedProjects.find(p => p.id === permanentDeleteId)?.name}" وجميع بياناته نهائياً.`
                  : `"${deletedProjects.find(p => p.id === permanentDeleteId)?.name}" and all its data will be permanently deleted.`}
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isArabic ? 'اكتب "حذف نهائي" للتأكيد:' : 'Type "DELETE" to confirm:'}
                </p>
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={isArabic ? "حذف نهائي" : "DELETE"}
                  className="border-destructive/50"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeletingPermanently}>
              {isArabic ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={isDeletingPermanently || confirmName !== (isArabic ? "حذف نهائي" : "DELETE")}
            >
              {isDeletingPermanently ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isArabic ? "حذف نهائي" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
