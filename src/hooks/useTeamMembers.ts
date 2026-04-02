import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface TeamMember {
  id: string;
  project_id: string;
  user_name: string;
  email: string | null;
  role: string | null;
  allocation_percentage: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export function useProjectTeamMembers(projectId: string) {
  return useQuery({
    queryKey: ['team-members', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw new Error(error.message);
      return (data || []) as TeamMember[];
    },
    enabled: !!projectId,
  });
}

export async function createTeamMember(member: Omit<TeamMember, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('team_members')
    .insert([member])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TeamMember;
}
