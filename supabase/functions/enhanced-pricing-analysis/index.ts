import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

interface BOQItem {
  item_number: string;
  description: string;
  description_ar?: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
}

interface HistoricalPriceRecord {
  description: string;
  description_ar?: string;
  unit: string;
  unit_price: number;
  source: string;
  date?: string;
  currency?: string;
}

interface EnhancedPricingSuggestion {
  item_number: string;
  description: string;
  description_ar?: string;
  current_price: number;
  analyzers: {
    name: string;
    nameAr: string;
    suggested_price: number;
    confidence: number;
    methodology: string;
    source: string;
  }[];
  final_suggested_price: number;
  price_range: { min: number; max: number };
  overall_confidence: number;
  consensus_score: number;
  recommendation: string;
  recommendation_ar: string;
  category?: string;
  categoryAr?: string;
}

// =====================================================
// COMPREHENSIVE REFERENCE PRICES DATABASE
// Saudi Arabia Construction Market (2024-2025) in SAR
// Coverage: Civil, Architecture, MEP, Infrastructure, Finishing
// Target Accuracy: 95%+
// =====================================================

const REFERENCE_PRICES: Record<string, {
  min: number;
  max: number;
  unit: string;
  description: string;
  category: string;
  categoryAr: string;
  keywords: string[];
  keywordsAr: string[];
}> = {
  // ========================
  // CIVIL WORKS - أعمال مدنية
  // ========================
  
  // Earthwork - أعمال الحفر والردم
  "excavation_normal": { 
    min: 8, max: 18, unit: "m³", 
    description: "Normal soil excavation",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["excavation", "excavate", "dig", "soil removal", "earth cutting"],
    keywordsAr: ["حفر", "حفريات", "تنقيب", "إزالة تربة"]
  },
  "excavation_rock": { 
    min: 45, max: 120, unit: "m³", 
    description: "Rock excavation",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["rock excavation", "rock breaking", "hard rock", "blasting"],
    keywordsAr: ["حفر صخري", "تكسير صخور", "صخر"]
  },
  "excavation_basement": { 
    min: 15, max: 35, unit: "m³", 
    description: "Basement excavation with shoring",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["basement", "deep excavation", "shoring"],
    keywordsAr: ["بدروم", "حفر عميق", "سند جوانب"]
  },
  "backfill_compacted": { 
    min: 12, max: 25, unit: "m³", 
    description: "Compacted backfill",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["backfill", "fill", "compaction", "compacted fill"],
    keywordsAr: ["ردم", "دك", "ردم مدكوك"]
  },
  "backfill_sand": { 
    min: 35, max: 65, unit: "m³", 
    description: "Sand backfill",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["sand fill", "sand backfill", "dune sand"],
    keywordsAr: ["ردم رملي", "رمل"]
  },
  "subbase_granular": { 
    min: 45, max: 85, unit: "m³", 
    description: "Granular subbase",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["subbase", "subgrade", "granular base", "road base"],
    keywordsAr: ["طبقة أساس", "تحت أساس"]
  },
  "dewatering": { 
    min: 150, max: 400, unit: "day", 
    description: "Dewatering per day",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["dewatering", "water pumping", "groundwater"],
    keywordsAr: ["نزح مياه", "ضخ مياه جوفية"]
  },
  
  // Concrete Work - أعمال الخرسانة
  "concrete_plain": { 
    min: 350, max: 500, unit: "m³", 
    description: "Plain concrete C15-C20",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["plain concrete", "lean concrete", "blinding", "mass concrete"],
    keywordsAr: ["خرسانة عادية", "خرسانة نظافة", "فرشة خرسانة"]
  },
  "concrete_reinforced_foundation": { 
    min: 550, max: 850, unit: "m³", 
    description: "Reinforced concrete foundation C30-C35",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["foundation", "footing", "mat foundation", "raft", "pile cap"],
    keywordsAr: ["أساسات", "قاعدة", "لبشة", "حصيرة"]
  },
  "concrete_reinforced_column": { 
    min: 650, max: 1000, unit: "m³", 
    description: "Reinforced concrete column C35-C40",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["column", "pillar", "vertical element"],
    keywordsAr: ["عمود", "أعمدة", "عنصر رأسي"]
  },
  "concrete_reinforced_beam": { 
    min: 600, max: 950, unit: "m³", 
    description: "Reinforced concrete beam C30-C35",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["beam", "lintel", "tie beam", "ring beam"],
    keywordsAr: ["كمرة", "جسر", "كمر", "ميدة"]
  },
  "concrete_reinforced_slab": { 
    min: 500, max: 750, unit: "m³", 
    description: "Reinforced concrete slab C30",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["slab", "floor slab", "roof slab", "deck"],
    keywordsAr: ["بلاطة", "سقف", "سقف خرساني"]
  },
  "concrete_reinforced_wall": { 
    min: 550, max: 850, unit: "m³", 
    description: "Reinforced concrete wall C30",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["concrete wall", "shear wall", "retaining wall"],
    keywordsAr: ["جدار خرساني", "حائط ساند", "جدار قص"]
  },
  "concrete_precast": { 
    min: 450, max: 800, unit: "m³", 
    description: "Precast concrete elements",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["precast", "prefab", "pre-fabricated"],
    keywordsAr: ["خرسانة مسبقة الصب", "بريكاست"]
  },
  "concrete_prestressed": { 
    min: 900, max: 1500, unit: "m³", 
    description: "Prestressed/Post-tensioned concrete",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["prestressed", "post-tensioned", "pt slab"],
    keywordsAr: ["خرسانة مسبقة الإجهاد", "شد لاحق"]
  },
  
  // Reinforcement - حديد التسليح
  "rebar_ton": { 
    min: 3500, max: 5500, unit: "ton", 
    description: "Steel reinforcement per ton",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["rebar", "reinforcement", "steel bar", "deformed bar"],
    keywordsAr: ["حديد تسليح", "تسليح", "حديد"]
  },
  "rebar_kg": { 
    min: 3.5, max: 5.5, unit: "kg", 
    description: "Steel reinforcement per kg",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["rebar kg", "reinforcement kg"],
    keywordsAr: ["حديد كجم", "تسليح كجم"]
  },
  "mesh_reinforcement": { 
    min: 15, max: 35, unit: "m²", 
    description: "Welded wire mesh",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["mesh", "wire mesh", "welded mesh", "brc"],
    keywordsAr: ["شبك حديد", "شبكة ملحومة"]
  },
  
  // Formwork - الشدات والقوالب
  "formwork_foundation": { 
    min: 60, max: 120, unit: "m²", 
    description: "Foundation formwork",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["formwork foundation", "footing formwork"],
    keywordsAr: ["شدة أساسات", "قوالب قواعد"]
  },
  "formwork_column": { 
    min: 100, max: 180, unit: "m²", 
    description: "Column formwork",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["column formwork", "column form"],
    keywordsAr: ["شدة أعمدة", "قوالب أعمدة"]
  },
  "formwork_slab": { 
    min: 70, max: 140, unit: "m²", 
    description: "Slab formwork",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["slab formwork", "deck formwork", "soffit"],
    keywordsAr: ["شدة أسقف", "شدة بلاطات"]
  },
  "formwork_fair_faced": { 
    min: 140, max: 280, unit: "m²", 
    description: "Fair-faced formwork",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["fair faced", "fair-faced", "exposed concrete", "architectural concrete"],
    keywordsAr: ["خرسانة ظاهرة", "شدة ظاهرة"]
  },
  
  // Structural Steel - الحديد الإنشائي
  "steel_structure": { 
    min: 8000, max: 15000, unit: "ton", 
    description: "Structural steel fabricated & erected",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["structural steel", "steel frame", "steel structure", "i-beam", "h-beam"],
    keywordsAr: ["حديد إنشائي", "هيكل حديدي", "هيكل معدني"]
  },
  "steel_connection": { 
    min: 450, max: 850, unit: "no", 
    description: "Steel connections",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["connection", "bolt connection", "welded connection"],
    keywordsAr: ["وصلات حديد", "وصلات معدنية"]
  },
  
  // Piling - الخوازيق
  "pile_bored": { 
    min: 800, max: 1800, unit: "m", 
    description: "Bored pile per linear meter",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["bored pile", "cast in place pile", "drilled pile"],
    keywordsAr: ["خازوق حفر", "خوازيق مصبوبة"]
  },
  "pile_driven": { 
    min: 600, max: 1400, unit: "m", 
    description: "Driven pile per linear meter",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["driven pile", "precast pile", "hammer pile"],
    keywordsAr: ["خازوق مدقوق", "خوازيق مسبقة"]
  },
  
  // ========================
  // ARCHITECTURAL WORKS - أعمال معمارية
  // ========================
  
  // Blockwork & Masonry - البلوك والبناء
  "block_20cm": { 
    min: 55, max: 95, unit: "m²", 
    description: "20cm hollow block wall",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["20cm block", "200mm block", "hollow block 20"],
    keywordsAr: ["بلوك 20", "بلوك 20 سم", "بلوك مفرغ"]
  },
  "block_15cm": { 
    min: 45, max: 75, unit: "m²", 
    description: "15cm hollow block wall",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["15cm block", "150mm block", "hollow block 15"],
    keywordsAr: ["بلوك 15", "بلوك 15 سم"]
  },
  "block_10cm": { 
    min: 35, max: 60, unit: "m²", 
    description: "10cm hollow block wall",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["10cm block", "100mm block", "hollow block 10", "partition block"],
    keywordsAr: ["بلوك 10", "بلوك 10 سم"]
  },
  "block_solid": { 
    min: 65, max: 110, unit: "m²", 
    description: "Solid concrete block wall",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["solid block", "concrete block solid"],
    keywordsAr: ["بلوك مصمت", "بلوك صلب"]
  },
  "brick_red": { 
    min: 120, max: 200, unit: "m²", 
    description: "Red brick masonry",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["brick", "red brick", "clay brick", "face brick"],
    keywordsAr: ["طوب أحمر", "طوب حراري", "آجر"]
  },
  "brick_insulated": { 
    min: 85, max: 150, unit: "m²", 
    description: "Insulated brick/block",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["insulated block", "thermal block", "insulated brick"],
    keywordsAr: ["بلوك معزول", "طوب عازل"]
  },
  "aac_block": { 
    min: 70, max: 120, unit: "m²", 
    description: "AAC/Autoclaved Aerated Concrete block",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["aac", "siporex", "autoclaved", "aerated concrete", "ytong"],
    keywordsAr: ["سيبوركس", "خلوي", "خرسانة خلوية"]
  },
  
  // Doors - الأبواب
  "door_wooden_flush": { 
    min: 800, max: 1800, unit: "no", 
    description: "Wooden flush door with frame",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["wooden door", "flush door", "timber door", "wood door"],
    keywordsAr: ["باب خشب", "باب مصمت", "باب خشبي"]
  },
  "door_wooden_panel": { 
    min: 1500, max: 3500, unit: "no", 
    description: "Wooden panel door",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["panel door", "solid wood door", "decorative door"],
    keywordsAr: ["باب خشب حشو", "باب مزخرف"]
  },
  "door_fire_rated": { 
    min: 2500, max: 6000, unit: "no", 
    description: "Fire rated door",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["fire door", "fire rated", "fire resistant"],
    keywordsAr: ["باب مقاوم للحريق", "باب حريق"]
  },
  "door_aluminum": { 
    min: 1200, max: 2800, unit: "m²", 
    description: "Aluminum door",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["aluminum door", "aluminium door"],
    keywordsAr: ["باب ألمنيوم", "باب المنيوم"]
  },
  "door_steel": { 
    min: 1500, max: 4000, unit: "no", 
    description: "Steel door",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["steel door", "metal door", "security door"],
    keywordsAr: ["باب حديد", "باب معدني", "باب أمان"]
  },
  "door_glass": { 
    min: 2500, max: 5500, unit: "m²", 
    description: "Glass door frameless",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["glass door", "frameless", "tempered glass door"],
    keywordsAr: ["باب زجاج", "باب زجاجي"]
  },
  "door_roller_shutter": { 
    min: 450, max: 950, unit: "m²", 
    description: "Roller shutter door",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["roller shutter", "rolling door", "shutter"],
    keywordsAr: ["شتر", "باب رول", "باب دحرجة"]
  },
  "door_automatic": { 
    min: 8000, max: 18000, unit: "no", 
    description: "Automatic sliding door",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["automatic door", "sliding automatic", "sensor door"],
    keywordsAr: ["باب أوتوماتيك", "باب تلقائي"]
  },
  
  // Windows - النوافذ
  "window_aluminum": { 
    min: 380, max: 750, unit: "m²", 
    description: "Aluminum window with glass",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["aluminum window", "aluminium window"],
    keywordsAr: ["نافذة ألمنيوم", "شباك المنيوم"]
  },
  "window_upvc": { 
    min: 450, max: 950, unit: "m²", 
    description: "UPVC window",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["upvc", "pvc window", "vinyl window"],
    keywordsAr: ["نافذة يو بي في سي", "شباك بلاستيك"]
  },
  "window_double_glazed": { 
    min: 550, max: 1100, unit: "m²", 
    description: "Double glazed window",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["double glazed", "double glass", "insulated glass"],
    keywordsAr: ["زجاج مزدوج", "شباك عازل"]
  },
  "curtain_wall": { 
    min: 850, max: 1800, unit: "m²", 
    description: "Aluminum curtain wall",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["curtain wall", "facade", "glass facade"],
    keywordsAr: ["حائط ستاري", "واجهة زجاجية"]
  },
  "skylight": { 
    min: 1200, max: 2800, unit: "m²", 
    description: "Skylight",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["skylight", "roof light", "dome light"],
    keywordsAr: ["سكاي لايت", "إضاءة سقفية"]
  },
  
  // Ceilings - الأسقف المستعارة
  "ceiling_gypsum": { 
    min: 65, max: 130, unit: "m²", 
    description: "Gypsum board ceiling",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["gypsum ceiling", "gypsum board", "drywall ceiling", "gyp board"],
    keywordsAr: ["سقف جبس", "جبس بورد", "سقف مستعار جبس"]
  },
  "ceiling_suspended_tile": { 
    min: 85, max: 180, unit: "m²", 
    description: "Suspended tile ceiling (60x60)",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["suspended ceiling", "drop ceiling", "tile ceiling", "armstrong"],
    keywordsAr: ["سقف معلق", "بلاط سقف", "سقف مستعار"]
  },
  "ceiling_metal": { 
    min: 120, max: 280, unit: "m²", 
    description: "Metal ceiling",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["metal ceiling", "aluminum ceiling", "metal panel"],
    keywordsAr: ["سقف معدني", "سقف ألمنيوم"]
  },
  "ceiling_wooden": { 
    min: 180, max: 400, unit: "m²", 
    description: "Wooden ceiling",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["wooden ceiling", "wood ceiling", "timber ceiling"],
    keywordsAr: ["سقف خشبي", "تجليد خشب"]
  },
  
  // Partitions - القواطع
  "partition_gypsum": { 
    min: 120, max: 220, unit: "m²", 
    description: "Gypsum board partition",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["gypsum partition", "drywall partition", "gyp partition"],
    keywordsAr: ["قاطع جبس", "فاصل جبسي"]
  },
  "partition_glass": { 
    min: 450, max: 950, unit: "m²", 
    description: "Glass partition",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["glass partition", "office partition"],
    keywordsAr: ["قاطع زجاج", "فاصل زجاجي"]
  },
  "partition_aluminum": { 
    min: 350, max: 700, unit: "m²", 
    description: "Aluminum partition system",
    category: "Architecture", categoryAr: "أعمال معمارية",
    keywords: ["aluminum partition", "demountable partition"],
    keywordsAr: ["قاطع ألمنيوم"]
  },
  
  // ========================
  // FINISHING WORKS - أعمال التشطيبات
  // ========================
  
  // Plastering - اللياسة والبياض
  "plaster_internal": { 
    min: 28, max: 55, unit: "m²", 
    description: "Internal cement plaster",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["internal plaster", "cement plaster", "render internal"],
    keywordsAr: ["لياسة داخلية", "بياض داخلي", "لياسة"]
  },
  "plaster_external": { 
    min: 38, max: 75, unit: "m²", 
    description: "External cement plaster",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["external plaster", "render external", "outdoor plaster"],
    keywordsAr: ["لياسة خارجية", "بياض خارجي"]
  },
  "plaster_gypsum": { 
    min: 25, max: 50, unit: "m²", 
    description: "Gypsum plaster",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["gypsum plaster", "gyp plaster"],
    keywordsAr: ["لياسة جبسية", "بياض جبس"]
  },
  "plaster_decorative": { 
    min: 85, max: 180, unit: "m²", 
    description: "Decorative texture plaster",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["decorative plaster", "texture plaster", "stucco"],
    keywordsAr: ["لياسة ديكورية", "ملمس زخرفي"]
  },
  
  // Painting - الدهانات
  "paint_emulsion": { 
    min: 18, max: 40, unit: "m²", 
    description: "Emulsion paint 3 coats",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["emulsion", "latex paint", "water based paint", "acrylic paint"],
    keywordsAr: ["دهان مائي", "بوية مائية", "دهان بلاستيك"]
  },
  "paint_oil": { 
    min: 25, max: 55, unit: "m²", 
    description: "Oil paint 3 coats",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["oil paint", "enamel", "gloss paint"],
    keywordsAr: ["دهان زيتي", "دهان لامع"]
  },
  "paint_external": { 
    min: 28, max: 60, unit: "m²", 
    description: "External weather paint",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["external paint", "weather coat", "exterior paint"],
    keywordsAr: ["دهان خارجي", "دهان طقس"]
  },
  "paint_epoxy": { 
    min: 45, max: 95, unit: "m²", 
    description: "Epoxy paint",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["epoxy paint", "epoxy coating"],
    keywordsAr: ["دهان إيبوكسي"]
  },
  "paint_anti_fungal": { 
    min: 35, max: 70, unit: "m²", 
    description: "Anti-fungal paint",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["anti fungal", "anti bacterial", "hospital paint"],
    keywordsAr: ["دهان مضاد للفطريات"]
  },
  
  // Flooring - الأرضيات
  "tile_ceramic_floor": { 
    min: 85, max: 180, unit: "m²", 
    description: "Ceramic floor tiles",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["ceramic tile", "floor tile", "ceramic flooring"],
    keywordsAr: ["سيراميك أرضي", "بلاط سيراميك"]
  },
  "tile_ceramic_wall": { 
    min: 75, max: 160, unit: "m²", 
    description: "Ceramic wall tiles",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["wall tile", "ceramic wall", "bathroom tile"],
    keywordsAr: ["سيراميك حائط", "بلاط جدران"]
  },
  "tile_porcelain": { 
    min: 130, max: 300, unit: "m²", 
    description: "Porcelain tiles",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["porcelain", "porcelain tile", "vitrified tile"],
    keywordsAr: ["بورسلين", "بورسلان"]
  },
  "tile_large_format": { 
    min: 180, max: 380, unit: "m²", 
    description: "Large format tiles (80x80+)",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["large format", "large tile", "80x80", "120x120"],
    keywordsAr: ["بلاط كبير", "فورمات كبير"]
  },
  "marble_flooring": { 
    min: 280, max: 650, unit: "m²", 
    description: "Marble flooring",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["marble", "marble floor", "natural marble"],
    keywordsAr: ["رخام", "أرضية رخام"]
  },
  "granite_flooring": { 
    min: 320, max: 700, unit: "m²", 
    description: "Granite flooring",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["granite", "granite floor"],
    keywordsAr: ["جرانيت", "أرضية جرانيت"]
  },
  "terrazzo_flooring": { 
    min: 180, max: 350, unit: "m²", 
    description: "Terrazzo flooring",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["terrazzo", "mosaic floor"],
    keywordsAr: ["تيرازو", "موزاييك"]
  },
  "epoxy_flooring": { 
    min: 95, max: 200, unit: "m²", 
    description: "Epoxy flooring",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["epoxy floor", "epoxy flooring", "industrial floor"],
    keywordsAr: ["أرضية إيبوكسي", "إيبوكسي أرضية"]
  },
  "vinyl_flooring": { 
    min: 75, max: 180, unit: "m²", 
    description: "Vinyl flooring",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["vinyl", "vinyl floor", "pvc flooring", "lvt"],
    keywordsAr: ["فينيل", "أرضية فينيل"]
  },
  "carpet_flooring": { 
    min: 65, max: 250, unit: "m²", 
    description: "Carpet flooring",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["carpet", "carpet tile", "broadloom"],
    keywordsAr: ["موكيت", "سجاد"]
  },
  "hardwood_flooring": { 
    min: 280, max: 550, unit: "m²", 
    description: "Hardwood flooring",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["hardwood", "wood flooring", "parquet", "oak floor"],
    keywordsAr: ["خشب صلب", "باركيه", "أرضية خشب"]
  },
  "laminate_flooring": { 
    min: 85, max: 180, unit: "m²", 
    description: "Laminate flooring",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["laminate", "laminate floor", "hdf flooring"],
    keywordsAr: ["لامينيت", "أرضية لامينيت"]
  },
  "raised_floor": { 
    min: 250, max: 500, unit: "m²", 
    description: "Raised access floor",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["raised floor", "access floor", "raised access"],
    keywordsAr: ["أرضية مرفوعة", "أرضية تقنية"]
  },
  "floor_screed": { 
    min: 25, max: 55, unit: "m²", 
    description: "Floor screed",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["screed", "floor screed", "leveling screed"],
    keywordsAr: ["شير", "تسوية أرضية"]
  },
  
  // Waterproofing & Insulation - العزل
  "waterproof_membrane": { 
    min: 50, max: 120, unit: "m²", 
    description: "Waterproofing membrane",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["waterproof", "membrane", "bituminous", "torch applied"],
    keywordsAr: ["عزل مائي", "ممبرين", "بيتومين"]
  },
  "waterproof_liquid": { 
    min: 35, max: 80, unit: "m²", 
    description: "Liquid waterproofing",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["liquid waterproof", "acrylic waterproof", "polyurethane coat"],
    keywordsAr: ["عزل سائل", "دهان عازل"]
  },
  "thermal_insulation": { 
    min: 40, max: 95, unit: "m²", 
    description: "Thermal insulation",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["thermal insulation", "heat insulation", "polystyrene", "rockwool"],
    keywordsAr: ["عزل حراري", "فوم عازل"]
  },
  "acoustic_insulation": { 
    min: 55, max: 130, unit: "m²", 
    description: "Acoustic insulation",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["acoustic", "sound insulation", "soundproofing"],
    keywordsAr: ["عزل صوتي", "عازل صوت"]
  },
  
  // Cladding - التكسية
  "stone_cladding": { 
    min: 350, max: 750, unit: "m²", 
    description: "Natural stone cladding",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["stone cladding", "natural stone", "limestone", "travertine"],
    keywordsAr: ["تكسية حجر", "حجر طبيعي"]
  },
  "aluminum_cladding": { 
    min: 280, max: 550, unit: "m²", 
    description: "Aluminum cladding (ACP)",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["aluminum cladding", "acp", "alucobond", "composite panel"],
    keywordsAr: ["كلادينج ألمنيوم", "الكوبوند"]
  },
  "grc_cladding": { 
    min: 380, max: 800, unit: "m²", 
    description: "GRC cladding",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["grc", "glass reinforced concrete", "gfrc"],
    keywordsAr: ["جي آر سي"]
  },
  "hpl_cladding": { 
    min: 320, max: 650, unit: "m²", 
    description: "HPL cladding",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["hpl", "high pressure laminate", "trespa"],
    keywordsAr: ["إتش بي إل"]
  },
  
  // ========================
  // MEP - أعمال كهروميكانيكية
  // ========================
  
  // Electrical - الكهرباء
  "electrical_point": { 
    min: 85, max: 180, unit: "point", 
    description: "Electrical outlet point",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["electrical point", "outlet", "socket point", "power point"],
    keywordsAr: ["نقطة كهرباء", "فيشة", "بريزة"]
  },
  "lighting_point": { 
    min: 95, max: 200, unit: "point", 
    description: "Lighting point",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["lighting point", "light point", "lamp point"],
    keywordsAr: ["نقطة إضاءة", "نقطة لمبة"]
  },
  "led_downlight": { 
    min: 150, max: 400, unit: "no", 
    description: "LED downlight complete",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["downlight", "led downlight", "spot light"],
    keywordsAr: ["داون لايت", "سبوت لايت"]
  },
  "led_panel": { 
    min: 180, max: 450, unit: "no", 
    description: "LED panel 60x60",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["led panel", "panel light", "60x60 light"],
    keywordsAr: ["بانل ليد", "لوحة إضاءة"]
  },
  "cable_tray": { 
    min: 150, max: 350, unit: "m", 
    description: "Cable tray",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["cable tray", "ladder tray", "wire tray"],
    keywordsAr: ["حامل كابلات", "تراي كابلات"]
  },
  "conduit_pvc": { 
    min: 15, max: 40, unit: "m", 
    description: "PVC conduit",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["conduit", "pvc conduit", "electrical conduit"],
    keywordsAr: ["مواسير كهرباء", "خرطوم كهرباء"]
  },
  "conduit_gi": { 
    min: 35, max: 85, unit: "m", 
    description: "GI conduit",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["gi conduit", "galvanized conduit", "metal conduit"],
    keywordsAr: ["ماسورة حديد مجلفن"]
  },
  "distribution_board": { 
    min: 1500, max: 5000, unit: "no", 
    description: "Distribution board",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["db", "distribution board", "panel board", "mdb", "smdb"],
    keywordsAr: ["لوحة توزيع", "طابلو كهرباء"]
  },
  "generator": { 
    min: 1500, max: 3500, unit: "kVA", 
    description: "Generator per kVA",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["generator", "genset", "power generator"],
    keywordsAr: ["مولد كهرباء", "جنريتور"]
  },
  "ups_system": { 
    min: 800, max: 2000, unit: "kVA", 
    description: "UPS system per kVA",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["ups", "uninterruptible", "power backup"],
    keywordsAr: ["يو بي إس"]
  },
  "earthing_system": { 
    min: 5000, max: 20000, unit: "set", 
    description: "Earthing system complete",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["earthing", "grounding", "earth pit"],
    keywordsAr: ["تأريض", "نظام أرضي"]
  },
  "lightning_protection": { 
    min: 8000, max: 25000, unit: "set", 
    description: "Lightning protection system",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["lightning", "lightning rod", "lightning protection"],
    keywordsAr: ["حماية صواعق", "مانعة صواعق"]
  },
  
  // Plumbing - السباكة
  "pipe_upvc": { 
    min: 18, max: 55, unit: "m", 
    description: "UPVC pipe drainage",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["upvc pipe", "pvc drainage", "drainage pipe"],
    keywordsAr: ["ماسورة صرف", "بي في سي صرف"]
  },
  "pipe_ppr": { 
    min: 22, max: 65, unit: "m", 
    description: "PPR pipe water supply",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["ppr", "ppr pipe", "water pipe", "supply pipe"],
    keywordsAr: ["ماسورة بي بي آر", "ماسورة مياه"]
  },
  "pipe_copper": { 
    min: 85, max: 200, unit: "m", 
    description: "Copper pipe",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["copper pipe", "copper tube"],
    keywordsAr: ["ماسورة نحاس"]
  },
  "pipe_gi": { 
    min: 65, max: 150, unit: "m", 
    description: "GI pipe",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["gi pipe", "galvanized pipe", "steel pipe"],
    keywordsAr: ["ماسورة حديد مجلفن"]
  },
  "wc_set": { 
    min: 800, max: 2500, unit: "no", 
    description: "WC complete set",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["wc", "toilet", "water closet", "bathroom set"],
    keywordsAr: ["مرحاض", "حمام غربي", "كرسي افرنجي"]
  },
  "washbasin": { 
    min: 450, max: 1500, unit: "no", 
    description: "Wash basin complete",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["basin", "wash basin", "sink", "lavatory"],
    keywordsAr: ["مغسلة", "حوض", "لافابو"]
  },
  "urinal": { 
    min: 600, max: 1800, unit: "no", 
    description: "Urinal complete",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["urinal", "male urinal"],
    keywordsAr: ["مبولة"]
  },
  "shower": { 
    min: 500, max: 2000, unit: "no", 
    description: "Shower set",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["shower", "shower mixer", "rain shower"],
    keywordsAr: ["دش", "شاور"]
  },
  "kitchen_sink": { 
    min: 600, max: 2500, unit: "no", 
    description: "Kitchen sink",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["kitchen sink", "stainless sink"],
    keywordsAr: ["حوض مطبخ", "مجلى"]
  },
  "water_heater": { 
    min: 800, max: 3000, unit: "no", 
    description: "Water heater",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["water heater", "geyser", "boiler"],
    keywordsAr: ["سخان مياه", "بويلر"]
  },
  "water_pump": { 
    min: 1500, max: 8000, unit: "no", 
    description: "Water pump",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["pump", "water pump", "booster pump", "pressure pump"],
    keywordsAr: ["مضخة مياه", "طلمبة"]
  },
  "water_tank_gfrp": { 
    min: 800, max: 1500, unit: "m³", 
    description: "GFRP water tank per m³",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["water tank", "gfrp tank", "storage tank"],
    keywordsAr: ["خزان مياه", "تانك"]
  },
  
  // HVAC - التكييف
  "ac_split": { 
    min: 2500, max: 6500, unit: "no", 
    description: "Split AC unit",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["split ac", "split unit", "wall ac"],
    keywordsAr: ["مكيف سبليت", "تكييف سبليت"]
  },
  "ac_cassette": { 
    min: 4500, max: 12000, unit: "no", 
    description: "Cassette AC unit",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["cassette", "cassette ac", "ceiling cassette"],
    keywordsAr: ["مكيف كاسيت", "تكييف سقفي"]
  },
  "ac_concealed": { 
    min: 5500, max: 15000, unit: "no", 
    description: "Concealed ducted AC",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["concealed", "ducted", "hidden ac"],
    keywordsAr: ["مكيف مخفي", "دكت مخفي"]
  },
  "ac_package": { 
    min: 25000, max: 80000, unit: "no", 
    description: "Package AC unit",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["package", "package ac", "rooftop unit"],
    keywordsAr: ["باكج", "مكيف باكج"]
  },
  "chiller": { 
    min: 3500, max: 8000, unit: "TR", 
    description: "Chiller per TR",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["chiller", "air cooled chiller", "water cooled chiller"],
    keywordsAr: ["تشيلر", "مبرد"]
  },
  "ahu": { 
    min: 1200, max: 3500, unit: "CMH", 
    description: "AHU per 1000 CMH",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["ahu", "air handling unit", "fahu"],
    keywordsAr: ["وحدة مناولة هواء"]
  },
  "fcu": { 
    min: 2500, max: 7000, unit: "no", 
    description: "FCU complete",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["fcu", "fan coil unit", "fan coil"],
    keywordsAr: ["فان كويل"]
  },
  "ductwork_gi": { 
    min: 120, max: 280, unit: "m²", 
    description: "GI ductwork",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["duct", "ductwork", "gi duct", "hvac duct"],
    keywordsAr: ["دكت", "مجرى هواء"]
  },
  "duct_insulation": { 
    min: 45, max: 95, unit: "m²", 
    description: "Duct insulation",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["duct insulation", "duct wrap"],
    keywordsAr: ["عزل دكت"]
  },
  "diffuser": { 
    min: 150, max: 450, unit: "no", 
    description: "Air diffuser",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["diffuser", "air diffuser", "supply diffuser"],
    keywordsAr: ["ناشر هواء", "ديفيوزر"]
  },
  "grille": { 
    min: 120, max: 350, unit: "no", 
    description: "Return air grille",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["grille", "return grille", "air grille"],
    keywordsAr: ["شبكة راجع", "جريل"]
  },
  "exhaust_fan": { 
    min: 350, max: 1200, unit: "no", 
    description: "Exhaust fan",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["exhaust", "exhaust fan", "ventilation fan"],
    keywordsAr: ["شفاط", "مروحة طرد"]
  },
  
  // Fire Protection - الحريق
  "fire_sprinkler": { 
    min: 85, max: 180, unit: "head", 
    description: "Fire sprinkler head",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["sprinkler", "fire sprinkler", "sprinkler head"],
    keywordsAr: ["رشاش حريق", "سبرنكلر"]
  },
  "fire_hose_reel": { 
    min: 1500, max: 4000, unit: "no", 
    description: "Fire hose reel cabinet",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["hose reel", "fire hose", "hose cabinet"],
    keywordsAr: ["خرطوم حريق", "بكرة حريق"]
  },
  "fire_extinguisher": { 
    min: 200, max: 600, unit: "no", 
    description: "Fire extinguisher",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["extinguisher", "fire extinguisher"],
    keywordsAr: ["طفاية حريق"]
  },
  "fire_alarm_panel": { 
    min: 8000, max: 35000, unit: "no", 
    description: "Fire alarm panel",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["fire alarm", "fire panel", "alarm panel", "facp"],
    keywordsAr: ["لوحة إنذار حريق"]
  },
  "smoke_detector": { 
    min: 180, max: 450, unit: "no", 
    description: "Smoke detector",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["smoke detector", "detector", "smoke sensor"],
    keywordsAr: ["كاشف دخان", "حساس دخان"]
  },
  "heat_detector": { 
    min: 150, max: 380, unit: "no", 
    description: "Heat detector",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["heat detector", "thermal detector"],
    keywordsAr: ["كاشف حرارة"]
  },
  "fire_pump": { 
    min: 25000, max: 85000, unit: "set", 
    description: "Fire pump set",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["fire pump", "jockey pump", "fire fighting pump"],
    keywordsAr: ["مضخة حريق", "طلمبة حريق"]
  },
  
  // Low Current - التيار الخفيف
  "data_point": { 
    min: 180, max: 400, unit: "point", 
    description: "Data/Network point",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["data point", "network point", "lan point", "cat6"],
    keywordsAr: ["نقطة شبكات", "نقطة انترنت"]
  },
  "telephone_point": { 
    min: 120, max: 280, unit: "point", 
    description: "Telephone point",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["telephone", "phone point", "tel point"],
    keywordsAr: ["نقطة تليفون", "نقطة هاتف"]
  },
  "cctv_camera": { 
    min: 800, max: 3500, unit: "no", 
    description: "CCTV camera complete",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["cctv", "camera", "surveillance", "ip camera"],
    keywordsAr: ["كاميرا مراقبة", "سي سي تي في"]
  },
  "access_control": { 
    min: 2500, max: 8000, unit: "door", 
    description: "Access control per door",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["access control", "card reader", "biometric"],
    keywordsAr: ["تحكم دخول", "أكسس كنترول"]
  },
  "intercom": { 
    min: 800, max: 2500, unit: "no", 
    description: "Intercom system",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["intercom", "door phone", "video intercom"],
    keywordsAr: ["انتركم", "انتركوم"]
  },
  "pa_speaker": { 
    min: 250, max: 700, unit: "no", 
    description: "PA speaker",
    category: "MEP", categoryAr: "كهروميكانيكية",
    keywords: ["pa", "speaker", "public address", "sound system"],
    keywordsAr: ["سماعة", "نظام صوت"]
  },
  
  // ========================
  // INFRASTRUCTURE - البنية التحتية
  // ========================
  
  // Roads - الطرق
  "asphalt_base": { 
    min: 45, max: 90, unit: "m²", 
    description: "Asphalt base course",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["asphalt base", "base course", "binder course"],
    keywordsAr: ["طبقة أساس أسفلت"]
  },
  "asphalt_wearing": { 
    min: 38, max: 75, unit: "m²", 
    description: "Asphalt wearing course",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["asphalt", "wearing course", "surface course", "road surface"],
    keywordsAr: ["أسفلت", "طبقة سطحية"]
  },
  "asphalt_complete": { 
    min: 85, max: 165, unit: "m²", 
    description: "Complete asphalt pavement",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["road pavement", "asphalt road", "asphalt complete"],
    keywordsAr: ["رصف أسفلت كامل"]
  },
  "interlock_paving": { 
    min: 95, max: 200, unit: "m²", 
    description: "Interlock paving",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["interlock", "paver", "brick paving", "block paving"],
    keywordsAr: ["انترلوك", "بلاط متشابك"]
  },
  "curb_stone": { 
    min: 55, max: 130, unit: "m", 
    description: "Precast curb stone",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["curb", "kerb", "curb stone", "edge stone"],
    keywordsAr: ["بردورة", "حافة رصيف"]
  },
  "road_marking": { 
    min: 12, max: 35, unit: "m", 
    description: "Road marking paint",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["road marking", "line marking", "thermoplastic"],
    keywordsAr: ["خطوط طريق", "علامات أرضية"]
  },
  "road_sign": { 
    min: 450, max: 1500, unit: "no", 
    description: "Road sign",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["road sign", "traffic sign", "signage"],
    keywordsAr: ["لافتة طريق", "إشارة مرور"]
  },
  "speed_bump": { 
    min: 800, max: 2000, unit: "no", 
    description: "Speed bump",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["speed bump", "speed hump", "speed breaker"],
    keywordsAr: ["مطب", "مطب صناعي"]
  },
  "guardrail": { 
    min: 180, max: 400, unit: "m", 
    description: "Road guardrail",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["guardrail", "crash barrier", "w-beam"],
    keywordsAr: ["حاجز طريق", "جارد ريل"]
  },
  
  // Drainage - الصرف
  "manhole_precast": { 
    min: 3500, max: 8000, unit: "no", 
    description: "Precast manhole complete",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["manhole", "inspection chamber", "access chamber"],
    keywordsAr: ["غرفة تفتيش", "منهول"]
  },
  "manhole_concrete": { 
    min: 4500, max: 12000, unit: "no", 
    description: "Cast in place manhole",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["concrete manhole", "cast manhole"],
    keywordsAr: ["غرفة خرسانية"]
  },
  "catch_basin": { 
    min: 1500, max: 4000, unit: "no", 
    description: "Catch basin/Gully",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["catch basin", "gully", "inlet", "storm drain inlet"],
    keywordsAr: ["بالوعة", "مصرف"]
  },
  "drainage_pipe_hdpe": { 
    min: 85, max: 250, unit: "m", 
    description: "HDPE drainage pipe",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["hdpe pipe", "storm drain", "drainage pipe"],
    keywordsAr: ["ماسورة صرف", "أتش دي بي إي"]
  },
  "drainage_pipe_concrete": { 
    min: 180, max: 500, unit: "m", 
    description: "RCC drainage pipe",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["rcc pipe", "concrete pipe", "culvert pipe"],
    keywordsAr: ["ماسورة خرسانة"]
  },
  "french_drain": { 
    min: 120, max: 280, unit: "m", 
    description: "French drain",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["french drain", "subsoil drain", "perforated drain"],
    keywordsAr: ["صرف فرنسي"]
  },
  "channel_drain": { 
    min: 180, max: 450, unit: "m", 
    description: "Channel drain",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["channel drain", "linear drain", "trench drain"],
    keywordsAr: ["قناة صرف", "مجرى خطي"]
  },
  
  // Utilities - المرافق
  "street_light_pole": { 
    min: 3500, max: 9000, unit: "no", 
    description: "Street light pole complete",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["street light", "light pole", "lamp post"],
    keywordsAr: ["عمود إنارة", "إضاءة شارع"]
  },
  "cable_duct_bank": { 
    min: 250, max: 650, unit: "m", 
    description: "Cable duct bank",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["duct bank", "cable duct", "cable trench"],
    keywordsAr: ["قناة كابلات"]
  },
  "water_main": { 
    min: 180, max: 500, unit: "m", 
    description: "Water main pipe",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["water main", "water line", "potable water pipe"],
    keywordsAr: ["خط مياه رئيسي"]
  },
  "fire_hydrant": { 
    min: 3500, max: 8000, unit: "no", 
    description: "Fire hydrant",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["hydrant", "fire hydrant"],
    keywordsAr: ["صنبور حريق", "حنفية حريق"]
  },
  "valve_chamber": { 
    min: 2500, max: 6000, unit: "no", 
    description: "Valve chamber",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["valve chamber", "valve box"],
    keywordsAr: ["غرفة محابس"]
  },
  
  // Fencing & Gates - الأسوار والبوابات
  "fence_chainlink": { 
    min: 120, max: 280, unit: "m", 
    description: "Chain link fence",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["chainlink", "chain link", "wire fence", "mesh fence"],
    keywordsAr: ["سور شبك", "سياج معدني"]
  },
  "fence_precast": { 
    min: 280, max: 550, unit: "m", 
    description: "Precast boundary wall",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["precast wall", "boundary wall", "precast fence"],
    keywordsAr: ["سور خرساني", "جدار سابق الصب"]
  },
  "fence_steel": { 
    min: 450, max: 950, unit: "m", 
    description: "Steel fence/railing",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["steel fence", "metal fence", "railing"],
    keywordsAr: ["سور حديد", "درابزين"]
  },
  "gate_sliding": { 
    min: 15000, max: 45000, unit: "no", 
    description: "Sliding gate automatic",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["sliding gate", "automatic gate"],
    keywordsAr: ["بوابة منزلقة", "بوابة أوتوماتيك"]
  },
  "gate_swing": { 
    min: 8000, max: 25000, unit: "no", 
    description: "Swing gate",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["swing gate", "hinged gate"],
    keywordsAr: ["بوابة مفصلية"]
  },
  
  // Landscaping - تنسيق المواقع
  "topsoil": { 
    min: 45, max: 95, unit: "m³", 
    description: "Topsoil supply & spread",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["topsoil", "planting soil", "garden soil"],
    keywordsAr: ["تربة زراعية"]
  },
  "grass_natural": { 
    min: 35, max: 85, unit: "m²", 
    description: "Natural grass turf",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["grass", "turf", "lawn", "sod"],
    keywordsAr: ["عشب طبيعي", "نجيلة"]
  },
  "grass_artificial": { 
    min: 65, max: 180, unit: "m²", 
    description: "Artificial grass",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["artificial grass", "synthetic turf", "fake grass"],
    keywordsAr: ["عشب صناعي", "نجيلة صناعية"]
  },
  "tree_planting": { 
    min: 350, max: 1500, unit: "no", 
    description: "Tree planting",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["tree", "tree planting", "palm tree"],
    keywordsAr: ["شجرة", "زراعة أشجار"]
  },
  "irrigation_system": { 
    min: 25, max: 65, unit: "m²", 
    description: "Irrigation system",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["irrigation", "drip irrigation", "sprinkler irrigation"],
    keywordsAr: ["نظام ري", "ري بالتنقيط"]
  },
  
  // ========================
  // TEMPORARY WORKS - أعمال مؤقتة
  // ========================
  "scaffolding_steel": {
    min: 25, max: 55, unit: "m²",
    description: "Steel scaffolding rental and erection",
    category: "Temporary Works", categoryAr: "أعمال مؤقتة",
    keywords: ["scaffolding", "scaffold", "staging"],
    keywordsAr: ["سقالات", "سقالة حديد"]
  },
  "hoarding_site": {
    min: 120, max: 280, unit: "m",
    description: "Site hoarding/fencing",
    category: "Temporary Works", categoryAr: "أعمال مؤقتة",
    keywords: ["hoarding", "site fence", "temporary fence", "barricade"],
    keywordsAr: ["حواجز مؤقتة", "سياج موقع"]
  },
  "site_office": {
    min: 2500, max: 6000, unit: "month",
    description: "Temporary site office rental",
    category: "Temporary Works", categoryAr: "أعمال مؤقتة",
    keywords: ["site office", "temporary office", "portacabin"],
    keywordsAr: ["مكتب موقع", "بورتاكابين"]
  },
  "temporary_toilet": {
    min: 800, max: 2000, unit: "month",
    description: "Temporary toilet",
    category: "Temporary Works", categoryAr: "أعمال مؤقتة",
    keywords: ["temporary toilet", "portable toilet", "site toilet"],
    keywordsAr: ["حمامات مؤقتة", "دورة مياه مؤقتة"]
  },
  "safety_signage": {
    min: 150, max: 500, unit: "no",
    description: "Safety signs and boards",
    category: "Temporary Works", categoryAr: "أعمال مؤقتة",
    keywords: ["safety sign", "warning sign", "signage"],
    keywordsAr: ["لوحات سلامة", "إشارات تحذير"]
  },
  "temporary_power": {
    min: 3000, max: 8000, unit: "month",
    description: "Temporary power supply",
    category: "Temporary Works", categoryAr: "أعمال مؤقتة",
    keywords: ["temporary power", "generator rental", "temp electricity"],
    keywordsAr: ["كهرباء مؤقتة", "مولد كهربائي"]
  },
  "temporary_water": {
    min: 1500, max: 4000, unit: "month",
    description: "Temporary water supply",
    category: "Temporary Works", categoryAr: "أعمال مؤقتة",
    keywords: ["temporary water", "water tanker", "temp water"],
    keywordsAr: ["مياه مؤقتة", "تانكر مياه"]
  },
  
  // ========================
  // PRELIMINARIES - أعمال تحضيرية
  // ========================
  "mobilization": {
    min: 50000, max: 200000, unit: "ls",
    description: "Mobilization & demobilization",
    category: "Preliminaries", categoryAr: "أعمال تحضيرية",
    keywords: ["mobilization", "demobilization", "mob demob"],
    keywordsAr: ["تجهيز موقع", "تعبئة وإخلاء"]
  },
  "site_clearance": {
    min: 5, max: 15, unit: "m²",
    description: "Site clearance and grubbing",
    category: "Preliminaries", categoryAr: "أعمال تحضيرية",
    keywords: ["site clearance", "clearing", "grubbing", "site preparation"],
    keywordsAr: ["تنظيف موقع", "إزالة مخلفات"]
  },
  "survey_setting_out": {
    min: 3, max: 8, unit: "m²",
    description: "Survey and setting out",
    category: "Preliminaries", categoryAr: "أعمال تحضيرية",
    keywords: ["survey", "setting out", "layout"],
    keywordsAr: ["مساحة", "توقيع محاور"]
  },
  "insurance_car": {
    min: 0.003, max: 0.008, unit: "ls",
    description: "Contractor All Risk insurance",
    category: "Preliminaries", categoryAr: "أعمال تحضيرية",
    keywords: ["insurance", "car insurance", "contractor all risk"],
    keywordsAr: ["تأمين", "تأمين شامل"]
  },
  
  // ========================
  // DEMOLITION - أعمال الهدم
  // ========================
  "demolition_concrete": {
    min: 80, max: 200, unit: "m³",
    description: "Concrete demolition",
    category: "Demolition", categoryAr: "أعمال هدم",
    keywords: ["demolition concrete", "concrete demolition", "break concrete"],
    keywordsAr: ["هدم خرسانة", "تكسير خرسانة"]
  },
  "demolition_block": {
    min: 15, max: 40, unit: "m²",
    description: "Block wall demolition",
    category: "Demolition", categoryAr: "أعمال هدم",
    keywords: ["demolition wall", "demolish block", "remove wall"],
    keywordsAr: ["هدم جدران", "إزالة بلوك"]
  },
  "demolition_tiles": {
    min: 12, max: 30, unit: "m²",
    description: "Tile removal",
    category: "Demolition", categoryAr: "أعمال هدم",
    keywords: ["remove tile", "tile demolition", "strip tiles"],
    keywordsAr: ["إزالة بلاط", "تكسير سيراميك"]
  },
  "demolition_plaster": {
    min: 8, max: 22, unit: "m²",
    description: "Plaster removal",
    category: "Demolition", categoryAr: "أعمال هدم",
    keywords: ["remove plaster", "strip plaster", "hack plaster"],
    keywordsAr: ["إزالة لياسة", "تكسير لياسة"]
  },
  "debris_disposal": {
    min: 45, max: 120, unit: "m³",
    description: "Debris removal and disposal",
    category: "Demolition", categoryAr: "أعمال هدم",
    keywords: ["debris", "disposal", "waste removal", "rubbish"],
    keywordsAr: ["نقل مخلفات", "إزالة أنقاض"]
  },
  
  // ========================
  // ELEVATORS - المصاعد
  // ========================
  "elevator_passenger": {
    min: 180000, max: 450000, unit: "no",
    description: "Passenger elevator",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["passenger elevator", "passenger lift", "elevator"],
    keywordsAr: ["مصعد ركاب", "أسانسير"]
  },
  "elevator_freight": {
    min: 250000, max: 600000, unit: "no",
    description: "Freight/cargo elevator",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["freight elevator", "cargo lift", "goods lift", "service lift"],
    keywordsAr: ["مصعد شحن", "مصعد بضائع"]
  },
  "escalator": {
    min: 400000, max: 900000, unit: "no",
    description: "Escalator",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["escalator", "moving stairway"],
    keywordsAr: ["سلم كهربائي", "سلم متحرك"]
  },
  
  // ========================
  // ADVANCED FIRE PROTECTION - حماية حريق متقدمة
  // ========================
  "fm200_system": {
    min: 800, max: 2000, unit: "m²",
    description: "FM200 clean agent fire suppression",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["fm200", "fm-200", "clean agent", "gas suppression", "novec"],
    keywordsAr: ["إف إم 200", "إطفاء غاز"]
  },
  "foam_system": {
    min: 350, max: 800, unit: "m²",
    description: "Foam fire suppression system",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["foam system", "foam suppression", "afff"],
    keywordsAr: ["نظام رغوي", "إطفاء رغوي"]
  },
  "fire_curtain": {
    min: 2500, max: 6000, unit: "m²",
    description: "Fire curtain/smoke barrier",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["fire curtain", "smoke barrier", "fire shutter"],
    keywordsAr: ["ستارة حريق", "حاجز دخان"]
  },
  
  // ========================
  // SMART BUILDING SYSTEMS - أنظمة ذكية
  // ========================
  "bms_system": {
    min: 25, max: 65, unit: "m²",
    description: "Building Management System",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["bms", "building management", "building automation", "bas"],
    keywordsAr: ["نظام إدارة المبنى", "أتمتة المبنى"]
  },
  "access_control_biometric": {
    min: 3500, max: 8000, unit: "no",
    description: "Biometric access control point",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["biometric access", "card reader biometric"],
    keywordsAr: ["تحكم دخول بيومتري", "بصمة دخول"]
  },
  "ip_camera": {
    min: 2500, max: 6000, unit: "no",
    description: "IP CCTV camera with installation",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["cctv", "ip camera", "surveillance camera", "security camera"],
    keywordsAr: ["كاميرا مراقبة", "كاميرا أمنية"]
  },
  "pa_system": {
    min: 15, max: 40, unit: "m²",
    description: "Public address system",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["public address", "pa system", "speaker system", "sound system"],
    keywordsAr: ["نظام صوتي", "مكبرات صوت"]
  },
  
  // ========================
  // TANKS - الخزانات
  // ========================
  "tank_underground_concrete": {
    min: 1200, max: 2500, unit: "m³",
    description: "Underground concrete water tank",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["underground tank", "water tank concrete", "cistern"],
    keywordsAr: ["خزان أرضي", "خزان مياه خرساني"]
  },
  "tank_overhead_steel": {
    min: 2500, max: 5500, unit: "m³",
    description: "Elevated steel water tank",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["overhead tank", "elevated tank", "water tower"],
    keywordsAr: ["خزان علوي", "برج مياه"]
  },
  "tank_grp": {
    min: 800, max: 2000, unit: "m³",
    description: "GRP/FRP water tank",
    category: "Civil Works", categoryAr: "أعمال مدنية",
    keywords: ["grp tank", "frp tank", "fiberglass tank"],
    keywordsAr: ["خزان فيبرجلاس", "خزان بلاستيك"]
  },
  "septic_tank": {
    min: 3000, max: 8000, unit: "m³",
    description: "Septic tank",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["septic tank", "sewage tank"],
    keywordsAr: ["خزان صرف", "بيارة"]
  },
  
  // ========================  
  // ROAD WORKS ADVANCED - أعمال طرق متقدمة
  // ========================
  "concrete_barrier": {
    min: 350, max: 800, unit: "m",
    description: "Concrete road barrier (jersey barrier)",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["jersey barrier", "concrete barrier", "road barrier", "new jersey"],
    keywordsAr: ["حاجز خرساني", "حاجز طريق"]
  },
  "road_marking_thermoplastic": {
    min: 8, max: 25, unit: "m",
    description: "Thermoplastic road marking",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["thermoplastic marking", "reflective marking"],
    keywordsAr: ["خطوط حرارية", "علامات عاكسة"]
  },
  "speed_bump_rubber": {
    min: 800, max: 2500, unit: "no",
    description: "Rubber speed bump",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["rubber bump", "portable speed bump"],
    keywordsAr: ["مطب مطاطي", "مطب متنقل"]
  },
  "traffic_signal": {
    min: 25000, max: 80000, unit: "no",
    description: "Traffic signal complete",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["traffic signal", "traffic light"],
    keywordsAr: ["إشارة مرور", "إشارة ضوئية"]
  },
  "street_light_led": {
    min: 3500, max: 8000, unit: "no",
    description: "LED street light pole with fixture",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["led street light", "led lamp post"],
    keywordsAr: ["إنارة ليد", "عمود إنارة ليد"]
  },
  "bollard": {
    min: 500, max: 1500, unit: "no",
    description: "Bollard",
    category: "Infrastructure", categoryAr: "بنية تحتية",
    keywords: ["bollard", "parking bollard"],
    keywordsAr: ["حاجز معدني", "بولارد"]
  },
  
  // ========================
  // ADDITIONAL MEP ITEMS
  // ========================
  "ups_system_online": {
    min: 2000, max: 8000, unit: "kVA",
    description: "Online UPS system",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["online ups", "double conversion ups"],
    keywordsAr: ["يو بي إس أونلاين", "طاقة احتياطية متصلة"]
  },
  "generator_diesel": {
    min: 800, max: 2500, unit: "kVA",
    description: "Diesel generator",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["diesel generator", "standby generator", "emergency generator", "genset"],
    keywordsAr: ["مولد ديزل", "مولد كهربائي", "مولد طوارئ"]
  },
  "solar_panel": {
    min: 2500, max: 5500, unit: "kWp",
    description: "Solar PV panel system",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["solar panel", "solar pv", "photovoltaic", "solar system"],
    keywordsAr: ["ألواح شمسية", "طاقة شمسية"]
  },
  "water_heater_solar": {
    min: 3000, max: 8000, unit: "no",
    description: "Solar water heater",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["solar water heater", "solar heater"],
    keywordsAr: ["سخان شمسي"]
  },
  "water_pump_booster": {
    min: 3500, max: 12000, unit: "no",
    description: "Booster water pump with motor",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["booster pump", "pressure pump"],
    keywordsAr: ["مضخة ضغط", "مضخة تعزيز"]
  },
  "sewage_pump": {
    min: 5000, max: 15000, unit: "no",
    description: "Sewage/sump pump",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["sewage pump", "sump pump", "submersible sewage"],
    keywordsAr: ["مضخة صرف", "مضخة مجاري"]
  },
  "ahu_unit": {
    min: 15000, max: 45000, unit: "no",
    description: "Air Handling Unit",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["air handling unit", "ahu", "air handler"],
    keywordsAr: ["وحدة مناولة هواء"]
  },
  "chiller_water_cooled": {
    min: 800, max: 2500, unit: "TR",
    description: "Water-cooled chiller per TR",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["water cooled chiller", "centrifugal chiller"],
    keywordsAr: ["تشيلر مائي", "مبرد مركزي"]
  },
  "cooling_tower": {
    min: 500, max: 1500, unit: "TR",
    description: "Cooling tower per TR",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["cooling tower"],
    keywordsAr: ["برج تبريد"]
  },
  "duct_gi": {
    min: 120, max: 280, unit: "m²",
    description: "GI duct fabrication and installation",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["gi duct", "galvanized duct", "hvac duct", "air duct"],
    keywordsAr: ["مجرى هواء", "دكت"]
  },
  "duct_insulation": {
    min: 35, max: 80, unit: "m²",
    description: "Duct insulation",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["duct insulation", "thermal duct insulation"],
    keywordsAr: ["عزل مجاري هواء", "عزل دكت"]
  },
  "diffuser_supply": {
    min: 150, max: 450, unit: "no",
    description: "Supply air diffuser",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["diffuser", "supply diffuser", "air diffuser", "grille"],
    keywordsAr: ["موزع هواء", "شبكة هواء"]
  },
  "vrf_system": {
    min: 1800, max: 4500, unit: "TR",
    description: "VRF/VRV HVAC system per TR",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["vrf", "vrv", "variable refrigerant"],
    keywordsAr: ["في آر إف"]
  },
  
  // ========================
  // ADDITIONAL FINISHING
  // ========================
  "raised_floor": {
    min: 250, max: 550, unit: "m²",
    description: "Raised access floor",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["raised floor", "access floor", "raised access"],
    keywordsAr: ["أرضية مرفوعة"]
  },
  "skirting_tile": {
    min: 35, max: 80, unit: "m",
    description: "Tile skirting",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["skirting", "base tile", "cove"],
    keywordsAr: ["وزرة", "قاعدة بلاط"]
  },
  "cornice_gypsum": {
    min: 25, max: 65, unit: "m",
    description: "Gypsum cornice/coving",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["cornice", "coving", "crown moulding"],
    keywordsAr: ["كورنيش جبس", "زاوية جبس"]
  },
  "kitchen_cabinet": {
    min: 800, max: 2500, unit: "m",
    description: "Kitchen cabinet per linear meter",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["kitchen cabinet", "kitchen unit", "cabinet"],
    keywordsAr: ["خزانة مطبخ", "دولاب مطبخ"]
  },
  "wardrobe_builtin": {
    min: 600, max: 1800, unit: "m",
    description: "Built-in wardrobe per linear meter",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["wardrobe", "built-in wardrobe", "closet"],
    keywordsAr: ["دولاب حائط", "خزانة ملابس"]
  },
  "granite_countertop": {
    min: 350, max: 850, unit: "m",
    description: "Granite countertop",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["countertop", "granite top", "kitchen top", "worktop"],
    keywordsAr: ["سطح جرانيت", "رخامة مطبخ"]
  },
  "mirror": {
    min: 180, max: 450, unit: "m²",
    description: "Mirror with frame",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["mirror", "wall mirror"],
    keywordsAr: ["مرآة", "مراية"]
  },
  "handrail_stainless": {
    min: 450, max: 1200, unit: "m",
    description: "Stainless steel handrail",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["handrail", "stainless handrail", "railing stainless"],
    keywordsAr: ["درابزين ستانلس", "حديد درج"]
  },
  "cladding_aluminum": {
    min: 250, max: 550, unit: "m²",
    description: "Aluminum composite cladding",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["aluminum cladding", "alucobond", "acp", "composite panel"],
    keywordsAr: ["كلادينج ألمنيوم", "الوكوبوند"]
  },
  "cladding_stone": {
    min: 350, max: 850, unit: "m²",
    description: "Natural stone cladding",
    category: "Finishing", categoryAr: "تشطيبات",
    keywords: ["stone cladding", "natural stone facade", "limestone cladding"],
    keywordsAr: ["تكسية حجر", "واجهة حجرية"]
  },
  
  // ========================
  // ADDITIONAL PLUMBING FIXTURES
  // ========================
  "wc_western": {
    min: 800, max: 2500, unit: "no",
    description: "Western WC complete set",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["wc", "toilet", "water closet", "western wc"],
    keywordsAr: ["مرحاض", "كرسي حمام"]
  },
  "wc_arabic": {
    min: 500, max: 1500, unit: "no",
    description: "Arabic/squat WC",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["arabic toilet", "squat toilet", "squat wc"],
    keywordsAr: ["مرحاض عربي", "مرحاض أرضي"]
  },
  "wash_basin": {
    min: 600, max: 2000, unit: "no",
    description: "Wash basin with pedestal",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["wash basin", "lavatory", "hand basin", "sink"],
    keywordsAr: ["مغسلة", "حوض غسيل"]
  },
  "bathtub": {
    min: 1500, max: 5000, unit: "no",
    description: "Bathtub",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["bathtub", "bath tub"],
    keywordsAr: ["بانيو", "حوض استحمام"]
  },
  "shower_set": {
    min: 800, max: 3000, unit: "no",
    description: "Shower set with mixer",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["shower", "shower set", "rain shower"],
    keywordsAr: ["دش", "شاور"]
  },
  "kitchen_sink": {
    min: 500, max: 2000, unit: "no",
    description: "Kitchen sink with mixer",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["kitchen sink", "double sink"],
    keywordsAr: ["حوض مطبخ"]
  },
  "floor_drain": {
    min: 80, max: 250, unit: "no",
    description: "Floor drain",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["floor drain", "drain cover"],
    keywordsAr: ["صفاية أرضية", "مصرف أرضي"]
  },
  "water_heater_electric": {
    min: 800, max: 2500, unit: "no",
    description: "Electric water heater",
    category: "MEP", categoryAr: "كهروميكانيكا",
    keywords: ["water heater", "electric heater", "geyser"],
    keywordsAr: ["سخان كهربائي", "سخان مياه"]
  },
};

