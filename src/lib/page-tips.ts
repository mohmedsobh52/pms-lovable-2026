export interface PageTip {
  en: string;
  ar: string;
}

interface TipEntry {
  pattern: RegExp;
  tips: PageTip[];
}

const tipEntries: TipEntry[] = [
  {
    pattern: /^\/dashboard$/,
    tips: [
      { en: "View all your projects at a glance from the dashboard.", ar: "عرض جميع مشاريعك في لمحة من لوحة التحكم." },
      { en: "Click on any project card to see its full details.", ar: "اضغط على أي بطاقة مشروع لعرض تفاصيله الكاملة." },
      { en: "Use the search bar to quickly find specific projects.", ar: "استخدم شريط البحث للعثور على مشاريع محددة بسرعة." },
    ],
  },
  {
    pattern: /^\/projects\/[^/]+$/,
    tips: [
      { en: "Use the BOQ tab to manage bill of quantities items.", ar: "استخدم تبويب جدول الكميات لإدارة بنود الكميات." },
      { en: "Export reports from the Documents tab in PDF or Excel.", ar: "تصدير التقارير من تبويب المستندات بصيغة PDF أو Excel." },
      { en: "Edit unit prices directly by clicking on them in the table.", ar: "عدّل أسعار الوحدات مباشرة بالضغط عليها في الجدول." },
      { en: "Use AI analysis to get pricing suggestions for your items.", ar: "استخدم تحليل الذكاء الاصطناعي للحصول على اقتراحات تسعير لبنودك." },
    ],
  },
  {
    pattern: /^\/tender\/[^/]+$/,
    tips: [
      { en: "Add staff, facilities, insurance, and indirect costs here.", ar: "أضف الموظفين والتجهيزات والتأمين والتكاليف غير المباشرة هنا." },
      { en: "Export the full tender summary as a PDF from the toolbar.", ar: "صدّر ملخص المناقصة الكامل كملف PDF من شريط الأدوات." },
      { en: "Review pricing scenarios to optimize your bid.", ar: "راجع سيناريوهات التسعير لتحسين عرضك." },
    ],
  },
  {
    pattern: /^\/reports$/,
    tips: [
      { en: "Compare multiple projects side by side.", ar: "قارن عدة مشاريع جنبًا إلى جنب." },
      { en: "Export data in Excel or PDF format.", ar: "صدّر البيانات بصيغة Excel أو PDF." },
      { en: "Generate advanced analysis reports with charts.", ar: "أنشئ تقارير تحليلية متقدمة مع رسوم بيانية." },
    ],
  },
  {
    pattern: /^\/procurement$/,
    tips: [
      { en: "Manage external partners and their contracts.", ar: "إدارة الشركاء الخارجيين وعقودهم." },
      { en: "Track partner performance and reviews.", ar: "تتبع أداء الشركاء والتقييمات." },
      { en: "Request offers and compare supplier quotations.", ar: "اطلب عروض أسعار وقارن بين عروض الموردين." },
    ],
  },
  {
    pattern: /^\/contracts$/,
    tips: [
      { en: "Create and manage project contracts with milestones.", ar: "أنشئ وأدر عقود المشاريع مع المراحل الرئيسية." },
      { en: "Set payment schedules and track warranty periods.", ar: "حدد جداول الدفع وتتبع فترات الضمان." },
      { en: "Enable smart alerts for contract deadlines.", ar: "فعّل التنبيهات الذكية لمواعيد العقود." },
    ],
  },
  {
    pattern: /^\/risk$/,
    tips: [
      { en: "Identify and assess project risks with severity levels.", ar: "حدد وقيّم مخاطر المشروع بمستويات الخطورة." },
      { en: "Set mitigation strategies for each identified risk.", ar: "ضع استراتيجيات تخفيف لكل خطر محدد." },
      { en: "Generate detailed risk reports for stakeholders.", ar: "أنشئ تقارير مخاطر مفصلة لأصحاب المصلحة." },
    ],
  },
  {
    pattern: /^\/library$/,
    tips: [
      { en: "Manage materials, labor, and equipment rates.", ar: "إدارة أسعار المواد والعمالة والمعدات." },
      { en: "Import rates from Excel files for quick setup.", ar: "استيراد الأسعار من ملفات Excel للإعداد السريع." },
      { en: "Check price validity indicators to ensure up-to-date rates.", ar: "تحقق من مؤشرات صلاحية الأسعار لضمان أسعار محدثة." },
    ],
  },
  {
    pattern: /^\/quotations$/,
    tips: [
      { en: "Upload and compare supplier quotations.", ar: "ارفع وقارن عروض أسعار الموردين." },
      { en: "Use AI to analyze quotation documents automatically.", ar: "استخدم الذكاء الاصطناعي لتحليل مستندات عروض الأسعار تلقائيًا." },
    ],
  },
  {
    pattern: /^\/resources$/,
    tips: [
      { en: "Plan resource allocation with Gantt charts.", ar: "خطط لتوزيع الموارد باستخدام مخططات جانت." },
      { en: "Generate procurement and resource schedules.", ar: "أنشئ جداول المشتريات والموارد." },
    ],
  },
  {
    pattern: /^\/historical-pricing$/,
    tips: [
      { en: "Compare prices across past projects for benchmarking.", ar: "قارن الأسعار عبر المشاريع السابقة للمقارنة المرجعية." },
      { en: "Upload historical pricing files for reference.", ar: "ارفع ملفات التسعير التاريخية للرجوع إليها." },
    ],
  },
  {
    pattern: /^\/saved-projects$/,
    tips: [
      { en: "Load, compare, or delete your saved projects.", ar: "حمّل أو قارن أو احذف مشاريعك المحفوظة." },
      { en: "Export project data for backup purposes.", ar: "صدّر بيانات المشروع لأغراض النسخ الاحتياطي." },
    ],
  },
  {
    pattern: /^\/settings$/,
    tips: [
      { en: "Configure application preferences and company info.", ar: "إعداد تفضيلات التطبيق ومعلومات الشركة." },
      { en: "Upload your company logo for reports and letterheads.", ar: "ارفع شعار شركتك للتقارير والخطابات الرسمية." },
    ],
  },
  {
    pattern: /^\/calendar$/,
    tips: [
      { en: "View project deadlines and milestones on the calendar.", ar: "عرض مواعيد المشاريع والمراحل على التقويم." },
    ],
  },
  {
    pattern: /^\/material-prices$/,
    tips: [
      { en: "Browse and search current material prices.", ar: "تصفح وابحث عن أسعار المواد الحالية." },
      { en: "Add new materials with supplier information.", ar: "أضف مواد جديدة مع معلومات المورد." },
    ],
  },
  {
    pattern: /^\/cost-analysis$/,
    tips: [
      { en: "Add cost items manually or import them from an Excel file.", ar: "أضف بنود التكاليف يدوياً أو استوردها من ملف Excel." },
      { en: "Use AI analysis to estimate productivity and daily rental rates.", ar: "استخدم تحليل AI لتقدير الإنتاجية والإيجار اليومي." },
      { en: "Save your settings as a template for reuse in other projects.", ar: "احفظ إعداداتك كقالب لإعادة استخدامها في مشاريع أخرى." },
      { en: "Export reports in Excel or PDF from the sidebar.", ar: "صدّر التقرير بصيغة Excel أو PDF من القائمة الجانبية." },
      { en: "Use drag and drop to reorder items by priority.", ar: "استخدم السحب والإفلات لإعادة ترتيب البنود حسب الأولوية." },
      { en: "Click on any number in the table to edit it directly.", ar: "اضغط على أي رقم في الجدول لتعديله مباشرة." },
      { en: "Import a multi-sheet Excel file and each sheet will appear as a separate tab.", ar: "استورد ملف Excel متعدد الشيتات وسيظهر كل شيت كتاب منفصل." },
      { en: "Add waste and admin percentages for a comprehensive cost estimate.", ar: "أضف نسبة الهالك والمصاريف الإدارية للحصول على تكلفة شاملة." },
    ],
  },
  {
    pattern: /^\/subcontractors$/,
    tips: [
      { en: "Manage subcontractor assignments and track progress.", ar: "إدارة مهام المقاولين من الباطن وتتبع التقدم." },
    ],
  },
  {
    pattern: /^\/attachments$/,
    tips: [
      { en: "Organize project files into folders.", ar: "نظّم ملفات المشروع في مجلدات." },
      { en: "Preview documents directly in the browser.", ar: "معاينة المستندات مباشرة في المتصفح." },
    ],
  },
  {
    pattern: /^\/progress-certificates$/,
    tips: [
      { en: "Create and manage progress payment certificates.", ar: "أنشئ وأدر شهادات الدفع المرحلية." },
    ],
  },
  {
    pattern: /^\/$/,
    tips: [
      { en: "Welcome! Start by creating a new project or uploading a BOQ file.", ar: "مرحبًا! ابدأ بإنشاء مشروع جديد أو رفع ملف جدول كميات." },
      { en: "Navigate through project lifecycle phases from the home page.", ar: "تنقل عبر مراحل دورة حياة المشروع من الصفحة الرئيسية." },
    ],
  },
  {
    pattern: /^\/admin\/dashboard$/,
    tips: [
      { en: "Monitor system stats: users, projects, contracts.", ar: "راقب إحصائيات النظام: المستخدمين، المشاريع، العقود." },
      { en: "Send an automatic weekly report from the Reports button.", ar: "أرسل تقرير أسبوعي تلقائي من زر التقارير." },
      { en: "Track daily activity via the charts.", ar: "تابع النشاط اليومي عبر الرسوم البيانية." },
      { en: "Click on a project in the table to view its details.", ar: "اضغط على مشروع في الجدول لعرض تفاصيله." },
    ],
  },
  {
    pattern: /^\/admin\/users$/,
    tips: [
      { en: "Change any user's role from the dropdown next to their name.", ar: "غيّر دور أي مستخدم من القائمة المنسدلة بجانب اسمه." },
      { en: "Use search to find a user by email.", ar: "استخدم البحث لإيجاد مستخدم بالبريد الإلكتروني." },
      { en: "Filter users by role: Admin, Moderator, User.", ar: "فلتر المستخدمين حسب الدور: مشرف، مشرف مساعد، مستخدم." },
      { en: "Review activity logs from the Activity Log page.", ar: "راجع سجل النشاطات من صفحة سجل النشاط." },
    ],
  },
];

export function getTipsForPath(pathname: string): PageTip[] {
  for (const entry of tipEntries) {
    if (entry.pattern.test(pathname)) {
      return entry.tips;
    }
  }
  return [];
}
