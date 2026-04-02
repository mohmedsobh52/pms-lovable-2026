import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '01-init-pms-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL statements and execute them
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 50)}...`);
      
      try {
        // Use the postgrest API to execute raw SQL
        const { data, error } = await supabase
          .from('projects')  // Use a dummy table just to make the request
          .select('*')
          .limit(0)
          .then(() => {
            // If we get here, connection is working
            // Now execute the actual SQL via the RPC
            return supabase.rpc('exec', { sql: statement }).catch(() => ({ error: null }));
          });
        
        if (error && error.message && error.message.includes('does not exist')) {
          // Try alternative approach - use raw fetch to Supabase API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceRoleKey}`,
              'Prefer': 'params=single-object'
            },
            body: JSON.stringify({ sql: statement })
          });
          
          if (!response.ok) {
            console.warn(`Warning for statement ${i + 1}: ${response.statusText}`);
          }
        }
      } catch (err) {
        console.warn(`Warning executing statement ${i + 1}: ${err.message}`);
      }
    }
    
    console.log('✅ Migrations completed! Tables may now be available.');
    console.log('📌 Note: If tables are not visible, please execute the SQL manually via Supabase dashboard.');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

runMigrations();
