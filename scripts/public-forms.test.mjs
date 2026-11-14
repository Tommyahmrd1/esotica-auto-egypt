import assert from "node:assert/strict";
import test from "node:test";
import {fixture} from "./test-support.mjs";

const booking={name:"Test customer",phone:"01000000000",carModel:"Test vehicle",year:"2024",branch:"فرع التجمع الخامس",serviceType:"maintenance",preferredDate:"2099-01-20",preferredTime:"10:30",details:"Test booking"};
const parts={name:"Test customer",phone:"01000000000",carModel:"Test vehicle",year:"2024",vin:"ABCDEFG",partCode:"TEST",quantity:2,details:"Test part"};
const contact={name:"Test customer",phone:"01000000000",subject:"Test subject",message:"Test message"};

for(const [endpoint,body,table] of [["booking",booking,"bookings"],["parts",parts,"parts_requests"],["contact",contact,"contact_requests"]]){
  test(`${endpoint}: saves a valid request with attribution and status`,async t=>{
    const f=fixture(t);
    const response=await f.post(endpoint,{...body,sourceType:"offer",sourceLabel:"Test offer",sourceId:"42",sourcePage:"/offers"});
    assert.equal(response.status,200);
    assert.equal(f.count(table),1);
    const row=f.sqlite.prepare(`SELECT * FROM ${table}`).get();
    assert.equal(row.phone,"+201000000000");
    assert.equal(row.status,"new");
    assert.equal(row.source_label,"Test offer");
    assert.equal(row.source_id,"42");
    assert.equal(row.source_page,"/offers");
    assert.ok((await response.json()).message_en);
  });
  test(`${endpoint}: concurrent retries save exactly one request`,async t=>{
    const f=fixture(t);
    const responses=await Promise.all(Array.from({length:8},()=>f.post(endpoint,body)));
    assert.ok(responses.every(response=>response.status===200));
    assert.equal(f.count(table),1);
    assert.equal(f.count("form_submission_fingerprints"),1);
  });
  test(`${endpoint}: honeypot does not store a request or consume a quota`,async t=>{
    const f=fixture(t);
    assert.equal((await f.post(endpoint,{...body,website:"spam.invalid"})).status,200);
    assert.equal(f.count(table),0);
    assert.equal(f.count("form_rate_limits"),0);
    assert.equal(f.count("form_submission_fingerprints"),0);
  });
  test(`${endpoint}: failed storage can be retried immediately`,async t=>{
    const f=fixture(t);
    f.failNextLeadInsert();
    // Exercise the worker's normal 500 handler while keeping expected failures quiet.
    const originalError=console.error;
    let failure;
    try{console.error=()=>{};failure=await f.post(endpoint,body)}finally{console.error=originalError}
    assert.equal(failure.status,500);
    const failureBody=await failure.json();
    assert.equal(failureBody.code,"SERVER_ERROR");
    assert.ok(failureBody.error&&failureBody.error_en);
    assert.equal(f.count(table),0);
    assert.equal(f.count("form_submission_fingerprints"),0);
    assert.equal((await f.post(endpoint,body)).status,200);
    assert.equal(f.count(table),1);
  });
}

test("atomic quota admits only eight of twenty concurrent unique submissions",async t=>{
  const f=fixture(t);
  const responses=await Promise.all(Array.from({length:20},(_,index)=>f.post("contact",{...contact,message:`Unique test ${index}`})));
  assert.equal(responses.filter(response=>response.status===200).length,8);
  assert.equal(responses.filter(response=>response.status===429).length,12);
  assert.equal(f.count("contact_requests"),8);
  assert.ok(responses.filter(response=>response.status===429).every(response=>response.headers.get("retry-after")==="1800"));
  assert.equal(f.sqlite.prepare("SELECT hits FROM form_rate_limits").get().hits,8);
});

test("an expired quota resets and a different client retains its own quota",async t=>{
  const f=fixture(t);
  for(let index=0;index<8;index++)assert.equal((await f.post("contact",{...contact,message:`Initial ${index}`})).status,200);
  assert.equal((await f.post("contact",{...contact,message:"Over limit"})).status,429);
  assert.equal((await f.post("contact",{...contact,message:"Other client"},"192.0.2.2")).status,200);
  f.sqlite.prepare("UPDATE form_rate_limits SET window_started=?").run(Date.now()-31*60*1000);
  assert.equal((await f.post("contact",{...contact,message:"New window"})).status,200);
});

