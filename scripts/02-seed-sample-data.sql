-- Sample Data for Project Management System

-- Insert sample projects
INSERT INTO projects (name, description, status, start_date, end_date, budget, progress_percentage) VALUES
('تطوير تطبيق الموارد البشرية', 'تطوير نظام شامل لإدارة الموارد البشرية', 'active', '2026-01-15', '2026-06-30', 50000.00, 45),
('نظام إدارة المخزون', 'تطبيق لتتبع وإدارة المخزون في الشركة', 'active', '2026-02-01', '2026-05-15', 35000.00, 30),
('موقع الشركة الإلكتروني', 'إعادة تصميم وتطوير موقع الشركة', 'in-progress', '2026-01-20', '2026-04-20', 25000.00, 60),
('تطبيق الجوال للعملاء', 'تطوير تطبيق جوال لخدمة العملاء', 'active', '2026-03-01', '2026-08-31', 80000.00, 15),
('نظام التقارير والتحليلات', 'إنشاء لوحة تحكم للتقارير والتحليلات', 'on-hold', '2026-04-01', '2026-09-30', 45000.00, 5);

-- Insert sample team members for Project 1 (HR System)
INSERT INTO team_members (project_id, user_name, email, role, allocation_percentage) VALUES
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'أحمد محمد', 'ahmed@company.com', 'مدير المشروع', 100),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'فاطمة علي', 'fatima@company.com', 'مطور Full Stack', 100),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'محمود أحمد', 'mahmoud@company.com', 'مطور Backend', 100),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'نور خالد', 'noor@company.com', 'مصمم UI/UX', 80);

-- Insert sample team members for Project 2 (Inventory System)
INSERT INTO team_members (project_id, user_name, email, role, allocation_percentage) VALUES
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'سارة حسن', 'sarah@company.com', 'مدير المشروع', 100),
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'علي رضا', 'ali@company.com', 'مطور Full Stack', 100),
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'ليلى محمود', 'leila@company.com', 'محلل الأعمال', 50);

-- Insert sample tasks for Project 1
INSERT INTO tasks (project_id, title, description, status, priority, start_date, due_date) VALUES
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'تصميم قاعدة البيانات', 'تصميم هيكل قاعدة البيانات للنظام', 'completed', 'high', '2026-01-15', '2026-01-25'),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'تطوير API الموظفين', 'إنشاء API لإدارة بيانات الموظفين', 'in-progress', 'high', '2026-01-26', '2026-02-15'),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'تطوير واجهة المستخدم', 'بناء واجهة إدارة الموظفين', 'in-progress', 'high', '2026-02-01', '2026-03-10'),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'الاختبار والجودة', 'اختبار شامل للنظام', 'todo', 'high', '2026-03-11', '2026-03-31'),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'التدريب والتوثيق', 'تدريب المستخدمين وإنشاء التوثيق', 'todo', 'medium', '2026-04-01', '2026-04-30');

-- Insert sample tasks for Project 2
INSERT INTO tasks (project_id, title, description, status, priority, start_date, due_date) VALUES
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'تحليل المتطلبات', 'جمع وتحليل متطلبات النظام', 'completed', 'high', '2026-02-01', '2026-02-14'),
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'تصميم الواجهات', 'تصميم واجهات المستخدم', 'in-progress', 'high', '2026-02-15', '2026-03-15'),
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'تطوير النواة', 'تطوير الميزات الأساسية', 'in-progress', 'high', '2026-03-01', '2026-04-15');

-- Insert sample timeline items for Project 1
INSERT INTO timeline_items (project_id, title, start_date, end_date, progress_percentage, status) VALUES
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'المرحلة 1: البنية الأساسية', '2026-01-15', '2026-02-15', 100, 'completed'),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'المرحلة 2: تطوير الميزات', '2026-02-16', '2026-04-15', 45, 'in-progress'),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'المرحلة 3: الاختبار والإطلاق', '2026-04-16', '2026-06-30', 0, 'pending');

-- Insert sample timeline items for Project 2
INSERT INTO timeline_items (project_id, title, start_date, end_date, progress_percentage, status) VALUES
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'التحليل والتصميم', '2026-02-01', '2026-03-15', 70, 'in-progress'),
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'التطوير والتنفيذ', '2026-03-16', '2026-04-30', 30, 'in-progress'),
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'الاختبار والإطلاق', '2026-05-01', '2026-05-15', 0, 'pending');

-- Insert sample budget tracking for Project 1
INSERT INTO budget_tracking (project_id, category, budgeted_amount, spent_amount) VALUES
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'رواتب الفريق', 30000.00, 13500.00),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'أدوات وبرامج', 10000.00, 4200.00),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'الخدمات السحابية', 8000.00, 3000.00),
((SELECT id FROM projects WHERE name = 'تطوير تطبيق الموارد البشرية' LIMIT 1), 'الاختبار والجودة', 2000.00, 500.00);

-- Insert sample budget tracking for Project 2
INSERT INTO budget_tracking (project_id, category, budgeted_amount, spent_amount) VALUES
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'رواتب الفريق', 20000.00, 7000.00),
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'أدوات وبرامج', 8000.00, 2000.00),
((SELECT id FROM projects WHERE name = 'نظام إدارة المخزون' LIMIT 1), 'البنية التحتية', 7000.00, 2000.00);

-- Update remaining amounts for budget tracking
UPDATE budget_tracking 
SET remaining_amount = budgeted_amount - spent_amount,
    percentage_used = ROUND((spent_amount / budgeted_amount * 100)::numeric, 2)
WHERE spent_amount > 0;
