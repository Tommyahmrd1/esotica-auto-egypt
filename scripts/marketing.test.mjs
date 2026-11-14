import assert from "node:assert/strict";
import test from "node:test";
import {fixture} from "./test-support.mjs";

const visitor="a1".repeat(16),cookie={cookie:`esotica_visitor=${visitor}`};
const campaign={campaignSource:"instagram",campaignMedium:"paid_social",campaignName:"Autumn Service",campaignContent:"workshop-v1",campaignTerm:"Range Rover",campaignLanding:"/en/services",campaignReferrer:"www.instagram.com"};
const event=(overrides={})=>({id:crypto.randomUUID(),type:"booking_click",form:"",page:"/en/services",...campaign,...overrides});
const bodies={
 booking:{name:"Private Test Customer",phone:"01012345678",carModel:"Private vehicle",year:"2024",branch:"فرع التجمع الخامس",serviceType:"maintenance",preferredDate:"2099-01-20",preferredTime:"10:30",details:"Private booking details"},
 parts:{name:"Private Test Customer",phone:"01012345678",carModel:"Private vehicle",year:"2024",vin:"ABCDEFG",partCode:"PRIVATE-PART",quantity:2,details:"Private part details"},
 contact:{name:"Private Test Customer",phone:"01012345678",subject:"Private subject",message:"Private customer message"}
};
const mailEnv={RESEND_API_KEY:"re_marketing_isolated_test",LEAD_ALERT_FROM:"alerts@example.test",LEAD_ALERT_TO:"team@example.test"};
function fakeMail(t){
 const calls=[];
 t.mock.method(globalThis,"fetch",async(url,options)=>{
   assert.equal(String(url),"https://api.resend.com/emails");
   calls.push(JSON.parse(options.body));
   return new Response("{}",{status:200});
 });
 return calls;
}
const postEvent=(f,payload,ip="192.0.2.1",headers=cookie)=>f.post("analytics/event",payload,ip,"https://esoticaegypt.com",headers);

test("public events store only approved metadata with the server timestamp and existing random visitor",async t=>{
 const now=Date.parse("2026-11-14T12:34:56Z");t.mock.timers.enable({apis:["Date"],now});
 const f=fixture(t),payload=event();
 const response=await postEvent(f,payload);
 assert.equal(response.status,200);assert.equal(response.headers.get("set-cookie"),null);
 const row=f.sqlite.prepare("SELECT * FROM public_marketing_events").get();
 assert.equal(row.created_at,now);assert.equal(row.event_id,payload.id);assert.equal(row.event_type,"booking_click");
 assert.equal(row.page,"/en/services");assert.equal(row.visitor_id,visitor);assert.equal(row.campaign_source,"instagram");
 assert.equal(row.campaign_landing,"/en/services");assert.equal(row.campaign_referrer,"www.instagram.com");
 assert.ok(!JSON.stringify(row).includes("192.0.2.1"));
 const columns=f.sqlite.prepare("PRAGMA table_info(public_marketing_events)").all().map(column=>column.name);
 assert.ok(!columns.some(column=>["phone","name","message","details","email","ip","query","gclid","fbclid"].includes(column)));
});

test("public page views and interactions are accepted while client conversions cannot be forged",async t=>{
 const f=fixture(t);
 for(const type of ["page_view","form_start","whatsapp_click","phone_click","booking_click"]){
   const response=await postEvent(f,event({type,form:type==="form_start"?"contact":""}));
   assert.equal(response.status,200,type);
 }
 for(const type of ["form_submit","lead_created","conversion","unknown"]){
   assert.equal((await postEvent(f,event({type}))).status,400,type);
 }
 assert.equal(f.count("public_marketing_events"),5);
});

test("event retries with the same UUID cannot change or duplicate the original event",async t=>{
 const f=fixture(t),payload=event();
 const responses=await Promise.all(Array.from({length:8},()=>postEvent(f,payload)));
 assert.ok(responses.every(response=>response.status===200));assert.equal(f.count("public_marketing_events"),1);
 assert.equal((await postEvent(f,{...payload,campaignSource:"changed",type:"phone_click"})).status,200);
 const row=f.sqlite.prepare("SELECT * FROM public_marketing_events").get();
 assert.equal(row.campaign_source,"instagram");assert.equal(row.event_type,"booking_click");
});