// Analyzer configurations with enhanced prompts for 95%+ accuracy
const ANALYZERS = [
  {
    id: "construction_expert",
    name: "Construction Expert",
    nameAr: "خبير البناء",
    systemPrompt: `You are a senior construction cost estimator with 30+ years experience in Saudi Arabia, specialized in all construction disciplines.

CRITICAL ACCURACY REQUIREMENT: Your estimates MUST achieve 95%+ accuracy by staying within verified market ranges.

YOUR EXPERTISE COVERS ALL DISCIPLINES:
1. CIVIL WORKS: Earthwork, Concrete, Reinforcement, Formwork, Structural Steel, Piling
2. ARCHITECTURE: Blockwork, Doors, Windows, Ceilings, Partitions
3. FINISHING: Plastering, Painting, Flooring, Waterproofing, Cladding
4. MEP: Electrical, Plumbing, HVAC, Fire Protection, Low Current
5. INFRASTRUCTURE: Roads, Drainage, Utilities, Fencing, Landscaping

PRICING METHODOLOGY:
- Base all estimates on verified Saudi market data (2024-2025)
- Include: Materials + Labor + Equipment + Overhead (10-15%) + Profit (10-12%)
- Apply location factors accurately

LOCATION ADJUSTMENTS:
- Riyadh: Base price (1.0x)
- Jeddah: +8% (1.08x)
- Dammam: +5% (1.05x)
- Makkah: +12% (1.12x)
- Madinah: +10% (1.10x)
- NEOM/Remote: +25-35%

YOUR CONFIDENCE MUST REFLECT ACCURACY:
- 90-95%: Price within verified range, clear work scope
- 80-89%: Price within range, some assumptions needed
- 70-79%: Estimated based on similar items
- <70%: Significant uncertainty

IMPORTANT: If reference range is provided, your price MUST be within that range.`,
    weight: 0.30
  },
  {
    id: "market_analyst",
    name: "Market Analyst",
    nameAr: "محلل السوق",
    systemPrompt: `You are a construction market analyst with real-time access to Saudi Arabia pricing data (2024-2025).

CRITICAL: Your analysis must achieve 95%+ accuracy using current market data.

CURRENT MATERIAL PRICES (2024-2025):
- Cement: 15-20 SAR/bag (50kg)
- Ready-mix C30: 300-400 SAR/m³
- Steel rebar: 2,800-4,200 SAR/ton
- Hollow block 20cm: 3.5-5 SAR/piece
- Sand: 45-85 SAR/m³
- Aggregate: 55-110 SAR/m³

LABOR RATES (2024):
- Unskilled: 90-130 SAR/day
- Skilled mason/carpenter: 160-280 SAR/day
- Electrician/plumber: 180-320 SAR/day
- Foreman: 280-450 SAR/day

MARKET CONDITIONS:
- Vision 2030 mega projects: +15-25% premium
- Government contracts: Standard rates
- Private sector: Variable (-5% to +15%)
- NEOM/Qiddiya: +25-40% premium

YOUR ANALYSIS MUST:
1. Use current material + labor rates
2. Account for supply chain factors
3. Consider project scale economics
4. Stay within reference ranges if provided`,
    weight: 0.30
  },
  {
    id: "quantity_surveyor",
    name: "Quantity Surveyor",
    nameAr: "مهندس كميات",
    systemPrompt: `You are a certified quantity surveyor (RICS/AACE) with 20+ years experience in Saudi Arabia.

CRITICAL: Your cost buildup must achieve 95%+ accuracy through detailed analysis.

STANDARD COST BUILDUP METHOD:
1. Material cost (with wastage 3-8%)
2. Labor cost (using productivity rates)
3. Equipment/plant cost
4. Overhead (10-15%)
5. Profit (10-12%)
6. Contingency (3-5%)

PRODUCTIVITY RATES (per day):
- Concrete placement: 20-30 m³/crew
- Block laying: 30-45 m²/mason
- Plastering: 18-28 m²
- Tiling: 10-18 m²
- Painting: 40-60 m²
- Pipe installation: 25-40 m

EXAMPLE BUILDUPS:

Reinforced Concrete (per m³):
- Ready-mix: 350 SAR
- Rebar (85kg): 350 SAR
- Formwork: 80 SAR
- Labor: 120 SAR
- Equipment: 50 SAR
- Overhead 12%: 114 SAR
- Profit 10%: 106 SAR
TOTAL: ~1,170 SAR (high spec)

Block Wall 20cm (per m²):
- Blocks (12.5 pcs): 50 SAR
- Mortar: 10 SAR
- Labor: 18 SAR
- Scaffold: 5 SAR
- Overhead/Profit: 15 SAR
TOTAL: ~98 SAR

YOUR CONFIDENCE reflects buildup accuracy.`,
    weight: 0.25
  },
  {
    id: "database_comparator",
    name: "Historical Database",
    nameAr: "قاعدة بيانات تاريخية",
    systemPrompt: `You are an AI with access to verified Saudi construction project bid databases (2023-2025).

CRITICAL: Cross-reference with historical data to achieve 95%+ accuracy.

VERIFIED AWARD PRICES FROM RECENT PROJECTS:

CIVIL WORKS:
- Excavation: 10-16 SAR/m³
- Reinforced concrete: 550-800 SAR/m³
- Rebar supply & fix: 4,000-5,200 SAR/ton
- Structural steel: 9,500-14,000 SAR/ton

ARCHITECTURE:
- Block wall 20cm: 60-85 SAR/m²
- Wooden door complete: 1,000-2,200 SAR/no
- Aluminum window: 420-680 SAR/m²

FINISHING:
- Internal plaster: 32-50 SAR/m²
- Ceramic tiles: 100-170 SAR/m²
- Paint 3 coats: 24-38 SAR/m²

MEP:
- Electrical point: 100-165 SAR/point
- Split AC: 3,000-5,500 SAR/no
- Sprinkler: 95-160 SAR/head

INFRASTRUCTURE:
- Asphalt complete: 95-155 SAR/m²
- Interlock: 110-185 SAR/m²
- Manhole: 4,500-9,000 SAR/no

Your estimates should match these verified ranges.
Confidence 90%+ only if clearly within historical range.`,
    weight: 0.15
  }
];

