import { useState } from "react";
import { Save, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CostInputs, CalculatedCosts, ItemCostData } from "@/hooks/useDynamicCostCalculator";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
  notes?: string;
}

interface SaveProjectButtonProps {
  items: BOQItem[];
  wbsData?: any;
  summary?: {
    total_items: number;
    total_value?: number;
    categories: string[];
    currency?: string;
  };
  getItemCostData: (itemId: string) => ItemCostData;
  getItemCalculatedCosts: (itemId: string) => CalculatedCosts & { aiSuggestedRate?: number };
  fileName?: string;
  isArabic?: boolean;
  savedProjectId?: string;
}

export function SaveProjectButton({
  items,
  wbsData,
  summary,
  getItemCostData,
  getItemCalculatedCosts,
  fileName,
  isArabic = false,
  savedProjectId,
}: SaveProjectButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projectName, setProjectName] = useState(fileName || "مشروع جديد");
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateProject, setDuplicateProject] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Helper function to save new project
  const saveNewProject = async (nameOverride?: string) => {
    if (!user) return;

    // Calculate total value from items
    const totalValue = items.reduce((sum, item) => {
      const calcCosts = getItemCalculatedCosts(item.item_number);
      const effectivePrice = calcCosts.calculatedUnitPrice > 0 
        ? calcCosts.calculatedUnitPrice 
        : (item.unit_price || 0);
      return sum + (effectivePrice * item.quantity);
    }, 0);

    // 1. Create the project in project_data table
    const { data: projectData, error: projectError } = await supabase
      .from('project_data' as any)
      .insert({
        user_id: user.id,
        name: (nameOverride || projectName).trim(),
        file_name: fileName,
        analysis_data: { items, summary },
        wbs_data: wbsData,
        total_value: totalValue,
        currency: summary?.currency || 'SAR',
        items_count: items.length,
      } as any)
      .select('id')
      .single();

    if (projectError) throw projectError;

    const projectId = (projectData as any).id as string;

    // 1.5. Also save to saved_projects table with SAME ID for consistency
    const { error: savedProjectError } = await supabase
      .from('saved_projects')
      .insert([{
        id: projectId,
        user_id: user.id,
        name: (nameOverride || projectName).trim(),
        file_name: fileName || null,
        analysis_data: { items, summary } as any,
        wbs_data: wbsData as any,
      }]);

    if (savedProjectError) {
      console.error('Error saving to saved_projects:', savedProjectError);
    }

    // 2. Insert all project items with sort_order to preserve original file sequence
    const itemsToInsert = items.map((item: any, index) => {
      const calcCosts = getItemCalculatedCosts(item.item_number);
      const effectivePrice = calcCosts.calculatedUnitPrice > 0 
        ? calcCosts.calculatedUnitPrice 
        : (item.unit_price || 0);
      
      return {
        project_id: projectId,
        item_number: item.item_number || `${index + 1}`,
        description: item.description || item.item_description || "",
        description_ar: item.description_ar || item.descriptionAr || null,
        unit: item.unit || null,
        quantity: item.quantity || 1,
        unit_price: effectivePrice,
        total_price: effectivePrice * (item.quantity || 1),
        category: item.category || null,
        notes: item.notes || null,
        sort_order: index,
      };
    });

    const { data: insertedItems, error: itemsError } = await supabase
      .from('project_items' as any)
      .insert(itemsToInsert as any)
      .select('id, item_number');

    if (itemsError) throw itemsError;

    // 3. Insert cost data for each item
    const dbItems = insertedItems as unknown as Array<{ id: string; item_number: string }> | null;
    if (dbItems && dbItems.length > 0) {
      const costsToInsert = dbItems.map(dbItem => {
        const costData = getItemCostData(dbItem.item_number);
        const calcCosts = getItemCalculatedCosts(dbItem.item_number);
        
        return {
          project_item_id: dbItem.id,
          general_labor: costData.generalLabor || 0,
          equipment_operator: costData.equipmentOperator || 0,
          overhead: costData.overhead || 0,
          admin: costData.admin || 0,
          insurance: costData.insurance || 0,
          contingency: costData.contingency || 0,
          profit_margin: costData.profitMargin || 10,
          materials: costData.materials || 0,
          equipment: costData.equipment || 0,
          subcontractor: costData.subcontractor || 0,
          ai_suggested_rate: costData.aiSuggestedRate,
          calculated_unit_price: calcCosts.calculatedUnitPrice,
        };
      });

      const { error: costsError } = await supabase
        .from('item_costs' as any)
        .insert(costsToInsert as any);

      if (costsError) throw costsError;
    }

    toast({
      title: "تم الحفظ بنجاح",
      description: `تم حفظ المشروع "${projectName}" مع ${items.length} بند`,
    });

    setIsOpen(false);
  };

  // Update existing project directly
  const updateExistingProject = async (projectId: string) => {
    if (!user) return;

    const totalValue = items.reduce((sum, item) => {
      const calcCosts = getItemCalculatedCosts(item.item_number);
      const effectivePrice = calcCosts.calculatedUnitPrice > 0 
        ? calcCosts.calculatedUnitPrice 
        : (item.unit_price || 0);
      return sum + (effectivePrice * item.quantity);
    }, 0);

    // Update project_data
    await supabase
      .from('project_data' as any)
      .update({
        analysis_data: { items, summary },
        wbs_data: wbsData,
        total_value: totalValue,
        currency: summary?.currency || 'SAR',
        items_count: items.length,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', projectId);

    // Delete old items and costs
    await supabase
      .from('project_items' as any)
      .delete()
      .eq('project_id', projectId);

    // Re-insert items
    const itemsToInsert = items.map((item: any, index) => {
      const calcCosts = getItemCalculatedCosts(item.item_number);
      const effectivePrice = calcCosts.calculatedUnitPrice > 0 
        ? calcCosts.calculatedUnitPrice 
        : (item.unit_price || 0);
      return {
        project_id: projectId,
        item_number: item.item_number || `${index + 1}`,
        description: item.description || item.item_description || "",
        description_ar: item.description_ar || item.descriptionAr || null,
        unit: item.unit || null,
        quantity: item.quantity || 1,
        unit_price: effectivePrice,
        total_price: effectivePrice * (item.quantity || 1),
        category: item.category || null,
        notes: item.notes || null,
        sort_order: index,
      };
    });

    const { data: insertedItems, error: itemsError } = await supabase
      .from('project_items' as any)
      .insert(itemsToInsert as any)
      .select('id, item_number');

    if (itemsError) throw itemsError;

    // Re-insert costs
    const dbItems = insertedItems as unknown as Array<{ id: string; item_number: string }> | null;
    if (dbItems && dbItems.length > 0) {
      const costsToInsert = dbItems.map(dbItem => {
        const costData = getItemCostData(dbItem.item_number);
        const calcCosts = getItemCalculatedCosts(dbItem.item_number);
        return {
          project_item_id: dbItem.id,
          general_labor: costData.generalLabor || 0,
          equipment_operator: costData.equipmentOperator || 0,
          overhead: costData.overhead || 0,
          admin: costData.admin || 0,
          insurance: costData.insurance || 0,
          contingency: costData.contingency || 0,
          profit_margin: costData.profitMargin || 10,
          materials: costData.materials || 0,
          equipment: costData.equipment || 0,
          subcontractor: costData.subcontractor || 0,
          ai_suggested_rate: costData.aiSuggestedRate,
          calculated_unit_price: calcCosts.calculatedUnitPrice,
        };
      });

      await supabase
        .from('item_costs' as any)
        .insert(costsToInsert as any);
    }

    toast({
      title: "تم تحديث المشروع بنجاح",
      description: `تم تحديث "${projectName}" مع ${items.length} بند`,
    });
    setIsOpen(false);
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "يرجى تسجيل الدخول",
        description: "يجب تسجيل الدخول لحفظ المشروع",
        variant: "destructive",
      });
      return;
    }

    if (!projectName.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المشروع",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // If editing an existing project, update directly
      if (savedProjectId) {
        await updateExistingProject(savedProjectId);
        return;
      }

      // Check for duplicate project name in project_data table
      const { data: existingProjects } = await supabase
        .from("project_data" as any)
        .select("id, name")
        .eq("user_id", user.id)
        .ilike("name", projectName.trim());

      if (existingProjects && existingProjects.length > 0) {
        const project = existingProjects[0] as unknown as { id: string; name: string };
        setDuplicateProject(project);
        setDuplicateDialogOpen(true);
        setIsSaving(false);
        return;
      }

      await saveNewProject();
    } catch (error: any) {
      console.error("Error saving project:", error);
      toast({
        title: "فشل الحفظ",
        description: error.message || "حدث خطأ أثناء حفظ المشروع",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOverwrite = async () => {
    if (!duplicateProject || !user) return;

    setDuplicateDialogOpen(false);
    setIsSaving(true);

    try {
      // Soft delete the old project instead of hard delete
      const now = new Date().toISOString();
      await Promise.all([
        supabase.from('saved_projects').update({ is_deleted: true, deleted_at: now }).eq('id', duplicateProject.id),
        supabase.from('project_data').update({ is_deleted: true, deleted_at: now }).eq('id', duplicateProject.id),
      ]);

      await saveNewProject();
      setDuplicateProject(null);
    } catch (error: any) {
      console.error("Error overwriting project:", error);
      toast({
        title: "فشل الاستبدال",
        description: error.message || "حدث خطأ أثناء استبدال المشروع",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWithNewName = async () => {
    const timestamp = new Date().toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const newName = `${projectName.trim()} (${timestamp})`;
    setProjectName(newName);
    setDuplicateDialogOpen(false);
    setDuplicateProject(null);
    setIsSaving(true);
    try {
      await saveNewProject(newName);
    } catch (error: any) {
      toast({
        title: "فشل الحفظ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="default" 
            size="lg" 
            className="gap-2 bg-green-600 hover:bg-green-700 relative z-[60] pointer-events-auto shadow-lg hover:shadow-xl transition-all"
          >
            <Save className="w-5 h-5" />
            {isArabic ? "حفظ المشروع" : "Save Project"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              حفظ المشروع في قاعدة البيانات
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">اسم المشروع</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="أدخل اسم المشروع"
                dir="rtl"
              />
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
              <p className="font-medium">سيتم حفظ:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>{items.length} بند من جدول الكميات</li>
                <li>جميع التكاليف المحسوبة</li>
                <li>أسعار AI المقترحة</li>
                {wbsData && <li>هيكل تجزئة العمل (WBS)</li>}
              </ul>
            </div>

            {!user && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                يجب تسجيل الدخول لحفظ المشروع
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !user}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  حفظ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Project Confirmation Dialog */}
      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              يوجد مشروع بنفس الاسم
            </AlertDialogTitle>
            <AlertDialogDescription>
              يوجد مشروع محفوظ باسم "{duplicateProject?.name}". سيتم نقل القديم إلى سلة المحذوفات (يمكنك استعادته خلال 30 يوم) أو احفظ باسم مختلف.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
            <AlertDialogCancel onClick={() => setDuplicateProject(null)} disabled={isSaving}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSaveWithNewName}
              disabled={isSaving}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              حفظ باسم جديد
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={handleOverwrite} 
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              استبدال (نقل القديم للمحذوفات)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
