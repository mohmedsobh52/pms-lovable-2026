import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, Search, Loader2, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

interface ContractBOQItem {
  id: string;
  contract_id: string;
  project_item_id: string | null;
  item_number: string | null;
  description: string;
  unit: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

interface ProjectItem {
  id: string;
  item_number: string | null;
  description: string;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
}

interface ContractBOQTabProps {
  contractId: string;
  projectId: string | null;
  contractValue: number | null;
  currency: string;
}

export const ContractBOQTab = React.memo(({ contractId, projectId, contractValue, currency }: ContractBOQTabProps) => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [boqItems, setBoqItems] = useState<ContractBOQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogSearchTerm, setDialogSearchTerm] = useState("");
  const [loadingProjectItems, setLoadingProjectItems] = useState(false);

  const fetchBOQItems = useCallback(async () => {
    if (!user || !contractId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contract_boq_items")
        .select("*")
        .eq("contract_id", contractId)
        .eq("user_id", user.id)
        .order("created_at");
      if (error) throw error;
      setBoqItems((data || []) as ContractBOQItem[]);
    } catch (err) {
      console.error("Error fetching BOQ items:", err);
    } finally {
      setLoading(false);
    }
  }, [user, contractId]);

  useEffect(() => {
    fetchBOQItems();
  }, [fetchBOQItems]);

  const fetchProjectItems = useCallback(async () => {
    if (!user || !projectId) return;
    setLoadingProjectItems(true);
    try {
      const { data, error } = await supabase
        .from("project_items")
        .select("id, item_number, description, unit, quantity, unit_price, total_price")
        .eq("project_id", projectId)
        .order("item_number");
      if (error) throw error;
      setProjectItems((data || []) as ProjectItem[]);
    } catch (err) {
      console.error("Error fetching project items:", err);
    } finally {
      setLoadingProjectItems(false);
    }
  }, [user, projectId]);

  const openSelectDialog = useCallback(() => {
    if (!projectId) {
      toast({
        title: isArabic ? "لا يوجد مشروع مرتبط" : "No linked project",
        description: isArabic ? "يجب ربط العقد بمشروع أولاً" : "Link the contract to a project first",
        variant: "destructive",
      });
      return;
    }
    fetchProjectItems();
    setSelectedItems(new Set());
    setDialogSearchTerm("");
    setIsSelectDialogOpen(true);
  }, [projectId, fetchProjectItems, isArabic, toast]);

