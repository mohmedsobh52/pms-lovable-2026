import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Sample Materials Data (15 items)
const SAMPLE_MATERIALS = [
  { name: "Ready-Mix Concrete C30", name_ar: "خرسانة جاهزة C30", category: "concrete", unit: "m3", unit_price: 350, brand: "Saudi Readymix" },
  { name: "Ready-Mix Concrete C40", name_ar: "خرسانة جاهزة C40", category: "concrete", unit: "m3", unit_price: 400, brand: "Saudi Readymix" },
  { name: "Rebar 12mm", name_ar: "حديد تسليح 12مم", category: "steel", unit: "ton", unit_price: 3200, brand: "SABIC" },
  { name: "Rebar 16mm", name_ar: "حديد تسليح 16مم", category: "steel", unit: "ton", unit_price: 3100, brand: "SABIC" },
  { name: "Portland Cement", name_ar: "أسمنت بورتلاندي", category: "cement", unit: "ton", unit_price: 350, brand: "Yamama" },
  { name: "Concrete Block 20x20x40", name_ar: "بلوك خرساني 20×20×40", category: "blocks", unit: "unit", unit_price: 3.50 },
  { name: "Red Brick", name_ar: "طوب أحمر", category: "blocks", unit: "unit", unit_price: 0.85 },
  { name: "Washed Sand", name_ar: "رمل مغسول", category: "sand_aggregate", unit: "m3", unit_price: 80 },
  { name: "Aggregate/Gravel", name_ar: "حصمة/حصى", category: "sand_aggregate", unit: "m3", unit_price: 120 },
  { name: "Floor Tiles 60x60", name_ar: "سيراميك أرضيات 60×60", category: "tiles", unit: "m2", unit_price: 55, brand: "RAK Ceramics" },
  { name: "Interior Plastic Paint", name_ar: "دهان بلاستيك داخلي", category: "paint", unit: "unit", unit_price: 180, brand: "Jotun" },
  { name: "Waterproofing Membrane", name_ar: "عزل مائي ممبرين", category: "insulation", unit: "m2", unit_price: 35, brand: "Sika" },
  { name: "Aluminum Door", name_ar: "باب ألمنيوم", category: "aluminum", unit: "m2", unit_price: 450 },
  { name: "Electric Cable 2.5mm", name_ar: "سلك كهربائي 2.5مم", category: "electrical", unit: "m", unit_price: 3.50, brand: "Riyadh Cables" },
  { name: "PVC Pipe 4 inch", name_ar: "ماسورة PVC 4 بوصة", category: "plumbing", unit: "m", unit_price: 18 },
];

