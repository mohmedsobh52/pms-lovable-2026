import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export interface StatItem {
  value: string | number;
  label: string;
  type?: 'default' | 'gold' | 'percentage';
}

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  stats?: StatItem[];
}

export const PageHeader = ({ icon: Icon, title, subtitle, actions, stats }: PageHeaderProps) => {
  return (
    <div className="page-header-gradient rounded-2xl overflow-hidden mb-6">
      {/* Main header row */}
      <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="text-white/70 text-sm mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* Stats bar */}
      {stats && stats.length > 0 && (
        <div className="px-6 py-3 bg-white/5 backdrop-blur-sm border-t border-white/10">
          <div className="flex flex-wrap gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col">
                <span
                  className={`text-lg font-bold ${
                    stat.type === 'gold'
                      ? 'text-[#F5A623]'
                      : stat.type === 'percentage'
                      ? 'text-[#F5A623]'
                      : 'text-white'
                  }`}
                >
                  {stat.value}
                </span>
                <span className="text-white/60 text-xs">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
