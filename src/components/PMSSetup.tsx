import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SQL_SCHEMA = `
-- Project Management System Schema

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on-hold', 'cancelled')),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15, 2),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  project_manager_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(100),
  allocation_percentage INTEGER DEFAULT 100 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'completed', 'on-hold')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
  start_date DATE,
  due_date DATE,
  completion_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category VARCHAR(255) NOT NULL,
  budgeted_amount DECIMAL(15, 2) NOT NULL,
  spent_amount DECIMAL(15, 2) DEFAULT 0,
  remaining_amount DECIMAL(15, 2),
  percentage_used DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_project_manager ON projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_team_members_project ON team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_timeline_items_project ON timeline_items(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_tracking_project ON budget_tracking(project_id);
`;

export function PMSSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSetup = async () => {
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      // Check if tables already exist
      const { data, error: checkError } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true });

      if (!checkError) {
        setStatus('success');
        setMessage('جميع الجداول موجودة بالفعل! يمكنك البدء في استخدام نظام إدارة المشاريع.');
        setIsLoading(false);
        return;
      }

      // Tables don't exist, need to create them via SQL editor
      setStatus('error');
      setMessage('يجب تنفيذ SQL يدويًا. الرجاء نسخ SQL أدناه وتنفيذه من خلال Supabase SQL Editor.');
      
    } catch (error) {
      setStatus('error');
      setMessage('خطأ في التحقق من الجداول. يرجى تنفيذ SQL يدويًا من خلال Supabase SQL Editor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-6">إعداد نظام إدارة المشاريع</h1>

          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              قم بإعداد قاعدة البيانات للبدء في استخدام نظام إدارة المشاريع. اتبع الخطوات أدناه.
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">الخطوة 1: التحقق من الجداول</h2>
              <Button 
                onClick={handleSetup} 
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isLoading ? 'جاري التحقق...' : 'التحقق من الجداول'}
              </Button>
            </div>

            {status === 'success' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    {message}
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="font-semibold mb-3">الخطوة 2: نسخ SQL وتنفيذها</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mb-4">
                    <li>اذهب إلى Supabase Dashboard</li>
                    <li>اختر "SQL Editor"</li>
                    <li>اختر "Create a new query"</li>
                    <li>انسخ الكود من الأسفل والصقه</li>
                    <li>انقر على "Run"</li>
                  </ol>

                  <Card className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                      {SQL_SCHEMA}
                    </pre>
                  </Card>

                  <Button 
                    onClick={() => {
                      navigator.clipboard.writeText(SQL_SCHEMA);
                      setMessage('تم نسخ SQL بنجاح!');
                      setStatus('success');
                    }}
                    variant="outline"
                    className="mt-4 w-full"
                  >
                    نسخ SQL
                  </Button>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">الخطوة 3: التحقق مرة أخرى</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    بعد تنفيذ SQL في Supabase، انقر على الزر أدناه للتحقق من أن الجداول تم إنشاؤها بنجاح.
                  </p>
                  <Button 
                    onClick={handleSetup}
                    variant="outline"
                    className="w-full"
                  >
                    التحقق مجددًا
                  </Button>
                </div>
              </div>
            )}

            <Alert>
              <AlertDescription>
                <strong>ملاحظة:</strong> بعد إعداد الجداول بنجاح، انتقل إلى صفحة إدارة المشاريع واستمتع بالمنصة!
              </AlertDescription>
            </Alert>
          </div>
        </Card>
      </div>
    </div>
  );
}
