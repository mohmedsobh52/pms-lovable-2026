import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Loader2,
} from "lucide-react";
import { PartnerCard, ExternalPartner } from "./PartnerCard";
import { AddPartnerDialog } from "./AddPartnerDialog";
import { PartnerDetailsDialog } from "./PartnerDetailsDialog";
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

export const ExternalPartners = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [partners, setPartners] = useState<ExternalPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<ExternalPartner | null>(null);

  useEffect(() => {
    if (user) {
      fetchPartners();
    }
  }, [user]);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("external_partners")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPartners((data as ExternalPartner[]) || []);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error(isArabic ? "خطأ في تحميل الشركاء" : "Error loading partners");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePartner = async (data: Partial<ExternalPartner>) => {
    if (!user) return;
    setIsSaving(true);

    try {
      if (selectedPartner) {
        // Update
        const { error } = await supabase
          .from("external_partners")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedPartner.id);

        if (error) throw error;
        toast.success(isArabic ? "تم تحديث الشريك" : "Partner updated");
      } else {
        // Insert
        const { error } = await supabase.from("external_partners").insert([{
          name: data.name || "",
          description: data.description,
          email: data.email,
          phone: data.phone,
          address: data.address,
          website: data.website,
          rating: data.rating || 0,
          status: data.status || "active",
          partner_type: data.partner_type || "supplier",
          contract_start_date: data.contract_start_date || null,
          contract_end_date: data.contract_end_date || null,
          notes: data.notes,
          user_id: user.id,
        }]);

        if (error) throw error;
        toast.success(isArabic ? "تم إضافة الشريك" : "Partner added");
      }

      await fetchPartners();
      setAddDialogOpen(false);
      setSelectedPartner(null);
    } catch (error) {
      console.error("Error saving partner:", error);
      toast.error(isArabic ? "خطأ في حفظ الشريك" : "Error saving partner");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePartner = async () => {
    if (!selectedPartner) return;

    try {
      const { error } = await supabase
        .from("external_partners")
        .delete()
        .eq("id", selectedPartner.id);

      if (error) throw error;

      toast.success(isArabic ? "تم حذف الشريك" : "Partner deleted");
      await fetchPartners();
      setDeleteDialogOpen(false);
      setSelectedPartner(null);
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast.error(isArabic ? "خطأ في حذف الشريك" : "Error deleting partner");
    }
  };

  const handleEdit = (partner: ExternalPartner) => {
    setSelectedPartner(partner);
    setAddDialogOpen(true);
  };

  const handleViewDetails = (partner: ExternalPartner) => {
    setSelectedPartner(partner);
    setDetailsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (partner: ExternalPartner) => {
    setSelectedPartner(partner);
    setDeleteDialogOpen(true);
  };

  // Filter and sort partners
  const filteredPartners = partners
    .filter((partner) => {
      const matchesSearch =
        partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        partner.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || partner.status === statusFilter;

      const matchesType =
        typeFilter === "all" || partner.partner_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rating":
          return b.rating - a.rating;
        case "date":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        default:
          return 0;
      }
    });

  const statusOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "active", label: isArabic ? "نشط" : "Active" },
    { value: "inactive", label: isArabic ? "غير نشط" : "Inactive" },
    { value: "pending", label: isArabic ? "معلق" : "Pending" },
  ];

  const typeOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "supplier", label: isArabic ? "مورد" : "Supplier" },
    { value: "vendor", label: isArabic ? "بائع" : "Vendor" },
    { value: "contractor", label: isArabic ? "مقاول" : "Contractor" },
    { value: "consultant", label: isArabic ? "استشاري" : "Consultant" },
  ];

  const sortOptions = [
    { value: "name", label: isArabic ? "الاسم" : "Name" },
    { value: "rating", label: isArabic ? "التقييم" : "Rating" },
    { value: "date", label: isArabic ? "التاريخ" : "Date" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Button
          onClick={() => {
            setSelectedPartner(null);
            setAddDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 me-2" />
          {isArabic ? "إضافة شريك" : "Add Partner"}
        </Button>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isArabic ? "بحث..." : "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 w-48"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <ArrowUpDown className="w-4 h-4 me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Partners Grid */}
      {filteredPartners.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">
            {searchQuery || statusFilter !== "all" || typeFilter !== "all"
              ? isArabic
                ? "لا توجد نتائج"
                : "No results found"
              : isArabic
              ? "لا يوجد شركاء"
              : "No partners yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery || statusFilter !== "all" || typeFilter !== "all"
              ? isArabic
                ? "جرب تغيير معايير البحث"
                : "Try changing the search criteria"
              : isArabic
              ? "أضف شريكًا جديدًا للبدء"
              : "Add a new partner to get started"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPartners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onEdit={handleEdit}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddPartnerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        partner={selectedPartner}
        onSave={handleSavePartner}
        isLoading={isSaving}
      />

      <PartnerDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        partner={selectedPartner}
        onEdit={handleEdit}
        onDelete={handleOpenDeleteDialog}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic
                ? `هل أنت متأكد من حذف "${selectedPartner?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete "${selectedPartner?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePartner}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArabic ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
