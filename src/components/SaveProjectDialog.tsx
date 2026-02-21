import { useState, useEffect, useRef } from "react";
import { Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const { user } = useAuth();
  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced name uniqueness check
  useEffect(() => {
    const trimmed = projectName.trim();
    if (!trimmed || !user) {
      setNameExists(false);
      setNameChecked(false);
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

  const saveProject = async () => {
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
      toast({ title: "هذا الاسم مستخدم بالفعل، اختر اسماً آخر", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const items = analysisData?.items || [];
      const totalValue = analysisData?.summary?.total_value || 
        items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
      const itemsCount = items.length;

      // 1. Create in project_data
      const { data: pdData, error: pdError } = await supabase
        .from("project_data")
        .insert({
          user_id: user.id,
          name: trimmedName,
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

      // 2. Create in saved_projects
      const { error: spError } = await supabase
        .from("saved_projects")
        .insert({
          id: projectId,
          user_id: user.id,
          name: trimmedName,
          file_name: fileName || null,
          analysis_data: analysisData,
          wbs_data: wbsData,
        });

      if (spError) {
        console.warn("saved_projects insert warning:", spError.message);
      }

      // 3. Create project_items
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

        // Insert in batches of 50
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

  const canSave = projectName.trim().length > 0 && !nameExists && !isCheckingName && !isSaving;

  return (
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
            أدخل اسماً فريداً للمشروع لحفظه واسترجاعه لاحقاً
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
                className={nameExists ? "border-destructive pr-10" : nameChecked && projectName.trim() && !nameExists ? "border-green-500 pr-10" : ""}
              />
              {isCheckingName && (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {nameChecked && projectName.trim() && !isCheckingName && nameExists && (
                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
              {nameChecked && projectName.trim() && !isCheckingName && !nameExists && (
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
            {nameExists && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                هذا الاسم مستخدم بالفعل، اختر اسماً آخر
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
            onClick={saveProject}
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
  );
}
