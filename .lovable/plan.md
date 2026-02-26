
# Fix Supplier Dropdown and Improve Library Screen Performance

## Issues Found

1. **Supplier Select broken**: The `Select` component has `value=""` (empty string) which is invalid for Radix UI Select. When no suppliers exist, the `SelectContent` is empty, causing the dropdown to fail silently.

2. **Console warning**: "Function components cannot be given refs" - caused by wrapping `Select` inside a form without proper ref forwarding.

3. **Performance**: The `useMemo` on line 151 is misused as a side-effect (`setCurrentPage(1)`) instead of using `useEffect`.

## Changes

### File: `src/components/library/MaterialsTab.tsx`

**Fix 1 - Supplier Select (lines 247-251)**
- Change `value={formData.supplier_name}` to `value={formData.supplier_name || undefined}` so empty string doesn't break Radix
- Add a manual text input fallback option so users can type a supplier name if none exist in the suppliers list
- Add an "Other" option that lets users type a custom supplier name

**Fix 2 - Replace misused useMemo with useEffect (line 151)**
- Replace `useMemo(() => { setCurrentPage(1); }, [...])` with proper `useEffect`

**Fix 3 - Add DialogDescription to the Add Material dialog (line 206)**
- Add `DialogDescription` to fix the console warning about missing description

**Fix 4 - Performance: wrap handlers in useCallback**
- Wrap `startEdit`, `cancelEdit`, `saveEdit`, `handleSubmit`, `exportToExcel` in `useCallback` to reduce unnecessary re-renders in the memoized component

## Technical Details

### Supplier Fix
```typescript
// Replace the broken Select with a combo approach:
// If suppliers exist -> show Select with an extra "other" option
// If no suppliers or "other" selected -> show text Input

<Label>Supplier</Label>
{suppliers.length > 0 ? (
  <Select 
    value={formData.supplier_name || undefined} 
    onValueChange={(v) => setFormData(prev => ({ ...prev, supplier_name: v === '__other__' ? '' : v }))}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select supplier" />
    </SelectTrigger>
    <SelectContent>
      {suppliers.map(s => (
        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
      ))}
      <SelectItem value="__other__">Other (type manually)</SelectItem>
    </SelectContent>
  </Select>
) : (
  <Input 
    value={formData.supplier_name} 
    onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))} 
    placeholder="Enter supplier name" 
  />
)}
```

### useEffect Fix
```typescript
// Before (wrong - side effect in useMemo)
useMemo(() => { setCurrentPage(1); }, [search, categoryFilter, validityFilter]);

// After (correct)
useEffect(() => { setCurrentPage(1); }, [search, categoryFilter, validityFilter]);
```
