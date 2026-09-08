// Local UI verification only. Uses an in-memory fixture, never production data.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import worker from '../worker.js';
import { fixture } from './gudongi-test-fixture.mjs';
const f=fixture(),publicRoot=fileURLToPath(new URL('../public/',import.meta.url));
await f.login('preview-reader');await f.board();
await f.internal('/challenges/posts',{postId:'preview-post',boardId:'test-board',authorId:'preview-reader',title:'매일의 한 페이지',body:'책과 함께 자라는 구동이',achievement:7});
await f.internal('/gudongi/seen',{userId:'preview-reader',level:3});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
f.env.ASSETS.fetch=async request=>{const pathname=decodeURIComponent(new URL(request.url).pathname),target=path.resolve(publicRoot,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(publicRoot))return new Response('Forbidden',{status:403});try{return new Response(await readFile(target),{headers:{'content-type':mime[path.extname(target)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}};
const server=http.createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=new Request(`http://127.0.0.1:4186${req.url}`,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const result=await worker.fetch(request,f.env,{});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));}catch(error){res.writeHead(500);res.end(error.message);}});
server.listen(4186,'127.0.0.1',()=>console.log('In-memory Gudongi preview: http://127.0.0.1:4186 (preview-reader / test-password)'));
