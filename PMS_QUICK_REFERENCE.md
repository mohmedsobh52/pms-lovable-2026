# Project Management System - Quick Reference Card

## 🚀 Access
```
http://localhost:8080/project-management
```

## ⚡ Quick Setup (3 steps)

### 1. Create Tables
```bash
Go to: http://localhost:8080/project-management
→ Follow setup wizard
→ Copy SQL
→ Paste in Supabase SQL Editor
→ Click Run
```

### 2. Add Sample Data
```sql
INSERT INTO projects (name, status, budget)
VALUES ('My Project', 'active', 100000);
```

### 3. View Dashboard
```
Refresh page
See your project in dashboard
```

## 📊 Dashboard Sections

| Section | Shows | Actions |
|---------|-------|---------|
| **KPI Cards** | 6 key metrics | Monitor progress |
| **Project Overview** | Status, dates, budget | View details |
| **Timeline** | Phases/milestones | Track schedule |
| **Team** | Members & roles | Manage team |
| **Budget** | Spending breakdown | Monitor costs |
| **Tasks** | By status/priority | Track work |

## 🗄️ Key SQL Queries

### View Projects
```sql
SELECT id, name, status, progress_percentage FROM projects;
```

### Add Project
```sql
INSERT INTO projects (name, status, budget)
VALUES ('Project Name', 'active', 100000);
```

### Update Progress
```sql
UPDATE projects SET progress_percentage = 50 WHERE id = 'uuid';
```

### View Tasks
```sql
SELECT * FROM tasks WHERE project_id = 'uuid';
```

### Add Task
```sql
INSERT INTO tasks (project_id, title, status, priority)
VALUES ('uuid', 'Task Name', 'todo', 'high');
```

## 🎨 Component Files

```
ProjectManagementPage.tsx  ← Main dashboard
├── ProjectOverview       ← Top left
├── ProjectTimeline       ← Top right
├── TeamResources         ← Middle left
├── BudgetTracking        ← Middle right
├── TaskManagement        ← Bottom
└── KPICards              ← Top (metrics)
```

## 🔑 Environment Variables

```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

(Already configured - no changes needed)

## 📱 Responsive

```
Mobile:   < 640px  (1 column)
Tablet:   640px    (2 columns)
Desktop:  1024px+  (3 columns)
```

## 🔒 Security

- ✅ Row Level Security (RLS) enabled
- ✅ Parameterized queries
- ✅ TypeScript type safety
- ✅ Environment variables protected

## 📦 Database Tables

```
projects
├── id, name, status
├── start_date, end_date
├── budget, progress_percentage

team_members
├── id, project_id
├── user_name, email, role
└── allocation_percentage

tasks
├── id, project_id
├── title, status, priority
├── assigned_to, due_date

timeline_items
├── id, project_id
├── title, start_date, end_date
└── progress_percentage, status

budget_tracking
├── id, project_id
├── category, budgeted_amount
└── spent_amount
```

## 🎯 Common Tasks

### Create Project
```sql
INSERT INTO projects (name, description, status, budget, progress_percentage)
VALUES ('Project', 'Desc', 'active', 100000, 0);
```

### Add Team Member
```sql
INSERT INTO team_members (project_id, user_name, role, allocation_percentage)
VALUES ('uuid', 'Name', 'role', 100);
```

### Create Task
```sql
INSERT INTO tasks (project_id, title, status, priority, due_date)
VALUES ('uuid', 'Title', 'todo', 'high', '2026-03-15');
```

### Add Timeline Phase
```sql
INSERT INTO timeline_items (project_id, title, start_date, end_date, status)
VALUES ('uuid', 'Phase', '2026-01-01', '2026-02-28', 'pending');
```

### Add Budget Category
```sql
INSERT INTO budget_tracking (project_id, category, budgeted_amount)
VALUES ('uuid', 'Materials', 50000);
```

## 🔍 View Project ID

```sql
SELECT id, name FROM projects LIMIT 1;
```

Copy the UUID for your SQL queries above.

## 📈 Status Values

**Projects**: `active`, `completed`, `on-hold`, `cancelled`  
**Tasks**: `todo`, `in-progress`, `completed`, `on-hold`  
**Timeline**: `pending`, `in-progress`, `completed`  
**Priority**: `low`, `medium`, `high`, `critical`  

## 🎨 Role Options

`project-manager`, `developer`, `designer`, `qa`, `client`

## 🔄 Update Operations

### Update Project Progress
```sql
UPDATE projects SET progress_percentage = 75 
WHERE id = 'uuid';
```

### Update Task Status
```sql
UPDATE tasks SET status = 'completed' 
WHERE id = 'uuid';
```

### Update Budget Spending
```sql
UPDATE budget_tracking SET spent_amount = 45000 
WHERE id = 'uuid';
```

### Update Timeline Phase Progress
```sql
UPDATE timeline_items SET progress_percentage = 50 
WHERE id = 'uuid';
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| GETTING_STARTED_PMS.md | 👈 **Start here** |
| PMS_FEATURES.md | Feature details |
| PMS_SETUP.md | Setup instructions |
| PMS_INTEGRATION.md | Technical details |
| IMPLEMENTATION_SUMMARY.md | What was built |

## ✅ Setup Checklist

- [ ] Navigate to `/project-management`
- [ ] See setup wizard (if tables missing)
- [ ] Copy and execute SQL
- [ ] Create sample project
- [ ] Add team members
- [ ] Create tasks
- [ ] View dashboard
- [ ] Explore all sections

## 🆘 Quick Troubleshooting

**No setup page?** → Tables already exist ✅  
**Setup page won't proceed?** → Execute full SQL  
**Dashboard empty?** → Add sample data via SQL  
**Data not showing?** → Refresh browser + clear cache  
**Slow?** → Check database indexes + query time  

## 📞 Need Help?

1. Check GETTING_STARTED_PMS.md
2. Review relevant documentation file
3. Check component source code comments
4. Review Supabase documentation

## 🚀 Go Live

1. Database tables created ✅
2. Environment variables set ✅
3. Sample data added (optional) ✅
4. Dashboard tested ✅
5. **Ready to deploy!** 🎉

## 📊 Performance Tips

- Keep projects < 5,000 tasks
- Archive old projects regularly
- Update budget monthly
- Review queries in production
- Monitor database size

## 🎯 Project Management Best Practices

1. **Define clear milestones** in timeline
2. **Assign all tasks** to team members
3. **Update progress regularly** (weekly)
4. **Monitor budget closely** (weekly)
5. **Communicate status** to stakeholders
6. **Review metrics monthly** via dashboard
7. **Archive completed projects** periodically

## 💡 Pro Features

- Real-time data sync (React Query)
- Color-coded status indicators
- Visual progress bars
- Team allocation tracking
- Budget health alerts
- Full RTL/Arabic support
- Mobile responsive
- Export-ready data

## 🎉 You're All Set!

Your Project Management System is ready to use!

**Dashboard**: `http://localhost:8080/project-management`

---

**Print this card for quick reference!**
