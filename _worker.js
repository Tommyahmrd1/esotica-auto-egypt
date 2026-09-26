const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...extra}});
const bad=(message,status=400)=>json({error:message},status);

async function initDB(env){
  if(!env.DB) throw new Error("Missing D1 binding: DB");
  const sql=[
`CREATE TABLE IF NOT EXISTS bookings (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at INTEGER NOT NULL,
 name TEXT NOT NULL, phone TEXT NOT NULL, car_model TEXT NOT NULL, year TEXT NOT NULL,
 branch TEXT NOT NULL, preferred_date TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'new')`,
`CREATE TABLE IF NOT EXISTS parts_requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at INTEGER NOT NULL,
 request_type TEXT NOT NULL DEFAULT 'inquiry',
 name TEXT NOT NULL, phone TEXT NOT NULL, car_model TEXT NOT NULL, year TEXT NOT NULL,
 vin TEXT NOT NULL, part_code TEXT NOT NULL DEFAULT '', quantity INTEGER NOT NULL DEFAULT 1,
 details TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new')`,
`CREATE TABLE IF NOT EXISTS contact_requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at INTEGER NOT NULL,
 name TEXT NOT NULL, phone TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL,
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
 visible INTEGER NOT NULL DEFAULT 1)`
  ];
  await env.DB.batch(sql.map(s=>env.DB.prepare(s)));
}
function clean(v,max=500){return String(v??"").trim().slice(0,max)}
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
async function readJSON(req){try{return await req.json()}catch{return null}}
function sameOrigin(req){
 const o=req.headers.get("origin"); if(!o)return true;
 try{return new URL(o).origin===new URL(req.url).origin}catch{return false}
}
async function handleAPI(req,env,url){
 const p=url.pathname;
 if(req.method==="POST"&&!sameOrigin(req)) return bad("طلب غير مسموح.",403);

 if(p==="/api/health"){
   return json({ok:true,database:!!env.DB,adminConfigured:!!env.ADMIN_PASSWORD});
 }
 if(p==="/api/site-content"&&req.method==="GET"){
   await initDB(env);
   const [settingsRows,reviewsRows]=await env.DB.batch([
     env.DB.prepare("SELECT key,value FROM site_settings"),
     env.DB.prepare("SELECT id,customer_name,car,rating,review_text FROM reviews WHERE visible=1 ORDER BY created_at DESC LIMIT 20")
   ]);
   const settings={};for(const row of settingsRows.results||[])settings[row.key]=row.value;
   return json({settings,reviews:reviewsRows.results||[]});
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
   const name=clean(d.name,80),phone=clean(d.phone,20),carModel=clean(d.carModel,80),year=clean(d.year,4),branch=clean(d.branch,100),preferredDate=clean(d.preferredDate,20),details=clean(d.details,700);
   if(!name||!validPhone(phone)||!carModel||!validYear(year)||!branch||!preferredDate)return bad("راجع البيانات المطلوبة ورقم الهاتف وسنة الصنع.");
   const dateError=validateBookingDate(preferredDate);if(dateError)return bad(dateError);
   await env.DB.prepare("INSERT INTO bookings(created_at,name,phone,car_model,year,branch,preferred_date,details,status) VALUES(?,?,?,?,?,?,?,?,?)").bind(Date.now(),name,phone,carModel,year,branch,preferredDate,details,"new").run();
   return json({message:"تم استلام طلب الحجز. سيتواصل معك فريق Esotica لتأكيد الموعد."});
 }
 if(p==="/api/parts"&&req.method==="POST"){
   await initDB(env); const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   const name=clean(d.name,80),phone=clean(d.phone,20),carModel=clean(d.carModel,80),year=clean(d.year,4),vin=clean(d.vin,17).toUpperCase(),partCode=clean(d.partCode,60),details=clean(d.details,700),quantity=Math.min(20,Math.max(1,Number(d.quantity)||1));
   if(!name||!validPhone(phone)||!carModel||!validYear(year)||!(/^([A-HJ-NPR-Z0-9]{7}|[A-HJ-NPR-Z0-9]{17})$/.test(vin))||!details)return bad("راجع البيانات. رقم الشاسيه يجب أن يكون 7 أو 17 خانة صحيحة.");
   await env.DB.prepare("INSERT INTO parts_requests(created_at,request_type,name,phone,car_model,year,vin,part_code,quantity,details,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(Date.now(),"inquiry",name,phone,carModel,year,vin,partCode,quantity,details,"new").run();
   return json({message:"تم استلام استعلام قطع الغيار. سيتم التواصل لتأكيد التوفر والسعر."});
 }
 if(p==="/api/contact"&&req.method==="POST"){
   await initDB(env);const d=await readJSON(req);if(!d)return bad("بيانات غير صحيحة.");
   const name=clean(d.name,80),phone=clean(d.phone,20),subject=clean(d.subject,120),message=clean(d.message,900);
   if(!name||!validPhone(phone)||!subject||!message)return bad("راجع البيانات المطلوبة.");
   await env.DB.prepare("INSERT INTO contact_requests(created_at,name,phone,subject,message,status) VALUES(?,?,?,?,?,?)").bind(Date.now(),name,phone,subject,message,"new").run();
   return json({message:"تم استلام رسالتك. سيتواصل معك فريق Esotica."});
 }

 if(p==="/api/admin/login"&&req.method==="POST"){
   if(!env.ADMIN_PASSWORD)return bad("دخول الإدارة غير مُعدّ بعد. أضف ADMIN_PASSWORD في Cloudflare.",503);
   const d=await readJSON(req);const u=clean(d?.username,50),pw=String(d?.password??"");
   if(u!=="admin"||pw!==env.ADMIN_PASSWORD)return bad("اسم المستخدم أو كلمة السر غير صحيحة.",401);
   const token=await makeSession(env);return json({ok:true},200,{"set-cookie":sessionCookie(token)});
 }
 if(p==="/api/admin/logout"&&req.method==="POST")return json({ok:true},200,{"set-cookie":logoutCookie()});

 if(p==="/api/admin/dashboard"&&req.method==="GET"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);
   const [b,parts,c]=await env.DB.batch([
     env.DB.prepare("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 200"),
     env.DB.prepare("SELECT * FROM parts_requests ORDER BY created_at DESC LIMIT 200"),
     env.DB.prepare("SELECT * FROM contact_requests ORDER BY created_at DESC LIMIT 200")
   ]);
   return json({bookings:b.results||[],parts:parts.results||[],contacts:c.results||[]});
 }
 if(p==="/api/admin/site-settings"&&req.method==="GET"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);
   const rows=await env.DB.prepare("SELECT key,value FROM site_settings").all();
   const settings={};for(const row of rows.results||[])settings[row.key]=row.value;
   const reviews=(await env.DB.prepare("SELECT * FROM reviews ORDER BY created_at DESC LIMIT 100").all()).results||[];
   return json({settings,reviews});
 }
 if(p==="/api/admin/site-settings"&&req.method==="POST"){
   if(!(await auth(req,env)))return bad("غير مصرح.",401);
   await initDB(env);const d=await readJSON(req);if(!d||typeof d!=="object")return bad("بيانات غير صحيحة.");
   const allowed=["hero_title","hero_subtitle","hero_primary_text","hero_primary_link","hero_secondary_text","hero_secondary_link","logo_media_id","hero_media_id","accent_color","section_order","show_services","show_booking","show_parts","show_branches","show_reviews","show_contact","show_brand_text","brand_name","brand_subtitle"];
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
   try{
     if(url.pathname.startsWith("/api/"))return await handleAPI(req,env,url);
     if(url.pathname==="/admin"||url.pathname==="/admin/")return env.ASSETS.fetch(new Request(new URL("/admin/",url),req));
     if(url.pathname==="/admin/login")return Response.redirect(new URL("/admin",url),302);
     const pageRoutes={"/booking":"/booking.html","/booking/":"/booking.html","/parts":"/parts.html","/parts/":"/parts.html","/services":"/services.html","/services/":"/services.html","/branches":"/branches.html","/branches/":"/branches.html","/contact":"/contact.html","/contact/":"/contact.html"};
     if(pageRoutes[url.pathname])return env.ASSETS.fetch(new Request(new URL(pageRoutes[url.pathname],url),req));
     return env.ASSETS.fetch(req);
   }catch(e){
     console.error(e);
     if(url.pathname.startsWith("/api/"))return bad("حدث خطأ في الخادم. راجع ربط DB وإعدادات Cloudflare.",500);
     return new Response("Server error",{status:500});
   }
 }
}