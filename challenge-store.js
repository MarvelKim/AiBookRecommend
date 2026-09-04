const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const text=(value,max=2000)=>String(value??'').trim().slice(0,max);
const id=(value='')=>String(value).trim().slice(0,80);
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_TITLE_PROMPT='책 제목(글쓴이) 등 3권 - 한줄평 ‘내 인생의 큰 울림’';
const DEFAULT_BODY_PROMPT='읽은 책, 필사한 내용과 느낀 점을 기록하세요.';

function seoulDate(epochMs=Date.now()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(epochMs)).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function boardStatus(row){
  if(row.status==='archived')return 'archived';
  const today=seoulDate();
  if(today<row.start_date)return 'scheduled';
  if(today>row.end_date)return 'ended';
  return 'active';
}

function boardDto(row){
  if(!row)return null;
  return {id:row.board_id,name:row.name,type:row.board_type,description:row.description,titlePrompt:row.title_prompt||DEFAULT_TITLE_PROMPT,bodyPrompt:row.body_prompt||DEFAULT_BODY_PROMPT,startDate:row.start_date,endDate:row.end_date,target:Number(row.target_amount),unit:row.target_unit,status:boardStatus(row),createdAt:Number(row.created_at),updatedAt:Number(row.updated_at)};
}

function postDto(row){
  return {id:row.post_id,boardId:row.board_id,authorId:row.author_id,title:row.title,body:row.body,achievement:Number(row.achievement),createdAt:Number(row.created_at),updatedAt:Number(row.updated_at),attachmentCount:Number(row.attachment_count||0),commentCount:Number(row.comment_count||0)};
}

function monthRange(startDate,endDate){
  const [startYear,startMonth]=startDate.split('-').map(Number),[endYear,endMonth]=endDate.split('-').map(Number),months=[];
  let year=startYear,month=startMonth;
  while(year<endYear||(year===endYear&&month<=endMonth)){
    months.push(`${year}-${String(month).padStart(2,'0')}`);
    month+=1;if(month===13){year+=1;month=1;}
    if(months.length>=120)break;
  }
  return months;
}

function numberInRange(value,min,max){const parsed=Number(value);return Number.isFinite(parsed)&&parsed>=min&&parsed<=max?parsed:null;}

function boardInput(body){
  const name=text(body.name,100),type=text(body.type,40),description=text(body.description,2000),titlePrompt=text(body.titlePrompt,200)||DEFAULT_TITLE_PROMPT,bodyPrompt=text(body.bodyPrompt,500)||DEFAULT_BODY_PROMPT,startDate=text(body.startDate,10),endDate=text(body.endDate,10),target=numberInRange(body.target,0,1000000000),unit=text(body.unit,10);
  if(name.length<2)return {error:'게시판 이름은 2자 이상 입력해 주세요.'};
  if(!type)return {error:'챌린지 유형을 입력해 주세요.'};
  if(!datePattern.test(startDate)||!datePattern.test(endDate)||endDate<startDate)return {error:'챌린지 시작일과 종료일을 확인해 주세요.'};
  if(target===null)return {error:'목표량은 0 이상의 숫자로 입력해 주세요.'};
  if(!unit)return {error:'목표 단위를 입력해 주세요.'};
  const days=(Date.parse(`${endDate}T00:00:00Z`)-Date.parse(`${startDate}T00:00:00Z`))/86400000;
  if(days>3650)return {error:'챌린지 기간은 10년 이내로 설정해 주세요.'};
  return {name,type,description,titlePrompt,bodyPrompt,startDate,endDate,target,unit};
}

function getBoard(sql,boardId){return [...sql.exec('SELECT * FROM challenge_boards WHERE board_id=? LIMIT 1',boardId)][0]||null;}
function getPost(sql,postId){return [...sql.exec(`SELECT p.*,(SELECT COUNT(*) FROM challenge_attachments a WHERE a.post_id=p.post_id) AS attachment_count,(SELECT COUNT(*) FROM challenge_comments c WHERE c.post_id=p.post_id) AS comment_count FROM challenge_posts p WHERE p.post_id=? LIMIT 1`,postId)][0]||null;}

function allowAction(sql,actor,action,limit){
  const now=Math.floor(Date.now()/1000),row=[...sql.exec('SELECT window_started_at,action_count FROM challenge_rate_limits WHERE actor_id=? AND action_name=? LIMIT 1',actor,action)][0];
  if(!row||now-Number(row.window_started_at)>=60){sql.exec('INSERT INTO challenge_rate_limits(actor_id,action_name,window_started_at,action_count) VALUES(?,?,?,1) ON CONFLICT(actor_id,action_name) DO UPDATE SET window_started_at=excluded.window_started_at,action_count=1',actor,action,now);return true;}
  if(Number(row.action_count)>=limit)return false;
  sql.exec('UPDATE challenge_rate_limits SET action_count=action_count+1 WHERE actor_id=? AND action_name=?',actor,action);return true;
}