// Water & Sewage Network Materials (~80 items)
const WATER_SEWAGE_MATERIALS = [
  // uPVC Pipes (Sewage)
  { name: "uPVC Pipe 110mm SN4", name_ar: "ماسورة يو بي في سي 110مم SN4", category: "pipes_pvc", unit: "m", unit_price: 18, brand: "Amiantit", specifications: "SN4, SDR41, Wall 2.7mm" },
  { name: "uPVC Pipe 160mm SN4", name_ar: "ماسورة يو بي في سي 160مم SN4", category: "pipes_pvc", unit: "m", unit_price: 28, brand: "Amiantit", specifications: "SN4, Wall 4.0mm" },
  { name: "uPVC Pipe 200mm SN4", name_ar: "ماسورة يو بي في سي 200مم SN4", category: "pipes_pvc", unit: "m", unit_price: 45, brand: "Amiantit", specifications: "SN4, SDR41, Wall 4.9mm" },
  { name: "uPVC Pipe 250mm SN4", name_ar: "ماسورة يو بي في سي 250مم SN4", category: "pipes_pvc", unit: "m", unit_price: 65, brand: "Amiantit", specifications: "SN4, Wall 6.2mm" },
  { name: "uPVC Pipe 315mm SN4", name_ar: "ماسورة يو بي في سي 315مم SN4", category: "pipes_pvc", unit: "m", unit_price: 95, brand: "Amiantit", specifications: "SN4, Wall 7.7mm" },
  { name: "uPVC Pipe 400mm SN4", name_ar: "ماسورة يو بي في سي 400مم SN4", category: "pipes_pvc", unit: "m", unit_price: 145, brand: "Amiantit", specifications: "SN4, Wall 9.8mm" },
  { name: "uPVC Pipe 500mm SN4", name_ar: "ماسورة يو بي في سي 500مم SN4", category: "pipes_pvc", unit: "m", unit_price: 220, brand: "Amiantit", specifications: "SN4, Wall 12.3mm" },
  { name: "uPVC Pipe 630mm SN4", name_ar: "ماسورة يو بي في سي 630مم SN4", category: "pipes_pvc", unit: "m", unit_price: 350, brand: "Amiantit", specifications: "SN4, Wall 15.4mm" },

  // HDPE Pipes (Water Supply)
  { name: "HDPE Pipe 63mm PE100 PN10", name_ar: "ماسورة HDPE 63مم PN10", category: "pipes_hdpe", unit: "m", unit_price: 12, brand: "APC", specifications: "PE100, PN10, SDR17" },
  { name: "HDPE Pipe 90mm PE100 PN10", name_ar: "ماسورة HDPE 90مم PN10", category: "pipes_hdpe", unit: "m", unit_price: 22, brand: "APC", specifications: "PE100, PN10, SDR17" },
  { name: "HDPE Pipe 110mm PE100 PN10", name_ar: "ماسورة HDPE 110مم PN10", category: "pipes_hdpe", unit: "m", unit_price: 30, brand: "APC", specifications: "PE100, PN10, SDR17" },
  { name: "HDPE Pipe 160mm PE100 PN10", name_ar: "ماسورة HDPE 160مم PN10", category: "pipes_hdpe", unit: "m", unit_price: 55, brand: "APC", specifications: "PE100, PN10, SDR17" },
  { name: "HDPE Pipe 200mm PE100 PN10", name_ar: "ماسورة HDPE 200مم PN10", category: "pipes_hdpe", unit: "m", unit_price: 85, brand: "APC", specifications: "PE100, PN10, SDR17" },
  { name: "HDPE Pipe 250mm PE100 PN10", name_ar: "ماسورة HDPE 250مم PN10", category: "pipes_hdpe", unit: "m", unit_price: 130, brand: "APC", specifications: "PE100, PN10, SDR17" },
  { name: "HDPE Pipe 315mm PE100 PN10", name_ar: "ماسورة HDPE 315مم PN10", category: "pipes_hdpe", unit: "m", unit_price: 195, brand: "APC", specifications: "PE100, PN10, SDR17" },
  { name: "HDPE Pipe 400mm PE100 PN10", name_ar: "ماسورة HDPE 400مم PN10", category: "pipes_hdpe", unit: "m", unit_price: 310, brand: "APC", specifications: "PE100, PN10, SDR17" },
  { name: "HDPE Pipe 500mm PE100 PN10", name_ar: "ماسورة HDPE 500مم PN10", category: "pipes_hdpe", unit: "m", unit_price: 480, brand: "APC", specifications: "PE100, PN10, SDR17" },
  { name: "HDPE Pipe 630mm PE100 PN10", name_ar: "ماسورة HDPE 630مم PN10", category: "pipes_hdpe", unit: "m", unit_price: 750, brand: "APC", specifications: "PE100, PN10, SDR17" },
  { name: "HDPE Pipe 110mm PE100 PN16", name_ar: "ماسورة HDPE 110مم PN16", category: "pipes_hdpe", unit: "m", unit_price: 42, brand: "APC", specifications: "PE100, PN16, SDR11" },
  { name: "HDPE Pipe 160mm PE100 PN16", name_ar: "ماسورة HDPE 160مم PN16", category: "pipes_hdpe", unit: "m", unit_price: 82, brand: "APC", specifications: "PE100, PN16, SDR11" },
  { name: "HDPE Pipe 200mm PE100 PN16", name_ar: "ماسورة HDPE 200مم PN16", category: "pipes_hdpe", unit: "m", unit_price: 125, brand: "APC", specifications: "PE100, PN16, SDR11" },
  { name: "HDPE Pipe 250mm PE100 PN16", name_ar: "ماسورة HDPE 250مم PN16", category: "pipes_hdpe", unit: "m", unit_price: 195, brand: "APC", specifications: "PE100, PN16, SDR11" },

  // Ductile Iron Pipes
  { name: "DI Pipe DN100 K9", name_ar: "ماسورة حديد دكتايل DN100 K9", category: "pipes_di", unit: "m", unit_price: 180, brand: "Saint-Gobain", specifications: "Class K9, Cement Lined" },
  { name: "DI Pipe DN150 K9", name_ar: "ماسورة حديد دكتايل DN150 K9", category: "pipes_di", unit: "m", unit_price: 250, brand: "Saint-Gobain", specifications: "Class K9, Cement Lined" },
  { name: "DI Pipe DN200 K9", name_ar: "ماسورة حديد دكتايل DN200 K9", category: "pipes_di", unit: "m", unit_price: 350, brand: "Saint-Gobain", specifications: "Class K9, Cement Lined" },
  { name: "DI Pipe DN250 K9", name_ar: "ماسورة حديد دكتايل DN250 K9", category: "pipes_di", unit: "m", unit_price: 480, brand: "Saint-Gobain", specifications: "Class K9, Cement Lined" },
  { name: "DI Pipe DN300 K9", name_ar: "ماسورة حديد دكتايل DN300 K9", category: "pipes_di", unit: "m", unit_price: 620, brand: "Saint-Gobain", specifications: "Class K9, Cement Lined" },
  { name: "DI Pipe DN400 K9", name_ar: "ماسورة حديد دكتايل DN400 K9", category: "pipes_di", unit: "m", unit_price: 950, brand: "Saint-Gobain", specifications: "Class K9, Cement Lined" },
  { name: "DI Pipe DN500 K9", name_ar: "ماسورة حديد دكتايل DN500 K9", category: "pipes_di", unit: "m", unit_price: 1350, brand: "Saint-Gobain", specifications: "Class K9, Cement Lined" },
  { name: "DI Pipe DN600 K9", name_ar: "ماسورة حديد دكتايل DN600 K9", category: "pipes_di", unit: "m", unit_price: 1800, brand: "Saint-Gobain", specifications: "Class K9, Cement Lined" },

  // GRP Pipes
  { name: "GRP Pipe DN300 PN10", name_ar: "ماسورة GRP 300مم PN10", category: "pipes_grp", unit: "m", unit_price: 280, brand: "Amiantit", specifications: "PN10, SN5000" },
  { name: "GRP Pipe DN400 PN10", name_ar: "ماسورة GRP 400مم PN10", category: "pipes_grp", unit: "m", unit_price: 420, brand: "Amiantit", specifications: "PN10, SN5000" },
  { name: "GRP Pipe DN600 PN10", name_ar: "ماسورة GRP 600مم PN10", category: "pipes_grp", unit: "m", unit_price: 750, brand: "Amiantit", specifications: "PN10, SN5000" },
  { name: "GRP Pipe DN800 PN10", name_ar: "ماسورة GRP 800مم PN10", category: "pipes_grp", unit: "m", unit_price: 1200, brand: "Amiantit", specifications: "PN10, SN5000" },
  { name: "GRP Pipe DN1000 PN10", name_ar: "ماسورة GRP 1000مم PN10", category: "pipes_grp", unit: "m", unit_price: 1800, brand: "Amiantit", specifications: "PN10, SN5000" },

  // Concrete Pipes
  { name: "RCC Pipe DN300", name_ar: "ماسورة خرسانية مسلحة DN300", category: "pipes_concrete", unit: "m", unit_price: 120, specifications: "Class III, Rubber Ring Joint" },
  { name: "RCC Pipe DN400", name_ar: "ماسورة خرسانية مسلحة DN400", category: "pipes_concrete", unit: "m", unit_price: 180, specifications: "Class III, Rubber Ring Joint" },
  { name: "RCC Pipe DN600", name_ar: "ماسورة خرسانية مسلحة DN600", category: "pipes_concrete", unit: "m", unit_price: 320, specifications: "Class III, Rubber Ring Joint" },
  { name: "RCC Pipe DN800", name_ar: "ماسورة خرسانية مسلحة DN800", category: "pipes_concrete", unit: "m", unit_price: 520, specifications: "Class III, Rubber Ring Joint" },
  { name: "RCC Pipe DN1000", name_ar: "ماسورة خرسانية مسلحة DN1000", category: "pipes_concrete", unit: "m", unit_price: 780, specifications: "Class III, Rubber Ring Joint" },

  // Fittings & Valves
  { name: "Gate Valve DN100", name_ar: "محبس بوابي DN100", category: "fittings_valves", unit: "unit", unit_price: 850, specifications: "PN16, GGG50, Epoxy Coated" },
  { name: "Gate Valve DN150", name_ar: "محبس بوابي DN150", category: "fittings_valves", unit: "unit", unit_price: 1200, specifications: "PN16, GGG50, Epoxy Coated" },
  { name: "Gate Valve DN200", name_ar: "محبس بوابي DN200", category: "fittings_valves", unit: "unit", unit_price: 1800, specifications: "PN16, GGG50, Epoxy Coated" },
  { name: "Gate Valve DN300", name_ar: "محبس بوابي DN300", category: "fittings_valves", unit: "unit", unit_price: 3500, specifications: "PN16, GGG50, Epoxy Coated" },
  { name: "Butterfly Valve DN200", name_ar: "محبس فراشة DN200", category: "fittings_valves", unit: "unit", unit_price: 2200, specifications: "PN16, Wafer Type" },
  { name: "Butterfly Valve DN300", name_ar: "محبس فراشة DN300", category: "fittings_valves", unit: "unit", unit_price: 3800, specifications: "PN16, Wafer Type" },
  { name: "Butterfly Valve DN400", name_ar: "محبس فراشة DN400", category: "fittings_valves", unit: "unit", unit_price: 5500, specifications: "PN16, Wafer Type" },
  { name: "Check Valve DN100", name_ar: "صمام عدم رجوع DN100", category: "fittings_valves", unit: "unit", unit_price: 950, specifications: "PN16, Swing Type" },
  { name: "Check Valve DN200", name_ar: "صمام عدم رجوع DN200", category: "fittings_valves", unit: "unit", unit_price: 2000, specifications: "PN16, Swing Type" },
  { name: "Air Release Valve DN50", name_ar: "صمام تنفيس هواء DN50", category: "fittings_valves", unit: "unit", unit_price: 1500, specifications: "PN16, Double Acting" },
  { name: "Air Release Valve DN80", name_ar: "صمام تنفيس هواء DN80", category: "fittings_valves", unit: "unit", unit_price: 2200, specifications: "PN16, Double Acting" },
  { name: "DI Tee DN100", name_ar: "تي حديد دكتايل DN100", category: "fittings_valves", unit: "unit", unit_price: 450, specifications: "PN16, Flanged" },
  { name: "DI Tee DN200", name_ar: "تي حديد دكتايل DN200", category: "fittings_valves", unit: "unit", unit_price: 950, specifications: "PN16, Flanged" },
  { name: "DI Elbow 90° DN100", name_ar: "كوع 90° حديد دكتايل DN100", category: "fittings_valves", unit: "unit", unit_price: 380, specifications: "PN16, Flanged" },
  { name: "DI Elbow 90° DN200", name_ar: "كوع 90° حديد دكتايل DN200", category: "fittings_valves", unit: "unit", unit_price: 850, specifications: "PN16, Flanged" },
  { name: "DI Reducer DN200x150", name_ar: "مخفض حديد دكتايل DN200x150", category: "fittings_valves", unit: "unit", unit_price: 650, specifications: "PN16, Flanged" },
  { name: "Dismantling Joint DN200", name_ar: "وصلة فك وتركيب DN200", category: "fittings_valves", unit: "unit", unit_price: 1800, specifications: "PN16, Flanged" },
  { name: "Coupling DN100", name_ar: "وصلة ربط DN100", category: "fittings_valves", unit: "unit", unit_price: 280, specifications: "Universal, Wide Range" },

  // Manholes
  { name: "Precast Manhole D1200 H1.0m", name_ar: "غرفة تفتيش جاهزة D1200 عمق 1م", category: "manholes", unit: "unit", unit_price: 2500, specifications: "Precast RC, D1200mm, Depth 1.0m" },
  { name: "Precast Manhole D1200 H1.5m", name_ar: "غرفة تفتيش جاهزة D1200 عمق 1.5م", category: "manholes", unit: "unit", unit_price: 3200, specifications: "Precast RC, D1200mm, Depth 1.5m" },
  { name: "Precast Manhole D1200 H2.0m", name_ar: "غرفة تفتيش جاهزة D1200 عمق 2م", category: "manholes", unit: "unit", unit_price: 4200, specifications: "Precast RC, D1200mm, Depth 2.0m" },
  { name: "Precast Manhole D1500 H2.0m", name_ar: "غرفة تفتيش جاهزة D1500 عمق 2م", category: "manholes", unit: "unit", unit_price: 5500, specifications: "Precast RC, D1500mm, Depth 2.0m" },
  { name: "Precast Manhole D1500 H3.0m", name_ar: "غرفة تفتيش جاهزة D1500 عمق 3م", category: "manholes", unit: "unit", unit_price: 7500, specifications: "Precast RC, D1500mm, Depth 3.0m" },
  { name: "CI Manhole Cover Heavy Duty D600", name_ar: "غطاء حديد زهر ثقيل D600", category: "manholes", unit: "unit", unit_price: 1200, specifications: "D400, EN124, Heavy Duty" },
  { name: "CI Manhole Cover Light Duty D600", name_ar: "غطاء حديد زهر خفيف D600", category: "manholes", unit: "unit", unit_price: 650, specifications: "B125, EN124, Light Duty" },
  { name: "Manhole Step Iron", name_ar: "درجات غرفة تفتيش حديد", category: "manholes", unit: "unit", unit_price: 35, specifications: "Galvanized, Step Iron" },
  { name: "Manhole Base Slab D1200", name_ar: "قاعدة غرفة تفتيش D1200", category: "manholes", unit: "unit", unit_price: 800, specifications: "Precast RC, with Channels" },

  // Water Tanks
  { name: "GRP Water Tank 10m³", name_ar: "خزان مياه GRP 10م³", category: "water_tanks", unit: "unit", unit_price: 8500, specifications: "GRP, Sectional, Food Grade" },
  { name: "GRP Water Tank 25m³", name_ar: "خزان مياه GRP 25م³", category: "water_tanks", unit: "unit", unit_price: 18000, specifications: "GRP, Sectional, Food Grade" },
  { name: "GRP Water Tank 50m³", name_ar: "خزان مياه GRP 50م³", category: "water_tanks", unit: "unit", unit_price: 32000, specifications: "GRP, Sectional, Food Grade" },
  { name: "RC Water Tank 100m³", name_ar: "خزان مياه خرساني 100م³", category: "water_tanks", unit: "unit", unit_price: 85000, specifications: "Reinforced Concrete, Waterproofed" },

  // Pumps & Stations
  { name: "Submersible Pump 10HP", name_ar: "مضخة غاطسة 10 حصان", category: "pumps_stations", unit: "unit", unit_price: 12000, brand: "Grundfos", specifications: "10HP, 3-Phase, SS Impeller" },
  { name: "Submersible Pump 25HP", name_ar: "مضخة غاطسة 25 حصان", category: "pumps_stations", unit: "unit", unit_price: 28000, brand: "Grundfos", specifications: "25HP, 3-Phase, SS Impeller" },
  { name: "Submersible Pump 50HP", name_ar: "مضخة غاطسة 50 حصان", category: "pumps_stations", unit: "unit", unit_price: 55000, brand: "Grundfos", specifications: "50HP, 3-Phase, SS Impeller" },
  { name: "Centrifugal Pump 15HP", name_ar: "مضخة طرد مركزي 15 حصان", category: "pumps_stations", unit: "unit", unit_price: 8500, brand: "KSB", specifications: "15HP, End Suction, CI Body" },
  { name: "Booster Pump Set 3x7.5HP", name_ar: "مجموعة مضخات تقوية 3×7.5 حصان", category: "pumps_stations", unit: "unit", unit_price: 45000, brand: "Grundfos", specifications: "3x7.5HP, VFD, SS Multi-stage" },

  // Water Treatment
  { name: "Chlorine Dosing System", name_ar: "نظام جرعات كلور", category: "water_treatment", unit: "unit", unit_price: 15000, specifications: "Auto Dosing, with Tank" },
  { name: "Water Meter DN50", name_ar: "عداد مياه DN50", category: "water_treatment", unit: "unit", unit_price: 850, specifications: "Ultrasonic, DN50, PN16" },
  { name: "Water Meter DN100", name_ar: "عداد مياه DN100", category: "water_treatment", unit: "unit", unit_price: 2500, specifications: "Electromagnetic, DN100, PN16" },
  { name: "Pressure Gauge DN63", name_ar: "مقياس ضغط DN63", category: "water_treatment", unit: "unit", unit_price: 120, specifications: "0-16 bar, Glycerin Filled" },
];

