const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ خطأ: VITE_SUPABASE_URL لم يتم تعيينه');
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY || SUPABASE_KEY
);

// SQL statements
const createTablesSQL = `
-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'active',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  budget DECIMAL(12,2),
  spent DECIMAL(12,2) DEFAULT 0,
  progress INTEGER DEFAULT 0,
  priority VARCHAR DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR,
  role VARCHAR,
  projects UUID[],
  tasks_assigned INTEGER DEFAULT 0,
  availability VARCHAR DEFAULT 'available',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  title VARCHAR NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES team_members(id),
  status VARCHAR DEFAULT 'todo',
  priority VARCHAR DEFAULT 'medium',
  start_date TIMESTAMP,
  due_date TIMESTAMP,
  completion_date TIMESTAMP,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Timeline items table
CREATE TABLE IF NOT EXISTS timeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  milestone VARCHAR NOT NULL,
  description TEXT,
  planned_date TIMESTAMP,
  actual_date TIMESTAMP,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Budget tracking table
CREATE TABLE IF NOT EXISTS budget_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  category VARCHAR NOT NULL,
  allocated DECIMAL(12,2),
  spent DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_timeline_project_id ON timeline_items(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_project_id ON budget_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
`;

const seedDataSQL = `
-- Insert sample projects
INSERT INTO projects (name, description, status, start_date, end_date, budget, spent, progress, priority) VALUES
('تطوير تطبيق الهاتف المحمول', 'تطوير تطبيق iOS و Android', 'active', NOW(), NOW() + interval '90 days', 50000.00, 15000.00, 35, 'high'),
('إعادة تصميم موقع الويب', 'تحديث وتحسين التصميم والأداء', 'active', NOW() - interval '30 days', NOW() + interval '60 days', 30000.00, 12000.00, 45, 'medium'),
('نظام إدارة المحتوى', 'بناء نظام CMS جديد', 'planning', NOW() + interval '5 days', NOW() + interval '120 days', 45000.00, 0.00, 5, 'high'),
('تحسين الأداء', 'تحسين سرعة التطبيق', 'active', NOW() - interval '15 days', NOW() + interval '30 days', 15000.00, 8000.00, 60, 'medium'),
('دعم العملاء 24/7', 'نظام دعم عملاء متقدم', 'completed', NOW() - interval '90 days', NOW() - interval '5 days', 20000.00, 20000.00, 100, 'low');

-- Insert sample team members
INSERT INTO team_members (name, email, role, tasks_assigned, availability) VALUES
('أحمد محمود', 'ahmed@example.com', 'مدير المشروع', 8, 'available'),
('فاطمة علي', 'fatima@example.com', 'مطور واجهة المستخدم', 6, 'available'),
('محمد سالم', 'mohammad@example.com', 'مطور خادم', 7, 'busy'),
('سارة أحمد', 'sarah@example.com', 'مصممة', 5, 'available'),
('عمر خليل', 'omar@example.com', 'مراقب الجودة', 4, 'available');

-- Insert sample tasks
INSERT INTO tasks (title, description, assigned_to, status, priority, start_date, due_date, progress) VALUES
('تصميم واجهة المستخدم', 'إنشاء تصاميم للمحررات الرئيسية', (SELECT id FROM team_members WHERE email = 'sarah@example.com' LIMIT 1), 'in_progress', 'high', NOW(), NOW() + interval '14 days', 70),
('تطوير API', 'بناء واجهات برمجية للتطبيق', (SELECT id FROM team_members WHERE email = 'mohammad@example.com' LIMIT 1), 'in_progress', 'high', NOW(), NOW() + interval '21 days', 55),
('اختبار شامل', 'اختبار جميع المميزات', (SELECT id FROM team_members WHERE email = 'omar@example.com' LIMIT 1), 'todo', 'medium', NOW() + interval '10 days', NOW() + interval '25 days', 0),
('التوثيق', 'كتابة التوثيق التقني', (SELECT id FROM team_members WHERE email = 'fatima@example.com' LIMIT 1), 'todo', 'medium', NOW() + interval '20 days', NOW() + interval '30 days', 0);

-- Insert sample timeline items
INSERT INTO timeline_items (milestone, description, planned_date, status) VALUES
('تصميم العمارة', 'اكتمال تصميم العمارة التقنية', NOW() + interval '5 days', 'in_progress'),
('نهاية المرحلة الأولى', 'اكتمال المرحلة الأولى من التطوير', NOW() + interval '30 days', 'pending'),
('الاختبار التجريبي', 'اختبار النسخة الأولية مع المستخدمين', NOW() + interval '45 days', 'pending'),
('الإطلاق', 'إطلاق النسخة الكاملة', NOW() + interval '90 days', 'pending');

-- Insert sample budget items
INSERT INTO budget_tracking (category, allocated, spent) VALUES
('الرواتب والأجور', 35000.00, 12000.00),
('البرامج والأدوات', 8000.00, 3000.00),
('الخوادم والبنية التحتية', 5000.00, 1500.00),
('التدريب والتطوير', 3000.00, 500.00),
('أخرى', 2000.00, 800.00);
`;

