import { NotificationSettings } from "@/components/NotificationSettings";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";

const SettingsPage = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          {isArabic ? "الإعدادات" : "Settings"}
        </h2>
        <NotificationSettings />
      </div>
    </PageLayout>
  );
};

export default SettingsPage;
