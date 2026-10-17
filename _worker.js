const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...extra}});
const bad=(message,status=400)=>json({error:message},status);

let analyticsSchemaPromise=null;
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
 branch TEXT NOT NULL, preferred_date TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
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
function validPhone(v){return /^[0-9+\s()-]{8,20}$/.test(v)}
function validYear(v){return /^\d{4}$/.test(v)&&Number(v)>=1980&&Number(v)<=2100}
function cairoDateParts(){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
 const get=t=>parts.find(p=>p.type===t)?.value||"";
 return {date:`${get("year")}-${get("month")}-${get("day")}`,hour:Number(get("hour")),minute:Number(get("minute"))};
}
function validateBookingDate(v){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return "اختار تاريخ حجز صحيح.";
 const now=cairoDateParts();
 if(v<now.date)return "لا يمكن اختيار تاريخ قديم. اختار تاريخ من اليوم أو بعده.";
 if(v===now.date && now.hour>=17)return "انتهى وقت حجز نفس اليوم. اختار موعدًا من بكرة أو بعده.";
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
 const o=req.headers.get("origin"); if(!o)return true;
 try{return new URL(o).origin===new URL(req.url).origin}catch{return false}
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
async function handleAPI(req,env,url){
 const p=url.pathname;
 if(req.method==="POST"&&!sameOrigin(req)) return bad("طلب غير مسموح.",403);

 if(p==="/api/health"){
   return json({ok:true,database:!!env.DB,adminConfigured:!!env.ADMIN_PASSWORD});
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
   await initDB(env); const d=await readJSON(req); if(!d)return bad("بيانات غير صحيحة.");
   const name=clean(d.name,80),phone=clean(d.phone,20),carModel=clean(d.carModel,80),year=clean(d.year,4),branch=clean(d.branch,100),preferredDate=clean(d.preferredDate,20),details=clean(d.details,700),source=leadSource(d);
   if(!name||!validPhone(phone)||!carModel||!validYear(year)||!branch||!preferredDate)return bad("راجع البيانات المطلوبة ورقم الهاتف وسنة الصنع.");
   const dateError=validateBookingDate(preferredDate);if(dateError)return bad(dateError);
   await env.DB.prepare("INSERT INTO bookings(created_at,name,phone,car_model,year,branch,preferred_date,details,source_type,source_label,source_id,source_page,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(Date.now(),name,phone,carModel,year,branch,preferredDate,details,source.type,source.label,source.id,source.page,"new").run();
   return json({message:"تم استلام طلب الحجز. سيتواصل معك فريق Esotica لتأكيد الموعد."});
 }
 if(p==="/api/parts"&&req.method==="POST"){
   await initDB(env); const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   const name=clean(d.name,80),phone=clean(d.phone,20),carModel=clean(d.carModel,80),year=clean(d.year,4),vin=clean(d.vin,17).toUpperCase(),partCode=clean(d.partCode,60),details=clean(d.details,700),quantity=Math.min(20,Math.max(1,Number(d.quantity)||1)),source=leadSource(d);
   if(!name||!validPhone(phone)||!carModel||!validYear(year)||!(/^([A-HJ-NPR-Z0-9]{7}|[A-HJ-NPR-Z0-9]{17})$/.test(vin))||!details)return bad("راجع البيانات. رقم الشاسيه يجب أن يكون 7 أو 17 خانة صحيحة.");
   await env.DB.prepare("INSERT INTO parts_requests(created_at,request_type,name,phone,car_model,year,vin,part_code,quantity,details,source_type,source_label,source_id,source_page,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(Date.now(),"inquiry",name,phone,carModel,year,vin,partCode,quantity,details,source.type,source.label,source.id,source.page,"new").run();
   return json({message:"تم استلام استعلام قطع الغيار. سيتم التواصل لتأكيد التوفر والسعر."});
 }
 if(p==="/api/contact"&&req.method==="POST"){
   await initDB(env);const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   const name=clean(d.name,80),phone=clean(d.phone,20),subject=clean(d.subject,120),message=clean(d.message,900),source=leadSource(d);
   if(!name||!validPhone(phone)||!subject||!message)return bad("راجع البيانات المطلوبة.");
   await env.DB.prepare("INSERT INTO contact_requests(created_at,name,phone,subject,message,source_type,source_label,source_id,source_page,status) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(Date.now(),name,phone,subject,message,source.type,source.label,source.id,source.page,"new").run();
   return json({message:"تم استلام رسالتك. سيتواصل معك فريق Esotica."});
 }

 if(p==="/api/admin/login"&&req.method==="POST"){
   if(!env.ADMIN_PASSWORD)return bad("دخول الإدارة غير مُعدّ بعد. أضف ADMIN_PASSWORD في Cloudflare.",503);
   const d=await readJSON(req);const u=clean(d?.username,50),pw=String(d?.password??"");
   if(u!=="admin"||pw!==env.ADMIN_PASSWORD)return bad("اسم المستخدم أو كلمة السر غير صحيحة.",401);
   const token=await makeSession(env);return json({ok:true},200,{"set-cookie":sessionCookie(token)});
 }
 if(p==="/api/admin/logout"&&req.method==="POST")return json({ok:true},200,{"set-cookie":logoutCookie()});

 if(p==="/api/admin/traffic"&&req.method==="GET"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   return json({traffic:await trafficSnapshot(env)});
 }
 if(p==="/api/admin/reset"&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   if(d.scope==="requests"&&d.confirm==="RESET_REQUESTS"){
     await initDB(env);
     await env.DB.batch([
       env.DB.prepare("DELETE FROM admin_request_meta"),
       env.DB.prepare("DELETE FROM bookings"),
       env.DB.prepare("DELETE FROM parts_requests"),
       env.DB.prepare("DELETE FROM contact_requests"),
       env.DB.prepare("DELETE FROM sqlite_sequence WHERE name IN ('bookings','parts_requests','contact_requests')")
     ]);
     return json({ok:true,message:"تم مسح طلبات التجربة وإعادة الترقيم من 1."});
   }
   if(d.scope==="traffic"&&d.confirm==="RESET_TRAFFIC"){
     await initAnalyticsDB(env);
     await env.DB.batch([
       env.DB.prepare("DELETE FROM site_visitor_days"),
       env.DB.prepare("DELETE FROM site_visitor_months"),
       env.DB.prepare("DELETE FROM site_visitors")
     ]);
     return json({ok:true,message:"تم تصفير إحصاءات الزوار."});
   }
   return bad("تأكيد إعادة الضبط غير صحيح.",400);
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
   const allowed=["hero_title","hero_subtitle","hero_primary_text","hero_primary_link","hero_secondary_text","hero_secondary_link","logo_media_id","hero_media_id","accent_color","section_order","show_services","show_booking","show_parts","show_branches","show_reviews","show_contact","show_brand_text","brand_name","brand_subtitle","contact_phone","whatsapp_number","contact_email","facebook_url","instagram_url"];
   const stmts=[];
   for(const key of allowed){
     if(Object.prototype.hasOwnProperty.call(d,key)){
       const val=clean(d[key],key==="section_order"?500:1000);
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
     const table=type==="parts"?"parts_requests":type==="contacts"?"contact_requests":"bookings";
     await env.DB.batch([
       env.DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id),
       env.DB.prepare("DELETE FROM admin_request_meta WHERE request_type=? AND request_id=?").bind(type,id)
     ]);
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
 async fetch(req,env){
   const url=new URL(req.url);
   if(url.hostname==="www.esoticaegypt.com"||url.hostname==="esotica-auto-egypt.pages.dev"){
     const primary=new URL(req.url);
     primary.protocol="https:";
     primary.hostname="esoticaegypt.com";
     primary.port="";
     return Response.redirect(primary.toString(),308);
   }
   if(url.pathname==="/sitemap.xml"){
     return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url><loc>https://esoticaegypt.com/</loc><lastmod>2026-10-01</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n  <url><loc>https://esoticaegypt.com/services</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n  <url><loc>https://esoticaegypt.com/range-rover-land-rover-service</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n  <url><loc>https://esoticaegypt.com/jaguar-service</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n  <url><loc>https://esoticaegypt.com/luxury-car-service</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n  <url><loc>https://esoticaegypt.com/booking</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n  <url><loc>https://esoticaegypt.com/parts</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n  <url><loc>https://esoticaegypt.com/branches</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n  <url><loc>https://esoticaegypt.com/branches/fifth-settlement</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n  <url><loc>https://esoticaegypt.com/branches/third-settlement</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n  <url><loc>https://esoticaegypt.com/branches/sheikh-zayed</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n  <url><loc>https://esoticaegypt.com/offers</loc><lastmod>2026-10-01</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n  <url><loc>https://esoticaegypt.com/warranty-insurance</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n  <url><loc>https://esoticaegypt.com/about</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n  <url><loc>https://esoticaegypt.com/contact</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n  <url><loc>https://esoticaegypt.com/privacy</loc><lastmod>2026-10-01</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n</urlset>",{status:200,headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public, max-age=300"}});
   }
   if(url.pathname==="/robots.txt"){
     return new Response("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: https://esoticaegypt.com/sitemap.xml\n",{status:200,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public, max-age=300"}});
   }
   try{
     if(url.pathname.startsWith("/api/"))return await handleAPI(req,env,url);
     if(url.pathname==="/admin"||url.pathname==="/admin/")return env.ASSETS.fetch(new Request(new URL("/admin/",url),req));
     if(url.pathname==="/admin/login")return Response.redirect(new URL("/admin",url),302);
     return env.ASSETS.fetch(req);
   }catch(e){
     console.error(e);
     if(url.pathname.startsWith("/api/"))return bad("حدث خطأ في الخادم. راجع ربط DB وإعدادات Cloudflare.",500);
     return new Response("Server error",{status:500});
   }
 }
}
