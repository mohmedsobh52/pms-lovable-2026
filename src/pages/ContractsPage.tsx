import { ContractManagement } from "@/components/ContractManagement";
import { ContractNotifications } from "@/components/ContractNotifications";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";

const ContractsPage = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <Tabs defaultValue="management" className="space-y-4">
        <TabsList>
          <TabsTrigger value="management">
            {isArabic ? "إدارة العقود" : "Contract Management"}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            {isArabic ? "تذكيرات العقود" : "Contract Alerts"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="management">
          <ContractManagement />
        </TabsContent>
        <TabsContent value="notifications">
          <ContractNotifications />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default ContractsPage;
