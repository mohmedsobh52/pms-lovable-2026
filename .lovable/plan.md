

# Improving Subcontractor BOQ Items Selection List

## Current Issues (from screenshot analysis)

1. **Limited List Height**: The list uses `max-h-40` (10rem = 160px) which shows only ~4-5 items
2. **Poor Visual Hierarchy**: All items look the same, hard to scan quickly
3. **No Search/Filter**: Users must scroll through all items manually
4. **Truncated Descriptions**: Items cut off at 50 characters with "..."
5. **No Category Grouping**: Items not organized by category/section
6. **No "Select All" Option**: Users must click each item individually
7. **No Visual Feedback**: No indication of how many items are selected

---

## Proposed Improvements

### 1. Increase List Height and Use ScrollArea Component
- Change from `max-h-40` to `max-h-80` (320px) for more visibility
- Use `ScrollArea` component for better scrolling experience

### 2. Add Search/Filter Box
- Real-time search filtering by item number or description
- Quick keyboard navigation

### 3. Add "Select All" / "Deselect All" Controls
- Quick toggle buttons for bulk selection
- Show selected count indicator

### 4. Improve Item Display
- Show full description with proper text wrapping
- Better visual distinction between selected and unselected items
- Hover state for better UX
- Group items by category if available

### 5. Add Selection Summary
- Display count of selected items and their total value
- Visual badge showing selection state

---

## Technical Changes

### File: `src/components/tender/TenderSubcontractorsTab.tsx`

#### Add Search State
```typescript
const [itemSearchTerm, setItemSearchTerm] = useState("");
```

#### Add Filtered Items Logic
```typescript
const filteredProjectItems = useMemo(() => {
  if (!itemSearchTerm.trim()) return projectItems;
  const term = itemSearchTerm.toLowerCase();
  return projectItems.filter(item => 
    item.itemNumber.toLowerCase().includes(term) ||
    item.description.toLowerCase().includes(term)
  );
}, [projectItems, itemSearchTerm]);
```

#### Add Helper Functions
```typescript
const handleSelectAll = () => {
  setFormData({ 
    ...formData, 
    linkedItems: projectItems.map(i => i.itemNumber) 
  });
};

const handleDeselectAll = () => {
  setFormData({ ...formData, linkedItems: [] });
};

const selectedItemsTotal = (formData.linkedItems || []).reduce((sum, itemNo) => {
  const item = projectItems.find(i => i.itemNumber === itemNo);
  return sum + (item?.totalPrice || 0);
}, 0);
```

#### Update Linked BOQ Items Section (Lines 375-397)
```typescript
{/* Linked BOQ Items */}
{projectItems.length > 0 && (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Label>{isRTL ? "البنود المرتبطة" : "Linked BOQ Items"}</Label>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {(formData.linkedItems || []).length} / {projectItems.length}
        </Badge>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={handleSelectAll}
        >
          {isRTL ? "تحديد الكل" : "Select All"}
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm"
          onClick={handleDeselectAll}
        >
          {isRTL ? "إلغاء الكل" : "Clear"}
        </Button>
      </div>
    </div>
    
    {/* Search Box */}
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={isRTL ? "بحث في البنود..." : "Search items..."}
        value={itemSearchTerm}
        onChange={(e) => setItemSearchTerm(e.target.value)}
        className="pl-9"
      />
    </div>
    
    {/* Selected Total */}
    {(formData.linkedItems || []).length > 0 && (
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
        {isRTL ? "إجمالي البنود المحددة:" : "Selected Items Total:"}{" "}
        <span className="font-semibold text-foreground">
          {formatCurrency(selectedItemsTotal)} {currency}
        </span>
      </div>
    )}
    
    {/* Items List */}
    <ScrollArea className="h-72 border rounded-lg">
      <div className="p-2 space-y-1">
        {filteredProjectItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isRTL ? "لا توجد بنود مطابقة" : "No matching items"}
          </div>
        ) : (
          filteredProjectItems.map((item) => {
            const isSelected = (formData.linkedItems || []).includes(item.itemNumber);
            return (
              <div 
                key={item.itemNumber} 
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                  isSelected 
                    ? "bg-primary/10 border border-primary/30" 
                    : "hover:bg-muted/50"
                )}
                onClick={() => handleItemToggle(item.itemNumber, !isSelected)}
              >
                <Checkbox
                  id={item.itemNumber}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleItemToggle(item.itemNumber, checked as boolean)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {item.itemNumber}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {item.description}
                  </p>
                </div>
                <div className="text-sm font-medium whitespace-nowrap">
                  {formatCurrency(item.totalPrice)} {currency}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  </div>
)}
```

#### Add Required Imports
```typescript
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/components/tender/TenderSubcontractorsTab.tsx` | Add search, select all, better layout, ScrollArea |

---

## Expected Results

### Before
- Fixed 160px height list
- No search capability
- Manual item-by-item selection
- Truncated descriptions
- No selection summary

### After
- 288px scrollable area with smooth scrolling
- Real-time search filtering
- Select All / Clear buttons for bulk operations
- Full descriptions with line-clamp-2
- Selection count badge
- Selected items total value display
- Better visual distinction for selected items
- Clickable row for easier selection

---

## Testing Steps

1. Navigate to Tender Summary page
2. Go to Subcontractors tab
3. Click "Add Subcontractor" button
4. Scroll to "Linked BOQ Items" section
5. Verify:
   - Search box filters items correctly
   - "Select All" selects all items
   - "Clear" deselects all items
   - Selected count badge updates
   - Total value of selected items displays
   - Clicking row toggles selection
   - List scrolls smoothly
6. Save and verify linked items persist