// Sample Labor Data (10 + 15 network)
const SAMPLE_LABOR = [
  { code: "L001", name: "Master Mason", name_ar: "معلم بناء", category: "mason", skill_level: "skilled", unit_rate: 250, working_hours_per_day: 8 },
  { code: "L002", name: "Mason Helper", name_ar: "مساعد بناء", category: "mason", skill_level: "unskilled", unit_rate: 120, working_hours_per_day: 8 },
  { code: "L003", name: "Rebar Carpenter", name_ar: "نجار مسلح", category: "carpenter", skill_level: "skilled", unit_rate: 280, working_hours_per_day: 8 },
  { code: "L004", name: "Plumber", name_ar: "سباك", category: "plumber", skill_level: "skilled", unit_rate: 300, working_hours_per_day: 8 },
  { code: "L005", name: "Electrician", name_ar: "كهربائي", category: "electrician", skill_level: "skilled", unit_rate: 320, working_hours_per_day: 8 },
  { code: "L006", name: "Painter", name_ar: "دهان", category: "painter", skill_level: "semi-skilled", unit_rate: 200, working_hours_per_day: 8 },
  { code: "L007", name: "Welder", name_ar: "لحام", category: "welder", skill_level: "skilled", unit_rate: 350, working_hours_per_day: 8 },
  { code: "L008", name: "Heavy Equipment Operator", name_ar: "مشغل معدات ثقيلة", category: "operator", skill_level: "skilled", unit_rate: 400, working_hours_per_day: 8 },
  { code: "L009", name: "Site Supervisor", name_ar: "مشرف موقع", category: "supervisor", skill_level: "skilled", unit_rate: 450, working_hours_per_day: 8 },
  { code: "L010", name: "General Helper", name_ar: "عامل مساعد", category: "helper", skill_level: "unskilled", unit_rate: 100, working_hours_per_day: 8 },
];