test("missing or malformed visitor cookies produce a random cookie without encoding the client address",async t=>{
 const f=fixture(t);
 const response=await postEvent(f,event(),"192.0.2.14",{cookie:"esotica_visitor=not-valid"});
 assert.equal(response.status,200);
 const generated=response.headers.get("set-cookie");
 assert.match(generated,/^esotica_visitor=[a-f0-9]{32};/);
 assert.match(generated,/HttpOnly; Secure; SameSite=Lax/);
 const id=generated.split(";")[0].split("=")[1];
 assert.equal(f.sqlite.prepare("SELECT visitor_id FROM public_marketing_events").get().visitor_id,id);
 assert.ok(!generated.includes("192.0.2.14"));
});

test("events accept only known public routes and safe English or legacy route forms",async t=>{
 const f=fixture(t);
 for(const page of ["/","/en","/en/","/booking","/en/booking","/contact.html","/branches/fifth-settlement/","/en/branches/sheikh-zayed"]){
   assert.equal((await postEvent(f,event({page}))).status,200,page);
 }
 for(const page of ["/admin","/en/admin","/api/health","/customer-preview","/booking?phone=01012345678","/en/services#private","https://esoticaegypt.com/","//other.example/services","/not-public","/branches/../../admin","/%61dmin"]){
   assert.equal((await postEvent(f,event({page}))).status,400,page);
 }
 assert.equal(f.count("public_marketing_events"),8);
});

test("events reject malformed identifiers, event/form mismatches and private extra fields",async t=>{
 const f=fixture(t);
 const invalid=[{id:"invalid"},{type:"form_start",form:""},{type:"form_start",form:"admin"},{form:"contact"},
   {name:"Private person"},{phone:"01012345678"},{details:"Private form text"},{query:"secret=yes"},{gclid:"advertising-id"},{fbclid:"advertising-id"},{timestamp:1}];
 for(const override of invalid){
   assert.equal((await postEvent(f,event(override))).status,400,JSON.stringify(override));
 }
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE name='public_marketing_events'").get().count,0);
});

test("marketing JSON is byte-bounded even without Content-Length",async t=>{
 const f=fixture(t);
 assert.equal((await postEvent(f,event({campaignName:"x".repeat(9000)}))).status,400);
 assert.equal((await postEvent(f,event({campaignName:"أ".repeat(4200)}))).status,400);
 assert.equal((await postEvent(f,event(),"192.0.2.1",{...cookie,"content-length":"9000"})).status,400);
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE name='public_marketing_events'").get().count,0);
});

test("campaign metadata rejects email/telephone-like labels and keeps only a referrer hostname",async t=>{
 const f=fixture(t);
 assert.equal((await postEvent(f,event({campaignSource:"person@example.test",campaignMedium:"010 1234 5678",campaignName:"x".repeat(101),campaignContent:"https://private.example/path?email=a",campaignTerm:"۰۱۰-۱۲۳۴-۵۶۷۸",campaignLanding:"/booking?phone=01012345678",campaignReferrer:"https://www.google.com/search?email=private@example.test"}))).status,200);
 const row=f.sqlite.prepare("SELECT * FROM public_marketing_events").get();
 assert.equal(row.campaign_source,"direct");
 for(const name of ["campaign_medium","campaign_name","campaign_content","campaign_term"])assert.equal(row[name],"");
 assert.equal(row.campaign_landing,"/en/services");assert.equal(row.campaign_referrer,"www.google.com");
 const serialized=JSON.stringify(row);assert.ok(!serialized.includes("private@example.test"));assert.ok(!serialized.includes("01012345678"));assert.ok(!serialized.includes("?"));
});

test("safe Unicode campaign labels are retained and unsafe referrer forms are discarded",async t=>{
 const f=fixture(t);
 for(const campaignReferrer of ["person@example.test","127.0.0.1","localhost","https://user:secret@example.test/path","https://esoticaegypt.com/contact","mailto:person@example.test"]){
   const payload=event({campaignName:"صيانة نوفمبر ٢٠٢٦",campaignReferrer});
   assert.equal((await postEvent(f,payload)).status,200,campaignReferrer);
   const row=f.sqlite.prepare("SELECT campaign_name,campaign_referrer FROM public_marketing_events WHERE event_id=?").get(payload.id);
   assert.equal(row.campaign_name,"صيانة نوفمبر 2026");assert.equal(row.campaign_referrer,"");
 }
});

