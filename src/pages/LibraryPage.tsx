import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { LibraryDatabase } from "@/components/LibraryDatabase";
import { useLanguage } from "@/hooks/useLanguage";
import { Library, Upload, Search, FileDown } from "lucide-react";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";
import { useNavigate } from "react-router-dom";

const LibraryPage = () => {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const suggestions: SmartSuggestion[] = [
    {
      id: 'add-materials',
      icon: <Upload className="h-4 w-4" />,
      text: isArabic ? 'أضف مواد وأسعار جديدة لتحسين دقة التسعير التلقائي' : 'Add new materials and prices to improve auto-pricing accuracy',
      action: () => {},
      actionLabel: isArabic ? 'إضافة' : 'Add',
    },
    {
      id: 'search-prices',
      icon: <Search className="h-4 w-4" />,
      text: isArabic ? 'ابحث عن أسعار السوق الحالية من قاعدة البيانات المرجعية' : 'Search current market prices from the reference database',
      action: () => navigate('/material-prices'),
      actionLabel: isArabic ? 'بحث' : 'Search',
    },
    {
      id: 'export-library',
      icon: <FileDown className="h-4 w-4" />,
      text: isArabic ? 'صدّر المكتبة كملف Excel لمشاركتها مع الفريق' : 'Export library as Excel to share with your team',
      action: () => {},
      actionLabel: isArabic ? 'تصدير' : 'Export',
    },
  ];

  return (
    <PageLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Library}
          title={isArabic ? "المكتبة" : "Library"}
          subtitle={isArabic ? "إدارة المواد وأسعار العمالة والمعدات" : "Manage materials, labor rates, and equipment prices"}
        />
        
        <SmartSuggestionsBanner suggestions={suggestions} />
        
        <LibraryDatabase />
      </div>
    </PageLayout>
  );
};

export default LibraryPage;
