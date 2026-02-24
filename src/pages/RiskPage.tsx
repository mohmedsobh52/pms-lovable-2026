import { RiskManagement } from "@/components/RiskManagement";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const RiskPage = () => {
  const { isArabic } = useLanguage();
  return (
    <PageLayout>
      <PageHeader
        icon={AlertTriangle}
        title={isArabic ? "إدارة المخاطر" : "Risk Management"}
        subtitle={isArabic ? "تقييم وتحليل ومتابعة المخاطر" : "Assess, analyze and monitor risks"}
      />
      <RiskManagement />
    </PageLayout>
  );
};

export default RiskPage;
