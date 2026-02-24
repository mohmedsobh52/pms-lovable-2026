import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { LibraryDatabase } from "@/components/LibraryDatabase";
import { useLanguage } from "@/hooks/useLanguage";
import { Library } from "lucide-react";

const LibraryPage = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Library}
          title={isArabic ? "المكتبة" : "Library"}
          subtitle={isArabic ? "إدارة المواد وأسعار العمالة والمعدات" : "Manage materials, labor rates, and equipment prices"}
        />
        
        <LibraryDatabase />
      </div>
    </PageLayout>
  );
};

export default LibraryPage;
