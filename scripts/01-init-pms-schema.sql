-- Project Management System Schema

-- Projects Table
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

-- Team Members Table
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

-- Tasks Table
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

-- Timeline Items Table (Milestones/Schedule)
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

-- Budget Tracking Table
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

-- Create indexes for common queries
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_project_manager ON projects(project_manager_id);
CREATE INDEX idx_team_members_project ON team_members(project_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_timeline_items_project ON timeline_items(project_id);
CREATE INDEX idx_budget_tracking_project ON budget_tracking(project_id);

-- Enable Row Level Security (RLS) for tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_tracking ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow all access for now - can be refined later)
CREATE POLICY "Allow read access to all projects" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to projects" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to projects" ON projects
  FOR UPDATE USING (true);

CREATE POLICY "Allow read access to team_members" ON team_members
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to team_members" ON team_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read access to tasks" ON tasks
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to tasks" ON tasks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to tasks" ON tasks
  FOR UPDATE USING (true);

CREATE POLICY "Allow read access to timeline_items" ON timeline_items
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to timeline_items" ON timeline_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read access to budget_tracking" ON budget_tracking
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to budget_tracking" ON budget_tracking
  FOR INSERT WITH CHECK (true);