// Network-specific Labor
const NETWORK_LABOR = [
  { code: "L011", name: "HDPE Pipe Fitter", name_ar: "فني مواسير HDPE", category: "pipe_fitter", skill_level: "skilled", unit_rate: 350, working_hours_per_day: 8 },
  { code: "L012", name: "Pipe Welder (Butt Fusion)", name_ar: "لحام مواسير (لحام حراري)", category: "welder", skill_level: "skilled", unit_rate: 400, working_hours_per_day: 8 },
  { code: "L013", name: "DI Pipe Fitter", name_ar: "فني مواسير حديد دكتايل", category: "pipe_fitter", skill_level: "skilled", unit_rate: 380, working_hours_per_day: 8 },
  { code: "L014", name: "Valve Technician", name_ar: "فني محابس", category: "technician", skill_level: "skilled", unit_rate: 320, working_hours_per_day: 8 },
  { code: "L015", name: "Network Surveyor", name_ar: "مساح شبكات", category: "surveyor", skill_level: "skilled", unit_rate: 450, working_hours_per_day: 8 },
  { code: "L016", name: "Network Diver", name_ar: "غواص صيانة شبكات", category: "diver", skill_level: "skilled", unit_rate: 600, working_hours_per_day: 6 },
  { code: "L017", name: "Pump Operator", name_ar: "مشغل مضخات", category: "operator", skill_level: "semi-skilled", unit_rate: 280, working_hours_per_day: 8 },
  { code: "L018", name: "Water Treatment Technician", name_ar: "فني معالجة مياه", category: "technician", skill_level: "skilled", unit_rate: 400, working_hours_per_day: 8 },
  { code: "L019", name: "Network Foreman", name_ar: "ملاحظ أعمال شبكات", category: "foreman", skill_level: "skilled", unit_rate: 500, working_hours_per_day: 8 },
  { code: "L020", name: "Safety Officer (Networks)", name_ar: "مسؤول سلامة شبكات", category: "safety_officer", skill_level: "skilled", unit_rate: 420, working_hours_per_day: 8 },
  { code: "L021", name: "Excavation Driver", name_ar: "سائق حفارة", category: "driver", skill_level: "skilled", unit_rate: 350, working_hours_per_day: 8 },
  { code: "L022", name: "Pipe Layer Helper", name_ar: "مساعد تمديد مواسير", category: "helper", skill_level: "unskilled", unit_rate: 130, working_hours_per_day: 8 },
  { code: "L023", name: "GRP Pipe Installer", name_ar: "فني تركيب مواسير GRP", category: "pipe_fitter", skill_level: "skilled", unit_rate: 380, working_hours_per_day: 8 },
  { code: "L024", name: "Waterproofing Insulator", name_ar: "عازل مائي", category: "insulator", skill_level: "skilled", unit_rate: 300, working_hours_per_day: 8 },
  { code: "L025", name: "Pressure Test Technician", name_ar: "فني اختبار ضغط", category: "technician", skill_level: "skilled", unit_rate: 350, working_hours_per_day: 8 },
];

