
# خطة تطبيق ورقة الشركة (Letterhead) على جميع الملفات المُصدَّرة

## نظرة عامة

سيتم تحديث نظام التصدير ليستخدم تصميم ورقة شركة الإمتياز الرسمية كقالب لجميع الملفات المصدّرة (PDF, Excel, Word) مع:
- **Header (الترويسة)**: شعار الإمتياز في المنتصف + الاسم العربي على اليمين + الاسم الإنجليزي على اليسار
- **Footer (التذييل)**: معلومات الاتصال + الموقع + رمز QR

---

## بيانات الشركة المطلوبة (من الصورة)

| البيان | القيمة |
|--------|--------|
| الاسم العربي | الإمتياز الوطنية للمقاولات |
| الاسم الإنجليزي | AL IMTYAZ ALWATANIYA CONT. |
| الهاتف | +966-12-677-3822 |
| الفاكس | +966-12-677-3822 |
| البريد | contact@imtyaz.sa |
| الموقع | www.imtyaz.sa |
| العنوان | Jeddah, Kingdom of Saudi Arabia P.O.Box 24610 Post Code 21456 J.C.C 181551 |

---

## الملفات المطلوب تعديلها

### 1. تحديث إعدادات الشركة الافتراضية

**ملف:** `src/hooks/useCompanySettings.tsx`

```typescript
const defaultSettings: CompanySettings = {
  companyNameAr: 'الإمتياز الوطنية للمقاولات',
  companyNameEn: 'AL IMTYAZ ALWATANIYA CONT.',
  phone: '+966-12-677-3822',
  fax: '+966-12-677-3822',      // حقل جديد
  email: 'contact@imtyaz.sa',
  website: 'www.imtyaz.sa',
  city: 'Jeddah',
  country: 'Kingdom of Saudi Arabia',
  address: 'P.O.Box 24610 Post Code 21456',
  crNumber: '181551',           // J.C.C
  // ...
};
```

### 2. نسخ صورة ورقة الشركة

```text
user-uploads://Alimtyaz_A4.png → src/assets/company/letterhead-bg.png
```

### 3. تحديث ملف تصدير التقارير

**ملف:** `src/lib/reports-export-utils.ts`

**التغييرات:**
- إنشاء دالة `addLetterheadHeader()` جديدة تضيف الترويسة الكاملة
- إنشاء دالة `addLetterheadFooter()` جديدة تضيف التذييل مع معلومات الاتصال
- تحديث جميع دوال التصدير لاستخدام القالب الجديد

### 4. تحديث ملف تصدير Word

**ملف:** `src/lib/docx-utils.ts`

**التغييرات:**
- تحديث `createCoverPage()` لاستخدام تصميم الورقة الرسمية
- تحديث Header/Footer في `generateWordDocument()`

### 5. تحديث ملف تصدير Excel

**ملف:** `src/lib/exceljs-utils.ts` و `src/lib/excel-utils.ts`

**التغييرات:**
- تحديث دالة `addCompanyHeaderToWorksheet()` للتصميم الجديد

---

## تفاصيل التصميم

### Header (الترويسة)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  AL IMTYAZ ALWATANIYA CONT.    [LOGO]    الإمتياز الوطنية للمقاولات    │
│  (italic, Times New Roman)              IMTYAZ    (bold, Arabic font)   │
│                                      ALWATANIYA                         │
│─────────────────────────────────────────────────────────────────────────│
└─────────────────────────────────────────────────────────────────────────┘
```

### Footer (التذييل)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  📞 +966-12-677-3822        📧 contact@imtyaz.sa                  [QR] │
│  📠 +966-12-677-3822        🌐 www.imtyaz.sa                           │
│  📍 Jeddah, Kingdom of Saudi Arabia P.O.Box 24610                      │
│     Post Code 21456 J.C.C 181551                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## التحديثات التقنية

### 1. إضافة QR Code Generator

سيتم إضافة مكتبة لإنشاء رمز QR للموقع الإلكتروني:

```bash
npm install qrcode
```

### 2. ملف مساعد جديد للـ Letterhead

**ملف جديد:** `src/lib/letterhead-utils.ts`

```typescript
export interface LetterheadConfig {
  headerHeight: number;
  footerHeight: number;
  logoPath: string;
  companyNameAr: string;
  companyNameEn: string;
  contactInfo: {
    phone: string;
    fax: string;
    email: string;
    website: string;
    address: string;
    crNumber: string;
  };
}