  const handleAddSelected = useCallback(async () => {
    if (!user || selectedItems.size === 0) return;
    setSaving(true);
    try {
      const existingIds = new Set(boqItems.map(b => b.project_item_id));
      const itemsToAdd = projectItems
        .filter(pi => selectedItems.has(pi.id) && !existingIds.has(pi.id))
        .map(pi => ({
          contract_id: contractId,
          project_item_id: pi.id,
          item_number: pi.item_number || "",
          description: pi.description,
          unit: pi.unit || "",
          quantity: pi.quantity || 0,
          unit_price: pi.unit_price || 0,
          total_price: pi.total_price || 0,
          user_id: user.id,
        }));

      if (itemsToAdd.length === 0) {
        toast({ title: isArabic ? "البنود مضافة مسبقاً" : "Items already added" });
        setIsSelectDialogOpen(false);
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("contract_boq_items").insert(itemsToAdd);
      if (error) throw error;

      toast({ title: isArabic ? `تمت إضافة ${itemsToAdd.length} بند` : `${itemsToAdd.length} items added` });
      setIsSelectDialogOpen(false);
      fetchBOQItems();
    } catch (err) {
      console.error("Error adding BOQ items:", err);
      toast({ title: isArabic ? "خطأ" : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [user, selectedItems, projectItems, boqItems, contractId, isArabic, toast, fetchBOQItems]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("contract_boq_items").delete().eq("id", itemId);
      if (error) throw error;
      setBoqItems(prev => prev.filter(i => i.id !== itemId));
      toast({ title: isArabic ? "تم الحذف" : "Deleted" });
    } catch (err) {
      console.error("Error deleting:", err);
    }
  }, [user, isArabic, toast]);

  const handleUpdateItem = useCallback(async (itemId: string, field: "quantity" | "unit_price", value: number) => {
    const item = boqItems.find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = field === "quantity" ? value : item.quantity;
    const newUnitPrice = field === "unit_price" ? value : item.unit_price;
    const newTotal = newQuantity * newUnitPrice;

    try {
      const { error } = await supabase
        .from("contract_boq_items")
        .update({ [field]: value, total_price: newTotal })
        .eq("id", itemId);
      if (error) throw error;

      setBoqItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, [field]: value, total_price: newTotal }
            : i
        )
      );
    } catch (err) {
      console.error("Error updating:", err);
    }
  }, [boqItems]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(value);
  }, [isArabic]);

  const filteredBOQItems = useMemo(() => {
    if (!searchTerm) return boqItems;
    return boqItems.filter(i =>
      i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.item_number || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [boqItems, searchTerm]);

  const filteredProjectItems = useMemo(() => {
    if (!dialogSearchTerm) return projectItems;
    return projectItems.filter(i =>
      i.description.toLowerCase().includes(dialogSearchTerm.toLowerCase()) ||
      (i.item_number || "").toLowerCase().includes(dialogSearchTerm.toLowerCase())
    );
  }, [projectItems, dialogSearchTerm]);

  const totalBOQ = useMemo(() => boqItems.reduce((s, i) => s + (i.total_price || 0), 0), [boqItems]);
  const difference = useMemo(() => (contractValue || 0) - totalBOQ, [contractValue, totalBOQ]);
  const differencePercent = useMemo(() => contractValue ? ((difference / contractValue) * 100).toFixed(1) : "0", [difference, contractValue]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? "بحث في البنود..." : "Search items..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openSelectDialog} className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white">
          <Plus className="w-4 h-4" />
          {isArabic ? "إضافة بنود من المشروع" : "Add Items from Project"}
        </Button>
      </div>

      {/* BOQ Table */}
      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : filteredBOQItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{isArabic ? "لا توجد بنود تسعير" : "No BOQ items"}</p>
          <p className="text-sm">{isArabic ? "أضف بنود من المشروع المرتبط" : "Add items from the linked project"}</p>
        </div>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[hsl(222,47%,15%)] hover:bg-[hsl(222,47%,15%)]">
                    <TableHead className="text-white text-center w-12">#</TableHead>
                    <TableHead className="text-white">{isArabic ? "الوصف" : "Description"}</TableHead>
                    <TableHead className="text-white text-center w-20">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                    <TableHead className="text-white text-center w-28">{isArabic ? "الكمية" : "Qty"}</TableHead>
                    <TableHead className="text-white text-center w-32">{isArabic ? "سعر الوحدة" : "Unit Price"}</TableHead>
                    <TableHead className="text-white text-center w-32">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead className="text-white text-center w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBOQItems.map((item, idx) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{item.description}</span>
                          {item.item_number && <Badge variant="outline" className="ml-2 text-xs">{item.item_number}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">{item.unit}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={e => handleUpdateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-24 text-center h-8 mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={e => handleUpdateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                          className="w-28 text-center h-8 mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary">
                        {formatCurrency(item.total_price)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {boqItems.length > 0 && (
        <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-md">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <p className="text-xs text-muted-foreground mb-1">{isArabic ? "إجمالي بنود التسعير" : "Total BOQ Value"}</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(totalBOQ)} {currency}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <p className="text-xs text-muted-foreground mb-1">{isArabic ? "قيمة العقد" : "Contract Value"}</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(contractValue || 0)} {currency}</p>
              </div>
              <div className={`text-center p-3 rounded-lg ${difference >= 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                <p className="text-xs text-muted-foreground mb-1">{isArabic ? "الفرق" : "Difference"}</p>
                <p className={`text-xl font-bold ${difference >= 0 ? "text-amber-600" : "text-red-600"}`}>
                  {formatCurrency(Math.abs(difference))} {currency} ({differencePercent}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Select Items Dialog */}
      <Dialog open={isSelectDialogOpen} onOpenChange={setIsSelectDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {isArabic ? "اختيار بنود من المشروع" : "Select Items from Project"}
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isArabic ? "بحث..." : "Search..."}
              value={dialogSearchTerm}
              onChange={e => setDialogSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[50vh]">
            {loadingProjectItems ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : filteredProjectItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{isArabic ? "لا توجد بنود في المشروع" : "No project items found"}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                    <TableHead className="text-center w-16">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                    <TableHead className="text-center w-20">{isArabic ? "الكمية" : "Qty"}</TableHead>
                    <TableHead className="text-center w-24">{isArabic ? "السعر" : "Price"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjectItems.map(item => {
                    const isAlreadyAdded = boqItems.some(b => b.project_item_id === item.id);
                    return (
                      <TableRow key={item.id} className={isAlreadyAdded ? "opacity-50" : "cursor-pointer hover:bg-muted/50"}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id) || isAlreadyAdded}
                            disabled={isAlreadyAdded}
                            onCheckedChange={checked => {
                              setSelectedItems(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(item.id); else next.delete(item.id);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-sm">{item.item_number || "-"}</TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-center text-sm">{item.unit || "-"}</TableCell>
                        <TableCell className="text-center text-sm">{item.quantity || 0}</TableCell>
                        <TableCell className="text-center text-sm">{formatCurrency(item.unit_price || 0)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Badge variant="outline">{isArabic ? `تم اختيار ${selectedItems.size} بند` : `${selectedItems.size} selected`}</Badge>
            <Button variant="outline" onClick={() => setIsSelectDialogOpen(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleAddSelected} disabled={saving || selectedItems.size === 0} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isArabic ? "إضافة المحدد" : "Add Selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

ContractBOQTab.displayName = "ContractBOQTab";
