/* Account UI: persisted values always come from the authenticated server. */
(() => {
  const q=selector=>document.querySelector(selector),all=selector=>[...document.querySelectorAll(selector)];
  let current=null,owner='',refreshVersion=0,activeTab='shelf',notificationPending=false,deletionNoticeId='',deletionNoticeLoading=false,crop=null,drag=null;
  const number=value=>Number(value||0).toFixed(2),eligible=()=>state.user!=='guest';
  const art=(appearance,small=false)=>appearance?.image?`<img src="/characters/gudongi/${appearance.image}" alt="${escapeHtml(appearance.name)}" style="--character-scale:${small?1:appearance.scale}" data-gudongi-art draggable="false">`:`<div class="gudongi-placeholder"><span aria-hidden="true">✦</span><b>${escapeHtml(appearance?.name||'구동이')}</b><small>이미지 준비 중</small></div>`;
  // Image errors do not bubble; capture them for dynamically rendered character cards.
  document.addEventListener('error',event=>{
    const image=event.target;
    if(!(image instanceof HTMLImageElement)||!image.hasAttribute('data-gudongi-art'))return;
    const fallback=document.createElement('div');fallback.className='gudongi-placeholder';
    const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent='✦';
    const name=document.createElement('b');name.textContent=image.alt;
    const hint=document.createElement('small');hint.textContent='이미지 준비 중';
    fallback.append(icon,name,hint);image.replaceWith(fallback);
  },true);
  const post=async(path,body={})=>{const response=await fetch(`/api/account/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'저장하지 못했습니다.'),{field:data.field,status:response.status});return data;};
  document.body.insertAdjacentHTML('beforeend',`
    <svg width="0" height="0" aria-hidden="true" style="position:absolute;pointer-events:none"><defs><filter id="gudongiSilhouette" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.58 0 0 0 0 0.60 0 0 0 0 0.65 -1 -1 -1 0 2.9"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs></svg>
    <dialog class="my-dialog" id="mySettingsDialog" aria-labelledby="mySettingsTitle">
      <div class="my-dialog-head"><div><span class="step">ACCOUNT SETTINGS</span><h2 id="mySettingsTitle">계정 설정</h2></div><button type="button" class="my-close" data-close-dialog="mySettingsDialog" aria-label="계정 설정 닫기">×</button></div>
      <section class="my-avatar-settings"><div class="my-avatar" id="settingsAvatar"></div><div class="my-avatar-copy"><h3 id="settingsUser"></h3><p>나를 보여주는 프로필 사진</p><button type="button" class="refresh" id="chooseAvatar">사진 변경</button><button type="button" class="my-text-button" id="removeAvatar">기본 이미지로</button><input type="file" id="avatarFile" accept="image/jpeg,image/png,image/webp" hidden></div><button type="button" class="settings-logout" id="settingsLogout">로그아웃</button></section>
      <p class="my-muted">JPG·PNG·WebP, 최대 10MB. 원본은 전송하지 않고 조정한 프로필 사진만 저장합니다.</p><p id="avatarError" class="my-error" role="alert"></p>
      <form id="passwordChangeForm" class="my-password-form"><h3>비밀번호 변경</h3>
        <label>현재 비밀번호<input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required maxlength="200" aria-describedby="currentPasswordError"><small class="my-error" id="currentPasswordError"></small></label>
        <label>새 비밀번호<input id="newPassword" name="newPassword" type="password" autocomplete="new-password" required minlength="6" maxlength="200" placeholder="6자 이상 입력" aria-describedby="newPasswordError"><small class="my-error" id="newPasswordError"></small></label>
        <label>새 비밀번호 확인<input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" required minlength="6" maxlength="200" aria-describedby="confirmPasswordError"><small class="my-error" id="confirmPasswordError"></small></label>
        <p id="passwordStatus" class="my-muted" role="status"></p><button type="submit" class="recommend-button">비밀번호 변경</button>
      </form>
      <div class="my-account-actions"><div><p>회원탈퇴 시 서재와 활동 기록이 함께 삭제됩니다.</p><button type="button" class="my-danger" id="settingsDelete">회원탈퇴</button></div></div>
    </dialog>
    <dialog class="my-dialog crop-dialog" id="avatarCropDialog" aria-labelledby="cropTitle">
      <div class="my-dialog-head"><div><span class="step">PROFILE PHOTO</span><h2 id="cropTitle">사진을 동그라미에 맞춰주세요</h2></div><button class="my-close" type="button" data-close-dialog="avatarCropDialog" aria-label="사진 조정 취소">×</button></div>
      <p class="my-muted" id="cropHelp">사진을 드래그하거나 아래 조절 막대로 움직여 보세요.<br>미리보기에 초점을 두고 방향키로도 조정할 수 있어요.</p>
      <div class="avatar-crop-stage"><canvas id="avatarCropCanvas" width="256" height="256" tabindex="0" role="img" aria-label="등록할 원형 프로필 사진 미리보기" aria-describedby="cropHelp"></canvas></div>
      <div class="crop-controls"><label>확대<input id="cropZoom" type="range" min="100" max="300" value="100"></label><label>좌우 위치<input id="cropX" type="range" min="-100" max="100" value="0"></label><label>상하 위치<input id="cropY" type="range" min="-100" max="100" value="0"></label></div>
      <p id="cropError" class="my-error" role="alert"></p><div class="my-dialog-actions"><button type="button" class="refresh" id="cropCenter">가운데 맞추기</button><button type="button" class="recommend-button" id="saveAvatar">이 사진으로 등록</button></div>
    </dialog>
    <dialog class="my-dialog appearance-dialog" id="appearanceDialog" aria-labelledby="appearanceTitle"><div class="my-dialog-head"><div><span class="step">MY COLLECTION</span><h2 id="appearanceTitle">오늘은 어떤 구동이?</h2><p class="my-muted">이전 레벨의 모습도 선택할 수 있어요. 회색 실루엣은 표시된 레벨에서 열려요.</p></div><button type="button" class="my-close" data-close-dialog="appearanceDialog" aria-label="모습 선택 닫기">×</button></div><div id="appearanceGrid" class="appearance-grid"></div><p id="appearanceError" class="my-error" role="alert"></p></dialog>
    <dialog class="my-dialog level-up-dialog" id="levelUpDialog" aria-labelledby="levelUpTitle"><span class="step">A LITTLE MORE GROWN</span><h2 id="levelUpTitle">구동이가 한 뼘 더 자랐어요!</h2><div id="levelUpArt" class="level-up-art"></div><p id="levelUpText"></p><button class="recommend-button" type="button" id="levelUpConfirm">함께 계속 읽어요</button></dialog>
    <dialog class="my-dialog xp-history-dialog" id="xpHistoryDialog" aria-labelledby="xpHistoryTitle"><div class="my-dialog-head"><div><span class="step">EXP HISTORY</span><h2 id="xpHistoryTitle">누적 경험치 이력</h2><p class="my-muted">이력을 누르면 관련 메뉴로 바로 이동합니다.</p></div><button type="button" class="my-close" data-close-dialog="xpHistoryDialog" aria-label="경험치 이력 닫기">×</button></div><div id="xpHistoryList" class="xp-history-list"></div></dialog>
    <dialog class="my-dialog deletion-notice-dialog" id="deletionNoticeDialog" aria-labelledby="deletionNoticeTitle"><span class="step">ADMIN NOTICE</span><h2 id="deletionNoticeTitle">챌린지 게시글 삭제 안내</h2><p id="deletionNoticeSummary" class="deletion-notice-summary"></p><div class="deletion-notice-reason"><span>관리자 삭제 사유</span><p id="deletionNoticeReason"></p></div><p id="deletionNoticeXp" class="my-muted"></p><button class="recommend-button" type="button" id="deletionNoticeConfirm">확인했습니다</button></dialog>
  `);
  const badge=document.createElement('button');badge.id='headerGudongi';badge.className='header-gudongi';badge.type='button';badge.hidden=true;badge.onclick=()=>{showView('library');selectTab('gudongi');};q('#profileButton').before(badge);
  const usage=document.createElement('div');usage.id='recommendationQuota';usage.className='recommendation-quota';usage.setAttribute('aria-live','polite');q('#recommendButton').after(usage);
  const preview=document.createElement('p');preview.id='challengeXpPreview';preview.className='challenge-xp-preview';q('#challengePostAchievement').parentElement.append(preview);
  window.updateChallengeXpPreview=()=>{const amount=Number(q('#challengePostAchievement').value);preview.textContent=Number.isFinite(amount)&&amount>=0?`구동이 성장 미리보기 · ${number(amount)} × 3 = +${number(amount*3)} EXP`:'달성량을 입력하면 받을 EXP를 미리 볼 수 있어요.';};
  q('#challengePostAchievement').addEventListener('input',window.updateChallengeXpPreview);window.updateChallengeXpPreview();
  window.renderRecommendationQuota=quota=>{
    if(!eligible()){usage.textContent='로그인하고 책을 나의 서재에 추가하면 구동이도 함께 자라요.';return;}
    if(!quota){usage.textContent='오늘의 서재 추가 현황을 확인하고 있어요…';return;}
    usage.innerHTML=`<span>서재 추가 <b>${quota.used} / 30권</b></span><span>EXP 적립 <b>${number(quota.xp)} / 5권</b></span><small>추천 이용은 무제한 · 서재 추가 현황은 한국 시간 자정 초기화</small>`;
  };
  function renderAvatar(element,avatar){element.replaceChildren();if(avatar){const image=new Image();image.src=avatar;image.alt='내 프로필 사진';element.append(image);}else element.textContent=(state.user||'?')[0].toUpperCase();}
  function render(){
    if(!current)return;
    const p=current;q('#headerGudongi').hidden=false;q('#headerGudongi').innerHTML=`<span class="header-gudongi-art">${art(p.appearance,true)}</span><span class="header-gudongi-label">구동이 <b>${p.max?'LV MAX':`LV ${p.level}`}</b></span>`;q('#headerGudongi').setAttribute('aria-label',`${p.appearance.name}, 레벨 ${p.level}. 나의 구동이 열기`);
    renderAvatar(q('#profileInitial'),p.avatar);renderAvatar(q('#settingsAvatar'),p.avatar);q('#profileHint').textContent='나의 정보';q('#settingsUser').textContent=state.user;q('#removeAvatar').hidden=!p.avatar;
    window.renderRecommendationQuota(p.quota);
    q('#gudongiContent').innerHTML=`<div class="gudongi-layout"><article class="gudongi-growth-card"><div class="gudongi-card-top"><span class="step">MY GUDONGI</span><span class="gudongi-level">${p.max?'LV MAX':`LV ${p.level}`}</span></div><div class="gudongi-stage">${art(p.appearance)}<span class="gudongi-orbit" aria-hidden="true"></span></div><div class="gudongi-intro"><p>매일의 한 페이지가 만드는 작은 성장</p><h2>${escapeHtml(p.appearance.name)}</h2><button type="button" class="refresh" id="changeAppearance">모습 바꾸기 <span aria-hidden="true">↗</span></button></div><div class="gudongi-progress"><div><b>${p.max?'최고 레벨에 도착했어요!':`다음 성장까지 ${number(p.remainingXp)} EXP`}</b><span>EXP (${Number(number(p.currentXp))}/${Number(number(p.requiredXp))})</span></div><div class="xp-segments" role="progressbar" aria-label="현재 레벨 경험치" aria-valuemin="0" aria-valuemax="${p.requiredXp}" aria-valuenow="${Math.min(p.currentXp,p.requiredXp)}" aria-valuetext="${Number(number(p.currentXp))}/${Number(number(p.requiredXp))} EXP">${Array.from({length:5},(_,group)=>`<span class="xp-group">${Array.from({length:p.requiredXp/5},(_,unit)=>{const fill=p.max?1:Math.max(0,Math.min(1,p.currentXp-(group*p.requiredXp/5+unit)));return `<i class="xp-unit${fill===1?' filled':''}" style="--xp-fill:${fill*100}%"></i>`;}).join('')}</span>`).join('')}</div><p>${p.max?'최고 레벨에서도 경험치와 독서 기록은 계속 쌓여요.':'조금씩, 꾸준히. 구동이와 나만의 속도로 읽어요.'}</p></div></article><aside class="gudongi-side"><div class="gudongi-stats"><button type="button" id="xpHistoryButton" aria-label="누적 경험치 이력 열기"><span>누적 경험치</span><strong>${number(p.totalXp)} <small>EXP</small></strong></button><div><span>함께한 모습</span><strong>${p.unlockedCount} <small>/ 9</small></strong></div></div><article class="gudongi-guide"><span class="step">GROW TOGETHER</span><h3>책과 기록으로 자라는 구동이</h3><div><i>01</i><section><h4>나의 서재에 책 담기 <b>+1 EXP</b></h4><p>매일 처음 담은 5권까지 권당 1 EXP<br>서재에서 책을 제거하면 받은 EXP도 회수돼요.<br>서재에는 하루 최대 30권을 추가할 수 있어요.</p></section></div><div><i>02</i><section><h4>챌린지에 발자국 남기기</h4><p>독서·필사 기록의 이번 달성량 × 3 EXP<br>챌린지 경험치는 일일 상한이 없어요.</p></section></div><button type="button" class="recommend-button" id="gudongiChallenge">챌린지 기록하러 가기 <span>→</span></button></article><div class="gudongi-next"><span class="step">NEXT CHAPTER</span><p>${p.max?'모든 모습이 열렸어요. 오늘의 기분에 맞는 구동이를 골라보세요.':`LV ${p.level+1}에서 새로운 모습이 기다리고 있어요.`}</p><small>달성량 수정·삭제 시 경험치와 해금 상태도 함께 반영됩니다.</small></div></aside></div>`;
    q('.gudongi-stats>div small').textContent=`/ ${p.totalAppearanceCount||9}`;if(p.isAdmin)q('.gudongi-card-top .step').textContent='ADMIN GUDONGI';
    const daily=document.createElement('section');daily.className='gudongi-daily';daily.setAttribute('aria-label','오늘의 서재 추가 현황');daily.setAttribute('aria-live','polite');
    daily.innerHTML=`<div class="daily-heading"><div><span class="step">TODAY'S LIBRARY</span><h3>오늘 나의 서재에 담은 책</h3></div><span>한국 시간 자정 초기화</span></div><div class="daily-overview"><div class="daily-xp"><span>EXP가 쌓인 책</span><strong>${p.quota.xp}<small> / 5권</small></strong><em>권당 +1 EXP</em></div><div class="daily-books"><span>오늘 추가한 책</span><strong>${p.quota.used}<small> / 30권</small></strong><em>${p.quota.remaining}권 더 추가 가능</em></div></div><div class="daily-stamps" aria-label="서재 추가 경험치 5권 중 ${p.quota.xp}권 적립">${Array.from({length:5},(_,i)=>`<span class="${i<p.quota.xp?'is-earned':''}">${i<p.quota.xp?'✓':'+1'}<small>EXP</small></span>`).join('')}</div><div class="daily-book-track" role="progressbar" aria-label="오늘 나의 서재에 추가한 책" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${p.quota.used}"><span style="width:${Math.min(100,p.quota.used/30*100)}%"></span></div><p>${p.quota.remaining===0?'오늘의 서재 추가 한도에 도달했어요. 추천은 계속 이용할 수 있고, 자정부터 다시 담을 수 있어요.':p.quota.remainingXp>0?`책을 서재에 담으면 +1 EXP · 오늘 ${p.quota.remainingXp}권 더 EXP를 받을 수 있어요.`:'오늘 받을 수 있는 서재 추가 EXP를 모두 모았어요. 책은 계속 담을 수 있어요.'}<br>추천 도서를 둘러보는 횟수에는 제한이 없어요.</p>`;
    q('.gudongi-stats').after(daily);
    q('#changeAppearance').onclick=openAppearance;q('#gudongiChallenge').onclick=()=>showView('challenges');q('#xpHistoryButton').onclick=openXpHistory;
  }
  async function maybeNotify(){
    if(!current?.levelUp||notificationPending||document.querySelector('dialog[open]'))return;
    notificationPending=true;const shown=current.level,user=state.user;
    try{await post('seen',{level:shown});if(state.user!==user)return;current.lastSeenLevel=shown;current.levelUp=false;q('#levelUpArt').innerHTML=art(current.appearance,true);q('#levelUpText').textContent=`LV ${shown} · 새로운 모습이 열렸어요. 나의 구동이에서 만나보세요.`;q('#levelUpDialog').showModal();}catch{}finally{notificationPending=false;}
  }
  window.applyGudongi=p=>{if(!p||!eligible()||p.userId!==state.user)return;refreshVersion++;current=p;owner=state.user;render();if(q('#appearanceDialog').open)renderAppearanceChoices();maybeNotify();};
  window.refreshMyInfo=async()=>{
    const version=++refreshVersion,user=state.user;
    if(owner!==user){current=null;owner=user;q('#headerGudongi').hidden=true;q('#profileInitial').replaceChildren(document.createTextNode((user==='guest'?'방문자':user)[0].toUpperCase()));q('#gudongiContent').innerHTML='<p class="gudongi-loading">구동이를 만나러 가는 중이에요…</p>';}
    q('#mySettingsButton').hidden=!eligible()||state.isAdmin;window.renderRecommendationQuota(current?.quota);
    if(!eligible()){q('#gudongiContent').innerHTML='<div class="gudongi-loading">일반 사용자 계정으로 로그인하면 나만의 구동이를 키울 수 있어요.</div>';return;}
    try{const response=await fetch('/api/account/gudongi');if(!response.ok)throw new Error('구동이 정보를 불러오지 못했어요.');const data=await response.json();if(version===refreshVersion&&user===state.user){window.applyGudongi(data.gudongi);await checkDeletionNotices();}}catch(error){if(version!==refreshVersion)return;q('#gudongiContent').innerHTML='<div class="gudongi-loading">구동이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.<br><button type="button" class="refresh" id="retryGudongi">다시 불러오기</button></div>';q('#retryGudongi').onclick=window.refreshMyInfo;}
  };
  function selectTab(tab){activeTab=tab;all('[data-info-tab]').forEach(button=>{const selected=button.dataset.infoTab===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});q('#myLibraryPanel').hidden=tab!=='shelf';q('#myGudongiPanel').hidden=tab!=='gudongi';if(tab==='gudongi'&&!current)window.refreshMyInfo();}
  all('[data-info-tab]').forEach(button=>{button.onclick=()=>selectTab(button.dataset.infoTab);button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();selectTab(event.key==='Home'?'shelf':event.key==='End'?'gudongi':activeTab==='shelf'?'gudongi':'shelf');q('[data-info-tab][aria-selected="true"]').focus();};});
  const historyDate=createdAt=>`${new Date(Number(createdAt)*1000+9*3600000).toISOString().slice(0,10).replaceAll('-','.')}.`;
  async function openXpHistory(){
    const list=q('#xpHistoryList');list.innerHTML='<p class="xp-history-empty">경험치 이력을 불러오고 있어요…</p>';q('#xpHistoryDialog').showModal();
    try{const response=await fetch('/api/account/xp-history'),data=await response.json();if(!response.ok)throw new Error(data.error||'경험치 이력을 불러오지 못했어요.');list.innerHTML=data.history.length?data.history.map(item=>`<button type="button" class="${item.deleted?'deleted':''}" data-history-type="${escapeHtml(item.type)}" data-history-id="${escapeHtml(item.targetId||'')}"><time>${escapeHtml(historyDate(item.createdAt))}</time><span>${item.type==='challenge'?'챌린지 참여':'책 추천'}</span><b>${item.deleted?`<s>${escapeHtml(item.title)}</s> (삭제)`:escapeHtml(item.title)}</b><em>${escapeHtml(item.context)}</em><small>+${item.deleted?'0.00':number(item.xp)} EXP</small></button>`).join(''):'<p class="xp-history-empty">아직 쌓인 경험치 이력이 없습니다.</p>';}catch(error){list.innerHTML=`<p class="xp-history-empty">${escapeHtml(error.message)}</p>`;}
  }
  q('#xpHistoryList').onclick=async event=>{const item=event.target.closest('[data-history-type]');if(!item||item.classList.contains('deleted'))return;q('#xpHistoryDialog').close();if(item.dataset.historyType==='challenge'&&item.dataset.historyId){await showView('challenges');await openChallengeDetail(item.dataset.historyId);}else{await showView('library');selectTab('shelf');}};
  async function checkDeletionNotices(){
    if(!eligible()||deletionNoticeLoading||q('#deletionNoticeDialog').open||document.querySelector('dialog[open]'))return;
    deletionNoticeLoading=true;try{const response=await fetch('/api/account/challenge-deletion-notices'),data=await response.json();if(!response.ok||!data.notices?.length)return;const notice=data.notices[0];deletionNoticeId=notice.id;q('#deletionNoticeSummary').textContent=`‘${notice.postTitle}’ 게시글이 ${notice.boardName}에서 삭제되었습니다.`;q('#deletionNoticeReason').textContent=notice.reason;q('#deletionNoticeXp').textContent=notice.removedXp>0?`${number(notice.removedXp)} EXP가 회수되었습니다.${notice.previousLevel>notice.currentLevel?` 구동이가 LV ${notice.previousLevel}에서 LV ${notice.currentLevel}로 조정되었습니다.`:''}`:'회수된 EXP는 없습니다.';q('#deletionNoticeDialog').showModal();}catch{}finally{deletionNoticeLoading=false;}
  }
  all('[data-close-dialog]').forEach(button=>button.onclick=()=>q(`#${button.dataset.closeDialog}`).close());
  all('.my-dialog').forEach(dialog=>dialog.addEventListener('close',()=>setTimeout(()=>{maybeNotify();checkDeletionNotices();},0)));
  q('#levelUpConfirm').onclick=()=>q('#levelUpDialog').close();
  q('#deletionNoticeConfirm').onclick=async()=>{const id=deletionNoticeId;if(!id)return;q('#deletionNoticeConfirm').disabled=true;try{await post('challenge-deletion-notices/read',{notificationId:id});deletionNoticeId='';q('#deletionNoticeDialog').close();}finally{q('#deletionNoticeConfirm').disabled=false;}};
  function openSettings(){if(!eligible())return;render();q('#passwordChangeForm').reset();all('.my-password-form .my-error').forEach(el=>el.textContent='');q('#passwordStatus').textContent='';q('#avatarError').textContent='';q('#mySettingsDialog').showModal();}
  q('#mySettingsButton').onclick=openSettings;
  q('#profileButton').onclick=()=>state.isAdmin?openProfileDialog():state.user==='guest'?openAccountDialog():openSettings();
  q('#headerLibrary').onclick=()=>{showView('library');selectTab('shelf');};
  q('#mySettingsDialog').addEventListener('close',()=>q('#passwordChangeForm').reset());
  q('#settingsLogout').onclick=()=>{q('#mySettingsDialog').close();logoutCurrentUser();};
  q('#settingsDelete').onclick=()=>{q('#mySettingsDialog').close();openAccountDeleteDialog();};
  q('#passwordChangeForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]');all('.my-password-form .my-error').forEach(el=>el.textContent='');q('#passwordStatus').textContent='';const body=Object.fromEntries(new FormData(form));if(body.newPassword!==body.confirmPassword){q('#confirmPasswordError').textContent='새 비밀번호 확인이 일치하지 않습니다.';q('#confirmPassword').focus();return;}button.disabled=true;try{await post('password',body);form.reset();q('#passwordStatus').textContent='비밀번호를 안전하게 변경했습니다.';}catch(error){const field=['currentPassword','newPassword','confirmPassword'].includes(error.field)?error.field:'currentPassword';q(`#${field}Error`).textContent=error.message;q(`#${field}`).focus();}finally{button.disabled=false;}};
  function renderAppearanceChoices(){
    if(!current)return;
    q('#appearanceError').textContent='';
    q('#appearanceGrid').innerHTML=(current.appearanceCatalog||current.appearances).map(a=>{
      const locked=a.level>current.level,selected=a.id===current.appearanceId;
      return `<button type="button" class="appearance-choice${locked?' is-locked':''}${a.adminOnly?' is-admin':''}" data-appearance="${a.id}" data-locked="${locked}" aria-pressed="${selected}" ${locked?'disabled':''}><div>${art(a,true)}</div><small>${a.adminOnly?'관리자 전용':`LV ${a.level} · ${a.kind==='bonus'?'보너스 모습':'기본 모습'}`}</small><b>${escapeHtml(a.name)}</b><span>${locked?`🔒 LV ${a.level}에서 해금`:selected?'현재 모습':'이 모습으로 선택'}</span></button>`;
    }).join('');
  }
  async function openAppearance(){
    await window.refreshMyInfo();renderAppearanceChoices();
    if(!q('#appearanceDialog').open)q('#appearanceDialog').showModal();q('[data-appearance][aria-pressed="true"]')?.focus();
  }
  q('#appearanceGrid').onclick=async event=>{const choice=event.target.closest('[data-appearance]');if(!choice||choice.disabled||choice.dataset.locked==='true')return;all('.appearance-choice').forEach(b=>b.disabled=true);try{const data=await post('appearance',{appearanceId:choice.dataset.appearance});window.applyGudongi(data.gudongi);q('#appearanceDialog').close();q('#changeAppearance').focus();toast('구동이의 모습을 바꿨어요.');}catch(error){q('#appearanceError').textContent=error.message;}finally{all('.appearance-choice').forEach(b=>b.disabled=b.dataset.locked==='true');}};
  q('#appearanceGrid').onkeydown=event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;const choices=all('.appearance-choice:not([data-locked="true"])'),index=choices.indexOf(document.activeElement);if(index<0)return;event.preventDefault();const cols=getComputedStyle(q('#appearanceGrid')).gridTemplateColumns.split(' ').length,delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-cols,ArrowDown:cols}[event.key];choices[event.key==='Home'?0:event.key==='End'?choices.length-1:Math.max(0,Math.min(choices.length-1,index+delta))].focus();};
  q('#chooseAvatar').onclick=()=>q('#avatarFile').click();
  q('#removeAvatar').onclick=async()=>{const button=q('#removeAvatar');button.disabled=true;try{window.applyGudongi((await post('avatar',{avatar:''})).gudongi);toast('기본 프로필 이미지로 변경했습니다.');}catch(error){q('#avatarError').textContent=error.message;}finally{button.disabled=false;}};
  q('#avatarFile').onchange=async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;q('#avatarError').textContent='';
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){q('#avatarError').textContent='10MB 이하의 JPG·PNG·WebP 사진을 선택해 주세요.';return;}
    const url=URL.createObjectURL(file),image=new Image();try{image.src=url;await image.decode();if(image.naturalWidth*image.naturalHeight>32000000)throw new Error('사진 해상도가 너무 큽니다. 3,200만 화소 이하로 줄여 주세요.');crop={image,url,x:0,y:0,zoom:1};resetCrop();q('#cropError').textContent='';q('#avatarCropDialog').showModal();}catch(error){URL.revokeObjectURL(url);q('#avatarError').textContent=error.message||'사진을 읽지 못했습니다.';}
  };
  const canvas=q('#avatarCropCanvas'),context=canvas.getContext('2d');
  function cropGeometry(){const scale=Math.max(256/crop.image.naturalWidth,256/crop.image.naturalHeight)*crop.zoom,w=crop.image.naturalWidth*scale,h=crop.image.naturalHeight*scale;return {w,h,maxX:(w-256)/2,maxY:(h-256)/2};}
  function drawCrop(){if(!crop)return;const {w,h,maxX,maxY}=cropGeometry();context.fillStyle='#fff';context.fillRect(0,0,256,256);context.drawImage(crop.image,(256-w)/2+crop.x/100*maxX,(256-h)/2+crop.y/100*maxY,w,h);q('#cropZoom').value=crop.zoom*100;q('#cropX').value=crop.x;q('#cropY').value=crop.y;}
  function resetCrop(){if(!crop)return;crop.x=0;crop.y=0;crop.zoom=1;drawCrop();}
  q('#cropCenter').onclick=resetCrop;
  ['Zoom','X','Y'].forEach(name=>q(`#crop${name}`).oninput=event=>{if(!crop)return;crop[name.toLowerCase()]=Number(event.target.value)/(name==='Zoom'?100:1);drawCrop();});
  canvas.onpointerdown=event=>{if(!crop)return;drag={x:event.clientX,y:event.clientY,cx:crop.x,cy:crop.y};canvas.setPointerCapture(event.pointerId);};
  canvas.onpointermove=event=>{if(!drag||!crop)return;const {maxX,maxY}=cropGeometry(),ratio=256/canvas.getBoundingClientRect().width;crop.x=maxX?Math.max(-100,Math.min(100,drag.cx+(event.clientX-drag.x)*ratio/maxX*100)):0;crop.y=maxY?Math.max(-100,Math.min(100,drag.cy+(event.clientY-drag.y)*ratio/maxY*100)):0;drawCrop();};
  canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
  canvas.onkeydown=event=>{if(!crop||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const step=event.shiftKey?10:2;if(event.key==='ArrowLeft')crop.x-=step;if(event.key==='ArrowRight')crop.x+=step;if(event.key==='ArrowUp')crop.y-=step;if(event.key==='ArrowDown')crop.y+=step;crop.x=Math.max(-100,Math.min(100,crop.x));crop.y=Math.max(-100,Math.min(100,crop.y));drawCrop();};
  q('#avatarCropDialog').addEventListener('close',()=>{if(crop)URL.revokeObjectURL(crop.url);crop=null;drag=null;});
  q('#saveAvatar').onclick=async()=>{if(!crop)return;const button=q('#saveAvatar');button.disabled=true;q('#cropError').textContent='';try{const avatar=canvas.toDataURL('image/jpeg',.88),data=await post('avatar',{avatar});window.applyGudongi(data.gudongi);q('#avatarCropDialog').close();q('#chooseAvatar').focus();toast('프로필 사진을 변경했습니다.');}catch(error){q('#cropError').textContent=error.message;}finally{button.disabled=false;}};
  window.refreshMyInfo();
  window.addEventListener('focus',()=>window.refreshMyInfo());
  setInterval(()=>{if(eligible()&&state.view==='library'&&document.visibilityState==='visible')window.refreshMyInfo();},30000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')window.refreshMyInfo();});
})();
