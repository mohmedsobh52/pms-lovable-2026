import { QuotationUpload } from "@/components/QuotationUpload";
import { QuotationComparison } from "@/components/QuotationComparison";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FileText } from "lucide-react";

const QuotationsPage = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <ErrorBoundary>
        <PageHeader
          icon={FileText}
          title={isArabic ? "عروض الأسعار" : "Quotations"}
          subtitle={isArabic ? "رفع ومقارنة عروض الأسعار" : "Upload and compare price quotations"}
        />
        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="tabs-navigation-safe">
            <TabsTrigger value="upload">
              {isArabic ? "رفع عروض الأسعار" : "Upload Quotations"}
            </TabsTrigger>
            <TabsTrigger value="compare">
              {isArabic ? "مقارنة العروض" : "Compare Quotations"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <QuotationUpload />
          </TabsContent>
          <TabsContent value="compare">
            <QuotationComparison />
          </TabsContent>
        </Tabs>
      </ErrorBoundary>
    </PageLayout>
  );
};

export default QuotationsPage;
