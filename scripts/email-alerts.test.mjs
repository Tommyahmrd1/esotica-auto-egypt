import assert from "node:assert/strict";
import test from "node:test";
import {fixture} from "./test-support.mjs";

const credentials={username:"admin",password:"email-test-password"};
const mailEnv={
 ADMIN_PASSWORD:credentials.password,ADMIN_SESSION_SECRET:"email-test-session-secret",
 RESEND_API_KEY:"re_isolated_test_only",LEAD_ALERT_FROM:"alerts@example.test",LEAD_ALERT_TO:"team@example.test"
};
const cases=[
 ["booking","bookings","bookings",{name:"PrivateTestCustomer",phone:"01099999999",carModel:"Private vehicle",year:"2024",branch:"Private branch",serviceType:"maintenance",preferredDate:"2099-01-20",preferredTime:"10:30",details:"Private booking details"}],
 ["parts","parts","parts_requests",{name:"PrivateTestCustomer",phone:"01099999999",carModel:"Private vehicle",year:"2024",vin:"ABCDEFG",partCode:"PRIVATEPART",quantity:2,details:"Private parts details"}],
 ["contact","contacts","contact_requests",{name:"PrivateTestCustomer",phone:"01099999999",subject:"Private subject",message:"Private customer message"}]
];
async function headers(f){
 const response=await f.post("admin/login",credentials);
 assert.equal(response.status,200);
 return {cookie:response.headers.get("set-cookie").split(";")[0]};
}
function mailMock(t,implementation){
 const calls=[];
 t.mock.method(globalThis,"fetch",async(url,options)=>{
  assert.equal(String(url),"https://api.resend.com/emails");
  const requestHeaders=new Headers(options.headers);
  calls.push({payload:JSON.parse(options.body),key:requestHeaders.get("idempotency-key"),signal:options.signal});
  return implementation?implementation(calls.at(-1),calls.length):new Response(JSON.stringify({id:"provider-test-message"}),{status:200,headers:{"content-type":"application/json"}});
 });
 return calls;
}

for(const [endpoint,type,table,body] of cases){
 test(`${endpoint}: sends one durable metadata-only email for a new request`,async t=>{
  const f=fixture(t,mailEnv),calls=mailMock(t);
  assert.equal((await f.post(endpoint,body)).status,200);
  await f.drain();
  assert.equal(f.count(table),1);assert.equal(f.count("email_alert_outbox"),1);assert.equal(calls.length,1);
  const row=f.sqlite.prepare("SELECT * FROM email_alert_outbox").get();
  assert.equal(row.request_type,type);assert.equal(row.request_id,1);assert.equal(row.status,"sent");
  assert.equal(calls[0].key,`esotica-lead-${type}-1`);
  const serialized=JSON.stringify(calls[0].payload);
  assert.ok(serialized.includes("https://esoticaegypt.com/admin"));
  assert.ok(!serialized.includes(body.name));assert.ok(!serialized.includes(body.phone));
  for(const value of [body.carModel,body.vin,body.details,body.subject,body.message].filter(Boolean))assert.ok(!serialized.includes(value),value);
  assert.ok(!JSON.stringify(row).includes(body.name));assert.ok(!JSON.stringify(row).includes(body.phone));
 });
}

test("missing or invalid mail configuration keeps email disabled and does not queue or send",async t=>{
 const calls=mailMock(t);
 for(const override of [{RESEND_API_KEY:""},{LEAD_ALERT_FROM:""},{LEAD_ALERT_TO:""},{LEAD_ALERT_TO:"not-an-address"}]){
  const f=fixture(t,{...mailEnv,...override});
  assert.equal((await f.post("contact",cases[2][3])).status,200);await f.drain();
  assert.equal(f.count("contact_requests"),1);assert.equal(f.count("email_alert_outbox"),0);
  const admin=await headers(f),status=await f.get("admin/email-alerts",admin);
  assert.equal(status.status,200);assert.equal((await status.json()).configured,false);
  const retry=await f.post("admin/email-alerts/retry",{},"192.0.2.1","https://esoticaegypt.com",admin);
  assert.equal(retry.status,503);
 }
 assert.equal(calls.length,0);
});

test("honeypot and duplicate submissions never create extra emails",async t=>{
 const f=fixture(t,mailEnv),calls=mailMock(t),body=cases[2][3];
 assert.equal((await f.post("contact",{...body,website:"spam.example.test"})).status,200);await f.drain();
 assert.equal(f.count("contact_requests"),0);assert.equal(f.count("email_alert_outbox"),0);assert.equal(calls.length,0);
 const results=await Promise.all(Array.from({length:8},()=>f.post("contact",body)));
 assert.ok(results.every(result=>result.status===200));await f.drain();
 assert.equal(f.count("contact_requests"),1);assert.equal(f.count("email_alert_outbox"),1);assert.equal(calls.length,1);
});

