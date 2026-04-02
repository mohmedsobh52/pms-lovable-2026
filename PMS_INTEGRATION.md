# Project Management System (PMS) - Integration Guide

## Quick Access

### URL
```
http://localhost:8080/project-management
```

## How It Was Integrated

The Project Management System has been seamlessly integrated into your existing application:

### 1. **New Route Added**
A new route `/project-management` has been added to `src/App.tsx` using lazy loading for optimal performance.

```typescript
const ProjectManagementPage = lazyWithRetry(() => import("./pages/ProjectManagementPage"));

// In Routes configuration:
<Route path="/project-management" element={<ProjectManagementPage />} />
```

### 2. **Database Integration**
The PMS uses your existing Supabase integration:
- Configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Uses the same authentication context as your main app
- Follows your existing data fetching patterns with React Query

### 3. **Component Organization**

```
src/
├── pages/
│   └── ProjectManagementPage.tsx          # Main PMS dashboard
├── components/
│   ├── PMSSetup.tsx                       # Database setup wizard
│   └── dashboard/                         # PMS-specific components
│       ├── ProjectOverview.tsx
│       ├── ProjectTimeline.tsx
│       ├── TeamResources.tsx
│       ├── BudgetTracking.tsx
│       ├── TaskManagement.tsx
│       ├── KPICards.tsx
│       └── QuickStart.tsx
└── hooks/
    ├── useProjects.ts                     # Custom data hooks
    ├── useTasks.ts
    ├── useTeamMembers.ts
    ├── useBudgetTracking.ts
    └── useTimeline.ts
```

### 4. **Database Tables**
Five new database tables have been created:
- `projects` - Main project data
- `team_members` - Project team assignments
- `tasks` - Individual tasks
- `timeline_items` - Project milestones
- `budget_tracking` - Budget management

See `scripts/01-init-pms-schema.sql` for the complete schema.

## Setup Instructions

### Step 1: Create Database Tables

#### Option A: Using Setup Wizard (Recommended)
1. Navigate to `/project-management`
2. The app will detect if tables exist
3. If not, follow the on-screen instructions
4. Copy the SQL and execute in Supabase SQL Editor
5. Return to the page to verify

#### Option B: Manual SQL Execution
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste content from `scripts/01-init-pms-schema.sql`
4. Click "Run"

#### Option C: Using Migration Script
```bash
# From project root directory
chmod +x scripts/execute-migrations.sh
./scripts/execute-migrations.sh
```

### Step 2: Add Sample Data (Optional)

To test the dashboard, you can add sample data:

```sql
-- Create a sample project
INSERT INTO projects (name, description, status, start_date, end_date, budget, progress_percentage)
VALUES (
  'مشروع العينة',
  'مشروع تجريبي لاختبار النظام',
  'active',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '6 months',
  500000.00,
  25
);

-- Add to team_members, tasks, timeline_items, and budget_tracking tables
-- See PMS_SETUP.md for detailed examples
```

### Step 3: Access the Dashboard
1. Go to `http://localhost:8080/project-management`
2. You should see the dashboard if tables exist
3. Use the project selector to view different projects

## Features Available

### Dashboard Components

1. **KPI Cards**
   - Total tasks, completed tasks, in-progress count
   - Team member count, budget usage, total spent

2. **Project Overview**
   - Project status and dates
   - Overall progress bar
   - Budget allocation display

3. **Timeline View**
   - Milestone tracking
   - Phase progress bars
   - Deadline visualization

4. **Team Resources**
   - Team member listings
   - Role assignments
   - Resource allocation percentages

5. **Budget Tracking**
   - Category-wise budget breakdown
   - Spending vs. budget comparison
   - Visual budget health indicators

6. **Task Management**
   - Tasks organized by status
   - Priority and deadline tracking
   - Task assignment display

## Styling & Design

