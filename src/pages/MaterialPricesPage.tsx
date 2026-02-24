import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { MaterialPriceDatabase } from "@/components/MaterialPriceDatabase";
import { useLanguage } from "@/hooks/useLanguage";
import { DollarSign } from "lucide-react";

const MaterialPricesPage = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <div className="space-y-6">
        <PageHeader
          icon={DollarSign}
          title={isArabic ? "قاعدة بيانات الأسعار" : "Price Database"}
          subtitle={isArabic 
            ? "إدارة أسعار المواد والموردين - إضافة يدوي، استيراد Excel، وبحث ذكي من الإنترنت"
            : "Manage material prices and suppliers - manual entry, Excel import, and smart web search"
          }
        />
        
        <MaterialPriceDatabase />
      </div>
    </PageLayout>
  );
};

export default MaterialPricesPage;
