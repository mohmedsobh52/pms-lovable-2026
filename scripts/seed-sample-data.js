import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
  try {
    console.log('\n🌱 جاري إضافة البيانات العينة...\n');

    // 1. إضافة أعضاء الفريق
    console.log('1️⃣ إضافة أعضاء الفريق...');
    const teamMembers = [
      { name: 'محمد علي', role: 'مدير المشروع', department: 'الإدارة' },
      { name: 'فاطمة أحمد', role: 'مهندسة برمجيات', department: 'التطوير' },
      { name: 'خالد سالم', role: 'مصمم UX/UI', department: 'التصميم' },
      { name: 'ليلى محمود', role: 'محلل نظم', department: 'التحليل' },
      { name: 'عمر حسن', role: 'مطور ويب', department: 'التطوير' },
    ];

    const { data: teamData, error: teamError } = await supabase
      .from('team_members')
      .insert(teamMembers)
      .select();

    if (teamError) throw teamError;
    console.log(`✅ تمت إضافة ${teamData.length} أعضاء فريق\n`);

    // 2. إضافة المشاريع
    console.log('2️⃣ إضافة المشاريع...');
    const projects = [
      {
        name: 'منصة التجارة الإلكترونية',
        description: 'بناء منصة تجارة إلكترونية متكاملة مع نظام الدفع والتوصيل',
        status: 'in_progress',
        start_date: '2024-01-15',
        end_date: '2024-06-30',
        budget: 50000,
        spent_budget: 32500,
        progress: 65,
      },
      {
        name: 'تطبيق إدارة المخزون',
        description: 'تطبيق لإدارة وتتبع المخزون في الوقت الفعلي',
        status: 'completed',
        start_date: '2023-09-01',
        end_date: '2024-02-28',
        budget: 30000,
        spent_budget: 30000,
        progress: 100,
      },
      {
        name: 'نظام إدارة العلاقات مع العملاء',
        description: 'CRM متطور لتحسين التعامل مع العملاء',
        status: 'planning',
        start_date: '2024-04-01',
        end_date: '2024-12-31',
        budget: 75000,
        spent_budget: 5000,
        progress: 10,
      },
      {
        name: 'تطبيق الموارد البشرية',
        description: 'نظام شامل لإدارة الموارد البشرية والرواتب',
        status: 'in_progress',
        start_date: '2024-02-01',
        end_date: '2024-08-31',
        budget: 45000,
        spent_budget: 18000,
        progress: 40,
      },
      {
        name: 'موقع الشركة الجديد',
        description: 'إعادة تصميم وتطوير موقع الشركة الرسمي',
        status: 'in_progress',
        start_date: '2024-03-15',
        end_date: '2024-05-31',
        budget: 20000,
        spent_budget: 12000,
        progress: 60,
      },
    ];

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert(projects)
      .select();

    if (projectError) throw projectError;
    console.log(`✅ تمت إضافة ${projectData.length} مشاريع\n`);

    // 3. إضافة المهام
    console.log('3️⃣ إضافة المهام...');
    const tasks = [
      {
        project_id: projectData[0].id,
        title: 'تصميم قاعدة البيانات',
        description: 'تصميم هيكل قاعدة بيانات المنصة',
        status: 'completed',
        priority: 'high',
        assigned_to: teamData[1].id,
      },
      {
        project_id: projectData[0].id,
        title: 'تطوير واجهة المستخدم',
        description: 'تطوير واجهة مستخدم سهلة الاستخدام',
        status: 'in_progress',
        priority: 'high',
        assigned_to: teamData[2].id,
      },
      {
        project_id: projectData[0].id,
        title: 'دمج نظام الدفع',
        description: 'دمج بوابة الدفع الإلكتروني',
        status: 'pending',
        priority: 'high',
        assigned_to: teamData[4].id,
      },
      {
        project_id: projectData[3].id,
        title: 'إعداد نظام الرواتب',
        description: 'برمجة نظام حساب الرواتب والعلاوات',
        status: 'in_progress',
        priority: 'high',
        assigned_to: teamData[1].id,
      },
      {
        project_id: projectData[3].id,
        title: 'اختبار الأمان',
        description: 'اختبار شامل لأمان النظام',
        status: 'pending',
        priority: 'medium',
        assigned_to: teamData[3].id,
      },
      {
        project_id: projectData[4].id,
        title: 'تصميم الموقع الجديد',
        description: 'إعادة تصميم شامل للموقع',
        status: 'completed',
        priority: 'high',
        assigned_to: teamData[2].id,
      },
      {
        project_id: projectData[4].id,
        title: 'تطوير الموقع',
        description: 'تطوير جميع صفحات الموقع',
        status: 'in_progress',
        priority: 'high',
        assigned_to: teamData[4].id,
      },
    ];

    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert(tasks)
      .select();

    if (taskError) throw taskError;
    console.log(`✅ تمت إضافة ${taskData.length} مهام\n`);

    // 4. إضافة عناصر الجدول الزمني
    console.log('4️⃣ إضافة عناصر الجدول الزمني...');
    const timelineItems = [
      {
        project_id: projectData[0].id,
        milestone: 'التصميم والتخطيط',
        description: 'اكتمال تصميم قاعدة البيانات والواجهات',
        scheduled_date: '2024-02-28',
        status: 'completed',
      },
      {
        project_id: projectData[0].id,
        milestone: 'التطوير الأساسي',
        description: 'تطوير المكونات الأساسية للمنصة',
        scheduled_date: '2024-04-30',
        status: 'in_progress',
      },
      {
        project_id: projectData[0].id,
        milestone: 'الاختبار والإطلاق',
        description: 'اختبار شامل والإطلاق النهائي',
        scheduled_date: '2024-06-30',
        status: 'pending',
      },
      {
        project_id: projectData[3].id,
        milestone: 'البرمجة الأساسية',
        description: 'برمجة جميع وحدات النظام',
        scheduled_date: '2024-06-30',
        status: 'in_progress',
      },
      {
        project_id: projectData[3].id,
        milestone: 'الاختبار والتسليم',
        description: 'اختبار شامل وتسليم النظام',
        scheduled_date: '2024-08-31',
        status: 'pending',
      },
    ];

    const { data: timelineData, error: timelineError } = await supabase
      .from('timeline_items')
      .insert(timelineItems)
      .select();

    if (timelineError) throw timelineError;
    console.log(`✅ تمت إضافة ${timelineData.length} عناصر جدول زمني\n`);

    // 5. إضافة عناصر الميزانية
    console.log('5️⃣ إضافة عناصر الميزانية...');
    const budgetItems = [
      {
        project_id: projectData[0].id,
        category: 'الرواتب والموارد البشرية',
        amount: 20000,
        spent: 15000,
      },
      {
        project_id: projectData[0].id,
        category: 'البنية التحتية والخوادم',
        amount: 15000,
        spent: 12500,
      },
      {
        project_id: projectData[0].id,
        category: 'الأدوات والتراخيص',
        amount: 8000,
        spent: 4000,
      },
      {
        project_id: projectData[0].id,
        category: 'التسويق والإطلاق',
        amount: 7000,
        spent: 1000,
      },
      {
        project_id: projectData[3].id,
        category: 'الرواتب والموارد البشرية',
        amount: 30000,
        spent: 5000,
      },
      {
        project_id: projectData[3].id,
        category: 'البنية التحتية',
        amount: 10000,
        spent: 0,
      },
      {
        project_id: projectData[3].id,
        category: 'الأدوات والتراخيص',
        amount: 5000,
        spent: 0,
      },
    ];

    const { data: budgetData, error: budgetError } = await supabase
      .from('budget_tracking')
      .insert(budgetItems)
      .select();

    if (budgetError) throw budgetError;
    console.log(`✅ تمت إضافة ${budgetData.length} عنصر ميزانية\n`);

    console.log('━'.repeat(50));
    console.log('\n✨ تمت إضافة جميع البيانات العينة بنجاح!\n');
    console.log('📊 ملخص البيانات المضافة:');
    console.log(`   • ${projectData.length} مشاريع`);
    console.log(`   • ${taskData.length} مهام`);
    console.log(`   • ${teamData.length} أعضاء فريق`);
    console.log(`   • ${timelineData.length} عنصر جدول زمني`);
    console.log(`   • ${budgetData.length} عنصر ميزانية`);
    console.log('\n🚀 يمكنك الآن الوصول إلى لوحة التحكم على:');
    console.log('   http://localhost:8080/project-management\n');
    console.log('━'.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ خطأ في إضافة البيانات:', error.message);
    process.exit(1);
  }
}

seedData();