test("event collection honors DNT and Global Privacy Control without creating tracking data",async t=>{
 const f=fixture(t);
 for(const privacy of [{dnt:"1"},{"sec-gpc":"1"}]){
   const response=await postEvent(f,event(),"192.0.2.1",{...cookie,...privacy});
   assert.equal(response.status,204);assert.equal(response.headers.get("set-cookie"),null);
 }
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE name IN ('public_marketing_events','form_rate_limits')").get().count,0);
});

test("cross-origin marketing events are refused before any database mutation",async t=>{
 const f=fixture(t);
 assert.equal((await f.post("analytics/event",event(),"192.0.2.1","https://unrelated.example.test")).status,403);
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE name='public_marketing_events'").get().count,0);
});

test("marketing quota atomically accepts120 events and cannot be bypassed with caller cookies",async t=>{
 const f=fixture(t);
 const responses=await Promise.all(Array.from({length:125},(_,index)=>postEvent(f,event(),"192.0.2.1",{cookie:`esotica_visitor=${index}`})));
 assert.equal(responses.filter(response=>response.status===200).length,120);
 assert.equal(responses.filter(response=>response.status===429).length,5);assert.equal(f.count("public_marketing_events"),120);
 assert.equal((await postEvent(f,event(),"192.0.2.2")).status,200);
 const row=f.sqlite.prepare("SELECT rate_key,hits FROM form_rate_limits WHERE hits=120").get();
 assert.match(row.rate_key,/^marketing:[a-f0-9]{64}$/);assert.ok(!row.rate_key.includes("192.0.2.1"));
});

test("event retry countdown reflects the remaining quota window and expires",async t=>{
 t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-11-14T12:00:00Z")});
 const f=fixture(t);
 await postEvent(f,event());f.sqlite.prepare("UPDATE form_rate_limits SET hits=120").run();
 t.mock.timers.tick(29*60*1000);
 const blocked=await postEvent(f,event());assert.equal(blocked.status,429);
 assert.equal(blocked.headers.get("retry-after"),"60");assert.equal((await blocked.json()).retryAfter,60);
 t.mock.timers.tick(60000);assert.equal((await postEvent(f,event())).status,200);
});

for(const [endpoint,table,type] of [["booking","bookings","bookings"],["parts","parts_requests","parts"],["contact","contact_requests","contacts"]]){
 test(`${endpoint}: only a genuine new lead creates sanitized conversion metadata`,async t=>{
   const f=fixture(t),body={...bodies[endpoint],...campaign};
   assert.equal((await f.post(endpoint,body,"192.0.2.1","https://esoticaegypt.com",cookie)).status,200);
   const row=f.sqlite.prepare("SELECT * FROM lead_marketing").get();
   assert.equal(row.request_type,type);assert.equal(row.request_id,1);assert.equal(row.visitor_id,visitor);
   assert.equal(row.campaign_source,"instagram");assert.equal(row.campaign_landing,"/en/services");
   const serialized=JSON.stringify(row);
   for(const value of [body.name,body.phone,body.carModel,body.details,body.subject,body.message,body.vin,body.partCode].filter(Boolean))assert.ok(!serialized.includes(value),value);
   const responses=await Promise.all(Array.from({length:7},()=>f.post(endpoint,{...body,campaignSource:"another"},"192.0.2.1","https://esoticaegypt.com",cookie)));
   assert.ok(responses.every(response=>response.status===200));assert.equal(f.count(table),1);assert.equal(f.count("lead_marketing"),1);
   assert.equal(f.sqlite.prepare("SELECT campaign_source FROM lead_marketing").get().campaign_source,"instagram");
 });
}

test("honeypot and storage failures cannot leave orphaned conversion metadata",async t=>{
 const f=fixture(t),body={...bodies.contact,...campaign};
 assert.equal((await f.post("contact",{...body,website:"bot.example.test"})).status,200);
 assert.equal(f.count("lead_marketing"),0);
 f.failNextLeadInsert();t.mock.method(console,"error",()=>{});
 assert.equal((await f.post("contact",body)).status,500);
 assert.equal(f.count("lead_marketing"),0);assert.equal(f.count("contact_requests"),0);assert.equal(f.count("form_submission_fingerprints"),0);
 assert.equal((await f.post("contact",body)).status,200);assert.equal(f.count("lead_marketing"),1);
});