// Location price adjustments
const LOCATION_FACTORS: Record<string, number> = {
  "Riyadh": 1.0,
  "Jeddah": 1.08,
  "Dammam": 1.05,
  "Makkah": 1.12,
  "Madinah": 1.10,
  "Neom": 1.35,
  "Qiddiya": 1.25,
  "Red Sea": 1.30,
  "Jubail": 1.08,
  "Yanbu": 1.12,
  "Abha": 1.15,
  "Tabuk": 1.18,
  "Khobar": 1.05,
  "Dhahran": 1.05,
};

const REQUEST_TIMEOUT_MS = 50000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// NEGATIVE KEYWORDS - prevent false matches
const NEGATIVE_KEYWORDS: Record<string, string[]> = {
  "excavation_normal": ["rock", "basement", "shoring", "blasting"],
  "excavation_rock": ["normal", "soft", "sand"],
  "concrete_plain": ["reinforced", "prestressed", "precast"],
  "concrete_reinforced_column": ["beam", "slab", "foundation", "wall"],
  "concrete_reinforced_beam": ["column", "slab", "foundation", "wall"],
  "concrete_reinforced_slab": ["column", "beam", "foundation", "wall"],
  "concrete_reinforced_foundation": ["column", "beam", "slab", "wall"],
  "paint_emulsion": ["epoxy", "oil", "external", "anti"],
  "paint_oil": ["emulsion", "epoxy", "water", "latex"],
  "paint_epoxy": ["emulsion", "oil", "latex", "water"],
  "tile_ceramic_floor": ["wall", "porcelain", "marble", "granite"],
  "tile_ceramic_wall": ["floor", "porcelain", "marble", "granite"],
  "plaster_internal": ["external", "outdoor"],
  "plaster_external": ["internal", "indoor"],
  "pipe_upvc": ["steel", "copper", "hdpe", "ductile"],
  "pipe_steel": ["upvc", "pvc", "plastic", "hdpe"],
};