function deletePostData(sql,postId){
  const keys=[...sql.exec('SELECT storage_key FROM challenge_attachments WHERE post_id=?',postId)].map(row=>row.storage_key);
  sql.exec('DELETE FROM challenge_comments WHERE post_id=?',postId);
  sql.exec('DELETE FROM challenge_attachments WHERE post_id=?',postId);
  sql.exec('DELETE FROM challenge_posts WHERE post_id=?',postId);
  return keys;
}

export function createChallengeSchema(sql){
  sql.exec(`
    CREATE TABLE IF NOT EXISTS challenge_boards (
      board_id TEXT PRIMARY KEY,name TEXT NOT NULL,board_type TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',
      title_prompt TEXT NOT NULL DEFAULT '',body_prompt TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL,end_date TEXT NOT NULL,target_amount REAL NOT NULL,target_unit TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS challenge_boards_period_idx ON challenge_boards(status,start_date,end_date);
    CREATE TABLE IF NOT EXISTS challenge_posts (
      post_id TEXT PRIMARY KEY,board_id TEXT NOT NULL,author_id TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,
      achievement REAL NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS challenge_posts_board_idx ON challenge_posts(board_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS challenge_posts_author_idx ON challenge_posts(author_id,board_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS challenge_comments (
      comment_id TEXT PRIMARY KEY,post_id TEXT NOT NULL,author_id TEXT NOT NULL,comment_body TEXT NOT NULL,created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS challenge_comments_post_idx ON challenge_comments(post_id,created_at);
    CREATE TABLE IF NOT EXISTS challenge_attachments (
      attachment_id TEXT PRIMARY KEY,post_id TEXT NOT NULL,storage_key TEXT NOT NULL UNIQUE,original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,file_size INTEGER NOT NULL,created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS challenge_attachments_post_idx ON challenge_attachments(post_id,created_at);
    CREATE TABLE IF NOT EXISTS challenge_audit_logs (
      audit_id INTEGER PRIMARY KEY AUTOINCREMENT,admin_id TEXT NOT NULL,target_type TEXT NOT NULL,target_id TEXT NOT NULL,
      action_name TEXT NOT NULL,before_json TEXT NOT NULL DEFAULT '',after_json TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS challenge_audit_created_idx ON challenge_audit_logs(created_at DESC);
    CREATE TABLE IF NOT EXISTS challenge_rate_limits (
      actor_id TEXT NOT NULL,action_name TEXT NOT NULL,window_started_at INTEGER NOT NULL,action_count INTEGER NOT NULL,
      PRIMARY KEY(actor_id,action_name)
    );
  `);
  const boardColumns=[...sql.exec('PRAGMA table_info(challenge_boards)')];
  if(!boardColumns.some(column=>column.name==='title_prompt'))sql.exec("ALTER TABLE challenge_boards ADD COLUMN title_prompt TEXT NOT NULL DEFAULT ''");
  if(!boardColumns.some(column=>column.name==='body_prompt'))sql.exec("ALTER TABLE challenge_boards ADD COLUMN body_prompt TEXT NOT NULL DEFAULT ''");
}

export function deleteChallengeAccountData(sql,userId){
  const postIds=[...sql.exec('SELECT post_id FROM challenge_posts WHERE author_id=?',userId)].map(row=>row.post_id),keys=[];
  for(const postId of postIds)keys.push(...deletePostData(sql,postId));
  sql.exec('DELETE FROM challenge_comments WHERE author_id=?',userId);
  sql.exec('DELETE FROM challenge_rate_limits WHERE actor_id=?',userId);
  return keys;
}

