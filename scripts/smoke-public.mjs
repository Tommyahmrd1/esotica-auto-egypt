import assert from "node:assert/strict";
import {loadTranslations,parseHTML,walk,hasArabic} from "./build-english.mjs";

const base=process.env.SITE_URL||"https://esoticaegypt.com";
const {metadata}=await loadTranslations();
const routes=Object.keys(metadata);
let checked=0;
for(let index=0;index<routes.length;index+=4){
  await Promise.all(routes.slice(index,index+4).map(async route=>{
    const english=route==="/"?"/en":`/en${route}`;
    const response=await fetch(new URL(english,base),{signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,200,english);
    assert.equal(response.headers.get("content-language"),"en",english);
    const source=await response.text(),tree=parseHTML(source),elements=[];
    walk(tree,node=>{if(node.tag)elements.push(node)});
    const html=elements.find(node=>node.tag==="html");
    assert.equal(html?.attrs["data-prerendered-language"],"en",english);
    const visible=[];
    function text(node){
      if(["script","style"].includes(node.tag))return;
      if(node.text!==undefined)visible.push(node.text);
      for(const child of node.children||[])text(child);
    }
    text(tree);assert.equal(hasArabic(visible.join(" ")),false,`${english}: untranslated visible copy`);
    const canonical=elements.find(node=>node.tag==="link"&&node.attrs.rel==="canonical");
    assert.equal(canonical?.attrs.href,`https://esoticaegypt.com${english}`,english);
    checked++;
  }));
}
const health=await fetch(new URL("/api/site-content",base),{signal:AbortSignal.timeout(20000)});
assert.equal(health.status,200,"D1 content initialization");
assert.ok((await health.json()).settings);
console.log(`Live English smoke test passed: ${checked} complete pages; D1 content endpoint passed.`);