test("conversion failure rolls back the lead, fingerprint and email outbox together",async t=>{
 const f=fixture(t,mailEnv);fakeMail(t);t.mock.method(console,"error",()=>{});
 await f.post("contact",{...bodies.contact,website:"bot.example.test"});
 f.sqlite.exec("CREATE TRIGGER fail_conversion BEFORE INSERT ON lead_marketing BEGIN SELECT RAISE(ABORT,'isolated conversion failure'); END");
 assert.equal((await f.post("contact",{...bodies.contact,...campaign})).status,500);await f.drain();
 for(const table of ["contact_requests","lead_marketing","email_alert_outbox","form_submission_fingerprints"])assert.equal(f.count(table),0,table);
 f.sqlite.exec("DROP TRIGGER fail_conversion");
 assert.equal((await f.post("contact",{...bodies.contact,...campaign})).status,200);await f.drain();
 assert.equal(f.count("contact_requests"),1);assert.equal(f.count("lead_marketing"),1);assert.equal(f.count("email_alert_outbox"),1);
});

test("WITHOUT ROWID conversion storage preserves email request IDs across unrelated row sequences",async t=>{
 const f=fixture(t,mailEnv),calls=fakeMail(t);
 await f.post("contact",{...bodies.contact,website:"bot.example.test"});
 f.sqlite.prepare("INSERT INTO email_alert_outbox(id,request_type,request_id,created_at,status) VALUES(500,'contacts',500,?,'sent')").run(Date.now());
 for(const endpoint of ["contact","parts","booking"]){
   assert.equal((await f.post(endpoint,{...bodies[endpoint],...campaign})).status,200);await f.drain();
 }
 assert.equal((await f.post("contact",{...bodies.contact,name:"Second customer",...campaign})).status,200);await f.drain();
 const outbox=f.sqlite.prepare("SELECT request_type,request_id FROM email_alert_outbox WHERE id>500 ORDER BY id").all().map(row=>({...row}));
 assert.deepEqual(outbox,[{request_type:"contacts",request_id:1},{request_type:"parts",request_id:1},{request_type:"bookings",request_id:1},{request_type:"contacts",request_id:2}]);
 assert.equal(calls.length,4);assert.equal(f.count("lead_marketing"),4);
 assert.match(f.sqlite.prepare("SELECT sql FROM sqlite_master WHERE name='lead_marketing'").get().sql,/WITHOUT ROWID/i);
});

test("lead conversion becomes direct and unlinked when privacy opt-out is present",async t=>{
 const f=fixture(t);
 assert.equal((await f.post("contact",{...bodies.contact,...campaign},"192.0.2.1","https://esoticaegypt.com",{...cookie,dnt:"1"})).status,200);
 const row=f.sqlite.prepare("SELECT * FROM lead_marketing").get();
 assert.equal(row.campaign_source,"direct");assert.equal(row.visitor_id,"");
 for(const column of ["campaign_medium","campaign_name","campaign_content","campaign_term","campaign_landing","campaign_referrer"])assert.equal(row[column],"");
});

test("90-day cleanup removes old marketing metadata while preserving customer requests",async t=>{
 const f=fixture(t);
 await postEvent(f,event());await f.post("contact",{...bodies.contact,...campaign});
 const old=Date.now()-91*24*60*60*1000;
 f.sqlite.prepare("UPDATE public_marketing_events SET created_at=?").run(old);
 f.sqlite.prepare("UPDATE lead_marketing SET created_at=?").run(old);
 f.sqlite.prepare("UPDATE form_rate_limits SET window_started=?").run(Date.now()-25*60*60*1000);
 assert.equal((await postEvent(f,event(),"192.0.2.2")).status,200);
 assert.equal(f.count("public_marketing_events"),1);assert.equal(f.count("lead_marketing"),0);assert.equal(f.count("contact_requests"),1);
 assert.equal(f.count("form_rate_limits"),1);
});

test("new leads also clean expired marketing metadata",async t=>{
 const f=fixture(t);
 await postEvent(f,event());await f.post("contact",{...bodies.contact,...campaign});
 const old=Date.now()-91*24*60*60*1000;
 f.sqlite.prepare("UPDATE public_marketing_events SET created_at=?").run(old);f.sqlite.prepare("UPDATE lead_marketing SET created_at=?").run(old);
 assert.equal((await f.post("contact",{...bodies.contact,message:"Another request",...campaign})).status,200);
 assert.equal(f.count("public_marketing_events"),0);assert.equal(f.count("lead_marketing"),1);assert.equal(f.count("contact_requests"),2);
});
