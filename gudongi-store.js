// Additive feature tables only. Never reset, rename or replace the existing store.
export const APPEARANCES = [
  {id:'baby',name:'아기 구동이',kind:'basic',level:1,image:'baby.png',scale:.4},
  {id:'student',name:'학생 구동이',kind:'basic',level:2,image:'student.png',scale:.8},
  {id:'default',kind:'basic',name:'구동이',level:3,image:'default.png',scale:1},
  {id:'reading',kind:'bonus',name:'책 읽는 구동이',level:3,image:'reading.png',scale:1},
  {id:'casual',kind:'basic',name:'일상 구동이',level:4,image:null,scale:1},
  {id:'jumping',kind:'bonus',name:'방방 뛰는 구동이',level:4,image:'jumping.png',scale:1},
  {id:'suit',kind:'basic',name:'정장 구동이',level:5,image:'suit.png',scale:1},
  {id:'safety-helmet',kind:'bonus',name:'안전모 구동이',level:5,image:'safety-helmet.png',scale:1},
  {id:'hearts',kind:'bonus',name:'하트뿅뿅 구동이',level:5,image:'hearts.png',scale:1},
];
const thresholds=[0,5,15,45,95], defaults=['baby','student','default','casual','suit'];
const row=(sql,query,...args)=>[...sql.exec(query,...args)][0];
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export const seoulDay=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,10);
export function growth(totalXp=0){
  totalXp=Math.max(0,Number(totalXp)||0);
  const level=thresholds.filter(value=>totalXp>=value).length,max=level===5,currentXp=totalXp-thresholds[max?3:level-1],requiredXp=max?50:thresholds[level]-thresholds[level-1];
  return {totalXp,level,currentXp,requiredXp,remainingXp:max?0:requiredXp-currentXp,segments:max?5:currentXp<=0?0:Math.min(4,Math.max(1,Math.floor(currentXp/requiredXp*5))),max};
}
export function createGudongiSchema(sql){
  sql.exec(`
    CREATE TABLE IF NOT EXISTS gudongi_profiles(user_id TEXT PRIMARY KEY,appearance_id TEXT NOT NULL DEFAULT 'baby',last_level INTEGER NOT NULL DEFAULT 1,last_seen_level INTEGER NOT NULL DEFAULT 1,avatar_data TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS gudongi_xp(source_type TEXT NOT NULL,source_id TEXT NOT NULL,user_id TEXT NOT NULL,xp_amount REAL NOT NULL,earned_date TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(source_type,source_id));
    CREATE INDEX IF NOT EXISTS gudongi_xp_user ON gudongi_xp(user_id,earned_date,source_type);
    CREATE TABLE IF NOT EXISTS gudongi_deliveries(user_id TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,earned_date TEXT NOT NULL,book_count INTEGER NOT NULL,result_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(user_id,request_id));
    CREATE INDEX IF NOT EXISTS gudongi_deliveries_day ON gudongi_deliveries(user_id,earned_date);
    CREATE TABLE IF NOT EXISTS gudongi_migrations(version TEXT PRIMARY KEY,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS gudongi_audit(audit_id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,source_id TEXT NOT NULL,action TEXT NOT NULL,before_value TEXT NOT NULL,after_value TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TRIGGER IF NOT EXISTS gudongi_challenge_insert AFTER INSERT ON challenge_posts BEGIN
      INSERT INTO gudongi_xp VALUES('challenge',NEW.post_id,NEW.author_id,NEW.achievement*3,date(NEW.created_at,'unixepoch','+9 hours'),NEW.created_at);
    END;
    CREATE TRIGGER IF NOT EXISTS gudongi_challenge_update AFTER UPDATE OF achievement ON challenge_posts BEGIN
      INSERT INTO gudongi_audit(user_id,source_id,action,before_value,after_value,created_at) VALUES(NEW.author_id,NEW.post_id,'challenge_xp_update',CAST(OLD.achievement*3 AS TEXT),CAST(NEW.achievement*3 AS TEXT),unixepoch());
      UPDATE gudongi_xp SET xp_amount=NEW.achievement*3 WHERE source_type='challenge' AND source_id=NEW.post_id;
    END;
    CREATE TRIGGER IF NOT EXISTS gudongi_challenge_delete AFTER DELETE ON challenge_posts BEGIN
      INSERT INTO gudongi_audit(user_id,source_id,action,before_value,after_value,created_at) VALUES(OLD.author_id,OLD.post_id,'challenge_xp_remove',CAST(OLD.achievement*3 AS TEXT),'0',unixepoch());
      DELETE FROM gudongi_xp WHERE source_type='challenge' AND source_id=OLD.post_id;
    END;
    CREATE TRIGGER IF NOT EXISTS gudongi_account_delete AFTER DELETE ON accounts BEGIN
      DELETE FROM gudongi_profiles WHERE user_id=OLD.user_id;
      DELETE FROM gudongi_xp WHERE user_id=OLD.user_id;
      DELETE FROM gudongi_deliveries WHERE user_id=OLD.user_id;
      DELETE FROM gudongi_audit WHERE user_id=OLD.user_id;
    END;
  `);
  // One-time, idempotent backfill. Historical books do NOT consume the new quota.
  if(!row(sql,"SELECT version FROM gudongi_migrations WHERE version='v1'")){
    sql.exec("INSERT OR IGNORE INTO gudongi_xp SELECT 'challenge',post_id,author_id,achievement*3,date(created_at,'unixepoch','+9 hours'),created_at FROM challenge_posts");
    sql.exec(`INSERT OR IGNORE INTO gudongi_xp SELECT 'recommendation','legacy:'||session_id,user_id,1,day,created_at FROM (SELECT *,date(created_at,'unixepoch','+9 hours') AS day,ROW_NUMBER() OVER(PARTITION BY user_id,date(created_at,'unixepoch','+9 hours') ORDER BY created_at,session_id) AS ordinal FROM recommendation_sessions WHERE book_count>0) WHERE ordinal<=4`);
    sql.exec("INSERT INTO gudongi_migrations VALUES('v1',unixepoch())");
  }
}
export function quota(sql,userId,now=Date.now()){
  const day=seoulDay(now),used=Number(row(sql,'SELECT COALESCE(SUM(book_count),0) AS n FROM gudongi_deliveries WHERE user_id=? AND earned_date=?',userId,day).n),xp=Number(row(sql,"SELECT COALESCE(SUM(xp_amount),0) AS n FROM gudongi_xp WHERE user_id=? AND earned_date=? AND source_type='recommendation'",userId,day).n);
  return {day,used,limit:30,remaining:Math.max(0,30-used),xp,remainingXp:Math.max(0,4-xp),resetAt:new Date(Date.parse(`${day}T00:00:00+09:00`)+86400000).toISOString()};
}
export function gudongiProfile(sql,userId){
  sql.exec('INSERT OR IGNORE INTO gudongi_profiles(user_id) VALUES(?)',userId);
  const saved=row(sql,'SELECT * FROM gudongi_profiles WHERE user_id=?',userId),g=growth(row(sql,'SELECT COALESCE(SUM(xp_amount),0) AS total FROM gudongi_xp WHERE user_id=?',userId).total),selected=APPEARANCES.find(item=>item.id===saved.appearance_id);
  let appearanceId=saved.appearance_id;
  if(g.level>saved.last_level||!selected||selected.level>g.level)appearanceId=defaults[g.level-1];
  if(appearanceId!==saved.appearance_id){sql.exec('INSERT INTO gudongi_audit(user_id,source_id,action,before_value,after_value,created_at) VALUES(?,?,?,?,?,unixepoch())',userId,'profile','appearance_auto',saved.appearance_id,appearanceId);}
  sql.exec('UPDATE gudongi_profiles SET appearance_id=?,last_level=? WHERE user_id=?',appearanceId,g.level,userId);
  return {...g,userId,appearanceId,appearance:APPEARANCES.find(item=>item.id===appearanceId),appearances:APPEARANCES.filter(item=>item.level<=g.level),appearanceCatalog:APPEARANCES.map(item=>({...item,unlocked:item.level<=g.level})),unlockedCount:APPEARANCES.filter(item=>item.level<=g.level).length,avatar:saved.avatar_data,lastSeenLevel:saved.last_seen_level,levelUp:g.level>saved.last_seen_level,quota:quota(sql,userId)};
}
export function recommendationLookup(sql,userId,requestId,fingerprint){
  const saved=row(sql,'SELECT * FROM gudongi_deliveries WHERE user_id=? AND request_id=?',userId,requestId);
  if(saved){if(saved.fingerprint!==fingerprint)return json({error:'같은 요청 번호로 조건을 변경할 수 없습니다.'},409);return json({...JSON.parse(saved.result_json),replayed:true,gudongi:gudongiProfile(sql,userId),quota:quota(sql,userId)});}
  const q=quota(sql,userId);return q.remaining?null:json({error:'오늘의 추천 30권을 모두 이용했어요. 한국 시간 자정에 다시 만나요.',quota:q,code:'DAILY_LIMIT'},429);
}
export function deliverRecommendation(sql,body){
  const {userId,requestId,fingerprint}=body,cached=recommendationLookup(sql,userId,requestId,fingerprint);if(cached)return cached;
  const before=gudongiProfile(sql,userId),q=before.quota,seen=new Set(),books=(body.result.books||[]).filter(book=>{const key=book.isbn||book.doi||book.title;if(!key||!book.title||seen.has(key))return false;seen.add(key);return true;}).slice(0,q.remaining),earnedXp=books.length&&q.remainingXp>0?1:0;
  if(!books.length)return json({...body.result,books:[],earnedXp:0,gudongi:before,quota:q});
  const now=Math.floor(Date.now()/1000),sessionId=crypto.randomUUID();
  sql.exec('INSERT INTO recommendation_sessions(user_id,book_count,profile_json,created_at) VALUES(?,?,?,?)',userId,books.length,JSON.stringify(body.profile),now);
  sql.exec('UPDATE accounts SET recommendation_requests=recommendation_requests+1,recommended_book_count=recommended_book_count+?,last_recommended_at=? WHERE user_id=?',books.length,now,userId);
  if(earnedXp)sql.exec("INSERT INTO gudongi_xp VALUES('recommendation',?,?,1,?,?)",sessionId,userId,q.day,now);
  const result={...body.result,books,sessionId,earnedXp,levelUp:growth(before.totalXp+earnedXp).level>before.level};
  sql.exec('INSERT INTO gudongi_deliveries VALUES(?,?,?,?,?,?,?)',userId,requestId,fingerprint,q.day,books.length,JSON.stringify(result),now);
  return json({...result,gudongi:gudongiProfile(sql,userId),quota:quota(sql,userId)});
}
export async function handleGudongiRequest(sql,request,transaction=fn=>fn()){
  const url=new URL(request.url);if(!url.pathname.startsWith('/gudongi/'))return null;
  const body=request.method==='POST'?await request.json():Object.fromEntries(url.searchParams),userId=String(body.userId||'');
  if(!row(sql,'SELECT user_id FROM accounts WHERE user_id=?',userId))return json({error:'로그인이 필요합니다.'},401);
  return transaction(()=>{
    if(url.pathname==='/gudongi/profile')return json({gudongi:gudongiProfile(sql,userId)});
    if(url.pathname==='/gudongi/recommendation/check')return recommendationLookup(sql,userId,body.requestId,body.fingerprint)||json({available:true});
    if(url.pathname==='/gudongi/recommendation/deliver')return deliverRecommendation(sql,body);
    if(url.pathname==='/gudongi/appearance'){
      const p=gudongiProfile(sql,userId),choice=p.appearances.find(item=>item.id===body.appearanceId);if(!choice)return json({error:'아직 해금되지 않은 모습입니다.'},403);
      sql.exec('UPDATE gudongi_profiles SET appearance_id=? WHERE user_id=?',choice.id,userId);return json({gudongi:gudongiProfile(sql,userId)});
    }
    if(url.pathname==='/gudongi/seen'){
      const p=gudongiProfile(sql,userId),seen=Math.min(p.level,Math.max(1,Number(body.level)||1));
      sql.exec('UPDATE gudongi_profiles SET last_seen_level=MAX(last_seen_level,?) WHERE user_id=?',seen,userId);return json({ok:true});
    }
    if(url.pathname==='/gudongi/avatar'){
      gudongiProfile(sql,userId);sql.exec('UPDATE gudongi_profiles SET avatar_data=? WHERE user_id=?',String(body.avatar||''),userId);return json({gudongi:gudongiProfile(sql,userId)});
    }
    return json({error:'Not found'},404);
  });
}
