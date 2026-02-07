import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Plus, Calendar, Building2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Contract {
  id: string;
  contract_number: string;
  contract_title: string;
  contractor_name: string | null;
  contract_value: number | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  currency: string | null;
}

export const ProcurementContracts = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, contract_number, contract_title, contractor_name, contract_value, status, start_date, end_date, currency")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusLabels: Record<string, string> = {
    draft: isArabic ? "مسودة" : "Draft",
    active: isArabic ? "نشط" : "Active",
    completed: isArabic ? "مكتمل" : "Completed",
    cancelled: isArabic ? "ملغي" : "Cancelled",
    suspended: isArabic ? "معلق" : "Suspended",
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-500/10 text-gray-600",
    active: "bg-green-500/10 text-green-600",
    completed: "bg-blue-500/10 text-blue-600",
    cancelled: "bg-red-500/10 text-red-600",
    suspended: "bg-yellow-500/10 text-yellow-600",
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "d MMM yyyy", {
        locale: isArabic ? ar : enUS,
      });
    } catch {
      return "";
    }
  };

  const formatCurrency = (value: number | null, currency: string | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency || "SAR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {isArabic ? "لا توجد عقود" : "No contracts available"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isArabic
                  ? "لم تقم بإنشاء أي عقود بعد. أنشئ عقدًا جديدًا للبدء."
                  : "You don't have any contracts yet. Create a new contract to get started."}
              </p>
            </div>
            <Button onClick={() => navigate("/contracts")}>
              <Plus className="w-4 h-4 me-2" />
              {isArabic ? "إضافة عقد" : "Add Contract"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {isArabic ? "العقود الأخيرة" : "Recent Contracts"}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => navigate("/contracts")}>
          {isArabic ? "عرض الكل" : "View All"}
          <ArrowRight className="w-4 h-4 ms-2" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contracts.map((contract) => (
          <Card
            key={contract.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/contracts")}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    #{contract.contract_number}
                  </p>
                  <h4 className="font-medium line-clamp-1 mt-1">
                    {contract.contract_title}
                  </h4>
                </div>
                <Badge
                  variant="outline"
                  className={statusColors[contract.status || "draft"]}
                >
                  {statusLabels[contract.status || "draft"]}
                </Badge>
              </div>

              {contract.contractor_name && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span className="truncate">{contract.contractor_name}</span>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="font-semibold text-sm">
                  {formatCurrency(contract.contract_value, contract.currency)}
                </span>
                {contract.end_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(contract.end_date)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
