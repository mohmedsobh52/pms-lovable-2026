import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface BudgetItem {
  id: string;
  project_id: string;
  category: string;
  budgeted_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  created_at: string;
  updated_at: string;
}

export function useProjectBudget(projectId: string) {
  return useQuery({
    queryKey: ['budget-tracking', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_tracking')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw new Error(error.message);
      return (data || []) as BudgetItem[];
    },
    enabled: !!projectId,
  });
}

export async function createBudgetItem(item: Omit<BudgetItem, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('budget_tracking')
    .insert([item])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as BudgetItem;
}

export async function updateBudgetItem(id: string, updates: Partial<BudgetItem>) {
  const { data, error } = await supabase
    .from('budget_tracking')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as BudgetItem;
}
