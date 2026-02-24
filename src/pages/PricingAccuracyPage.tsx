import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { PageLayout } from '@/components/PageLayout';
import { PageHeader } from '@/components/PageHeader';
import { NavigationBar } from '@/components/NavigationBar';
import { PricingAccuracyTab } from '@/components/tender/PricingAccuracyTab';
import { Target } from 'lucide-react';

const PricingAccuracyPage: React.FC = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
        <NavigationBar showBreadcrumbs />
        <PageHeader
          icon={Target}
          title={isArabic ? "دقة التسعير" : "Pricing Accuracy"}
          subtitle={isArabic ? "تحليل دقة الأسعار والتسعير" : "Analyze pricing accuracy and performance"}
        />
        <PricingAccuracyTab isArabic={isArabic} />
      </div>
    </PageLayout>
  );
};

export default PricingAccuracyPage;
