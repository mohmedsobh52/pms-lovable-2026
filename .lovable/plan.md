

# إضافة التحكم في عرض أعمدة الوصف مع Wrap Text

## المشكلة

من الصورة المرفقة، النص العربي الطويل يأخذ مساحة رأسية كبيرة جداً لأن العمود ضيق والنص يتكسر على أسطر كثيرة. المستخدم يريد التحكم في عرض العمود مع ضمان التفاف النص (Wrap Text).

## الحل

### الملف: `src/components/HistoricalItemsTable.tsx`

#### 1. إضافة state للتحكم في عرض أعمدة الوصف

إضافة حالة `descColWidth` مع 3 خيارات (صغير / متوسط / كبير) وأزرار تبديل في شريط الأدوات.

```text
const [descColWidth, setDescColWidth] = useState<'sm' | 'md' | 'lg'>('md');

const descWidthClass = {
  sm: 'min-w-[200px] max-w-[250px]',
  md: 'min-w-[300px] max-w-[400px]',
  lg: 'min-w-[450px] max-w-[600px]',
};
```

#### 2. إضافة أزرار التحكم في شريط الأدوات (بعد سطر 225)

إضافة مجموعة أزرار صغيرة للتبديل بين أحجام العمود:

```text
<div className="flex items-center gap-1 border rounded-md px-1">
  <span className="text-[10px] text-muted-foreground">عرض الوصف:</span>
  <Button variant={descColWidth === 'sm' ? 'secondary' : 'ghost'} size="sm" className="h-6 text-[10px] px-2"
    onClick={() => setDescColWidth('sm')}>صغير</Button>
  <Button variant={descColWidth === 'md' ? 'secondary' : 'ghost'} size="sm" className="h-6 text-[10px] px-2"
    onClick={() => setDescColWidth('md')}>متوسط</Button>
  <Button variant={descColWidth === 'lg' ? 'secondary' : 'ghost'} size="sm" className="h-6 text-[10px] px-2"
    onClick={() => setDescColWidth('lg')}>كبير</Button>
</div>
```

#### 3. تطبيق العرض على أعمدة الوصف (سطر 269-270)

```text
// الحالي:
<TableHead className="text-xs whitespace-nowrap px-2 min-w-[280px]">Description</TableHead>
<TableHead className="text-xs whitespace-nowrap px-2 min-w-[280px]">وصف البند</TableHead>

// الجديد:
<TableHead className={`text-xs whitespace-nowrap px-2 ${descWidthClass[descColWidth]}`}>Description</TableHead>
<TableHead className={`text-xs whitespace-nowrap px-2 ${descWidthClass[descColWidth]}`}>وصف البند</TableHead>
```

#### 4. تطبيق العرض على خلايا الوصف (سطر 292-293)

```text
// الحالي:
<TableCell className="px-2">{renderCell(item, 'description')}</TableCell>
<TableCell className="px-2">{renderCell(item, 'description_ar')}</TableCell>

// الجديد:
<TableCell className={`px-2 ${descWidthClass[descColWidth]}`}>{renderCell(item, 'description')}</TableCell>
<TableCell className={`px-2 ${descWidthClass[descColWidth]}`}>{renderCell(item, 'description_ar')}</TableCell>
```

#### 5. ضمان Wrap Text في خلايا الوصف (سطر 192)

النص الحالي يستخدم `whitespace-pre-wrap break-words` وهو صحيح. سيتم إضافة `word-break: break-all` كخيار احتياطي للنصوص الطويلة بدون مسافات:

```text
<span className={`text-xs ${isDescription ? 'whitespace-pre-wrap break-words leading-relaxed' : 'truncate max-w-[120px]'}`}>
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/HistoricalItemsTable.tsx` | إضافة state + أزرار تحكم + تطبيق العرض الديناميكي |

