import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const source=await fs.readFile(new URL("../_worker.js",import.meta.url),"utf8");
const {default:worker}=await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

for(const [route,asset] of [["/en","/en/"],["/en/","/en/"],["/en/booking","/en/booking"],["/en/branches/sheikh-zayed","/en/branches/sheikh-zayed"]]){
  test(`English worker serves complete static HTML at ${route}`,async()=>{
    let requested;
    const response=await worker.fetch(new Request(`https://esoticaegypt.com${route}?utm_source=test`),{
      ASSETS:{async fetch(request){
        requested=new URL(request.url);
        const file=asset.endsWith("/")?`${asset}index.html`:`${asset}.html`;
        return new Response(await fs.readFile(new URL(`..${file}`,import.meta.url)),{headers:{"content-type":"text/html"}});
      }}
    });
    assert.equal(response.status,200);assert.equal(response.headers.get("content-language"),"en");
    assert.equal(requested.pathname,asset);assert.equal(requested.search,"");
    const html=await response.text();
    assert.match(html,/data-prerendered-language="en"/);
    assert.doesNotMatch(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]||"",/[\u0600-\u06ff]/);
  });
}

test("unknown English routes return 404 without an Arabic homepage fallback",async()=>{
  const response=await worker.fetch(new Request("https://esoticaegypt.com/en/nonexistent"),{
    ASSETS:{fetch(){throw new Error("Unknown routes must not use the SPA fallback")}}
  });
  assert.equal(response.status,404);
});

test("English HEAD requests preserve asset status and an empty body",async()=>{
  const response=await worker.fetch(new Request("https://esoticaegypt.com/en/booking",{method:"HEAD"}),{
    ASSETS:{async fetch(request){assert.equal(request.method,"HEAD");return new Response(null,{headers:{"content-type":"text/html"}})}}
  });
  assert.equal(response.status,200);assert.equal(response.headers.get("content-language"),"en");assert.equal(await response.text(),"");
});
