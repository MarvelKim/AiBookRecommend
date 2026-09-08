// Isolated, disposable memory database. No production bindings or disk DB access.
import { DatabaseSync } from 'node:sqlite';
import worker, { RankingStore } from '../worker.js';
export function fixture() {
  const database=new DatabaseSync(':memory:');
  const sql={exec(query,...args){const text=String(query).trim();if(!args.length&&/;\s*\S/.test(text)){database.exec(text);return [];}const statement=database.prepare(text);if(/^(SELECT|PRAGMA|WITH)\b/i.test(text)||/\bRETURNING\b/i.test(text))return statement.all(...args);statement.run(...args);return [];}};
  const storage={sql,transactionSync(fn){database.exec('BEGIN');try{const result=fn();database.exec('COMMIT');return result;}catch(error){database.exec('ROLLBACK');throw error;}}};
  const store=new RankingStore({storage,blockConcurrencyWhile(fn){return fn();}}),objects=new Map();
  const env={ADMIN_SESSION_SECRET:'in-memory-test-only-not-production',ADMIN_PASSWORD:'test-admin-password',CHALLENGE_FILES:{async put(key,bytes){objects.set(key,new Uint8Array(bytes));},async get(key){return objects.has(key)?{body:objects.get(key)}:null;},async delete(key){objects.delete(key);}},RANKINGS:{idFromName:name=>name,get:()=>store},ASSETS:{fetch:()=>new Response('Not found',{status:404})}};
  const internal=(path,body)=>store.fetch(new Request(`https://rankings.internal${path}`,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{}));
  const api=(path,body,cookie='',origin='https://gmuc.test')=>worker.fetch(new Request(`https://gmuc.test${path}`,{method:body?'POST':'GET',headers:{cookie,origin,...(body instanceof FormData?{}:{'content-type':'application/json'})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}),env,{});
  const login=async(userId='reader',password='test-password')=>{const response=await api('/api/account/login',{id:userId,password});if(!response.ok)throw new Error(await response.text());return response.headers.get('set-cookie').split(';')[0];};
  const board=()=>internal('/admin/challenges/boards/save',{id:'test-board',name:'함께 읽는 챌린지',type:'독서',startDate:'2025-01-01',endDate:'2030-12-31',target:100,unit:'권',adminId:'admin'});
  return {database,sql,storage,store,env,objects,internal,api,login,board};
}
