import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import {fixture} from "./test-support.mjs";

const root=new URL("../",import.meta.url);
const [worker,site,adminHtml]=await Promise.all(["_worker.js","site.js","admin/index.html"].map(path=>fs.readFile(new URL(path,root),"utf8").then(text=>text.replace(/\r\n/g,"\n"))));
const limits=vm.runInNewContext(worker.match(/const CMS_CONTENT_LIMITS=([\s\S]*?);\n/)[1]);
const EN=vm.runInNewContext(`${site.slice(site.indexOf("const EN="),site.indexOf("const AR="))};EN`);
const defaultText=source=>source.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&");

test("all detail fields have matching language controls, targets and length limits",async()=>{
  const controls=[...adminHtml.matchAll(/<(?:input|textarea) name="([^"]+)" data-managed-content-field[^>]*maxlength="(\d+)"/g)];
  assert.ok(controls.length>0);
  assert.deepEqual(controls.map(match=>match[1]).sort(),Object.keys(limits).sort());
  for(const [,key,max] of controls)assert.equal(Number(max),limits[key],key);
  const pages=await Promise.all(["services.html","warranty-insurance.html"].map(path=>fs.readFile(new URL(path,root),"utf8")));
  const targetKeys=new Set();
  for(const page of pages){
    for(const match of page.matchAll(/<([\w]+)[^>]*data-cms-setting="([^"]+)" data-cms-setting-en="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)){
      const [,tag,ar,en,text]=match;
      targetKeys.add(ar);targetKeys.add(en);
      assert.equal(en,`${ar}_en`);
      assert.ok(EN[defaultText(text).trim()],`missing English fallback for ${ar} (${tag})`);
    }
  }
  for(const key of Object.keys(limits))assert.ok(targetKeys.has(key),`missing public text target for ${key}`);
  assert.ok(!Object.keys(limits).some(key=>/branch|phone|brand|map|hours|media|logo/.test(key)));
});

test("language changes restore approved copy when a translation is blank or absent",()=>{
  const element={textContent:"الصيانة والتشخيص",dataset:{cmsSetting:"service_maintenance_title",cmsSettingEn:"service_maintenance_title_en"}};
  const context={document:{querySelectorAll:()=>[element]},EN,WeakMap};
  const source=site.match(/const managedPageDefaults=[\s\S]*?(?=async function loadSiteContent)/)[0];
  vm.createContext(context);vm.runInContext(source,context);
  context.settings={service_maintenance_title:"نص عربي مخصص"};
  vm.runInContext('applyManagedPageContent(settings,"ar")',context);
  assert.equal(element.textContent,"نص عربي مخصص");
  vm.runInContext('applyManagedPageContent(settings,"en")',context);
  assert.equal(element.textContent,EN["الصيانة والتشخيص"]);
  context.settings.service_maintenance_title_en="<img src=x onerror=alert(1)> Custom title";
  vm.runInContext('applyManagedPageContent(settings,"en")',context);
  assert.equal(element.textContent,context.settings.service_maintenance_title_en);
  context.settings.service_maintenance_title="";
  vm.runInContext('applyManagedPageContent(settings,"ar")',context);
  assert.equal(element.textContent,"الصيانة والتشخيص");
});

async function authenticatedFixture(t){
  const f=fixture(t,{ADMIN_PASSWORD:"cms-test-password",ADMIN_SESSION_SECRET:"cms-test-session-secret"});
  const login=await f.post("admin/login",{username:"admin",password:"cms-test-password"});
  assert.equal(login.status,200);
  const cookie=login.headers.get("set-cookie").split(";")[0];
  return {f,cookie,save:body=>f.post("admin/site-settings",body,"192.0.2.1","https://esoticaegypt.com",{cookie})};
}

test("authorized changes store both languages and leave branch and identity settings untouched",async t=>{
  const {f,save}=await authenticatedFixture(t);
  const response=await save({service_maintenance_title:"عنوان عربي",service_maintenance_title_en:"English title",insurance_disclaimer:"نص التغطية",branch_address:"changed",branch_hours:"changed",logo_media_id:"changed"});
  assert.equal(response.status,200);
  const rows=f.sqlite.prepare("SELECT key,value FROM site_settings ORDER BY key").all();
  assert.deepEqual(rows.map(row=>[row.key,row.value]),[["insurance_disclaimer","نص التغطية"],["service_maintenance_title","عنوان عربي"],["service_maintenance_title_en","English title"]]);
  assert.equal((await save({service_maintenance_title:""})).status,200);
  assert.equal(f.sqlite.prepare("SELECT value FROM site_settings WHERE key='service_maintenance_title'").get().value,"");
});

test("invalid content rejects the entire update without partial writes",async t=>{
  const {f,save}=await authenticatedFixture(t);
  assert.equal((await save({service_maintenance_title:"Approved"})).status,200);
  for(const invalid of ["x".repeat(161),{},123,null]){
    assert.equal((await save({service_maintenance_description:"Must not save",service_maintenance_title:invalid})).status,400);
    assert.equal(f.sqlite.prepare("SELECT value FROM site_settings WHERE key='service_maintenance_title'").get().value,"Approved");
    assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM site_settings WHERE key='service_maintenance_description'").get().count,0);
  }
});

test("content changes require an authenticated administrator",async t=>{
  const f=fixture(t,{ADMIN_PASSWORD:"cms-test-password"});
  assert.equal((await f.post("admin/site-settings",{service_maintenance_title:"Rejected"})).status,401);
});
