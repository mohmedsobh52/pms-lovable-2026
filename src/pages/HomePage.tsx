import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { UnifiedHeader } from "@/components/UnifiedHeader";

import { PMSLogo } from "@/components/PMSLogo";
import { supabase } from "@/integrations/supabase/client";
import developerPhoto from "@/assets/developer/mohamed-sobh.jpg";
import alimtyazLogo from "@/assets/company/alimtyaz-logo.jpg";
import { useEffect, useState, useCallback, useMemo, memo } from "react";
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
  BarChart3,
} from "lucide-react";

const sections = [
  { nameAr: "المشاريع", nameEn: "Projects", descAr: "إدارة ومتابعة المشاريع", descEn: "Manage & track projects", path: "/projects", icon: FolderOpen, countKey: "saved_projects" },
  { nameAr: "جدول الكميات", nameEn: "BOQ Items", descAr: "بنود الأعمال والكميات", descEn: "Work items & quantities", path: "/items", icon: Layers, countKey: "project_items" },
  { nameAr: "التسعير والتحليل", nameEn: "Cost Analysis", descAr: "تحليل التكاليف والأسعار", descEn: "Cost & price analysis", path: "/cost-analysis", icon: DollarSign, countKey: "cost_analysis" },
  { nameAr: "العقود", nameEn: "Contracts", descAr: "إدارة العقود والضمانات", descEn: "Contracts & warranties", path: "/contracts", icon: Briefcase, countKey: "contracts" },
  { nameAr: "عروض الاسعار", nameEn: "Quotations", descAr: "مقارنة ورفع العروض", descEn: "Upload & compare quotes", path: "/quotations", icon: FileSearch, countKey: null },
  { nameAr: "المشتريات", nameEn: "Procurement", descAr: "طلبات الشراء والموردين", descEn: "Procurement & suppliers", path: "/procurement", icon: Package, countKey: "external_partners" },
  { nameAr: "مقاولي الباطن", nameEn: "Subcontractors", descAr: "إدارة مقاولي الباطن", descEn: "Subcontractor management", path: "/subcontractors", icon: Users, countKey: "subcontractors" },
  { nameAr: "المخاطر", nameEn: "Risk", descAr: "تقييم وإدارة المخاطر", descEn: "Risk assessment", path: "/risk", icon: AlertTriangle, countKey: "risks" },
  { nameAr: "التقارير", nameEn: "Reports", descAr: "التقارير والتحليلات", descEn: "Reports & analytics", path: "/projects?tab=reports", icon: FileText, countKey: null },
  { nameAr: "المستخلصات", nameEn: "Certificates", descAr: "الشهادات والمستخلصات", descEn: "Progress certificates", path: "/progress-certificates", icon: Award, countKey: "progress_certificates" },
  { nameAr: "المكتبة", nameEn: "Library", descAr: "مكتبة الأسعار والمواد", descEn: "Price & material library", path: "/library", icon: BookOpen, countKey: "material_prices" },
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
        backdrop-blur-md border border-white/15
        hover:border-gold/50 hover:scale-[1.08] hover:shadow-xl hover:shadow-gold/10
        transition-all duration-200 transform-gpu will-change-transform
        cursor-pointer shadow-lg
        bg-gradient-to-br from-[hsl(218,50%,18%)] via-[hsl(218,45%,22%)] to-[hsl(217,91%,35%)]`}
      style={{
        animation: 'card-enter 0.4s ease-out forwards',
        animationDelay: `${index * 50}ms`,
        opacity: 0,
      }}
    >
      {count !== undefined && count > 0 && (
        <span className="absolute top-2 end-2 bg-gold/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center shadow-sm">
          {count}
        </span>
      )}

      <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-white/10 group-hover:bg-gold/20 group-hover:ring-2 group-hover:ring-gold/30 flex items-center justify-center transition-all duration-200 group-hover:-translate-y-1">
        <Icon className="w-6 h-6 md:w-8 md:h-8 text-gold/90 drop-shadow-lg" />
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

  const fetchData = useCallback(async () => {
    // Check sessionStorage cache first
    let cachedCounts: CountsMap | null = null;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          cachedCounts = data;
          setCounts(data);
        }
      }
    } catch {}

    // Fetch counts and activities in parallel
    const countsPromise = cachedCounts ? Promise.resolve(cachedCounts) : (async () => {
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
      return results;
    })();

    const activitiesPromise = (async () => {
      try {
        const [projRes, contRes] = await Promise.all([
          supabase.from("saved_projects").select("name, created_at").order("created_at", { ascending: false }).limit(3),
          supabase.from("contracts").select("contract_title, created_at").order("created_at", { ascending: false }).limit(2),
        ]);
        const acts: ActivityItem[] = [];
        projRes.data?.forEach(p => acts.push({ type: "project", name: p.name, date: p.created_at, icon: "project" }));
        contRes.data?.forEach(c => acts.push({ type: "contract", name: c.contract_title, date: c.created_at, icon: "contract" }));
        acts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return acts.slice(0, 5);
      } catch {
        return [];
      }
    })();

    const [countsResult, activitiesResult] = await Promise.all([countsPromise, activitiesPromise]);

    if (!cachedCounts) {
      setCounts(countsResult);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: countsResult, timestamp: Date.now() }));
      } catch {}
    }
    setActivities(activitiesResult);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formattedDates = useMemo(() =>
    activities.map(act =>
      formatDistanceToNow(new Date(act.date), { addSuffix: true, locale: isArabic ? ar : enUS })
    ), [activities, isArabic]);

  return (
    <div className="min-h-screen flex flex-col home-bg" dir={isArabic ? "rtl" : "ltr"}>
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
      <UnifiedHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-3 md:px-4 py-6 md:py-8">
        {/* Quick Stats Strip */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 md:gap-4 mb-8 flex-wrap max-w-4xl">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-36 rounded-2xl bg-white/10" />
            ))}
          </div>
        ) : Object.keys(counts).length > 0 && (
          <div className="flex items-center justify-center gap-3 md:gap-4 mb-8 flex-wrap max-w-4xl">
            {[
              { label: isArabic ? "مشروع" : "Projects", value: counts.saved_projects || 0, Icon: FolderOpen, color: "text-blue-400" },
              { label: isArabic ? "عقد" : "Contracts", value: counts.contracts || 0, Icon: Briefcase, color: "text-emerald-400" },
              { label: isArabic ? "بند" : "Items", value: counts.project_items || 0, Icon: Layers, color: "text-purple-400" },
              { label: isArabic ? "مادة" : "Materials", value: counts.material_prices || 0, Icon: Package, color: "text-orange-400" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl px-5 py-3 text-white shadow-lg hover:bg-white/15 hover:border-[#F5A623]/30 transition-all duration-200 group"
                style={{
                  animation: 'stat-enter 0.4s ease-out forwards',
                  animationDelay: `${i * 100}ms`,
                  opacity: 0,
                }}
              >
                <div className="w-9 h-9 rounded-xl bg-white/10 group-hover:bg-white/15 flex items-center justify-center transition-colors">
                  <stat.Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-[#F5A623] leading-tight" style={{ textShadow: '0 0 12px rgba(245,166,35,0.3)' }}>
                    {stat.value.toLocaleString()}
                  </span>
                  <span className="text-white/60 text-[11px]">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Activity Feed */}
        {isLoading ? (
          <div className="max-w-3xl w-full mb-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-lg">
              <Skeleton className="h-4 w-28 mb-4 bg-white/10" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full bg-white/10 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        ) : activities.length > 0 && (
          <div className="max-w-3xl w-full mb-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-lg">
              <p className="text-white/80 text-sm font-semibold mb-3 px-1">{isArabic ? "آخر الأنشطة" : "Recent Activity"}</p>
              <div className="divide-y divide-white/5">
                {activities.map((act, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-white/90 text-sm px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 cursor-default"
                    style={{
                      animation: 'card-enter 0.3s ease-out forwards',
                      animationDelay: `${i * 80}ms`,
                      opacity: 0,
                    }}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      act.type === 'project' ? 'bg-blue-500/15' : 'bg-emerald-500/15'
                    }`}>
                      {act.type === 'project'
                        ? <BarChart3 className="w-4 h-4 text-blue-400" />
                        : <FileText className="w-4 h-4 text-emerald-400" />
                      }
                    </div>
                    <span className="truncate flex-1 font-medium">{act.name}</span>
                    <span className="text-white/45 shrink-0 text-xs">
                      {formattedDates[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Welcome Header */}
        <div
          className="flex flex-col items-center gap-4 mb-8 md:mb-10 max-w-4xl relative"
          style={{ animation: 'hero-enter 0.5s ease-out forwards' }}
        >
          {/* Radial glow behind hero */}
          <div className="absolute inset-0 -z-10 opacity-30" style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.2) 0%, transparent 70%)' }} />
          
          <div className="flex items-center gap-4">
            <img
              src={alimtyazLogo}
              alt="Alimtyaz Logo"
              className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-contain bg-white/10 p-1.5 border border-white/20 shadow-lg"
              loading="lazy"
            />
            <div className="relative">
              <PMSLogo size="xl" />
              <div className="absolute inset-0 rounded-lg bg-blue-500/20 blur-xl -z-10" />
            </div>
            <img
              src={alimtyazLogo}
              alt="Alimtyaz Logo"
              className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-contain bg-white/10 p-1.5 border border-white/20 shadow-lg opacity-0 pointer-events-none"
              aria-hidden="true"
            />
          </div>

          <div className="text-center">
            <h1
              className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent"
              style={{ textShadow: '0 2px 20px rgba(59,130,246,0.2)' }}
            >
              {isArabic ? "نظام إدارة المشاريع" : "Project Management System"}
            </h1>
            
            {/* Decorative gold line */}
            <div className="flex items-center justify-center gap-2 my-3">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#F5A623]/60" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#F5A623]/80" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#F5A623]/60" />
            </div>

            <p className="text-[#F5A623]/80 text-sm md:text-base font-medium">
              {isArabic ? "اختر القسم للبدء" : "Select a section to begin"}
            </p>
          </div>
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
      <footer className="bg-gradient-to-r from-[hsl(218,50%,12%)] to-[hsl(218,45%,18%)] backdrop-blur-md border-t border-white/10 py-4">
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
