// Start `node scripts/preview-gudongi.mjs` first. Only the isolated fixture is used.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
const output=path.resolve(process.env.TEMP||'C:/CLI/output',`gmuc-gudongi-ui-${Date.now()}`);await mkdir(output,{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--hide-scrollbars','--remote-debugging-port=9356',`--user-data-dir=${output}/edge-profile`,'--window-size=1440,1000',`http://127.0.0.1:${process.env.GUDONGI_PREVIEW_PORT||4186}`],{stdio:'ignore',windowsHide:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let socket;
try{
  let endpoint;for(let i=0;i<80;i++){try{const pages=await(await fetch('http://127.0.0.1:9356/json/list')).json();endpoint=pages.find(p=>p.type==='page')?.webSocketDebuggerUrl;if(endpoint)break;}catch{}await delay(100);}if(!endpoint)throw Error('Headless Edge failed to start');
  socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const pending=new Map(),errors=[];socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
  const command=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const shot=async name=>{const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(output,name+'.png'),Buffer.from(r.data,'base64'));};
  await command('Runtime.enable');await command('Page.enable');await delay(1200);
  assert.equal(await evaluate(`Math.round(document.querySelector('.hero').getBoundingClientRect().height)`),356);
  await evaluate(`(async()=>{await fetch('/api/account/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'preview-reader',password:'test-password'})});state.user='preview-reader';state.isAdmin=false;updateUserUI();await showView('library');await window.refreshMyInfo();document.querySelector('#myGudongiTab').click();})()`);await delay(350);
  assert.deepEqual(await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('#headerGudongi'));return [s.paddingLeft,s.paddingRight]})()`),['9px','12px']);
  for(const file of ['baby','student','default','reading','casual','jumping','safety-helmet','hearts','suit']){
    const bounds=await evaluate(`(async()=>{const img=document.querySelector('.header-gudongi-art img');img.src='/characters/gudongi/${file}.png';await img.decode();const a=img.getBoundingClientRect(),b=img.parentElement.getBoundingClientRect(),badge=document.querySelector('#headerGudongi').getBoundingClientRect();return {contained:a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom,centerX:Math.abs((a.left+a.right-b.left-b.right)/2),centerY:Math.abs((a.top+a.bottom-b.top-b.bottom)/2),clip:{x:badge.x,y:badge.y,width:badge.width,height:badge.height,scale:3}}})()`);
    assert.equal(bounds.contained,true,`${file} badge image must not be clipped`);assert.ok(bounds.centerX<.1&&bounds.centerY<.1,`${file} image centered`);
    const capture=await command('Page.captureScreenshot',{format:'png',clip:bounds.clip});await writeFile(path.join(output,`badge-${file}.png`),Buffer.from(capture.data,'base64'));
  }
  await evaluate(`window.refreshMyInfo()`);
  for(const [name,width,height] of [['desktop',1440,1050],['tablet',820,1100],['mobile',390,844]]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);await delay(180);
    const geometry=await evaluate(`(()=>{const card=document.querySelector('.gudongi-growth-card').getBoundingClientRect(),rail=document.querySelector('.resource-index').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,cardRight:card.right,railLeft:rail.left,tab:document.querySelector('#myGudongiTab').getAttribute('aria-selected'),images:[...document.querySelectorAll('#myGudongiPanel img')].every(i=>i.complete&&i.naturalWidth>0)};})()`);
    assert.equal(geometry.overflow,false,`${name} horizontal overflow`);assert.equal(geometry.tab,'true');assert.equal(geometry.images,true);if(width>620)assert.ok(geometry.cardRight<geometry.railLeft,`${name} side rail overlap`);await shot(`gudongi-${name}`);
    await evaluate(`document.querySelector('#changeAppearance').click()`);await delay(100);const cols=await evaluate(`getComputedStyle(document.querySelector('#appearanceGrid')).gridTemplateColumns.split(' ').length`);assert.equal(cols,width<580?1:width<=850?2:3);assert.equal(await evaluate(`document.querySelectorAll('.appearance-choice').length`),9);
    assert.equal(await evaluate(`document.querySelectorAll('.appearance-choice:disabled').length`),5);
    assert.equal(await evaluate(`document.querySelector('[data-appearance="baby"]').disabled`),false);
    assert.equal(await evaluate(`document.querySelector('[data-appearance="hearts"] small').textContent`),'LV 5 · 보너스 모습');
    assert.match(await evaluate(`getComputedStyle(document.querySelector('[data-appearance="hearts"] img')).filter`),/gudongiSilhouette/);
    await evaluate(`document.querySelector('[data-appearance="hearts"]').click()`);
    assert.equal(await evaluate(`document.querySelector('#appearanceDialog').open`),true);
    await shot(`appearance-${name}`);await evaluate(`document.querySelector('#appearanceDialog').close()`);
  }
  if(process.argv.includes('--recommend-flow')){
    await evaluate(`(async()=>{await showView('curation');document.querySelectorAll('.chip').forEach(b=>b.classList.remove('selected'));document.querySelector('[data-group="jobs"]').classList.add('selected');document.querySelectorAll('[data-group="purposes"]')[4].classList.add('selected');document.querySelector('[data-field="level"]').value='\uC2E4\uBB34';document.querySelector('[data-field="freshness"]').value='\uBB34\uAD00';document.querySelector('[data-field="practical"]').value='\uBB34\uAD00';document.querySelector('#recommendButton').click()})()`);
    for(let i=0;i<100;i++){if(await evaluate(`!document.querySelector('#recommendButton').disabled`))break;await delay(100);}
    assert.equal(await evaluate(`state.books.length`),60);
    await evaluate(`document.querySelector('#bookGrid [data-favorite]').click()`);await delay(250);
    const earned=await evaluate(`(async()=>{const p=(await(await fetch('/api/account/gudongi')).json()).gudongi;return {xp:p.totalXp,used:p.quota.used,daily:p.quota.xp,books:state.books.length}})()`);
    assert.deepEqual(earned,{xp:22,used:1,daily:1,books:60});
    await evaluate(`(async()=>{await showView('library');await window.refreshMyInfo();document.querySelector('#myGudongiTab').click()})()`);await delay(200);
    assert.equal(await evaluate(`document.querySelectorAll('.daily-stamps>span').length`),5);
    assert.equal(await evaluate(`document.querySelectorAll('.daily-stamps .is-earned').length`),1);
    assert.equal(await evaluate(`document.querySelectorAll('.xp-group').length`),5);
    assert.equal(await evaluate(`document.querySelectorAll('.xp-unit').length`),30);
    assert.equal(await evaluate(`document.querySelectorAll('.xp-unit.filled').length`),7);
    for(const [name,width,height] of [['desktop',1440,1100],['mobile',390,844]]){
      await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
      await evaluate(`document.querySelector('.gudongi-daily').scrollIntoView({block:'center',behavior:'instant'})`);await delay(150);await shot('daily-'+name);
      assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth`),false);
    }
    await evaluate(`(async()=>{await showView('curation');document.querySelector('#refreshButton').click()})()`);
    for(let i=0;i<100;i++){if(await evaluate(`!document.querySelector('#recommendButton').disabled`))break;await delay(100);}
    assert.equal(await evaluate(`state.offset`),6);
    assert.deepEqual(await evaluate(`(async()=>{const p=(await(await fetch('/api/account/gudongi')).json()).gudongi;return [p.totalXp,p.quota.used,p.quota.xp]})()`),[22,1,1]);
    await evaluate(`(async()=>{await fetch('/__test/search/empty',{method:'POST'});await showView('curation');document.querySelector('#recommendButton').click()})()`);
    for(let i=0;i<100;i++){if(await evaluate(`!document.querySelector('#recommendButton').disabled`))break;await delay(100);}
    assert.equal(await evaluate(`document.querySelectorAll('#bookGrid .book-card').length`),0);
    assert.equal(await evaluate(`state.books.length`),0);
    assert.equal(await evaluate(`(async()=>{return (await(await fetch('/api/account/gudongi')).json()).gudongi.totalXp})()`),22);
    await evaluate(`(async()=>{await showView('library');await window.refreshMyInfo();document.querySelector('#myGudongiTab').click()})()`);await delay(200);
  }
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate(`document.querySelector('#mySettingsButton').click()`);await shot('account-settings');
  await evaluate(`(async()=>{const blob=await(await fetch('/characters/gudongi/reading.png')).blob();const transfer=new DataTransfer();transfer.items.add(new File([blob],'reading.png',{type:'image/png'}));const input=document.querySelector('#avatarFile');input.files=transfer.files;input.dispatchEvent(new Event('change'));})()`);await delay(300);
  assert.equal(await evaluate(`document.querySelector('#avatarCropDialog').open`),true);
  const before=await evaluate(`document.querySelector('#avatarCropCanvas').toDataURL()`);
  await evaluate(`document.querySelector('#cropZoom').value='170';document.querySelector('#cropZoom').dispatchEvent(new Event('input'));document.querySelector('#cropX').value='30';document.querySelector('#cropX').dispatchEvent(new Event('input'))`);
  assert.notEqual(await evaluate(`document.querySelector('#avatarCropCanvas').toDataURL()`),before);await shot('avatar-crop-desktop');
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await shot('avatar-crop-mobile');
  await evaluate(`document.querySelector('#saveAvatar').click()`);await delay(400);assert.equal(await evaluate(`document.querySelector('#avatarCropDialog').open`),false);assert.equal(await evaluate(`!!document.querySelector('#profileInitial img')`),true);
  await evaluate(`document.querySelector('#mySettingsDialog').close();document.querySelector('#changeAppearance').click();document.querySelector('[data-appearance="reading"]').click()`);await delay(250);assert.equal(await evaluate(`document.querySelector('.gudongi-intro h2').textContent`),'책 읽는 구동이');
  await command('Page.reload');await delay(1400);await evaluate(`(async()=>{state.user='preview-reader';state.isAdmin=false;updateUserUI();await showView('library');await window.refreshMyInfo();document.querySelector('#myGudongiTab').click()})()`);assert.equal(await evaluate(`!!document.querySelector('#profileInitial img')`),true);assert.equal(await evaluate(`document.querySelector('.gudongi-intro h2').textContent`),'책 읽는 구동이');
  await evaluate(`document.querySelector('#myLibraryTab').click()`);assert.equal(await evaluate(`document.querySelector('#myGudongiPanel').hidden`),true);assert.equal(await evaluate(`document.querySelector('#myLibraryPanel').hidden`),false);
  await evaluate(`(async()=>{const p=(await(await fetch('/api/account/gudongi')).json()).gudongi;document.querySelector('#myGudongiTab').click();window.applyGudongi({...p,level:3,max:false,totalXp:23,currentXp:8,requiredXp:30,remainingXp:22,levelUp:false})})()`);
  assert.equal(await evaluate(`document.querySelectorAll('.xp-group').length`),5);
  assert.equal(await evaluate(`document.querySelectorAll('.xp-group:first-child .xp-unit').length`),6);
  assert.equal(await evaluate(`document.querySelectorAll('.xp-unit.filled').length`),8);
  await evaluate(`document.querySelector('.gudongi-progress').scrollIntoView({block:'center',behavior:'instant'})`);await shot('xp-8-of-30');
  for(const [totalXp,currentXp] of [[95,50],[105,60],[108,63]]){
    await evaluate(`(async()=>{const p=(await(await fetch('/api/account/gudongi')).json()).gudongi;const appearance=p.appearanceCatalog.find(a=>a.id==='suit');window.applyGudongi({...p,appearance,appearanceId:'suit',level:5,max:true,totalXp:${totalXp},currentXp:${currentXp},requiredXp:50,remainingXp:0,segments:5,levelUp:false});document.querySelector('#myGudongiTab').click();await document.querySelector('.gudongi-stage img').decode()})()`);
    assert.equal(await evaluate(`document.querySelector('.gudongi-level').textContent`),'LV MAX');
    assert.equal(await evaluate(`document.querySelector('.gudongi-progress>div>span').textContent`),`EXP (${currentXp}/50)`);
    assert.equal(await evaluate(`document.querySelectorAll('.xp-segments .filled').length`),50);
    assert.equal(await evaluate(`document.querySelector('.xp-segments').getAttribute('aria-valuenow')`),'50');
    assert.equal(await evaluate(`document.querySelector('.gudongi-stage img').getAttribute('src')`),'/characters/gudongi/suit.png');
    await shot(`gudongi-max-${currentXp}`);
  }
  await evaluate(`document.querySelector('.gudongi-stage img').src='/characters/gudongi/missing-test-image.png'`);await delay(200);
  assert.equal(await evaluate(`document.querySelector('.gudongi-stage .gudongi-placeholder small').textContent`),'이미지 준비 중');
  await evaluate(`document.querySelector('#myGudongiTab').dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}))`);
  assert.equal(await evaluate(`document.activeElement.id`),'myLibraryTab');
  await evaluate(`document.querySelector('#myLibraryTab').dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}))`);
  assert.equal(await evaluate(`document.activeElement.id`),'myGudongiTab');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,output,checks:['1440/820/390 no overflow','rail spacing','appearance 3/2/1 columns','avatar crop/zoom/save/reload','appearance persistence','library tab','no browser exceptions','MAX labels','30 XP units with 8 filled','missing image fallback','keyboard tabs']},null,2));
}finally{socket?.close();browser.kill();}
