export const PROJECT_STATUSES = [
  { 
    value: "draft", 
    label: "مسودة", 
    label_en: "Draft", 
    color: "bg-gray-100 dark:bg-gray-800", 
    textColor: "text-gray-600 dark:text-gray-400",
    dotColor: "bg-gray-500"
  },
  { 
    value: "in_progress", 
    label: "قيد التنفيذ", 
    label_en: "In Progress", 
    color: "bg-blue-100 dark:bg-blue-900/30", 
    textColor: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500"
  },
  { 
    value: "completed", 
    label: "مكتمل", 
    label_en: "Completed", 
    color: "bg-green-100 dark:bg-green-900/30", 
    textColor: "text-green-600 dark:text-green-400",
    dotColor: "bg-green-500"
  },
  { 
    value: "suspended", 
    label: "معلق", 
    label_en: "Suspended", 
    color: "bg-yellow-100 dark:bg-yellow-900/30", 
    textColor: "text-yellow-600 dark:text-yellow-400",
    dotColor: "bg-yellow-500"
  },
] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number]["value"];

export const getStatusInfo = (status: string | undefined | null) => {
  return PROJECT_STATUSES.find(s => s.value === (status || "draft")) || PROJECT_STATUSES[0];
};

export const getStatusLabel = (status: string | undefined | null, isArabic: boolean = true) => {
  const info = getStatusInfo(status);
  return isArabic ? info.label : info.label_en;
};