export async function handleChallengeStoreRequest(sql,request,url=new URL(request.url)){
  const path=url.pathname;
  if(!path.startsWith('/challenges/')&&!path.startsWith('/admin/challenges/'))return null;

  if(request.method==='GET'&&path==='/challenges/boards'){
    const includeArchived=url.searchParams.get('includeArchived')==='1',rows=[...sql.exec(`SELECT b.*,(SELECT COUNT(*) FROM challenge_posts p WHERE p.board_id=b.board_id) AS post_count FROM challenge_boards b ${includeArchived?'':"WHERE b.status<>'archived'"} ORDER BY CASE b.status WHEN 'archived' THEN 2 ELSE 1 END,b.start_date DESC,b.created_at DESC`)];
    return json({boards:rows.map(row=>({...boardDto(row),postCount:Number(row.post_count||0)}))});
  }

  if(request.method==='GET'&&path==='/challenges/posts'){
    const boardId=id(url.searchParams.get('boardId')),board=getBoard(sql,boardId);if(!board)return json({error:'챌린지 게시판을 찾지 못했습니다.'},404);
    const page=Math.max(1,Math.min(100000,Number(url.searchParams.get('page'))||1)),query=text(url.searchParams.get('query'),120),like=`%${query.replace(/[\\%_]/g,'\\$&')}%`,where=query?`p.board_id=? AND (p.title LIKE ? ESCAPE '\\' OR p.author_id LIKE ? ESCAPE '\\')`:'p.board_id=?',bindings=query?[boardId,like,like]:[boardId],count=[...sql.exec(`SELECT COUNT(*) AS total FROM challenge_posts p WHERE ${where}`,...bindings)][0],total=Number(count?.total||0),totalPages=Math.max(1,Math.ceil(total/10)),safePage=Math.min(page,totalPages),offset=(safePage-1)*10;
    const rows=[...sql.exec(`SELECT p.*,(SELECT COUNT(*) FROM challenge_attachments a WHERE a.post_id=p.post_id) AS attachment_count,(SELECT COUNT(*) FROM challenge_comments c WHERE c.post_id=p.post_id) AS comment_count FROM challenge_posts p WHERE ${where} ORDER BY p.created_at DESC,p.post_id DESC LIMIT 10 OFFSET ?`,...bindings,offset)];
    return json({board:boardDto(board),posts:rows.map(postDto),page:safePage,total,totalPages});
  }

  if(request.method==='GET'&&path==='/challenges/post'){
    const postId=id(url.searchParams.get('postId')),post=getPost(sql,postId);if(!post)return json({error:'게시글을 찾지 못했습니다.'},404);const board=getBoard(sql,post.board_id);
    const attachments=[...sql.exec('SELECT attachment_id,original_name,mime_type,file_size,created_at FROM challenge_attachments WHERE post_id=? ORDER BY created_at,attachment_id',postId)].map(row=>({id:row.attachment_id,name:row.original_name,mime:row.mime_type,size:Number(row.file_size),createdAt:Number(row.created_at)}));
    const comments=[...sql.exec('SELECT comment_id,author_id,comment_body,created_at FROM challenge_comments WHERE post_id=? ORDER BY created_at,comment_id LIMIT 500',postId)].map(row=>({id:row.comment_id,authorId:row.author_id,body:row.comment_body,createdAt:Number(row.created_at)}));
    return json({board:boardDto(board),post:postDto(post),attachments,comments});
  }

  if(request.method==='GET'&&path==='/challenges/attachment'){
    const attachmentId=id(url.searchParams.get('attachmentId')),row=[...sql.exec('SELECT attachment_id,post_id,storage_key,original_name,mime_type,file_size FROM challenge_attachments WHERE attachment_id=? LIMIT 1',attachmentId)][0];
    return row?json({attachment:{id:row.attachment_id,postId:row.post_id,key:row.storage_key,name:row.original_name,mime:row.mime_type,size:Number(row.file_size)}}):json({error:'첨부파일을 찾지 못했습니다.'},404);
  }

  if(request.method==='POST'&&path==='/challenges/posts'){
    const body=await request.json(),rawTitle=String(body.title??'').trim(),rawBody=String(body.body??'').trim(),postId=id(body.postId),boardId=id(body.boardId),authorId=id(body.authorId),board=getBoard(sql,boardId),title=text(rawTitle,200),postBody=text(rawBody,20000),achievement=numberInRange(body.achievement,0,1000000),attachments=Array.isArray(body.attachments)?body.attachments.slice(0,10):[];
    if(rawTitle.length>200||rawBody.length>20000)return json({error:'제목은 200자, 본문은 20,000자까지 입력할 수 있습니다.'},400);
    if(!postId||!board||!authorId||title.length<2||!postBody||achievement===null)return json({error:'게시글 입력 정보를 확인해 주세요.'},400);
    if(boardStatus(board)!=='active')return json({error:'현재 글을 등록할 수 없는 챌린지입니다.'},409);
    if(!allowAction(sql,authorId,'post',10))return json({error:'게시글 등록 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'},429);
    const now=Math.floor(Date.now()/1000);sql.exec('INSERT INTO challenge_posts(post_id,board_id,author_id,title,body,achievement,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',postId,boardId,authorId,title,postBody,achievement,now,now);sql.exec('INSERT INTO user_registry(user_id,created_at,last_seen_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen_at=excluded.last_seen_at',authorId,now,now);
    for(const item of attachments){const attachmentId=id(item.id),key=text(item.key,300),name=text(item.name,180),mime=text(item.mime,100),size=numberInRange(item.size,1,10485760);if(!attachmentId||!key||!name||!mime||size===null)continue;sql.exec('INSERT INTO challenge_attachments(attachment_id,post_id,storage_key,original_name,mime_type,file_size,created_at) VALUES(?,?,?,?,?,?,?)',attachmentId,postId,key,name,mime,size,now);}
    return json({ok:true,postId},201);
  }

  if(request.method==='POST'&&path==='/challenges/comments'){
    const body=await request.json(),rawComment=String(body.body??'').trim(),postId=id(body.postId),authorId=id(body.authorId),commentBody=text(rawComment,2000),post=getPost(sql,postId),board=post?getBoard(sql,post.board_id):null;
    if(rawComment.length>2000)return json({error:'댓글은 2,000자까지 입력할 수 있습니다.'},400);
    if(!post||!board)return json({error:'게시글을 찾지 못했습니다.'},404);if(!authorId||!commentBody)return json({error:'댓글 내용을 입력해 주세요.'},400);if(boardStatus(board)!=='active')return json({error:'종료된 챌린지에는 댓글을 등록할 수 없습니다.'},409);if(!allowAction(sql,authorId,'comment',30))return json({error:'댓글 등록 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'},429);
    const commentId=crypto.randomUUID(),now=Math.floor(Date.now()/1000);sql.exec('INSERT INTO challenge_comments(comment_id,post_id,author_id,comment_body,created_at) VALUES(?,?,?,?,?)',commentId,postId,authorId,commentBody,now);return json({ok:true,comment:{id:commentId,authorId,body:commentBody,createdAt:now}},201);
  }

  if(request.method==='POST'&&path==='/admin/challenges/boards/save'){
    const body=await request.json(),input=boardInput(body);if(input.error)return json(input,400);const now=Math.floor(Date.now()/1000),boardId=id(body.id)||crypto.randomUUID(),existing=getBoard(sql,boardId),status=body.status==='archived'||(!Object.hasOwn(body,'status')&&existing?.status==='archived')?'archived':'active';
    if(existing)sql.exec('UPDATE challenge_boards SET name=?,board_type=?,description=?,title_prompt=?,body_prompt=?,start_date=?,end_date=?,target_amount=?,target_unit=?,status=?,updated_at=? WHERE board_id=?',input.name,input.type,input.description,input.titlePrompt,input.bodyPrompt,input.startDate,input.endDate,input.target,input.unit,status,now,boardId);
    else sql.exec('INSERT INTO challenge_boards(board_id,name,board_type,description,title_prompt,body_prompt,start_date,end_date,target_amount,target_unit,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',boardId,input.name,input.type,input.description,input.titlePrompt,input.bodyPrompt,input.startDate,input.endDate,input.target,input.unit,status,now,now);
    sql.exec('INSERT INTO challenge_audit_logs(admin_id,target_type,target_id,action_name,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)',id(body.adminId)||'admin','board',boardId,existing?'update':'create',existing?JSON.stringify(boardDto(existing)):'',JSON.stringify({...input,status}),now);return json({ok:true,board:boardDto(getBoard(sql,boardId))},existing?200:201);
  }

  if(request.method==='POST'&&path==='/admin/challenges/boards/archive'){
    const body=await request.json(),boardId=id(body.id),board=getBoard(sql,boardId);if(!board)return json({error:'게시판을 찾지 못했습니다.'},404);const status=body.archived===false?'active':'archived',now=Math.floor(Date.now()/1000);sql.exec('UPDATE challenge_boards SET status=?,updated_at=? WHERE board_id=?',status,now,boardId);sql.exec('INSERT INTO challenge_audit_logs(admin_id,target_type,target_id,action_name,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)',id(body.adminId)||'admin','board',boardId,status==='archived'?'archive':'restore',JSON.stringify(boardDto(board)),JSON.stringify(boardDto(getBoard(sql,boardId))),now);return json({ok:true,board:boardDto(getBoard(sql,boardId))});
  }

  if(request.method==='POST'&&path==='/admin/challenges/boards/delete'){
    const body=await request.json(),boardId=id(body.id),board=getBoard(sql,boardId);if(!board)return json({error:'게시판을 찾지 못했습니다.'},404);const postIds=[...sql.exec('SELECT post_id FROM challenge_posts WHERE board_id=?',boardId)].map(row=>row.post_id),keys=[];for(const postId of postIds)keys.push(...deletePostData(sql,postId));const now=Math.floor(Date.now()/1000);sql.exec('DELETE FROM challenge_boards WHERE board_id=?',boardId);sql.exec('INSERT INTO challenge_audit_logs(admin_id,target_type,target_id,action_name,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)',id(body.adminId)||'admin','board',boardId,'delete',JSON.stringify(boardDto(board)),'',now);return json({ok:true,attachmentKeys:keys});
  }

  if(request.method==='POST'&&path==='/admin/challenges/posts/progress'){
    const body=await request.json(),postId=id(body.postId),post=getPost(sql,postId),achievement=numberInRange(body.achievement,0,1000000);if(!post)return json({error:'게시글을 찾지 못했습니다.'},404);if(achievement===null)return json({error:'달성량을 확인해 주세요.'},400);const now=Math.floor(Date.now()/1000);sql.exec('UPDATE challenge_posts SET achievement=?,updated_at=? WHERE post_id=?',achievement,now,postId);sql.exec('INSERT INTO challenge_audit_logs(admin_id,target_type,target_id,action_name,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)',id(body.adminId)||'admin','post',postId,'progress_update',JSON.stringify({achievement:Number(post.achievement)}),JSON.stringify({achievement}),now);return json({ok:true,post:postDto(getPost(sql,postId))});
  }

  if(request.method==='POST'&&path==='/admin/challenges/posts/delete'){
    const body=await request.json(),postId=id(body.postId),post=getPost(sql,postId);if(!post)return json({error:'게시글을 찾지 못했습니다.'},404);const keys=deletePostData(sql,postId),now=Math.floor(Date.now()/1000);sql.exec('INSERT INTO challenge_audit_logs(admin_id,target_type,target_id,action_name,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)',id(body.adminId)||'admin','post',postId,'delete',JSON.stringify(postDto(post)),'',now);return json({ok:true,attachmentKeys:keys});
  }

  if(request.method==='POST'&&path==='/admin/challenges/comments/delete'){
    const body=await request.json(),commentId=id(body.commentId),row=[...sql.exec('SELECT * FROM challenge_comments WHERE comment_id=? LIMIT 1',commentId)][0];if(!row)return json({error:'댓글을 찾지 못했습니다.'},404);const now=Math.floor(Date.now()/1000);sql.exec('DELETE FROM challenge_comments WHERE comment_id=?',commentId);sql.exec('INSERT INTO challenge_audit_logs(admin_id,target_type,target_id,action_name,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)',id(body.adminId)||'admin','comment',commentId,'delete',JSON.stringify({authorId:row.author_id,body:row.comment_body}),'',now);return json({ok:true});
  }

  if(request.method==='GET'&&path==='/admin/challenges/stats'){
    const boardId=id(url.searchParams.get('boardId')),query=text(url.searchParams.get('query'),120),page=Math.max(1,Math.min(100000,Number(url.searchParams.get('page'))||1)),board=getBoard(sql,boardId);if(!board)return json({error:'게시판을 찾지 못했습니다.'},404);const like=`%${query.replace(/[\\%_]/g,'\\$&')}%`,rows=[...sql.exec(`SELECT author_id,strftime('%Y-%m',created_at,'unixepoch','+9 hours') AS month_key,SUM(achievement) AS amount FROM challenge_posts WHERE board_id=? ${query?"AND author_id LIKE ? ESCAPE '\\'":''} GROUP BY author_id,month_key`,...(query?[boardId,like]:[boardId]))],months=monthRange(board.start_date,board.end_date),users=new Map();
    for(const row of rows){if(!users.has(row.author_id))users.set(row.author_id,{userId:row.author_id,months:Object.fromEntries(months.map(month=>[month,0]))});const user=users.get(row.author_id);if(Object.hasOwn(user.months,row.month_key))user.months[row.month_key]=Number(row.amount||0);}
    const target=Number(board.target_amount),allParticipants=[...users.values()].map(user=>{const achieved=Object.values(user.months).reduce((sum,value)=>sum+Number(value||0),0);return {...user,target,achieved,rate:target>0?Math.round(achieved/target*100):null};}).sort((a,b)=>(b.rate??-1)-(a.rate??-1)||b.achieved-a.achieved||a.userId.localeCompare(b.userId,'ko')),total=allParticipants.length,totalPages=Math.max(1,Math.ceil(total/50)),safePage=Math.min(page,totalPages),participants=allParticipants.slice((safePage-1)*50,safePage*50);
    return json({board:boardDto(board),months,participants,page:safePage,total,totalPages});
  }

  return json({error:'Not found'},404);
}
