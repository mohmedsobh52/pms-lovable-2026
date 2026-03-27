import { useMemo } from "react";
import { NotificationSettings } from "@/components/NotificationSettings";
import { AIModelSelector } from "@/components/AIModelSelector";
import { AnalysisStatusDashboard } from "@/components/AnalysisStatusDashboard";
import { CompanySettingsPanel } from "@/components/CompanySettingsPanel";
import { DeveloperInfo } from "@/components/DeveloperInfo";
import { CityFactorsManager } from "@/components/CityFactorsManager";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Bell, Activity, Building2, Info, Settings2, MapPin, Shield } from "lucide-react";
import { SmartSuggestionsBanner, SmartSuggestion } from "@/components/SmartSuggestionsBanner";

const SettingsPage = () => {
  const { isArabic } = useLanguage();

  const suggestions = useMemo((): SmartSuggestion[] => [
    {
      id: 'setup-company',
      icon: <Building2 className="h-4 w-4" />,
      text: isArabic ? 'أكمل بيانات الشركة لتظهر في التقارير' : 'Complete company info to appear in reports',
      action: () => document.querySelector<HTMLButtonElement>('[value="company"]')?.click(),
      actionLabel: isArabic ? 'إعداد' : 'Setup',
    },
    {
      id: 'setup-notifications',
      icon: <Bell className="h-4 w-4" />,
      text: isArabic ? 'فعّل الإشعارات لمتابعة تحديثات المشاريع' : 'Enable notifications to track project updates',
      action: () => document.querySelector<HTMLButtonElement>('[value="notifications"]')?.click(),
      actionLabel: isArabic ? 'تفعيل' : 'Enable',
    },
  ], [isArabic]);

  return (
    <PageLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Settings2}
          title={isArabic ? "الإعدادات" : "Settings"}
          subtitle={isArabic ? "إعدادات النظام والشركة والإشعارات" : "System, company, and notification settings"}
        />
        <SmartSuggestionsBanner suggestions={suggestions} />
        
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-6 tabs-navigation-safe">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "الشركة" : "Company"}</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "نموذج AI" : "AI Model"}</span>
            </TabsTrigger>
            <TabsTrigger value="city-factors" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "معاملات المدن" : "City Factors"}</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "التتبع" : "Tracking"}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "الإشعارات" : "Notifications"}</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "حول" : "About"}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="company" className="mt-6">
            <CompanySettingsPanel />
          </TabsContent>
          
          <TabsContent value="ai" className="mt-6">
            <AIModelSelector />
          </TabsContent>

          <TabsContent value="city-factors" className="mt-6">
            <CityFactorsManager />
          </TabsContent>
          
          <TabsContent value="tracking" className="mt-6">
            <AnalysisStatusDashboard />
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-6">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="max-w-xl">
              <h3 className="text-lg font-semibold mb-4">
                {isArabic ? "مصمم ومطور البرنامج" : "Program Designer & Developer"}
              </h3>
              <DeveloperInfo />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default SettingsPage;
