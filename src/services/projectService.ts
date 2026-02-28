import { supabase } from "@/integrations/supabase/client";

export interface ProjectFilters {
  status?: string;
  searchQuery?: string;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  from: number;
  to: number;
}

export const projectService = {
  async getProjects(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
    filters?: ProjectFilters
  ): Promise<PaginatedResult<any>> {
    try {
      let query = supabase
        .from('saved_projects')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .or('is_deleted.eq.false,is_deleted.is.null');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.searchQuery) {
        query = query.ilike('name', `%${filters.searchQuery}%`);
      }

      const sortBy = filters?.sortBy || 'updated_at';
      const sortOrder = filters?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        from,
        to: Math.min(to, (count || 0) - 1),
      };
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },

  async getProjectById(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('saved_projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  },

  async createProject(userId: string, projectData: {
    name: string;
    file_name?: string;
    analysis_data?: any;
    wbs_data?: any;
    status?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('saved_projects')
        .insert({
          user_id: userId,
          ...projectData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  async updateProject(projectId: string, updates: {
    name?: string;
    analysis_data?: any;
    wbs_data?: any;
    status?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('saved_projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  },

  async softDeleteProject(projectId: string) {
    try {
      const now = new Date().toISOString();
      await Promise.all([
        supabase.from('saved_projects').update({ is_deleted: true, deleted_at: now }).eq('id', projectId),
        supabase.from('project_data').update({ is_deleted: true, deleted_at: now }).eq('id', projectId),
      ]);
      return true;
    } catch (error) {
      console.error('Error soft-deleting project:', error);
      throw error;
    }
  },

  async restoreProject(projectId: string) {
    try {
      await Promise.all([
        supabase.from('saved_projects').update({ is_deleted: false, deleted_at: null }).eq('id', projectId),
        supabase.from('project_data').update({ is_deleted: false, deleted_at: null }).eq('id', projectId),
      ]);
      return true;
    } catch (error) {
      console.error('Error restoring project:', error);
      throw error;
    }
  },

  async deleteProject(projectId: string) {
    try {
      // Get project_items IDs for cascading deletes
      const { data: projectItems } = await supabase
        .from('project_items')
        .select('id')
        .eq('project_id', projectId);

      const itemIds = (projectItems || []).map((i: any) => i.id);

      if (itemIds.length > 0) {
        const { error: costErr } = await supabase.from('item_costs').delete().in('project_item_id', itemIds);
        if (costErr) throw costErr;
        const { error: pricingErr } = await supabase.from('item_pricing_details').delete().in('project_item_id', itemIds);
        if (pricingErr) throw pricingErr;
      }

      const { error: boqErr } = await supabase.from('edited_boq_prices').delete().or(`project_id.eq.${projectId},saved_project_id.eq.${projectId}`);
      if (boqErr) throw boqErr;

      const { error: itemsErr } = await supabase.from('project_items').delete().eq('project_id', projectId);
      if (itemsErr) throw itemsErr;

      const { error: pdErr } = await supabase.from('project_data').delete().eq('id', projectId);
      if (pdErr) throw pdErr;

      const { error: spErr } = await supabase.from('saved_projects').delete().eq('id', projectId);
      if (spErr) throw spErr;

      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  async getProjectStats(userId: string) {
    try {
      const { data: projects, error } = await supabase
        .from('saved_projects')
        .select('analysis_data')
        .eq('user_id', userId);

      if (error) throw error;

      let totalValue = 0;
      let totalItems = 0;

      projects?.forEach(p => {
        const analysis = p.analysis_data as any;
        if (analysis?.summary?.total_value) {
          totalValue += analysis.summary.total_value;
        }
        if (analysis?.items?.length) {
          totalItems += analysis.items.length;
        }
      });

      return {
        totalProjects: projects?.length || 0,
        totalValue,
        totalItems,
      };
    } catch (error) {
      console.error('Error fetching project stats:', error);
      throw error;
    }
  },

  async getRecentProjects(userId: string, limit: number = 5) {
    try {
      const { data, error } = await supabase
        .from('saved_projects')
        .select('*')
        .eq('user_id', userId)
        .or('is_deleted.eq.false,is_deleted.is.null')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent projects:', error);
      throw error;
    }
  },
};
