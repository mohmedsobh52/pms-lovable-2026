

# تحسين أداء قسم العقود الهندسية

## المشاكل الحالية

المكون `ContractManagement.tsx` يتكون من **1224 سطر** في ملف واحد، مما يسبب:

1. **إعادة رندرة كاملة عند كل ضغطة مفتاح** - كل تغيير في النموذج يعيد رندرة الصفحة بالكامل (الهيدر + الإحصائيات + كل التبويبات)
2. **حسابات متكررة غير ضرورية** - الإحصائيات (إجمالي القيمة، العقود النشطة، نسبة الإنجاز) تُحسب عند كل رندرة
3. **عدم وجود ترقيم صفحات** - كل العقود تُعرض دفعة واحدة بدون pagination
4. **عدم تحسين الدوال** - كل الدوال مثل `handleSave`, `handleDelete`, `formatCurrency` تُنشأ من جديد عند كل رندرة
5. **إنشاء كائنات مضمنة** - مصفوفات الإحصائيات والتبويبات تُنشأ في كل رندرة

## الحل

### 1. تحسين الحسابات بـ `useMemo`

تغليف حسابات الإحصائيات (`totalValue`, `activeContracts`, `completedContracts`, `avgProgress`) في `useMemo` بدلاً من حسابها مباشرة.

### 2. تحسين الدوال بـ `useCallback`

تغليف الدوال الرئيسية (`handleSave`, `handleDelete`, `resetForm`, `formatCurrency`, `openEditDialog`, `openViewDialog`, `applyTemplate`, `selectFIDIC`) في `useCallback` لمنع إعادة إنشائها.

### 3. فصل المكونات الثقيلة

استخراج الأقسام التالية كمكونات فرعية مع `React.memo`:

- `ContractStatsBar` - شريط الإحصائيات
- `ContractCreateForm` - نموذج إنشاء العقد  
- `FIDICSelector` - تبويب FIDIC
- `ContractTemplates` - تبويب القوالب
- `ContractsList` - قائمة العقود
- `ContractViewDialog` - حوار عرض العقد

### 4. إضافة ترقيم صفحات (Pagination)

استخدام `usePagination` الموجود بالفعل مع `PaginationControls` لعرض العقود على صفحات (10 عقود لكل صفحة).

### 5. نقل الثوابت خارج المكون

التأكد من أن `FIDIC_BOOKS`, `CONTRACT_TEMPLATES`, `contractTypes`, `statuses`, `projectTypes`, `contractorCategories` معرّفة خارج المكون (بعضها موجود بالفعل).

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/ContractManagement.tsx` | تحسينات الأداء + فصل المكونات + pagination |

### تحسينات `useMemo`

```typescript
const stats = useMemo(() => ({
  totalValue: filteredContracts.reduce((sum, c) => sum + (c.contract_value || 0), 0),
  activeContracts: filteredContracts.filter(c => c.status === "active").length,
  completedContracts: filteredContracts.filter(c => c.status === "completed").length,
  avgProgress: filteredContracts.length > 0
    ? filteredContracts.reduce((sum, c) => sum + getContractProgress(c), 0) / filteredContracts.length
    : 0,
}), [filteredContracts]);
```

### تحسينات `useCallback`

```typescript
const handleSave = useCallback(async () => { ... }, [user, formData, editingContract, projectId]);
const handleDelete = useCallback(async (id: string) => { ... }, [user]);
const formatCurrency = useCallback((value: number, currency: string) => { ... }, [isArabic]);
```

### نقل الثوابت خارج المكون

نقل `statuses`, `contractorCategories`, `projectTypes`, `contractTypes` خارج المكون لأنها ثابتة ولا تعتمد على أي state.

### إضافة Pagination

```typescript
const pagination = usePagination({ pageSize: 10 });

useEffect(() => {
  pagination.setTotalItems(filteredContracts.length);
}, [filteredContracts.length]);

const paginatedContracts = useMemo(() => {
  return filteredContracts.slice(pagination.from, pagination.to + 1);
}, [filteredContracts, pagination.from, pagination.to]);
```

### فصل المكونات الفرعية (داخل نفس الملف باستخدام React.memo)

```typescript
const ContractCard = React.memo(({ contract, onView, onEdit, onDelete, ... }) => { ... });
const StatsBar = React.memo(({ stats, formatCurrency, isArabic }) => { ... });
```

