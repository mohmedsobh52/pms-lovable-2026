

# خطة إضافة البحث الشامل الديناميكي (Global Search)

## نظرة عامة

إنشاء مكون بحث شامل (Command Palette) يظهر في كل الشاشات ويمكنه البحث عن:
- الصفحات والمسارات
- المشاريع المحفوظة
- الميزات والأدوات
- الإعدادات
- الملفات والمرفقات
- الاختصارات السريعة

---

## التجربة المتوقعة

```text
┌────────────────────────────────────────────────────────┐
│  🔍 Search anything...  (Ctrl/⌘ + K)                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  📁 Pages                                              │
│  ├── Dashboard                              LayoutDashboard │
│  ├── Projects                               FolderOpen      │
│  └── Cost Analysis                          BarChart3       │
│                                                        │
│  📋 Recent Projects                                    │
│  ├── مشروع الرياض السكني                    FolderOpen │
│  └── NEOM Infrastructure                    FolderOpen │
│                                                        │
│  ⚡ Quick Actions                                       │
│  ├── New Project                            Plus       │
│  ├── Fast Extraction                        Zap        │
│  └── Export Report                          Download   │
│                                                        │
│  ⚙️ Settings                                           │
│  ├── Company Settings                       Building2  │
│  └── AI Model                               Brain      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## المكونات الجديدة

### 1. GlobalSearch Component

**الملف:** `src/components/GlobalSearch.tsx`

```typescript
interface SearchItem {
  id: string;
  type: 'page' | 'project' | 'action' | 'setting' | 'file';
  label: string;
  labelAr: string;
  description?: string;
  descriptionAr?: string;
  icon: string;
  href?: string;
  action?: () => void;
  keywords: string[];
}
```

#### الوظائف:
- استخدام `cmdk` (Command Menu) الموجود بالفعل
- دعم اختصار لوحة المفاتيح `Ctrl/⌘ + K`
- بحث ديناميكي في الوقت الحقيقي
- تجميع النتائج حسب النوع
- دعم ثنائي اللغة (عربي/إنجليزي)

---

### 2. useGlobalSearch Hook

**الملف:** `src/hooks/useGlobalSearch.tsx`

#### الوظائف:
- جمع جميع عناصر البحث من مصادر متعددة
- جلب المشاريع من قاعدة البيانات
- دمج الصفحات الثابتة
- البحث في الكلمات المفتاحية (EN + AR)

```typescript
// مصادر البيانات
const searchSources = {
  pages: staticPagesData,      // من routeMap الموجود
  projects: supabaseQuery,     // من project_data
  actions: quickActionsData,   // إجراءات سريعة
  settings: settingsData,      // إعدادات
  files: attachmentsQuery,     // مرفقات (اختياري)
};
```

---

## التغييرات على الملفات الموجودة

### 1. UnifiedHeader.tsx

إضافة زر البحث:

```tsx
// في منطقة الـ Actions (يمين الـ header)
<Button
  variant="ghost"
  size="sm"
  onClick={() => setSearchOpen(true)}
  className="gap-2 hidden sm:flex"
>
  <Search className="h-4 w-4" />
  <span className="text-xs text-muted-foreground">⌘K</span>
</Button>
```

### 2. App.tsx

إضافة GlobalSearch على المستوى الأعلى:

```tsx
<BrowserRouter>
  <GlobalSearch /> {/* جديد - يظهر فوق كل الصفحات */}
  <UpdateBanner />
  {/* ... */}
</BrowserRouter>
```

---

## بيانات البحث

### الصفحات الثابتة (Static Pages)

```typescript
const staticPages: SearchItem[] = [
  {
    id: 'dashboard',
    type: 'page',
    label: 'Dashboard',
    labelAr: 'لوحة التحكم',
    icon: 'LayoutDashboard',
    href: '/dashboard',
    keywords: ['dashboard', 'لوحة', 'التحكم', 'home'],
  },
  {
    id: 'projects',
    type: 'page',
    label: 'Saved Projects',
    labelAr: 'المشاريع المحفوظة',
    icon: 'FolderOpen',
    href: '/projects',
    keywords: ['projects', 'مشاريع', 'saved', 'محفوظة'],
  },
  // ... جميع الصفحات الموجودة في routeMap
];
```

### المشاريع من قاعدة البيانات

```typescript
// جلب من Supabase
const { data: projects } = await supabase
  .from('project_data')
  .select('id, name, created_at')
  .order('created_at', { ascending: false })
  .limit(10);

