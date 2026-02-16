import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import BackgroundImage from "@/components/BackgroundImage";
import { PMSLogo } from "@/components/PMSLogo";
import developerPhoto from "@/assets/developer/mohamed-sobh.jpg";
import alimtyazLogo from "@/assets/company/alimtyaz-logo.jpg";
import {
  FolderOpen,
  Layers,
  DollarSign,
  Briefcase,
  Package,
  Users,
  AlertTriangle,
  FileText,
  Award,
  BookOpen,
  Phone,
  Mail,
} from "lucide-react";

const sections = [
  { nameAr: "المشاريع", nameEn: "Projects", path: "/projects", icon: FolderOpen, color: "from-blue-500/30 to-blue-700/20", iconColor: "text-blue-300" },
  { nameAr: "جدول الكميات", nameEn: "BOQ Items", path: "/items", icon: Layers, color: "from-emerald-500/30 to-emerald-700/20", iconColor: "text-emerald-300" },
  { nameAr: "التسعير والتحليل", nameEn: "Cost Analysis", path: "/cost-analysis", icon: DollarSign, color: "from-amber-500/30 to-amber-700/20", iconColor: "text-amber-300" },
  { nameAr: "العقود", nameEn: "Contracts", path: "/contracts", icon: Briefcase, color: "from-purple-500/30 to-purple-700/20", iconColor: "text-purple-300" },
  { nameAr: "المشتريات", nameEn: "Procurement", path: "/procurement", icon: Package, color: "from-cyan-500/30 to-cyan-700/20", iconColor: "text-cyan-300" },
  { nameAr: "مقاولي الباطن", nameEn: "Subcontractors", path: "/subcontractors", icon: Users, color: "from-orange-500/30 to-orange-700/20", iconColor: "text-orange-300" },
  { nameAr: "المخاطر", nameEn: "Risk", path: "/risk", icon: AlertTriangle, color: "from-red-500/30 to-red-700/20", iconColor: "text-red-300" },
  { nameAr: "التقارير", nameEn: "Reports", path: "/projects?tab=reports", icon: FileText, color: "from-indigo-500/30 to-indigo-700/20", iconColor: "text-indigo-300" },
  { nameAr: "المستخلصات", nameEn: "Certificates", path: "/progress-certificates", icon: Award, color: "from-yellow-500/30 to-yellow-700/20", iconColor: "text-yellow-300" },
  { nameAr: "المكتبة", nameEn: "Library", path: "/library", icon: BookOpen, color: "from-teal-500/30 to-teal-700/20", iconColor: "text-teal-300" },
];

export default function HomePage() {
  const { isArabic } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col" dir={isArabic ? "rtl" : "ltr"}>
      <BackgroundImage />
      <UnifiedHeader />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Welcome Header */}
        <div className="flex items-center gap-3 mb-8">
          <PMSLogo size="lg" />
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {isArabic ? "نظام إدارة المشاريع" : "Project Management System"}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              {isArabic ? "اختر القسم للبدء" : "Select a section to begin"}
            </p>
          </div>
          <img src={alimtyazLogo} alt="Alimtyaz Logo" className="w-12 h-12 rounded-lg object-contain bg-white/10 p-1" />
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl w-full">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.path}
                to={section.path}
                className={`group relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl
                  bg-black/40 border border-white/15
                  hover:border-white/30 hover:scale-105
                  transition-transform transition-colors duration-200 transform-gpu will-change-transform
                  cursor-pointer shadow-lg
                  bg-gradient-to-br ${section.color}`}
              >
                <div className={`w-14 h-14 rounded-xl bg-white/10 group-hover:bg-white/20 group-hover:ring-2 group-hover:ring-white/20 flex items-center justify-center transition-colors duration-200`}>
                  <Icon className={`w-8 h-8 ${section.iconColor} drop-shadow`} />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">{section.nameAr}</p>
                  <p className="text-white/75 text-xs mt-0.5">{section.nameEn}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Designer Footer */}
      <footer className="bg-black/50 backdrop-blur-md border-t border-white/10 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Designer Info */}
            <div className="flex items-center gap-3">
              <img
                src={developerPhoto}
                alt="Dr.Eng. Mohamed Sobh"
                className="w-12 h-12 rounded-full ring-2 ring-primary/30 object-cover"
              />
              <div>
                <p className="text-white font-semibold text-sm">Dr.Eng. Mohamed Sobh</p>
                <p className="text-white/60 text-xs">
                  {isArabic ? "مدير المشاريع" : "Projects Director"}
                </p>
              </div>
            </div>

            {/* Contact Links */}
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

            {/* Company Logo */}
            <div className="flex items-center gap-2">
              <img src={alimtyazLogo} alt="AL IMTYAZ" className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1" />
              <span className="text-white/60 text-xs">AL IMTYAZ ALWATANIYA CONT.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