test("fingerprint migration preserves existing leads and duplicate protection",async t=>{
  const f=fixture(t);
  f.sqlite.exec("CREATE TABLE form_submission_fingerprints(fingerprint TEXT PRIMARY KEY,created_at INTEGER NOT NULL)");
  assert.equal((await f.post("contact",contact)).status,200);
  assert.equal(f.count("contact_requests"),1);
  assert.ok(f.sqlite.prepare("PRAGMA table_info(form_submission_fingerprints)").all().some(row=>row.name==="claim_id"));
  f.sqlite.prepare("UPDATE form_submission_fingerprints SET claim_id=''").run();
  assert.equal((await f.post("contact",contact,"192.0.2.2")).status,200);
  assert.equal(f.count("contact_requests"),1);
  f.sqlite.prepare("UPDATE form_submission_fingerprints SET created_at=?").run(Date.now()-121000);
  assert.equal((await f.post("contact",contact,"192.0.2.2")).status,200);
  assert.equal(f.count("contact_requests"),2);
});

test("expired protection records are cleared without retaining raw client addresses",async t=>{
  const f=fixture(t);
  await f.post("contact",contact);
  const rate=f.sqlite.prepare("SELECT rate_key FROM form_rate_limits").get();
  assert.match(rate.rate_key,/^contact:[a-f0-9]{64}$/);
  assert.ok(!rate.rate_key.includes("192.0.2.1"));
  f.sqlite.prepare("UPDATE form_rate_limits SET window_started=?").run(Date.now()-25*60*60*1000);
  f.sqlite.prepare("UPDATE form_submission_fingerprints SET created_at=?").run(Date.now()-25*60*60*1000);
  await f.post("contact",{...contact,message:"New request"},"192.0.2.2");
  assert.equal(f.count("form_rate_limits"),1);
  assert.equal(f.count("form_submission_fingerprints"),1);
  assert.equal(f.count("contact_requests"),2);
});

test("booking rejects impossible dates and accepts a real leap date",async t=>{
  const f=fixture(t);
  for(const preferredDate of ["2099-02-30","2099-13-01","2099-04-31","2099-02-29","2099-01-00","invalid"]){
    assert.equal((await f.post("booking",{...booking,preferredDate})).status,400,preferredDate);
  }
  assert.equal((await f.post("booking",{...booking,preferredDate:"2096-02-29"})).status,200);
  assert.equal(f.count("bookings"),1);
});

test("cross-origin and incomplete submissions are rejected",async t=>{
  const f=fixture(t);
  assert.equal((await f.post("contact",contact,"192.0.2.1","https://unrelated.invalid")).status,403);
  assert.equal((await f.post("contact",{...contact,phone:"invalid"})).status,400);
  assert.equal((await f.post("booking",{...booking,preferredTime:"25:10"})).status,400);
  assert.equal((await f.post("booking",{...booking,serviceType:"unknown"})).status,400);
  assert.equal(f.count("contact_requests"),0);
  assert.equal(f.count("bookings"),0);
});

for(const [endpoint,body,table,corrections] of [
 ["booking",booking,"bookings",[{name:"Corrected customer"},{carModel:"Corrected model"},{year:"2025"},{details:"Added symptom details"}]],
 ["parts",parts,"parts_requests",[{name:"Corrected customer"},{carModel:"Corrected model"},{year:"2025"},{quantity:3},{details:"Added part details"}]],
 ["contact",contact,"contact_requests",[{name:"Corrected customer"},{subject:"Corrected subject"},{message:"Added message details"}]]
]){
 test(`${endpoint}: corrected customer and request details are saved immediately`,async t=>{
   const f=fixture(t);
   assert.equal((await f.post(endpoint,body)).status,200);
   for(const correction of corrections){
     assert.equal((await f.post(endpoint,{...body,...correction})).status,200);
   }
   assert.equal(f.count(table),corrections.length+1);
   assert.equal((await f.post(endpoint,body)).status,200);
   assert.equal(f.count(table),corrections.length+1,"an unchanged retry still deduplicates");
 });
 test(`${endpoint}: corrected attribution is preserved without suppressing the request`,async t=>{
   const f=fixture(t);
   for(const source of [{},{sourceType:"offer",sourceId:"42",sourceLabel:"Offer one",sourcePage:"/offers"},{sourceType:"offer",sourceId:"43",sourceLabel:"Offer two",sourcePage:"/offers"}]){
     assert.equal((await f.post(endpoint,{...body,...source})).status,200);
   }
   assert.equal(f.count(table),3);
 });
 test(`${endpoint}: malformed JSON values receive structured bilingual errors`,async t=>{
   const f=fixture(t);
   for(const body of [null,[],"invalid",true,123]){
     const response=await f.post(endpoint,body);
     assert.equal(response.status,400);
     const result=await response.json();
     assert.equal(result.code,"INVALID_REQUEST");
     assert.ok(result.error&&result.error_en);
   }
   assert.equal(f.count(table),0);
 });
}

