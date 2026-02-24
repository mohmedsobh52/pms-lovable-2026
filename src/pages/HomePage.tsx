import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import BackgroundImage from "@/components/BackgroundImage";
import { PMSLogo } from "@/components/PMSLogo";
import { supabase } from "@/integrations/supabase/client";
import developerPhoto from "@/assets/developer/mohamed-sobh.jpg";
import alimtyazLogo from "@/assets/company/alimtyaz-logo.jpg";
import { useEffect, useState, useCallback, memo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen,
  Layers,
  DollarSign,
  Briefcase,
  Package,
  Users,
  AlertTriangle,
  FileText,
  FileSearch,
  Award,
  BookOpen,
  Phone,
  Mail,
} from "lucide-react";

const sections = [
  { nameAr: "المشاريع", nameEn: "Projects", descAr: "إدارة ومتابعة المشاريع", descEn: "Manage & track projects", path: "/projects", icon: FolderOpen, color: "from-blue-600/40 to-blue-800/25", iconColor: "text-blue-200", countKey: "saved_projects" },
  { nameAr: "جدول الكميات", nameEn: "BOQ Items", descAr: "بنود الأعمال والكميات", descEn: "Work items & quantities", path: "/items", icon: Layers, color: "from-emerald-600/40 to-emerald-800/25", iconColor: "text-emerald-200", countKey: "project_items" },
  { nameAr: "التسعير والتحليل", nameEn: "Cost Analysis", descAr: "تحليل التكاليف والأسعار", descEn: "Cost & price analysis", path: "/cost-analysis", icon: DollarSign, color: "from-amber-600/40 to-amber-800/25", iconColor: "text-amber-200", countKey: "cost_analysis" },
  { nameAr: "العقود", nameEn: "Contracts", descAr: "إدارة العقود والضمانات", descEn: "Contracts & warranties", path: "/contracts", icon: Briefcase, color: "from-purple-600/40 to-purple-800/25", iconColor: "text-purple-200", countKey: "contracts" },
  { nameAr: "عروض الاسعار", nameEn: "Quotations", descAr: "مقارنة ورفع العروض", descEn: "Upload & compare quotes", path: "/quotations", icon: FileSearch, color: "from-pink-600/40 to-pink-800/25", iconColor: "text-pink-200", countKey: null },
  { nameAr: "المشتريات", nameEn: "Procurement", descAr: "طلبات الشراء والموردين", descEn: "Procurement & suppliers", path: "/procurement", icon: Package, color: "from-cyan-600/40 to-cyan-800/25", iconColor: "text-cyan-200", countKey: "external_partners" },
  { nameAr: "مقاولي الباطن", nameEn: "Subcontractors", descAr: "إدارة مقاولي الباطن", descEn: "Subcontractor management", path: "/subcontractors", icon: Users, color: "from-orange-600/40 to-orange-800/25", iconColor: "text-orange-200", countKey: "subcontractors" },
  { nameAr: "المخاطر", nameEn: "Risk", descAr: "تقييم وإدارة المخاطر", descEn: "Risk assessment", path: "/risk", icon: AlertTriangle, color: "from-red-600/40 to-red-800/25", iconColor: "text-red-200", countKey: "risks" },
  { nameAr: "التقارير", nameEn: "Reports", descAr: "التقارير والتحليلات", descEn: "Reports & analytics", path: "/projects?tab=reports", icon: FileText, color: "from-indigo-600/40 to-indigo-800/25", iconColor: "text-indigo-200", countKey: null },
  { nameAr: "المستخلصات", nameEn: "Certificates", descAr: "الشهادات والمستخلصات", descEn: "Progress certificates", path: "/progress-certificates", icon: Award, color: "from-yellow-600/40 to-yellow-800/25", iconColor: "text-yellow-200", countKey: "progress_certificates" },
  { nameAr: "المكتبة", nameEn: "Library", descAr: "مكتبة الأسعار والمواد", descEn: "Price & material library", path: "/library", icon: BookOpen, color: "from-teal-600/40 to-teal-800/25", iconColor: "text-teal-200", countKey: "material_prices" },
];

