import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const source=await fs.readFile(new URL("../site.js",import.meta.url),"utf8");
function block(name){
  const start=`// ${name}_BEGIN`,end=`// ${name}_END`;
  assert.ok(source.includes(start)&&source.includes(end),`Production ${name} block exists`);
  return source.slice(source.indexOf(start)+start.length,source.indexOf(end));
}
const helpers=block("PUBLIC_FORM_HELPERS");
const controller=block("PUBLIC_FORM_CONTROLLER");
const success=source.slice(source.indexOf("const FORM_SUCCESS="),source.indexOf("// PUBLIC_FORM_CONTROLLER_BEGIN"));

function fixture(language="en"){
  let now=Date.UTC(2026,10,14,10,0),nextTimer=1,requests=0;
  const intervals=new Map(),timeouts=new Map(),storage=new Map();
  const message={textContent:"",attributes:{},setAttribute(key,value){this.attributes[key]=value}};
  const button={disabled:false,classList:{add(){},remove(){}}};
  const phone={focused:false,setAttribute(){},focus(){this.focused=true}};
  const form={
    data:{name:"Test customer",phone:"٠١١١٠٤٤٤٥٢٨",message:"Keep this message"},elements:{phone},resets:0,attributes:{},
    querySelector(){return button},
    setAttribute(key,value){this.attributes[key]=value},
    reset(){this.resets++;for(const key of Object.keys(this.data))this.data[key]=""}
  };
  let response=async()=>new Response(JSON.stringify({message:"Received"}),{status:200,headers:{"content-type":"application/json"}});
  let sentBody;
  const document={documentElement:{lang:language}};
  const ctx=vm.createContext({
    Date:class extends Date{static now(){return now}},
    AbortController,FormData:class{constructor(value){this.value=value}entries(){return Object.entries(this.value.data)}},
    document,location:{pathname:"/contact"},currentLeadAttribution:{type:"direct",label:"",id:"",page:""},
    isArabic:()=>document.documentElement.lang==="ar",
    uiText:(ar,en)=>document.documentElement.lang==="ar"?ar:en,
    msg:(element,text,ok=true)=>{element.textContent=text;element.ok=ok;element.setAttribute("aria-live",ok?"polite":"assertive")},
    window:{
      setInterval(callback){const id=nextTimer++;intervals.set(id,callback);return id},clearInterval(id){intervals.delete(id)},
      setTimeout(callback){const id=nextTimer++;timeouts.set(id,callback);return id},clearTimeout(id){timeouts.delete(id)}
    },
    sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    fetch:async(_url,options)=>{requests++;sentBody=JSON.parse(options.body);return response(options)}
  });
  vm.runInContext(helpers+"\n"+success+"\n"+controller,ctx);
  return {
    ctx,form,button,message,phone,storage,document,
    get requests(){return requests},get sentBody(){return sentBody},get pendingTimeouts(){return timeouts.size},
    setResponse(callback){response=callback},
    async send(){await ctx.sendForm(form,"/api/contact",message)},
    tick(milliseconds){now+=milliseconds;for(const callback of [...intervals.values()])callback()}
  };
}

test("phone normalization accepts Arabic/Persian digits and formatted local/international numbers",()=>{
  const {ctx}=fixture();
  for(const value of ["٠١١١٠٤٤٤٥٢٨","۰۱۱۱۰۴۴۴۵۲۸","011 1044 4528","1110444528","0020 111 044 4528","+20 (0)1110444528"]){
    assert.equal(ctx.normalizeFormPhone(value),"+201110444528",value);
  }
  assert.equal(ctx.normalizeFormPhone("+44 (20) 7946-0958"),"+442079460958");
  for(const value of ["--------","++++++++","phone","+0012345678",""]){assert.equal(ctx.normalizeFormPhone(value),"",value)}
  assert.equal(ctx.normalizeFormDigits("۲۰۲۶"),"2026");
});

test("phone HTML constraints accept Arabic digits, formatting and international 00 prefixes",async()=>{
  for(const file of ["booking.html","parts.html","contact.html"]){
    const html=await fs.readFile(new URL(`../${file}`,import.meta.url),"utf8");
    const input=html.match(/<input\b[^>]*name="phone"[^>]*>/)?.[0];
    const pattern=input?.match(/pattern="([^"]+)"/)?.[1];
    assert.ok(pattern,`${file} has a phone pattern`);
    const regex=new RegExp(`^(?:${pattern})$`,"v");
    for(const value of ["٠١١١٠٤٤٤٥٢٨","+20 (111) 044-4528","(20111)0444528","00442079460958"]){assert.ok(regex.test(value),`${file}: ${value}`)}
    assert.ok(!regex.test("--------"));
  }
});

