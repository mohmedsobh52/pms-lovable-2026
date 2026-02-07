import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, Star } from "lucide-react";
import { ExternalPartner } from "./PartnerCard";

interface AddPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: ExternalPartner | null;
  onSave: (data: Partial<ExternalPartner>) => Promise<void>;
  isLoading?: boolean;
}

export const AddPartnerDialog = ({
  open,
  onOpenChange,
  partner,
  onSave,
  isLoading,
}: AddPartnerDialogProps) => {
  const { isArabic } = useLanguage();
  const isEditing = !!partner;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    rating: 0,
    status: "active" as string,
    partner_type: "supplier" as string,
    contract_start_date: "",
    contract_end_date: "",
    notes: "",
  });

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || "",
        description: partner.description || "",
        email: partner.email || "",
        phone: partner.phone || "",
        address: partner.address || "",
        website: partner.website || "",
        rating: partner.rating || 0,
        // @ts-ignore - database returns string
        status: partner.status || "active",
        partner_type: partner.partner_type || "supplier",
        contract_start_date: partner.contract_start_date || "",
        contract_end_date: partner.contract_end_date || "",
        notes: partner.notes || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        email: "",
        phone: "",
        address: "",
        website: "",
        rating: 0,
        status: "active",
        partner_type: "supplier",
        contract_start_date: "",
        contract_end_date: "",
        notes: "",
      });
    }
  }, [partner, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const statusOptions = [
    { value: "active", label: isArabic ? "نشط" : "Active" },
    { value: "inactive", label: isArabic ? "غير نشط" : "Inactive" },
    { value: "pending", label: isArabic ? "معلق" : "Pending" },
  ];

  const typeOptions = [
    { value: "supplier", label: isArabic ? "مورد" : "Supplier" },
    { value: "vendor", label: isArabic ? "بائع" : "Vendor" },
    { value: "contractor", label: isArabic ? "مقاول" : "Contractor" },
    { value: "consultant", label: isArabic ? "استشاري" : "Consultant" },
  ];

  const renderRatingStars = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFormData({ ...formData, rating: star })}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star
              className={`w-6 h-6 ${
                star <= formData.rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
        <span className="text-sm text-muted-foreground ms-2">
          {formData.rating}/5
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? isArabic
                ? "تعديل الشريك"
                : "Edit Partner"
              : isArabic
              ? "إضافة شريك جديد"
              : "Add New Partner"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>{isArabic ? "اسم الشريك *" : "Partner Name *"}</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={isArabic ? "أدخل اسم الشريك" : "Enter partner name"}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{isArabic ? "الوصف" : "Description"}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={
                isArabic ? "وصف مختصر للشريك" : "Brief description of partner"
              }
              rows={3}
            />
          </div>

          {/* Type and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isArabic ? "النوع" : "Type"}</Label>
              <Select
                value={formData.partner_type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, partner_type: value })
                }
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "الحالة" : "Status"}</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
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
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>{isArabic ? "التقييم" : "Rating"}</Label>
            {renderRatingStars()}
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isArabic ? "البريد الإلكتروني" : "Email"}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "رقم الهاتف" : "Phone"}</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+966 50 123 4567"
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label>{isArabic ? "الموقع الإلكتروني" : "Website"}</Label>
            <Input
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
              placeholder="https://example.com"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label>{isArabic ? "العنوان" : "Address"}</Label>
            <Textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder={isArabic ? "العنوان الكامل" : "Full address"}
              rows={2}
            />
          </div>

          {/* Contract Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isArabic ? "تاريخ بداية العقد" : "Contract Start"}</Label>
              <Input
                type="date"
                value={formData.contract_start_date}
                onChange={(e) =>
                  setFormData({ ...formData, contract_start_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "تاريخ نهاية العقد" : "Contract End"}</Label>
              <Input
                type="date"
                value={formData.contract_end_date}
                onChange={(e) =>
                  setFormData({ ...formData, contract_end_date: e.target.value })
                }
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder={isArabic ? "أي ملاحظات إضافية" : "Any additional notes"}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name}>
              {isLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {isEditing
                ? isArabic
                  ? "حفظ التغييرات"
                  : "Save Changes"
                : isArabic
                ? "إضافة الشريك"
                : "Add Partner"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
