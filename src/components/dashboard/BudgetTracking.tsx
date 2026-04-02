import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface BudgetItem {
  id: string;
  category: string;
  budgeted_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
}

interface BudgetTrackingProps {
  projectId: string;
}

export function BudgetTracking({ projectId }: BudgetTrackingProps) {
  const { data: budgetItems = [] } = useQuery({
    queryKey: ['budget-tracking', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_tracking')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw new Error(error.message);
      return (data || []) as BudgetItem[];
    },
  });

  const totalBudget = budgetItems.reduce((sum, item) => sum + item.budgeted_amount, 0);
  const totalSpent = budgetItems.reduce((sum, item) => sum + item.spent_amount, 0);
  const totalRemaining = budgetItems.reduce((sum, item) => sum + item.remaining_amount, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const getPercentageColor = (percentage: number) => {
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-6">تتبع الميزانية</h3>
      
      {/* Overall Budget Summary */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">الميزانية الكلية</p>
            <p className="text-xl font-bold">{totalBudget.toLocaleString('ar-EG')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">المنفق</p>
            <p className="text-xl font-bold text-amber-600">{totalSpent.toLocaleString('ar-EG')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">المتبقي</p>
            <p className="text-xl font-bold text-green-600">{totalRemaining.toLocaleString('ar-EG')}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">نسبة الإنفاق</span>
            <span className="text-lg font-bold">{overallPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={overallPercentage} className="h-2" />
        </div>
      </div>

      {/* Budget Items */}
      <div className="space-y-4">
        {budgetItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">لم يتم إضافة بنود ميزانية</p>
        ) : (
          budgetItems.map((item) => (
            <div key={item.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">{item.category}</p>
                  <p className="text-sm text-gray-600">
                    {item.spent_amount.toLocaleString('ar-EG')} من {item.budgeted_amount.toLocaleString('ar-EG')}
                  </p>
                </div>
                <span className="text-lg font-bold">{item.percentage_used.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${getPercentageColor(item.percentage_used)} transition-all duration-300`}
                  style={{ width: `${Math.min(item.percentage_used, 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