// تحويل إلى SearchItem
const projectItems: SearchItem[] = projects?.map(p => ({
  id: p.id,
  type: 'project',
  label: p.name,
  labelAr: p.name,
  icon: 'FolderOpen',
  href: `/projects/${p.id}`,
  keywords: [p.name.toLowerCase()],
})) || [];
```

### الإجراءات السريعة

```typescript
const quickActions: SearchItem[] = [
  {
    id: 'new-project',
    type: 'action',
    label: 'Create New Project',
    labelAr: 'إنشاء مشروع جديد',
    icon: 'Plus',
    href: '/projects/new',
    keywords: ['new', 'create', 'جديد', 'إنشاء'],
  },
  {
    id: 'fast-extract',
    type: 'action',
    label: 'Fast Extraction',
    labelAr: 'استخراج سريع',
    icon: 'Zap',
    href: '/fast-extraction',
    keywords: ['fast', 'extract', 'سريع', 'استخراج'],
  },
];
```

---

## خوارزمية البحث

```typescript
const searchItems = (query: string, items: SearchItem[]): SearchItem[] => {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) return items.slice(0, 8); // عرض أحدث 8 عناصر
  
  return items
    .filter(item => {
      // البحث في العنوان
      if (item.label.toLowerCase().includes(normalizedQuery)) return true;
      if (item.labelAr.includes(normalizedQuery)) return true;
      
      // البحث في الكلمات المفتاحية
      if (item.keywords.some(k => k.includes(normalizedQuery))) return true;
      
      // البحث في الوصف
      if (item.description?.toLowerCase().includes(normalizedQuery)) return true;
      if (item.descriptionAr?.includes(normalizedQuery)) return true;
      
      return false;
    })
    .sort((a, b) => {
      // ترتيب حسب مطابقة العنوان أولاً
      const aExact = a.label.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
      const bExact = b.label.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
      return aExact - bExact;
    })
    .slice(0, 10);
};
```

---

## اختصارات لوحة المفاتيح

```typescript
// في GlobalSearch.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/⌘ + K لفتح البحث
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(true);
    }
    
    // Escape للإغلاق
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `src/components/GlobalSearch.tsx` | **جديد** - مكون البحث الشامل |
| `src/hooks/useGlobalSearch.tsx` | **جديد** - hook لإدارة بيانات البحث |
| `src/components/UnifiedHeader.tsx` | إضافة زر البحث (🔍) |
| `src/App.tsx` | إضافة GlobalSearch على المستوى الأعلى |
| `src/hooks/useNavigationHistory.tsx` | استخدام routeMap الموجود |

---

## تدفق العمل

```text
المستخدم                    GlobalSearch                    البيانات
   │                              │                              │
   │ (1) Ctrl+K أو نقر 🔍         │                              │
   ├─────────────────────────────►│                              │
   │                              │ (2) جلب المشاريع             │
   │                              ├─────────────────────────────►│
   │                              │◄────────────────────────────┤
   │                              │                              │
   │ (3) كتابة نص البحث           │                              │
   ├─────────────────────────────►│                              │
   │                              │ (4) تصفية + ترتيب            │
   │                              │                              │
   │◄─────────────────────────────┤ (5) عرض النتائج              │
   │                              │                              │
   │ (6) اختيار عنصر              │                              │
   ├─────────────────────────────►│                              │
   │                              │ (7) navigate() أو action()   │
   │                              │                              │
```

---

## النتيجة المتوقعة

```text
✅ بحث شامل يظهر في كل الشاشات
✅ اختصار Ctrl/⌘ + K للوصول السريع
✅ بحث في الصفحات والمسارات
✅ بحث في المشاريع المحفوظة من قاعدة البيانات
✅ إجراءات سريعة (New Project, Fast Extract, etc.)
✅ دعم ثنائي اللغة (AR/EN)
✅ تجميع النتائج حسب النوع
✅ أيقونات لكل عنصر
✅ أداء سريع مع debounce
```

---

## القسم التقني

### واجهات TypeScript

```typescript
// أنواع العناصر
type SearchItemType = 'page' | 'project' | 'action' | 'setting' | 'file';

// عنصر البحث
interface SearchItem {
  id: string;
  type: SearchItemType;
  label: string;
  labelAr: string;
  description?: string;
  descriptionAr?: string;
  icon: string;
  href?: string;
  action?: () => void;
  keywords: string[];
  projectId?: string; // للمشاريع
}

// تجميعات النتائج
interface SearchResults {
  pages: SearchItem[];
  projects: SearchItem[];
  actions: SearchItem[];
  settings: SearchItem[];
  files: SearchItem[];
}

// Hook return type
interface UseGlobalSearchReturn {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  results: SearchResults;
  isLoading: boolean;
  navigate: (item: SearchItem) => void;
}
```

### استخدام cmdk

```tsx
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput 
    placeholder={isArabic ? "ابحث عن أي شيء..." : "Search anything..."} 
    value={query}
    onValueChange={setQuery}
  />
  <CommandList>
    <CommandEmpty>
      {isArabic ? "لا توجد نتائج" : "No results found."}
    </CommandEmpty>
    
    {results.pages.length > 0 && (
      <CommandGroup heading={isArabic ? "الصفحات" : "Pages"}>
        {results.pages.map(item => (
          <CommandItem key={item.id} onSelect={() => navigate(item)}>
            <IconComponent name={item.icon} className="mr-2 h-4 w-4" />
            <span>{isArabic ? item.labelAr : item.label}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    )}
    
    {/* ... باقي المجموعات */}
  </CommandList>
</CommandDialog>
```

