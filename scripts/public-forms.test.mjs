import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import {DatabaseSync} from "node:sqlite";

const source=await fs.readFile(new URL("../_worker.js",import.meta.url),"utf8");
const {default:worker}=await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

// Execute the production SQL against an isolated SQLite database, with the
// sequential transaction semantics of Cloudflare D1.batch(). Never use live data.
function fixture(t){
  const sqlite=new DatabaseSync(":memory:");
  t.after(()=>sqlite.close());
  let failLeadInsert=false;
  function execute(query,values,mode){
    if(failLeadInsert&&/^INSERT INTO (bookings|parts_requests|contact_requests)\(/.test(query)){
      failLeadInsert=false;
      throw new Error("Injected lead storage failure");
    }
    const statement=sqlite.prepare(query);
    if(mode==="first")return statement.get(...values)||null;
    if(mode==="all")return {results:statement.all(...values),success:true};
    const result=statement.run(...values);
    return {success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};
  }
  function prepared(query,values=[]){
    return {
      query,values,
      bind(...bound){return prepared(query,bound)},
      async first(){return execute(query,values,"first")},
      async all(){return execute(query,values,"all")},
      async run(){return execute(query,values,"run")}
    };
  }
  const DB={
    prepare:prepared,
    async batch(statements){
      sqlite.exec("BEGIN");
      try{
        const results=statements.map(({query,values})=>execute(query,values,"run"));
        sqlite.exec("COMMIT");
        return results;
      }catch(error){sqlite.exec("ROLLBACK");throw error}
    }
  };
  const env={DB};
  return {
    sqlite,env,
    failNextLeadInsert(){failLeadInsert=true},
    count(table){return Number(sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count)},
    async post(path,body,ip="192.0.2.1",origin="https://esoticaegypt.com"){
      const request=new Request(`https://esoticaegypt.com/api/${path}`,{
        method:"POST",headers:{"content-type":"application/json",origin,"cf-connecting-ip":ip},body:JSON.stringify(body)
      });
      return worker.fetch(request,env);
    }
  };
}

const booking={name:"Test customer",phone:"01000000000",carModel:"Test vehicle",year:"2024",branch:"Test branch",serviceType:"maintenance",preferredDate:"2099-01-20",preferredTime:"10:30",details:"Test booking"};
const parts={name:"Test customer",phone:"01000000000",carModel:"Test vehicle",year:"2024",vin:"ABCDEFG",partCode:"TEST",quantity:2,details:"Test part"};
const contact={name:"Test customer",phone:"01000000000",subject:"Test subject",message:"Test message"};

for(const [endpoint,body,table] of [["booking",booking,"bookings"],["parts",parts,"parts_requests"],["contact",contact,"contact_requests"]]){
  test(`${endpoint}: saves a valid request with attribution and status`,async t=>{
    const f=fixture(t);
    const response=await f.post(endpoint,{...body,sourceType:"offer",sourceLabel:"Test offer",sourceId:"42",sourcePage:"/offers"});
    assert.equal(response.status,200);
    assert.equal(f.count(table),1);
    const row=f.sqlite.prepare(`SELECT * FROM ${table}`).get();
    assert.equal(row.status,"new");
    assert.equal(row.source_label,"Test offer");
    assert.equal(row.source_id,"42");
    assert.equal(row.source_page,"/offers");
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