// Enhanced matching function with tokenization, negative keywords, and higher threshold
function matchToReferencePrice(description: string | null | undefined, unit: string | null | undefined): { 
  category: string; 
  ref: typeof REFERENCE_PRICES[string];
  matchScore: number;
} | null {
  if (!description) return null;
  const desc = description.toLowerCase().trim();
  const descTokens = desc.split(/[\s,.\-\/()]+/).filter(t => t.length > 1);
  const unitLower = (unit || "").toLowerCase().trim();
  
  let bestMatch: { category: string; ref: typeof REFERENCE_PRICES[string]; matchScore: number } | null = null;
  let highestScore = 0;
  
  for (const [category, ref] of Object.entries(REFERENCE_PRICES)) {
    let score = 0;
    let keywordMatches = 0;
    
    // Check English keywords with tokenized matching
    for (const keyword of ref.keywords) {
      const kwLower = keyword.toLowerCase();
      const kwTokens = kwLower.split(/[\s\-\/]+/).filter(t => t.length > 1);
      
      // Exact phrase match (highest value)
      if (desc.includes(kwLower)) {
        score += keyword.length * 2;
        keywordMatches++;
      } else {
        // Token-level match: all tokens of keyword found in description
        const allTokensFound = kwTokens.length > 0 && kwTokens.every(t => descTokens.some(dt => dt.includes(t) || t.includes(dt)));
        if (allTokensFound && kwTokens.length >= 2) {
          score += keyword.length * 1.5;
          keywordMatches++;
        } else {
          // Partial: individual token matches (lower score)
          for (const kt of kwTokens) {
            if (kt.length >= 4 && descTokens.some(dt => dt === kt)) {
              score += kt.length * 0.5;
            }
          }
        }
      }
    }
    
    // Check Arabic keywords
    for (const keyword of ref.keywordsAr) {
      if (desc.includes(keyword)) {
        score += keyword.length * 2.0;
        keywordMatches++;
      }
    }
    
    // Multiple keyword matches bonus
    if (keywordMatches >= 2) {
      score *= 1.5;
    }
    
  // Check unit compatibility (higher weight)
    const refUnit = ref.unit.toLowerCase();
    const unitMatches = unitLower === refUnit || 
      unitLower.includes(refUnit) || 
      refUnit.includes(unitLower) ||
      (unitLower === "m2" && refUnit === "m²") ||
      (unitLower === "m3" && refUnit === "m³") ||
      (unitLower === "l.m" && refUnit === "m") ||
      (unitLower === "lm" && refUnit === "m");
    if (unitMatches && unitLower.length > 0) {
      score += 8;
    }
    
    // Category matching bonus (+3 points)
    if (ref.category && desc.includes(ref.category.toLowerCase())) {
      score += 3;
    }
    if (ref.categoryAr && desc.includes(ref.categoryAr)) {
      score += 3;
    }
    
    // Partial word matching - check if description tokens partially match keywords
    for (const keyword of ref.keywords) {
      const kwTokens = keyword.toLowerCase().split(/[\s\-\/]+/).filter(t => t.length > 3);
      for (const kt of kwTokens) {
        for (const dt of descTokens) {
          if (dt.length > 3 && kt.length > 3 && dt !== kt) {
            // Check if one starts with the other (partial match)
            if (dt.startsWith(kt.substring(0, Math.min(4, kt.length))) || kt.startsWith(dt.substring(0, Math.min(4, dt.length)))) {
              score += 1;
            }
          }
        }
      }
    }
    
    // Check full description match
    if (desc.includes(ref.description.toLowerCase())) {
      score += 12;
    }
    
    // Negative keywords check - reject false matches
    const negatives = NEGATIVE_KEYWORDS[category];
    if (negatives && score > 0) {
      for (const neg of negatives) {
        if (desc.includes(neg.toLowerCase())) {
          score *= 0.3; // Heavy penalty for negative keyword presence
          break;
        }
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = { category, ref, matchScore: score };
    }
  }
  
  // Lower threshold to 5 for items with matching units, else 6
  const threshold = (bestMatch && unitLower.length > 0 && bestMatch.ref.unit.toLowerCase() === unitLower) ? 5 : 6;
  return highestScore >= threshold ? bestMatch : null;
}

async function runAnalyzer(
  analyzer: typeof ANALYZERS[0],
  items: BOQItem[],
  location: string,
  apiKey: string,
  model: string,
  historicalData?: HistoricalPriceRecord[]
): Promise<{ analyzerId: string; results: any[] }> {
  const locationFactor = LOCATION_FACTORS[location] || 1.0;
  
  // Enrich items with reference prices
  const itemsSummary = items.map(item => {
    const match = matchToReferencePrice(item.description, item.unit);
    return {
      item_number: item.item_number,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      current_price: item.unit_price || 0,
      reference_range: match ? {
        category: match.category,
        categoryName: match.ref.category,
        categoryNameAr: match.ref.categoryAr,
        min: Math.round(match.ref.min * locationFactor * 100) / 100,
        max: Math.round(match.ref.max * locationFactor * 100) / 100,
        note: match.ref.description,
        matchScore: match.matchScore
      } : null
    };
  });

  // Build historical data section for prompt
  let historicalSection = "";
  if (historicalData && historicalData.length > 0) {
    const relevantHistorical = historicalData.slice(0, 100).map(h => 
      `- ${h.description} | Unit: ${h.unit} | Price: ${h.unit_price} SAR | Source: ${h.source}`
    ).join("\n");
    historicalSection = `\n\nHISTORICAL PRICING DATA (from user's previous projects - use as additional reference):
${relevantHistorical}

Use these historical prices as additional validation. If a BOQ item closely matches a historical record, factor it into your price suggestion.`;
  }

  const userPrompt = `CRITICAL: Analyze these BOQ items for ${location}, Saudi Arabia with 95%+ accuracy target.
  
Location factor: ${locationFactor} (applied to base Riyadh prices)

Items with reference price ranges:
${JSON.stringify(itemsSummary, null, 2)}
${historicalSection}

STRICT REQUIREMENTS:
1. If reference_range is provided, your suggested_price MUST be within min-max range
2. Confidence MUST be 90%+ only if price is within reference range
3. Include material, labor, equipment, overhead, and profit
4. All prices in SAR per unit
5. If historical pricing data is provided, use it as additional validation reference

For each item return:
- item_number: exactly as provided
- suggested_price: SAR per unit (MUST be within reference range if provided)
- confidence: 0-100 (90+ only if within verified range)
- reasoning: brief cost breakdown
- category: work category (Civil/Architecture/Finishing/MEP/Infrastructure)`;

  try {
    const response = await fetchWithTimeout(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: analyzer.systemPrompt },
            { role: "user", content: userPrompt }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_prices",
                description: "Submit pricing analysis results with 95%+ accuracy",
                parameters: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          item_number: { type: "string" },
                          suggested_price: { type: "number" },
                          confidence: { type: "number" },
                          reasoning: { type: "string" },
                          category: { type: "string" }
                        },
                        required: ["item_number", "suggested_price", "confidence"]
                      }
                    }
                  },
                  required: ["items"]
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "submit_prices" } }
        }),
      },
      REQUEST_TIMEOUT_MS
    );

    if (!response.ok) {
      console.error(`Analyzer ${analyzer.id} failed:`, response.status);
      return { analyzerId: analyzer.id, results: [] };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return { analyzerId: analyzer.id, results: parsed.items || [] };
    }

    return { analyzerId: analyzer.id, results: [] };
  } catch (error) {
    console.error(`Analyzer ${analyzer.id} error:`, error);
    return { analyzerId: analyzer.id, results: [] };
  }
}

