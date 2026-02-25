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

// Sample Labor Data (10 items)
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

// Sample Equipment Data (10 items)
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

  const addWaterSewageMaterials = useCallback(async () => {
    if (!user) return false;

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 6); // Valid for 6 months

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

      // Insert in batches of 30 to avoid payload limits
      const batchSize = 30;
      for (let i = 0; i < materialsToInsert.length; i += batchSize) {
        const batch = materialsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('material_prices')
          .insert(batch);
        if (error) throw error;
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

  return {
    addSampleMaterials,
    addSampleLabor,
    addSampleEquipment,
    addAllSampleData,
    addWaterSewageMaterials,
    sampleCounts: {
      materials: SAMPLE_MATERIALS.length,
      labor: SAMPLE_LABOR.length,
      equipment: SAMPLE_EQUIPMENT.length,
      waterSewage: WATER_SEWAGE_MATERIALS.length,
    },
  };
};
