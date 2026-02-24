import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { keys: ['Ctrl', 'K'], descEn: 'Open Global Search', descAr: 'فتح البحث الشامل' },
  { keys: ['Ctrl', 'N'], descEn: 'New Project', descAr: 'مشروع جديد' },
  { keys: ['/'], descEn: 'Show Shortcuts', descAr: 'عرض الاختصارات' },
  { keys: ['Esc'], descEn: 'Close Dialog', descAr: 'إغلاق النافذة' },
];

export function KeyboardShortcutsDialog({ open, onOpenChange }: Props) {
  const { isArabic } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            {isArabic ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-foreground">
                {isArabic ? s.descAr : s.descEn}
              </span>
              <div className="flex items-center gap-1">
                {s.keys.map((key) => (
                  <kbd
                    key={key}
                    className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