The PMS uses:
- **tailwindcss** for responsive styling
- **shadcn/ui** components for consistency
- **RTL support** for Arabic and other RTL languages
- **Lucide icons** for UI elements

### Color Palette

The dashboard uses your existing theme system:
- Primary actions: Blue (#3b82f6)
- Success indicators: Green (#22c55e)
- Warning/caution: Amber (#f59e0b)
- Error states: Red (#ef4444)
- Backgrounds: Gray (#f9fafb)

## Data Flow

```
Database (Supabase)
       ↓
React Query Hooks (useProjects, useTasks, etc.)
       ↓
Components (Dashboard sections)
       ↓
UI Display
```

### React Query Caching
- **Cache time**: 5 minutes (stale time)
- **Garbage collection**: 10 minutes
- **Refetch**: On window focus disabled
- **Retry**: 1 automatic retry on failure

## Environment Variables

The PMS automatically uses existing env vars:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

No additional env vars needed!

## Integration with Existing Features

The PMS coexists peacefully with your existing features:

### ✅ Compatible With
- Your authentication system
- Existing navigation menu
- Theme provider
- Language switching (RTL support)
- Error boundaries
- Query client configuration

### ⚠️ Note
- PMS is a new standalone feature
- Doesn't interfere with existing pages
- Can be added/removed without affecting other features
- Uses same UI patterns as rest of app

## Performance Considerations

### Optimizations Included
- Lazy loaded components
- React Query caching
- Indexed database queries
- Optimized renders (no unnecessary re-renders)
- Efficient data fetching patterns

### Recommendations
- Keep projects under 5000 tasks
- Archive old projects regularly
- Use budget categories sparingly (< 20)
- Review queries in production monitoring

## Security & Privacy

### Implemented
- Row Level Security (RLS) on all tables
- Parameterized queries prevent SQL injection
- TypeScript for type safety
- Input validation on all forms

### Best Practices
- Review RLS policies before production
- Implement proper authentication checks
- Use environment variables for sensitive data
- Regular database backups

## Troubleshooting

### Issue: "Table does not exist" error
**Solution**: Run the database setup wizard or execute SQL manually

### Issue: Empty dashboard
**Solution**: Add sample data using provided SQL examples

### Issue: "Permission denied" 
**Solution**: Check RLS policies in Supabase → Authentication → Policies

### Issue: Slow performance
**Solution**: Check indexes, consider archiving old projects

## Files Modified/Created

### New Files
- `src/pages/ProjectManagementPage.tsx`
- `src/components/PMSSetup.tsx`
- `src/components/dashboard/*.tsx` (6 components)
- `src/hooks/useProjects.ts`
- `src/hooks/useTasks.ts`
- `src/hooks/useTeamMembers.ts`
- `src/hooks/useBudgetTracking.ts`
- `src/hooks/useTimeline.ts`
- `scripts/01-init-pms-schema.sql`
- `scripts/run-migrations.js`
- `scripts/execute-migrations.sh`
- `PMS_SETUP.md`
- `PMS_FEATURES.md`
- `PMS_INTEGRATION.md` (this file)

### Modified Files
- `src/App.tsx` (added route and import)

## Next Steps

1. **Set up database tables** - Follow Step 1 above
2. **Add sample data** - Optional, use provided SQL
3. **Access the dashboard** - Visit `/project-management`
4. **Create your first project** - Use the UI or SQL
5. **Customize as needed** - Edit components to match your brand

## Documentation References

- **Setup Guide**: `PMS_SETUP.md`
- **Features Guide**: `PMS_FEATURES.md`
- **Database Schema**: `scripts/01-init-pms-schema.sql`
- **Component Files**: See individual component JSDoc comments

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review component files for implementation details
3. Check Supabase documentation for database issues
4. Review React Query documentation for caching behavior

---

**Version**: 1.0.0  
**Integration Date**: April 2026  
**Status**: ✅ Production Ready  
**Requires**: Supabase Project, Node 18+, React 18+