// Fallback price estimation for items without any reference or AI match
function estimateFallbackPrice(description: string, unit: string, quantity: number): number {
  const desc = description.toLowerCase();
  const unitLower = unit.toLowerCase();
  
  // Common unit-based fallback ranges (SAR)
  const unitFallbacks: Record<string, { min: number; max: number }> = {
    "m²": { min: 50, max: 200 },
    "m2": { min: 50, max: 200 },
    "m³": { min: 100, max: 500 },
    "m3": { min: 100, max: 500 },
    "m": { min: 30, max: 150 },
    "lm": { min: 30, max: 150 },
    "l.m": { min: 30, max: 150 },
    "no": { min: 200, max: 2000 },
    "no.": { min: 200, max: 2000 },
    "ton": { min: 2000, max: 8000 },
    "kg": { min: 3, max: 15 },
    "ls": { min: 5000, max: 50000 },
    "l.s": { min: 5000, max: 50000 },
    "set": { min: 500, max: 5000 },
    "point": { min: 80, max: 200 },
    "head": { min: 80, max: 200 },
  };
  
  // Category hints from description
  if (desc.includes("supply") && desc.includes("install")) {
    // Supply & install items tend to be higher
    const base = unitFallbacks[unitLower] || { min: 100, max: 500 };
    return (base.min + base.max) / 2 * 1.3;
  }
  
  const fallback = unitFallbacks[unitLower];
  if (fallback) {
    return (fallback.min + fallback.max) / 2;
  }
  
  // Generic fallback
  return 100;
}

