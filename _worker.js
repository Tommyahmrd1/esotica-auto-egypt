const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...extra}});
const bad=(message,status=400)=>json({error:message},status);
// Limits apply to both language versions; blank values restore the approved copy.
const CMS_CONTENT_LIMITS=Object.fromEntries([
 ["service_maintenance_title",160],
 ["service_maintenance_description",600],
 ["service_body_paint_title",160],
 ["service_body_paint_description",600],
 ["service_parts_title",160],
 ["service_parts_description",600],
 ["service_inspection_title",160],
 ["service_inspection_description",600],
 ["service_mobile_title",160],
 ["service_mobile_description",600],
 ["service_followup_title",160],
 ["service_followup_description",600],
 ["warranty_intro_title",160],
 ["warranty_intro_description",600],
 ["warranty_eligibility_title",160],
 ["warranty_eligibility_description",600],
 ["warranty_coverage_title",160],
 ["warranty_coverage_description",600],
 ["warranty_booklet_title",160],
 ["warranty_booklet_description",600],
 ["warranty_support_title",160],
 ["warranty_support_description",600],
 ["warranty_note_title",160],
 ["warranty_note_description",600],
 ["warranty_cta",80],
 ["insurance_intro_title",160],
 ["insurance_intro_description",600],
 ["insurance_trust_title",160],
 ["insurance_trust_description",600],
 ["insurance_point_assessment",160],
 ["insurance_point_followup",160],
 ["insurance_point_quality",160],
 ["insurance_process_title",160],
 ["insurance_assessment_title",160],
 ["insurance_assessment_description",600],
 ["insurance_documentation_title",160],
 ["insurance_documentation_description",600],
 ["insurance_approval_title",160],
 ["insurance_approval_description",600],
 ["insurance_repair_title",160],
 ["insurance_repair_description",600],
 ["insurance_partners_title",160],
 ["insurance_partners_description",600],
 ["insurance_cta_title",160],
 ["insurance_cta_description",600],
 ["insurance_cta",80],
 ["insurance_disclaimer",600]
].flatMap(([key,max])=>[[key,max],[`${key}_en`,max]]));

const ENGLISH_PAGE_META={
 "/":["Esotica Auto | Range Rover, Jaguar & Luxury Car Service","Specialist Range Rover, Land Rover and Jaguar maintenance, diagnostics, spare parts and luxury car care in New Cairo and Sheikh Zayed."],
 "/services":["Luxury Car Maintenance Services | Esotica Auto","Maintenance, diagnostics, inspection, body and paint, spare parts and selected services for Range Rover, Jaguar and luxury vehicles."],
 "/booking":["Book a Car Service Appointment | Esotica Auto","Request a preferred service appointment, branch, date and time. The Esotica Auto team will contact you to confirm."],
 "/parts":["Luxury Car Spare Parts Enquiry | Esotica Auto","Send your vehicle details and VIN to enquire about the correct spare part, availability and price."],
 "/branches":["Esotica Auto Service Center Locations","Find Esotica Auto service centers in New Cairo and Sheikh Zayed, with directions and working hours."],
 "/branches/fifth-settlement":["Fifth Settlement Service Center | Esotica Auto","Range Rover, Jaguar and luxury car service at Esotica Auto Fifth Settlement."],
 "/branches/third-settlement":["Third Settlement Service Center | Esotica Auto","Range Rover, Jaguar and luxury car service at Esotica Auto Third Settlement industrial area."],
 "/branches/sheikh-zayed":["Sheikh Zayed Service Center | Esotica Auto","Range Rover, Jaguar and luxury car service at Esotica Auto Sheikh Zayed."],
 "/offers":["Car Service Offers & Events | Esotica Auto","Explore current maintenance offers, mobile services and seasonal Esotica Auto events."],
 "/warranty-insurance":["Car Warranty & Insurance Support | Esotica Auto","Explore Esotica Warranty and insurance repair support, from inspection and documentation to repair and delivery."],
 "/about":["About Esotica Auto | Luxury Car Specialists","Learn about Esotica Auto's specialist Range Rover and Jaguar expertise and selected luxury car services."],
 "/contact":["Contact Esotica Auto | Luxury Car Service","Contact Esotica Auto for maintenance, booking, warranty, insurance or spare-parts enquiries."],
 "/privacy":["Privacy Policy | Esotica Auto","Learn how Esotica Auto uses and protects information submitted through the website and customer-service channels."],
 "/range-rover-land-rover-service":["Range Rover & Land Rover Service | Esotica Auto","Specialist Range Rover and Land Rover maintenance, diagnostics, inspection and spare-parts services."],
 "/jaguar-service":["Jaguar Service Center | Esotica Auto","Jaguar maintenance, diagnostics, inspection and spare-parts services in Cairo."],
 "/luxury-car-service":["Luxury Car Service Center | Esotica Auto","Selected maintenance, diagnostics, inspection and spare-parts services for luxury and performance vehicles."],
 "/bmw-service":["BMW Service Center | Esotica Auto","Selected BMW maintenance, diagnostics, inspection and spare-parts services."],
 "/mercedes-service":["Mercedes-Benz Service Center | Esotica Auto","Selected Mercedes-Benz maintenance, diagnostics, inspection and spare-parts services."],
 "/porsche-service":["Porsche Service Center | Esotica Auto","Selected Porsche maintenance, diagnostics, inspection and spare-parts services."],
 "/bentley-service":["Bentley Service Center | Esotica Auto","Selected Bentley maintenance, diagnostics, inspection and spare-parts services."],
 "/maserati-service":["Maserati Service Center | Esotica Auto","Selected Maserati maintenance, diagnostics, inspection and spare-parts services."],
 "/ferrari-service":["Ferrari Service Center | Esotica Auto","Selected Ferrari maintenance, diagnostics, inspection and spare-parts services."],
 "/lamborghini-service":["Lamborghini Service Center | Esotica Auto","Selected Lamborghini maintenance, diagnostics, inspection and spare-parts services."],
 "/aston-martin-service":["Aston Martin Service Center | Esotica Auto","Selected Aston Martin maintenance, diagnostics, inspection and spare-parts services."],
 "/mclaren-service":["McLaren Service Center | Esotica Auto","Selected McLaren maintenance, diagnostics, inspection and spare-parts services."],
 "/rolls-royce-service":["Rolls-Royce Service Center | Esotica Auto","Selected Rolls-Royce maintenance, diagnostics, inspection and spare-parts services."],
 "/corvette-service":["Corvette Service Center | Esotica Auto","Selected Corvette maintenance, diagnostics, inspection and spare-parts services."]
};
function englishPage(url){
 if(url.pathname!=="/en"&&!url.pathname.startsWith("/en/"))return null;
 const basePath=(url.pathname.slice(3).replace(/\/$/,"")||"/").replace(/\.html$/,"");
 const metadata=ENGLISH_PAGE_META[basePath];
 return metadata?{basePath,metadata}:null;
}
async function serveEnglishPage(req,env,url,page){
 const assetPath=page.basePath==="/"?"/en/":`/en${page.basePath}`;
 const assetUrl=new URL(assetPath,url);assetUrl.search="";assetUrl.hash="";
 const response=await env.ASSETS.fetch(new Request(assetUrl,req));
 const headers=new Headers(response.headers);headers.set("content-language","en");
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

let analyticsSchemaPromise=null;
const MARKETING_RETENTION_MS=90*24*60*60*1000;
const MARKETING_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS public_marketing_events (
   event_id TEXT PRIMARY KEY,created_at INTEGER NOT NULL,
   event_type TEXT NOT NULL,form_type TEXT NOT NULL DEFAULT '',page TEXT NOT NULL,
   visitor_id TEXT NOT NULL DEFAULT '',campaign_source TEXT NOT NULL DEFAULT 'direct',
   campaign_medium TEXT NOT NULL DEFAULT '',campaign_name TEXT NOT NULL DEFAULT '',
   campaign_content TEXT NOT NULL DEFAULT '',campaign_term TEXT NOT NULL DEFAULT '',
   campaign_landing TEXT NOT NULL DEFAULT '',campaign_referrer TEXT NOT NULL DEFAULT '')`,
 "CREATE INDEX IF NOT EXISTS idx_marketing_event_created ON public_marketing_events(created_at)",
 `CREATE TABLE IF NOT EXISTS lead_marketing (
   request_type TEXT NOT NULL,request_id INTEGER NOT NULL,created_at INTEGER NOT NULL,
   visitor_id TEXT NOT NULL DEFAULT '',campaign_source TEXT NOT NULL DEFAULT 'direct',
   campaign_medium TEXT NOT NULL DEFAULT '',campaign_name TEXT NOT NULL DEFAULT '',
   campaign_content TEXT NOT NULL DEFAULT '',campaign_term TEXT NOT NULL DEFAULT '',
   campaign_landing TEXT NOT NULL DEFAULT '',campaign_referrer TEXT NOT NULL DEFAULT '',
   PRIMARY KEY(request_type,request_id)) WITHOUT ROWID`,
 "CREATE INDEX IF NOT EXISTS idx_lead_marketing_created ON lead_marketing(created_at)"
];
async function initMarketingDB(env){
 if(!env.DB)throw new Error("Missing D1 binding: DB");
 await env.DB.batch([...MARKETING_SCHEMA,
   "CREATE TABLE IF NOT EXISTS form_rate_limits (rate_key TEXT PRIMARY KEY,window_started INTEGER NOT NULL,hits INTEGER NOT NULL DEFAULT 0)",
   "CREATE INDEX IF NOT EXISTS idx_form_rate_window ON form_rate_limits(window_started)"
 ].map(sql=>env.DB.prepare(sql)));
}
async function ensureColumns(env,table,columns){
  const info=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  const existing=new Set((info.results||[]).map(row=>row.name));
  for(const [name,definition] of columns){
    if(!existing.has(name)){try{await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`).run()}catch(error){if(!String(error?.message||error).toLowerCase().includes("duplicate column"))throw error}}
  }
}
async function initAnalyticsDB(env){
  if(!env.DB)throw new Error("Missing D1 binding: DB");
  if(!analyticsSchemaPromise){
    analyticsSchemaPromise=(async()=>{await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_visitors (
        visitor_id TEXT PRIMARY KEY,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        last_page TEXT NOT NULL DEFAULT '',
        device_type TEXT NOT NULL DEFAULT '', browser TEXT NOT NULL DEFAULT '', os TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL DEFAULT '', country TEXT NOT NULL DEFAULT '', first_referrer TEXT NOT NULL DEFAULT '',
        page_views INTEGER NOT NULL DEFAULT 0)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_visitor_months (
        visitor_id TEXT NOT NULL,
        month_key TEXT NOT NULL,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        page_views INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(visitor_id,month_key))`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_visitor_days (
        visitor_id TEXT NOT NULL, day_key TEXT NOT NULL, first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL, page_views INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(visitor_id,day_key))`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_site_visitors_last_seen ON site_visitors(last_seen)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_site_visitor_months_month ON site_visitor_months(month_key)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_site_visitor_days_day ON site_visitor_days(day_key)")
    ]);
    await ensureColumns(env,"site_visitors",[["device_type","TEXT NOT NULL DEFAULT ''"],["browser","TEXT NOT NULL DEFAULT ''"],["os","TEXT NOT NULL DEFAULT ''"],["language","TEXT NOT NULL DEFAULT ''"],["country","TEXT NOT NULL DEFAULT ''"],["first_referrer","TEXT NOT NULL DEFAULT ''"],["page_views","INTEGER NOT NULL DEFAULT 0"]]);
    await ensureColumns(env,"site_visitor_months",[["page_views","INTEGER NOT NULL DEFAULT 0"]]);
    })().catch(error=>{analyticsSchemaPromise=null;throw error});
  }
  return analyticsSchemaPromise;
}

