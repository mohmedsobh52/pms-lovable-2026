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
    const { data, error } = await supabase.rpc('exec', {
      sql: sql
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (err) {
    // Try alternative method using raw SQL via admin API
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
        throw new Error(`API Error: ${response.status}`);
      }

      return { success: true };
    } catch (apiErr) {
      return { success: false, error: err.message };
    }
  }
}

async function setupDatabase() {
  try {
    console.log('🚀 بدء تشغيل قاعدة البيانات...\n');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, '01-init-pms-schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split by statements (simple approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt.length > 5);

    console.log(`📊 وجدنا ${statements.length} عملية SQL للتنفيذ\n`);

    let successCount = 0;
    let failureCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 50).replace(/\n/g, ' ');
      
      process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);
      
      const result = await executeSql(statement);
      
      if (result.success) {
        console.log('✅');
        successCount++;
      } else {
        console.log('⚠️');
        failureCount++;
        // Don't stop on errors, continue
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ اكتمل التنفيذ: ${successCount} عملية نجحت، ${failureCount} عملية لم تكتمل`);
    console.log('='.repeat(60));

    // Try to verify tables were created
    console.log('\n🔍 التحقق من الجداول المنشأة...\n');
    
    const tables = ['projects', 'team_members', 'tasks', 'timeline_items', 'budget_tracking'];
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`  ✅ جدول "${tableName}" موجود`);
        } else {
          console.log(`  ⚠️ جدول "${tableName}" قد لا يكون موجوداً`);
        }
      } catch (err) {
        console.log(`  ⚠️ خطأ في التحقق من جدول "${tableName}"`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ اكتمل الإعداد! البيانات جاهزة للاستخدام');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ خطأ في الإعداد:', error.message);
    process.exit(1);
  }
}

setupDatabase();
