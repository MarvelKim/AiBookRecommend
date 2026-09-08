// Local UI verification only. Uses an in-memory fixture, never production data.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import worker from '../worker.js';
import { fixture } from './gudongi-test-fixture.mjs';
const f=fixture(),publicRoot=fileURLToPath(new URL('../public/',import.meta.url));
const port=Number(process.env.GUDONGI_PREVIEW_PORT||4186),mockSearch=process.argv.includes('--mock-search');let emptySearch=false;
if(mockSearch)globalThis.fetch=async input=>{
  const url=new URL(typeof input==='string'?input:input.url||input);
  if(url.hostname==='www.googleapis.com')return Response.json({items:emptySearch?[]:Array.from({length:6},(_,i)=>({id:String(i),volumeInfo:{title:`행정 기획 보고서 실무 ${i}`,description:'공공기관 행정 기획 보고서 실무 문제 해결',publishedDate:'2026-01-01',industryIdentifiers:[{type:'ISBN_13',identifier:`978000000000${i}`}],authors:['테스트 저자']}}))});
  return new Response('',{status:503});
};
await f.login('preview-reader');await f.board();
await f.internal('/challenges/posts',{postId:'preview-post',boardId:'test-board',authorId:'preview-reader',title:'매일의 한 페이지',body:'책과 함께 자라는 구동이',achievement:7});
await f.internal('/gudongi/seen',{userId:'preview-reader',level:3});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
f.env.ASSETS.fetch=async request=>{const pathname=decodeURIComponent(new URL(request.url).pathname),target=path.resolve(publicRoot,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(publicRoot))return new Response('Forbidden',{status:403});try{return new Response(await readFile(target),{headers:{'content-type':mime[path.extname(target)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}};
const server=http.createServer(async(req,res)=>{try{if(mockSearch&&req.method==='POST'&&req.url.startsWith('/__test/search')){emptySearch=req.url.endsWith('empty');res.end('OK');return;}const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=new Request(`http://127.0.0.1:${port}${req.url}`,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const result=await worker.fetch(request,f.env,{});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));}catch(error){res.writeHead(500);res.end(error.message);}});
server.listen(port,'127.0.0.1',()=>console.log(`In-memory Gudongi preview: http://127.0.0.1:${port} (preview-reader / test-password)`));