test("fingerprints distinguish delimiter-containing fields",async t=>{
 const f=fixture(t);
 assert.equal((await f.post("contact",{...contact,subject:"A|B",message:"C"})).status,200);
 assert.equal((await f.post("contact",{...contact,subject:"A",message:"B|C"})).status,200);
 assert.equal(f.count("contact_requests"),2);
});

test("Egyptian and Arabic/Persian phone formats normalize to one retry identity",async t=>{
 const f=fixture(t);
 for(const phone of ["٠١٠١٢٣٤٥٦٧٨","+٢٠ (١٠) ١٢٣٤-٥٦٧٨","0020 10 1234 5678","۱۰۱۲۳۴۵۶۷۸","+20 (0) 10 1234 5678"]){
   const response=await f.post("contact",{...contact,phone});
   assert.equal(response.status,200,phone);
 }
 assert.equal(f.count("contact_requests"),1);
 assert.equal(f.sqlite.prepare("SELECT phone FROM contact_requests").get().phone,"+201012345678");
});

test("international phone formats retain their country codes",async t=>{
 const f=fixture(t);
 const cases=[["+1 (202) 555-0198","+12025550198"],["0044 20 7946 0958","+442079460958"],["+971 50 123 4567","+971501234567"],["+49 (30) 12345678","+493012345678"],["+683 1234","+6831234"]];
 for(const [phone,expected] of cases){
   const response=await f.post("contact",{...contact,phone});
   assert.equal(response.status,200,phone);
   assert.ok(f.sqlite.prepare("SELECT id FROM contact_requests WHERE phone=?").get(expected));
 }
 assert.equal(f.count("contact_requests"),cases.length);
});

test("phone validation rejects punctuation-only, malformed and non-digit values",async t=>{
 const f=fixture(t);
 for(const phone of ["--------","+ () --","0000000000","+0001234567","++201012345678","01012345678abc","010/12345678","١٢٣","+1234567890123456"]){
   const response=await f.post("contact",{...contact,phone});
   assert.equal(response.status,400,phone);
   const result=await response.json();
   assert.equal(result.code,"INVALID_PHONE");
   assert.equal(result.field,"phone");
   assert.ok(result.error&&result.error_en);
 }
 assert.equal(f.count("contact_requests"),0);
});

test("Arabic/Persian numeric fields are normalized before validation and storage",async t=>{
 const f=fixture(t);
 assert.equal((await f.post("parts",{...parts,year:"۲۰۲۴",quantity:"٣",vin:"ABCD١٢٣"})).status,200);
 const part=f.sqlite.prepare("SELECT year,quantity,vin FROM parts_requests").get();
 assert.deepEqual({...part},{year:"2024",quantity:3,vin:"ABCD123"});
 assert.equal((await f.post("booking",{...booking,year:"٢٠٢٤",preferredDate:"٢٠٩٩-٠١-٢٠",preferredTime:"١٠:٣٠"})).status,200);
 const row=f.sqlite.prepare("SELECT year,preferred_date,preferred_time FROM bookings").get();
 assert.deepEqual({...row},{year:"2024",preferred_date:"2099-01-20",preferred_time:"10:30"});
});

test("parts rejects invalid quantities and overlong VIN rather than silently changing them",async t=>{
 const f=fixture(t);
 for(const quantity of [0,-1,1.5,21,"invalid"]){
   const response=await f.post("parts",{...parts,quantity});
   assert.equal(response.status,400,String(quantity));
   assert.equal((await response.json()).code,"INVALID_QUANTITY");
 }
 assert.equal((await f.post("parts",{...parts,vin:"ABCDEFG12345678901"})).status,400);
 assert.equal(f.count("parts_requests"),0);
});

test("booking accepts only listed branches and rejects Friday",async t=>{
 const f=fixture(t);
 for(const branch of ["فرع التجمع الخامس","فرع التجمع الثالث","الشيخ زايد"]){
   assert.equal((await f.post("booking",{...booking,branch})).status,200,branch);
 }
 const unknown=await f.post("booking",{...booking,branch:"Unknown branch"});
 assert.equal(unknown.status,400);
 assert.equal((await unknown.json()).code,"INVALID_BRANCH");
 const friday=await f.post("booking",{...booking,preferredDate:"2099-01-23"});
 assert.equal(friday.status,400);
 const result=await friday.json();
 assert.equal(result.code,"FRIDAY_CLOSED");
 assert.equal(result.field,"preferredDate");
 assert.equal(f.count("bookings"),3);
});