// Sample Equipment Data (10 + 15 network)
const SAMPLE_EQUIPMENT = [
  { code: "E001", name: "Caterpillar Excavator 320", name_ar: "حفار كاتربلر 320", category: "excavator", rental_rate: 1800, includes_operator: true, includes_fuel: false },
  { code: "E002", name: "Caterpillar Wheel Loader 950", name_ar: "شيول كاتربلر 950", category: "loader", rental_rate: 1500, includes_operator: true, includes_fuel: false },
  { code: "E003", name: "Tower Crane", name_ar: "رافعة برجية", category: "crane", rental_rate: 2500, includes_operator: false, includes_fuel: false },
  { code: "E004", name: "Dump Truck 20 Ton", name_ar: "قلاب 20 طن", category: "truck", rental_rate: 800, includes_operator: true, includes_fuel: false },
  { code: "E005", name: "Concrete Mixer", name_ar: "خلاطة خرسانة", category: "mixer", rental_rate: 400, includes_operator: false, includes_fuel: false },
  { code: "E006", name: "Concrete Pump", name_ar: "مضخة خرسانة", category: "pump", rental_rate: 3000, includes_operator: true, includes_fuel: true },
  { code: "E007", name: "Vibratory Roller", name_ar: "رولر اهتزازي", category: "compactor", rental_rate: 900, includes_operator: true, includes_fuel: false },
  { code: "E008", name: "Generator 100 KVA", name_ar: "مولد كهرباء 100 KVA", category: "generator", rental_rate: 600, includes_operator: false, includes_fuel: false },
  { code: "E009", name: "Forklift", name_ar: "رافعة شوكية", category: "forklift", rental_rate: 500, includes_operator: true, includes_fuel: false },
  { code: "E010", name: "Steel Scaffolding", name_ar: "سقالة حديد", category: "scaffold", rental_rate: 5, unit: "m2", includes_operator: false, includes_fuel: false },
];

// Network-specific Equipment
const NETWORK_EQUIPMENT = [
  { code: "E011", name: "HDPE Butt Fusion Machine 315mm", name_ar: "ماكينة لحام HDPE 315مم", category: "pipe_laying", rental_rate: 1200, includes_operator: false, includes_fuel: false },
  { code: "E012", name: "HDPE Butt Fusion Machine 630mm", name_ar: "ماكينة لحام HDPE 630مم", category: "pipe_laying", rental_rate: 2500, includes_operator: false, includes_fuel: false },
  { code: "E013", name: "Electrofusion Machine", name_ar: "ماكينة لحام كهربائي", category: "pipe_laying", rental_rate: 800, includes_operator: false, includes_fuel: false },
  { code: "E014", name: "Dewatering Pump 4 inch", name_ar: "مضخة نزح مياه 4 بوصة", category: "dewatering", rental_rate: 350, includes_operator: false, includes_fuel: false },
  { code: "E015", name: "Dewatering Pump 6 inch", name_ar: "مضخة نزح مياه 6 بوصة", category: "dewatering", rental_rate: 500, includes_operator: false, includes_fuel: false },
  { code: "E016", name: "Wellpoint Dewatering System", name_ar: "نظام نزح مياه ويلبوينت", category: "dewatering", rental_rate: 1500, includes_operator: true, includes_fuel: false },
  { code: "E017", name: "Pressure Testing Pump", name_ar: "مضخة اختبار ضغط", category: "testing", rental_rate: 400, includes_operator: false, includes_fuel: false },
  { code: "E018", name: "CCTV Pipe Inspection Unit", name_ar: "جهاز فحص مواسير CCTV", category: "testing", rental_rate: 2000, includes_operator: true, includes_fuel: false },
  { code: "E019", name: "Pipe Layer (Side Boom)", name_ar: "رافعة أنابيب جانبية", category: "pipe_laying", rental_rate: 2200, includes_operator: true, includes_fuel: false },
  { code: "E020", name: "Trencher Machine", name_ar: "حفارة خنادق", category: "trencher", rental_rate: 1800, includes_operator: true, includes_fuel: false },
  { code: "E021", name: "Mini Excavator 3 Ton", name_ar: "حفار صغير 3 طن", category: "excavator", rental_rate: 800, includes_operator: true, includes_fuel: false },
  { code: "E022", name: "Leak Detection Equipment", name_ar: "جهاز كشف تسربات", category: "testing", rental_rate: 1500, includes_operator: true, includes_fuel: false },
  { code: "E023", name: "Air Compressor 185 CFM", name_ar: "ضاغط هواء 185 CFM", category: "compressor", rental_rate: 450, includes_operator: false, includes_fuel: false },
  { code: "E024", name: "Total Station Survey", name_ar: "جهاز مساحة توتال ستيشن", category: "survey", rental_rate: 300, includes_operator: false, includes_fuel: false },
  { code: "E025", name: "GPS RTK Survey Kit", name_ar: "جهاز مساحة GPS RTK", category: "survey", rental_rate: 500, includes_operator: false, includes_fuel: false },
];

