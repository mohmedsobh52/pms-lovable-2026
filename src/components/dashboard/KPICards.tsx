import { Card } from '@/components/ui/card';
import { useProjectTasks } from '@/hooks/useTasks';
import { useProjectTeamMembers } from '@/hooks/useTeamMembers';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface KPICardsProps {
  projectId: string;
}

export function KPICards({ projectId }: KPICardsProps) {
  const { data: tasks = [] } = useProjectTasks(projectId);
  const { data: teamMembers = [] } = useProjectTeamMembers(projectId);
  
  const { data: budgetData = { totalBudget: 0, totalSpent: 0 } } = useQuery({
    queryKey: ['budget-summary', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('budget_tracking')
        .select('budgeted_amount, spent_amount')
        .eq('project_id', projectId);

      const totalBudget = (data || []).reduce((sum: number, item: any) => sum + item.budgeted_amount, 0);
      const totalSpent = (data || []).reduce((sum: number, item: any) => sum + item.spent_amount, 0);

      return { totalBudget, totalSpent };
    },
  });

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const taskCompletion = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  const budgetUsed = budgetData.totalBudget > 0 ? (budgetData.totalSpent / budgetData.totalBudget) * 100 : 0;

  const kpis = [
    {
      label: 'إجمالي المهام',
      value: tasks.length,
      icon: '📋',
      color: 'bg-blue-100 text-blue-700'
    },
    {
      label: 'المهام المكتملة',
      value: completedTasks,
      icon: '✓',
      color: 'bg-green-100 text-green-700',
      subtext: `${taskCompletion.toFixed(0)}% مكتمل`
    },
    {
      label: 'قيد التنفيذ',
      value: inProgressTasks,
      icon: '⚡',
      color: 'bg-amber-100 text-amber-700'
    },
    {
      label: 'أعضاء الفريق',
      value: teamMembers.length,
      icon: '👥',
      color: 'bg-purple-100 text-purple-700'
    },
    {
      label: 'الميزانية المستخدمة',
      value: `${budgetUsed.toFixed(1)}%`,
      icon: '💰',
      color: 'bg-pink-100 text-pink-700'
    },
    {
      label: 'المبلغ المنفق',
      value: `${(budgetData.totalSpent / 1000).toFixed(1)}K`,
      icon: '💸',
      color: 'bg-orange-100 text-orange-700'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((kpi, idx) => (
        <Card key={idx} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">{kpi.label}</p>
              <p className="text-3xl font-bold mb-1">{kpi.value}</p>
              {kpi.subtext && (
                <p className="text-xs text-gray-500">{kpi.subtext}</p>
              )}
            </div>
            <div className={`text-3xl p-3 rounded-lg ${kpi.color}`}>
              {kpi.icon}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
