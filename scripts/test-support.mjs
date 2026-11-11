import fs from "node:fs/promises";
import {DatabaseSync} from "node:sqlite";

const source=await fs.readFile(new URL("../_worker.js",import.meta.url),"utf8");
const {default:worker}=await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

// Execute the production SQL against an isolated SQLite database, with the
// sequential transaction semantics of Cloudflare D1.batch(). Never use live data.
export function fixture(t,envOverrides={}){
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
  const env={DB,...envOverrides};
  const background=[];const ctx={waitUntil:promise=>background.push(promise)};
  return {
    sqlite,env,background,
    async drain(){await Promise.all(background.splice(0))},
    failNextLeadInsert(){failLeadInsert=true},
    count(table){return Number(sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count)},
    async post(path,body,ip="192.0.2.1",origin="https://esoticaegypt.com",extraHeaders={}){
      const request=new Request(`https://esoticaegypt.com/api/${path}`,{
        method:"POST",headers:{"content-type":"application/json",origin,"cf-connecting-ip":ip,...extraHeaders},body:JSON.stringify(body)
      });
      return worker.fetch(request,env,ctx);
    },
    async get(path,headers={}){
      return worker.fetch(new Request(`https://esoticaegypt.com/api/${path}`,{headers}),env,ctx);
    }
  };
}

