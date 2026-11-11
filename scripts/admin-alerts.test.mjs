import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source=await fs.readFile(new URL("../admin.js",import.meta.url),"utf8");
const polling=source.slice(source.indexOf("async function pollLeadAlerts(){"),source.indexOf('$("#enableBrowserAlerts")?.addEventListener'));

function client(fetch){
 const notifications=[],summaries=[];let loads=0;
 function Notification(title,options){notifications.push({title,...options})}
 Notification.permission="granted";
 const context=vm.createContext({fetch,URLSearchParams,Notification,window:{Notification},Date,AbortController,setTimeout,clearTimeout,
  $:()=>({classList:{contains:()=>false}}),adminNumber:{format:String},
  load:async()=>{loads++},renderLeadSummary:alerts=>summaries.push(alerts)});
 vm.runInContext(`let leadAlertAfter=1000,leadAlertCursor="",leadAlertPolling=false;\n${polling}`,context);
 return {poll:()=>context.pollLeadAlerts(),notifications,summaries,get loads(){return loads},state:()=>vm.runInContext('({leadAlertAfter,leadAlertCursor,leadAlertPolling})',context)};
}
const page=(alerts,nextCursor="")=>({ok:true,json:async()=>({alerts,nextCursor,hasMore:!!nextCursor,now:2000})});

for(const failure of ["network","json"]){
 test(`client shows received alerts when the next page has a ${failure} failure, then resumes`,async()=>{
  let call=0;const urls=[];
  const c=client(async url=>{
   urls.push(url);call++;
   if(call===1)return page([{request_type:"bookings",id:1,created_at:1500}],"1500:bookings:1");
   if(call===2){if(failure==="network")throw new Error("offline");return {ok:true,json:async()=>{throw new Error("invalid JSON")}}}
   return page([{request_type:"parts",id:2,created_at:1600}]);
  });
  await c.poll();
  assert.equal(c.loads,1);assert.equal(c.notifications.length,1);assert.equal(c.summaries[0][0].id,1);
  assert.equal(c.state().leadAlertCursor,"1500:bookings:1");assert.equal(c.state().leadAlertPolling,false);
  await c.poll();
  assert.equal(c.loads,2);assert.equal(c.notifications.length,2);assert.equal(c.summaries[1][0].id,2);
  assert.equal(new URL(urls[2],"https://esoticaegypt.com").searchParams.get("cursor"),"1500:bookings:1");
  assert.equal(c.state().leadAlertCursor,"");
 });
}

test("client prevents overlapping polls and keeps customer details off the notification",async()=>{
 let complete;let calls=0;
 const c=client(()=>{calls++;return new Promise(resolve=>{complete=resolve})});
 const first=c.poll();await c.poll();assert.equal(calls,1);
 complete(page([{request_type:"contacts",id:1,name:"Private name",phone:"01000000000",created_at:1500}]));
 await first;
 assert.equal(c.notifications.length,1);assert.ok(!JSON.stringify(c.notifications).includes("Private name"));
 assert.ok(!JSON.stringify(c.notifications).includes("01000000000"));
 assert.equal(c.state().leadAlertPolling,false);
});

test("client resumes the next poll after its bounded batch of 300 alerts",async()=>{
 let calls=0;const received=[];
 const c=client(async()=>{
  const start=++calls*30-29;
  return page(Array.from({length:30},(_,index)=>({request_type:"contacts",id:start+index,created_at:1500})),calls<11?`1500:contacts:${start+29}`:"");
 });
 await c.poll();received.push(...c.summaries[0]);
 assert.equal(calls,10);assert.equal(c.state().leadAlertCursor,"1500:contacts:300");
 await c.poll();received.push(...c.summaries[1]);
 assert.equal(calls,11);assert.equal(c.state().leadAlertCursor,"");
 assert.equal(received.length,330);assert.equal(new Set(received.map(row=>row.id)).size,330);
});
