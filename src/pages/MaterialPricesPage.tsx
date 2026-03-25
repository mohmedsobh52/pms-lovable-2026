import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { MaterialPriceDatabase } from "@/components/MaterialPriceDatabase";
import { useLanguage } from "@/hooks/useLanguage";
import { DollarSign, TrendingUp, Globe, FileSpreadsheet } from "lucide-react";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import { useNavigate } from "react-router-dom";

const MaterialPricesPage = () => {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const suggestions: SmartSuggestion[] = [
    {
      id: 'import-prices',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      text: isArabic ? 'استورد أسعار المواد من ملف Excel لتحديث قاعدة البيانات بسرعة' : 'Import material prices from Excel to quickly update the database',
      action: () => {},
      actionLabel: isArabic ? 'استيراد' : 'Import',
    },
    {
      id: 'market-trends',
      icon: <TrendingUp className="h-4 w-4" />,
      text: isArabic ? 'تابع اتجاهات الأسعار لاكتشاف التغيرات والفرص' : 'Track price trends to discover changes and opportunities',
      action: () => navigate('/historical-pricing'),
      actionLabel: isArabic ? 'الاتجاهات' : 'Trends',
    },
    {
      id: 'web-search',
      icon: <Globe className="h-4 w-4" />,
      text: isArabic ? 'ابحث عن أسعار الموردين عبر الإنترنت للمقارنة' : 'Search supplier prices online for comparison',
      action: () => {},
      actionLabel: isArabic ? 'بحث' : 'Search',
    },
  ];

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
        
        <SmartSuggestionsBanner suggestions={suggestions} />
        
        <MaterialPriceDatabase />
      </div>
    </PageLayout>
  );
};

export default MaterialPricesPage;
