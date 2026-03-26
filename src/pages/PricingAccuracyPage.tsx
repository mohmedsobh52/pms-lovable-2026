import React, { useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { PageLayout } from '@/components/PageLayout';
import { PageHeader } from '@/components/PageHeader';
import { NavigationBar } from '@/components/NavigationBar';
import { PricingAccuracyTab } from '@/components/tender/PricingAccuracyTab';
import { Target, TrendingUp, DollarSign } from 'lucide-react';
import { SmartSuggestionsBanner, SmartSuggestion } from '@/components/SmartSuggestionsBanner';
import { useNavigate } from 'react-router-dom';

const PricingAccuracyPage: React.FC = () => {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const suggestions = useMemo((): SmartSuggestion[] => [
    { id: 'compare', icon: <TrendingUp className="h-4 w-4" />, text: isArabic ? 'قارن دقة التسعير بالأسعار التاريخية' : 'Compare pricing accuracy with historical prices', action: () => navigate('/historical-pricing'), actionLabel: isArabic ? 'مقارنة' : 'Compare' },
    { id: 'market', icon: <DollarSign className="h-4 w-4" />, text: isArabic ? 'راجع أسعار السوق الحالية لتحسين الدقة' : 'Check current market prices to improve accuracy', action: () => navigate('/material-prices'), actionLabel: isArabic ? 'الأسعار' : 'Prices' },
  ], [isArabic, navigate]);

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
        <NavigationBar showBreadcrumbs />
        <PageHeader
          icon={Target}
          title={isArabic ? "دقة التسعير" : "Pricing Accuracy"}
          subtitle={isArabic ? "تحليل دقة الأسعار والتسعير" : "Analyze pricing accuracy and performance"}
        />
        <SmartSuggestionsBanner suggestions={suggestions} />
        <PricingAccuracyTab isArabic={isArabic} />
      </div>
    </PageLayout>
  );
};

export default PricingAccuracyPage;