test("booking follows the published 10:00–18:00 half-hour form window",async t=>{
 const f=fixture(t);
 for(const preferredTime of ["10:00","10:30","17:30","18:00"]){
   assert.equal((await f.post("booking",{...booking,preferredTime})).status,200,preferredTime);
 }
 for(const preferredTime of ["09:30","10:15","10:01","18:30","19:00","25:00"]){
   const response=await f.post("booking",{...booking,preferredTime});
   assert.equal(response.status,400,preferredTime);
   assert.equal((await response.json()).code,"INVALID_TIME");
 }
 assert.equal(f.count("bookings"),4);
});

test("booking uses Cairo's date and rejects times that already passed",async t=>{
 t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-11-14T08:30:15Z")}); // Cairo10:30.
 const f=fixture(t);
 const pastDate=await f.post("booking",{...booking,preferredDate:"2026-11-13"});
 assert.equal((await pastDate.json()).code,"PAST_DATE");
 for(const preferredTime of ["10:00","10:30"]){
   const response=await f.post("booking",{...booking,preferredDate:"2026-11-14",preferredTime});
   assert.equal(response.status,400);
   const result=await response.json();
   assert.equal(result.code,"PAST_TIME");
   assert.equal(result.field,"preferredTime");
 }
 assert.equal((await f.post("booking",{...booking,preferredDate:"2026-11-14",preferredTime:"11:00"})).status,200);
 t.mock.timers.setTime(Date.parse("2026-11-14T15:00:00Z")); // Cairo17:00 cutoff.
 const cutoff=await f.post("booking",{...booking,preferredDate:"2026-11-14",preferredTime:"18:00"});
 assert.equal(cutoff.status,400);
 assert.equal((await cutoff.json()).code,"SAME_DAY_CUTOFF");
 assert.equal((await f.post("booking",{...booking,preferredDate:"2026-11-15",preferredTime:"10:00"})).status,200);
});

test("Cairo booking validation handles summer offset and midnight date boundaries",async t=>{
 t.mock.timers.enable({apis:["Date"],now:Date.parse("2027-07-10T07:30:00Z")}); // Cairo10:30 in summer.
 const f=fixture(t);
 const passed=await f.post("booking",{...booking,preferredDate:"2027-07-10",preferredTime:"10:30"});
 assert.equal((await passed.json()).code,"PAST_TIME");
 assert.equal((await f.post("booking",{...booking,preferredDate:"2027-07-10",preferredTime:"11:00"})).status,200);
 t.mock.timers.setTime(Date.parse("2026-11-14T22:30:00Z")); // Cairo Sunday00:30; UTC is still Saturday.
 const yesterday=await f.post("booking",{...booking,preferredDate:"2026-11-14",preferredTime:"18:00"});
 assert.equal((await yesterday.json()).code,"PAST_DATE");
 assert.equal((await f.post("booking",{...booking,preferredDate:"2026-11-15",preferredTime:"10:00"})).status,200);
});

test("rate-limited responses report the remaining window in both header and bilingual body",async t=>{
 t.mock.timers.enable({apis:["Date"],now:Date.parse("2026-11-14T08:00:00Z")});
 const f=fixture(t);
 for(let index=0;index<8;index++)await f.post("contact",{...contact,message:`Quota test ${index}`});
 t.mock.timers.tick(29*60*1000);
 const response=await f.post("contact",{...contact,message:"Blocked request"});
 assert.equal(response.status,429);
 assert.equal(response.headers.get("retry-after"),"60");
 const result=await response.json();
 assert.equal(result.code,"RATE_LIMITED");
 assert.equal(result.retryAfter,60);
 assert.ok(result.error&&result.error_en);
 t.mock.timers.tick(60000);
 assert.equal((await f.post("contact",{...contact,message:"Now permitted"})).status,200);
});

test("cross-origin errors use the public bilingual contract",async t=>{
 const f=fixture(t);
 const response=await f.post("contact",contact,"192.0.2.1","https://unrelated.invalid");
 assert.equal(response.status,403);
 const result=await response.json();
 assert.equal(result.code,"FORBIDDEN_ORIGIN");
 assert.ok(result.error&&result.error_en);
});