test("a mail-provider failure preserves the lead and retry uses the same idempotency key",async t=>{
 const f=fixture(t,mailEnv);
 const calls=mailMock(t,(_call,index)=>new Response(index===1?"Private provider diagnostic":"{}",{status:index===1?503:200}));
 assert.equal((await f.post("contact",cases[2][3])).status,200);await f.drain();
 assert.equal(f.count("contact_requests"),1);
 let row=f.sqlite.prepare("SELECT * FROM email_alert_outbox").get();
 assert.notEqual(row.status,"sent");assert.ok(row.next_attempt_at>Date.now());
 assert.ok(!row.last_error.includes("Private provider diagnostic"));
 f.env.LEAD_ALERT_FROM="changed-sender@example.test";f.env.LEAD_ALERT_TO="changed-recipient@example.test";
 const admin=await headers(f),status=await (await f.get("admin/email-alerts",admin)).json();
 assert.equal(status.configured,true);assert.equal(status.sent,0);
 assert.ok(!JSON.stringify(status).includes("Private provider diagnostic"));
 assert.equal((await f.post("admin/email-alerts/retry",{},"192.0.2.1","https://esoticaegypt.com",admin)).status,200);
 await f.drain();row=f.sqlite.prepare("SELECT * FROM email_alert_outbox").get();
 assert.equal(row.status,"sent");assert.equal(calls.length,2);assert.equal(calls[0].key,calls[1].key);
 assert.deepEqual(calls[0].payload,calls[1].payload,"recipient changes must not alter an existing idempotent email");
 assert.equal((await f.post("admin/email-alerts/retry",{},"192.0.2.1","https://esoticaegypt.com",admin)).status,200);
 await f.drain();assert.equal(calls.length,2,"sent messages must not be replayed");
});

test("email status and retries require authentication and reject cross-origin mutations",async t=>{
 const f=fixture(t,mailEnv);mailMock(t);
 assert.equal((await f.get("admin/email-alerts")).status,401);
 assert.equal((await f.post("admin/email-alerts/retry",{})).status,401);
 const admin=await headers(f);
 assert.equal((await f.post("admin/email-alerts/retry",{},"192.0.2.1","https://unrelated.example.test",admin)).status,403);
});

test("a lead-storage failure rolls back the outbox and can be safely retried",async t=>{
 const f=fixture(t,mailEnv),calls=mailMock(t);t.mock.method(console,"error",()=>{});
 f.failNextLeadInsert();
 assert.equal((await f.post("contact",cases[2][3])).status,500);await f.drain();
 assert.equal(f.count("contact_requests"),0);assert.equal(f.count("email_alert_outbox"),0);assert.equal(calls.length,0);
 assert.equal((await f.post("contact",cases[2][3])).status,200);await f.drain();
 assert.equal(f.count("contact_requests"),1);assert.equal(calls.length,1);
});

test("concurrent retry jobs respect the lease of an email already being sent",async t=>{
 const f=fixture(t,mailEnv);let finish;
 const calls=mailMock(t,()=>new Promise(resolve=>{finish=()=>resolve(new Response("{}",{status:200}))}));
 const admin=await headers(f);
 assert.equal((await f.post("contact",cases[2][3])).status,200);
 for(let tick=0;tick<100&&!finish;tick++)await Promise.resolve();
 assert.equal(typeof finish,"function");
 const retries=await Promise.all(Array.from({length:3},()=>f.post("admin/email-alerts/retry",{},"192.0.2.1","https://esoticaegypt.com",admin)));
 assert.ok(retries.every(response=>response.status===200));
 finish();await f.drain();assert.equal(calls.length,1);
 assert.equal(f.sqlite.prepare("SELECT status FROM email_alert_outbox").get().status,"sent");
});

test("an email timeout cannot delay or undo acceptance of the customer request",async t=>{
 const f=fixture(t,mailEnv);let signal;
 mailMock(t,call=>new Promise((_resolve,reject)=>{
  signal=call.signal;assert.ok(signal);
  signal.addEventListener("abort",()=>reject(new DOMException("Timed out","AbortError")),{once:true});
 }));
 const started=Date.now(),response=await f.post("contact",cases[2][3]);
 assert.equal(response.status,200);assert.ok(Date.now()-started<1000);
 await f.drain();assert.equal(f.count("contact_requests"),1);assert.equal(signal.aborted,true);
 const row=f.sqlite.prepare("SELECT * FROM email_alert_outbox").get();
 assert.notEqual(row.status,"sent");assert.ok(row.next_attempt_at>Date.now());
});

