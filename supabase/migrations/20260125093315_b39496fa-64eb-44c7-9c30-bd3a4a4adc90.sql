-- إضافة عمود sort_order لحفظ ترتيب البنود الأصلي
ALTER TABLE project_items 
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- تحديث البنود الموجودة بترتيب الإنشاء
UPDATE project_items SET sort_order = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as row_num
  FROM project_items
) sub
WHERE project_items.id = sub.id;