// دوال مساعدة لإنشاء الترويسة والتذييل
export function getLetterheadConfig(): LetterheadConfig;
export function generateQRCodeDataUrl(url: string): Promise<string>;
export function addPDFLetterhead(doc: jsPDF, config: LetterheadConfig): void;
export function addExcelLetterhead(worksheet: ExcelJS.Worksheet, config: LetterheadConfig): Promise<number>;
```

### 3. تحديث دالة تصدير PDF

```typescript
// في reports-export-utils.ts
export const addPDFLetterheadHeader = (doc: jsPDF) => {
  const config = getLetterheadConfig();
  const pageWidth = doc.internal.pageSize.width;
  
  // English name (left)
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.text(config.companyNameEn, 15, 20);
  
  // Logo (center)
  doc.addImage(alimtyazLogo, 'JPEG', pageWidth/2 - 15, 8, 30, 25);
  
  // Arabic name (right)
  doc.setFont('Cairo', 'bold');
  doc.setFontSize(13);
  doc.text(config.companyNameAr, pageWidth - 15, 20, { align: 'right' });
  
  // Blue line separator
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(10, 35, pageWidth - 10, 35);
};

export const addPDFLetterheadFooter = async (doc: jsPDF) => {
  const config = getLetterheadConfig();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const footerY = pageHeight - 25;
  
  // Contact icons and info
  doc.setFontSize(8);
  doc.text(`📞 ${config.contactInfo.phone}`, 15, footerY);
  doc.text(`📧 ${config.contactInfo.email}`, 80, footerY);
  doc.text(`📠 ${config.contactInfo.fax}`, 15, footerY + 5);
  doc.text(`🌐 ${config.contactInfo.website}`, 80, footerY + 5);
  doc.text(`📍 ${config.contactInfo.address}`, 15, footerY + 10);
  
  // QR Code (right)
  const qrDataUrl = await generateQRCodeDataUrl(config.contactInfo.website);
  doc.addImage(qrDataUrl, 'PNG', pageWidth - 30, footerY - 5, 20, 20);
};
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/assets/company/letterhead-bg.png` | إضافة صورة الورقة |
| `src/hooks/useCompanySettings.tsx` | إضافة حقل fax + تحديث القيم الافتراضية |
| `src/lib/letterhead-utils.ts` | ملف جديد لدوال الـ letterhead |
| `src/lib/reports-export-utils.ts` | تحديث الترويسة والتذييل |
| `src/lib/docx-utils.ts` | تحديث تصدير Word |
| `src/lib/exceljs-utils.ts` | تحديث تصدير Excel |
| `src/lib/boq-export-utils.ts` | تحديث تصدير BOQ |
| `package.json` | إضافة مكتبة qrcode |

---

## النتيجة المتوقعة

### تقرير PDF مثال:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  AL IMTYAZ ALWATANIYA CONT.    [LOGO]    الإمتياز الوطنية للمقاولات    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         عنوان التقرير                                   │
│                                                                         │
│                    ╔═══════════════════════════════╗                   │
│                    ║     محتوى التقرير             ║                   │
│                    ║     الجداول والبيانات          ║                   │
│                    ╚═══════════════════════════════╝                   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  📞 +966-12-677-3822    📧 contact@imtyaz.sa                     [QR]  │
│  📍 Jeddah, Kingdom of Saudi Arabia P.O.Box 24610 J.C.C 181551        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ملاحظات مهمة

1. **الشعار**: سيتم استخدام شعار الإمتياز المُضاف مسبقاً في `src/assets/company/alimtyaz-logo.jpg`
2. **QR Code**: سيُنشأ تلقائياً للموقع `www.imtyaz.sa`
3. **التوافق**: جميع التقارير الحالية (BOQ, Schedule, Tender, Comparison) ستستخدم القالب الجديد
4. **RTL Support**: الترويسة تدعم العربية على اليمين والإنجليزية على اليسار
