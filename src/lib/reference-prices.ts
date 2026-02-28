// Built-in reference prices for common construction items (Saudi Arabia market 2025)
export interface ReferencePrice {
  keywords: string[];
  keywordsAr: string[];
  unit: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  category: string;
}

export const REFERENCE_PRICES: ReferencePrice[] = [
  // Concrete works
  { keywords: ["concrete", "ready mix", "grade 30", "grade 40", "c30", "c40"], keywordsAr: ["خرسانة", "جاهزة", "مسلحة"], unit: "m3", minPrice: 250, maxPrice: 450, avgPrice: 350, category: "concrete" },
  { keywords: ["lean concrete", "blinding", "plain concrete"], keywordsAr: ["خرسانة عادية", "نظافة"], unit: "m3", minPrice: 180, maxPrice: 280, avgPrice: 230, category: "concrete" },
  { keywords: ["rebar", "reinforcement", "steel bar", "deformed bar"], keywordsAr: ["حديد تسليح", "حديد"], unit: "ton", minPrice: 2800, maxPrice: 4200, avgPrice: 3500, category: "concrete" },
  { keywords: ["formwork", "shuttering"], keywordsAr: ["شدات", "قوالب"], unit: "m2", minPrice: 45, maxPrice: 120, avgPrice: 80, category: "concrete" },
  { keywords: ["precast concrete", "precast"], keywordsAr: ["خرسانة سابقة", "مسبقة الصب"], unit: "m3", minPrice: 400, maxPrice: 800, avgPrice: 600, category: "concrete" },
  // Earthworks
  { keywords: ["excavation", "excavate", "earth cutting", "cut"], keywordsAr: ["حفر", "حفريات"], unit: "m3", minPrice: 8, maxPrice: 35, avgPrice: 18, category: "earthworks" },
  { keywords: ["backfill", "fill", "backfilling"], keywordsAr: ["ردم", "ردميات"], unit: "m3", minPrice: 15, maxPrice: 45, avgPrice: 28, category: "earthworks" },
  { keywords: ["compaction", "compact"], keywordsAr: ["دمك"], unit: "m3", minPrice: 5, maxPrice: 18, avgPrice: 10, category: "earthworks" },
  { keywords: ["grading", "leveling", "ground preparation"], keywordsAr: ["تسوية", "تمهيد"], unit: "m2", minPrice: 3, maxPrice: 12, avgPrice: 7, category: "earthworks" },
  { keywords: ["rock excavation", "rock breaking"], keywordsAr: ["حفر صخري", "تكسير صخور"], unit: "m3", minPrice: 40, maxPrice: 120, avgPrice: 75, category: "earthworks" },
  { keywords: ["dewatering"], keywordsAr: ["نزح مياه", "سحب مياه"], unit: "day", minPrice: 500, maxPrice: 2000, avgPrice: 1200, category: "earthworks" },
  // Pipes
  { keywords: ["hdpe pipe", "hdpe"], keywordsAr: ["أنابيب اتش دي", "بولي ايثيلين"], unit: "m", minPrice: 30, maxPrice: 250, avgPrice: 120, category: "pipes" },
  { keywords: ["upvc pipe", "pvc pipe", "upvc"], keywordsAr: ["أنابيب يو بي في سي", "بي في سي"], unit: "m", minPrice: 20, maxPrice: 180, avgPrice: 80, category: "pipes" },
  { keywords: ["ductile iron pipe", "di pipe"], keywordsAr: ["أنابيب حديد دكتايل", "دكتايل"], unit: "m", minPrice: 80, maxPrice: 400, avgPrice: 200, category: "pipes" },
  { keywords: ["grp pipe", "fiberglass pipe"], keywordsAr: ["أنابيب فايبرجلاس"], unit: "m", minPrice: 60, maxPrice: 350, avgPrice: 180, category: "pipes" },
  { keywords: ["manhole", "inspection chamber"], keywordsAr: ["غرفة تفتيش", "مانهول", "غرف"], unit: "no", minPrice: 1500, maxPrice: 8000, avgPrice: 4000, category: "pipes" },
  { keywords: ["catch basin", "gully trap"], keywordsAr: ["حوض تجميع", "مصيدة"], unit: "no", minPrice: 800, maxPrice: 3000, avgPrice: 1800, category: "pipes" },
  { keywords: ["valve", "gate valve", "butterfly valve"], keywordsAr: ["محبس", "صمام"], unit: "no", minPrice: 200, maxPrice: 5000, avgPrice: 1500, category: "pipes" },
  { keywords: ["fire hydrant", "hydrant"], keywordsAr: ["حنفية حريق", "هيدرانت"], unit: "no", minPrice: 2000, maxPrice: 6000, avgPrice: 3500, category: "pipes" },
  // Electrical
  { keywords: ["cable", "power cable", "xlpe cable", "electrical cable"], keywordsAr: ["كابل", "كابلات", "كيبل"], unit: "m", minPrice: 15, maxPrice: 500, avgPrice: 120, category: "electrical" },
  { keywords: ["street light", "lighting pole", "street lighting"], keywordsAr: ["إنارة", "عمود إنارة", "أعمدة إنارة"], unit: "no", minPrice: 2000, maxPrice: 8000, avgPrice: 4500, category: "electrical" },
  { keywords: ["transformer", "power transformer"], keywordsAr: ["محول", "محولات"], unit: "no", minPrice: 15000, maxPrice: 80000, avgPrice: 40000, category: "electrical" },
  { keywords: ["cable tray"], keywordsAr: ["حاملة كابلات", "سلم كابلات"], unit: "m", minPrice: 40, maxPrice: 200, avgPrice: 100, category: "electrical" },
  { keywords: ["conduit", "electrical conduit"], keywordsAr: ["مواسير كهرباء", "قناة"], unit: "m", minPrice: 5, maxPrice: 40, avgPrice: 18, category: "electrical" },
  { keywords: ["distribution board", "panel board", "db"], keywordsAr: ["لوحة توزيع", "طبلون"], unit: "no", minPrice: 500, maxPrice: 5000, avgPrice: 2000, category: "electrical" },
  // Roads & pavement
  { keywords: ["asphalt", "bituminous", "wearing course", "binder course", "hot mix"], keywordsAr: ["أسفلت", "خلطة إسفلتية"], unit: "ton", minPrice: 150, maxPrice: 350, avgPrice: 250, category: "roads" },
  { keywords: ["subbase", "sub base", "aggregate base"], keywordsAr: ["طبقة أساس", "سب بيس"], unit: "m3", minPrice: 30, maxPrice: 80, avgPrice: 55, category: "roads" },
  { keywords: ["base course", "granular base"], keywordsAr: ["طبقة أساسية"], unit: "m3", minPrice: 40, maxPrice: 100, avgPrice: 65, category: "roads" },
  { keywords: ["curb", "kerb", "curbstone"], keywordsAr: ["بردورة", "رصيف", "كربستون"], unit: "m", minPrice: 25, maxPrice: 80, avgPrice: 50, category: "roads" },
  { keywords: ["interlock", "interlocking", "paver", "block paving"], keywordsAr: ["إنترلوك", "بلاط متداخل"], unit: "m2", minPrice: 40, maxPrice: 120, avgPrice: 75, category: "roads" },
  { keywords: ["road marking", "line marking", "thermoplastic marking"], keywordsAr: ["خطوط طرق", "دهان طرق", "علامات"], unit: "m", minPrice: 5, maxPrice: 25, avgPrice: 12, category: "roads" },
  { keywords: ["guardrail", "guard rail", "barrier"], keywordsAr: ["حاجز", "درابزين طريق"], unit: "m", minPrice: 80, maxPrice: 250, avgPrice: 150, category: "roads" },
  { keywords: ["traffic sign", "road sign"], keywordsAr: ["لوحة مرورية", "إشارة"], unit: "no", minPrice: 200, maxPrice: 800, avgPrice: 450, category: "roads" },
  // Structural steel
  { keywords: ["structural steel", "steel structure", "steel fabrication"], keywordsAr: ["هيكل حديدي", "حديد إنشائي"], unit: "ton", minPrice: 5000, maxPrice: 12000, avgPrice: 8000, category: "structural" },
  { keywords: ["steel pile", "piling", "bored pile", "driven pile"], keywordsAr: ["خوازيق", "أوتاد"], unit: "m", minPrice: 200, maxPrice: 800, avgPrice: 450, category: "structural" },
  { keywords: ["retaining wall"], keywordsAr: ["جدار استنادي", "حائط ساند"], unit: "m3", minPrice: 300, maxPrice: 700, avgPrice: 500, category: "structural" },
  // Waterproofing & insulation
  { keywords: ["waterproofing", "water proofing", "membrane"], keywordsAr: ["عزل مائي", "عزل"], unit: "m2", minPrice: 15, maxPrice: 80, avgPrice: 40, category: "waterproofing" },
  { keywords: ["thermal insulation", "insulation board"], keywordsAr: ["عزل حراري"], unit: "m2", minPrice: 20, maxPrice: 80, avgPrice: 45, category: "waterproofing" },
  { keywords: ["epoxy", "epoxy coating", "epoxy flooring"], keywordsAr: ["إيبوكسي", "طلاء إيبوكسي"], unit: "m2", minPrice: 30, maxPrice: 120, avgPrice: 65, category: "waterproofing" },
  { keywords: ["painting", "paint", "emulsion"], keywordsAr: ["دهان", "طلاء", "بوية"], unit: "m2", minPrice: 8, maxPrice: 35, avgPrice: 18, category: "finishing" },
  // Finishing
  { keywords: ["tiles", "ceramic", "porcelain", "floor tiles"], keywordsAr: ["بلاط", "سيراميك", "بورسلان"], unit: "m2", minPrice: 30, maxPrice: 150, avgPrice: 75, category: "finishing" },
  { keywords: ["plastering", "plaster", "render"], keywordsAr: ["لياسة", "بياض"], unit: "m2", minPrice: 15, maxPrice: 45, avgPrice: 28, category: "finishing" },
  { keywords: ["false ceiling", "suspended ceiling", "gypsum board"], keywordsAr: ["سقف مستعار", "جبسون بورد"], unit: "m2", minPrice: 35, maxPrice: 120, avgPrice: 70, category: "finishing" },
  { keywords: ["door", "wooden door", "steel door"], keywordsAr: ["باب", "أبواب"], unit: "no", minPrice: 300, maxPrice: 3000, avgPrice: 1200, category: "finishing" },
  { keywords: ["window", "aluminum window", "upvc window"], keywordsAr: ["نافذة", "شباك", "نوافذ"], unit: "m2", minPrice: 200, maxPrice: 800, avgPrice: 450, category: "finishing" },
  // Demolition
  { keywords: ["demolition", "demolish", "removal", "breaking"], keywordsAr: ["هدم", "إزالة", "تكسير"], unit: "m3", minPrice: 20, maxPrice: 80, avgPrice: 45, category: "demolition" },
  // Fencing
  { keywords: ["fence", "fencing", "chain link", "boundary wall"], keywordsAr: ["سور", "سياج", "شبك"], unit: "m", minPrice: 50, maxPrice: 300, avgPrice: 150, category: "general" },
  // Landscaping
  { keywords: ["landscaping", "planting", "grass", "turf", "irrigation"], keywordsAr: ["تنسيق حدائق", "زراعة", "عشب", "ري"], unit: "m2", minPrice: 20, maxPrice: 100, avgPrice: 50, category: "landscaping" },
  // Mobilization
  { keywords: ["mobilization", "site establishment"], keywordsAr: ["تجهيز موقع", "حشد"], unit: "ls", minPrice: 50000, maxPrice: 500000, avgPrice: 150000, category: "general" },
  // Temporary works
  { keywords: ["scaffolding", "scaffold"], keywordsAr: ["سقالات", "سقالة"], unit: "m2", minPrice: 10, maxPrice: 40, avgPrice: 22, category: "temporary" },
  { keywords: ["site office", "temporary office", "portacabin"], keywordsAr: ["مكتب موقع", "بورتاكابن"], unit: "no", minPrice: 5000, maxPrice: 25000, avgPrice: 12000, category: "temporary" },
  // MEP
  { keywords: ["air conditioning", "hvac", "ac unit", "split unit"], keywordsAr: ["تكييف", "مكيف"], unit: "no", minPrice: 1500, maxPrice: 15000, avgPrice: 5000, category: "mep" },
  { keywords: ["fire alarm", "fire detection"], keywordsAr: ["إنذار حريق", "كشف حريق"], unit: "no", minPrice: 100, maxPrice: 800, avgPrice: 350, category: "mep" },
  { keywords: ["sprinkler", "fire sprinkler"], keywordsAr: ["رشاش", "رشاشات حريق"], unit: "no", minPrice: 50, maxPrice: 300, avgPrice: 150, category: "mep" },
  { keywords: ["pump", "water pump", "submersible pump"], keywordsAr: ["مضخة", "طلمبة"], unit: "no", minPrice: 2000, maxPrice: 30000, avgPrice: 10000, category: "mep" },
  { keywords: ["water tank", "storage tank"], keywordsAr: ["خزان مياه", "خزان"], unit: "no", minPrice: 3000, maxPrice: 50000, avgPrice: 15000, category: "mep" },
  // Culverts
  { keywords: ["culvert", "box culvert", "pipe culvert"], keywordsAr: ["عبارة", "كلفرت"], unit: "m", minPrice: 500, maxPrice: 3000, avgPrice: 1500, category: "pipes" },
  // Geotextile
  { keywords: ["geotextile", "geomembrane", "geogrid"], keywordsAr: ["جيوتكستايل", "نسيج أرضي"], unit: "m2", minPrice: 5, maxPrice: 30, avgPrice: 15, category: "earthworks" },
  // Concrete accessories
  { keywords: ["expansion joint", "joint sealant"], keywordsAr: ["فاصل تمدد", "فواصل"], unit: "m", minPrice: 30, maxPrice: 150, avgPrice: 75, category: "concrete" },
  { keywords: ["concrete block", "block work", "cmu", "hollow block"], keywordsAr: ["بلك", "بلوك", "طوب"], unit: "m2", minPrice: 25, maxPrice: 80, avgPrice: 50, category: "masonry" },

  // ============= MEP - Electrical (Extended) =============
  { keywords: ["main distribution board", "mdb", "main db"], keywordsAr: ["لوحة توزيع رئيسية", "لوحة رئيسية"], unit: "no", minPrice: 5000, maxPrice: 35000, avgPrice: 15000, category: "electrical" },
  { keywords: ["sub distribution board", "sdb", "sub db"], keywordsAr: ["لوحة توزيع فرعية", "لوحة فرعية"], unit: "no", minPrice: 2000, maxPrice: 12000, avgPrice: 6000, category: "electrical" },
  { keywords: ["circuit breaker", "mcb", "mccb", "breaker"], keywordsAr: ["قاطع كهربائي", "قاطع دارة"], unit: "no", minPrice: 20, maxPrice: 800, avgPrice: 150, category: "electrical" },
  { keywords: ["switchgear", "switch gear", "lv switchgear", "mv switchgear"], keywordsAr: ["لوحة تحويل", "سويتش جير"], unit: "no", minPrice: 15000, maxPrice: 120000, avgPrice: 50000, category: "electrical" },
  { keywords: ["socket outlet", "power socket", "socket", "outlet"], keywordsAr: ["مقبس كهرباء", "بريزة", "مأخذ كهربائي"], unit: "no", minPrice: 15, maxPrice: 80, avgPrice: 35, category: "electrical" },
  { keywords: ["light switch", "switch plate", "dimmer"], keywordsAr: ["مفتاح إنارة", "مفتاح كهرباء"], unit: "no", minPrice: 10, maxPrice: 60, avgPrice: 30, category: "electrical" },
  { keywords: ["led light", "led panel", "led downlight", "led fixture"], keywordsAr: ["إضاءة ليد", "لمبة ليد", "كشاف ليد"], unit: "no", minPrice: 30, maxPrice: 350, avgPrice: 120, category: "electrical" },
  { keywords: ["emergency light", "exit light", "emergency lighting"], keywordsAr: ["إنارة طوارئ", "لمبة طوارئ"], unit: "no", minPrice: 50, maxPrice: 300, avgPrice: 150, category: "electrical" },
  { keywords: ["ups", "uninterruptible power supply"], keywordsAr: ["يو بي اس", "مزود طاقة"], unit: "no", minPrice: 2000, maxPrice: 50000, avgPrice: 15000, category: "electrical" },
  { keywords: ["generator", "diesel generator", "standby generator"], keywordsAr: ["مولد كهربائي", "مولد ديزل", "مولد احتياطي"], unit: "no", minPrice: 20000, maxPrice: 500000, avgPrice: 120000, category: "electrical" },
  { keywords: ["earthing", "grounding", "earth pit", "ground rod"], keywordsAr: ["تأريض", "أرضي", "حفرة تأريض"], unit: "no", minPrice: 200, maxPrice: 1500, avgPrice: 600, category: "electrical" },
  { keywords: ["lightning protection", "lightning rod", "lightning arrester"], keywordsAr: ["حماية صواعق", "مانعة صواعق"], unit: "no", minPrice: 500, maxPrice: 5000, avgPrice: 2000, category: "electrical" },
  { keywords: ["data cable", "cat6", "cat6a", "network cable"], keywordsAr: ["كابل شبكة", "كابل بيانات"], unit: "m", minPrice: 5, maxPrice: 25, avgPrice: 12, category: "electrical" },
  { keywords: ["busbar", "bus bar", "busway", "bus duct"], keywordsAr: ["بسبار", "قضبان توصيل"], unit: "m", minPrice: 200, maxPrice: 1500, avgPrice: 600, category: "electrical" },

  // ============= MEP - Plumbing =============
  { keywords: ["ppr pipe", "ppr", "polypropylene pipe"], keywordsAr: ["مواسير بي بي آر", "أنابيب بي بي آر"], unit: "m", minPrice: 8, maxPrice: 45, avgPrice: 22, category: "plumbing" },
  { keywords: ["cpvc pipe", "cpvc"], keywordsAr: ["مواسير سي بي في سي"], unit: "m", minPrice: 10, maxPrice: 50, avgPrice: 25, category: "plumbing" },
  { keywords: ["copper pipe", "copper tube"], keywordsAr: ["مواسير نحاس", "أنابيب نحاس"], unit: "m", minPrice: 25, maxPrice: 120, avgPrice: 60, category: "plumbing" },
  { keywords: ["drainage pipe", "soil pipe", "waste pipe", "upvc drainage"], keywordsAr: ["مواسير صرف", "أنابيب صرف صحي"], unit: "m", minPrice: 15, maxPrice: 80, avgPrice: 40, category: "plumbing" },
  { keywords: ["wash basin", "lavatory", "hand basin"], keywordsAr: ["حوض غسيل", "مغسلة", "حوض يد"], unit: "no", minPrice: 150, maxPrice: 1500, avgPrice: 500, category: "plumbing" },
  { keywords: ["water closet", "wc", "toilet", "toilet seat"], keywordsAr: ["مرحاض", "كرسي حمام", "توالت"], unit: "no", minPrice: 300, maxPrice: 3000, avgPrice: 1000, category: "plumbing" },
  { keywords: ["water heater", "boiler", "geyser", "electric heater"], keywordsAr: ["سخان مياه", "بويلر", "سخان كهربائي"], unit: "no", minPrice: 500, maxPrice: 5000, avgPrice: 1800, category: "plumbing" },
  { keywords: ["mixer", "faucet", "tap", "water mixer"], keywordsAr: ["خلاط", "حنفية", "صنبور"], unit: "no", minPrice: 80, maxPrice: 800, avgPrice: 300, category: "plumbing" },
  { keywords: ["floor drain", "floor trap"], keywordsAr: ["مصرف أرضي", "بالوعة"], unit: "no", minPrice: 20, maxPrice: 150, avgPrice: 60, category: "plumbing" },
  { keywords: ["shower", "shower head", "shower mixer"], keywordsAr: ["دش", "رأس دش", "خلاط دش"], unit: "no", minPrice: 100, maxPrice: 1200, avgPrice: 400, category: "plumbing" },
  { keywords: ["bathtub", "bath tub"], keywordsAr: ["حوض استحمام", "بانيو"], unit: "no", minPrice: 500, maxPrice: 5000, avgPrice: 2000, category: "plumbing" },
  { keywords: ["kitchen sink", "sink"], keywordsAr: ["حوض مطبخ", "مجلى"], unit: "no", minPrice: 200, maxPrice: 2000, avgPrice: 800, category: "plumbing" },

  // ============= MEP - HVAC =============
  { keywords: ["chiller", "water cooled chiller", "air cooled chiller"], keywordsAr: ["تشيلر", "مبرد مياه", "مبرد هواء"], unit: "no", minPrice: 50000, maxPrice: 500000, avgPrice: 180000, category: "hvac" },
  { keywords: ["air handling unit", "ahu"], keywordsAr: ["وحدة مناولة هواء", "إيه إتش يو"], unit: "no", minPrice: 15000, maxPrice: 120000, avgPrice: 50000, category: "hvac" },
  { keywords: ["fan coil unit", "fcu"], keywordsAr: ["وحدة ملف مروحة", "فان كويل"], unit: "no", minPrice: 800, maxPrice: 5000, avgPrice: 2500, category: "hvac" },
  { keywords: ["ductwork", "gi duct", "galvanized duct", "air duct"], keywordsAr: ["مجاري هواء", "دكت", "مجرى هواء"], unit: "kg", minPrice: 8, maxPrice: 25, avgPrice: 15, category: "hvac" },
  { keywords: ["diffuser", "air diffuser", "supply diffuser", "return grille"], keywordsAr: ["موزع هواء", "فتحة هواء", "شبكة هواء"], unit: "no", minPrice: 30, maxPrice: 200, avgPrice: 80, category: "hvac" },
  { keywords: ["thermostat", "room thermostat", "digital thermostat"], keywordsAr: ["ثرموستات", "منظم حرارة"], unit: "no", minPrice: 50, maxPrice: 500, avgPrice: 200, category: "hvac" },
  { keywords: ["vrf", "vrv", "variable refrigerant"], keywordsAr: ["في آر إف", "تكييف متغير التبريد"], unit: "no", minPrice: 5000, maxPrice: 50000, avgPrice: 20000, category: "hvac" },
  { keywords: ["split unit", "split ac", "wall mounted ac"], keywordsAr: ["سبلت", "مكيف سبلت", "مكيف جداري"], unit: "no", minPrice: 1500, maxPrice: 8000, avgPrice: 3500, category: "hvac" },
  { keywords: ["package unit", "packaged unit", "rooftop unit"], keywordsAr: ["باكج", "وحدة مركبة"], unit: "no", minPrice: 8000, maxPrice: 60000, avgPrice: 25000, category: "hvac" },
  { keywords: ["duct insulation", "thermal duct insulation"], keywordsAr: ["عزل مجاري هواء", "عزل دكت"], unit: "m2", minPrice: 15, maxPrice: 60, avgPrice: 35, category: "hvac" },
  { keywords: ["exhaust fan", "ventilation fan", "extract fan"], keywordsAr: ["مروحة شفط", "مروحة تهوية"], unit: "no", minPrice: 100, maxPrice: 2000, avgPrice: 500, category: "hvac" },

  // ============= MEP - Fire Fighting =============
  { keywords: ["sprinkler system", "sprinkler network", "fire sprinkler system"], keywordsAr: ["نظام رشاشات", "شبكة رشاشات حريق"], unit: "no", minPrice: 30, maxPrice: 200, avgPrice: 100, category: "fire_fighting" },
  { keywords: ["fire hose cabinet", "fire cabinet", "hose reel cabinet"], keywordsAr: ["صندوق حريق", "خزانة حريق", "بكرة خرطوم"], unit: "no", minPrice: 500, maxPrice: 3000, avgPrice: 1500, category: "fire_fighting" },
  { keywords: ["fire extinguisher", "extinguisher", "co2 extinguisher", "powder extinguisher"], keywordsAr: ["طفاية حريق", "طفاية"], unit: "no", minPrice: 50, maxPrice: 500, avgPrice: 200, category: "fire_fighting" },
  { keywords: ["fire alarm panel", "fire alarm control panel", "facp"], keywordsAr: ["لوحة إنذار حريق", "لوحة تحكم حريق"], unit: "no", minPrice: 3000, maxPrice: 25000, avgPrice: 10000, category: "fire_fighting" },
  { keywords: ["smoke detector", "optical smoke detector"], keywordsAr: ["كاشف دخان", "حساس دخان"], unit: "no", minPrice: 30, maxPrice: 200, avgPrice: 80, category: "fire_fighting" },
  { keywords: ["heat detector", "thermal detector"], keywordsAr: ["كاشف حرارة", "حساس حرارة"], unit: "no", minPrice: 25, maxPrice: 180, avgPrice: 70, category: "fire_fighting" },
  { keywords: ["fire pump", "jockey pump", "fire fighting pump"], keywordsAr: ["مضخة حريق", "طلمبة حريق"], unit: "no", minPrice: 5000, maxPrice: 80000, avgPrice: 30000, category: "fire_fighting" },
  { keywords: ["fm200", "fm-200", "clean agent", "gas suppression"], keywordsAr: ["إف إم 200", "غاز إطفاء نظيف"], unit: "no", minPrice: 10000, maxPrice: 100000, avgPrice: 40000, category: "fire_fighting" },

  // ============= MEP - Smart/BMS =============
  { keywords: ["bms", "building management system", "building automation"], keywordsAr: ["نظام إدارة المبنى", "بي إم إس", "أتمتة مبنى"], unit: "no", minPrice: 50000, maxPrice: 500000, avgPrice: 150000, category: "smart" },
  { keywords: ["cctv", "surveillance camera", "security camera", "ip camera"], keywordsAr: ["كاميرا مراقبة", "نظام مراقبة", "كاميرا أمنية"], unit: "no", minPrice: 300, maxPrice: 3000, avgPrice: 1000, category: "smart" },
  { keywords: ["access control", "card reader", "biometric access"], keywordsAr: ["نظام دخول", "تحكم دخول", "قارئ بطاقة"], unit: "no", minPrice: 500, maxPrice: 5000, avgPrice: 2000, category: "smart" },
  { keywords: ["intercom", "video intercom", "door phone"], keywordsAr: ["إنتركم", "اتصال داخلي", "هاتف باب"], unit: "no", minPrice: 200, maxPrice: 3000, avgPrice: 1000, category: "smart" },
  { keywords: ["public address", "pa system", "sound system", "speaker system"], keywordsAr: ["نظام صوت", "مكبرات صوت", "نظام إذاعة"], unit: "no", minPrice: 5000, maxPrice: 50000, avgPrice: 20000, category: "smart" },
];
