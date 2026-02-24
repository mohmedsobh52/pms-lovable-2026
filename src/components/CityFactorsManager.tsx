import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, RotateCcw, Save, Pencil, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CityFactor {
  id: string;
  city_name: string;
  city_name_ar: string | null;
  region: string;
  factor: number;
  label: string | null;
  source: string | null;
  last_updated: string;
  updated_by: string | null;
}

const REGIONS = [
  { value: "saudi", label: "Saudi Arabia", labelAr: "السعودية" },
  { value: "uae", label: "UAE", labelAr: "الإمارات" },
  { value: "egypt", label: "Egypt", labelAr: "مصر" },
  { value: "qatar", label: "Qatar", labelAr: "قطر" },
  { value: "kuwait", label: "Kuwait", labelAr: "الكويت" },
  { value: "bahrain", label: "Bahrain", labelAr: "البحرين" },
  { value: "oman", label: "Oman", labelAr: "عمان" },
  { value: "jordan", label: "Jordan", labelAr: "الأردن" },
];

export function CityFactorsManager() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFactor, setEditFactor] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCity, setNewCity] = useState({ city_name: "", city_name_ar: "", region: "saudi", factor: "1.00" });
  const [filterRegion, setFilterRegion] = useState<string>("all");

  const { data: factors = [], isLoading } = useQuery({
    queryKey: ["city-pricing-factors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_pricing_factors")
        .select("*")
        .order("region", { ascending: true })
        .order("city_name", { ascending: true });
      if (error) throw error;
      return data as CityFactor[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, factor }: { id: string; factor: number }) => {
      const label = factor === 1.0 ? "Base" : factor > 1 ? `+${Math.round((factor - 1) * 100)}%` : `${Math.round((factor - 1) * 100)}%`;
      const { error } = await supabase
        .from("city_pricing_factors")
        .update({ factor, label, last_updated: new Date().toISOString(), updated_by: user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-pricing-factors"] });
      setEditingId(null);
      toast({ title: isArabic ? "تم التحديث" : "Updated" });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (city: typeof newCity) => {
      const factor = parseFloat(city.factor);
      const label = factor === 1.0 ? "Base" : factor > 1 ? `+${Math.round((factor - 1) * 100)}%` : `${Math.round((factor - 1) * 100)}%`;
      const { error } = await supabase
        .from("city_pricing_factors")
        .insert({ 
          city_name: city.city_name, 
          city_name_ar: city.city_name_ar || null, 
          region: city.region, 
          factor, 
          label,
          source: "manual",
          updated_by: user?.id 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-pricing-factors"] });
      setShowAddDialog(false);
      setNewCity({ city_name: "", city_name_ar: "", region: "saudi", factor: "1.00" });
      toast({ title: isArabic ? "تمت الإضافة" : "Added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("city_pricing_factors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-pricing-factors"] });
      toast({ title: isArabic ? "تم الحذف" : "Deleted" });
    },
  });

  const filteredFactors = filterRegion === "all" ? factors : factors.filter(f => f.region === filterRegion);

  const handleSaveEdit = (id: string) => {
    const val = parseFloat(editFactor);
    if (isNaN(val) || val <= 0 || val > 5) {
      toast({ title: isArabic ? "قيمة غير صحيحة" : "Invalid value", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id, factor: val });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{isArabic ? "معاملات تسعير المدن" : "City Pricing Factors"}</h3>
          <Badge variant="secondary">{factors.length} {isArabic ? "مدينة" : "cities"}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterRegion} onValueChange={setFilterRegion}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "جميع المناطق" : "All Regions"}</SelectItem>
              {REGIONS.map(r => (
                <SelectItem key={r.value} value={r.value}>{isArabic ? r.labelAr : r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1">
            <Plus className="w-4 h-4" />
            {isArabic ? "إضافة مدينة" : "Add City"}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isArabic ? "المدينة" : "City"}</TableHead>
              <TableHead>{isArabic ? "المنطقة" : "Region"}</TableHead>
              <TableHead className="text-center">{isArabic ? "المعامل" : "Factor"}</TableHead>
              <TableHead>{isArabic ? "التأثير" : "Effect"}</TableHead>
              <TableHead>{isArabic ? "المصدر" : "Source"}</TableHead>
              <TableHead className="text-center">{isArabic ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFactors.map(f => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">
                  <div>
                    <span>{f.city_name}</span>
                    {f.city_name_ar && <span className="text-muted-foreground text-xs block">{f.city_name_ar}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {REGIONS.find(r => r.value === f.region)?.[isArabic ? "labelAr" : "label"] || f.region}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {editingId === f.id ? (
                    <Input
                      value={editFactor}
                      onChange={e => setEditFactor(e.target.value)}
                      className="w-20 h-7 text-center text-sm mx-auto"
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="5"
                    />
                  ) : (
                    <span className="font-mono font-bold">{Number(f.factor).toFixed(2)}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={Number(f.factor) > 1 ? "destructive" : Number(f.factor) < 1 ? "default" : "secondary"} className="text-xs">
                    {f.label || "Base"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{f.source || "manual"}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {editingId === f.id ? (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(f.id)} disabled={updateMutation.isPending}>
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingId(f.id); setEditFactor(Number(f.factor).toFixed(2)); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(f.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add City Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isArabic ? "إضافة مدينة جديدة" : "Add New City"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={isArabic ? "اسم المدينة (إنجليزي)" : "City name (English)"}
              value={newCity.city_name}
              onChange={e => setNewCity(prev => ({ ...prev, city_name: e.target.value }))}
            />
            <Input
              placeholder={isArabic ? "اسم المدينة (عربي)" : "City name (Arabic)"}
              value={newCity.city_name_ar}
              onChange={e => setNewCity(prev => ({ ...prev, city_name_ar: e.target.value }))}
            />
            <Select value={newCity.region} onValueChange={v => setNewCity(prev => ({ ...prev, region: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{isArabic ? r.labelAr : r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder={isArabic ? "المعامل (مثال: 1.05)" : "Factor (e.g. 1.05)"}
              value={newCity.factor}
              onChange={e => setNewCity(prev => ({ ...prev, factor: e.target.value }))}
              type="number"
              step="0.01"
              min="0.1"
              max="5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => addMutation.mutate(newCity)} disabled={!newCity.city_name || addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isArabic ? "إضافة" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
