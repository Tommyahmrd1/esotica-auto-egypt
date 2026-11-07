import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const failures=[];
const allFiles=[];

function walk(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    if(entry.name===".git")continue;
    const absolute=path.join(directory,entry.name);
    if(entry.isDirectory())walk(absolute);
    else allFiles.push(path.relative(root,absolute).split(path.sep).join("/"));
  }
}

function fail(file,message){failures.push(`${file}: ${message}`)}

function routeExists(raw,fromFile){
  const clean=raw.split(/[?#]/)[0];
  if(!clean||clean==="/")return fs.existsSync(path.join(root,"index.html"));
  if(clean.startsWith("/api/"))return true;
  const relative=clean.startsWith("/")
    ?clean.slice(1)
    :path.posix.normalize(path.posix.join(path.posix.dirname(fromFile),clean));
  return [relative,`${relative}.html`,path.posix.join(relative,"index.html")]
    .some(candidate=>fs.existsSync(path.join(root,candidate)));
}

walk(root);
const htmlFiles=allFiles.filter(file=>file.endsWith(".html"));
const publicHtml=htmlFiles.filter(file=>!file.startsWith("admin/")&&!file.startsWith("customer-preview/"));

for(const file of htmlFiles){
  const source=fs.readFileSync(path.join(root,file),"utf8");
  const publicPage=publicHtml.includes(file);
  if(publicPage){
    if(!/<meta\s+name="description"\s+content="[^"]+"/i.test(source))fail(file,"missing meta description");
    if(!/<link\s+rel="canonical"\s+href="https:\/\/esoticaegypt\.com\/[^"]*"/i.test(source))fail(file,"missing canonical URL");
    if((source.match(/<h1\b/gi)||[]).length!==1)fail(file,"must contain exactly one h1");
  }

  const ids=[...source.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  for(const id of new Set(ids.filter((value,index)=>ids.indexOf(value)!==index)))fail(file,`duplicate id ${id}`);

  for(const match of source.matchAll(/\b(?:href|src|poster|data-(?:mobile|desktop|fallback)-src)="([^"]+)"/g)){
    const value=match[1];
    if(/^(?:https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i.test(value))continue;
    if(!routeExists(value,file))fail(file,`missing local reference ${value}`);
  }

  for(const match of source.matchAll(/<img\b([^>]*)>/gi)){
    if(!/\balt="[^"]*"/i.test(match[1]))fail(file,"image missing alt text");
  }
  for(const match of source.matchAll(/<a\b([^>]*)>/gi)){
    if(/target="_blank"/i.test(match[1])&&!/rel="[^"]*(?:noopener|noreferrer)/i.test(match[1]))fail(file,"target=_blank link missing rel protection");
  }
}

const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");
for(const match of css.matchAll(/url\(['"]?([^)'"\s]+)["']?\)/g)){
  const value=match[1];
  if(/^(?:https?:|data:|\/\/)/i.test(value))continue;
  if(!routeExists(value,"styles.css"))fail("styles.css",`missing asset ${value}`);
}

const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
const sitemapPaths=new Set([...sitemap.matchAll(/<loc>https:\/\/esoticaegypt\.com([^<]*)<\/loc>/g)].map(match=>match[1]||"/"));
for(const file of publicHtml){
  const route=file==="index.html"?"/":`/${file.replace(/\.html$/,"")}`;
  if(!sitemapPaths.has(route))fail("sitemap.xml",`missing public route ${route}`);
}

if(failures.length){
  console.error(`Site validation failed with ${failures.length} issue(s):`);
  failures.forEach(item=>console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Site validation passed: ${publicHtml.length} public pages, ${htmlFiles.length} total HTML files.`);
