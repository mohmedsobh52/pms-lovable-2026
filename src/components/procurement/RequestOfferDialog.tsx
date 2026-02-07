import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, Send, Building2 } from "lucide-react";
import { ExternalPartner } from "./PartnerCard";

interface RequestOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partners: ExternalPartner[];
}

export const RequestOfferDialog = ({
  open,
  onOpenChange,
  partners,
}: RequestOfferDialogProps) => {
  const { isArabic } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    deadline: "",
    attachments: "",
  });

  const activePartners = partners.filter((p) => p.status === "active");

  const togglePartner = (partnerId: string) => {
    setSelectedPartners((prev) =>
      prev.includes(partnerId)
        ? prev.filter((id) => id !== partnerId)
        : [...prev, partnerId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate sending request
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    onOpenChange(false);
    setSelectedPartners([]);
    setFormData({
      subject: "",
      description: "",
      deadline: "",
      attachments: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isArabic ? "طلب عرض سعر" : "Request Offer"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Select Partners */}
          <div className="space-y-3">
            <Label>
              {isArabic ? "اختر الشركاء *" : "Select Partners *"}
            </Label>
            {activePartners.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isArabic
                  ? "لا يوجد شركاء نشطين. أضف شركاء أولاً."
                  : "No active partners. Add partners first."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                {activePartners.map((partner) => (
                  <div
                    key={partner.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPartners.includes(partner.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => togglePartner(partner.id)}
                  >
                    <Checkbox
                      checked={selectedPartners.includes(partner.id)}
                      onCheckedChange={() => togglePartner(partner.id)}
                    />
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium truncate">
                      {partner.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>{isArabic ? "الموضوع *" : "Subject *"}</Label>
            <Input
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder={
                isArabic ? "موضوع طلب العرض" : "Subject of the offer request"
              }
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{isArabic ? "الوصف التفصيلي *" : "Detailed Description *"}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={
                isArabic
                  ? "اكتب تفاصيل المواد أو الخدمات المطلوبة..."
                  : "Write details of required materials or services..."
              }
              rows={5}
              required
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label>{isArabic ? "الموعد النهائي للتقديم" : "Submission Deadline"}</Label>
            <Input
              type="date"
              value={formData.deadline}
              onChange={(e) =>
                setFormData({ ...formData, deadline: e.target.value })
              }
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
            <Button
              type="submit"
              disabled={
                isLoading ||
                selectedPartners.length === 0 ||
                !formData.subject ||
                !formData.description
              }
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 me-2" />
              )}
              {isArabic ? "إرسال الطلب" : "Send Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
