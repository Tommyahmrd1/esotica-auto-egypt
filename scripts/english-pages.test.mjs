import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
import {buildEnglish,hasArabic,parseHTML,walk} from "./build-english.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const compiled=await buildEnglish({allowMissing:true});
const nodes=tree=>{const result=[];walk(tree,node=>{if(node.tag)result.push(node)});return result};
const text=node=>(node.children||[]).map(child=>child.text??child.raw??text(child)).join("");
const publicRoutes=new Set(Object.keys(compiled.resources.metadata));

test("all 27 English pages are deterministic, complete and committed",async()=>{
  assert.equal(compiled.outputs.length,27);
  assert.equal(compiled.missing.size,0);
  await buildEnglish({check:true});
});

test("English is readable before JavaScript, including accessibility and form labels",()=>{
  for(const output of compiled.outputs){
    const tree=parseHTML(output.html),elements=nodes(tree),html=elements.find(node=>node.tag==="html");
    assert.equal(html.attrs.lang,"en",output.file);
    assert.equal(html.attrs.dir,"ltr",output.file);
    assert.equal(html.attrs["data-prerendered-language"],"en",output.file);
    const visible=[];
    function visit(node){
      if(["script","style"].includes(node.tag))return;
      if(node.text!==undefined)visible.push(node.text);
      for(const child of node.children||[])visit(child);
    }
    visit(tree);
    assert.equal(hasArabic(visible.join(" ")),false,`${output.file}: visible Arabic text`);
    assert.equal(elements.filter(node=>node.tag==="h1").length,1,output.file);
    for(const node of elements){
      for(const name of ["alt","title","aria-label","placeholder"]){
        assert.equal(hasArabic(node.attrs[name]||""),false,`${output.file}: ${node.tag}[${name}]`);
      }
      if(node.tag==="script"&&!node.attrs.src&&node.attrs.type!=="application/ld+json"){
        assert.doesNotMatch(text(node),/localStorage|classList\.add\(["']language-pending/);
      }
    }
  }
});

test("inline bootstrap keeps English direction before deferred frontend JavaScript",()=>{
  for(const output of compiled.outputs){
    const tree=parseHTML(output.html),elements=nodes(tree),classes=new Set();
    const documentElement={lang:"en",dir:"ltr",classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}};
    const head=elements.find(node=>node.tag==="head");
    for(const script of nodes(head).filter(node=>node.tag==="script"&&!node.attrs.src&&node.attrs.type!=="application/ld+json")){
      vm.runInNewContext(text(script),{document:{documentElement}},{timeout:100});
      assert.equal(documentElement.lang,"en",`${output.file}: inline script changed the language`);
      assert.equal(documentElement.dir,"ltr",`${output.file}: inline script changed the direction`);
      assert.equal(classes.has("language-pending"),false,`${output.file}: English was hidden`);
    }
  }
});

test("metadata and internal public links point to the correct language",()=>{
  for(const output of compiled.outputs){
    const elements=nodes(parseHTML(output.html)),expected=`https://esoticaegypt.com${output.route==="/"?"/en":`/en${output.route}`}`;
    const canonical=elements.find(node=>node.tag==="link"&&node.attrs.rel==="canonical");
    assert.equal(canonical.attrs.href,expected,output.file);
    const title=elements.find(node=>node.tag==="title");
    assert.equal(text(title),compiled.resources.metadata[output.route][0]);
    for(const lang of ["ar-EG","en","x-default"]){
      const alternate=elements.find(node=>node.tag==="link"&&node.attrs.hreflang===lang);
      assert.ok(alternate,`${output.file}: ${lang}`);
      assert.equal(alternate.attrs.href,lang==="en"?expected:`https://esoticaegypt.com${output.route}`);
    }
    const meta=name=>elements.find(node=>node.tag==="meta"&&(node.attrs.name||node.attrs.property)===name)?.attrs.content;
    assert.equal(meta("og:url"),expected);
    assert.equal(meta("og:locale"),"en_US");
    assert.equal(meta("og:locale:alternate"),"ar_EG");
    assert.equal(meta("twitter:title"),text(title));
    for(const node of elements.filter(node=>node.tag==="a"&&node.attrs.href)){
      const href=node.attrs.href;if(/^(?:#|mailto:|tel:|javascript:|\/\/)/.test(href))continue;
      const url=new URL(href,"https://esoticaegypt.com");if(url.origin!=="https://esoticaegypt.com")continue;
      const base=url.pathname.replace(/^\/en(?=\/|$)/,"").replace(/\.html$/,"").replace(/\/$/,"")||"/";
      if(publicRoutes.has(base))assert.match(url.pathname,/^\/en(?:\/|$)/,`${output.file}: ${href}`);
    }
  }
});

test("forms retain field names, option values and source-language data attributes",async()=>{
  for(const output of compiled.outputs){
    const sourceFile=output.route==="/"?"index.html":`${output.route.slice(1)}.html`;
    const original=nodes(parseHTML(await fs.readFile(path.join(ROOT,sourceFile),"utf8")));
    const english=nodes(parseHTML(output.html));
    const fieldAttributes=elements=>elements.filter(node=>["input","select","textarea","button"].includes(node.tag)).map(node=>({tag:node.tag,...Object.fromEntries(["name","id","type","required","min","max","step","pattern","value","maxlength"].filter(key=>Object.hasOwn(node.attrs,key)).map(key=>[key,node.attrs[key]]))}));
    assert.deepEqual(fieldAttributes(english),fieldAttributes(original),output.file);
    const optionValues=elements=>elements.filter(node=>node.tag==="option").map(node=>node.attrs.value??text(node));
    assert.deepEqual(optionValues(english),optionValues(original),`${output.file}: option values`);
    assert.deepEqual(english.filter(node=>node.attrs["data-ar"]).map(node=>node.attrs["data-ar"]),original.filter(node=>node.attrs["data-ar"]).map(node=>node.attrs["data-ar"]),`${output.file}: source bilingual copy`);
  }
});

test("brand assets, contact details, map coordinates and opening hours stay intact",async()=>{
  const protectedKeys=new Set(["@id","alternateName","geo","telephone","hasMap","openingHoursSpecification","openingHours"]);
  function facts(value,currentPath="",result=[]){
    if(Array.isArray(value))value.forEach((item,index)=>facts(item,`${currentPath}/${index}`,result));
    else if(value&&typeof value==="object"){
      for(const [key,item] of Object.entries(value)){
        if(protectedKeys.has(key))result.push([`${currentPath}/${key}`,item]);
        else facts(item,`${currentPath}/${key}`,result);
      }
    }
    return result;
  }
  for(const output of compiled.outputs){
    const originalFile=output.route==="/"?"index.html":`${output.route.slice(1)}.html`;
    const original=nodes(parseHTML(await fs.readFile(path.join(ROOT,originalFile),"utf8"))),english=nodes(parseHTML(output.html));
    const assets=elements=>elements.flatMap(node=>["src","poster","data-mobile-src","data-desktop-src","data-fallback-src"].filter(key=>node.attrs[key]).map(key=>[key,node.attrs[key]]));
    assert.deepEqual(assets(english),assets(original),`${output.file}: assets`);
    const contacts=elements=>elements.filter(node=>node.attrs.href&&/^(?:tel:|https:\/\/(?:maps\.|www\.google\.com\/maps))/.test(node.attrs.href)).map(node=>node.attrs.href);
    assert.deepEqual(contacts(english),contacts(original),`${output.file}: contacts and maps`);
    const structured=elements=>elements.filter(node=>node.tag==="script"&&node.attrs.type==="application/ld+json").map(node=>JSON.parse(text(node)));
    assert.deepEqual(facts(structured(english)),facts(structured(original)),`${output.file}: business facts`);
  }
});

test("generation fails on new untranslated visible copy before writing any output",async t=>{
  const tempBase=path.resolve(os.tmpdir()),temporary=await fs.mkdtemp(path.join(tempBase,"esotica-english-test-"));
  t.after(async()=>{
    assert.equal(path.dirname(temporary),tempBase);
    assert.ok(path.basename(temporary).startsWith("esotica-english-test-"));
    await fs.rm(temporary,{recursive:true,force:true});
  });
  await fs.mkdir(path.join(temporary,"scripts"));
  await fs.writeFile(path.join(temporary,"site.js"),'const EN={};\nconst AR={};\nconst PAGE_EN_META={\n"/":["English title","English description"]\n};\n');
  await fs.writeFile(path.join(temporary,"scripts","english-translations.json"),"{}");
  await fs.writeFile(path.join(temporary,"index.html"),'<html><head><title>عنوان</title></head><body><h1>نص غير مترجم جديد</h1></body></html>');
  await assert.rejects(buildEnglish({rootDir:temporary}),/Missing 1 English translations/);
  await assert.rejects(fs.access(path.join(temporary,"en")),{code:"ENOENT"});
});