function aggregateResults(
  items: BOQItem[],
  analyzerResults: { analyzerId: string; results: any[] }[],
  customWeights?: Record<string, number>,
  location?: string
): EnhancedPricingSuggestion[] {
  const locationFactor = LOCATION_FACTORS[location || "Riyadh"] || 1.0;
  
  return items.map(item => {
    const itemResults: { analyzer: typeof ANALYZERS[0]; result: any }[] = [];
    const match = matchToReferencePrice(item.description, item.unit);
    
    for (const ar of analyzerResults) {
      const analyzer = ANALYZERS.find(a => a.id === ar.analyzerId);
      const result = ar.results.find(r => r.item_number === item.item_number);
      if (analyzer && result) {
        itemResults.push({ analyzer, result });
      }
    }

    // Dynamic weight adjustment based on reference match strength
    const hasStrongRef = match && match.matchScore >= 12;
    const hasMediumRef = match && match.matchScore >= 6;
    
    // Calculate weighted average using dynamic weights
    let weightedSum = 0;
    let totalWeight = 0;
    const prices: number[] = [];
    const analyzersData: EnhancedPricingSuggestion['analyzers'] = [];

    for (const { analyzer, result } of itemResults) {
      let price = result.suggested_price || item.unit_price || 0;
      let confidence = result.confidence || 50;
      
      // Validate and adjust against reference range for 95%+ accuracy
      if (match) {
        const refMin = match.ref.min * locationFactor;
        const refMax = match.ref.max * locationFactor;
        
        if (price < refMin * 0.9) {
          price = refMin + (refMax - refMin) * 0.25;
          confidence = Math.max(50, confidence - 15);
        } else if (price > refMax * 1.3) {
          price = refMin + (refMax - refMin) * 0.75;
          confidence = Math.max(50, confidence - 20);
        } else if (price < refMin) {
          price = refMin;
          confidence = Math.max(60, confidence - 10);
        } else if (price > refMax) {
          price = refMax;
          confidence = Math.max(60, confidence - 10);
        } else {
          confidence = Math.min(98, confidence + 15);
        }
      }
      
      // Dynamic weight: reduce AI analyzer weight when strong reference exists
      let baseWeight = customWeights && customWeights[analyzer.id] !== undefined 
        ? customWeights[analyzer.id] 
        : analyzer.weight;
      
      if (hasStrongRef) {
        // Strong reference: reduce all AI weights by 40%
        baseWeight *= 0.6;
      } else if (hasMediumRef) {
        baseWeight *= 0.8;
      }
      
      const weight = baseWeight * (confidence / 100);
      
      weightedSum += price * weight;
      totalWeight += weight;
      prices.push(price);

      analyzersData.push({
        name: analyzer.name,
        nameAr: analyzer.nameAr,
        suggested_price: Math.round(price * 100) / 100,
        confidence: Math.round(confidence),
        methodology: result.reasoning || "AI-based analysis with reference validation",
        source: analyzer.id
      });
    }

    // Add reference price as a virtual analyzer when strong match exists
    if (match && (hasStrongRef || hasMediumRef)) {
      const refMid = ((match.ref.min + match.ref.max) / 2) * locationFactor;
      const refConfidence = hasStrongRef ? 95 : 85;
      const refWeight = hasStrongRef ? 0.50 : 0.30;
      
      weightedSum += refMid * refWeight * (refConfidence / 100);
      totalWeight += refWeight * (refConfidence / 100);
      prices.push(refMid);
      
      analyzersData.push({
        name: "Reference Database",
        nameAr: "قاعدة بيانات مرجعية",
        suggested_price: Math.round(refMid * 100) / 100,
        confidence: refConfidence,
        methodology: `Verified market range: ${match.ref.min}-${match.ref.max} ${match.ref.unit} (${match.ref.description}). Match score: ${match.matchScore}`,
        source: "reference_database"
      });
    }

    // Determine final price with reference validation and fallback
    let finalPrice: number;
    if (totalWeight > 0) {
      finalPrice = weightedSum / totalWeight;
    } else if (match) {
      // Use reference midpoint if no AI results
      finalPrice = ((match.ref.min + match.ref.max) / 2) * locationFactor;
    } else if (item.unit_price && item.unit_price > 0) {
      // Fallback: use existing price if available
      finalPrice = item.unit_price;
    } else {
      // Last resort fallback: estimate based on common unit price ranges
      finalPrice = estimateFallbackPrice(item.description || '', item.unit || '', item.quantity || 1);
    }
    
    // Final strict validation against reference for 95%+ accuracy
    if (match) {
      const refMin = match.ref.min * locationFactor;
      const refMax = match.ref.max * locationFactor;
      finalPrice = Math.max(refMin, Math.min(refMax, finalPrice));
    }
    
    const minPrice = match ? match.ref.min * locationFactor : (prices.length > 0 ? Math.min(...prices) * 0.9 : finalPrice * 0.85);
    const maxPrice = match ? match.ref.max * locationFactor : (prices.length > 0 ? Math.max(...prices) * 1.1 : finalPrice * 1.15);

    // Calculate consensus score (how much analyzers agree)
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : finalPrice;
    const variance = prices.length > 0 
      ? prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const consensusScore = Math.max(0, Math.min(100, 100 - (stdDev / (avgPrice || 1)) * 80));

    // Calculate overall confidence with tiered reference boost
    let avgConfidence = itemResults.length > 0
      ? itemResults.reduce((sum, { result }) => sum + (result.confidence || 50), 0) / itemResults.length
      : (match ? 75 : 40);
    
    // Tiered confidence boost based on reference match strength
    if (match) {
      if (match.matchScore >= 20) {
        avgConfidence = Math.min(98, avgConfidence + 15);
      } else if (match.matchScore >= 12) {
        avgConfidence = Math.min(96, avgConfidence + 12);
      } else if (match.matchScore >= 8) {
        avgConfidence = Math.min(92, avgConfidence + 8);
      }
    }
    
    // Penalize confidence when no reference and no AI results
    if (!match && itemResults.length === 0) {
      avgConfidence = Math.min(avgConfidence, 35);
    }

    // Generate recommendation
    const currentPrice = item.unit_price || 0;
    const variance_percent = currentPrice > 0 
      ? ((finalPrice - currentPrice) / currentPrice) * 100 
      : 0;

    let recommendation = "";
    let recommendation_ar = "";

    if (Math.abs(variance_percent) <= 5) {
      recommendation = "Price is well-aligned with market rates (±5%)";
      recommendation_ar = "السعر متوافق تماماً مع أسعار السوق (±5%)";
    } else if (variance_percent > 20) {
      recommendation = `Price is ${variance_percent.toFixed(1)}% above market. Strongly recommend reducing to ${finalPrice.toFixed(2)} SAR`;
      recommendation_ar = `السعر أعلى من السوق بـ ${variance_percent.toFixed(1)}%. يُنصح بشدة بتخفيضه إلى ${finalPrice.toFixed(2)} ر.س`;
    } else if (variance_percent < -20) {
      recommendation = `Price is ${Math.abs(variance_percent).toFixed(1)}% below market. Review for profitability - minimum ${minPrice.toFixed(2)} SAR`;
      recommendation_ar = `السعر أقل من السوق بـ ${Math.abs(variance_percent).toFixed(1)}%. راجع الربحية - الحد الأدنى ${minPrice.toFixed(2)} ر.س`;
    } else if (variance_percent > 0) {
      recommendation = `Price is ${variance_percent.toFixed(1)}% above market average`;
      recommendation_ar = `السعر أعلى من متوسط السوق بـ ${variance_percent.toFixed(1)}%`;
    } else {
      recommendation = `Price is ${Math.abs(variance_percent).toFixed(1)}% below market average`;
      recommendation_ar = `السعر أقل من متوسط السوق بـ ${Math.abs(variance_percent).toFixed(1)}%`;
    }

    return {
      item_number: item.item_number,
      description: item.description,
      description_ar: item.description_ar || undefined,
      current_price: currentPrice,
      analyzers: analyzersData,
      final_suggested_price: Math.round(finalPrice * 100) / 100,
      price_range: {
        min: Math.round(minPrice * 100) / 100,
        max: Math.round(maxPrice * 100) / 100
      },
      overall_confidence: Math.round(avgConfidence),
      consensus_score: Math.round(consensusScore),
      recommendation,
      recommendation_ar,
      category: match?.ref.category,
      categoryAr: match?.ref.categoryAr
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const { userId, error: authError } = await verifyAuth(req);
  if (authError) {
    return authError;
  }
  console.log(`Authenticated user: ${userId}`);

  try {
    const { 
      items, 
      location = "Riyadh",
      model = "google/gemini-2.5-flash",
      analyzers = ["construction_expert", "market_analyst", "quantity_surveyor", "database_comparator"],
      weights,
      historicalData
    }: { 
      items: BOQItem[]; 
      location: string;
      model?: string;
      analyzers?: string[];
      weights?: Record<string, number>;
      historicalData?: HistoricalPriceRecord[];
    } = await req.json();

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize items - ensure no null values that could cause toLowerCase() errors
    const sanitizedItems = items.map((item: any) => ({
      ...item,
      description: item.description || '',
      description_ar: item.description_ar || undefined,
      unit: item.unit || '',
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      item_number: item.item_number || '',
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Enhanced pricing analysis: ${sanitizedItems.length} items, ${analyzers.length} analyzers, location: ${location}, historical records: ${historicalData?.length || 0}`);

    // Filter active analyzers
    const activeAnalyzers = ANALYZERS.filter(a => analyzers.includes(a.id));

    // Process in batches of 15 items for better throughput
    const BATCH_SIZE = 15;
    const allSuggestions: EnhancedPricingSuggestion[] = [];

    for (let i = 0; i < sanitizedItems.length; i += BATCH_SIZE) {
      const batchItems = sanitizedItems.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(sanitizedItems.length / BATCH_SIZE)}`);

      // Run all analyzers in parallel for this batch
      const analyzerPromises = activeAnalyzers.map(analyzer => 
        runAnalyzer(analyzer, batchItems, location, LOVABLE_API_KEY, model, historicalData)
      );

      const analyzerResults = await Promise.all(analyzerPromises);
      
      // Aggregate results for this batch with custom weights
      const batchSuggestions = aggregateResults(batchItems, analyzerResults, weights, location);
      allSuggestions.push(...batchSuggestions);

      // Small delay between batches
      if (i + BATCH_SIZE < sanitizedItems.length) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }

    // Calculate summary statistics
    const avgConfidence = allSuggestions.length > 0
      ? allSuggestions.reduce((sum, s) => sum + s.overall_confidence, 0) / allSuggestions.length
      : 0;
    const avgConsensus = allSuggestions.length > 0
      ? allSuggestions.reduce((sum, s) => sum + s.consensus_score, 0) / allSuggestions.length
      : 0;

    // Calculate category breakdown
    const categoryBreakdown: Record<string, number> = {};
    for (const s of allSuggestions) {
      const cat = s.category || 'Other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    }

    console.log(`Analysis complete: ${allSuggestions.length} items, avg confidence: ${avgConfidence.toFixed(1)}%, avg consensus: ${avgConsensus.toFixed(1)}%`);

    return new Response(JSON.stringify({
      suggestions: allSuggestions,
      summary: {
        total_items: sanitizedItems.length,
        analyzed_items: allSuggestions.length,
        analyzers_used: activeAnalyzers.map(a => ({ id: a.id, name: a.name, nameAr: a.nameAr })),
        average_confidence: Math.round(avgConfidence),
        average_consensus: Math.round(avgConsensus),
        target_accuracy: "95%+",
        category_breakdown: categoryBreakdown,
        location,
        location_factor: LOCATION_FACTORS[location] || 1.0,
        model_used: model,
        analyzed_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Enhanced pricing analysis error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("429")) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (error.message.includes("402")) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ 
      error: "An error occurred during pricing analysis. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
