# Project Management System (PMS) - Features Guide

## 📊 Dashboard Overview

The Project Management System provides a comprehensive dashboard for managing projects, teams, budgets, and tasks. All components are fully responsive and support RTL (Right-to-Left) languages.

## 🎯 Key Features

### 1. **Project Overview** 📋
- View project status (Active, Completed, On-Hold, Cancelled)
- See project dates and deadlines
- Track overall progress with visual progress bars
- View allocated budget
- Quick access to project details

**Key Metrics:**
- Project status and phase
- Start and end dates
- Overall completion percentage
- Total allocated budget

---

### 2. **Timeline Management** 📅
- Visual timeline with horizontal progress bars
- Color-coded status indicators
- Track multiple project phases/milestones
- Monitor deadline adherence
- See progress breakdown by phase

**Timeline Features:**
- Pending → In Progress → Completed tracking
- Custom milestone creation
- Automatic progress calculation
- Date range visualization

---

### 3. **Team Resources** 👥
- Manage team members across projects
- Assign roles and responsibilities
- Track resource allocation percentages
- Monitor team member status
- Contact information management

**Team Management:**
- Team member roles (Project Manager, Developer, Designer, QA, Client)
- Resource allocation (0-100%)
- Start and end dates for each assignment
- Email contact information

---

### 4. **Budget Tracking** 💰
- Real-time budget monitoring
- Category-wise budget allocation
- Spending vs. Budget comparison
- Percentage usage indicators
- Color-coded budget health

**Budget Categories:**
- Materials
- Labor
- Equipment
- Other (customizable)

**Budget Metrics:**
- Total budgeted amount
- Amount spent
- Remaining budget
- Percentage of budget utilized
- Visual alerts for over-budget categories

---

### 5. **Task Management** ✓
- Organize tasks by status
- Priority-based task sorting
- Deadline tracking
- Assign tasks to team members
- Task completion tracking

**Task Statuses:**
- To Do (قيد الانتظار)
- In Progress (قيد التنفيذ)
- Completed (مكتملة)
- On Hold (موقوفة)

**Task Priorities:**
- Low (منخفضة)
- Medium (متوسطة)
- High (عالية)
- Critical (حرجة)

---

### 6. **KPI Cards** 📈
Quick overview of key project metrics:
- Total number of tasks
- Completed tasks count
- Tasks in progress
- Team member count
- Budget usage percentage
- Total amount spent

---

## 🗄️ Database Schema

### Tables

#### `projects`
Main project information
```
- id: UUID (Primary Key)
- name: String
- description: Text
- status: Enum (active, completed, on-hold, cancelled)
- start_date: Date
- end_date: Date
- budget: Decimal
- progress_percentage: Integer (0-100)
- project_manager_id: UUID
```

#### `team_members`
Project team assignments
```
- id: UUID (Primary Key)
- project_id: UUID (FK)
- user_name: String
- email: String
- role: String
- allocation_percentage: Integer (0-100)
- start_date: Date
- end_date: Date (nullable)
```

#### `tasks`
Individual project tasks
```
- id: UUID (Primary Key)
- project_id: UUID (FK)
- title: String
- description: Text
- status: Enum (todo, in-progress, completed, on-hold)
- priority: Enum (low, medium, high, critical)
- assigned_to: UUID (FK to team_members)
- start_date: Date
- due_date: Date
- completion_date: Date
```

#### `timeline_items`
Project milestones and phases
```
- id: UUID (Primary Key)
- project_id: UUID (FK)
- title: String
- start_date: Date
- end_date: Date
- progress_percentage: Integer (0-100)
- status: Enum (pending, in-progress, completed)
```

#### `budget_tracking`
Detailed budget tracking
```
- id: UUID (Primary Key)
- project_id: UUID (FK)
- category: String
- budgeted_amount: Decimal
- spent_amount: Decimal
- remaining_amount: Decimal
- percentage_used: Decimal
```

---

## 🚀 Getting Started

### Initial Setup
1. Navigate to `/project-management`
2. Follow the setup wizard if tables don't exist
3. Execute the SQL in your Supabase dashboard
4. Return to the page and create your first project

### Creating Your First Project

```sql
INSERT INTO projects (name, description, status, start_date, end_date, budget, progress_percentage)
VALUES (
  'My First Project',
  'Project description',
  'active',
  '2026-01-01',
  '2026-12-31',
  100000.00,
  0
);
```

### Adding Team Members

```sql
INSERT INTO team_members (project_id, user_name, email, role, allocation_percentage, start_date)
VALUES (
  'project-id-here',
  'John Doe',
  'john@example.com',
  'project-manager',
  100,
  CURRENT_DATE
);
```

### Creating Tasks

```sql
INSERT INTO tasks (project_id, title, status, priority, due_date)
VALUES (
  'project-id-here',
  'Task Title',
  'todo',
  'high',
  '2026-03-15'
);
```

### Setting Up Timeline Items

