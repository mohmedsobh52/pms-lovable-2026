import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  description: string;
  descriptionAr: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { setIsOpen: setSearchOpen } = useGlobalSearch();
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts: ShortcutAction[] = [
    {
      key: 'k',
      ctrl: true,
      description: 'Open Global Search',
      descriptionAr: 'فتح البحث الشامل',
      action: () => setSearchOpen(true),
    },
    {
      key: 'n',
      ctrl: true,
      description: 'New Project',
      descriptionAr: 'مشروع جديد',
      action: () => navigate('/projects/new'),
    },
    {
      key: '/',
      description: 'Show Keyboard Shortcuts',
      descriptionAr: 'عرض اختصارات لوحة المفاتيح',
      action: () => setShowHelp(prev => !prev),
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : true;

        if (e.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && shiftMatch) {
          // Skip if ctrl is required but not pressed
          if (shortcut.ctrl && !(e.ctrlKey || e.metaKey)) continue;

          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return { shortcuts, showHelp, setShowHelp };
}
