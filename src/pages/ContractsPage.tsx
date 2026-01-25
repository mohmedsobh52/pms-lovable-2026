import { ContractManagement } from "@/components/ContractManagement";
import { ContractNotifications } from "@/components/ContractNotifications";
import { SubcontractorManagement } from "@/components/SubcontractorManagement";
import { SubcontractorBOQLink } from "@/components/SubcontractorBOQLink";
import { useLanguage } from "@/hooks/useLanguage";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Users, 
  Bell, 
  Link2, 
  Building2,
  TrendingUp,
  CheckCircle,
  Clock
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ContractsPage = () => {
  const { isArabic } = useLanguage();
  const { analysisData } = useAnalysisData();
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    totalSubcontractors: 0,
    activeAssignments: 0,
    totalContractValue: 0,
    totalSubcontractValue: 0,
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const [contractsRes, subcontractorsRes, assignmentsRes] = await Promise.all([
        supabase.from("contracts").select("id, status, contract_value").eq("user_id", user?.id),
        supabase.from("subcontractors").select("id, status").eq("user_id", user?.id),
        supabase.from("subcontractor_assignments").select("id, status, contract_value"),
      ]);

      const contracts = contractsRes.data || [];
      const subcontractors = subcontractorsRes.data || [];
      const assignments = assignmentsRes.data || [];

      setStats({
        totalContracts: contracts.length,
        activeContracts: contracts.filter(c => c.status === "active").length,
        totalSubcontractors: subcontractors.length,
        activeAssignments: assignments.filter(a => a.status === "in_progress").length,
        totalContractValue: contracts.reduce((sum, c) => sum + (c.contract_value || 0), 0),
        totalSubcontractValue: assignments.reduce((sum, a) => sum + (a.contract_value || 0), 0),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {isArabic ? "العقود والمقاولين" : "Contracts & Subcontractors"}
            </h1>
            <p className="text-muted-foreground">
              {isArabic 
                ? "إدارة شاملة للعقود ومقاولي الباطن" 
                : "Comprehensive management of contracts and subcontractors"}
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalContracts}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "العقود" : "Contracts"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeContracts}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "عقود نشطة" : "Active"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalSubcontractors}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "مقاولين" : "Subcontractors"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeAssignments}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "مهام جارية" : "Active Tasks"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Building2 className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalContractValue + stats.totalSubcontractValue)}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي القيمة" : "Total Value"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="contracts" className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">{isArabic ? "العقود" : "Contracts"}</span>
            </TabsTrigger>
            <TabsTrigger value="subcontractors" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden md:inline">{isArabic ? "مقاولي الباطن" : "Subcontractors"}</span>
            </TabsTrigger>
            <TabsTrigger value="boq-link" className="gap-2">
              <Link2 className="w-4 h-4" />
              <span className="hidden md:inline">{isArabic ? "ربط البنود" : "BOQ Link"}</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden md:inline">{isArabic ? "التذكيرات" : "Alerts"}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contracts" className="mt-4">
            <ContractManagement />
          </TabsContent>

          <TabsContent value="subcontractors" className="mt-4">
            <SubcontractorManagement />
          </TabsContent>

          <TabsContent value="boq-link" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  {isArabic ? "ربط مقاولي الباطن بالبنود" : "Link Subcontractors to BOQ Items"}
                </CardTitle>
                <CardDescription>
                  {isArabic 
                    ? "اربط كل مقاول باطن بالبنود المسؤول عنها في جدول الكميات"
                    : "Link each subcontractor to the BOQ items they are responsible for"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubcontractorBOQLink 
                  boqItems={analysisData?.items || []} 
                  projectId={undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <ContractNotifications />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default ContractsPage;