type CountsMap = Record<string, number>;
type ActivityItem = { type: string; name: string; date: string; icon: string };

const tableKeys = [
  "saved_projects", "project_items", "cost_analysis", "contracts",
  "external_partners", "subcontractors", "risks", "progress_certificates", "material_prices",
] as const;

const CACHE_KEY = "pms_home_counts";
const CACHE_TTL = 5 * 60 * 1000;

// Memoized navigation card
const NavCard = memo(({ section, index, count, isArabic }: {
  section: typeof sections[0]; index: number; count?: number; isArabic: boolean;
}) => {
  const Icon = section.icon;
  return (
    <Link
      to={section.path}
      className={`group relative flex flex-col items-center justify-center gap-2 md:gap-3 p-4 md:p-6 rounded-xl
        bg-black/50 backdrop-blur-md border border-white/20
        hover:border-white/40 hover:scale-[1.08] hover:shadow-xl hover:shadow-black/30
        transition-all duration-200 transform-gpu will-change-transform
        cursor-pointer shadow-lg
        bg-gradient-to-br ${section.color}`}
      style={{
        animation: 'card-enter 0.4s ease-out forwards',
        animationDelay: `${index * 50}ms`,
        opacity: 0,
      }}
    >
      {count !== undefined && count > 0 && (
        <span className="absolute top-2 end-2 bg-white/25 text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center shadow-sm">
          {count}
        </span>
      )}

      <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl bg-white/10 group-hover:bg-white/20 group-hover:ring-2 group-hover:ring-white/25 flex items-center justify-center transition-all duration-200 group-hover:-translate-y-1`}>
        <Icon className={`w-6 h-6 md:w-8 md:h-8 ${section.iconColor} drop-shadow-lg`} />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-xs md:text-sm">{section.nameAr}</p>
        <p className="text-white/80 text-[10px] md:text-xs mt-0.5">{section.nameEn}</p>
        <p className="text-white/55 text-[9px] md:text-[10px] mt-1 hidden sm:block">
          {isArabic ? section.descAr : section.descEn}
        </p>
      </div>
    </Link>
  );
});
NavCard.displayName = "NavCard";

export default function HomePage() {
  const { isArabic } = useLanguage();
  const [counts, setCounts] = useState<CountsMap>({});
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setCounts(data);
          setIsLoading(false);
          return;
        }
      }
    } catch {}

    const results: CountsMap = {};
    const promises = tableKeys.map(async (table) => {
      try {
        const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
        results[table] = count ?? 0;
      } catch {
        results[table] = 0;
      }
    });
    await Promise.all(promises);
    setCounts(results);
    setIsLoading(false);

    // Cache results
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: results, timestamp: Date.now() }));
    } catch {}

    // Fetch recent activities
    try {
      const [projRes, contRes] = await Promise.all([
        supabase.from("saved_projects").select("name, created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("contracts").select("contract_title, created_at").order("created_at", { ascending: false }).limit(2),
      ]);
      const acts: ActivityItem[] = [];
      projRes.data?.forEach(p => acts.push({ type: "project", name: p.name, date: p.created_at, icon: "📊" }));
      contRes.data?.forEach(c => acts.push({ type: "contract", name: c.contract_title, date: c.created_at, icon: "📄" }));
      acts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivities(acts.slice(0, 5));
    } catch {}
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return (
    <div className="min-h-screen flex flex-col" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        @keyframes card-enter {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes hero-enter {
          from { opacity: 0; transform: translateY(-15px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes stat-enter {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <BackgroundImage />
      <UnifiedHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-3 md:px-4 py-6 md:py-8">
        {/* Quick Stats Strip */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-4 md:gap-6 mb-5 flex-wrap">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-full bg-white/10" />
            ))}
          </div>
        ) : Object.keys(counts).length > 0 && (
          <div className="flex items-center justify-center gap-4 md:gap-6 mb-5 flex-wrap">
            {[
              { label: isArabic ? "مشروع" : "Projects", value: counts.saved_projects || 0, icon: "📊" },
              { label: isArabic ? "عقد" : "Contracts", value: counts.contracts || 0, icon: "📄" },
              { label: isArabic ? "بند" : "Items", value: counts.project_items || 0, icon: "📋" },
              { label: isArabic ? "مادة" : "Materials", value: counts.material_prices || 0, icon: "🏗️" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 text-white text-sm shadow-md"
                style={{
                  animation: 'stat-enter 0.3s ease-out forwards',
                  animationDelay: `${i * 80}ms`,
                  opacity: 0,
                }}
              >
                <span>{stat.icon}</span>
                <span className="font-bold">{stat.value.toLocaleString()}</span>
                <span className="text-white/75">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recent Activity Feed */}
        {isLoading ? (
          <div className="max-w-2xl w-full mb-5">
            <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/15 p-4">
              <Skeleton className="h-3 w-24 mb-3 bg-white/10" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-6 w-full bg-white/10 rounded" />
                ))}
              </div>
            </div>
          </div>
        ) : activities.length > 0 && (
          <div className="max-w-2xl w-full mb-5">
            <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/15 p-4">
              <p className="text-white/70 text-xs font-medium mb-2.5 px-1">{isArabic ? "آخر الأنشطة" : "Recent Activity"}</p>
              <div className="space-y-1">
                {activities.map((act, i) => (
                  <div key={i} className="flex items-center gap-2 text-white/85 text-sm px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <span>{act.icon}</span>
                    <span className="truncate flex-1">{act.name}</span>
                    <span className="text-white/45 shrink-0 text-xs">
                      {formatDistanceToNow(new Date(act.date), { addSuffix: true, locale: isArabic ? ar : enUS })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Welcome Header */}
        <div
          className="flex items-center gap-3 mb-6 md:mb-8"
          style={{ animation: 'hero-enter 0.5s ease-out forwards' }}
        >
          <div className="relative">
            <PMSLogo size="xl" />
            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-xl -z-10" />
          </div>
          <div className="text-center">
            <h1
              className="text-2xl md:text-4xl font-bold text-white"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 0 40px rgba(59,130,246,0.15)' }}
            >
              {isArabic ? "نظام إدارة المشاريع" : "Project Management System"}
            </h1>
            <p className="text-white/75 text-sm md:text-base mt-1">
              {isArabic ? "اختر القسم للبدء" : "Select a section to begin"}
            </p>
          </div>
          <img
            src={alimtyazLogo}
            alt="Alimtyaz Logo"
            className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-contain bg-white/10 p-1"
            loading="lazy"
          />
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 max-w-5xl w-full">
          {sections.map((section, index) => {
            const count = section.countKey ? counts[section.countKey] : undefined;
            return (
              <NavCard
                key={section.path}
                section={section}
                index={index}
                count={count}
                isArabic={isArabic}
              />
            );
          })}
        </div>
      </main>

      {/* Designer Footer */}
      <footer className="bg-black/50 backdrop-blur-md border-t border-white/10 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={developerPhoto}
                alt="Dr.Eng. Mohamed Sobh"
                className="w-12 h-12 rounded-full ring-2 ring-primary/30 object-cover"
                loading="lazy"
              />
              <div>
                <p className="text-white font-semibold text-sm">Dr.Eng. Mohamed Sobh</p>
                <p className="text-white/60 text-xs">
                  {isArabic ? "مدير المشاريع" : "Projects Director"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-white/70 text-xs">
              <a href="tel:+966548000243" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5" />
                <span>+966 54 800 0243</span>
              </a>
              <a href="mailto:moh.sobh@imtyaz.sa" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Mail className="w-3.5 h-3.5" />
                <span>moh.sobh@imtyaz.sa</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <img src={alimtyazLogo} alt="AL IMTYAZ" className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1" loading="lazy" />
              <span className="text-white/60 text-xs">AL IMTYAZ ALWATANIYA CONT.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
