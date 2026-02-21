export interface ProjectData {
  id: string;
  name: string;
  file_name: string | null;
  analysis_data: any;
  wbs_data: any;
  total_value: number | null;
  items_count: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  item_number: string;
  description: string | null;
  description_ar: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  category: string | null;
  subcategory: string | null;
  specifications: string | null;
  is_section: boolean | null;
  sort_order: number | null;
}

export interface ProjectAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
  category: string | null;
}

export interface EditFormData {
  name: string;
  currency: string;
  description: string;
  project_type: string;
  location: string;
  region: string;
  city: string;
  client_name: string;
  status: string;
}

export interface PricingStats {
  totalItems: number;
  pricedItems: number;
  confirmedItems: number;
  unpricedItems: number;
  pricingPercentage: number;
  totalValue: number;
}

export const statusConfig = {
  draft: { 
    label: { ar: "مسودة", en: "Draft" }, 
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20" 
  },
  in_progress: { 
    label: { ar: "قيد التنفيذ", en: "In Progress" }, 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20" 
  },
  completed: { 
    label: { ar: "مكتمل", en: "Completed" }, 
    color: "bg-green-500/10 text-green-600 border-green-500/20" 
  },
  suspended: { 
    label: { ar: "معلق", en: "Suspended" }, 
    color: "bg-red-500/10 text-red-600 border-red-500/20" 
  },
};

export const currencies = [
  { value: "SAR", label: "ريال سعودي / SAR" },
  { value: "USD", label: "دولار أمريكي / USD" },
  { value: "EUR", label: "يورو / EUR" },
  { value: "AED", label: "درهم إماراتي / AED" },
  { value: "KWD", label: "دينار كويتي / KWD" },
  { value: "QAR", label: "ريال قطري / QAR" },
  { value: "BHD", label: "دينار بحريني / BHD" },
  { value: "OMR", label: "ريال عماني / OMR" },
  { value: "EGP", label: "جنيه مصري / EGP" },
];

export const projectTypes = [
  { value: "construction", label: { ar: "بناء", en: "Construction" } },
  { value: "infrastructure", label: { ar: "بنية تحتية", en: "Infrastructure" } },
  { value: "renovation", label: { ar: "تجديد", en: "Renovation" } },
  { value: "maintenance", label: { ar: "صيانة", en: "Maintenance" } },
  { value: "other", label: { ar: "أخرى", en: "Other" } },
];

export const regions = [
  { value: "SA", label: { ar: "المملكة العربية السعودية", en: "Saudi Arabia" } },
  { value: "AE", label: { ar: "الإمارات العربية المتحدة", en: "UAE" } },
  { value: "EG", label: { ar: "مصر", en: "Egypt" } },
  { value: "KW", label: { ar: "الكويت", en: "Kuwait" } },
  { value: "QA", label: { ar: "قطر", en: "Qatar" } },
  { value: "BH", label: { ar: "البحرين", en: "Bahrain" } },
  { value: "OM", label: { ar: "عمان", en: "Oman" } },
  { value: "JO", label: { ar: "الأردن", en: "Jordan" } },
  { value: "IQ", label: { ar: "العراق", en: "Iraq" } },
  { value: "LB", label: { ar: "لبنان", en: "Lebanon" } },
  { value: "SY", label: { ar: "سوريا", en: "Syria" } },
  { value: "YE", label: { ar: "اليمن", en: "Yemen" } },
  { value: "LY", label: { ar: "ليبيا", en: "Libya" } },
  { value: "TN", label: { ar: "تونس", en: "Tunisia" } },
  { value: "DZ", label: { ar: "الجزائر", en: "Algeria" } },
  { value: "MA", label: { ar: "المغرب", en: "Morocco" } },
  { value: "SD", label: { ar: "السودان", en: "Sudan" } },
  { value: "PS", label: { ar: "فلسطين", en: "Palestine" } },
  { value: "TR", label: { ar: "تركيا", en: "Turkey" } },
  { value: "PK", label: { ar: "باكستان", en: "Pakistan" } },
  { value: "IN", label: { ar: "الهند", en: "India" } },
  { value: "GB", label: { ar: "المملكة المتحدة", en: "United Kingdom" } },
  { value: "US", label: { ar: "الولايات المتحدة", en: "United States" } },
];

