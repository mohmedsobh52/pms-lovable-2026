import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export interface SmartSuggestion {
  id: string;
  icon: React.ReactNode;
  text: string;
  action: () => void;
  actionLabel: string;
}

interface SmartSuggestionsBannerProps {
  suggestions: SmartSuggestion[];
  maxVisible?: number;
}

export function SmartSuggestionsBanner({ suggestions, maxVisible = 3 }: SmartSuggestionsBannerProps) {
  const { isArabic } = useLanguage();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visible = suggestions.filter(s => !dismissed.includes(s.id)).slice(0, maxVisible);
  if (visible.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Lightbulb className="h-4 w-4" />
        {isArabic ? 'اقتراحات وتوصيات' : 'Suggestions & Recommendations'}
      </div>
      <div className="space-y-2">
        {visible.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 bg-background/80 rounded-md p-2.5 border border-border/50">
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <span className="text-primary">{s.icon}</span>
              {s.text}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={s.action} className="h-7 text-xs gap-1">
                {s.actionLabel}
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setDismissed(prev => [...prev, s.id])}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