async function setupDatabase() {
  try {
    console.log('🔧 جاري إعداد قاعدة البيانات...\n');

    // Test connection
    console.log('1️⃣ اختبار الاتصال بـ Supabase...');
    const { data: connTest, error: connError } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true });

    if (connError && connError.code !== 'PGRST116') {
      console.error('❌ خطأ في الاتصال:', connError.message);
      console.log('\n📌 تأكد من:');
      console.log('   - وجود متغيرات البيئة (SUPABASE_URL و SUPABASE_ANON_KEY)');
      console.log('   - أن حسابك على Supabase نشط');
      return;
    }

    console.log('✅ الاتصال بـ Supabase نجح\n');

    // Check if tables exist
    console.log('2️⃣ التحقق من الجداول الموجودة...');
    const { data: tables, error: tablesError } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true });

    const tablesExist = !tablesError || !tablesError.code.includes('PGRST116');
    
    if (tablesExist) {
      console.log('✅ الجداول موجودة بالفعل');
      
      // Show existing data stats
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });
      
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });
      
      const { count: memberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true });

      console.log(`   📊 المشاريع: ${projectCount || 0}`);
      console.log(`   ✔️ المهام: ${taskCount || 0}`);
      console.log(`   👥 أعضاء الفريق: ${memberCount || 0}`);
    } else {
      console.log('❌ الجداول غير موجودة - جاري الإنشاء...\n');

      // Since we can't execute raw SQL directly via the client, 
      // we'll guide the user to do it manually
      console.log('📝 يجب تنفيذ SQL يدويًا في Supabase:\n');
      console.log('الخطوات:');
      console.log('1. انتقل إلى: https://supabase.com/dashboard');
      console.log('2. اختر مشروعك');
      console.log('3. اذهب إلى SQL Editor');
      console.log('4. انسخ الكود من: /scripts/01-init-pms-schema.sql');
      console.log('5. الصقه وقم بتنفيذه');
      console.log('6. كرر مع: /scripts/02-seed-sample-data.sql\n');

      // Print SQL for easy copying
      console.log('═'.repeat(60));
      console.log('🔹 SQL للجداول:');
      console.log('═'.repeat(60));
      console.log(createTablesSQL);
      console.log('\n═'.repeat(60));
      console.log('🔹 SQL للبيانات العينة:');
      console.log('═'.repeat(60));
      console.log(seedDataSQL);
    }

    console.log('\n✅ انتهى فحص إعداد قاعدة البيانات');
    console.log('🚀 يمكنك الآن البدء باستخدام لوحة التحكم على /project-management\n');

  } catch (error) {
    console.error('❌ خطأ غير متوقع:', error.message);
    process.exit(1);
  }
}

// Run setup
setupDatabase();
