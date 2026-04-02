# Project Management System (PMS) - Setup Guide

## Overview
This guide will help you set up the Project Management System database and start using the dashboard.

## Prerequisites
- Node.js 18+ installed
- Supabase project configured and connected to the application
- Environment variables properly set in `.env.development.local`

## Database Setup

### Option 1: Automated Setup (Recommended)
Run the migration script to automatically create all tables and set up the database:

```bash
chmod +x scripts/execute-migrations.sh
./scripts/execute-migrations.sh
```

### Option 2: Manual Setup via Supabase Console
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy the entire content from `scripts/01-init-pms-schema.sql`
5. Execute the query
6. Wait for confirmation that all tables were created

## Database Schema Overview

### Tables Created

#### 1. **projects**
Main table for storing project information
- `id`: Unique project identifier
- `name`: Project name
- `description`: Project description
- `status`: Project status (active, completed, on-hold, cancelled)
- `start_date`: Project start date
- `end_date`: Project end date
- `budget`: Total project budget
- `progress_percentage`: Overall project completion (0-100%)
- `project_manager_id`: Reference to project manager

#### 2. **team_members**
Stores team members assigned to projects
- `id`: Unique member identifier
- `project_id`: Reference to project
- `user_name`: Full name of team member
- `email`: Email address
- `role`: Job role (project-manager, developer, designer, qa, client)
- `allocation_percentage`: Resource allocation percentage (0-100%)
- `start_date`: When member joined the project
- `end_date`: When member left the project (if applicable)

#### 3. **tasks**
Individual tasks within projects
- `id`: Unique task identifier
- `project_id`: Reference to project
- `title`: Task title
- `description`: Detailed task description
- `status`: Task status (todo, in-progress, completed, on-hold)
- `priority`: Task priority (low, medium, high, critical)
- `assigned_to`: Reference to team member
- `start_date`: Task start date
- `due_date`: Task deadline
- `completion_date`: When task was completed

#### 4. **timeline_items**
Project milestones and schedule items
- `id`: Unique timeline item identifier
- `project_id`: Reference to project
- `title`: Milestone or phase name
- `start_date`: Start date
- `end_date`: End date
- `progress_percentage`: Completion progress (0-100%)
- `status`: Status (pending, in-progress, completed)

#### 5. **budget_tracking**
Detailed budget tracking by category
- `id`: Unique budget item identifier
- `project_id`: Reference to project
- `category`: Budget category (e.g., Materials, Labor, Equipment)
- `budgeted_amount`: Planned budget amount
- `spent_amount`: Actual amount spent
- `remaining_amount`: Calculated remaining budget
- `percentage_used`: Calculated percentage of budget used

## Accessing the Dashboard

### URL
```
http://localhost:8080/project-management
```

### Features Available
1. **Project Overview**: View project status, dates, budget, and overall progress
2. **Timeline View**: Visual timeline of project milestones with progress indicators
3. **Team Resources**: Manage and view team members, roles, and allocations
4. **Budget Tracking**: Monitor budget across categories with visual indicators
5. **Task Management**: Organize tasks by status (Todo, In Progress, Completed, On Hold)
6. **KPI Cards**: Quick metrics showing project statistics

## Adding Sample Data

To test the dashboard, you can add sample data directly to the database:

### Via Supabase Console:

#### 1. Add a Project
```sql
INSERT INTO projects (name, description, status, start_date, end_date, budget, progress_percentage)
VALUES (
  'مشروع البناء الجديد',
  'مشروع إنشاء مبنى سكني جديد',
  'active',
  '2026-01-01',
  '2026-12-31',
  500000.00,
  35
);
```

#### 2. Add Team Members
```sql
INSERT INTO team_members (project_id, user_name, email, role, allocation_percentage, start_date)
VALUES 
  ((SELECT id FROM projects LIMIT 1), 'محمد أحمد', 'mohammad@example.com', 'project-manager', 100, CURRENT_DATE),
  ((SELECT id FROM projects LIMIT 1), 'فاطمة علي', 'fatima@example.com', 'developer', 80, CURRENT_DATE),
  ((SELECT id FROM projects LIMIT 1), 'عمر خالد', 'omar@example.com', 'designer', 100, CURRENT_DATE);
```

#### 3. Add Tasks
```sql
INSERT INTO tasks (project_id, title, description, status, priority, due_date)
VALUES 
  ((SELECT id FROM projects LIMIT 1), 'إعداد الرسومات', 'تحضير رسومات معمارية', 'in-progress', 'high', '2026-03-15'),
  ((SELECT id FROM projects LIMIT 1), 'الموارد البشرية', 'توظيف فريق العمل', 'todo', 'high', '2026-02-15'),
  ((SELECT id FROM projects LIMIT 1), 'الترخيص والموافقات', 'الحصول على تصاريح البناء', 'completed', 'critical', '2026-01-30');
```

#### 4. Add Timeline Items
```sql
INSERT INTO timeline_items (project_id, title, start_date, end_date, progress_percentage, status)
VALUES 
  ((SELECT id FROM projects LIMIT 1), 'مرحلة التصميم', '2026-01-01', '2026-03-31', 80, 'in-progress'),
  ((SELECT id FROM projects LIMIT 1), 'مرحلة التنفيذ', '2026-04-01', '2026-10-31', 0, 'pending');
```

#### 5. Add Budget Items
```sql
INSERT INTO budget_tracking (project_id, category, budgeted_amount, spent_amount)
VALUES 
  ((SELECT id FROM projects LIMIT 1), 'المواد الخام', 150000.00, 45000.00),
  ((SELECT id FROM projects LIMIT 1), 'العمالة', 200000.00, 60000.00),
  ((SELECT id FROM projects LIMIT 1), 'المعدات', 100000.00, 25000.00);
```

## Troubleshooting

### Issue: "Table does not exist" error
**Solution**: Make sure the migration script was run successfully. Check the Supabase dashboard to verify tables were created.

### Issue: Empty dashboard
**Solution**: Add sample data using the SQL queries provided above.

### Issue: Missing environment variables
**Solution**: Verify that `.env.development.local` has the correct SUPABASE_URL and SUPABASE_ANON_KEY values.

### Issue: Permission denied errors
**Solution**: Make sure Row Level Security (RLS) policies are properly configured. The migration script includes basic RLS policies that allow full access. You may need to refine these based on your security requirements.

## RTL (Right-to-Left) Support
The dashboard is fully optimized for Arabic and other RTL languages. All text aligns correctly and UI elements respond to language changes.

## Next Steps
1. Verify the database tables are created
2. Add sample project data
3. Navigate to `/project-management` to view the dashboard
4. Create additional projects, tasks, and team members as needed

## Support
For issues or questions, please refer to the main README.md file or check the Supabase documentation.
