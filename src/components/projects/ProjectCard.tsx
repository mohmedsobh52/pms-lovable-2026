import { memo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderOpen, Trash2, Loader2, Calendar, FileText,
  Eye, Edit, DollarSign, Package, Download,
  AlertTriangle, Check, Pencil, Copy, Star, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ProjectData, formatLargeNumber, getSafeProjectTotal } from "@/lib/project-utils";

interface ProjectCardProps {
  project: ProjectData;
  index: number;
  isArabic: boolean;
  isSelected: boolean;
  isFavorite: boolean;
  isCloning: boolean;
  editingProjectId: string | null;
  editingName: string;
  isSavingEdit: boolean;
  pricingPct: number;
  pricedCount: number;
  totalCount: number;
  onToggleSelection: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onStartEdit: (project: ProjectData) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onEditingNameChange: (name: string) => void;
  onViewDetails: (project: ProjectData) => void;
  onExportExcel: (project: ProjectData) => void;
  onClone: (project: ProjectData) => void;
  onDelete: (id: string) => void;
  onLoad: (project: ProjectData) => void;
}

export const ProjectCard = memo(function ProjectCard({
  project, index, isArabic, isSelected, isFavorite: isFav, isCloning,
  editingProjectId, editingName, isSavingEdit, pricingPct, pricedCount, totalCount,
  onToggleSelection, onToggleFavorite, onStartEdit, onCancelEdit, onSaveEdit,
  onEditingNameChange, onViewDetails, onExportExcel, onClone, onDelete, onLoad,
}: ProjectCardProps) {
  const editInputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingProjectId === project.id;

  return (
    <div
      className={cn(
        "glass-card overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group relative",
        isSelected && "border-primary/40 bg-primary/5"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Color-coded top bar */}
      <div className={cn(
        "h-1 w-full",
        pricingPct === 100 ? "bg-green-500" : pricingPct >= 30 ? "bg-primary" : pricingPct > 0 ? "bg-orange-400" : "bg-muted-foreground/20"
      )} />

      <div className="p-5">
        {/* Selection Checkbox */}
        <div className="absolute top-4 left-3 z-10 flex items-center gap-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(project.id)}
          />
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(project.id); }}
            className="p-0.5 rounded hover:bg-muted transition-colors"
          >
            <Star className={cn("w-4 h-4 transition-all", isFav ? "fill-yellow-400 text-yellow-400 scale-110" : "text-muted-foreground")} />
          </button>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4 pl-7">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  ref={editInputRef}
                  value={editingName}
                  onChange={(e) => onEditingNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveEdit(project.id);
                    if (e.key === 'Escape') onCancelEdit();
                  }}
                  className="h-8 text-sm"
                  disabled={isSavingEdit}
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-green-600" onClick={() => onSaveEdit(project.id)} disabled={isSavingEdit}>
                  {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onCancelEdit} disabled={isSavingEdit}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group/name">
                <h3 className="font-display font-semibold truncate group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <button
                  onClick={() => onStartEdit(project)}
                  className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            )}
            {project.file_name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                <FileText className="w-3 h-3 shrink-0" />
                {project.file_name}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 mb-1">
              <Package className="w-3 h-3" />
              {isArabic ? "البنود" : "Items"}
            </div>
            <p className="font-semibold">{project.items_count || 0}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-1">
              <DollarSign className="w-3 h-3" />
              {isArabic ? "القيمة" : "Value"}
            </div>
            <p className="font-semibold text-primary text-sm">
              {formatLargeNumber(getSafeProjectTotal(project), project.currency || 'SAR')}
            </p>
            {(project.total_value || 0) > 1e10 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] mt-1">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {isArabic ? "تم التصحيح" : "Corrected"}
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Progress Bar */}
        {totalCount > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground">
              <span>{isArabic ? "التسعير" : "Pricing"}</span>
              <span className={cn(
                "font-semibold",
                pricingPct === 100 ? "text-green-600" : pricingPct > 50 ? "text-primary" : "text-orange-500"
              )}>
                {pricedCount}/{totalCount} ({pricingPct}%)
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  pricingPct === 100 ? "bg-green-500" : pricingPct > 50 ? "bg-primary" : "bg-orange-400"
                )}
                style={{ width: `${pricingPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Date */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <Calendar className="w-3 h-3" />
          {new Date(project.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={() => onLoad(project)} className="flex-1 gap-2">
            <Edit className="w-4 h-4" />
            {isArabic ? "تحميل" : "Load"}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => onViewDetails(project)}>
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isArabic ? "عرض التفاصيل" : "View Details"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => onExportExcel(project)}>
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isArabic ? "تصدير Excel" : "Export Excel"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => onClone(project)} disabled={isCloning}>
                {isCloning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isArabic ? "نسخ المشروع" : "Clone Project"}</TooltipContent>
          </Tooltip>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir={isArabic ? 'rtl' : 'ltr'}>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isArabic ? "نقل إلى سلة المحذوفات" : "Move to Recycle Bin"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isArabic
                    ? `سيتم نقل "${project.name}" إلى سلة المحذوفات. يمكنك استعادته خلال 30 يوم.`
                    : `"${project.name}" will be moved to the recycle bin. You can restore it within 30 days.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(project.id)} className="bg-destructive text-destructive-foreground">
                  {isArabic ? "نقل للمحذوفات" : "Move to Bin"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
});