// Earthworks, Asphalt & Road Materials (~55 items) - v11
const EARTHWORKS_ASPHALT_MATERIALS = [
  // Earthworks - Trenching
  { name: "Machine Trenching ≤2m", name_ar: "حفر خنادق آلي ≤2م", category: "earthworks", unit: "m3", unit_price: 18, specifications: "Depth ≤2m, Normal Soil" },
  { name: "Machine Trenching 2-4m", name_ar: "حفر خنادق آلي 2-4م", category: "earthworks", unit: "m3", unit_price: 28, specifications: "Depth 2-4m, Normal Soil" },
  { name: "Machine Trenching 4-6m", name_ar: "حفر خنادق آلي 4-6م", category: "earthworks", unit: "m3", unit_price: 42, specifications: "Depth 4-6m, Normal Soil" },
  { name: "Rock Excavation (Mechanical)", name_ar: "حفر صخر ميكانيكي", category: "earthworks", unit: "m3", unit_price: 85, specifications: "Hydraulic Breaker" },
  // Earthworks - Backfill
  { name: "Fine Sand Backfill", name_ar: "ردم رمل ناعم", category: "earthworks", unit: "m3", unit_price: 35, specifications: "Compacted, around pipes" },
  { name: "Compacted Soil Backfill", name_ar: "ردم تربة مدموكة", category: "earthworks", unit: "m3", unit_price: 22, specifications: "95% Proctor, Layers 200mm" },
  { name: "Crushed Stone Backfill", name_ar: "ردم حجر مجروش", category: "earthworks", unit: "m3", unit_price: 55, specifications: "Graded, compacted" },
  { name: "Sand Bedding 150mm", name_ar: "فرشة رملية 150مم", category: "earthworks", unit: "m2", unit_price: 12, specifications: "Fine sand bed for pipes" },
  { name: "Concrete Protection Slab", name_ar: "حماية خرسانية للمواسير", category: "earthworks", unit: "m3", unit_price: 280, specifications: "C15, for pipe protection" },
  // Earthworks - Support & Dewatering
  { name: "Trench Shoring (Steel)", name_ar: "دعم جوانب خندق (حديد)", category: "earthworks", unit: "m2", unit_price: 45, specifications: "Steel sheet piling" },
  { name: "Dewatering (Wellpoint)", name_ar: "ضخ مياه جوفية (ويلبوينت)", category: "earthworks", unit: "day", unit_price: 1500, specifications: "Complete system" },
  { name: "Spoil Disposal Off-site", name_ar: "نقل حفريات خارج الموقع", category: "earthworks", unit: "m3", unit_price: 15, specifications: "Truck & disposal" },
  { name: "Surplus Excavation Removal", name_ar: "التخلص من فائض الحفريات", category: "earthworks", unit: "m3", unit_price: 12, specifications: "Load & haul" },

  // Asphalt - Wearing Course
  { name: "Wearing Course 50mm", name_ar: "طبقة سطحية أسفلت 50مم", category: "asphalt", unit: "m2", unit_price: 28, specifications: "AC 14 Wearing, 50mm thick" },
  { name: "Wearing Course 60mm", name_ar: "طبقة سطحية أسفلت 60مم", category: "asphalt", unit: "m2", unit_price: 33, specifications: "AC 14 Wearing, 60mm thick" },
  // Asphalt - Binder Course
  { name: "Binder Course 60mm", name_ar: "طبقة رابطة أسفلت 60مم", category: "asphalt", unit: "m2", unit_price: 30, specifications: "AC 20 Binder, 60mm thick" },
  { name: "Binder Course 75mm", name_ar: "طبقة رابطة أسفلت 75مم", category: "asphalt", unit: "m2", unit_price: 38, specifications: "AC 20 Binder, 75mm thick" },
  // Asphalt - Base Course
  { name: "Asphalt Base Course 75mm", name_ar: "طبقة أساس أسفلتية 75مم", category: "asphalt", unit: "m2", unit_price: 35, specifications: "AC 25 Base, 75mm thick" },
  { name: "Asphalt Base Course 100mm", name_ar: "طبقة أساس أسفلتية 100مم", category: "asphalt", unit: "m2", unit_price: 45, specifications: "AC 25 Base, 100mm thick" },
  // Asphalt - Coats
  { name: "Prime Coat (MC-30)", name_ar: "طبقة تأسيس (برايم كوت)", category: "asphalt", unit: "m2", unit_price: 5, specifications: "MC-30, 1.0 L/m²" },
  { name: "Tack Coat (CSS-1)", name_ar: "طبقة لاصقة (تاك كوت)", category: "asphalt", unit: "m2", unit_price: 3, specifications: "CSS-1, 0.3 L/m²" },
  // Asphalt - Maintenance
  { name: "Asphalt Milling/Removal", name_ar: "إزالة أسفلت (قشط)", category: "asphalt", unit: "m2", unit_price: 15, specifications: "Cold milling, 50mm depth" },
  { name: "Asphalt Patching", name_ar: "ترقيع أسفلت", category: "asphalt", unit: "m2", unit_price: 55, specifications: "Cut, remove & repave" },
  { name: "Asphalt Cutting (Saw)", name_ar: "قطع أسفلت (منشار)", category: "asphalt", unit: "m", unit_price: 8, specifications: "Diamond saw, full depth" },

  // Road Base Layers
  { name: "Crushed Aggregate Base 200mm", name_ar: "أساس مجروش 200مم", category: "road_base", unit: "m2", unit_price: 25, specifications: "Graded aggregate, compacted 98%" },
  { name: "Crushed Aggregate Base 300mm", name_ar: "أساس مجروش 300مم", category: "road_base", unit: "m2", unit_price: 35, specifications: "Graded aggregate, compacted 98%" },
  { name: "Sand Sub-base 200mm", name_ar: "فرشة رمل أساس 200مم", category: "road_base", unit: "m2", unit_price: 15, specifications: "Select fill, compacted 95%" },
  { name: "Cement Treated Base 200mm", name_ar: "أساس معالج بالأسمنت 200مم", category: "road_base", unit: "m2", unit_price: 40, specifications: "CTB, 4% cement" },

  // Road Accessories
  { name: "Pedestrian Curb 150mm", name_ar: "أرصفة مشاة 150مم", category: "road_accessories", unit: "m", unit_price: 45, specifications: "Precast concrete, 150x300mm" },
  { name: "Road Kerb 150×300", name_ar: "حافة طريق 150×300", category: "road_accessories", unit: "m", unit_price: 55, specifications: "Precast, extruded" },
  { name: "Road Kerb 200×400", name_ar: "حافة طريق 200×400", category: "road_accessories", unit: "m", unit_price: 75, specifications: "Precast, heavy duty" },
  { name: "Jersey Barrier (New)", name_ar: "حاجز نيوجرسي (جديد)", category: "road_accessories", unit: "m", unit_price: 350, specifications: "Precast RC, F-shape" },
  { name: "Road Marking (Thermoplastic)", name_ar: "علامات أرضية (ثرموبلاستك)", category: "road_accessories", unit: "m", unit_price: 12, specifications: "150mm wide, retroreflective" },
  { name: "Traffic Sign (Reflective)", name_ar: "لوحة مرورية عاكسة", category: "road_accessories", unit: "unit", unit_price: 450, specifications: "Aluminum, Class II reflective" },
  { name: "Street Light Pole 9m", name_ar: "عمود إنارة 9م", category: "road_accessories", unit: "unit", unit_price: 2800, specifications: "Hot-dip galvanized, LED 150W" },
  { name: "Street Light Pole 12m", name_ar: "عمود إنارة 12م", category: "road_accessories", unit: "unit", unit_price: 4500, specifications: "Hot-dip galvanized, LED 250W" },

  // Concrete Works (expanded)
  { name: "Ready-Mix Concrete C20", name_ar: "خرسانة جاهزة C20", category: "concrete_works", unit: "m3", unit_price: 280, specifications: "Normal strength" },
  { name: "Ready-Mix Concrete C25", name_ar: "خرسانة جاهزة C25", category: "concrete_works", unit: "m3", unit_price: 320, specifications: "Structural grade" },
  { name: "Ready-Mix Concrete C35", name_ar: "خرسانة جاهزة C35", category: "concrete_works", unit: "m3", unit_price: 420, specifications: "High strength" },
  { name: "Timber Formwork", name_ar: "قوالب خشبية", category: "concrete_works", unit: "m2", unit_price: 65, specifications: "Plywood, 3 uses" },
  { name: "Steel Formwork", name_ar: "قوالب معدنية", category: "concrete_works", unit: "m2", unit_price: 45, specifications: "Steel panels, rental" },
  { name: "Welded Wire Mesh", name_ar: "شبكة حديد ملحومة", category: "concrete_works", unit: "m2", unit_price: 22, specifications: "6mm@150mm, B500" },

  // Safety & Temporary
  { name: "Warning Tape", name_ar: "شريط تحذيري", category: "safety_temporary", unit: "m", unit_price: 0.5, specifications: "PE, red/white or yellow/black" },
  { name: "Pipe Protection Padding", name_ar: "لبادة حماية مواسير", category: "safety_temporary", unit: "m2", unit_price: 8, specifications: "Geotextile, 200g/m²" },
  { name: "Temporary Fencing", name_ar: "سياج مؤقت", category: "safety_temporary", unit: "m", unit_price: 35, specifications: "Steel panels, 2m height" },
  { name: "Temporary Lighting", name_ar: "إضاءة مؤقتة", category: "safety_temporary", unit: "unit", unit_price: 250, specifications: "LED flood light on tripod" },
  { name: "Traffic Cone", name_ar: "مخروط مروري", category: "safety_temporary", unit: "unit", unit_price: 15, specifications: "750mm, reflective" },
];

