import { useEffect, useState, useMemo } from "react";
import { ProcurementResourcesSchedule } from "@/components/ProcurementResourcesSchedule";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Building2, Package, FileText, Sparkles, Users, Star, TrendingUp } from "lucide-react";
import {
  ExternalPartners,
  RequestOfferDialog,
  ProcurementContracts,
} from "@/components/procurement";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ExternalPartner } from "@/components/procurement/PartnerCard";
import { useNavigate } from "react-router-dom";
import { SmartSuggestionsBanner, type SmartSuggestion } from "@/components/SmartSuggestionsBanner";

const ProcurementPage = () => {
  const { analysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<ExternalPartner[]>([]);

  const procurementSuggestions = useMemo((): SmartSuggestion[] => {
    const list: SmartSuggestion[] = [];
    if (partners.length === 0) list.push({ id: 'no_partners', icon: <Building2 className="h-4 w-4" />, text: isArabic ? 'أضف أول شريك أو مورد لبدء إدارة المشتريات' : 'Add your first partner or supplier to start procurement', action: () => {}, actionLabel: isArabic ? 'إضافة' : 'Add' });
    const unrated = partners.filter(p => !p.rating || p.rating === 0).length;
    if (unrated > 0) list.push({ id: 'unrated', icon: <Star className="h-4 w-4" />, text: isArabic ? `${unrated} شركاء بدون تقييم — قيّمهم لتحسين المقارنات` : `${unrated} unrated partners — rate them for better comparisons`, action: () => {}, actionLabel: isArabic ? 'تقييم' : 'Rate' });
    if (partners.length > 3) list.push({ id: 'compare_offers', icon: <TrendingUp className="h-4 w-4" />, text: isArabic ? 'قارن عروض الموردين للحصول على أفضل الأسعار' : 'Compare supplier offers for better prices', action: () => navigate('/quotations'), actionLabel: isArabic ? 'المقارنة' : 'Compare' });
    return list.slice(0, 3);
  }, [partners, isArabic, navigate]);

  useEffect(() => {
    if (user) {
      fetchPartners();
    }
  }, [user]);

  const fetchPartners = async () => {
    try {
      const { data } = await supabase
        .from("external_partners")
        .select("*")
        .eq("user_id", user?.id) as { data: ExternalPartner[] | null };
      setPartners(data || []);
    } catch (error) {
      console.error("Error fetching partners:", error);
    }
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Package}
          title={isArabic ? "المشتريات" : "Procurement"}
          subtitle={isArabic ? "إدارة الشركاء والمشتريات والعقود" : "Manage partners, procurement, and contracts"}
          actions={
            <RequestOfferDialog>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                <Sparkles className="w-4 h-4 me-2" />
                {isArabic ? "طلب عرض سعر" : "Request Offer"}
              </Button>
            </RequestOfferDialog>
          }
        />

        {/* Smart Suggestions */}
        <SmartSuggestionsBanner suggestions={procurementSuggestions} />

        {/* Tabs */}
        <Tabs defaultValue="partners" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="partners" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isArabic ? "الشركاء" : "Partners"}
              </span>
            </TabsTrigger>
            <TabsTrigger value="procurement" className="gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isArabic ? "المشتريات" : "Procurement"}
              </span>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isArabic ? "العقود" : "Contracts"}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partners">
            <ExternalPartners />
          </TabsContent>

          <TabsContent value="procurement">
            <ProcurementResourcesSchedule
              items={analysisData?.items || []}
              currency={analysisData?.summary?.currency || "SAR"}
            />
          </TabsContent>

          <TabsContent value="contracts">
            <ProcurementContracts />
          </TabsContent>
        </Tabs>
      </div>

    </PageLayout>
  );
};

export default ProcurementPage;