export const citiesByRegion: Record<string, Array<{ value: string; label: { ar: string; en: string } }>> = {
  SA: [
    { value: "riyadh", label: { ar: "الرياض", en: "Riyadh" } },
    { value: "jeddah", label: { ar: "جدة", en: "Jeddah" } },
    { value: "dammam", label: { ar: "الدمام", en: "Dammam" } },
    { value: "makkah", label: { ar: "مكة المكرمة", en: "Makkah" } },
    { value: "madinah", label: { ar: "المدينة المنورة", en: "Madinah" } },
    { value: "khobar", label: { ar: "الخبر", en: "Khobar" } },
    { value: "tabuk", label: { ar: "تبوك", en: "Tabuk" } },
    { value: "abha", label: { ar: "أبها", en: "Abha" } },
    { value: "neom", label: { ar: "نيوم", en: "NEOM" } },
    { value: "hail", label: { ar: "حائل", en: "Hail" } },
    { value: "jizan", label: { ar: "جازان", en: "Jizan" } },
    { value: "najran", label: { ar: "نجران", en: "Najran" } },
    { value: "alahsa", label: { ar: "الأحساء", en: "Al Ahsa" } },
    { value: "taif", label: { ar: "الطائف", en: "Taif" } },
    { value: "yanbu", label: { ar: "ينبع", en: "Yanbu" } },
    { value: "jubail", label: { ar: "الجبيل", en: "Jubail" } },
    { value: "buraydah", label: { ar: "بريدة", en: "Buraydah" } },
    { value: "khamis_mushait", label: { ar: "خميس مشيط", en: "Khamis Mushait" } },
    { value: "al_kharj", label: { ar: "الخرج", en: "Al Kharj" } },
  ],
  AE: [
    { value: "dubai", label: { ar: "دبي", en: "Dubai" } },
    { value: "abu_dhabi", label: { ar: "أبوظبي", en: "Abu Dhabi" } },
    { value: "sharjah", label: { ar: "الشارقة", en: "Sharjah" } },
    { value: "ajman", label: { ar: "عجمان", en: "Ajman" } },
    { value: "ras_al_khaimah", label: { ar: "رأس الخيمة", en: "Ras Al Khaimah" } },
    { value: "fujairah", label: { ar: "الفجيرة", en: "Fujairah" } },
    { value: "umm_al_quwain", label: { ar: "أم القيوين", en: "Umm Al Quwain" } },
  ],
  EG: [
    { value: "cairo", label: { ar: "القاهرة", en: "Cairo" } },
    { value: "alexandria", label: { ar: "الإسكندرية", en: "Alexandria" } },
    { value: "giza", label: { ar: "الجيزة", en: "Giza" } },
    { value: "new_capital", label: { ar: "العاصمة الإدارية", en: "New Capital" } },
    { value: "sharm_el_sheikh", label: { ar: "شرم الشيخ", en: "Sharm El Sheikh" } },
    { value: "hurghada", label: { ar: "الغردقة", en: "Hurghada" } },
    { value: "luxor", label: { ar: "الأقصر", en: "Luxor" } },
    { value: "aswan", label: { ar: "أسوان", en: "Aswan" } },
    { value: "mansoura", label: { ar: "المنصورة", en: "Mansoura" } },
    { value: "tanta", label: { ar: "طنطا", en: "Tanta" } },
  ],
  KW: [
    { value: "kuwait_city", label: { ar: "مدينة الكويت", en: "Kuwait City" } },
    { value: "hawalli", label: { ar: "حولي", en: "Hawalli" } },
    { value: "salmiya", label: { ar: "السالمية", en: "Salmiya" } },
    { value: "jahra", label: { ar: "الجهراء", en: "Jahra" } },
  ],
  QA: [
    { value: "doha", label: { ar: "الدوحة", en: "Doha" } },
    { value: "lusail", label: { ar: "لوسيل", en: "Lusail" } },
    { value: "al_wakrah", label: { ar: "الوكرة", en: "Al Wakrah" } },
  ],
  BH: [
    { value: "manama", label: { ar: "المنامة", en: "Manama" } },
    { value: "muharraq", label: { ar: "المحرق", en: "Muharraq" } },
    { value: "riffa", label: { ar: "الرفاع", en: "Riffa" } },
  ],
  OM: [
    { value: "muscat", label: { ar: "مسقط", en: "Muscat" } },
    { value: "salalah", label: { ar: "صلالة", en: "Salalah" } },
    { value: "sohar", label: { ar: "صحار", en: "Sohar" } },
  ],
  JO: [
    { value: "amman", label: { ar: "عمّان", en: "Amman" } },
    { value: "irbid", label: { ar: "إربد", en: "Irbid" } },
    { value: "aqaba", label: { ar: "العقبة", en: "Aqaba" } },
  ],
  IQ: [
    { value: "baghdad", label: { ar: "بغداد", en: "Baghdad" } },
    { value: "erbil", label: { ar: "أربيل", en: "Erbil" } },
    { value: "basra", label: { ar: "البصرة", en: "Basra" } },
    { value: "sulaymaniyah", label: { ar: "السليمانية", en: "Sulaymaniyah" } },
  ],
  LB: [
    { value: "beirut", label: { ar: "بيروت", en: "Beirut" } },
    { value: "tripoli", label: { ar: "طرابلس", en: "Tripoli" } },
  ],
  SY: [
    { value: "damascus", label: { ar: "دمشق", en: "Damascus" } },
    { value: "aleppo", label: { ar: "حلب", en: "Aleppo" } },
  ],
  YE: [
    { value: "sanaa", label: { ar: "صنعاء", en: "Sanaa" } },
    { value: "aden", label: { ar: "عدن", en: "Aden" } },
  ],
  LY: [
    { value: "tripoli_ly", label: { ar: "طرابلس", en: "Tripoli" } },
    { value: "benghazi", label: { ar: "بنغازي", en: "Benghazi" } },
  ],
  TN: [
    { value: "tunis", label: { ar: "تونس", en: "Tunis" } },
    { value: "sfax", label: { ar: "صفاقس", en: "Sfax" } },
  ],
  DZ: [
    { value: "algiers", label: { ar: "الجزائر العاصمة", en: "Algiers" } },
    { value: "oran", label: { ar: "وهران", en: "Oran" } },
    { value: "constantine", label: { ar: "قسنطينة", en: "Constantine" } },
  ],
  MA: [
    { value: "casablanca", label: { ar: "الدار البيضاء", en: "Casablanca" } },
    { value: "rabat", label: { ar: "الرباط", en: "Rabat" } },
    { value: "marrakech", label: { ar: "مراكش", en: "Marrakech" } },
    { value: "tangier", label: { ar: "طنجة", en: "Tangier" } },
  ],
  SD: [
    { value: "khartoum", label: { ar: "الخرطوم", en: "Khartoum" } },
    { value: "omdurman", label: { ar: "أم درمان", en: "Omdurman" } },
  ],
  PS: [
    { value: "ramallah", label: { ar: "رام الله", en: "Ramallah" } },
    { value: "gaza", label: { ar: "غزة", en: "Gaza" } },
  ],
  TR: [
    { value: "istanbul", label: { ar: "إسطنبول", en: "Istanbul" } },
    { value: "ankara", label: { ar: "أنقرة", en: "Ankara" } },
    { value: "izmir", label: { ar: "إزمير", en: "Izmir" } },
    { value: "antalya", label: { ar: "أنطاليا", en: "Antalya" } },
  ],
  PK: [
    { value: "karachi", label: { ar: "كراتشي", en: "Karachi" } },
    { value: "lahore", label: { ar: "لاهور", en: "Lahore" } },
    { value: "islamabad", label: { ar: "إسلام آباد", en: "Islamabad" } },
  ],
  IN: [
    { value: "mumbai", label: { ar: "مومباي", en: "Mumbai" } },
    { value: "delhi", label: { ar: "دلهي", en: "Delhi" } },
    { value: "bangalore", label: { ar: "بنغالور", en: "Bangalore" } },
    { value: "hyderabad", label: { ar: "حيدر آباد", en: "Hyderabad" } },
  ],
  GB: [
    { value: "london", label: { ar: "لندن", en: "London" } },
    { value: "manchester", label: { ar: "مانشستر", en: "Manchester" } },
    { value: "birmingham", label: { ar: "برمنغهام", en: "Birmingham" } },
  ],
  US: [
    { value: "new_york", label: { ar: "نيويورك", en: "New York" } },
    { value: "los_angeles", label: { ar: "لوس أنجلوس", en: "Los Angeles" } },
    { value: "houston", label: { ar: "هيوستن", en: "Houston" } },
    { value: "chicago", label: { ar: "شيكاغو", en: "Chicago" } },
  ],
};

export const CHART_COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];