export const useSampleLibraryData = () => {
  const { user } = useAuth();

  const addSampleMaterials = useCallback(async () => {
    if (!user) return false;

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 3);

      const materialsToInsert = SAMPLE_MATERIALS.map((m, index) => ({
        user_id: user.id,
        name: m.name,
        name_ar: m.name_ar,
        category: m.category,
        unit: m.unit,
        unit_price: m.unit_price,
        brand: m.brand || null,
        currency: "SAR",
        price_date: today.toISOString().split('T')[0],
        valid_until: new Date(validUntil.getTime() - (index * 5 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        is_verified: index < 5,
        source: "sample_data",
        waste_percentage: index % 3 === 0 ? 5 : index % 3 === 1 ? 3 : 0,
      }));

      const { error } = await supabase
        .from('material_prices')
        .insert(materialsToInsert);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding sample materials:', error);
      return false;
    }
  }, [user]);

  const checkExistingNetworkMaterials = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    try {
      const { count, error } = await supabase
        .from('material_prices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source', 'water_sewage_data');
      if (error) throw error;
      return count || 0;
    } catch { return 0; }
  }, [user]);

  const addWaterSewageMaterials = useCallback(async (onProgress?: (percent: number) => void) => {
    if (!user) return false;

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 6);

      const materialsToInsert = WATER_SEWAGE_MATERIALS.map((m, index) => ({
        user_id: user.id,
        name: m.name,
        name_ar: m.name_ar,
        category: m.category,
        unit: m.unit,
        unit_price: m.unit_price,
        brand: m.brand || null,
        specifications: m.specifications || null,
        currency: "SAR",
        price_date: today.toISOString().split('T')[0],
        valid_until: new Date(validUntil.getTime() - (index * 2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        is_verified: true,
        source: "water_sewage_data",
        waste_percentage: 0,
      }));

      const batchSize = 30;
      const totalBatches = Math.ceil(materialsToInsert.length / batchSize);
      for (let i = 0; i < materialsToInsert.length; i += batchSize) {
        const batch = materialsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('material_prices')
          .insert(batch);
        if (error) throw error;
        const completedBatches = Math.floor(i / batchSize) + 1;
        onProgress?.(Math.round((completedBatches / totalBatches) * 100));
      }

      return true;
    } catch (error) {
      console.error('Error adding water/sewage materials:', error);
      return false;
    }
  }, [user]);

  const addSampleLabor = useCallback(async () => {
    if (!user) return false;

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 2);

      const laborToInsert = SAMPLE_LABOR.map((l, index) => ({
        user_id: user.id,
        code: l.code,
        name: l.name,
        name_ar: l.name_ar,
        category: l.category,
        skill_level: l.skill_level,
        unit: "day",
        unit_rate: l.unit_rate,
        working_hours_per_day: l.working_hours_per_day,
        hourly_rate: l.unit_rate / l.working_hours_per_day,
        currency: "SAR",
        overtime_percentage: 50,
        price_date: today.toISOString().split('T')[0],
        valid_until: new Date(validUntil.getTime() - (index * 3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      }));

      const { error } = await supabase
        .from('labor_rates')
        .insert(laborToInsert);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding sample labor:', error);
      return false;
    }
  }, [user]);

  const addSampleEquipment = useCallback(async () => {
    if (!user) return false;

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 2);

      const equipmentToInsert = SAMPLE_EQUIPMENT.map((e, index) => ({
        user_id: user.id,
        code: e.code,
        name: e.name,
        name_ar: e.name_ar,
        category: e.category,
        unit: e.unit || "day",
        rental_rate: e.rental_rate,
        operation_rate: 0,
        hourly_rate: e.rental_rate / 8,
        monthly_rate: e.rental_rate * 26,
        currency: "SAR",
        includes_operator: e.includes_operator,
        includes_fuel: e.includes_fuel,
        price_date: today.toISOString().split('T')[0],
        valid_until: new Date(validUntil.getTime() - (index * 4 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      }));

      const { error } = await supabase
        .from('equipment_rates')
        .insert(equipmentToInsert);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding sample equipment:', error);
      return false;
    }
  }, [user]);

  const addNetworkLaborEquipment = useCallback(async (onProgress?: (percent: number) => void) => {
    if (!user) return false;

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 3);

      const laborToInsert = NETWORK_LABOR.map((l, index) => ({
        user_id: user.id,
        code: l.code, name: l.name, name_ar: l.name_ar,
        category: l.category, skill_level: l.skill_level,
        unit: "day", unit_rate: l.unit_rate,
        working_hours_per_day: l.working_hours_per_day,
        hourly_rate: l.unit_rate / l.working_hours_per_day,
        currency: "SAR", overtime_percentage: 50,
        price_date: today.toISOString().split('T')[0],
        valid_until: new Date(validUntil.getTime() - (index * 3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      }));

      const { error: laborError } = await supabase.from('labor_rates').insert(laborToInsert);
      if (laborError) throw laborError;
      onProgress?.(50);

      const equipmentToInsert = NETWORK_EQUIPMENT.map((e, index) => ({
        user_id: user.id,
        code: e.code, name: e.name, name_ar: e.name_ar,
        category: e.category, unit: "day",
        rental_rate: e.rental_rate, operation_rate: 0,
        hourly_rate: e.rental_rate / 8,
        monthly_rate: e.rental_rate * 26,
        currency: "SAR",
        includes_operator: e.includes_operator,
        includes_fuel: e.includes_fuel,
        price_date: today.toISOString().split('T')[0],
        valid_until: new Date(validUntil.getTime() - (index * 4 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      }));

      const { error: equipError } = await supabase.from('equipment_rates').insert(equipmentToInsert);
      if (equipError) throw equipError;
      onProgress?.(100);

      toast.success(`تم إضافة ${laborToInsert.length} عمالة و ${equipmentToInsert.length} معدة شبكات`);
      return true;
    } catch (error) {
      console.error('Error adding network labor/equipment:', error);
      toast.error('فشل في إضافة عمالة ومعدات الشبكات');
      return false;
    }
  }, [user]);

  const addAllSampleData = useCallback(async () => {
    try {
      const results = await Promise.all([
        addSampleMaterials(),
        addSampleLabor(),
        addSampleEquipment(),
      ]);

      if (results.every(r => r)) {
        toast.success('تم إضافة البيانات التجريبية بنجاح');
        return true;
      } else {
        toast.error('فشل في إضافة بعض البيانات');
        return false;
      }
    } catch (error) {
      console.error('Error adding sample data:', error);
      toast.error('فشل في إضافة البيانات التجريبية');
      return false;
    }
  }, [addSampleMaterials, addSampleLabor, addSampleEquipment]);

  const addAllNetworkData = useCallback(async (onProgress?: (percent: number) => void) => {
    if (!user) return false;
    try {
      const materialsResult = await addWaterSewageMaterials((p) => onProgress?.(Math.round(p * 0.6)));
      if (!materialsResult) return false;
      onProgress?.(60);
      const leResult = await addNetworkLaborEquipment((p) => onProgress?.(60 + Math.round(p * 0.4)));
      if (!leResult) return false;
      onProgress?.(100);
      return true;
    } catch (error) {
      console.error('Error adding all network data:', error);
      return false;
    }
  }, [user, addWaterSewageMaterials, addNetworkLaborEquipment]);

  const deleteAllSampleData = useCallback(async () => {
    if (!user) return false;
    try {
      // Delete ONLY materials with known sample sources (protect user-added data)
      const { error: matError } = await supabase
        .from('material_prices')
        .delete()
        .eq('user_id', user.id)
        .in('source', ['sample_data', 'water_sewage_data', 'earthworks_asphalt_data']);

      // Delete ONLY labor with sample source markers (notes contain 'sample' or specific network sources)
      const { error: laborError } = await supabase
        .from('labor_rates')
        .delete()
        .eq('user_id', user.id)
        .like('notes', '%[sample_data]%');

      // Delete ONLY equipment with sample source markers
      const { error: equipError } = await supabase
        .from('equipment_rates')
        .delete()
        .eq('user_id', user.id)
        .like('notes', '%[sample_data]%');

      if (matError || laborError || equipError) {
        console.error('Delete errors:', { matError, laborError, equipError });
        toast.error('فشل في حذف بعض البيانات');
        return false;
      }

      toast.success('تم حذف جميع البيانات التجريبية بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting sample data:', error);
      toast.error('فشل في حذف البيانات');
      return false;
    }
  }, [user]);

  const deleteNetworkDataOnly = useCallback(async () => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('material_prices')
        .delete()
        .eq('user_id', user.id)
        .eq('source', 'water_sewage_data');

      if (error) throw error;
      toast.success('تم حذف بيانات الشبكات بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting network data:', error);
      toast.error('فشل في حذف بيانات الشبكات');
      return false;
    }
  }, [user]);

  const addEarthworksAsphaltMaterials = useCallback(async (onProgress?: (percent: number) => void) => {
    if (!user) return false;

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 6);

      const materialsToInsert = EARTHWORKS_ASPHALT_MATERIALS.map((m, index) => ({
        user_id: user.id,
        name: m.name,
        name_ar: m.name_ar,
        category: m.category,
        unit: m.unit,
        unit_price: m.unit_price,
        specifications: m.specifications || null,
        brand: null,
        currency: "SAR",
        price_date: today.toISOString().split('T')[0],
        valid_until: new Date(validUntil.getTime() - (index * 2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        is_verified: true,
        source: "earthworks_asphalt_data",
        waste_percentage: 0,
      }));

      const batchSize = 25;
      const totalBatches = Math.ceil(materialsToInsert.length / batchSize);
      for (let i = 0; i < materialsToInsert.length; i += batchSize) {
        const batch = materialsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('material_prices')
          .insert(batch);
        if (error) throw error;
        const completedBatches = Math.floor(i / batchSize) + 1;
        onProgress?.(Math.round((completedBatches / totalBatches) * 100));
      }

      return true;
    } catch (error) {
      console.error('Error adding earthworks/asphalt materials:', error);
      return false;
    }
  }, [user]);

  const checkExistingEarthworksMaterials = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    try {
      const { count, error } = await supabase
        .from('material_prices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source', 'earthworks_asphalt_data');
      if (error) throw error;
      return count || 0;
    } catch { return 0; }
  }, [user]);

  return {
    addSampleMaterials,
    addSampleLabor,
    addSampleEquipment,
    addAllSampleData,
    addWaterSewageMaterials,
    addNetworkLaborEquipment,
    addAllNetworkData,
    checkExistingNetworkMaterials,
    deleteAllSampleData,
    deleteNetworkDataOnly,
    addEarthworksAsphaltMaterials,
    checkExistingEarthworksMaterials,
    sampleCounts: {
      materials: SAMPLE_MATERIALS.length,
      labor: SAMPLE_LABOR.length,
      equipment: SAMPLE_EQUIPMENT.length,
      waterSewage: WATER_SEWAGE_MATERIALS.length,
      networkLabor: NETWORK_LABOR.length,
      networkEquipment: NETWORK_EQUIPMENT.length,
      earthworksAsphalt: EARTHWORKS_ASPHALT_MATERIALS.length,
    },
  };
};