```sql
INSERT INTO timeline_items (project_id, title, start_date, end_date, status)
VALUES (
  'project-id-here',
  'Phase 1: Planning',
  '2026-01-01',
  '2026-02-28',
  'pending'
);
```

### Adding Budget Categories

```sql
INSERT INTO budget_tracking (project_id, category, budgeted_amount, spent_amount)
VALUES 
  ('project-id-here', 'Materials', 50000.00, 10000.00),
  ('project-id-here', 'Labor', 40000.00, 15000.00),
  ('project-id-here', 'Equipment', 10000.00, 5000.00);
```

---

## 🎨 UI Components Used

The dashboard uses the following shadcn/ui components:

- **Card** - Dashboard section containers
- **Button** - Action triggers
- **Select** - Project selection dropdown
- **Avatar** - Team member avatars
- **Badge** - Status and priority indicators
- **Progress** - Progress bars for timelines and budgets
- **Checkbox** - Task completion indicators
- **Alert** - Status messages and notifications

---

## 🌐 RTL Support (Arabic)

The system is fully optimized for Arabic (RTL):
- All text properly aligns right-to-left
- Flex and grid layouts automatically adjust
- Date formatting follows Arabic locale
- Labels and descriptions in Arabic
- Responsive design works perfectly in RTL mode

---

## 📱 Responsive Design

The dashboard is fully responsive:
- **Mobile (< 768px)**: Single column layout
- **Tablet (768px - 1024px)**: 2-column layout
- **Desktop (> 1024px)**: 3-column layout with optimized spacing

---

## 🔍 Component Structure

```
src/
├── pages/
│   └── ProjectManagementPage.tsx          # Main dashboard page
├── components/
│   ├── PMSSetup.tsx                       # Database setup wizard
│   └── dashboard/
│       ├── ProjectOverview.tsx            # Project header and summary
│       ├── ProjectTimeline.tsx            # Timeline/milestones view
│       ├── TeamResources.tsx              # Team management
│       ├── BudgetTracking.tsx             # Budget overview
│       ├── TaskManagement.tsx             # Task lists by status
│       ├── KPICards.tsx                   # Key metrics cards
│       └── QuickStart.tsx                 # Getting started guide
└── hooks/
    ├── useProjects.ts                     # Project data queries
    ├── useTasks.ts                        # Task data queries
    ├── useTeamMembers.ts                  # Team member queries
    ├── useBudgetTracking.ts               # Budget data queries
    └── useTimeline.ts                     # Timeline data queries
```

---

## 🔐 Security Features

- **Row Level Security (RLS)**: Basic RLS policies configured on all tables
- **Authorization**: Supabase auth integration ready
- **Input Validation**: TypeScript interfaces ensure data integrity
- **SQL Injection Prevention**: Parameterized queries via Supabase client

---

## 📊 Performance Optimizations

- **React Query Caching**: Efficient data fetching and caching
- **Lazy Loading**: Components load on demand
- **Optimized Queries**: Indexed database queries for fast retrieval
- **Responsive Images**: Optimized for different screen sizes

---

## 🛠️ Customization

### Adding New Budget Categories
Simply add them when creating budget items - no code changes needed.

### Custom Roles
Modify the role dropdown in TeamResources component to add custom roles:

```typescript
const getRoleColor = (role: string | null) => {
  const colors: Record<string, string> = {
    'project-manager': 'bg-blue-100 text-blue-800',
    'developer': 'bg-purple-100 text-purple-800',
    'your-custom-role': 'bg-color text-color-text', // Add here
  };
  return colors[role || ''] || 'bg-gray-100 text-gray-800';
};
```

### Custom Status Colors
Modify the color functions in each component to match your brand:

```typescript
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'active': 'text-green-600',
    'custom-status': 'text-your-color',
  };
  return colors[status] || 'text-gray-600';
};
```

---

## 📞 Support & Documentation

For more information:
- See `PMS_SETUP.md` for installation instructions
- Check the component files for JSDoc comments
- Review the database schema in `scripts/01-init-pms-schema.sql`

---

## 🎓 Best Practices

1. **Regular Updates**: Keep project progress updated regularly
2. **Clear Milestones**: Define clear timeline milestones
3. **Accurate Budgeting**: Keep spending records up-to-date
4. **Task Assignment**: Assign all tasks to responsible team members
5. **Progress Tracking**: Update task status regularly

---

## 🐛 Known Limitations

- Maximum of 1000 tasks per project for optimal performance
- Budget categories are text-based (no pre-defined limits)
- Timeline items are milestones (not individual tasks)
- No nested tasks or sub-tasks in current version

---

## 🚀 Future Enhancements

Planned features for future releases:
- [ ] Gantt chart timeline view
- [ ] Risk management module
- [ ] Change request tracking
- [ ] Time tracking and capacity planning
- [ ] Automated reporting and email alerts
- [ ] Integration with external APIs
- [ ] Advanced filtering and search
- [ ] Data export (PDF, Excel)

---

**Version:** 1.0.0  
**Last Updated:** April 2026  
**Compatibility:** React 18+, Supabase, TypeScript
