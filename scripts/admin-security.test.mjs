import assert from "node:assert/strict";
import test from "node:test";
import {fixture} from "./test-support.mjs";

const credentials={username:"admin",password:"isolated-test-password"};
function adminFixture(t){
  return fixture(t,{ADMIN_PASSWORD:credentials.password,ADMIN_SESSION_SECRET:"isolated-test-session-secret"});
}
async function adminHeaders(f,ip="192.0.2.1"){
  const response=await f.post("admin/login",credentials,ip);
  assert.equal(response.status,200);
  return {cookie:response.headers.get("set-cookie").split(";")[0]};
}
async function adminAction(f,headers,type,id,body){
  return f.post(`admin/request/${type}/${id}`,body,"192.0.2.1","https://esoticaegypt.com",headers);
}

test("login quota atomically admits ten attempts and rejects excess concurrent attempts",async t=>{
  const f=adminFixture(t);
  const responses=await Promise.all(Array.from({length:20},()=>f.post("admin/login",{...credentials,password:"wrong"})));
  assert.equal(responses.filter(response=>response.status===401).length,10);
  assert.equal(responses.filter(response=>response.status===429).length,10);
  for(const response of responses.filter(response=>response.status===429)){
    const retry=Number(response.headers.get("retry-after"));
    assert.ok(retry>=899&&retry<=900);
    assert.equal(response.headers.get("set-cookie"),null);
  }
  assert.equal(f.sqlite.prepare("SELECT hits FROM admin_login_rate_limits").get().hits,10);
  assert.equal((await f.post("admin/login",credentials)).status,429);
});

test("login quota is isolated per client and expires without locking the shared admin account",async t=>{
  const f=adminFixture(t);
  for(let index=0;index<10;index++)assert.equal((await f.post("admin/login",{...credentials,password:"wrong"})).status,401);
  assert.equal((await f.post("admin/login",credentials)).status,429);
  const other=await f.post("admin/login",credentials,"192.0.2.2");
  assert.equal(other.status,200);
  assert.match(other.headers.get("set-cookie"),/HttpOnly; Secure; SameSite=Strict/);
  f.sqlite.prepare("UPDATE admin_login_rate_limits SET window_started=?").run(Date.now()-16*60*1000);
  assert.equal((await f.post("admin/login",credentials)).status,200);
});

test("login limit cannot be bypassed with a different username or browser header",async t=>{
  const f=adminFixture(t);
  for(let index=0;index<10;index++){
    assert.equal((await f.post("admin/login",{username:`different-${index}`,password:"wrong"},"192.0.2.1","https://esoticaegypt.com",{"user-agent":`browser-${index}`,cookie:`esotica_visitor=${index}`})).status,401);
  }
  assert.equal((await f.post("admin/login",credentials,"192.0.2.1","https://esoticaegypt.com",{"user-agent":"another-browser"})).status,429);
  assert.equal(f.count("admin_login_rate_limits"),1);
});

test("login protection discards expired records and never stores the raw IP",async t=>{
  const f=adminFixture(t);
  assert.equal((await f.post("admin/login",{...credentials,password:"wrong"})).status,401);
  const row=f.sqlite.prepare("SELECT * FROM admin_login_rate_limits").get();
  assert.match(row.client_key,/^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(row).includes("192.0.2.1"));
  f.sqlite.prepare("UPDATE admin_login_rate_limits SET window_started=?").run(Date.now()-25*60*60*1000);
  assert.equal((await f.post("admin/login",credentials,"192.0.2.2")).status,200);
  assert.equal(f.count("admin_login_rate_limits"),1);
  assert.notEqual(f.sqlite.prepare("SELECT client_key FROM admin_login_rate_limits").get().client_key,row.client_key);
});

const cases=[
  ["booking","bookings","bookings",{name:"Test customer",phone:"01000000000",carModel:"Test vehicle",year:"2024",branch:"فرع التجمع الخامس",serviceType:"maintenance",preferredDate:"2099-01-20",preferredTime:"10:30",details:"Test booking"}],
  ["parts","parts","parts_requests",{name:"Test customer",phone:"01000000000",carModel:"Test vehicle",year:"2024",vin:"ABCDEFG",partCode:"TEST",quantity:2,details:"Test part"}],
  ["contact","contacts","contact_requests",{name:"Test customer",phone:"01000000000",subject:"Test subject",message:"Test message"}]
];
for(const [endpoint,type,table,body] of cases){
  test(`${type}: permanent deletion requires authentication, trash status and exact confirmation`,async t=>{
    const f=adminFixture(t);
    assert.equal((await f.post(endpoint,body)).status,200);
    const id=Number(f.sqlite.prepare(`SELECT id FROM ${table}`).get().id),confirmation={action:"permanent",confirm:`DELETE ${id}`};
    assert.equal((await adminAction(f,{},type,id,confirmation)).status,401);
    const headers=await adminHeaders(f);
    assert.equal((await adminAction(f,headers,type,id,{action:"permanent",confirm:"DELETE"})).status,400);
    assert.equal((await adminAction(f,headers,type,id,confirmation)).status,409);
    assert.equal(f.count(table),1);
    assert.equal((await adminAction(f,headers,type,id,{action:"delete"})).status,200);
    assert.equal((await adminAction(f,headers,type,id,{action:"permanent",confirm:"wrong"})).status,400);
    assert.equal(f.count(table),1);
    assert.equal((await adminAction(f,headers,type,id,confirmation)).status,200);
    assert.equal(f.count(table),0);
    assert.equal(f.count("admin_request_meta"),0);
    assert.equal((await adminAction(f,headers,type,id,confirmation)).status,404);
  });
  test(`${type}: restoring a request removes eligibility for permanent deletion`,async t=>{
    const f=adminFixture(t);
    await f.post(endpoint,body);
    const id=Number(f.sqlite.prepare(`SELECT id FROM ${table}`).get().id),headers=await adminHeaders(f);
    assert.equal((await adminAction(f,headers,type,id,{action:"delete"})).status,200);
    assert.equal((await adminAction(f,headers,type,id,{action:"restore"})).status,200);
    assert.equal((await adminAction(f,headers,type,id,{action:"permanent",confirm:`DELETE ${id}`})).status,409);
    assert.equal(f.count(table),1);
  });
}

test("a restore between validation and deletion preserves the request and its metadata",async t=>{
  const f=adminFixture(t);
  await f.post("contact",cases[2][3]);
  const id=Number(f.sqlite.prepare("SELECT id FROM contact_requests").get().id),headers=await adminHeaders(f);
  await adminAction(f,headers,"contacts",id,{action:"note",note:"Keep this note"});
  await adminAction(f,headers,"contacts",id,{action:"delete"});
  const batch=f.env.DB.batch;
  let restored=false;
  f.env.DB.batch=async statements=>{
    if(statements.some(statement=>statement.query.startsWith("DELETE FROM contact_requests WHERE"))){
      f.sqlite.prepare("UPDATE admin_request_meta SET deleted_at=0 WHERE request_type='contacts' AND request_id=?").run(id);
      restored=true;
    }
    return batch(statements);
  };
  assert.equal((await adminAction(f,headers,"contacts",id,{action:"permanent",confirm:`DELETE ${id}`})).status,409);
  assert.equal(restored,true);
  assert.equal(f.count("contact_requests"),1);
  const meta=f.sqlite.prepare("SELECT * FROM admin_request_meta").get();
  assert.equal(meta.deleted_at,0);
  assert.equal(meta.note,"Keep this note");
});
