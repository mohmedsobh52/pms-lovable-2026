import { useState, useEffect, useRef } from "react";
import { Save, Loader2, AlertCircle, CheckCircle2, Replace, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SaveProjectDialogProps {
  analysisData: any;
  wbsData: any;
  fileName?: string;
  onSaved?: (projectId: string) => void;
}

export function SaveProjectDialog({
  analysisData,
  wbsData,
  fileName,
  onSaved,
}: SaveProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameChecked, setNameChecked] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [existingProjectIds, setExistingProjectIds] = useState<{ savedId?: string; dataId?: string }>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced name uniqueness check
  useEffect(() => {
    const trimmed = projectName.trim();
    if (!trimmed || !user) {
      setNameExists(false);
      setNameChecked(false);
      setExistingProjectIds({});
      return;
    }

    setIsCheckingName(true);
    setNameChecked(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data: saved } = await supabase
          .from("saved_projects")
          .select("id")
          .eq("user_id", user.id)
          .ilike("name", trimmed)
          .limit(1);

        const { data: proj } = await supabase
          .from("project_data")
          .select("id")
          .eq("user_id", user.id)
          .ilike("name", trimmed)
          .limit(1);

        const exists = (saved && saved.length > 0) || (proj && proj.length > 0);
        setNameExists(exists);
        setExistingProjectIds({
          savedId: saved?.[0]?.id,
          dataId: proj?.[0]?.id,
        });
      } catch {
        setNameExists(false);
      } finally {
        setIsCheckingName(false);
        setNameChecked(true);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [projectName, user]);

  const handleSaveClick = () => {
    if (!user) {
      toast({ title: "يجب تسجيل الدخول", variant: "destructive" });
      return;
    }
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      toast({ title: "اسم المشروع مطلوب", variant: "destructive" });
      return;
    }

    if (nameExists) {
      setShowOverwriteDialog(true);
    } else {
      doSave(trimmedName);
    }
  };

  const handleOverwriteAndDelete = async () => {
    setShowOverwriteDialog(false);
    const trimmedName = projectName.trim();
    setIsSaving(true);
    try {
      // Soft delete old project (move to recycle bin instead of hard delete)
      const idToDelete = existingProjectIds.savedId || existingProjectIds.dataId;
      if (idToDelete) {
        const now = new Date().toISOString();
        await Promise.all([
          supabase.from("saved_projects").update({ is_deleted: true, deleted_at: now }).eq("id", idToDelete),
          supabase.from("project_data").update({ is_deleted: true, deleted_at: now }).eq("id", idToDelete),
        ]);
      }
      await doSave(trimmedName);
    } catch (error: any) {
      toast({ title: "خطأ في استبدال المشروع", description: error.message, variant: "destructive" });
      setIsSaving(false);
    }
  };

  const handleSaveWithNewName = () => {
    setShowOverwriteDialog(false);
    const timestamp = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const newName = `${projectName.trim()} (${timestamp})`;
    setProjectName(newName);
    doSave(newName);
  };

  const doSave = async (name: string) => {
    if (!user) return;
    setIsSaving(true);

    try {
      const items = analysisData?.items || [];
      const totalValue = analysisData?.summary?.total_value ||
        items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
      const itemsCount = items.length;

      const { data: pdData, error: pdError } = await supabase
        .from("project_data")
        .insert({
          user_id: user.id,
          name,
          file_name: fileName || null,
          analysis_data: analysisData,
          wbs_data: wbsData,
          total_value: totalValue,
          items_count: itemsCount,
          currency: analysisData?.summary?.currency || "SAR",
        })
        .select("id")
        .single();

      if (pdError) throw pdError;

      const projectId = pdData.id;

      const { error: spError } = await supabase
        .from("saved_projects")
        .upsert({
          id: projectId,
          user_id: user.id,
          name,
          file_name: fileName || null,
          analysis_data: analysisData,
          wbs_data: wbsData,
        }, { onConflict: 'id' });

      if (spError) {
        console.error("saved_projects upsert error:", spError.message);
        throw spError;
      }

      if (items.length > 0) {
        const projectItems = items.map((item: any, index: number) => ({
          project_id: projectId,
          item_number: item.item_number || `${index + 1}`,
          description: item.description || item.item_description || "",
          description_ar: item.description_ar || null,
          unit: item.unit || null,
          quantity: item.quantity || null,
          unit_price: item.unit_price || null,
          total_price: item.total_price || null,
          category: item.category || null,
          sort_order: index,
        }));

        for (let i = 0; i < projectItems.length; i += 50) {
          const batch = projectItems.slice(i, i + 50);
          const { error: itemsError } = await supabase
            .from("project_items")
            .insert(batch);
          if (itemsError) {
            console.warn("project_items batch insert warning:", itemsError.message);
          }
        }
      }

      toast({ title: "✅ تم حفظ المشروع بنجاح" });
      setOpen(false);
      setProjectName("");
      onSaved?.(projectId);
    } catch (error: any) {
      toast({
        title: "خطأ في حفظ المشروع",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = projectName.trim().length > 0 && !isCheckingName && !isSaving;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Save className="w-4 h-4" />
            حفظ المشروع
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حفظ المشروع</DialogTitle>
            <DialogDescription>
              أدخل اسماً للمشروع لحفظه واسترجاعه لاحقاً
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">اسم المشروع</Label>
              <div className="relative">
                <Input
                  id="project-name"
                  placeholder="مشروع بناء..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={nameExists ? "border-yellow-500 pr-10" : nameChecked && projectName.trim() && !nameExists ? "border-green-500 pr-10" : ""}
                />
                {isCheckingName && (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {nameChecked && projectName.trim() && !isCheckingName && nameExists && (
                  <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
                )}
                {nameChecked && projectName.trim() && !isCheckingName && !nameExists && (
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              {nameExists && (
                <p className="text-sm text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  يوجد مشروع بهذا الاسم - يمكنك الاستبدال أو الحفظ باسم جديد
                </p>
              )}
            </div>
            {fileName && (
              <p className="text-sm text-muted-foreground">الملف: {fileName}</p>
            )}
            {analysisData?.items?.length > 0 && (
              <p className="text-sm text-muted-foreground">
                عدد البنود: {analysisData.items.length} |
                القيمة: {(analysisData.summary?.total_value || 0).toLocaleString()} {analysisData.summary?.currency || "SAR"}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={!canSave}
              className="btn-gradient gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>يوجد مشروع بنفس الاسم</AlertDialogTitle>
            <AlertDialogDescription>
              المشروع "<strong>{projectName.trim()}</strong>" موجود بالفعل. ماذا تريد أن تفعل؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowOverwriteDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={handleSaveWithNewName}
            >
              <FilePlus className="w-4 h-4" />
              حفظ باسم جديد
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleOverwriteAndDelete}
              title="سيتم نقل المشروع القديم إلى سلة المحذوفات"
            >
              <Replace className="w-4 h-4" />
              استبدال وحذف القديم
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