async function initDB(env){
  if(!env.DB) throw new Error("Missing D1 binding: DB");
  const sql=[
`CREATE TABLE IF NOT EXISTS bookings (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at INTEGER NOT NULL,
 name TEXT NOT NULL, phone TEXT NOT NULL, car_model TEXT NOT NULL, year TEXT NOT NULL,
 branch TEXT NOT NULL, service_type TEXT NOT NULL DEFAULT '', preferred_date TEXT NOT NULL,
 preferred_time TEXT NOT NULL DEFAULT '', details TEXT NOT NULL DEFAULT '',
 source_type TEXT NOT NULL DEFAULT '', source_label TEXT NOT NULL DEFAULT '',
 source_id TEXT NOT NULL DEFAULT '', source_page TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'new')`,
`CREATE TABLE IF NOT EXISTS parts_requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at INTEGER NOT NULL,
 request_type TEXT NOT NULL DEFAULT 'inquiry',
 name TEXT NOT NULL, phone TEXT NOT NULL, car_model TEXT NOT NULL, year TEXT NOT NULL,
 vin TEXT NOT NULL, part_code TEXT NOT NULL DEFAULT '', quantity INTEGER NOT NULL DEFAULT 1,
 details TEXT NOT NULL, source_type TEXT NOT NULL DEFAULT '', source_label TEXT NOT NULL DEFAULT '',
 source_id TEXT NOT NULL DEFAULT '', source_page TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'new')`,
`CREATE TABLE IF NOT EXISTS contact_requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at INTEGER NOT NULL,
 name TEXT NOT NULL, phone TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL,
 source_type TEXT NOT NULL DEFAULT '', source_label TEXT NOT NULL DEFAULT '',
 source_id TEXT NOT NULL DEFAULT '', source_page TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'new')`,
...MARKETING_SCHEMA,
`CREATE TABLE IF NOT EXISTS email_alert_outbox (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 request_type TEXT NOT NULL, request_id INTEGER NOT NULL, created_at INTEGER NOT NULL,
 from_email TEXT NOT NULL DEFAULT '', to_email TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT NOT NULL DEFAULT '', last_error TEXT NOT NULL DEFAULT '', sent_at INTEGER NOT NULL DEFAULT 0,
 UNIQUE(request_type,request_id))`,
`CREATE INDEX IF NOT EXISTS idx_email_alert_due ON email_alert_outbox(status,next_attempt_at,lease_until)`,
`CREATE TABLE IF NOT EXISTS form_rate_limits (
 rate_key TEXT PRIMARY KEY,
 window_started INTEGER NOT NULL,
 hits INTEGER NOT NULL DEFAULT 0)`,
`CREATE TABLE IF NOT EXISTS form_submission_fingerprints (
 fingerprint TEXT PRIMARY KEY,
 created_at INTEGER NOT NULL,
 claim_id TEXT NOT NULL DEFAULT '')`,
`CREATE INDEX IF NOT EXISTS idx_form_submission_created ON form_submission_fingerprints(created_at)`,
`CREATE INDEX IF NOT EXISTS idx_form_rate_window ON form_rate_limits(window_started)`,
`CREATE TABLE IF NOT EXISTS site_settings (
 key TEXT PRIMARY KEY,
 value TEXT NOT NULL,
 updated_at INTEGER NOT NULL)`,
`CREATE TABLE IF NOT EXISTS media_assets (
 id TEXT PRIMARY KEY,
 created_at INTEGER NOT NULL,
 filename TEXT NOT NULL,
 content_type TEXT NOT NULL,
 size INTEGER NOT NULL,
 kind TEXT NOT NULL,
 data BLOB NOT NULL)`,
`CREATE TABLE IF NOT EXISTS reviews (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at INTEGER NOT NULL,
 customer_name TEXT NOT NULL,
 car TEXT NOT NULL DEFAULT '',
 rating INTEGER NOT NULL DEFAULT 5,
 review_text TEXT NOT NULL,
 visible INTEGER NOT NULL DEFAULT 1)`,
`CREATE TABLE IF NOT EXISTS admin_request_meta (
 request_type TEXT NOT NULL,
 request_id INTEGER NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 deleted_at INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(request_type,request_id))`,
`CREATE TABLE IF NOT EXISTS offers (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at INTEGER NOT NULL,
 title TEXT NOT NULL,
 title_en TEXT NOT NULL DEFAULT '',
 description TEXT NOT NULL DEFAULT '',
 description_en TEXT NOT NULL DEFAULT '',
 image_media_id TEXT NOT NULL DEFAULT '',
 start_date TEXT NOT NULL DEFAULT '',
 end_date TEXT NOT NULL DEFAULT '',
 button_text TEXT NOT NULL DEFAULT 'احجز الآن',
 button_text_en TEXT NOT NULL DEFAULT 'Book Now',
 button_link TEXT NOT NULL DEFAULT '/booking',
 visible INTEGER NOT NULL DEFAULT 1)`,
`CREATE TABLE IF NOT EXISTS service_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at INTEGER NOT NULL,
 title_ar TEXT NOT NULL,
 title_en TEXT NOT NULL DEFAULT '',
 description_ar TEXT NOT NULL DEFAULT '',
 description_en TEXT NOT NULL DEFAULT '',
 location_ar TEXT NOT NULL DEFAULT '',
 location_en TEXT NOT NULL DEFAULT '',
 availability TEXT NOT NULL DEFAULT 'available',
 image_media_id TEXT NOT NULL DEFAULT '',
 start_date TEXT NOT NULL DEFAULT '',
 end_date TEXT NOT NULL DEFAULT '',
 button_text_ar TEXT NOT NULL DEFAULT 'اعرف التفاصيل',
 button_text_en TEXT NOT NULL DEFAULT 'View Details',
 button_link TEXT NOT NULL DEFAULT '/contact',
 visible INTEGER NOT NULL DEFAULT 1)`,
`CREATE TABLE IF NOT EXISTS gallery_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at INTEGER NOT NULL,
 media_id TEXT NOT NULL,
 caption TEXT NOT NULL DEFAULT '',
 visible INTEGER NOT NULL DEFAULT 1,
 sort_order INTEGER NOT NULL DEFAULT 0)`,
`CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_builtin_media ON offers(image_media_id) WHERE image_media_id LIKE 'builtin:%'`,
`CREATE UNIQUE INDEX IF NOT EXISTS idx_events_builtin_media ON service_events(image_media_id) WHERE image_media_id LIKE 'builtin:%'`,
`CREATE TABLE IF NOT EXISTS site_visitors (
 visitor_id TEXT PRIMARY KEY,
 first_seen INTEGER NOT NULL,
 last_seen INTEGER NOT NULL,
 last_page TEXT NOT NULL DEFAULT '')`,
`CREATE TABLE IF NOT EXISTS site_visitor_months (
 visitor_id TEXT NOT NULL,
 month_key TEXT NOT NULL,
 first_seen INTEGER NOT NULL,
 last_seen INTEGER NOT NULL,
 PRIMARY KEY(visitor_id,month_key))`,
`CREATE INDEX IF NOT EXISTS idx_site_visitors_last_seen ON site_visitors(last_seen)`,
`CREATE INDEX IF NOT EXISTS idx_site_visitor_months_month ON site_visitor_months(month_key)`
  ];
  await env.DB.batch(sql.map(s=>env.DB.prepare(s)));
  const leadColumns=[
    ["source_type","TEXT NOT NULL DEFAULT ''"],
    ["source_label","TEXT NOT NULL DEFAULT ''"],
    ["source_id","TEXT NOT NULL DEFAULT ''"],
    ["source_page","TEXT NOT NULL DEFAULT ''"]
  ];
  for(const table of ["bookings","parts_requests","contact_requests"]){
    const info=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
    const existing=new Set((info.results||[]).map(row=>row.name));
    for(const [column,definition] of leadColumns){
      if(!existing.has(column)){try{await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run()}catch(error){if(!String(error?.message||error).toLowerCase().includes("duplicate column"))throw error}}
    }
  }
  await ensureColumns(env,"bookings",[["service_type","TEXT NOT NULL DEFAULT ''"],["preferred_time","TEXT NOT NULL DEFAULT ''"]]);
  await ensureColumns(env,"form_submission_fingerprints",[["claim_id","TEXT NOT NULL DEFAULT ''"]]);
  await ensureColumns(env,"offers",[["title_en","TEXT NOT NULL DEFAULT ''"],["description_en","TEXT NOT NULL DEFAULT ''"],["button_text_en","TEXT NOT NULL DEFAULT 'Book Now'"]]);
  await env.DB.prepare(`INSERT OR IGNORE INTO offers(created_at,title,title_en,description,description_en,image_media_id,start_date,end_date,button_text,button_text_en,button_link,visible)
    SELECT ?,?,?,?,?,?,'','','احجز واستفد بالعرض','Book & Claim Offer','/booking',1
    WHERE NOT EXISTS (SELECT 1 FROM offers WHERE image_media_id='builtin:jlr-cashback-50')`).bind(
      Date.now(),'50% Cashback على مصنعية الصيانة','50% Labour Cashback',
      'لعملاء Range Rover وJaguar موديلات 2016–2026: احجز من خلال هذا العرض واحصل على رصيد Cashback بقيمة 50% من مصنعية الزيارة، يُستخدم في زيارتك التالية. يسري على الحجوزات الجديدة عبر الموقع، والرصيد على قيمة المصنعية فقط. تطبق الشروط والأحكام.',
      'For Range Rover and Jaguar vehicles from model years 2016–2026: book through this website offer and receive cashback credit equal to 50% of the labour charge from your visit, redeemable on your next visit. Valid for new website bookings; credit applies to labour charges only. Terms and conditions apply.',
      'builtin:jlr-cashback-50').run();
  await env.DB.prepare(`INSERT OR IGNORE INTO service_events(created_at,title_ar,title_en,description_ar,description_en,location_ar,location_en,availability,image_media_id,start_date,end_date,button_text_ar,button_text_en,button_link,visible)
    SELECT ?,?,?,?,?,'','','available','builtin:towing-service','','','اطلب الونش','Request Recovery','/contact',1
    WHERE NOT EXISTS (SELECT 1 FROM service_events WHERE image_media_id='builtin:towing-service')`).bind(
      Date.now(),'خدمة الونش والكساحة','Vehicle Recovery & Towing Service',
      'خدمة نقل آمنة للسيارات الفاخرة عند الأعطال أو الحاجة إلى نقل السيارة، باستخدام كساحة مجهزة وربط محكم يحافظ على السيارة أثناء التحميل والنقل. تواصل معنا لتحديد موقع الاستلام والوجهة والتوفر.',
      'Safe recovery and transportation for luxury vehicles in the event of a breakdown or whenever your vehicle needs to be moved. A properly equipped flatbed and secure loading process help protect the vehicle throughout transport. Contact us to confirm pickup, destination and availability.').run();
}
function clean(v,max=500){return String(v??"").trim().slice(0,max)}
function leadSource(d){
 const allowed=new Set(["offer","event","warranty","insurance","direct"]);
 const rawType=clean(d?.sourceType,30),type=allowed.has(rawType)?rawType:"direct";
 if(type==="direct")return {type,label:"",id:"",page:""};
 return {type,label:clean(d?.sourceLabel,160),id:clean(d?.sourceId,80),page:clean(d?.sourcePage,220)};
}
const PUBLIC_FORM_ERRORS={
 INVALID_REQUEST:["بيانات الطلب غير صحيحة. راجع النموذج وحاول مرة أخرى.","The request could not be read. Review the form and try again."],
 INVALID_FIELDS:["راجع البيانات المطلوبة في النموذج.","Check the required form fields."],
 INVALID_PHONE:["اكتب رقم هاتف صحيحًا، وأضف كود الدولة للأرقام خارج مصر.","Enter a valid phone number, including the country code for numbers outside Egypt."],
 INVALID_YEAR:["اكتب سنة صنع صحيحة من 1980 إلى 2100.","Enter a valid model year from 1980 to 2100."],
 INVALID_VIN:["رقم الشاسيه يجب أن يكون من 7 إلى 17 خانة صحيحة.","Enter a valid VIN containing 7 to 17 letters and digits."],
 INVALID_QUANTITY:["اختار كمية صحيحة من 1 إلى 20.","Choose a whole-number quantity from 1 to 20."],
 INVALID_BRANCH:["اختار فرعًا من الفروع المتاحة في النموذج.","Choose one of the branches listed in the form."],
 INVALID_SERVICE_TYPE:["اختار نوع الخدمة من القائمة.","Choose a service type from the list."],
 INVALID_DATE:["اختار تاريخ حجز صحيحًا.","Choose a valid appointment date."],
 PAST_DATE:["لا يمكن اختيار تاريخ قديم. اختار تاريخًا من اليوم أو بعده.","Choose today or a future date; past dates cannot be booked."],
 FRIDAY_CLOSED:["الفروع مغلقة يوم الجمعة. اختار يومًا من السبت إلى الخميس.","The branches are closed on Friday. Choose Saturday through Thursday."],
 SAME_DAY_CUTOFF:["انتهى وقت حجز نفس اليوم. اختار موعدًا من بكرة أو بعده.","Same-day booking closes at 5:00 PM Cairo time. Choose a later date."],
 INVALID_TIME:["اختار وقتًا من 10:00 صباحًا إلى 6:00 مساءً، كل نصف ساعة.","Choose a time from 10:00 AM to 6:00 PM in half-hour steps."],
 PAST_TIME:["الوقت المختار فات بتوقيت القاهرة. اختار وقتًا لاحقًا.","That time has already passed in Cairo. Choose a later time."],
 RATE_LIMITED:["تم إرسال عدد كبير من الطلبات. انتظر حتى انتهاء مهلة إعادة المحاولة.","Too many requests have been submitted. Wait until the retry countdown finishes."],
 FORBIDDEN_ORIGIN:["طلب غير مسموح. افتح النموذج من موقع Esotica.","This request is not permitted. Open the form on the Esotica website."],
 SERVER_ERROR:["تعذر حفظ الطلب حاليًا. بيانات النموذج كما هي؛ حاول مرة أخرى.","The request could not be saved right now. Your form entries are unchanged; please try again."]
};
const isPublicFormPath=path=>["/api/booking","/api/parts","/api/contact"].includes(path);
function publicFormError(code,field,status=400,extra={}){
 const [error,error_en]=PUBLIC_FORM_ERRORS[code];
 return json({error,error_en,code,...(field?{field}:{}),...extra},status,status===429?{"retry-after":String(extra.retryAfter||1800)}:{});
}
function normalizePublicDigits(value){
 return String(value??"").replace(/[\u0660-\u0669]/g,char=>String(char.charCodeAt(0)-0x660)).replace(/[\u06f0-\u06f9]/g,char=>String(char.charCodeAt(0)-0x6f0));
}
function normalizePublicPhone(value){
 const raw=normalizePublicDigits(value).trim().replace(/[\u061c\u200e\u200f]/g,"");
 if(raw.length>64||!/^[+\d\s().-]+$/.test(raw))return "";
 let phone=raw.replace(/[\s().-]/g,"");
 if(phone.startsWith("00"))phone=`+${phone.slice(2)}`;
 if(/^0[1-9]\d{7,9}$/.test(phone))phone=`+20${phone.slice(1)}`;
 else if(/^1[0125]\d{8}$/.test(phone))phone=`+20${phone}`;
 else if(/^[1-9]\d{6,14}$/.test(phone))phone=`+${phone}`;
 // Accept the common +20 (0) national-trunk notation without retaining its zero.
 if(/^\+200[1-9]\d{7,9}$/.test(phone))phone=`+20${phone.slice(4)}`;
 return /^\+[1-9]\d{6,14}$/.test(phone)?phone:"";
}
function validYear(v){return /^\d{4}$/.test(v)&&Number(v)>=1980&&Number(v)<=2100}
function validTime(v){return /^(?:1[0-7]:(?:00|30)|18:00)$/.test(v)}
const BOOKING_BRANCHES=new Set(["فرع التجمع الخامس","فرع التجمع الثالث","الشيخ زايد"]);
const BOOKING_SERVICE_TYPES=new Set(["maintenance","diagnostics","inspection","body-paint","spare-parts","warranty-insurance","mobile-service","other"]);
const MARKETING_EVENT_TYPES=new Set(["page_view","form_start","whatsapp_click","phone_click","booking_click"]);
const MARKETING_FORM_TYPES=new Set(["booking","parts","contact"]);
const MARKETING_EVENT_KEYS=new Set(["id","type","form","page","campaignSource","campaignMedium","campaignName","campaignContent","campaignTerm","campaignLanding","campaignReferrer"]);
function publicMarketingPath(value){
 if(typeof value!=="string"||value.length>160||/[?#\\%]/.test(value)||!value.startsWith("/")||value.startsWith("//"))return "";
 const path=value.replace(/\/$/,"")||"/",english=path==="/en"||path.startsWith("/en/");
 const base=(english?(path.slice(3)||"/"):path).replace(/\.html$/,"");
 return Object.prototype.hasOwnProperty.call(ENGLISH_PAGE_META,base)?(english?(base==="/"?"/en":`/en${base}`):base):"";
}
function campaignLabel(value){
 if(typeof value!=="string")return "";
 const label=normalizePublicDigits(value.normalize("NFKC")).trim();
 return label.length<=100&&/^[\p{L}\p{N} _.()/\s-]*$/u.test(label)&&!/(?:\p{N}[\s()./-]*){10,}/u.test(label)?label:"";
}
function campaignReferrer(value){
 if(typeof value!=="string"||value.length>1024)return "";
 try{
   const url=new URL(value.includes("://")?value:`https://${value}`),host=url.hostname.toLowerCase().replace(/\.$/,"");
   if(!["http:","https:"].includes(url.protocol)||url.username||url.password||host.length>100||host==="esoticaegypt.com"||host.endsWith(".esoticaegypt.com"))return "";
   return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(host)?host:"";
 }catch{return ""}
}
function marketingOptOut(req){return req.headers.get("dnt")==="1"||req.headers.get("sec-gpc")==="1"}
function marketingVisitor(req){
 const value=String(cookieMap(req.headers.get("cookie")).esotica_visitor||"").toLowerCase();
 return /^[a-f0-9]{32}$/.test(value)?value:"";
}
function marketingAttribution(data,req,defaultPage=""){
 if(marketingOptOut(req))return {visitor:"",source:"direct",medium:"",name:"",content:"",term:"",landing:"",referrer:""};
 return {visitor:marketingVisitor(req),source:campaignLabel(data.campaignSource)||"direct",medium:campaignLabel(data.campaignMedium),
   name:campaignLabel(data.campaignName),content:campaignLabel(data.campaignContent),term:campaignLabel(data.campaignTerm),
   landing:publicMarketingPath(data.campaignLanding)||publicMarketingPath(defaultPage),referrer:campaignReferrer(data.campaignReferrer)};
}
function marketingValues(attribution){
 return [attribution.visitor,attribution.source,attribution.medium,attribution.name,attribution.content,attribution.term,attribution.landing,attribution.referrer];
}
async function readMarketingJSON(req){
 const maxBytes=8192,declared=Number(req.headers.get("content-length"));
 if(Number.isFinite(declared)&&declared>maxBytes)return null;
 if(!req.body)return null;
 const reader=req.body.getReader(),decoder=new TextDecoder();let size=0,text="";
 try{
   while(true){
     const chunk=await reader.read();if(chunk.done)break;
     size+=chunk.value.byteLength;if(size>maxBytes){await reader.cancel();return null}
     text+=decoder.decode(chunk.value,{stream:true});
   }
   return JSON.parse(text+decoder.decode());
 }catch{return null}finally{reader.releaseLock()}
}
async function guardMarketingEvent(req,env){
 const now=Date.now(),windowMs=30*60*1000,key=`marketing:${await sha256(req.headers.get("cf-connecting-ip")||"unknown")}`;
 const quota=await env.DB.prepare(`INSERT INTO form_rate_limits(rate_key,window_started,hits) VALUES(?,?,1)
   ON CONFLICT(rate_key) DO UPDATE SET
     window_started=CASE WHEN window_started<=? THEN excluded.window_started ELSE window_started END,
     hits=CASE WHEN window_started<=? THEN 1 ELSE hits+1 END
   WHERE window_started<=? OR hits<120 RETURNING hits`).bind(key,now,now-windowMs,now-windowMs,now-windowMs).first();
 if(quota)return 0;
 const row=await env.DB.prepare("SELECT window_started FROM form_rate_limits WHERE rate_key=?").bind(key).first();
 return Math.max(1,Math.ceil(((Number(row?.window_started)||now)+windowMs-now)/1000));
}
async function sha256(value){
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value)));
 return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}
