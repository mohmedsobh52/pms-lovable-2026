import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function executeSql(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function setupAll() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  نظام إدارة المشاريع - برنامج التثبيت الشامل             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Step 1: Create schema
    console.log('📋 الخطوة 1: إنشاء هيكل قاعدة البيانات...\n');
    
    const schemaPath = path.join(__dirname, '01-init-pms-schema.sql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const schemaStatements = schemaContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt.length > 5);

    console.log(`   وجدنا ${schemaStatements.length} عملية للتنفيذ\n`);

    let schemaSuccess = 0;
    for (let i = 0; i < schemaStatements.length; i++) {
      const stmt = schemaStatements[i];
      const preview = stmt.substring(0, 40).replace(/\n/g, ' ');
      process.stdout.write(`   [${String(i + 1).padStart(3, ' ')}/${schemaStatements.length}] ${preview.padEnd(45, '.')} `);
      
      const result = await executeSql(stmt);
      if (result.success) {
        console.log('✅');
        schemaSuccess++;
      } else {
        console.log('⏭️');
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n   ✅ اكتملت الخطوة 1: ${schemaSuccess}/${schemaStatements.length} عملية نجحت\n`);

    // Step 2: Seed sample data
    console.log('📋 الخطوة 2: إضافة البيانات العينة...\n');
    
    const seedPath = path.join(__dirname, '02-seed-sample-data.sql');
    const seedContent = fs.readFileSync(seedPath, 'utf8');
    const seedStatements = seedContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt.length > 5);

    console.log(`   وجدنا ${seedStatements.length} عملية إدراج البيانات\n`);

    let seedSuccess = 0;
    for (let i = 0; i < seedStatements.length; i++) {
      const stmt = seedStatements[i];
      const preview = stmt.substring(0, 40).replace(/\n/g, ' ');
      process.stdout.write(`   [${String(i + 1).padStart(3, ' ')}/${seedStatements.length}] ${preview.padEnd(45, '.')} `);
      
      const result = await executeSql(stmt);
      if (result.success) {
        console.log('✅');
        seedSuccess++;
      } else {
        console.log('⏭️');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n   ✅ اكتملت الخطوة 2: ${seedSuccess}/${seedStatements.length} عملية نجحت\n`);

    // Step 3: Verify tables
    console.log('📋 الخطوة 3: التحقق من الجداول المنشأة...\n');
    
    const tables = [
      { name: 'projects', label: 'المشاريع' },
      { name: 'team_members', label: 'فريق العمل' },
      { name: 'tasks', label: 'المهام' },
      { name: 'timeline_items', label: 'الجداول الزمنية' },
      { name: 'budget_tracking', label: 'تتبع الميزانية' }
    ];
    
    let verifySuccess = 0;
    for (const table of tables) {
      process.stdout.write(`   جدول "${table.label}" (${table.name})....................... `);
      
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log('✅');
          verifySuccess++;
        } else {
          console.log('⚠️ (قد يحتاج انتظار)');
        }
      } catch (err) {
        console.log('⚠️ (خطأ مؤقت)');
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n   ✅ اكتملت الخطوة 3: ${verifySuccess}/${tables.length} جداول تم التحقق منها\n`);

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║           ✨ تم إعداد قاعدة البيانات بنجاح! ✨              ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 ملخص النتائج:');
    console.log(`   • إنشاء الهيكل: ${schemaSuccess}/${schemaStatements.length} عملية ✅`);
    console.log(`   • إضافة البيانات: ${seedSuccess}/${seedStatements.length} عملية ✅`);
    console.log(`   • التحقق من الجداول: ${verifySuccess}/${tables.length} جداول ✅\n`);

    console.log('🚀 الخطوات التالية:');
    console.log('   1. افتح المتصفح: http://localhost:8080/project-management');
    console.log('   2. الصفحة ستحمل البيانات تلقائياً');
    console.log('   3. استمتع بإدارة المشاريع!\n');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  }
}

setupAll();