test("booking branches retain stable values when option labels are translated",async()=>{
  const html=await fs.readFile(new URL("../booking.html",import.meta.url),"utf8");
  const options=html.match(/<select name="branch"[^>]*>([\s\S]*?)<\/select>/)?.[1]||"";
  for(const value of ["فرع التجمع الخامس","فرع التجمع الثالث","الشيخ زايد"]){assert.ok(options.includes(`value="${value}"`))}
});

test("booking validation rejects Fridays, past times, cutoff and invalid slots using Cairo parts",()=>{
  const {ctx}=fixture(),now={date:"2026-11-14",hour:14,minute:12};
  assert.equal(ctx.bookingChoiceError("2026-11-13","15:00",now).code,"PAST_DATE");
  assert.equal(ctx.bookingChoiceError("2026-11-20","15:00",now).code,"FRIDAY_CLOSED");
  assert.equal(ctx.bookingChoiceError("2026-11-14","14:00",now).code,"PAST_TIME");
  assert.equal(ctx.bookingChoiceError("2026-11-14","14:30",now),null);
  assert.equal(ctx.bookingChoiceError("2026-11-14","18:00",{...now,hour:17,minute:0}).code,"SAME_DAY_CUTOFF");
  assert.equal(ctx.bookingChoiceError("2026-11-15","18:00",now),null);
  for(const time of ["09:30","18:30","12:15","25:00"]){assert.equal(ctx.bookingChoiceError("2026-11-15",time,now).code,"INVALID_TIME")}
  assert.equal(ctx.bookingChoiceError("2026-02-30","12:00",now).code,"INVALID_DATE");
});

test("rate-limit response explains actual wait, disables retry and preserves values through expiry",async()=>{
  const f=fixture();
  f.setResponse(async()=>new Response(JSON.stringify({error:"انتظر",error_en:"Wait",code:"RATE_LIMITED",retryAfter:70}),{status:429,headers:{"Retry-After":"70"}}));
  await f.send();
  assert.equal(f.button.disabled,true);
  assert.match(f.message.textContent,/1:10/);
  assert.equal(f.form.data.message,"Keep this message");
  assert.equal(f.form.resets,0);
  assert.equal(f.pendingTimeouts,0);
  assert.equal(f.storage.size,1);
  await f.send();assert.equal(f.requests,1,"early retry does not send another request");
  f.tick(60000);assert.match(f.message.textContent,/0:10/);
  f.tick(10000);
  assert.equal(f.button.disabled,false);
  assert.match(f.message.textContent,/submit your request now/);
  assert.equal(f.storage.size,0);
  assert.equal(f.form.data.message,"Keep this message");
});

test("rate-limit countdown follows Arabic language and handles date-form Retry-After",async()=>{
  const f=fixture("ar");
  f.setResponse(async()=>new Response(JSON.stringify({retryAfter:61}),{status:429}));
  await f.send();assert.match(f.message.textContent,/المحاولة بعد 1:01/);
  const reference=Date.UTC(2026,10,14,10,0);
  assert.equal(f.ctx.formRetrySeconds({headers:new Headers({"Retry-After":new Date(reference+90000).toUTCString()})},{},reference),90);
});

test("structured field errors use English copy, preserve details and focus the affected field",async()=>{
  const f=fixture();
  f.setResponse(async()=>new Response(JSON.stringify({error:"رقم غير صحيح",error_en:"Please correct the phone number.",field:"phone",code:"INVALID_PHONE"}),{status:400}));
  await f.send();
  assert.equal(f.message.textContent,"Please correct the phone number.");
  assert.equal(f.phone.focused,true);
  assert.equal(f.form.resets,0);assert.equal(f.button.disabled,false);
});

test("server failures and network failures display distinct retry guidance without clearing data",async()=>{
  const f=fixture();
  f.setResponse(async()=>new Response("temporarily unavailable",{status:503}));
  await f.send();assert.match(f.message.textContent,/temporary error/);
  f.setResponse(async()=>{throw new TypeError("Failed to fetch")});
  await f.send();assert.match(f.message.textContent,/Check your connection/);
  assert.equal(f.form.resets,0);assert.equal(f.form.data.message,"Keep this message");
  assert.equal(f.button.disabled,false);
});

test("timeouts and malformed success responses do not claim receipt or erase the form",async()=>{
  const f=fixture();
  f.setResponse(async()=>{throw new DOMException("Aborted","AbortError")});
  await f.send();assert.match(f.message.textContent,/timed out before/);
  f.setResponse(async()=>new Response("<html>not an API response</html>",{status:200}));
  await f.send();assert.match(f.message.textContent,/could not confirm receipt/);
  assert.equal(f.form.resets,0);
  assert.equal(f.form.data.message,"Keep this message");
});

test("confirmed success normalizes the sent phone and clears the form only after receipt",async()=>{
  const f=fixture();await f.send();
  assert.equal(f.sentBody.phone,"+201110444528");
  assert.equal(f.form.resets,1);
  assert.match(f.message.textContent,/has been received/);
  assert.equal(f.button.disabled,false);assert.equal(f.pendingTimeouts,0);
});