async function guardAdminLogin(req,env){
 const now=Date.now(),windowMs=15*60*1000,limit=10;
 // Cloudflare supplies the connecting IP. Do not trust caller-controlled
 // cookies or user-agent values as alternatives for the login quota.
 const clientKey=await sha256(`admin-login|${req.headers.get("cf-connecting-ip")||"unknown"}`);
 await env.DB.batch([
   env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_login_rate_limits (
     client_key TEXT PRIMARY KEY,window_started INTEGER NOT NULL,hits INTEGER NOT NULL DEFAULT 0)`),
   env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_admin_login_window ON admin_login_rate_limits(window_started)"),
   env.DB.prepare("DELETE FROM admin_login_rate_limits WHERE window_started<?").bind(now-24*60*60*1000)
 ]);
 const quota=await env.DB.prepare(`INSERT INTO admin_login_rate_limits(client_key,window_started,hits) VALUES(?,?,1)
   ON CONFLICT(client_key) DO UPDATE SET
     window_started=CASE WHEN window_started<=? THEN excluded.window_started ELSE window_started END,
     hits=CASE WHEN window_started<=? THEN 1 ELSE hits+1 END
   WHERE window_started<=? OR hits<? RETURNING window_started`).bind(clientKey,now,now-windowMs,now-windowMs,now-windowMs,limit).first();
 if(quota)return null;
 const blocked=await env.DB.prepare("SELECT window_started FROM admin_login_rate_limits WHERE client_key=?").bind(clientKey).first();
 return Math.max(1,Math.ceil(((Number(blocked?.window_started)||now)+windowMs-now)/1000));
}
async function guardPublicForm(req,env,type,data,signature){
 if(clean(data?.website,200))return {silent:true};
 const now=Date.now(),windowMs=30*60*1000,limit=8;
 const rawClient=req.headers.get("cf-connecting-ip")||`${req.headers.get("user-agent")||"unknown"}|${cookieMap(req.headers.get("cookie")).esotica_visitor||""}`;
 const rateKey=`${type}:${await sha256(rawClient)}`;
 const quota=await env.DB.prepare(`INSERT INTO form_rate_limits(rate_key,window_started,hits) VALUES(?,?,1)
   ON CONFLICT(rate_key) DO UPDATE SET
     window_started=CASE WHEN window_started<=? THEN excluded.window_started ELSE window_started END,
     hits=CASE WHEN window_started<=? THEN 1 ELSE hits+1 END
   WHERE window_started<=? OR hits<? RETURNING hits`).bind(rateKey,now,now-windowMs,now-windowMs,now-windowMs,limit).first();
 if(!quota){
   const blocked=await env.DB.prepare("SELECT window_started FROM form_rate_limits WHERE rate_key=?").bind(rateKey).first();
   return {limited:true,retryAfter:Math.max(1,Math.ceil(((Number(blocked?.window_started)||now)+windowMs-now)/1000))};
 }
 return {type,fingerprint:await sha256(JSON.stringify([type,signature]))};
}
async function savePublicRequest(env,guard,insertSQL,values,ctx,attribution){
 if(guard.silent)return null;
 const now=Date.now(),claimId=crypto.randomUUID(),mailConfig=emailAlertConfig(env);
 // Claim the fingerprint and save the lead in one transaction. A failed insert
 // rolls the claim back, so a customer can safely retry after a server error.
 const results=await env.DB.batch([
   env.DB.prepare(`INSERT INTO form_submission_fingerprints(fingerprint,created_at,claim_id) VALUES(?,?,?)
     ON CONFLICT(fingerprint) DO UPDATE SET created_at=excluded.created_at,claim_id=excluded.claim_id
     WHERE created_at<=?`).bind(guard.fingerprint,now,claimId,now-2*60*1000),
   env.DB.prepare(`${insertSQL} SELECT ${values.map(()=>"?").join(",")} WHERE EXISTS
     (SELECT 1 FROM form_submission_fingerprints WHERE fingerprint=? AND claim_id=?)`).bind(...values,guard.fingerprint,claimId),
   // WITHOUT ROWID preserves last_insert_rowid() for the existing email outbox.
   // changes() ties both records to the genuine lead insert in this transaction.
   env.DB.prepare(`INSERT INTO lead_marketing(request_type,request_id,created_at,visitor_id,campaign_source,campaign_medium,campaign_name,campaign_content,campaign_term,campaign_landing,campaign_referrer)
     SELECT ?,last_insert_rowid(),?,?,?,?,?,?,?,?,? WHERE changes()>0`).bind(({booking:"bookings",parts:"parts",contact:"contacts"})[guard.type],now,...marketingValues(attribution)),
   ...(mailConfig?[env.DB.prepare(`INSERT OR IGNORE INTO email_alert_outbox(request_type,request_id,created_at,from_email,to_email)
     SELECT ?,last_insert_rowid(),?,?,? WHERE changes()>0`).bind(({booking:"bookings",parts:"parts",contact:"contacts"})[guard.type],now,mailConfig.from,mailConfig.to)]:[]),
   env.DB.prepare("DELETE FROM public_marketing_events WHERE created_at<?").bind(now-MARKETING_RETENTION_MS),
   env.DB.prepare("DELETE FROM lead_marketing WHERE created_at<?").bind(now-MARKETING_RETENTION_MS),
   env.DB.prepare("DELETE FROM form_submission_fingerprints WHERE created_at<?").bind(now-24*60*60*1000),
   env.DB.prepare("DELETE FROM form_rate_limits WHERE window_started<?").bind(now-24*60*60*1000)
 ]);
 const id=Number(results[1].meta?.changes)>0?Number(results[1].meta.last_row_id):null;
 if(id)scheduleEmailAlerts(env,ctx);
 return id;
}
function emailAlertConfig(env){
 const email=value=>typeof value==="string"&&value.length<=254&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
 const from=env.LEAD_ALERT_FROM,to=env.LEAD_ALERT_TO;
 return typeof env.RESEND_API_KEY==="string"&&env.RESEND_API_KEY.trim()&&email(from)&&email(to)?{from,to,key:env.RESEND_API_KEY}:null;
}
function scheduleEmailAlerts(env,ctx){
 if(emailAlertConfig(env)&&typeof ctx?.waitUntil==="function")ctx.waitUntil(flushEmailAlerts(env).catch(()=>{}));
}
async function flushEmailAlerts(env){
 const config=emailAlertConfig(env);if(!config)return;
 // Never retry beyond the provider's 24-hour idempotency window.
 const cutoff=Date.now()-23*60*60*1000;
 await env.DB.prepare("UPDATE email_alert_outbox SET status='failed',last_error='attempts_exhausted' WHERE status='pending' AND attempts>=5 AND lease_until<=?").bind(Date.now()).run();
 await env.DB.prepare("UPDATE email_alert_outbox SET status='failed',last_error='expired' WHERE status='pending' AND created_at<? AND lease_until<=?").bind(cutoff,Date.now()).run();
 for(let index=0;index<3;index++){
  const now=Date.now(),token=crypto.randomUUID();
  const item=await env.DB.prepare(`UPDATE email_alert_outbox SET attempts=attempts+1,lease_token=?,lease_until=?
    WHERE id=(SELECT id FROM email_alert_outbox WHERE status='pending' AND attempts<5 AND next_attempt_at<=? AND lease_until<=? AND created_at>=? ORDER BY id LIMIT 1)
    RETURNING id,request_type,request_id,from_email,to_email,attempts`).bind(token,now+60000,now,now,cutoff).first();
  if(!item)return;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
  let accepted=false,error="delivery_unavailable";
  try{
   const type=({bookings:"حجز صيانة",parts:"استعلام قطع غيار",contacts:"رسالة تواصل"})[item.request_type]||"طلب";
   const response=await fetch("https://api.resend.com/emails",{
    method:"POST",signal:controller.signal,
    headers:{"content-type":"application/json",authorization:`Bearer ${config.key}`,"Idempotency-Key":`esotica-lead-${item.request_type}-${item.request_id}`},
    body:JSON.stringify({from:item.from_email,to:[item.to_email],subject:`Esotica: ${type} #${item.request_id}`,
      text:`طلب جديد من موقع Esotica\nالنوع: ${type}\nرقم الطلب: ${item.request_id}\nراجع التفاصيل داخل لوحة الإدارة: https://esoticaegypt.com/admin`})
   });
   accepted=response.ok;if(!accepted)error=response.status===429?"rate_limited":response.status>=500?"provider_unavailable":"provider_rejected";
  }catch{error=controller.signal.aborted?"timeout":"delivery_unavailable"}finally{clearTimeout(timeout)}
  if(accepted){
   await env.DB.prepare("UPDATE email_alert_outbox SET status='sent',sent_at=?,last_error='',lease_until=0,lease_token='' WHERE id=? AND lease_token=?").bind(Date.now(),item.id,token).run();
  }else{
   await env.DB.prepare("UPDATE email_alert_outbox SET status=?,next_attempt_at=?,last_error=?,lease_until=0,lease_token='' WHERE id=? AND lease_token=?")
    .bind(item.attempts>=5?"failed":"pending",Date.now()+Math.min(60*60*1000,60000*2**(item.attempts-1)),error,item.id,token).run();
  }
 }
}
async function emailAlertStatus(env){
 const row=await env.DB.prepare(`SELECT
   SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
   SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed,
   SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) AS sent,MAX(sent_at) AS last_success FROM email_alert_outbox`).first();
 const failure=await env.DB.prepare("SELECT last_error FROM email_alert_outbox WHERE last_error<>'' ORDER BY id DESC LIMIT 1").first();
 return {configured:Boolean(emailAlertConfig(env)),pending:Number(row?.pending)||0,failed:Number(row?.failed)||0,sent:Number(row?.sent)||0,lastSuccess:Number(row?.last_success)||0,lastError:failure?.last_error||""};
}
function cairoDateParts(){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
 const get=t=>parts.find(p=>p.type===t)?.value||"";
 return {date:`${get("year")}-${get("month")}-${get("day")}`,hour:Number(get("hour")),minute:Number(get("minute"))};
}
function validateBookingDate(v,time){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(`${v}T00:00:00Z`))||new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)!==v)return "INVALID_DATE";
 const now=cairoDateParts();
 if(v<now.date)return "PAST_DATE";
 if(new Date(`${v}T00:00:00Z`).getUTCDay()===5)return "FRIDAY_CLOSED";
 if(v===now.date && now.hour>=17)return "SAME_DAY_CUTOFF";
 if(time&&v===now.date){
   const [hour,minute]=time.split(":").map(Number);
   if(hour*60+minute<=now.hour*60+now.minute)return "PAST_TIME";
 }
 return null;
}
function cookieMap(h){return Object.fromEntries((h||"").split(";").map(x=>x.trim().split("=")).filter(x=>x[0]))}
function b64url(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function sign(text,secret){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return b64url(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(text))));
}
async function makeSession(env){
 const exp=Math.floor(Date.now()/1000)+60*60*12, payload=`v1.${exp}`, sig=await sign(payload,env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD);
 return `${payload}.${sig}`;
}
async function auth(req,env){
 if(!env.ADMIN_PASSWORD) return false;
 const token=cookieMap(req.headers.get("cookie")).esotica_admin_session;
 if(!token)return false;
 const parts=token.split(".");if(parts.length!==3||parts[0]!=="v1")return false;
 const exp=Number(parts[1]);if(!Number.isFinite(exp)||exp<Math.floor(Date.now()/1000))return false;
 const expected=await sign(`v1.${exp}`,env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD);
 return expected===parts[2];
}
function sessionCookie(value){return `esotica_admin_session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`}
function logoutCookie(){return `esotica_admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`}
function visitorCookie(value){return `esotica_visitor=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`}
async function readJSON(req){try{return await req.json()}catch{return null}}
function sameOrigin(req){
 const source=req.headers.get("origin")||req.headers.get("referer");
 if(!source)return false;
 try{return new URL(source).origin===new URL(req.url).origin}catch{return false}
}
async function trafficSnapshot(env){
  await initAnalyticsDB(env);
  const now=Date.now(),monthKey=cairoDateParts().date.slice(0,7),onlineSince=now-(5*60*1000);
  const row=await env.DB.prepare(`SELECT
    (SELECT COUNT(*) FROM site_visitors WHERE last_seen>=?) AS online_now,
    (SELECT COUNT(*) FROM site_visitor_months WHERE month_key=?) AS month_unique,
    (SELECT COUNT(*) FROM site_visitors) AS all_time,
    (SELECT MIN(first_seen) FROM site_visitors) AS started_at`).bind(onlineSince,monthKey).first();
  const [dailyRows,monthlyRows,visitorRows]=await env.DB.batch([
    env.DB.prepare("SELECT day_key AS period,COUNT(*) AS unique_visitors,SUM(page_views) AS page_views FROM site_visitor_days GROUP BY day_key ORDER BY day_key DESC LIMIT 366"),
    env.DB.prepare("SELECT month_key AS period,COUNT(*) AS unique_visitors,SUM(page_views) AS page_views FROM site_visitor_months GROUP BY month_key ORDER BY month_key DESC LIMIT 60"),
    env.DB.prepare("SELECT visitor_id,first_seen,last_seen,last_page,device_type,browser,os,language,country,first_referrer,page_views FROM site_visitors ORDER BY last_seen DESC LIMIT 500")
  ]);
  return {
    online:Number(row?.online_now||0),
    month:Number(row?.month_unique||0),
    total:Number(row?.all_time||0),
    startedAt:Number(row?.started_at||0),
    monthKey,
    onlineWindowMinutes:5,
    daily:dailyRows.results||[],monthlyHistory:monthlyRows.results||[],visitors:visitorRows.results||[]
  };
}
function visitorTech(req){
 const ua=req.headers.get("user-agent")||"";
 const device=/bot|crawler|spider/i.test(ua)?"Bot":/ipad|tablet/i.test(ua)?"Tablet":/mobile|android|iphone/i.test(ua)?"Mobile":"Desktop";
 const browser=/edg\//i.test(ua)?"Edge":/opr\//i.test(ua)?"Opera":/samsungbrowser/i.test(ua)?"Samsung Internet":/firefox|fxios/i.test(ua)?"Firefox":/chrome|crios/i.test(ua)?"Chrome":/safari/i.test(ua)?"Safari":"Other";
 const os=/windows/i.test(ua)?"Windows":/android/i.test(ua)?"Android":/iphone|ipad|ipod/i.test(ua)?"iOS/iPadOS":/mac os|macintosh/i.test(ua)?"macOS":/linux/i.test(ua)?"Linux":"Other";
 return {device,browser,os,language:clean((req.headers.get("accept-language")||"").split(",")[0],20),country:clean(req.cf?.country||req.headers.get("cf-ipcountry")||"",2).toUpperCase()};
}
async function handleAPI(req,env,url,ctx){
 const p=url.pathname;
 if(req.method==="POST"&&!sameOrigin(req))return isPublicFormPath(p)?publicFormError("FORBIDDEN_ORIGIN",null,403):bad("طلب غير مسموح.",403);

 if(p==="/api/health"){
   return json({ok:true,database:!!env.DB,adminConfigured:!!env.ADMIN_PASSWORD,formProtection:true,adminLoginProtection:true,leadAlertPagination:true,emailAlertsPrepared:true,emailAlertsConfigured:Boolean(emailAlertConfig(env))});
 }
 if(p==="/api/analytics/event"&&req.method==="POST"){
   if(marketingOptOut(req))return new Response(null,{status:204,headers:{"cache-control":"no-store"}});
   const data=await readMarketingJSON(req);
   if(!data||typeof data!=="object"||Array.isArray(data)||Object.keys(data).some(key=>!MARKETING_EVENT_KEYS.has(key)))return bad("بيانات القياس غير صحيحة.");
   const eventId=typeof data.id==="string"?data.id.toLowerCase():"",page=publicMarketingPath(data.page),form=data.form??"";
   if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(eventId)||!MARKETING_EVENT_TYPES.has(data.type)||!page||
     (data.type==="form_start"?!MARKETING_FORM_TYPES.has(form):form!==""))return bad("حدث قياس غير صحيح.");
   await initMarketingDB(env);
   const retryAfter=await guardMarketingEvent(req,env);
   if(retryAfter)return json({error:"تم تجاوز حد القياس.",code:"RATE_LIMITED",retryAfter},429,{"retry-after":String(retryAfter)});
   const attribution=marketingAttribution(data,req,page),hasVisitor=Boolean(attribution.visitor),now=Date.now();
   if(!hasVisitor)attribution.visitor=crypto.randomUUID().replace(/-/g,"");
   await env.DB.batch([
     env.DB.prepare(`INSERT OR IGNORE INTO public_marketing_events(event_id,created_at,event_type,form_type,page,visitor_id,campaign_source,campaign_medium,campaign_name,campaign_content,campaign_term,campaign_landing,campaign_referrer)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(eventId,now,data.type,form,page,...marketingValues(attribution)),
     env.DB.prepare("DELETE FROM public_marketing_events WHERE created_at<?").bind(now-MARKETING_RETENTION_MS),
     env.DB.prepare("DELETE FROM lead_marketing WHERE created_at<?").bind(now-MARKETING_RETENTION_MS),
     env.DB.prepare("DELETE FROM form_rate_limits WHERE window_started<?").bind(now-24*60*60*1000)
   ]);
   return json({ok:true},200,hasVisitor?{}:{"set-cookie":visitorCookie(attribution.visitor)});
 }
 if(p==="/api/analytics/heartbeat"&&req.method==="POST"){
   await initAnalyticsDB(env);
   const data=await readJSON(req)||{},now=Date.now(),dayKey=cairoDateParts().date,monthKey=dayKey.slice(0,7),cookies=cookieMap(req.headers.get("cookie"));
   let visitorId=String(cookies.esotica_visitor||"").toLowerCase(),setVisitorCookie=false;
   if(!/^[a-f0-9]{32}$/.test(visitorId)){
     visitorId=crypto.randomUUID().replace(/-/g,"");setVisitorCookie=true;
   }
   const page=clean(data.page,160).split("?")[0]||"/",referrer=clean(data.referrer,160),tech=visitorTech(req),pageViews=data.event==="pageview"?1:0;
   await env.DB.batch([
     env.DB.prepare("INSERT INTO site_visitors(visitor_id,first_seen,last_seen,last_page,device_type,browser,os,language,country,first_referrer,page_views) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(visitor_id) DO UPDATE SET last_seen=excluded.last_seen,last_page=excluded.last_page,device_type=excluded.device_type,browser=excluded.browser,os=excluded.os,language=excluded.language,country=excluded.country,page_views=site_visitors.page_views+excluded.page_views").bind(visitorId,now,now,page,tech.device,tech.browser,tech.os,tech.language,tech.country,referrer,pageViews),
     env.DB.prepare("INSERT INTO site_visitor_months(visitor_id,month_key,first_seen,last_seen,page_views) VALUES(?,?,?,?,?) ON CONFLICT(visitor_id,month_key) DO UPDATE SET last_seen=excluded.last_seen,page_views=site_visitor_months.page_views+excluded.page_views").bind(visitorId,monthKey,now,now,pageViews),
     env.DB.prepare("INSERT INTO site_visitor_days(visitor_id,day_key,first_seen,last_seen,page_views) VALUES(?,?,?,?,?) ON CONFLICT(visitor_id,day_key) DO UPDATE SET last_seen=excluded.last_seen,page_views=site_visitor_days.page_views+excluded.page_views").bind(visitorId,dayKey,now,now,pageViews)
   ]);
   return json({ok:true},200,setVisitorCookie?{"set-cookie":visitorCookie(visitorId)}:{});
 }
 if(p==="/api/site-content"&&req.method==="GET"){
   await initDB(env);
   const [settingsRows,reviewsRows,galleryRows]=await env.DB.batch([
     env.DB.prepare("SELECT key,value FROM site_settings"),
     env.DB.prepare("SELECT id,customer_name,car,rating,review_text FROM reviews WHERE visible=1 ORDER BY created_at DESC LIMIT 20"),
     env.DB.prepare("SELECT id,media_id,caption FROM gallery_items WHERE visible=1 ORDER BY sort_order ASC, created_at DESC LIMIT 30")
   ]);
   const settings={};for(const row of settingsRows.results||[])settings[row.key]=row.value;
   return json({settings,reviews:reviewsRows.results||[],gallery:galleryRows.results||[]});
 }
 if(p==="/api/offers"&&req.method==="GET"){
   await initDB(env);
   const today=cairoDateParts().date;
   const rows=await env.DB.prepare("SELECT id,title,title_en,description,description_en,image_media_id,start_date,end_date,button_text,button_text_en,button_link FROM offers WHERE visible=1 AND (start_date='' OR start_date<=?) AND (end_date='' OR end_date>=?) ORDER BY created_at DESC LIMIT 50").bind(today,today).all();
   return json({offers:rows.results||[]});
 }
 if(p==="/api/events"&&req.method==="GET"){
   await initDB(env);
   const rows=await env.DB.prepare("SELECT id,title_ar,title_en,description_ar,description_en,location_ar,location_en,availability,image_media_id,start_date,end_date,button_text_ar,button_text_en,button_link FROM service_events WHERE visible=1 ORDER BY created_at DESC LIMIT 50").all();
   return json({events:rows.results||[]});
 }
  const mediaMatch=p.match(/^\/api\/media\/([A-Za-z0-9_-]+)$/);
 if(mediaMatch&&req.method==="GET"){
   await initDB(env);
   const row=await env.DB.prepare("SELECT content_type,data FROM media_assets WHERE id=?").bind(mediaMatch[1]).first();
   if(!row)return new Response("Not found",{status:404});
   return new Response(row.data,{headers:{"content-type":row.content_type,"cache-control":"public, max-age=3600"}});
 }

 if(p==="/api/booking"&&req.method==="POST"){
   await initDB(env); const d=await readJSON(req); if(!d||typeof d!=="object"||Array.isArray(d))return publicFormError("INVALID_REQUEST");
   const name=clean(d.name,80),phone=normalizePublicPhone(d.phone),carModel=clean(d.carModel,80),year=clean(normalizePublicDigits(d.year),4),branch=clean(d.branch,100),serviceType=clean(d.serviceType,40),preferredDate=clean(normalizePublicDigits(d.preferredDate),20),preferredTime=clean(normalizePublicDigits(d.preferredTime),10),details=clean(d.details,700),source=leadSource(d);
   if(!name||!carModel)return publicFormError("INVALID_FIELDS",!name?"name":"carModel");
   if(!phone)return publicFormError("INVALID_PHONE","phone");
   if(!validYear(year))return publicFormError("INVALID_YEAR","year");
   if(!BOOKING_BRANCHES.has(branch))return publicFormError("INVALID_BRANCH","branch");
   if(!BOOKING_SERVICE_TYPES.has(serviceType))return publicFormError("INVALID_SERVICE_TYPE","serviceType");
   if(!validTime(preferredTime))return publicFormError("INVALID_TIME","preferredTime");
   const dateError=validateBookingDate(preferredDate,preferredTime);if(dateError)return publicFormError(dateError,dateError==="PAST_TIME"?"preferredTime":"preferredDate");
   const guard=await guardPublicForm(req,env,"booking",d,{name,phone,carModel,year,branch,serviceType,preferredDate,preferredTime,details,source});
   if(guard.limited)return publicFormError("RATE_LIMITED",null,429,{retryAfter:guard.retryAfter});
   await savePublicRequest(env,guard,"INSERT INTO bookings(created_at,name,phone,car_model,year,branch,service_type,preferred_date,preferred_time,details,source_type,source_label,source_id,source_page,status)",[Date.now(),name,phone,carModel,year,branch,serviceType,preferredDate,preferredTime,details,source.type,source.label,source.id,source.page,"new"],ctx,marketingAttribution(d,req,"/booking"));
   return json({message:"تم استلام طلب الحجز. سيتواصل معك فريق Esotica لتأكيد الموعد.",message_en:"Your service request has been received. The Esotica team will contact you to confirm the appointment."});
 }
 if(p==="/api/parts"&&req.method==="POST"){
   await initDB(env); const d=await readJSON(req);if(!d||typeof d!=="object"||Array.isArray(d))return publicFormError("INVALID_REQUEST");
   const name=clean(d.name,80),phone=normalizePublicPhone(d.phone),carModel=clean(d.carModel,80),year=clean(normalizePublicDigits(d.year),4),vin=normalizePublicDigits(d.vin).trim().toUpperCase(),partCode=clean(d.partCode,60),details=clean(d.details,700),quantityText=normalizePublicDigits(d.quantity).trim(),quantity=quantityText===""?1:Number(quantityText),source=leadSource(d);
   if(!name||!carModel||!details)return publicFormError("INVALID_FIELDS",!name?"name":!carModel?"carModel":"details");
   if(!phone)return publicFormError("INVALID_PHONE","phone");
   if(!validYear(year))return publicFormError("INVALID_YEAR","year");
   if(!(/^[A-HJ-NPR-Z0-9]{7,17}$/.test(vin)))return publicFormError("INVALID_VIN","vin");
   if(!Number.isInteger(quantity)||quantity<1||quantity>20)return publicFormError("INVALID_QUANTITY","quantity");
   const guard=await guardPublicForm(req,env,"parts",d,{name,phone,carModel,year,vin,partCode,quantity,details,source});
   if(guard.limited)return publicFormError("RATE_LIMITED",null,429,{retryAfter:guard.retryAfter});
   await savePublicRequest(env,guard,"INSERT INTO parts_requests(created_at,request_type,name,phone,car_model,year,vin,part_code,quantity,details,source_type,source_label,source_id,source_page,status)",[Date.now(),"inquiry",name,phone,carModel,year,vin,partCode,quantity,details,source.type,source.label,source.id,source.page,"new"],ctx,marketingAttribution(d,req,"/parts"));
   return json({message:"تم استلام استعلام قطع الغيار. سيتم التواصل لتأكيد التوفر والسعر.",message_en:"Your spare-parts enquiry has been received. The team will contact you to confirm availability and price."});
 }
 if(p==="/api/contact"&&req.method==="POST"){
   await initDB(env);const d=await readJSON(req);if(!d||typeof d!=="object"||Array.isArray(d))return publicFormError("INVALID_REQUEST");
   const name=clean(d.name,80),phone=normalizePublicPhone(d.phone),subject=clean(d.subject,120),message=clean(d.message,900),source=leadSource(d);
   if(!name||!subject||!message)return publicFormError("INVALID_FIELDS",!name?"name":!subject?"subject":"message");
   if(!phone)return publicFormError("INVALID_PHONE","phone");
   const guard=await guardPublicForm(req,env,"contact",d,{name,phone,subject,message,source});
   if(guard.limited)return publicFormError("RATE_LIMITED",null,429,{retryAfter:guard.retryAfter});
   await savePublicRequest(env,guard,"INSERT INTO contact_requests(created_at,name,phone,subject,message,source_type,source_label,source_id,source_page,status)",[Date.now(),name,phone,subject,message,source.type,source.label,source.id,source.page,"new"],ctx,marketingAttribution(d,req,"/contact"));
   return json({message:"تم استلام رسالتك. سيتواصل معك فريق Esotica.",message_en:"Your message has been received. The Esotica team will contact you."});
 }

 if(p==="/api/admin/login"&&req.method==="POST"){
   if(!env.ADMIN_PASSWORD)return bad("دخول الإدارة غير مُعدّ بعد. أضف ADMIN_PASSWORD في Cloudflare.",503);
   const retryAfter=await guardAdminLogin(req,env);
   if(retryAfter)return json({error:"محاولات دخول كثيرة. انتظر قليلًا ثم حاول مرة أخرى."},429,{"retry-after":String(retryAfter)});
   const d=await readJSON(req);const u=clean(d?.username,50),pw=String(d?.password??"");
   if(u!=="admin"||pw!==env.ADMIN_PASSWORD)return bad("اسم المستخدم أو كلمة السر غير صحيحة.",401);
   const token=await makeSession(env);return json({ok:true},200,{"set-cookie":sessionCookie(token)});
 }
 if(p==="/api/admin/logout"&&req.method==="POST")return json({ok:true},200,{"set-cookie":logoutCookie()});

 if(p==="/api/admin/traffic"&&req.method==="GET"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   return json({traffic:await trafficSnapshot(env)});
 }
 if(p==="/api/admin/email-alerts"&&(req.method==="GET"||req.method==="POST")){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);
   if(req.method==="POST")return bad("إجراء غير صحيح.",405);
   const status=await emailAlertStatus(env);scheduleEmailAlerts(env,ctx);return json(status);
 }
 if(p==="/api/admin/email-alerts/retry"&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   if(!emailAlertConfig(env))return bad("البريد غير مهيأ. راجع إعدادات خدمة الإرسال أولًا.",503);
   await initDB(env);
   await env.DB.prepare("UPDATE email_alert_outbox SET status='pending',attempts=0,next_attempt_at=0,last_error='' WHERE status<>'sent' AND lease_until<=? AND created_at>=?").bind(Date.now(),Date.now()-23*60*60*1000).run();
   scheduleEmailAlerts(env,ctx);return json({ok:true,message:"تمت جدولة إعادة المحاولة للرسائل المعلقة فقط."});
 }
 if(p==="/api/admin/lead-alerts"&&req.method==="GET"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);
   const pollNow=Date.now(),after=Math.max(0,Math.min(pollNow,Number(url.searchParams.get("after"))||0));
   const rawCursor=url.searchParams.get("cursor");
   const cursor=rawCursor?.match(/^(\d{1,16}):(bookings|contacts|parts):(\d{1,16})$/);
   if(rawCursor&&(!cursor||!Number.isSafeInteger(Number(cursor[1]))||!Number.isSafeInteger(Number(cursor[3]))||Number(cursor[1])>pollNow))return bad("مؤشر تنبيهات غير صحيح.");
   const since=cursor?Number(cursor[1]):after;
   // The type and ID break timestamp ties, so bursts larger than one page
   // cannot disappear when the next poll advances its cursor.
   const continuation=cursor?"(created_at>? OR (created_at=? AND (request_type>? OR (request_type=? AND id>?))))":"created_at>?";
   const values=cursor?[since,since,cursor[2],cursor[2],Number(cursor[3]),pollNow]:[since,pollNow];
   const rows=await env.DB.prepare(`SELECT request_type,id,created_at FROM (
     SELECT 'bookings' AS request_type,id,created_at FROM bookings
     UNION ALL SELECT 'parts' AS request_type,id,created_at FROM parts_requests
     UNION ALL SELECT 'contacts' AS request_type,id,created_at FROM contact_requests
   ) WHERE ${continuation} AND created_at<=? ORDER BY created_at ASC,request_type ASC,id ASC LIMIT 31`).bind(...values).all();
   const alerts=(rows.results||[]).slice(0,30),hasMore=(rows.results||[]).length>30,last=alerts.at(-1);
   return json({now:pollNow,alerts,hasMore,nextCursor:hasMore?`${last.created_at}:${last.request_type}:${last.id}`:""});
 }

 if(p==="/api/admin/dashboard"&&req.method==="GET"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);
   const [b,parts,c,trashCount]=await env.DB.batch([
     env.DB.prepare("SELECT b.*,COALESCE(m.note,'') AS admin_note FROM bookings b LEFT JOIN admin_request_meta m ON m.request_type='bookings' AND m.request_id=b.id WHERE COALESCE(m.deleted_at,0)=0 ORDER BY b.created_at DESC LIMIT 500"),
     env.DB.prepare("SELECT p.*,COALESCE(m.note,'') AS admin_note FROM parts_requests p LEFT JOIN admin_request_meta m ON m.request_type='parts' AND m.request_id=p.id WHERE COALESCE(m.deleted_at,0)=0 ORDER BY p.created_at DESC LIMIT 500"),
     env.DB.prepare("SELECT c.*,COALESCE(m.note,'') AS admin_note FROM contact_requests c LEFT JOIN admin_request_meta m ON m.request_type='contacts' AND m.request_id=c.id WHERE COALESCE(m.deleted_at,0)=0 ORDER BY c.created_at DESC LIMIT 500"),
     env.DB.prepare("SELECT COUNT(*) AS total FROM admin_request_meta WHERE deleted_at>0")
   ]);
   const traffic=await trafficSnapshot(env);
   return json({bookings:b.results||[],parts:parts.results||[],contacts:c.results||[],trashCount:Number(trashCount.results?.[0]?.total||0),traffic});
 }
 if(p==="/api/admin/site-settings"&&req.method==="GET"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);
   const rows=await env.DB.prepare("SELECT key,value FROM site_settings").all();
   const settings={};for(const row of rows.results||[])settings[row.key]=row.value;
   const [reviewsRows,offersRows,eventsRows,galleryRows]=await env.DB.batch([
     env.DB.prepare("SELECT * FROM reviews ORDER BY created_at DESC LIMIT 100"),
     env.DB.prepare("SELECT * FROM offers ORDER BY created_at DESC LIMIT 100"),
     env.DB.prepare("SELECT * FROM service_events ORDER BY created_at DESC LIMIT 100"),
     env.DB.prepare("SELECT * FROM gallery_items ORDER BY sort_order ASC, created_at DESC LIMIT 100")
   ]);
   return json({settings,reviews:reviewsRows.results||[],offers:offersRows.results||[],events:eventsRows.results||[],gallery:galleryRows.results||[]});
 }
 if(p==="/api/admin/site-settings"&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);const d=await readJSON(req);if(!d||typeof d!=="object")return bad("بيانات غير صحيحة.");
   const allowed=[...Object.keys(CMS_CONTENT_LIMITS),"hero_title","hero_subtitle","hero_primary_text","hero_primary_link","hero_secondary_text","hero_secondary_link","accent_color","section_order","show_services","show_booking","show_parts","show_branches","show_reviews","show_contact","show_brand_text","brand_name","brand_subtitle","contact_phone","whatsapp_number","contact_email","facebook_url","instagram_url","services_page_title","services_page_title_en","services_page_intro","services_page_intro_en","about_page_title","about_page_title_en","about_page_intro","about_page_intro_en","warranty_page_title","warranty_page_title_en","warranty_page_intro","warranty_page_intro_en","contact_page_title","contact_page_title_en","contact_page_intro","contact_page_intro_en"];
   const stmts=[];
   for(const key of allowed){
     if(Object.prototype.hasOwnProperty.call(d,key)){
       const contentLimit=CMS_CONTENT_LIMITS[key];
       if(contentLimit&&(typeof d[key]!=="string"||d[key].trim().length>contentLimit))return bad("راجع طول نصوص المحتوى؛ لم يتم حفظ أي تغيير.");
       const val=clean(d[key],contentLimit||(key==="section_order"?500:1000));
       stmts.push(env.DB.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,val,Date.now()));
     }
   }
   if(stmts.length)await env.DB.batch(stmts);
   return json({ok:true});
 }
 if(p==="/api/admin/media"&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);
   let form;try{form=await req.formData()}catch{return bad("تعذر قراءة الصورة.");}
   const file=form.get("file"),kind=clean(form.get("kind")||"general",40);
   if(!(file instanceof File)||!file.type.startsWith("image/"))return bad("اختار ملف صورة صحيح.");
   if(file.size>5*1024*1024)return bad("حجم الصورة يجب ألا يتجاوز 5MB.");
   const id=crypto.randomUUID().replace(/-/g,"");
   const bytes=new Uint8Array(await file.arrayBuffer());
   await env.DB.prepare("INSERT INTO media_assets(id,created_at,filename,content_type,size,kind,data) VALUES(?,?,?,?,?,?,?)").bind(id,Date.now(),clean(file.name,200),file.type,file.size,kind,bytes).run();
   return json({ok:true,id,url:`/api/media/${id}`});
 }
 if(p==="/api/admin/reviews"&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   const customer=clean(d.customerName,100),car=clean(d.car,100),text=clean(d.reviewText,1000),rating=Math.max(1,Math.min(5,Number(d.rating)||5)),visible=d.visible===false?0:1;
   if(!customer||!text)return bad("اكتب اسم العميل والتقييم.");
   await env.DB.prepare("INSERT INTO reviews(created_at,customer_name,car,rating,review_text,visible) VALUES(?,?,?,?,?,?)").bind(Date.now(),customer,car,rating,text,visible).run();
   return json({ok:true});
 }
 const reviewMatch=p.match(/^\/api\/admin\/reviews\/(\d+)$/);
 if(reviewMatch&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   if(d.action==="delete"){
     await env.DB.prepare("DELETE FROM reviews WHERE id=?").bind(Number(reviewMatch[1])).run();
   }else if(d.action==="toggle"){
     await env.DB.prepare("UPDATE reviews SET visible=CASE visible WHEN 1 THEN 0 ELSE 1 END WHERE id=?").bind(Number(reviewMatch[1])).run();
   }else return bad("إجراء غير صحيح.");
   return json({ok:true});
 }
 if(p==="/api/admin/trash"&&req.method==="GET"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);
   const [b,parts,c]=await env.DB.batch([
     env.DB.prepare("SELECT 'bookings' AS request_type,b.id AS request_id,b.name,b.phone,b.created_at,m.note,m.deleted_at FROM bookings b JOIN admin_request_meta m ON m.request_type='bookings' AND m.request_id=b.id WHERE m.deleted_at>0"),
     env.DB.prepare("SELECT 'parts' AS request_type,p.id AS request_id,p.name,p.phone,p.created_at,m.note,m.deleted_at FROM parts_requests p JOIN admin_request_meta m ON m.request_type='parts' AND m.request_id=p.id WHERE m.deleted_at>0"),
     env.DB.prepare("SELECT 'contacts' AS request_type,c.id AS request_id,c.name,c.phone,c.created_at,m.note,m.deleted_at FROM contact_requests c JOIN admin_request_meta m ON m.request_type='contacts' AND m.request_id=c.id WHERE m.deleted_at>0")
   ]);
   const trash=[...(b.results||[]),...(parts.results||[]),...(c.results||[])].sort((a,b)=>Number(b.deleted_at)-Number(a.deleted_at)).slice(0,500);
   return json({trash});
 }
 const requestAction=p.match(/^\/api\/admin\/request\/(bookings|parts|contacts)\/(\d+)$/);
 if(requestAction&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   const type=requestAction[1],id=Number(requestAction[2]),action=clean(d.action,30),now=Date.now();
   if(action==="note"){
     const note=clean(d.note,3000);
     await env.DB.prepare("INSERT INTO admin_request_meta(request_type,request_id,note,deleted_at,updated_at) VALUES(?,?,?,0,?) ON CONFLICT(request_type,request_id) DO UPDATE SET note=excluded.note,updated_at=excluded.updated_at").bind(type,id,note,now).run();
   }else if(action==="delete"){
     await env.DB.prepare("INSERT INTO admin_request_meta(request_type,request_id,note,deleted_at,updated_at) VALUES(?,?,COALESCE((SELECT note FROM admin_request_meta WHERE request_type=? AND request_id=?),''),?,?) ON CONFLICT(request_type,request_id) DO UPDATE SET deleted_at=excluded.deleted_at,updated_at=excluded.updated_at").bind(type,id,type,id,now,now).run();
   }else if(action==="restore"){
     await env.DB.prepare("UPDATE admin_request_meta SET deleted_at=0,updated_at=? WHERE request_type=? AND request_id=?").bind(now,type,id).run();
   }else if(action==="permanent"){
     if(clean(d.confirm,80)!==`DELETE ${id}`)return bad("تأكيد الحذف النهائي غير صحيح.",400);
     const table=type==="parts"?"parts_requests":type==="contacts"?"contact_requests":"bookings";
     const row=await env.DB.prepare(`SELECT r.id,COALESCE(m.deleted_at,0) AS deleted_at FROM ${table} r
       LEFT JOIN admin_request_meta m ON m.request_type=? AND m.request_id=r.id WHERE r.id=?`).bind(type,id).first();
     if(!row)return bad("الطلب غير موجود.",404);
     if(!Number(row.deleted_at))return bad("انقل الطلب إلى المحذوفات قبل الحذف النهائي.",409);
     const results=await env.DB.batch([
       // Recheck inside the transaction so a concurrent restore cannot be lost.
       env.DB.prepare(`DELETE FROM ${table} WHERE id=? AND EXISTS
         (SELECT 1 FROM admin_request_meta WHERE request_type=? AND request_id=? AND deleted_at>0)`).bind(id,type,id),
       env.DB.prepare(`DELETE FROM admin_request_meta WHERE request_type=? AND request_id=?
         AND NOT EXISTS (SELECT 1 FROM ${table} WHERE id=?)`).bind(type,id,id)
     ]);
     if(Number(results[0].meta?.changes)!==1)return bad("تعذر الحذف النهائي. راجع حالة الطلب وأعد المحاولة.",409);
   }else return bad("إجراء غير صحيح.");
   return json({ok:true});
 }
 if(p==="/api/admin/offers"&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   const title=clean(d.title,160),titleEn=clean(d.titleEn,160),description=clean(d.description,1500),descriptionEn=clean(d.descriptionEn,1500),imageMediaId=clean(d.imageMediaId,80),startDate=clean(d.startDate,20),endDate=clean(d.endDate,20),buttonText=clean(d.buttonText||"احجز الآن",60),buttonTextEn=clean(d.buttonTextEn||"Book Now",60),buttonLink=clean(d.buttonLink||"/booking",250);
   if(!title)return bad("اكتب عنوان العرض.");
   await env.DB.prepare("INSERT INTO offers(created_at,title,title_en,description,description_en,image_media_id,start_date,end_date,button_text,button_text_en,button_link,visible) VALUES(?,?,?,?,?,?,?,?,?,?,?,1)").bind(Date.now(),title,titleEn,description,descriptionEn,imageMediaId,startDate,endDate,buttonText,buttonTextEn,buttonLink).run();
   return json({ok:true});
 }
 const offerAction=p.match(/^\/api\/admin\/offers\/(\d+)$/);
 if(offerAction&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   const id=Number(offerAction[1]),action=clean(d.action,30);
   if(action==="toggle")await env.DB.prepare("UPDATE offers SET visible=CASE visible WHEN 1 THEN 0 ELSE 1 END WHERE id=?").bind(id).run();
   else if(action==="delete")await env.DB.prepare("DELETE FROM offers WHERE id=?").bind(id).run();
   else if(action==="update"){
     const title=clean(d.title,160),titleEn=clean(d.titleEn,160),description=clean(d.description,1500),descriptionEn=clean(d.descriptionEn,1500),startDate=clean(d.startDate,20),endDate=clean(d.endDate,20),buttonText=clean(d.buttonText||"احجز الآن",60),buttonTextEn=clean(d.buttonTextEn||"Book Now",60),buttonLink=clean(d.buttonLink||"/booking",250);
     if(!title)return bad("اكتب عنوان العرض.");
     const imageMediaId=clean(d.imageMediaId,80);
     if(imageMediaId)await env.DB.prepare("UPDATE offers SET title=?,title_en=?,description=?,description_en=?,start_date=?,end_date=?,button_text=?,button_text_en=?,button_link=?,image_media_id=? WHERE id=?").bind(title,titleEn,description,descriptionEn,startDate,endDate,buttonText,buttonTextEn,buttonLink,imageMediaId,id).run();
     else await env.DB.prepare("UPDATE offers SET title=?,title_en=?,description=?,description_en=?,start_date=?,end_date=?,button_text=?,button_text_en=?,button_link=? WHERE id=?").bind(title,titleEn,description,descriptionEn,startDate,endDate,buttonText,buttonTextEn,buttonLink,id).run();
   }else return bad("إجراء غير صحيح.");
   return json({ok:true});
 }
 if(p==="/api/admin/events"&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   const titleAr=clean(d.titleAr,160),titleEn=clean(d.titleEn,160),descriptionAr=clean(d.descriptionAr,1500),descriptionEn=clean(d.descriptionEn,1500),locationAr=clean(d.locationAr,180),locationEn=clean(d.locationEn,180);
   const availability=clean(d.availability||"available",20),imageMediaId=clean(d.imageMediaId,80),startDate=clean(d.startDate,20),endDate=clean(d.endDate,20),buttonTextAr=clean(d.buttonTextAr||"اعرف التفاصيل",60),buttonTextEn=clean(d.buttonTextEn||"View Details",60),buttonLink=clean(d.buttonLink||"/contact",250);
   if(!titleAr)return bad("اكتب اسم الحدث بالعربي.");
   if(!["available","unavailable","coming"].includes(availability))return bad("حالة التوفر غير صحيحة.");
   await env.DB.prepare("INSERT INTO service_events(created_at,title_ar,title_en,description_ar,description_en,location_ar,location_en,availability,image_media_id,start_date,end_date,button_text_ar,button_text_en,button_link,visible) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)").bind(Date.now(),titleAr,titleEn,descriptionAr,descriptionEn,locationAr,locationEn,availability,imageMediaId,startDate,endDate,buttonTextAr,buttonTextEn,buttonLink).run();
   return json({ok:true});
 }
 const eventAction=p.match(/^\/api\/admin\/events\/(\d+)$/);
 if(eventAction&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   const id=Number(eventAction[1]),action=clean(d.action,30);
   if(action==="toggle")await env.DB.prepare("UPDATE service_events SET visible=CASE visible WHEN 1 THEN 0 ELSE 1 END WHERE id=?").bind(id).run();
   else if(action==="delete")await env.DB.prepare("DELETE FROM service_events WHERE id=?").bind(id).run();
   else if(action==="update"){
     const titleAr=clean(d.titleAr,160),titleEn=clean(d.titleEn,160),descriptionAr=clean(d.descriptionAr,1500),descriptionEn=clean(d.descriptionEn,1500),locationAr=clean(d.locationAr,180),locationEn=clean(d.locationEn,180);
     const availability=clean(d.availability||"available",20),startDate=clean(d.startDate,20),endDate=clean(d.endDate,20),buttonTextAr=clean(d.buttonTextAr||"اعرف التفاصيل",60),buttonTextEn=clean(d.buttonTextEn||"View Details",60),buttonLink=clean(d.buttonLink||"/contact",250),imageMediaId=clean(d.imageMediaId,80);
     if(!titleAr)return bad("اكتب اسم الحدث بالعربي.");
     if(!["available","unavailable","coming"].includes(availability))return bad("حالة التوفر غير صحيحة.");
     if(imageMediaId)await env.DB.prepare("UPDATE service_events SET title_ar=?,title_en=?,description_ar=?,description_en=?,location_ar=?,location_en=?,availability=?,start_date=?,end_date=?,button_text_ar=?,button_text_en=?,button_link=?,image_media_id=? WHERE id=?").bind(titleAr,titleEn,descriptionAr,descriptionEn,locationAr,locationEn,availability,startDate,endDate,buttonTextAr,buttonTextEn,buttonLink,imageMediaId,id).run();
     else await env.DB.prepare("UPDATE service_events SET title_ar=?,title_en=?,description_ar=?,description_en=?,location_ar=?,location_en=?,availability=?,start_date=?,end_date=?,button_text_ar=?,button_text_en=?,button_link=? WHERE id=?").bind(titleAr,titleEn,descriptionAr,descriptionEn,locationAr,locationEn,availability,startDate,endDate,buttonTextAr,buttonTextEn,buttonLink,id).run();
   }else return bad("إجراء غير صحيح.");
   return json({ok:true});
 }
 if(p==="/api/admin/gallery"&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);
   let form;try{form=await req.formData()}catch{return bad("تعذر قراءة البيانات.");}
   const file=form.get("file"),caption=clean(form.get("caption"),180);
   if(!(file instanceof File)||!file.type.startsWith("image/"))return bad("اختار صورة صحيحة.");
   if(file.size>5*1024*1024)return bad("حجم الصورة يجب ألا يتجاوز 5MB.");
   const mediaId=crypto.randomUUID().replace(/-/g,""),bytes=new Uint8Array(await file.arrayBuffer());
   const maxRow=await env.DB.prepare("SELECT COALESCE(MAX(sort_order),0) AS mx FROM gallery_items").first();
   await env.DB.batch([
     env.DB.prepare("INSERT INTO media_assets(id,created_at,filename,content_type,size,kind,data) VALUES(?,?,?,?,?,?,?)").bind(mediaId,Date.now(),clean(file.name,200),file.type,file.size,"gallery",bytes),
     env.DB.prepare("INSERT INTO gallery_items(created_at,media_id,caption,visible,sort_order) VALUES(?,?,?,?,?)").bind(Date.now(),mediaId,caption,1,Number(maxRow?.mx||0)+1)
   ]);
   return json({ok:true});
 }
 const galleryAction=p.match(/^\/api\/admin\/gallery\/(\d+)$/);
 if(galleryAction&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   const id=Number(galleryAction[1]),action=clean(d.action,30);
   if(action==="toggle")await env.DB.prepare("UPDATE gallery_items SET visible=CASE visible WHEN 1 THEN 0 ELSE 1 END WHERE id=?").bind(id).run();
   else if(action==="delete")await env.DB.prepare("DELETE FROM gallery_items WHERE id=?").bind(id).run();
   else if(action==="up")await env.DB.prepare("UPDATE gallery_items SET sort_order=sort_order-1 WHERE id=?").bind(id).run();
   else if(action==="down")await env.DB.prepare("UPDATE gallery_items SET sort_order=sort_order+1 WHERE id=?").bind(id).run();
   else return bad("إجراء غير صحيح.");
   return json({ok:true});
 }
  const m=p.match(/^\/api\/admin\/status\/(bookings|parts|contacts)\/(\d+)$/);
 if(m&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);const d=await readJSON(req),status=clean(d?.status,20);
   if(!["new","contacted","confirmed","completed","cancelled"].includes(status))return bad("حالة غير صحيحة.");
   const table=m[1]==="parts"?"parts_requests":m[1]==="contacts"?"contact_requests":"bookings";
   await env.DB.prepare(`UPDATE ${table} SET status=? WHERE id=?`).bind(status,Number(m[2])).run();
   return json({ok:true});
 }
 return bad("API غير موجود.",404);
}
export default{
 async fetch(req,env,ctx){
   const url=new URL(req.url);
   if(url.hostname==="www.esoticaegypt.com"||url.hostname==="esotica-auto-egypt.pages.dev"){
     const primary=new URL(req.url);
     primary.protocol="https:";
     primary.hostname="esoticaegypt.com";
     primary.port="";
     return Response.redirect(primary.toString(),308);
   }
   const english=englishPage(url);
   if(english&&(req.method==="GET"||req.method==="HEAD"))return serveEnglishPage(req,env,url,english);
   if((url.pathname==="/en"||url.pathname.startsWith("/en/"))&&!english)return new Response("Page not found",{status:404,headers:{"content-type":"text/plain; charset=utf-8"}});
   if(url.pathname==="/sitemap.xml"){
     return env.ASSETS.fetch(new Request(new URL("/sitemap.xml",url),req));
   }
   if(url.pathname==="/robots.txt"){
     return new Response("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: https://esoticaegypt.com/sitemap.xml\n",{status:200,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public, max-age=300"}});
   }
   try{
     if(url.pathname.startsWith("/api/"))return await handleAPI(req,env,url,ctx);
     if(url.pathname==="/admin"||url.pathname==="/admin/")return env.ASSETS.fetch(new Request(new URL("/admin/",url),req));
     if(url.pathname==="/admin/login")return Response.redirect(new URL("/admin",url),302);
     return env.ASSETS.fetch(req);
   }catch(e){
     console.error(e);
     if(isPublicFormPath(url.pathname))return publicFormError("SERVER_ERROR",null,500);
     if(url.pathname.startsWith("/api/"))return bad("حدث خطأ في الخادم. راجع ربط DB وإعدادات Cloudflare.",500);
     return new Response("Server error",{status:500});
   }
 }
}