test("expired pending email is never retried beyond the provider idempotency window",async t=>{
 const f=fixture(t,mailEnv),calls=mailMock(t);
 await f.post("contact",cases[2][3]);await f.drain();
 f.sqlite.prepare("UPDATE email_alert_outbox SET status='pending',sent_at=0,created_at=?,next_attempt_at=0").run(Date.now()-24*60*60*1000);
 const admin=await headers(f);
 await f.get("admin/email-alerts",admin);await f.drain();
 let row=f.sqlite.prepare("SELECT * FROM email_alert_outbox").get();
 assert.equal(row.status,"failed");assert.equal(row.last_error,"expired");assert.equal(calls.length,1);
 assert.equal((await f.post("admin/email-alerts/retry",{},"192.0.2.1","https://esoticaegypt.com",admin)).status,200);
 await f.drain();row=f.sqlite.prepare("SELECT * FROM email_alert_outbox").get();
 assert.equal(row.status,"failed");assert.equal(calls.length,1,"manual retry must also respect the age limit");
});

test("an interrupted email worker can be recovered only after its lease expires",async t=>{
 const f=fixture(t,mailEnv),calls=mailMock(t,(_call,index)=>new Response("{}",{status:index===1?503:200}));
 await f.post("contact",cases[2][3]);await f.drain();
 f.sqlite.prepare("UPDATE email_alert_outbox SET lease_until=?,lease_token='interrupted-worker',next_attempt_at=0").run(Date.now()+60000);
 const admin=await headers(f);
 await f.get("admin/email-alerts",admin);await f.drain();assert.equal(calls.length,1);
 f.sqlite.prepare("UPDATE email_alert_outbox SET lease_until=?").run(Date.now()-1);
 await f.get("admin/email-alerts",admin);await f.drain();
 assert.equal(calls.length,2);assert.equal(calls[0].key,calls[1].key);
 const row=f.sqlite.prepare("SELECT * FROM email_alert_outbox").get();
 assert.equal(row.status,"sent");assert.equal(row.lease_until,0);assert.equal(row.lease_token,"");
});

test("automatic delivery stops at five attempts and only an explicit retry restarts it",async t=>{
 const f=fixture(t,mailEnv),calls=mailMock(t,(_call,index)=>new Response("{}",{status:index<=5?503:200}));
 await f.post("contact",cases[2][3]);await f.drain();
 const admin=await headers(f);
 for(let attempt=2;attempt<=5;attempt++){
  f.sqlite.prepare("UPDATE email_alert_outbox SET next_attempt_at=0").run();
  await f.get("admin/email-alerts",admin);await f.drain();
  assert.equal(calls.length,attempt);
 }
 let row=f.sqlite.prepare("SELECT * FROM email_alert_outbox").get();
 assert.equal(row.attempts,5);assert.equal(row.status,"failed");
 f.sqlite.prepare("UPDATE email_alert_outbox SET next_attempt_at=0").run();
 await f.get("admin/email-alerts",admin);await f.drain();assert.equal(calls.length,5);
 assert.equal((await f.post("admin/email-alerts/retry",{},"192.0.2.1","https://esoticaegypt.com",admin)).status,200);
 await f.drain();row=f.sqlite.prepare("SELECT * FROM email_alert_outbox").get();
 assert.equal(calls.length,6);assert.equal(row.status,"sent");assert.equal(row.attempts,1);
});

test("an interrupted final attempt becomes a visible failure instead of a permanently pending row",async t=>{
 const f=fixture(t,mailEnv),calls=mailMock(t,()=>new Response("{}",{status:503}));
 await f.post("contact",cases[2][3]);await f.drain();
 f.sqlite.prepare("UPDATE email_alert_outbox SET attempts=5,lease_until=?,lease_token='crashed-final-attempt',next_attempt_at=0").run(Date.now()-1);
 const admin=await headers(f);
 await f.get("admin/email-alerts",admin);await f.drain();
 const row=f.sqlite.prepare("SELECT * FROM email_alert_outbox").get();
 assert.equal(row.status,"failed");assert.equal(row.last_error,"attempts_exhausted");assert.equal(calls.length,1);
});

test("an outbox-storage failure rolls back the entire lead transaction without poisoning retries",async t=>{
 const f=fixture(t,mailEnv),calls=mailMock(t);t.mock.method(console,"error",()=>{});
 const batch=f.env.DB.batch;let injectFailure=true;
 f.env.DB.batch=async statements=>{
  if(injectFailure&&statements.some(statement=>statement.query.startsWith("INSERT OR IGNORE INTO email_alert_outbox"))){
   injectFailure=false;
   return batch(statements.map(statement=>statement.query.startsWith("INSERT OR IGNORE INTO email_alert_outbox")?{...statement,query:"INSERT INTO nonexistent_email_outbox VALUES(1)"}:statement));
  }
  return batch(statements);
 };
 assert.equal((await f.post("contact",cases[2][3])).status,500);await f.drain();
 assert.equal(f.count("contact_requests"),0);assert.equal(f.count("email_alert_outbox"),0);assert.equal(f.count("form_submission_fingerprints"),0);assert.equal(calls.length,0);
 assert.equal((await f.post("contact",cases[2][3])).status,200);await f.drain();
 assert.equal(f.count("contact_requests"),1);assert.equal(f.count("email_alert_outbox"),1);assert.equal(calls.length,1);
});
