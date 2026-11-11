import assert from "node:assert/strict";
import test from "node:test";
import {fixture} from "./test-support.mjs";

async function adminFixture(t){
 const f=fixture(t,{ADMIN_PASSWORD:"test-only-password",ADMIN_SESSION_SECRET:"test-only-session"});
 const login=await f.post("admin/login",{username:"admin",password:f.env.ADMIN_PASSWORD});
 assert.equal(login.status,200);
 const headers={cookie:login.headers.get("set-cookie").split(";")[0]};
 // Initialise the production schema without adding a customer request.
 assert.equal((await f.get("admin/lead-alerts?after=0",headers)).status,200);
 return {...f,headers};
}

test("alerts paginate a burst across all request types without losing timestamp ties",async t=>{
 const f=await adminFixture(t),createdAt=Date.now()-10000;
 for(let index=1;index<=41;index++){
  f.sqlite.prepare("INSERT INTO bookings(created_at,name,phone,car_model,year,branch,preferred_date) VALUES(?,?,?,?,?,?,?)").run(createdAt,"Private customer","01000000000","Test","2024","Test","2099-01-20");
  f.sqlite.prepare("INSERT INTO parts_requests(created_at,name,phone,car_model,year,vin,details) VALUES(?,?,?,?,?,?,?)").run(createdAt,"Private customer","01000000000","Test","2024","ABCDEFG","Private request");
  f.sqlite.prepare("INSERT INTO contact_requests(created_at,name,phone,subject,message) VALUES(?,?,?,?,?)").run(createdAt,"Private customer","01000000000","Private subject","Private message");
 }
 const alerts=[],cursors=new Set();let cursor="",pageCount=0;
 do{
  const path=`admin/lead-alerts?after=${createdAt-1}${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`;
  const response=await f.get(path,f.headers);assert.equal(response.status,200);
  const page=await response.json();
  assert.ok(page.alerts.length<=30);
  alerts.push(...page.alerts);cursor=page.nextCursor;
  assert.equal(page.hasMore,Boolean(cursor));
  if(cursor){assert.ok(!cursors.has(cursor));cursors.add(cursor)}
  assert.ok(++pageCount<10,"pagination must terminate");
 }while(cursor);
 assert.equal(alerts.length,123);
 assert.equal(new Set(alerts.map(row=>`${row.request_type}:${row.id}`)).size,123);
 for(const alert of alerts)assert.deepEqual(Object.keys(alert).sort(),["created_at","id","request_type"]);
});

test("alerts exclude old and future requests and return an empty terminal page",async t=>{
 const f=await adminFixture(t),cutoff=Date.now()-10000;
 for(const timestamp of [cutoff-1,cutoff,Date.now()+60000]){
  f.sqlite.prepare("INSERT INTO contact_requests(created_at,name,phone,subject,message) VALUES(?,?,?,?,?)").run(timestamp,"Test","01000000000","Test","Test");
 }
 const response=await f.get(`admin/lead-alerts?after=${cutoff}`,f.headers),page=await response.json();
 assert.equal(response.status,200);assert.deepEqual(page.alerts,[]);
 assert.equal(page.hasMore,false);assert.equal(page.nextCursor,"");
 assert.ok(page.now>=cutoff);
});

test("alerts require an admin session and reject malformed continuation cursors",async t=>{
 const f=await adminFixture(t);
 assert.equal((await f.get("admin/lead-alerts?after=0")).status,401);
 for(const cursor of ["invalid","0:other:1","0:contacts:-1",`${Date.now()+60000}:bookings:1`,"0:contacts:9999999999999999"]){
  const response=await f.get(`admin/lead-alerts?cursor=${encodeURIComponent(cursor)}`,f.headers);
  assert.equal(response.status,400,cursor);
 }
});
