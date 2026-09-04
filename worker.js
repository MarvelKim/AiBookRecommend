import {createChallengeSchema,deleteChallengeAccountData,handleChallengeStoreRequest} from './challenge-store.js';

const JOB_TREE={
  '행정·기획':['공공기관 경영 혁신','정책 기획','보고서 작성','조직문화 리더십','데이터 기반 행정','지방공기업 ESG'],
  '기계·설비':['기계설비 유지관리','시설관리 실무','설비 예방정비','공조냉동','스마트 시설관리','기계 안전'],
  '난방·에너지':['에너지 관리','탄소중립 에너지','신재생에너지','열관리','에너지 효율','기후위기 대응'],
  '환경':['환경 관리 ESG','탄소중립','자원순환','수질 관리','대기환경','생태환경'],
  '토목·건축':['토목 시설물 관리','건축 유지관리','도시계획','스마트시티','건설 안전','공공공간 디자인'],
  '전기·전자':['전기회로 실험','회로이론 전자기학','전기설비 실무','전력 시스템 송배전','전기 교양 상식','반도체 전자공학','배터리 전력전자','자동제어 스마트그리드'],
  '안전·소방':['산업안전 실무','소방 안전관리','재난 대응','위험성평가','중대재해 예방','안전문화'],
  '전산·정보통신':['공공기관 디지털 전환','인공지능 업무 활용','정보보안','데이터 분석','스마트시티 정보통신','클라우드']
};
const PURPOSE_TREE={
  '실무 문제 해결':['실무 가이드','현장 사례','문제 해결'],
  '신기술·동향':['최신 기술 트렌드','미래 전망','혁신 사례'],
  '리더십':['리더십','조직관리','소통'],
  '보고서·기획':['기획 보고서','논리적 글쓰기','데이터 시각화'],
  '교양·인사이트':['인문 교양','사회 변화','과학 교양'],
  '자격증·시험':['기사 필기 기출','산업기사 실기','자격증 핵심이론']
};
const CERT_TREE={
  '행정·기획':['행정사 시험'],
  '기계·설비':['일반기계기사','공조냉동기계기사','설비보전기사'],
  '난방·에너지':['에너지관리기사','가스기사','신재생에너지발전설비기사'],
  '환경':['대기환경기사','수질환경기사','폐기물처리기사'],
  '토목·건축':['토목기사','건축기사','건설안전기사'],
  '전기·전자':['전기기사','전기산업기사','소방설비기사 전기'],
  '안전·소방':['산업안전기사','건설안전기사','위험물산업기사','소방설비기사'],
  '전산·정보통신':['정보처리기사','정보통신기사','정보보안기사']
};
const JOB_TERMS={'행정·기획':['행정','기획','정책','공공기관','공기업','경영','조직','보고서','리더십','의사결정','데이터'],'기계·설비':['기계','설비','시설관리','정비','공조','냉동'],'난방·에너지':['난방','에너지','열관리','가스','탄소중립','신재생'],'환경':['환경','생태','기후','탄소','수질','대기','폐기물','자원순환'],'토목·건축':['토목','건축','건설','도시','시설물','스마트시티'],'전기·전자':['전기','전자','전력','회로','전자기','반도체','배터리','송배전','제어','모터','스마트그리드'],'안전·소방':['안전','소방','재난','위험성','중대재해','산업기사','위험물'],'전산·정보통신':['전산','정보통신','디지털','인공지능','AI','데이터','보안','클라우드','소프트웨어']};
const PAPER_LEVEL='심화(논문)';
const PAPER_PRACTICAL='심층 탐구';
const PAPER_JOB_QUERIES={'행정·기획':['공공기관','지방공기업','행정정책'],'기계·설비':['기계설비','시설물 정비','시설관리'],'난방·에너지':['에너지효율','지역난방','신재생에너지'],'환경':['환경관리','탄소중립','자원순환'],'토목·건축':['시설물 유지관리','스마트시티','건축 토목'],'전기·전자':['전기설비','스마트그리드','전력계통'],'안전·소방':['산업안전','소방안전','위험성평가'],'전산·정보통신':['디지털전환','인공지능','정보보안']};
const PAPER_PURPOSE_QUERIES={'실무 문제 해결':['실증','사례','개선'],'신기술·동향':['기술동향','혁신','전망'],'자격증·시험':['직무역량','전문교육','자격제도'],'리더십':['리더십','조직성과','변화관리'],'보고서·기획':['효과분석','의사결정','성과지표'],'교양·인사이트':['사회적영향','인식조사','지속가능성']};
const PAPER_JOB_TERMS={'행정·기획':['행정','기획','정책','공공기관','공기업','경영','조직','성과관리','의사결정','administration','policy','public institution','management'],'기계·설비':['기계','설비','시설관리','유지관리','정비','공조','냉동','mechanical','facility','maintenance'],'난방·에너지':['난방','에너지','열관리','가스','탄소중립','신재생','에너지효율','energy','heating','carbon neutrality','renewable'],'환경':['환경','생태','기후','탄소','수질','대기','폐기물','자원순환','environment','climate','carbon','waste','water quality','air pollution'],'토목·건축':['토목','건축','건설','도시','시설물','스마트시티','civil engineering','architecture','construction','urban','smart city'],'전기·전자':['전기','전자','전력','회로','반도체','배터리','송배전','스마트그리드','electrical','electronic','power system','smart grid'],'안전·소방':['안전','소방','재난','위험성','중대재해','산업재해','safety','fire','disaster','risk assessment'],'전산·정보통신':['전산','정보통신','디지털','인공지능','AI','데이터','보안','클라우드','소프트웨어','digital','artificial intelligence','data','security','cloud','software']};
const PAPER_PURPOSE_TERMS={'실무 문제 해결':['실무','문제해결','개선','효과','실증','사례','적용','운영','practice','improvement','effect','empirical','case study','application'],'신기술·동향':['신기술','기술동향','동향','혁신','전망','전환','스마트','technology trend','trend','innovation','forecast','transition'],'자격증·시험':['자격','시험','직무역량','전문인력','교육','평가','qualification','competency','training','assessment'],'리더십':['리더십','조직관리','소통','조직성과','변화관리','leadership','organization','communication','change management'],'보고서·기획':['기획','보고서','정책효과','의사결정','모형','지표','분석','planning','policy effect','decision','model','indicator','analysis'],'교양·인사이트':['인사이트','인식','사회적','영향','지속가능','동향','고찰','perception','social','impact','sustainability','review']};
const EXAM_TITLE=/(기사|산업기사|기능사|자격증|필기|실기|기출)/;
const REJECTED_COVER_HASHES=new Set(['538a62800ebdd59a1b98234d20c22d03bb93583c4486af2c223821d60e9eb529','3efa8c43e5b4348f303a528c81adf435f0111ea752fe9f0f6241478b60987fa6']);
const COVER_HOSTS=new Set(['books.google.com','books.google.co.kr','contents.kyobobook.co.kr','covers.openlibrary.org','image.yes24.com','shopping-phinf.pstatic.net','bookthumb-phinf.pstatic.net']);

const clean=(text='')=>String(text).replace(/<[^>]*>/g,'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim();
const titleKey=(text='')=>clean(text).normalize('NFKC').toLowerCase().replace(/[\s:：·ㆍ,.!?()\[\]{}'"“”‘’\-]/g,'');
function sameBook(candidate,{title,author,publisher}){const wanted=titleKey(title),found=titleKey(candidate.title);if(!wanted||!found)return false;const titleMatch=wanted===found||(Math.min(wanted.length,found.length)>=6&&(wanted.includes(found)||found.includes(wanted)));if(!titleMatch)return false;const authorKey=titleKey(author),publisherKey=titleKey(publisher),authors=titleKey((candidate.authors||[]).join(' ')),candidatePublisher=titleKey(candidate.publisher);return !authorKey&&!publisherKey||Boolean(authorKey&&(authors.includes(authorKey)||authorKey.includes(authors)))||Boolean(publisherKey&&(candidatePublisher.includes(publisherKey)||publisherKey.includes(candidatePublisher)));}
function allowedCoverUrl(value=''){try{const url=new URL(value);if(url.protocol!=='https:')return '';const host=url.hostname.toLowerCase(),allowed=COVER_HOSTS.has(host)||host.endsWith('.googleusercontent.com')||host.endsWith('.pstatic.net')||host.endsWith('.yes24.com');return allowed?url.toString():'';}catch{return '';}}
const isbnOf=(ids=[])=>ids.find(id=>id.type==='ISBN_13')?.identifier||ids[0]?.identifier||'';
const FRESHNESS_YEARS={'최근 3년':3,'최근 5년':5,'최근 10년':10};
function publicationYear(book){const match=String(book.year||book.publishedDate||'').match(/(?:19|20)\d{2}/);return match?Number(match[0]):0;}
function matchesFreshness(book,profile){const years=FRESHNESS_YEARS[profile.freshness];if(!years)return true;const year=publicationYear(book),currentYear=new Date().getFullYear();return year>=currentYear-years&&year<=currentYear;}
function normalizeGoogle(item,branch){const v=item.volumeInfo||{};return {id:`g:${item.id}`,title:clean(v.title),authors:v.authors||[],publisher:v.publisher||'',publishedDate:v.publishedDate||'',pageCount:Number(v.pageCount||0),description:clean(v.description||''),categories:v.categories||[],isbn:isbnOf(v.industryIdentifiers),thumbnail:(v.imageLinks?.thumbnail||'').replace(/^http:/,'https:'),source:'Google Books',branch};}
function normalizeNaver(item,index,branch){return {id:`n:${item.isbn}:${index}`,title:clean(item.title),authors:clean(item.author).split('^').filter(Boolean),publisher:clean(item.publisher),publishedDate:item.pubdate?`${item.pubdate.slice(0,4)}-${item.pubdate.slice(4,6)}-${item.pubdate.slice(6,8)}`:'',pageCount:0,description:clean(item.description),categories:[],isbn:(item.isbn||'').split(' ').pop(),thumbnail:item.image||'',source:'네이버 책',branch};}
function normalizeYes24(item,branch){const content=item.contentDetail||{},description=clean([content.bookIntroduction,content.bookSummary].filter(Boolean).join(' ')),tableOfContents=clean(content.tableOfContents||'');return {id:`y:${item.itemId}`,title:clean(item.title),authors:clean(item.author).split(/[,;|]/).map(v=>v.trim()).filter(Boolean),publisher:clean(item.publisher),publishedDate:item.publishDate||'',pageCount:Number(item.pages||0),description,categories:[item.goodsType,item.goodsSortNm].filter(Boolean),isbn:String(item.isbn13||item.isbn10||''),thumbnail:item.cover||'',tableOfContents,storeLinks:{yes24:item.link||item.addOnLink||''},source:'YES24',branch};}
async function google(query,env,startIndex=0){const url=new URL('https://www.googleapis.com/books/v1/volumes');url.searchParams.set('q',query);url.searchParams.set('printType','books');url.searchParams.set('langRestrict','ko');url.searchParams.set('maxResults','40');url.searchParams.set('startIndex',String(startIndex));if(env.GOOGLE_BOOKS_API_KEY)url.searchParams.set('key',env.GOOGLE_BOOKS_API_KEY);const res=await fetch(url);if(!res.ok)throw new Error(`Google ${res.status}`);const data=await res.json();return (data.items||[]).map(item=>normalizeGoogle(item,query));}
async function naver(query,env,start=1){if(!env.NAVER_CLIENT_ID||!env.NAVER_CLIENT_SECRET)return [];const url=new URL('https://openapi.naver.com/v1/search/book.json');url.searchParams.set('query',query);url.searchParams.set('display','40');url.searchParams.set('start',String(start));url.searchParams.set('sort','sim');const res=await fetch(url,{headers:{'X-Naver-Client-Id':env.NAVER_CLIENT_ID,'X-Naver-Client-Secret':env.NAVER_CLIENT_SECRET}});if(!res.ok)throw new Error(`Naver ${res.status}`);const data=await res.json();return (data.items||[]).map((item,index)=>normalizeNaver(item,index+start-1,query));}
async function yes24(query,env,page=1){if(!env.YES24_API_KEY)return [];const url=new URL('https://apis.yes24.com/v1/goods/itemList');url.searchParams.set('query',query);url.searchParams.set('category','BOOK');url.searchParams.set('sort','RELATION');url.searchParams.set('page',String(page));url.searchParams.set('pageSize','40');url.searchParams.set('detail','Y');const res=await fetch(url,{headers:{'X-Api-Key':env.YES24_API_KEY}});if(res.status===404)return [];if(!res.ok)throw new Error(`YES24 ${res.status}`);const data=await res.json();return (data.data?.items||[]).filter(item=>item.adultYn!=='Y').map(item=>normalizeYes24(item,query));}
async function discoveredCoverUrls(isbn,metadata,env){const query=isbn||metadata.title,tasks=[];if(env.YES24_API_KEY&&isbn)tasks.push((async()=>{const url=new URL('https://apis.yes24.com/v1/goods/itemDetail');url.searchParams.set('searchType','ISBN13');url.searchParams.set('query',isbn);url.searchParams.set('detail','N');const res=await fetch(url,{headers:{'X-Api-Key':env.YES24_API_KEY}}),data=res.ok?await res.json():null;return data?.data?.items?.[0]?.cover||'';})());if(env.NAVER_CLIENT_ID&&env.NAVER_CLIENT_SECRET)tasks.push(naver(query,env,1).then(books=>(isbn?books[0]:books.find(book=>sameBook(book,metadata)))?.thumbnail||''));tasks.push(google(isbn?`isbn:${isbn}`:`intitle:${metadata.title}`,env,0).then(books=>(isbn?books:books.filter(book=>sameBook(book,metadata))).slice(0,5).map(book=>book.thumbnail.replace(/zoom=\d/,'zoom=2'))));const settled=await Promise.allSettled(tasks);return [...new Set(settled.filter(result=>result.status==='fulfilled').flatMap(result=>result.value).flat().map(allowedCoverUrl).filter(Boolean))];}
async function fetchCoverImage(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);try{const res=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; GMUC-AIBookCurator/1.0)','Accept':'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8'},redirect:'follow'}),type=(res.headers.get('content-type')||'').split(';')[0],declared=Number(res.headers.get('content-length')||0);if(!res.ok||!type.startsWith('image/')||declared>5000000)throw new Error('invalid cover response');const buffer=await res.arrayBuffer();if(buffer.byteLength<800||buffer.byteLength>5000000)throw new Error('invalid cover size');const digest=await crypto.subtle.digest('SHA-256',buffer),hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');if(REJECTED_COVER_HASHES.has(hash))throw new Error('placeholder cover');return {buffer,type};}finally{clearTimeout(timer);}}
async function firstValidCover(urls){const candidates=[...new Set(urls.map(allowedCoverUrl).filter(Boolean))];if(!candidates.length)return null;try{return await Promise.any(candidates.map(fetchCoverImage));}catch{return null;}}
async function proxyCover(isbn,metadata,env){const direct=[metadata.source];if(isbn)direct.push(`https://contents.kyobobook.co.kr/sih/fit-in/400x0/pdt/${isbn}.jpg`,`https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=2&source=gbs_api`,`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`);let image=await firstValidCover(direct);if(!image)image=await firstValidCover(await discoveredCoverUrls(isbn,metadata,env));if(!image)return json({error:'표지를 찾지 못했습니다.'},404);return new Response(image.buffer,{headers:{'content-type':image.type,'cache-control':'public, max-age=604800, stale-while-revalidate=2592000','x-content-type-options':'nosniff'}});}
async function yes24ProductUrl(isbn,title){const query=isbn||title,search=new URL('https://www.yes24.com/Product/Search');search.searchParams.set('domain','BOOK');search.searchParams.set('query',query);if(!query)return search.toString();try{const res=await fetch(search,{headers:{'User-Agent':'Mozilla/5.0 (compatible; GMUC-AIBookCurator/1.0)','Accept-Language':'ko-KR,ko;q=0.9'},redirect:'follow'});if(!res.ok)return search.toString();const html=await res.text(),goodsNo=html.match(/href=["'](?:https:\/\/www\.yes24\.com)?\/product\/goods\/(\d+)/i)?.[1];return goodsNo?`https://www.yes24.com/product/goods/${goodsNo}`:search.toString();}catch{return search.toString();}}
async function kyobo(query){const url=`https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(query)}`,res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; GMUC-AIBookCurator/1.0)','Accept-Language':'ko-KR,ko;q=0.9'}});if(!res.ok)throw new Error(`Kyobo ${res.status}`);const html=await res.text(),segments=html.split(/<li class="prod_item">/i).slice(1,31),books=[];for(const segment of segments){const identity=segment.match(/data-bid="([0-9X]+)"\s+data-name="([^"]+)"/i);if(!identity)continue;const isbn=identity[1],title=clean(identity[2]),authors=[...segment.matchAll(/class="author(?:\s+rep)?"[^>]*>([^<]+)<\/a>/gi)].map(match=>clean(match[1])).filter(Boolean),publishBlock=segment.match(/<div class="prod_publish">([\s\S]*?)<\/div>/i)?.[1]||'',publisher=clean(publishBlock.match(/class="text"[^>]*>([^<]+)<\/a>/i)?.[1]||''),date=clean(publishBlock.match(/class="date"[^>]*>([^<]+)<\/span>/i)?.[1]||''),publishedDate=(date.match(/(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/)||[]).slice(1).map(v=>v.padStart(2,'0')).join('-');books.push({id:`k:${isbn}`,title,authors,publisher,publishedDate,pageCount:0,description:'',categories:[],isbn,thumbnail:`https://contents.kyobobook.co.kr/sih/fit-in/400x0/pdt/${isbn}.jpg`,source:'교보문고',branch:query});}return books;}
function buildQueries(profile){const purposes=profile.purposes||[],certification=purposes.includes('자격증·시험'),otherPurposes=purposes.filter(purpose=>purpose!=='자격증·시험'),certQueries=[],jobQueries=[],purposeQueries=[];for(const job of profile.jobs||[]){if(certification)(CERT_TREE[job]||[`${job} 자격증`]).forEach(q=>certQueries.push(q));if(!certification||otherPurposes.length)(JOB_TREE[job]||[job]).forEach(q=>jobQueries.push(q));}for(const purpose of otherPurposes)(PURPOSE_TREE[purpose]||[]).forEach(q=>purposeQueries.push(`${profile.jobs?.[0]||'공공기관'} ${q}`));return [...new Set([...certQueries,...purposeQueries,...jobQueries])].slice(0,24);}
function score(book,profile){const text=`${book.title||''} ${book.description||''} ${book.tableOfContents||''} ${book.branch||''} ${(book.categories||[]).join(' ')}`.toLowerCase(),jobHits=[...new Set((profile.jobs||[]).flatMap(job=>(JOB_TERMS[job]||[job]).filter(term=>text.includes(term.toLowerCase()))))].length,purposeHits=(profile.purposes||[]).flatMap(v=>v.split(/[·\s]/)).filter(term=>term.length>1&&text.includes(term.toLowerCase())).length,foreignDomain=Object.entries(JOB_TERMS).some(([job,terms])=>!(profile.jobs||[]).includes(job)&&terms.some(term=>text.includes(term.toLowerCase()))),year=Number((book.publishedDate||'').slice(0,4));let value=25+Math.min(48,jobHits*12)+Math.min(18,purposeHits*6);if(!jobHits)value=foreignDomain?Math.min(value,35):Math.min(value,39);if(year>=new Date().getFullYear()-3)value+=4;return Math.max(10,Math.min(98,value));}
function mergeBook(target,source){return {...target,authors:target.authors?.length?target.authors:source.authors,publisher:target.publisher||source.publisher,publishedDate:target.publishedDate||source.publishedDate,pageCount:target.pageCount||source.pageCount,description:(source.description||'').length>(target.description||'').length?source.description:target.description,categories:[...new Set([...(target.categories||[]),...(source.categories||[])])],thumbnail:target.thumbnail||source.thumbnail,tableOfContents:target.tableOfContents||source.tableOfContents,storeLinks:{...(target.storeLinks||{}),...(source.storeLinks||{})},sources:[...new Set([...(target.sources||[target.source]),...(source.sources||[source.source])].filter(Boolean))]};}
function diversify(groups,profile,limit=180){const indexByKey=new Map(),result=[],wantsCertificate=profile.purposes?.includes('자격증·시험'),queues=groups.map(group=>group.filter(book=>book.title&&book.isbn&&matchesFreshness(book,profile)&&score(book,profile)>=40&&(wantsCertificate||!EXAM_TITLE.test(book.title))).sort((a,b)=>score(b,profile)-score(a,profile)));let cursor=0;while(result.length<limit&&queues.some(queue=>queue.length)){const queue=queues[cursor%queues.length];cursor++;const book=queue.shift();if(!book)continue;const key=book.isbn||book.title.replace(/\s/g,'').toLowerCase();if(indexByKey.has(key)){const index=indexByKey.get(key),merged=mergeBook(result[index],book);result[index]={...merged,match:score(merged,profile)};continue;}indexByKey.set(key,result.length);result.push({...book,sources:[book.source].filter(Boolean),match:score(book,profile),reason:`${book.branch} 검색 가지에서 찾은 도서로, ${profile.jobs.join('·')} 업무와 ${profile.purposes.join('·')} 목적을 함께 고려했습니다.`});}return result;}
function paperQueries(profile){const queries=[];for(const job of profile.jobs||[]){const jobQueries=PAPER_JOB_QUERIES[job]||[job];for(const purpose of profile.purposes||[]){const purposeQueries=PAPER_PURPOSE_QUERIES[purpose]||[purpose];for(let index=0;index<3;index++)queries.push(`${jobQueries[index%jobQueries.length]} ${purposeQueries[index%purposeQueries.length]}`);}}return [...new Set(queries)].slice(0,12);}
function abstractText(inverted={}){const words=[];for(const [word,positions] of Object.entries(inverted||{}))for(const position of positions||[])if(position<600)words.push([position,word]);return words.sort((a,b)=>a[0]-b[0]).map(entry=>entry[1]).join(' ').slice(0,4000);}
function normalizePaper(work,branch){const source=work.primary_location?.source?.display_name||'',topics=(work.topics||[]).map(topic=>topic.display_name).filter(Boolean),keywords=(work.keywords||[]).map(keyword=>keyword.display_name).filter(Boolean),openAlexId=String(work.id||'').split('/').pop();return {id:`p:${openAlexId}`,type:'paper',title:clean(work.display_name||work.title),authors:(work.authorships||[]).map(item=>clean(item.author?.display_name)).filter(Boolean).slice(0,12),publisher:clean(source),publishedDate:work.publication_date||String(work.publication_year||''),year:String(work.publication_year||''),description:abstractText(work.abstract_inverted_index),categories:[...new Set([...topics,...keywords])],doi:String(work.doi||''),landingUrl:String(work.primary_location?.landing_page_url||work.doi||''),citedByCount:Number(work.cited_by_count||0),relevanceScore:Number(work.relevance_score||0),queryBranches:[branch],source:'OpenAlex'};}
function crossrefDate(item){const parts=(item.published?.['date-parts']||item['published-print']?.['date-parts']||item['published-online']?.['date-parts']||[])[0]||[];return parts.length?parts.map((value,index)=>index?String(value).padStart(2,'0'):String(value)).join('-'):'';}
function normalizeCrossrefPaper(item,branch){const publishedDate=crossrefDate(item),doi=String(item.DOI||'');return {id:`p:doi:${doi||titleKey(item.title?.[0]||'')}`,type:'paper',title:clean(item.title?.[0]||''),authors:(item.author||[]).map(author=>clean([author.given,author.family].filter(Boolean).join(' '))).filter(Boolean).slice(0,12),publisher:clean(item['container-title']?.[0]||item.publisher||''),publishedDate,year:String(publishedDate).slice(0,4),description:clean(item.abstract||''),categories:(item.subject||[]).map(clean).filter(Boolean),doi:doi?`https://doi.org/${doi}`:'',landingUrl:String(item.URL||'')||(doi?`https://doi.org/${doi}`:''),citedByCount:Number(item['is-referenced-by-count']||0),relevanceScore:Number(item.score||0),queryBranches:[branch],source:'Crossref'};}
function mergePaper(target,paper){return {...target,authors:target.authors.length?target.authors:paper.authors,publisher:target.publisher||paper.publisher,publishedDate:target.publishedDate||paper.publishedDate,year:target.year||paper.year,description:target.description.length>=paper.description.length?target.description:paper.description,categories:[...new Set([...target.categories,...paper.categories])],doi:target.doi||paper.doi,citedByCount:Math.max(target.citedByCount,paper.citedByCount),relevanceScore:Math.max(target.relevanceScore,paper.relevanceScore),queryBranches:[...new Set([...target.queryBranches,...paper.queryBranches])]};}
function paperHits(text,terms=[]){const normalized=text.toLowerCase().replace(/\s+/g,'');return [...new Set(terms.filter(term=>normalized.includes(String(term).toLowerCase().replace(/\s+/g,''))))];}
function scorePaper(paper,profile){const titleText=paper.title,strongText=`${paper.title} ${paper.categories.join(' ')} ${paper.publisher}`,fullText=`${strongText} ${paper.description}`,jobEvidence=(profile.jobs||[]).map(job=>({label:job,hits:paperHits(strongText,PAPER_JOB_TERMS[job]||[job])})).filter(item=>item.hits.length),purposeEvidence=(profile.purposes||[]).map(purpose=>({label:purpose,hits:paperHits(fullText,PAPER_PURPOSE_TERMS[purpose]||[purpose])})).filter(item=>item.hits.length),jobHits=[...new Set(jobEvidence.flatMap(item=>item.hits))],purposeHits=[...new Set(purposeEvidence.flatMap(item=>item.hits))],jobCoverage=jobEvidence.length/Math.max(1,(profile.jobs||[]).length),purposeCoverage=purposeEvidence.length/Math.max(1,(profile.purposes||[]).length),jobStrength=Math.min(1,jobHits.length/3),purposeStrength=Math.min(1,purposeHits.length/2),titleHasJob=(profile.jobs||[]).some(job=>paperHits(titleText,PAPER_JOB_TERMS[job]||[job]).length),titleHasPurpose=(profile.purposes||[]).some(purpose=>paperHits(titleText,PAPER_PURPOSE_TERMS[purpose]||[purpose]).length),metadata=[paper.authors.length,paper.publisher,paper.year,paper.doi,paper.description].filter(Boolean).length/5,year=Number(paper.year||0),currentYear=new Date().getFullYear(),recency=year?Math.max(0,1-Math.min(15,currentYear-year)/15):0,citation=Math.min(1,Math.log10(paper.citedByCount+1)/3),unrelatedMedical=paperHits(fullText,['clinical','patient','medical','health','hospital','disease','surgery','간호','환자','의료','질환','병원','임상','수술']).length,publicContext=paperHits(fullText,['공공','공기업','행정','정책','시설','산업','도시','환경','public','policy','facility','industrial','urban','environment']).length;let match=Math.round(10+40*jobCoverage*jobStrength+25*purposeCoverage*purposeStrength+(titleHasJob?5:0)+(titleHasPurpose?5:0)+6*metadata+5*recency+4*citation);if(!jobEvidence.length)match=Math.min(match,34);if(!purposeEvidence.length)match=Math.min(match,54);if(unrelatedMedical&&!publicContext)match=Math.min(match,45);match=Math.max(0,Math.min(97,match));const jobCopy=jobEvidence.length?`${jobEvidence.map(item=>item.label).join('·')} 관련 '${jobHits.slice(0,3).join('·')}'`:'업무 분야 직접 일치어 없음',purposeCopy=purposeEvidence.length?`${purposeEvidence.map(item=>item.label).join('·')} 목적 관련 '${purposeHits.slice(0,3).join('·')}'`:'독서 목적 직접 일치어 없음',caution=!paper.description?' 공개 초록이 없어 제목·키워드 중심으로 보수적으로 산정했습니다.':unrelatedMedical&&!publicContext?' 의료 분야 편향이 있어 적합도를 낮게 제한했습니다.':match<60?' 직접 일치 근거가 제한적이어서 적합도를 낮게 산정했습니다.':'';return {...paper,match,reason:`공개 제목·초록·키워드에서 ${jobCopy}, ${purposeCopy}을 확인했습니다.${caution}`,matchDetails:{jobs:jobEvidence.map(item=>item.label),purposes:purposeEvidence.map(item=>item.label),jobHits,purposeHits,hasAbstract:Boolean(paper.description)}};}
async function crossrefPapers(query,profile){const url=new URL('https://api.crossref.org/works'),years=FRESHNESS_YEARS[profile.freshness],currentYear=new Date().getFullYear(),filters=['type:journal-article'],controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);url.searchParams.set('query.bibliographic',query);if(years)filters.push(`from-pub-date:${currentYear-years}-01-01`,`until-pub-date:${currentYear}-12-31`);url.searchParams.set('filter',filters.join(','));url.searchParams.set('rows','25');url.searchParams.set('sort','score');url.searchParams.set('order','desc');try{const response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'GMUC-AIBookCurator/1.0'}});if(!response.ok)throw new Error(`Crossref ${response.status}`);const data=await response.json();return (data.message?.items||[]).map(item=>normalizeCrossrefPaper(item,query)).filter(paper=>paper.title);}finally{clearTimeout(timer);}}
async function openAlexPapers(query,profile,env){const url=new URL('https://api.openalex.org/works'),years=FRESHNESS_YEARS[profile.freshness],currentYear=new Date().getFullYear(),filters=['type:article'],controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);url.searchParams.set('search',query);if(years)filters.push(`from_publication_date:${currentYear-years}-01-01`,`to_publication_date:${currentYear}-12-31`);url.searchParams.set('filter',filters.join(','));url.searchParams.set('per_page','25');url.searchParams.set('select','id,doi,display_name,publication_year,publication_date,authorships,primary_location,topics,keywords,cited_by_count,relevance_score,abstract_inverted_index');if(env.OPENALEX_API_KEY)url.searchParams.set('api_key',env.OPENALEX_API_KEY);try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`OpenAlex ${response.status}`);const data=await response.json();return (data.results||[]).map(work=>normalizePaper(work,query)).filter(paper=>paper.title);}catch{return crossrefPapers(query,profile);}finally{clearTimeout(timer);}}
async function recommendPapers(profile,env){const queries=paperQueries(profile),settled=await Promise.allSettled(queries.map(query=>openAlexPapers(query,profile,env))),successful=settled.filter(result=>result.status==='fulfilled'),byKey=new Map();if(!successful.length)throw new Error('학술논문 검색 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');for(const paper of successful.flatMap(result=>result.value)){const key=paper.doi||titleKey(paper.title);if(!key)continue;byKey.set(key,byKey.has(key)?mergePaper(byKey.get(key),paper):paper);}return {books:[...byKey.values()].map(paper=>scorePaper(paper,profile)).filter(paper=>paper.matchDetails.jobs.length&&matchesFreshness(paper,profile)).sort((a,b)=>b.match-a.match||b.citedByCount-a.citedByCount||a.title.localeCompare(b.title,'ko')).slice(0,60),queries,generatedAt:new Date().toISOString()};}
async function recommend(profile,env){const queries=buildQueries(profile),settled=await Promise.allSettled(queries.flatMap(query=>[google(query,env,0),google(query,env,40),naver(query,env,1),naver(query,env,41),yes24(query,env,1),yes24(query,env,2)])),groups=settled.filter(result=>result.status==='fulfilled'&&result.value.length).map(result=>result.value);if(groups.flat().length<120){const kyoboResults=await Promise.allSettled(queries.slice(0,10).map(kyobo));groups.push(...kyoboResults.filter(result=>result.status==='fulfilled'&&result.value.length).map(result=>result.value));}return {books:diversify(groups,profile,300),queries,generatedAt:new Date().toISOString()};}
async function newBooks(env){const queries=['2026 신간','공공기관 경영 신간','기술 트렌드 신간','환경 ESG 신간','인문 교양 신간'];const groups=(await Promise.allSettled(queries.flatMap(query=>[google(query,env,0),google(query,env,40),naver(query,env,1),naver(query,env,41),yes24(query,env,1),yes24(query,env,2)]))).filter(result=>result.status==='fulfilled').map(result=>result.value);return {books:diversify(groups,{jobs:['신간'],purposes:['최신 도서']},60)};}
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
const PAPER_AVAILABILITY_CACHE=new Map();
function paperSearchUrls(title){const query=encodeURIComponent(title),rissQuery=encodeURIComponent(`znTitle,${title}`);return {kiss:`https://kiss.kstudy.com/Search/Result?query=${query}`,rissExact:`https://www.riss.kr/search/Search.do?colName=re_a_kor&isDetailSearch=Y&searchGubun=true&queryText=${rissQuery}`,rissGeneral:`https://www.riss.kr/search/Search.do?query=${query}`,dbpia:`https://www.dbpia.co.kr/search/topSearch?searchOption=all&query=${query}`};}
const noRissResult=html=>/검색결과가\s*없습니다|검색된\s*자료가\s*없습니다/.test(html);
async function paperTitleTranslation(title,signal){if(/[가-힣]/.test(title)||!/[A-Za-z]{3}/.test(title))return '';try{const url=new URL('https://api.mymemory.translated.net/get');url.searchParams.set('q',title.slice(0,500));url.searchParams.set('langpair','en|ko');const response=await fetch(url,{signal,headers:{'User-Agent':'GMUC-AIBookCurator/1.0'}});if(!response.ok)return '';const data=await response.json(),translated=clean(data.responseData?.translatedText||'');return /[가-힣]/.test(translated)?translated:'';}catch{return '';}}
async function paperAvailability(title){const key=titleKey(title),cached=PAPER_AVAILABILITY_CACHE.get(key);if(cached&&Date.now()-cached.savedAt<86400000)return cached.data;const urls=paperSearchUrls(title),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);try{const translatedTitlePromise=paperTitleTranslation(title,controller.signal),headers={'User-Agent':'Mozilla/5.0 (compatible; GMUC-AIBookCurator/1.0)','Accept-Language':'ko-KR,ko;q=0.9'};let response=await fetch(urls.rissExact,{signal:controller.signal,headers});if(!response.ok)throw new Error(`RISS ${response.status}`);let html=await response.text(),rissUrl=urls.rissExact;if(noRissResult(html)){response=await fetch(urls.rissGeneral,{signal:controller.signal,headers});if(!response.ok)throw new Error(`RISS ${response.status}`);html=await response.text();rissUrl=urls.rissGeneral;}const hasResult=!noRissResult(html),translatedTitle=await translatedTitlePromise,data={title,translatedTitle,checkedAt:new Date().toISOString(),sites:{kiss:{available:hasResult&&/한국학술정보\s*\(KISS\)/i.test(html),url:urls.kiss},riss:{available:hasResult,url:rissUrl},dbpia:{available:hasResult&&/누리미디어\s*\(DBpia\)/i.test(html),url:urls.dbpia}}};if(PAPER_AVAILABILITY_CACHE.size>=500)PAPER_AVAILABILITY_CACHE.delete(PAPER_AVAILABILITY_CACHE.keys().next().value);PAPER_AVAILABILITY_CACHE.set(key,{savedAt:Date.now(),data});return data;}finally{clearTimeout(timer);}}

const ADMIN_ID='admin';
const ADMIN_COOKIE='gmuc_admin_session';
const USER_COOKIE='gmuc_user_session';
const ADMIN_SESSION_SECONDS=60*60*4;
const USER_SESSION_SECONDS=60*60*24*30;
const textEncoder=new TextEncoder();
const bytesToBase64Url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const base64UrlToBytes=value=>{const normalized=value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'='),binary=atob(normalized);return Uint8Array.from(binary,char=>char.charCodeAt(0));};
async function sha256(value){return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256',textEncoder.encode(value))));}
async function hmac(secret,value){const key=await crypto.subtle.importKey('raw',textEncoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC',key,textEncoder.encode(value))));}
function constantTimeEqual(left,right){const a=textEncoder.encode(String(left)),b=textEncoder.encode(String(right)),length=Math.max(a.length,b.length,1);let diff=a.length^b.length;for(let i=0;i<length;i++)diff|=(a[i]||0)^(b[i]||0);return diff===0;}
function cookiesOf(request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(part=>part.trim().split(/=(.*)/s).slice(0,2)).filter(([key])=>key));}
function sameOrigin(request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;}
function maskEmail(email=''){const [name,domain]=String(email).split('@');if(!name||!domain)return '설정되지 않음';const visible=name.length<=2?name[0]:name.slice(0,2);return `${visible}${'*'.repeat(Math.max(3,name.length-visible.length))}@${domain}`;}
function validEmail(value=''){const email=String(value).trim().toLowerCase();return email.length<=254&&/^\S+@\S+\.\S+$/.test(email)?email:'';}
async function passwordMatches(candidate,env){if(!env.ADMIN_PASSWORD||!env.ADMIN_SESSION_SECRET)return false;const [expected,actual]=await Promise.all([hmac(env.ADMIN_SESSION_SECRET,env.ADMIN_PASSWORD),hmac(env.ADMIN_SESSION_SECRET,String(candidate||''))]);return constantTimeEqual(expected,actual);}
async function createAdminToken(env,sessionEpoch=0){const payload=bytesToBase64Url(textEncoder.encode(JSON.stringify({sub:ADMIN_ID,exp:Math.floor(Date.now()/1000)+ADMIN_SESSION_SECONDS,sessionEpoch:Number(sessionEpoch)||0,nonce:crypto.randomUUID()}))),signature=await hmac(env.ADMIN_SESSION_SECRET,payload);return `${payload}.${signature}`;}
async function validAdminSession(request,env){if(!env.ADMIN_SESSION_SECRET)return false;try{const token=cookiesOf(request)[ADMIN_COOKIE]||'',[payload,signature]=token.split('.');if(!payload||!signature||!constantTimeEqual(signature,await hmac(env.ADMIN_SESSION_SECRET,payload)))return false;const data=JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));if(data.sub!==ADMIN_ID||Number(data.exp)<=Math.floor(Date.now()/1000))return false;const settings=await rankingStub(env).fetch(new Request('https://rankings.internal/admin/settings')),current=await settings.json();return Number(data.sessionEpoch||0)===Number(current.sessionEpoch||0);}catch{return false;}}
function adminCookie(request,token,maxAge=ADMIN_SESSION_SECONDS){const secure=new URL(request.url).protocol==='https:'?'; Secure':'';return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;}
function accountId(value=''){const id=String(value).trim();return /^[\p{L}\p{N}._-]{2,40}$/u.test(id)&&id!=='admin'?id:'';}
function managedUserId(value=''){const id=String(value).trim();return id&&id.length<=120&&!/[\u0000-\u001f\u007f]/u.test(id)?id:'';}
async function accountPasswordHash(userId,password,salt,env){return hmac(env.ADMIN_SESSION_SECRET,`account\0${userId}\0${salt}\0${password}`);}
async function createUserToken(userId,env){const payload=bytesToBase64Url(textEncoder.encode(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+USER_SESSION_SECONDS,nonce:crypto.randomUUID()}))),signature=await hmac(env.ADMIN_SESSION_SECRET,`user.${payload}`);return `${payload}.${signature}`;}
async function userFromSession(request,env){if(!env.ADMIN_SESSION_SECRET)return '';try{const token=cookiesOf(request)[USER_COOKIE]||'',[payload,signature]=token.split('.');if(!payload||!signature||!constantTimeEqual(signature,await hmac(env.ADMIN_SESSION_SECRET,`user.${payload}`)))return '';const data=JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))),userId=Number(data.exp)>Math.floor(Date.now()/1000)?accountId(data.sub):'';if(!userId)return '';const response=await rankingStub(env).fetch(new Request(`https://rankings.internal/account/auth-info?userId=${encodeURIComponent(userId)}`)),info=await response.json();return info.exists?userId:'';}catch{return '';}}
function userCookie(request,token,maxAge=USER_SESSION_SECONDS){const secure=new URL(request.url).protocol==='https:'?'; Secure':'';return `${USER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;}
function base64UrlJson(value){return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));}
async function verifyAccessJwt(request,env){
  const token=request.headers.get('cf-access-jwt-assertion');if(!token||!env.ADMIN_ACCESS_TEAM_DOMAIN||!env.ADMIN_ACCESS_AUD)return null;
  const parts=token.split('.');if(parts.length!==3)return null;
  try{
    const header=base64UrlJson(parts[0]),payload=base64UrlJson(parts[1]),teamDomain=String(env.ADMIN_ACCESS_TEAM_DOMAIN).replace(/\/$/,''),now=Math.floor(Date.now()/1000),audiences=Array.isArray(payload.aud)?payload.aud:[payload.aud];
    if(header.alg!=='RS256'||!header.kid||payload.iss!==teamDomain||!audiences.includes(String(env.ADMIN_ACCESS_AUD))||Number(payload.exp||0)<=now||Number(payload.nbf||0)>now)return null;
    const response=await fetch(`${teamDomain}/cdn-cgi/access/certs`,{cf:{cacheTtl:3600,cacheEverything:true}});if(!response.ok)return null;const jwks=await response.json(),jwk=(jwks.keys||[]).find(key=>key.kid===header.kid);if(!jwk)return null;
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']),valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,base64UrlToBytes(parts[2]),textEncoder.encode(`${parts[0]}.${parts[1]}`));
    return valid?payload:null;
  }catch{return null;}
}
async function accessEmail(request,env,ctx){if(ctx?.access){const identity=await ctx.access.getIdentity();if(identity?.email)return String(identity.email).trim().toLowerCase();}const payload=await verifyAccessJwt(request,env);return payload?.email?String(payload.email).trim().toLowerCase():'';}
function verificationPopup(message,success=false,eventType='gmuc-admin-email-verified'){const payload=JSON.stringify({type:success?eventType:'gmuc-admin-email-error',message});return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>관리자 이메일 인증</title><body style="font-family:system-ui,sans-serif;padding:40px;line-height:1.7"><h1>${success?'인증 완료':'인증 실패'}</h1><p>${message}</p><script>if(window.opener){window.opener.postMessage(${payload},location.origin);${success?'setTimeout(()=>window.close(),700);':''}}</script></body></html>`,{status:success?200:403,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-frame-options':'DENY'}});}

export class RankingStore {
  constructor(ctx){
    this.sql=ctx.storage.sql;
    ctx.blockConcurrencyWhile(async()=>{this.sql.exec(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id TEXT NOT NULL,book_key TEXT NOT NULL,title TEXT NOT NULL,authors TEXT NOT NULL,
        publisher TEXT NOT NULL,published_date TEXT NOT NULL,isbn TEXT NOT NULL,thumbnail TEXT NOT NULL,
        item_type TEXT NOT NULL DEFAULT 'book',doi TEXT NOT NULL DEFAULT '',landing_url TEXT NOT NULL DEFAULT '',match_score INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),PRIMARY KEY(user_id,book_key)
      );
      CREATE INDEX IF NOT EXISTS favorites_book_idx ON favorites(book_key);
      CREATE TABLE IF NOT EXISTS admin_settings (
        setting_key TEXT PRIMARY KEY,email TEXT NOT NULL,verified_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
        verification_version TEXT NOT NULL DEFAULT '',session_epoch INTEGER NOT NULL DEFAULT 0,
        pending_email TEXT NOT NULL DEFAULT '',pending_expires_at INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS admin_otps (
        purpose TEXT PRIMARY KEY,email TEXT NOT NULL,code_hash TEXT NOT NULL,salt TEXT NOT NULL,
        expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL,last_sent_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS admin_login_guard (
        client_key TEXT PRIMARY KEY,failures INTEGER NOT NULL,window_started_at INTEGER NOT NULL,blocked_until INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS accounts (
        user_id TEXT PRIMARY KEY,display_name TEXT NOT NULL,email TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,must_reset INTEGER NOT NULL DEFAULT 0,
        password_scheme TEXT NOT NULL DEFAULT 'hmac',
        reset_hash TEXT NOT NULL DEFAULT '',reset_salt TEXT NOT NULL DEFAULT '',reset_expires_at INTEGER NOT NULL DEFAULT 0,
        recommendation_requests INTEGER NOT NULL DEFAULT 0,recommended_book_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,last_login_at INTEGER NOT NULL,last_recommended_at INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS accounts_lookup_idx ON accounts(display_name,email);
      CREATE TABLE IF NOT EXISTS recommendation_sessions (
        session_id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,book_count INTEGER NOT NULL,
        profile_json TEXT NOT NULL,created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS recommendation_user_idx ON recommendation_sessions(user_id,created_at);
      CREATE TABLE IF NOT EXISTS user_registry (
        user_id TEXT PRIMARY KEY,created_at INTEGER NOT NULL,last_seen_at INTEGER NOT NULL
      );
    `);createChallengeSchema(this.sql);const columns=[...this.sql.exec('PRAGMA table_info(admin_settings)')];if(!columns.some(column=>column.name==='verification_version'))this.sql.exec("ALTER TABLE admin_settings ADD COLUMN verification_version TEXT NOT NULL DEFAULT ''");if(!columns.some(column=>column.name==='session_epoch'))this.sql.exec("ALTER TABLE admin_settings ADD COLUMN session_epoch INTEGER NOT NULL DEFAULT 0");if(!columns.some(column=>column.name==='pending_email'))this.sql.exec("ALTER TABLE admin_settings ADD COLUMN pending_email TEXT NOT NULL DEFAULT ''");if(!columns.some(column=>column.name==='pending_expires_at'))this.sql.exec("ALTER TABLE admin_settings ADD COLUMN pending_expires_at INTEGER NOT NULL DEFAULT 0");const accountColumns=[...this.sql.exec('PRAGMA table_info(accounts)')];if(!accountColumns.some(column=>column.name==='password_scheme'))this.sql.exec("ALTER TABLE accounts ADD COLUMN password_scheme TEXT NOT NULL DEFAULT 'hmac'");const favoriteColumns=[...this.sql.exec('PRAGMA table_info(favorites)')];if(!favoriteColumns.some(column=>column.name==='item_type'))this.sql.exec("ALTER TABLE favorites ADD COLUMN item_type TEXT NOT NULL DEFAULT 'book'");if(!favoriteColumns.some(column=>column.name==='doi'))this.sql.exec("ALTER TABLE favorites ADD COLUMN doi TEXT NOT NULL DEFAULT ''");if(!favoriteColumns.some(column=>column.name==='landing_url'))this.sql.exec("ALTER TABLE favorites ADD COLUMN landing_url TEXT NOT NULL DEFAULT ''");if(!favoriteColumns.some(column=>column.name==='match_score'))this.sql.exec("ALTER TABLE favorites ADD COLUMN match_score INTEGER NOT NULL DEFAULT 0");this.sql.exec("INSERT OR IGNORE INTO user_registry(user_id,created_at,last_seen_at) SELECT user_id,created_at,last_login_at FROM accounts");this.sql.exec("INSERT OR IGNORE INTO user_registry(user_id,created_at,last_seen_at) SELECT substr(user_id,9),MIN(created_at),MAX(created_at) FROM favorites WHERE user_id LIKE 'account:%' AND length(user_id)>8 GROUP BY substr(user_id,9)");this.sql.exec("INSERT OR IGNORE INTO user_registry(user_id,created_at,last_seen_at) VALUES('admin',unixepoch(),unixepoch())");});
  }

  async fetch(request){
    const url=new URL(request.url);

    const challengeResponse=await handleChallengeStoreRequest(this.sql,request,url);if(challengeResponse)return challengeResponse;

    if(request.method==='GET'&&url.pathname==='/admin/settings'){
      const row=[...this.sql.exec("SELECT email,verified_at,verification_version,session_epoch FROM admin_settings WHERE setting_key='primary' LIMIT 1")][0];
      return json({verified:Boolean(row?.verified_at),email:row?.email||'',verificationVersion:row?.verification_version||'',sessionEpoch:Number(row?.session_epoch||0)});
    }

    if(request.method==='POST'&&url.pathname==='/admin/settings/access-verify'){
      const body=await request.json(),email=validEmail(body.email),verificationVersion=String(body.verificationVersion||'').slice(0,100),mode=String(body.mode||'initial'),now=Math.floor(Date.now()/1000),row=[...this.sql.exec("SELECT session_epoch FROM admin_settings WHERE setting_key='primary' LIMIT 1")][0];
      if(!email||!verificationVersion)return json({error:'이메일 인증 정보가 올바르지 않습니다.'},400);
      const sessionEpoch=mode==='change'?Number(row?.session_epoch||0)+1:Number(row?.session_epoch||0);
      this.sql.exec(`INSERT INTO admin_settings(setting_key,email,verified_at,updated_at,verification_version,session_epoch,pending_email,pending_expires_at) VALUES('primary',?,?,?,?,?,?,?) ON CONFLICT(setting_key) DO UPDATE SET email=excluded.email,verified_at=excluded.verified_at,updated_at=excluded.updated_at,verification_version=excluded.verification_version,session_epoch=excluded.session_epoch,pending_email=excluded.pending_email,pending_expires_at=excluded.pending_expires_at`,email,now,now,verificationVersion,sessionEpoch,'',0);
      this.sql.exec("DELETE FROM admin_otps WHERE purpose='initial_email'");
      return json({ok:true,verified:true,email});
    }

    if(request.method==='GET'&&url.pathname==='/account/auth-info'){
      const userId=accountId(url.searchParams.get('userId')),row=userId?[...this.sql.exec('SELECT password_salt,password_scheme,must_reset,reset_salt FROM accounts WHERE user_id=? LIMIT 1',userId)][0]:null;
      return json({exists:Boolean(row),passwordSalt:row?.password_salt||'',passwordScheme:row?.password_scheme||'hmac',mustReset:Boolean(row?.must_reset),resetSalt:row?.reset_salt||''});
    }

    if(request.method==='POST'&&url.pathname==='/account/migrate-legacy'){
      const body=await request.json(),entries=Array.isArray(body.accounts)?body.accounts.slice(0,200):[],now=Math.floor(Date.now()/1000),migrated=[];
      for(const entry of entries){const userId=accountId(entry?.userId),legacyHash=String(entry?.legacyHash||'').toLowerCase();if(!userId||!/^[a-f0-9]{64}$/.test(legacyHash))continue;const exists=[...this.sql.exec('SELECT 1 AS found FROM accounts WHERE user_id=? LIMIT 1',userId)][0];if(!exists){this.sql.exec("INSERT INTO accounts(user_id,display_name,email,password_hash,password_salt,password_scheme,created_at,last_login_at) VALUES(?,?,?,?,?,?,?,?)",userId,userId,'',legacyHash,'legacy','sha256',now,now);migrated.push(userId);}this.sql.exec('INSERT INTO user_registry(user_id,created_at,last_seen_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen_at=excluded.last_seen_at',userId,now,now);}
      return json({ok:true,migrated});
    }

    if(request.method==='POST'&&url.pathname==='/account/login'){
      const body=await request.json(),userId=accountId(body.userId),now=Math.floor(Date.now()/1000);
      if(!userId)return json({error:'계정 정보가 올바르지 않습니다.'},400);
      const row=[...this.sql.exec('SELECT password_hash,password_salt,password_scheme,must_reset,reset_hash,reset_salt,reset_expires_at,display_name,email FROM accounts WHERE user_id=? LIMIT 1',userId)][0];
      if(!row){if(!body.passwordHash||!body.passwordSalt)return json({error:'계정 정보가 올바르지 않습니다.'},400);this.sql.exec('INSERT INTO accounts(user_id,display_name,email,password_hash,password_salt,created_at,last_login_at) VALUES(?,?,?,?,?,?,?)',userId,userId,'',String(body.passwordHash),String(body.passwordSalt),now,now);this.sql.exec('INSERT INTO user_registry(user_id,created_at,last_seen_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen_at=excluded.last_seen_at',userId,now,now);return json({ok:true,created:true,user:{userId}});}
      if(Number(row.must_reset)){
        const resetMatches=Boolean(row.reset_hash&&Number(row.reset_expires_at)>=now&&constantTimeEqual(row.reset_hash,String(body.resetCandidateHash||'')));
        if(!resetMatches)return json({error:'비밀번호가 일치하지 않거나 초기화 코드가 만료되었습니다.'},401);
        if(!body.newPasswordHash||!body.newPasswordSalt)return json({error:'새 비밀번호를 설정해 주세요.',code:'PASSWORD_RESET_REQUIRED'},409);
         this.sql.exec("UPDATE accounts SET password_hash=?,password_salt=?,password_scheme='hmac',must_reset=0,reset_hash='',reset_salt='',reset_expires_at=0,last_login_at=? WHERE user_id=?",String(body.newPasswordHash),String(body.newPasswordSalt),now,userId);this.sql.exec('INSERT INTO user_registry(user_id,created_at,last_seen_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen_at=excluded.last_seen_at',userId,now,now);
        return json({ok:true,passwordChanged:true,user:{userId}});
      }
      const legacyMatch=row.password_scheme==='sha256'&&/^[a-f0-9]{64}$/i.test(String(body.legacyPasswordHash||''))&&constantTimeEqual(row.password_hash,String(body.legacyPasswordHash));
      if(row.password_scheme==='sha256'? !legacyMatch : !constantTimeEqual(row.password_hash,String(body.passwordHash||'')))return json({error:'ID 또는 비밀번호가 일치하지 않습니다.'},401);
      if(row.password_scheme==='sha256')this.sql.exec("UPDATE accounts SET password_hash=?,password_salt=?,password_scheme='hmac',last_login_at=? WHERE user_id=?",String(body.passwordHash||''),String(body.passwordSalt||crypto.randomUUID()),now,userId);else this.sql.exec('UPDATE accounts SET last_login_at=? WHERE user_id=?',now,userId);this.sql.exec('INSERT INTO user_registry(user_id,created_at,last_seen_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen_at=excluded.last_seen_at',userId,now,now);
      return json({ok:true,user:{userId}});
    }

    if(request.method==='POST'&&url.pathname==='/account/delete'){
      const body=await request.json(),userId=accountId(body.userId),passwordHash=String(body.passwordHash||''),row=userId?[...this.sql.exec('SELECT password_hash,password_scheme,must_reset FROM accounts WHERE user_id=? LIMIT 1',userId)][0]:null;
      if(!row)return json({error:'계정을 찾지 못했습니다.'},404);
      if(Number(row.must_reset))return json({error:'비밀번호가 초기화된 계정입니다. 다시 로그인한 뒤 탈퇴해 주세요.'},409);
      if(row.password_scheme!=='hmac'||!passwordHash||!constantTimeEqual(row.password_hash,passwordHash))return json({error:'비밀번호가 일치하지 않습니다.'},401);
      const attachmentKeys=deleteChallengeAccountData(this.sql,userId);
      this.sql.exec('DELETE FROM recommendation_sessions WHERE user_id=?',userId);
      this.sql.exec("DELETE FROM favorites WHERE user_id='account:'||?",userId);
      this.sql.exec('DELETE FROM user_registry WHERE user_id=?',userId);
      this.sql.exec('DELETE FROM accounts WHERE user_id=?',userId);
      return json({ok:true,deleted:true,userId,attachmentKeys});
    }

    if(request.method==='POST'&&url.pathname==='/recommendations/log'){
      const body=await request.json(),userId=accountId(body.userId),bookCount=Math.max(0,Math.min(1000,Number(body.bookCount)||0)),now=Math.floor(Date.now()/1000);
      if(!userId)return json({ok:true,ignored:true});const exists=[...this.sql.exec('SELECT 1 AS found FROM accounts WHERE user_id=? LIMIT 1',userId)][0];if(!exists)return json({ok:true,ignored:true});
      this.sql.exec('INSERT INTO recommendation_sessions(user_id,book_count,profile_json,created_at) VALUES(?,?,?,?)',userId,bookCount,JSON.stringify(body.profile||{}).slice(0,4000),now);
      this.sql.exec('UPDATE accounts SET recommendation_requests=recommendation_requests+1,recommended_book_count=recommended_book_count+?,last_recommended_at=? WHERE user_id=?',bookCount,now,userId);this.sql.exec('INSERT INTO user_registry(user_id,created_at,last_seen_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen_at=excluded.last_seen_at',userId,now,now);return json({ok:true});
    }

    if(request.method==='GET'&&url.pathname==='/admin/users'){
      const query=String(url.searchParams.get('query')||'').trim().slice(0,120),like=`%${query}%`,knownUsers=`SELECT user_id FROM user_registry UNION SELECT user_id FROM accounts UNION SELECT substr(user_id,9) AS user_id FROM favorites WHERE user_id LIKE 'account:%' AND length(user_id)>8 UNION SELECT 'admin' AS user_id`,rows=[...this.sql.exec(`SELECT k.user_id,COALESCE(a.must_reset,0) AS must_reset,COALESCE(a.created_at,r.created_at,(SELECT MIN(f.created_at) FROM favorites f WHERE f.user_id='account:'||k.user_id),0) AS created_at,COALESCE(a.last_login_at,r.last_seen_at,(SELECT MAX(f.created_at) FROM favorites f WHERE f.user_id='account:'||k.user_id),0) AS last_login_at,COALESCE(a.last_recommended_at,0) AS last_recommended_at,(SELECT COUNT(*) FROM favorites f WHERE f.user_id='account:'||k.user_id) AS favorite_count FROM (${knownUsers}) k LEFT JOIN accounts a ON a.user_id=k.user_id LEFT JOIN user_registry r ON r.user_id=k.user_id WHERE k.user_id='admin' OR ?='' OR k.user_id LIKE ? ORDER BY CASE WHEN k.user_id='admin' THEN 0 ELSE 1 END,favorite_count DESC,last_login_at DESC LIMIT 200`,query,like)],summary=[...this.sql.exec(`SELECT COUNT(*) AS user_count,COALESCE(SUM((SELECT COUNT(*) FROM favorites f WHERE f.user_id='account:'||k.user_id)),0) AS book_count,(SELECT COUNT(DISTINCT book_key) FROM favorites WHERE user_id LIKE 'account:%') AS book_type_count FROM (${knownUsers}) k`)][0];
      return json({users:rows.map(row=>({userId:row.user_id,isAdmin:row.user_id===ADMIN_ID,mustReset:Boolean(row.must_reset),recommendedBookCount:Number(row.favorite_count),favoriteCount:Number(row.favorite_count),createdAt:Number(row.created_at),lastLoginAt:Number(row.last_login_at),lastRecommendedAt:Number(row.last_recommended_at)})),summary:{userCount:Number(summary?.user_count||0),bookCount:Number(summary?.book_count||0),bookTypeCount:Number(summary?.book_type_count||0)}});
    }

    if(request.method==='POST'&&url.pathname==='/admin/users/recommendations/reset'){
      const body=await request.json(),userId=managedUserId(body.userId),now=Math.floor(Date.now()/1000);if(!userId)return json({error:'초기화할 사용자 ID를 확인해 주세요.'},400);const known=userId===ADMIN_ID||[...this.sql.exec("SELECT 1 AS found FROM user_registry WHERE user_id=? UNION SELECT 1 AS found FROM accounts WHERE user_id=? UNION SELECT 1 AS found FROM favorites WHERE user_id='account:'||? LIMIT 1",userId,userId,userId)][0];if(!known)return json({error:'사용자를 찾지 못했습니다.'},404);this.sql.exec('INSERT INTO user_registry(user_id,created_at,last_seen_at) VALUES(?,?,?) ON CONFLICT(user_id) DO NOTHING',userId,now,now);this.sql.exec('DELETE FROM recommendation_sessions WHERE user_id=?',userId);this.sql.exec("DELETE FROM favorites WHERE user_id='account:'||?",userId);this.sql.exec('UPDATE accounts SET recommendation_requests=0,recommended_book_count=0,last_recommended_at=0 WHERE user_id=?',userId);return json({ok:true,userId,accountPreserved:true});
    }

    if(request.method==='POST'&&url.pathname==='/admin/users/password/reset'){
      const body=await request.json(),userId=managedUserId(body.userId),resetHash=String(body.resetHash||''),resetSalt=String(body.resetSalt||''),now=Math.floor(Date.now()/1000),expiresAt=now+1800;if(!userId||userId===ADMIN_ID||!resetHash||!resetSalt)return json({error:'비밀번호 초기화 요청이 올바르지 않습니다.'},400);const known=[...this.sql.exec("SELECT 1 AS found FROM user_registry WHERE user_id=? UNION SELECT 1 AS found FROM accounts WHERE user_id=? UNION SELECT 1 AS found FROM favorites WHERE user_id='account:'||? LIMIT 1",userId,userId,userId)][0];if(!known)return json({error:'사용자를 찾지 못했습니다.'},404);this.sql.exec(`INSERT INTO accounts(user_id,display_name,email,password_hash,password_salt,password_scheme,must_reset,reset_hash,reset_salt,reset_expires_at,created_at,last_login_at) VALUES(?,?,?,'','','hmac',1,?,?,?, ?,?) ON CONFLICT(user_id) DO UPDATE SET must_reset=1,reset_hash=excluded.reset_hash,reset_salt=excluded.reset_salt,reset_expires_at=excluded.reset_expires_at`,userId,userId,'',resetHash,resetSalt,expiresAt,now,now);this.sql.exec('INSERT INTO user_registry(user_id,created_at,last_seen_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen_at=excluded.last_seen_at',userId,now,now);return json({ok:true,userId,expiresAt});
    }

    if(request.method==='POST'&&url.pathname==='/admin/login-guard'){
      const body=await request.json(),clientKey=String(body.clientKey||'').slice(0,100),now=Math.floor(Date.now()/1000);
      if(!clientKey)return json({error:'잘못된 요청입니다.'},400);
      const row=[...this.sql.exec('SELECT failures,window_started_at,blocked_until FROM admin_login_guard WHERE client_key=? LIMIT 1',clientKey)][0];
      if(body.success===true){this.sql.exec('DELETE FROM admin_login_guard WHERE client_key=?',clientKey);return json({allowed:true});}
      if(Number(row?.blocked_until||0)>now)return json({allowed:false,retryAfter:Number(row.blocked_until)-now},429);
      if(body.success!==false)return json({allowed:true});
      const withinWindow=row&&now-Number(row.window_started_at)<900,windowStarted=withinWindow?Number(row.window_started_at):now,failures=(withinWindow?Number(row.failures):0)+1,blockedUntil=failures>=5?now+900:0;
      this.sql.exec(`INSERT INTO admin_login_guard(client_key,failures,window_started_at,blocked_until) VALUES(?,?,?,?) ON CONFLICT(client_key) DO UPDATE SET failures=excluded.failures,window_started_at=excluded.window_started_at,blocked_until=excluded.blocked_until`,clientKey,failures,windowStarted,blockedUntil);
      return json({allowed:blockedUntil===0,retryAfter:blockedUntil?900:0},blockedUntil?429:200);
    }

    if(request.method==='POST'&&url.pathname==='/admin/otp/create'){
      const body=await request.json(),purpose=String(body.purpose||''),email=String(body.email||'').trim().toLowerCase(),now=Math.floor(Date.now()/1000);
      if(purpose!=='initial_email'||email.length>254||!/^\S+@\S+\.\S+$/.test(email))return json({error:'잘못된 이메일 인증 요청입니다.'},400);
      const previous=[...this.sql.exec('SELECT last_sent_at FROM admin_otps WHERE purpose=? LIMIT 1',purpose)][0],wait=60-(now-Number(previous?.last_sent_at||0));
      if(wait>0)return json({error:`인증번호는 ${wait}초 후 다시 요청할 수 있습니다.`,retryAfter:wait},429);
      const random=new Uint32Array(1);crypto.getRandomValues(random);const code=String(random[0]%1000000).padStart(6,'0'),salt=crypto.randomUUID(),codeHash=await sha256(`${salt}:${code}`),expiresAt=now+600;
      this.sql.exec(`INSERT INTO admin_otps(purpose,email,code_hash,salt,expires_at,attempts,last_sent_at) VALUES(?,?,?,?,?,0,?) ON CONFLICT(purpose) DO UPDATE SET email=excluded.email,code_hash=excluded.code_hash,salt=excluded.salt,expires_at=excluded.expires_at,attempts=0,last_sent_at=excluded.last_sent_at`,purpose,email,codeHash,salt,expiresAt,now);
      return json({code,expiresAt});
    }

    if(request.method==='POST'&&url.pathname==='/admin/otp/cancel'){
      const body=await request.json();this.sql.exec('DELETE FROM admin_otps WHERE purpose=? AND email=?',String(body.purpose||''),String(body.email||''));return json({ok:true});
    }

    if(request.method==='POST'&&url.pathname==='/admin/otp/verify'){
      const body=await request.json(),purpose=String(body.purpose||''),email=String(body.email||'').trim().toLowerCase(),code=String(body.code||'').trim(),now=Math.floor(Date.now()/1000),row=[...this.sql.exec('SELECT email,code_hash,salt,expires_at,attempts FROM admin_otps WHERE purpose=? LIMIT 1',purpose)][0];
      if(!/^\d{6}$/.test(code))return json({error:'6자리 인증번호를 입력해 주세요.'},400);
      if(!row||row.email!==email)return json({error:'인증번호를 먼저 발송해 주세요.'},400);
      if(Number(row.expires_at)<now){this.sql.exec('DELETE FROM admin_otps WHERE purpose=?',purpose);return json({error:'인증번호가 만료되었습니다. 다시 발송해 주세요.'},400);}
      if(Number(row.attempts)>=5)return json({error:'입력 횟수를 초과했습니다. 새 인증번호를 발송해 주세요.'},429);
      const matches=constantTimeEqual(row.code_hash,await sha256(`${row.salt}:${code}`));
      if(!matches){this.sql.exec('UPDATE admin_otps SET attempts=attempts+1 WHERE purpose=?',purpose);return json({error:'인증번호가 일치하지 않습니다.'},400);}
      const verificationVersion=String(body.verificationVersion||'').slice(0,100);if(!verificationVersion)return json({error:'이메일 인증 설정이 올바르지 않습니다.'},500);
      this.sql.exec(`INSERT INTO admin_settings(setting_key,email,verified_at,updated_at,verification_version) VALUES('primary',?,?,?,?) ON CONFLICT(setting_key) DO UPDATE SET email=excluded.email,verified_at=excluded.verified_at,updated_at=excluded.updated_at,verification_version=excluded.verification_version`,email,now,now,verificationVersion);
      this.sql.exec('DELETE FROM admin_otps WHERE purpose=?',purpose);
      return json({ok:true,verified:true,email});
    }

    if(request.method==='POST'&&url.pathname==='/favorite'){
      const body=await request.json(),userId=String(body.userId||'').slice(0,128),book=body.book||{},key=String(book.isbn||book.title||'').slice(0,200);
      if(!userId||!key||!book.title)return json({error:'필수 정보가 없습니다.'},400);
      const registryId=userId.startsWith('account:')?managedUserId(userId.slice(8)):'';if(registryId){const now=Math.floor(Date.now()/1000);this.sql.exec('INSERT INTO user_registry(user_id,created_at,last_seen_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen_at=excluded.last_seen_at',registryId,now,now);}
      if(body.saved)this.sql.exec(`INSERT INTO favorites(user_id,book_key,title,authors,publisher,published_date,isbn,thumbnail,item_type,doi,landing_url,match_score) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,book_key) DO UPDATE SET title=excluded.title,authors=excluded.authors,publisher=excluded.publisher,published_date=excluded.published_date,isbn=excluded.isbn,thumbnail=excluded.thumbnail,item_type=excluded.item_type,doi=excluded.doi,landing_url=excluded.landing_url,match_score=excluded.match_score`,userId,key,String(book.title).slice(0,300),JSON.stringify(book.authors||[]),String(book.publisher||'').slice(0,200),String(book.publishedDate||book.year||'').slice(0,30),String(book.isbn||'').slice(0,20),String(book.thumbnail||'').slice(0,1000),book.type==='paper'?'paper':'book',String(book.doi||'').slice(0,500),String(book.landingUrl||'').slice(0,1000),Math.max(0,Math.min(100,Number(book.match)||0)));
      else this.sql.exec('DELETE FROM favorites WHERE user_id=? AND book_key=?',userId,key);
      return json({ok:true});
    }
    if(request.method==='GET'&&url.pathname==='/shelf'){
      const userId=String(url.searchParams.get('userId')||'').slice(0,120),rows=[...this.sql.exec('SELECT title,authors,publisher,published_date,isbn,thumbnail,item_type,doi,landing_url,match_score FROM favorites WHERE user_id=? ORDER BY created_at DESC',userId)];
      return json({books:rows.map(row=>({type:row.item_type==='paper'?'paper':'book',title:row.title,authors:JSON.parse(row.authors||'[]'),publisher:row.publisher,publishedDate:row.published_date,isbn:row.isbn,thumbnail:row.thumbnail,doi:row.doi,landingUrl:row.landing_url,match:Number(row.match_score||0)}))});
    }
    if(request.method==='GET'&&url.pathname==='/rankings'){
      const rows=[...this.sql.exec(`SELECT book_key,title,authors,publisher,published_date,isbn,thumbnail,item_type,doi,landing_url,COUNT(*) AS favorite_count FROM favorites GROUP BY book_key ORDER BY favorite_count DESC,MAX(created_at) DESC LIMIT 100`)];
      return json({books:rows.map(row=>({type:row.item_type==='paper'?'paper':'book',title:row.title,authors:JSON.parse(row.authors||'[]'),publisher:row.publisher,publishedDate:row.published_date,isbn:row.isbn,thumbnail:row.thumbnail,doi:row.doi,landingUrl:row.landing_url,favoriteCount:Number(row.favorite_count),match:Math.min(99,70+Number(row.favorite_count))}))});
    }
    return json({error:'Not found'},404);
  }
}

function rankingStub(env){const id=env.RANKINGS.idFromName('global-book-ranking');return env.RANKINGS.get(id);}

const CHALLENGE_FILE_TYPES=new Set(['image/jpeg','image/png','image/webp','image/gif','application/pdf']);
const CHALLENGE_FILE_LIMIT=10*1024*1024;
const CHALLENGE_TOTAL_LIMIT=50*1024*1024;
function challengeInternal(env,path,options={}){return rankingStub(env).fetch(new Request(`https://rankings.internal${path}`,options));}
function safeAttachmentName(value=''){return String(value).replace(/[\u0000-\u001f\u007f/\\]/g,'_').trim().slice(0,180)||'attachment';}
function validAttachmentSignature(bytes,mime){
  if(mime==='image/jpeg')return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  if(mime==='image/png')return bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a&&bytes[6]===0x1a&&bytes[7]===0x0a;
  if(mime==='image/webp')return String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(mime==='image/gif'){const head=String.fromCharCode(...bytes.slice(0,6));return head==='GIF87a'||head==='GIF89a';}
  if(mime==='application/pdf')return String.fromCharCode(...bytes.slice(0,5))==='%PDF-';
  return false;
}
async function deleteChallengeObjects(env,keys=[]){if(!env.CHALLENGE_FILES||!keys.length)return;await Promise.allSettled([...new Set(keys.filter(Boolean))].map(key=>env.CHALLENGE_FILES.delete(key)));}

async function challengeApi(request,env,url){
  if(request.method!=='GET'&&!sameOrigin(request))return json({error:'허용되지 않은 요청입니다.'},403);
  if(request.method==='GET'&&url.pathname==='/api/challenges')return challengeInternal(env,'/challenges/boards');
  const attachmentMatch=url.pathname.match(/^\/api\/challenges\/attachments\/([\w-]+)$/);
  if(request.method==='GET'&&attachmentMatch){
    if(!env.CHALLENGE_FILES)return json({error:'첨부파일 저장소가 아직 연결되지 않았습니다.'},503);
    const metadataResponse=await challengeInternal(env,`/challenges/attachment?attachmentId=${encodeURIComponent(attachmentMatch[1])}`),metadata=await metadataResponse.json();if(!metadataResponse.ok)return json(metadata,metadataResponse.status);
    const object=await env.CHALLENGE_FILES.get(metadata.attachment.key);if(!object)return json({error:'첨부파일 원본을 찾지 못했습니다.'},404);const filename=encodeURIComponent(metadata.attachment.name),headers=new Headers({'content-type':metadata.attachment.mime,'content-length':String(metadata.attachment.size),'content-disposition':`inline; filename*=UTF-8''${filename}`,'cache-control':'private, max-age=300','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"});return new Response(object.body,{headers});
  }
  const postDetailMatch=url.pathname.match(/^\/api\/challenges\/posts\/([\w-]+)$/);
  if(request.method==='GET'&&postDetailMatch)return challengeInternal(env,`/challenges/post?postId=${encodeURIComponent(postDetailMatch[1])}`);
  const commentMatch=url.pathname.match(/^\/api\/challenges\/posts\/([\w-]+)\/comments$/);
  if(request.method==='POST'&&commentMatch){const userId=await userFromSession(request,env);if(!userId)return json({error:'댓글을 작성하려면 로그인해 주세요.'},401);const body=await request.json().catch(()=>({}));return challengeInternal(env,'/challenges/comments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({postId:commentMatch[1],authorId:userId,body:body.body})});}
  const postsMatch=url.pathname.match(/^\/api\/challenges\/([\w-]+)\/posts$/);
  if(postsMatch&&request.method==='GET'){const target=new URL('https://rankings.internal/challenges/posts');target.searchParams.set('boardId',postsMatch[1]);target.searchParams.set('page',url.searchParams.get('page')||'1');target.searchParams.set('query',url.searchParams.get('query')||'');return rankingStub(env).fetch(new Request(target));}
  if(postsMatch&&request.method==='POST'){
    const userId=await userFromSession(request,env);if(!userId)return json({error:'게시글을 작성하려면 로그인해 주세요.'},401);if(!String(request.headers.get('content-type')||'').toLowerCase().includes('multipart/form-data'))return json({error:'게시글은 첨부 가능한 양식으로 전송해 주세요.'},415);
    const form=await request.formData(),files=form.getAll('files').filter(file=>file&&typeof file.arrayBuffer==='function');if(files.length>10)return json({error:'첨부파일은 최대 10개까지 등록할 수 있습니다.'},400);const total=files.reduce((sum,file)=>sum+Number(file.size||0),0);if(total>CHALLENGE_TOTAL_LIMIT)return json({error:'첨부파일 전체 크기는 50MB를 넘을 수 없습니다.'},413);if(files.length&&!env.CHALLENGE_FILES)return json({error:'첨부파일 저장소가 아직 연결되지 않았습니다.'},503);
    const postId=crypto.randomUUID(),uploads=[],metadata=[];
    try{
      for(const file of files){const mime=String(file.type||'').toLowerCase(),size=Number(file.size||0),name=safeAttachmentName(file.name);if(!CHALLENGE_FILE_TYPES.has(mime))throw Object.assign(new Error(`${name}: 지원하지 않는 파일 형식입니다.`),{status:415});if(size<1||size>CHALLENGE_FILE_LIMIT)throw Object.assign(new Error(`${name}: 파일 크기는 10MB 이하여야 합니다.`),{status:413});const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer.slice(0,16));if(!validAttachmentSignature(bytes,mime))throw Object.assign(new Error(`${name}: 파일 내용과 형식이 일치하지 않습니다.`),{status:415});const attachmentId=crypto.randomUUID(),key=`challenge/${postId}/${attachmentId}`;await env.CHALLENGE_FILES.put(key,buffer,{httpMetadata:{contentType:mime},customMetadata:{postId,attachmentId,originalName:encodeURIComponent(name)}});uploads.push(key);metadata.push({id:attachmentId,key,name,mime,size});}
      const response=await challengeInternal(env,'/challenges/posts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({postId,boardId:postsMatch[1],authorId:userId,title:form.get('title'),body:form.get('body'),achievement:form.get('achievement'),attachments:metadata})});if(!response.ok)await deleteChallengeObjects(env,uploads);return response;
    }catch(error){await deleteChallengeObjects(env,uploads);return json({error:error.message||'첨부파일을 처리하지 못했습니다.'},Number(error.status)||500);}
  }
  return json({error:'Not found'},404);
}

async function getAdminState(env){
  const initialEmail=validEmail(env.ADMIN_INITIAL_EMAIL),verificationVersion=String(env.ADMIN_EMAIL_VERIFICATION_VERSION||''),response=await rankingStub(env).fetch(new Request('https://rankings.internal/admin/settings')),
    stored=await response.json(),activeEmail=validEmail(stored.email)||initialEmail,verified=Boolean(verificationVersion&&stored.verified&&activeEmail&&constantTimeEqual(stored.email,activeEmail)&&constantTimeEqual(stored.verificationVersion,verificationVersion));
  return {adminId:ADMIN_ID,emailVerified:verified,maskedEmail:maskEmail(activeEmail),email:activeEmail,sessionEpoch:Number(stored.sessionEpoch||0),accessConfigured:Boolean(env.ADMIN_ACCESS_ENABLED&&env.ADMIN_ACCESS_TEAM_DOMAIN&&env.ADMIN_ACCESS_AUD)};
}

async function accountApi(request,env,url){
  if(request.method!=='GET'&&!sameOrigin(request))return json({error:'허용되지 않은 요청입니다.'},403);
  if(request.method==='POST'&&url.pathname==='/api/account/logout')return json({ok:true},200,{'set-cookie':userCookie(request,'',0)});
  if(request.method==='GET'&&url.pathname==='/api/account/session'){const userId=await userFromSession(request,env);return userId?json({ok:true,userId}):json({error:'로그인이 필요합니다.'},401);}
  if(request.method==='POST'&&url.pathname==='/api/account/recommendations/log'){const userId=await userFromSession(request,env);if(!userId)return json({error:'로그인이 필요합니다.'},401);const body=await request.json();return rankingStub(env).fetch(new Request('https://rankings.internal/recommendations/log',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId,bookCount:body.bookCount,profile:body.profile})}));}
  if(request.method==='POST'&&url.pathname==='/api/account/migrate-legacy'){const body=await request.json().catch(()=>({})),accounts=Array.isArray(body.accounts)?body.accounts.slice(0,200):[],response=await rankingStub(env).fetch(new Request('https://rankings.internal/account/migrate-legacy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({accounts})}));return response;}
  if(request.method==='POST'&&url.pathname==='/api/account/delete'){
    if(!env.ADMIN_SESSION_SECRET)return json({error:'계정 보안 설정이 완료되지 않았습니다.'},503);
    const userId=await userFromSession(request,env);if(!userId)return json({error:'로그인이 필요합니다.'},401);
    const body=await request.json().catch(()=>({})),password=String(body.password||'');if(password.length<4||password.length>200)return json({error:'현재 비밀번호를 입력해 주세요.'},400);
    const stub=rankingStub(env),infoResponse=await stub.fetch(new Request(`https://rankings.internal/account/auth-info?userId=${encodeURIComponent(userId)}`)),info=await infoResponse.json();if(!info.exists||!info.passwordSalt)return json({error:'계정을 찾지 못했습니다.'},404);
    const passwordHash=await accountPasswordHash(userId,password,info.passwordSalt,env),response=await stub.fetch(new Request('https://rankings.internal/account/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId,passwordHash})})),result=await response.json();if(response.ok)await deleteChallengeObjects(env,result.attachmentKeys||[]);
    return response.ok?json(result,200,{'set-cookie':userCookie(request,'',0)}):json(result,response.status);
  }
  if(request.method!=='POST'||url.pathname!=='/api/account/login')return json({error:'Not found'},404);
  if(!env.ADMIN_SESSION_SECRET)return json({error:'계정 보안 설정이 완료되지 않았습니다.'},503);
  const body=await request.json(),userId=accountId(body.id),password=String(body.password||''),newPassword=String(body.newPassword||'');
  if(!userId||password.length<4||password.length>200)return json({error:'ID 또는 비밀번호가 올바르지 않습니다.'},400);
  if(newPassword&&(newPassword.length<6||newPassword.length>200))return json({error:'새 비밀번호는 6자 이상 입력해 주세요.'},400);
  const stub=rankingStub(env),infoResponse=await stub.fetch(new Request(`https://rankings.internal/account/auth-info?userId=${encodeURIComponent(userId)}`)),info=await infoResponse.json(),passwordSalt=info.passwordSalt||crypto.randomUUID(),passwordHash=await accountPasswordHash(userId,password,passwordSalt,env),resetCandidateHash=info.resetSalt?await accountPasswordHash(userId,password,info.resetSalt,env):'',newPasswordSalt=newPassword?crypto.randomUUID():'',newPasswordHash=newPassword?await accountPasswordHash(userId,newPassword,newPasswordSalt,env):'';
  const response=await stub.fetch(new Request('https://rankings.internal/account/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId,passwordHash,passwordSalt,legacyPasswordHash:String(body.legacyPasswordHash||''),resetCandidateHash,newPasswordHash,newPasswordSalt})})),result=await response.json();
  if(!response.ok)return json(result,response.status);const token=await createUserToken(userId,env);return json(result,200,{'set-cookie':userCookie(request,token)});
}

async function adminApi(request,env,url,ctx){
  if(request.method!=='GET'&&!sameOrigin(request))return json({error:'허용되지 않은 요청입니다.'},403);
  const stub=rankingStub(env);

  if(request.method==='POST'&&url.pathname==='/api/admin/logout')return json({ok:true},200,{'set-cookie':adminCookie(request,'',0)});

  if(request.method==='POST'&&url.pathname==='/api/admin/login'){
    if(!env.ADMIN_PASSWORD||!env.ADMIN_SESSION_SECRET||!env.ADMIN_INITIAL_EMAIL)return json({error:'관리자 보안 설정이 완료되지 않았습니다.'},503);
    const ip=request.headers.get('cf-connecting-ip')||'unknown',clientKey=await hmac(env.ADMIN_SESSION_SECRET,ip),guardUrl='https://rankings.internal/admin/login-guard',check=await stub.fetch(new Request(guardUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({clientKey})}));
    if(!check.ok){const guard=await check.json();return json({error:`로그인 시도가 너무 많습니다. ${Math.ceil(Number(guard.retryAfter||900)/60)}분 후 다시 시도해 주세요.`},429);}
    const body=await request.json(),matches=String(body.id||'')===ADMIN_ID&&await passwordMatches(body.password,env);
    const result=await stub.fetch(new Request(guardUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({clientKey,success:matches})}));
    if(!matches){if(result.status===429)return json({error:'로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.'},429);return json({error:'ID 또는 비밀번호가 일치하지 않습니다.'},401);}
    const state=await getAdminState(env),token=await createAdminToken(env,state.sessionEpoch);
    return json({ok:true,...state},200,{'set-cookie':adminCookie(request,token)});
  }

  if(!await validAdminSession(request,env))return json({error:'관리자 로그인이 필요합니다.'},401);

  if(request.method==='GET'&&url.pathname==='/api/admin/email/access-verify'){
    if(!env.ADMIN_ACCESS_ENABLED)return verificationPopup('Cloudflare 이메일 인증 연결이 아직 활성화되지 않았습니다.');
    const mode=url.searchParams.get('mode')==='change'?'change':'initial',state=await getAdminState(env),verificationVersion=String(env.ADMIN_EMAIL_VERIFICATION_VERSION||'');
    const verifiedEmail=validEmail(await accessEmail(request,env,ctx)),expectedEmail=mode==='change'?verifiedEmail:state.email;
    if(!verifiedEmail)return verificationPopup('Cloudflare 이메일 인증 정보를 확인하지 못했습니다. 인증 창을 닫고 다시 시도해 주세요.');
    if(mode==='change'&&constantTimeEqual(verifiedEmail,state.email))return verificationPopup('현재 관리자 이메일과 다른 새 이메일로 인증해 주세요.');
    if(mode!=='change'&&!constantTimeEqual(verifiedEmail,expectedEmail))return verificationPopup('등록된 관리자 이메일과 인증한 이메일이 일치하지 않습니다.');
    if(!verificationVersion)return verificationPopup('관리자 이메일 인증 버전이 설정되지 않았습니다.');
    const saved=await stub.fetch(new Request('https://rankings.internal/admin/settings/access-verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:verifiedEmail,verificationVersion,mode})}));
    if(!saved.ok)return verificationPopup('관리자 이메일 인증 상태를 저장하지 못했습니다.');
    return verificationPopup(mode==='change'?'관리자 이메일이 변경되었습니다. 다시 로그인해 주세요.':'관리자 이메일 인증이 완료되었습니다. 이 창은 자동으로 닫힙니다.',true,mode==='change'?'gmuc-admin-email-changed':'gmuc-admin-email-verified');
  }

  if(request.method==='GET'&&url.pathname==='/api/admin/status')return json({ok:true,...await getAdminState(env)});

  if(url.pathname.startsWith('/api/admin/challenges')){
    const state=await getAdminState(env);if(!state.emailVerified)return json({error:'관리자 이메일 인증을 먼저 완료해 주세요.'},403);
    if(request.method==='GET'&&url.pathname==='/api/admin/challenges/boards')return challengeInternal(env,'/challenges/boards?includeArchived=1');
    if(request.method==='GET'&&url.pathname==='/api/admin/challenges/posts'){const target=new URL('https://rankings.internal/challenges/posts');for(const key of ['boardId','page','query'])target.searchParams.set(key,url.searchParams.get(key)||'');return rankingStub(env).fetch(new Request(target));}
    if(request.method==='GET'&&url.pathname==='/api/admin/challenges/stats'){const target=new URL('https://rankings.internal/admin/challenges/stats');for(const key of ['boardId','query'])target.searchParams.set(key,url.searchParams.get(key)||'');return rankingStub(env).fetch(new Request(target));}
    const body=await request.json().catch(()=>({})),payload={...body,adminId:ADMIN_ID},routeMap={
      '/api/admin/challenges/boards/save':'/admin/challenges/boards/save','/api/admin/challenges/boards/archive':'/admin/challenges/boards/archive','/api/admin/challenges/boards/delete':'/admin/challenges/boards/delete','/api/admin/challenges/posts/progress':'/admin/challenges/posts/progress','/api/admin/challenges/posts/delete':'/admin/challenges/posts/delete','/api/admin/challenges/comments/delete':'/admin/challenges/comments/delete'
    },internalPath=routeMap[url.pathname];if(!internalPath)return json({error:'Not found'},404);const response=await challengeInternal(env,internalPath,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),result=await response.json();if(response.ok&&result.attachmentKeys)await deleteChallengeObjects(env,result.attachmentKeys);return json(result,response.status);
  }

  if(url.pathname.startsWith('/api/admin/users')){
    const state=await getAdminState(env);if(!state.emailVerified)return json({error:'관리자 이메일 인증을 먼저 완료해 주세요.'},403);
    if(request.method==='GET'&&url.pathname==='/api/admin/users'){const target=new URL('https://rankings.internal/admin/users');target.searchParams.set('query',url.searchParams.get('query')||'');return stub.fetch(new Request(target));}
    const body=await request.json(),userId=managedUserId(body.userId);if(!userId)return json({error:'초기화할 사용자 ID를 확인해 주세요.'},400);
    if(request.method==='POST'&&url.pathname==='/api/admin/users/recommendations/reset')return stub.fetch(new Request('https://rankings.internal/admin/users/recommendations/reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId})}));
    if(request.method==='POST'&&url.pathname==='/api/admin/users/password/reset'){
      if(userId===ADMIN_ID)return json({error:'관리자 비밀번호는 Cloudflare 비밀값에서 관리됩니다.'},400);
      const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',random=new Uint8Array(8);crypto.getRandomValues(random);const resetCode=`GMUC-${[...random].map(value=>alphabet[value%alphabet.length]).join('')}`,resetSalt=crypto.randomUUID(),resetHash=await accountPasswordHash(userId,resetCode,resetSalt,env),response=await stub.fetch(new Request('https://rankings.internal/admin/users/password/reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId,resetHash,resetSalt})})),result=await response.json();return response.ok?json({...result,resetCode}):json(result,response.status);
    }
  }

  return json({error:'Not found'},404);
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    try{
      if(request.method==='GET'&&url.pathname==='/go/yes24'){
        const isbn=String(url.searchParams.get('isbn')||'').replace(/[^0-9X]/gi,'').slice(0,20),title=String(url.searchParams.get('title')||'').slice(0,200),target=await yes24ProductUrl(isbn,title);
        return new Response(null,{status:302,headers:{location:target,'cache-control':'public, max-age=86400','referrer-policy':'no-referrer'}});
      }
      if(url.pathname.startsWith('/api/account/'))return await accountApi(request,env,url);
      if(url.pathname.startsWith('/api/admin/'))return await adminApi(request,env,url,ctx);
      if(url.pathname.startsWith('/api/challenges'))return await challengeApi(request,env,url);
      if(request.method==='GET'&&url.pathname==='/api/cover'){
        const isbn=(url.searchParams.get('isbn')||'').replace(/[^0-9X]/gi,''),metadata={title:(url.searchParams.get('title')||'').slice(0,200),author:(url.searchParams.get('author')||'').slice(0,120),publisher:(url.searchParams.get('publisher')||'').slice(0,120),source:(url.searchParams.get('source')||'').slice(0,2000)};
        if(!isbn&&!metadata.title)return json({error:'ISBN 또는 제목이 필요합니다.'},400);
        const cache=globalThis.caches?.default,cached=cache?await cache.match(request):null;if(cached)return cached;
        const response=await proxyCover(isbn,metadata,env);if(response.ok&&cache)ctx.waitUntil(cache.put(request,response.clone()));return response;
      }
      if(request.method==='GET'&&url.pathname==='/api/paper-availability'){
        const title=clean(url.searchParams.get('title')||'').slice(0,300);if(!title)return json({error:'논문 제목이 필요합니다.'},400);const cache=globalThis.caches?.default,cached=cache?await cache.match(request):null;if(cached)return cached;const response=json(await paperAvailability(title),200,{'cache-control':'public, max-age=86400'});if(cache)ctx.waitUntil(cache.put(request,response.clone()));return response;
      }
      if(url.pathname==='/api/rankings')return rankingStub(env).fetch(new Request('https://rankings.internal/rankings',{method:'GET'}));
      if(url.pathname==='/api/shelf'){
        const requested=String(url.searchParams.get('userId')||''),targetUser=requested.startsWith('account:')?managedUserId(requested.slice(8)):'',sessionUser=await userFromSession(request,env),allowed=targetUser===ADMIN_ID?await validAdminSession(request,env):requested===`account:${sessionUser}`;if(requested.startsWith('account:')&&!allowed)return json({error:'로그인이 필요합니다.'},401);const target=new URL('https://rankings.internal/shelf');target.searchParams.set('userId',requested);return rankingStub(env).fetch(new Request(target));
      }
      if(url.pathname==='/api/favorite'&&request.method==='POST'){
        const body=await request.json(),requested=String(body.userId||''),targetUser=requested.startsWith('account:')?managedUserId(requested.slice(8)):'',sessionUser=await userFromSession(request,env),allowed=targetUser===ADMIN_ID?await validAdminSession(request,env):requested===`account:${sessionUser}`;if(requested.startsWith('account:')&&!allowed)return json({error:'로그인이 필요합니다.'},401);return rankingStub(env).fetch(new Request('https://rankings.internal/favorite',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
      }
      if(request.method==='POST'&&url.pathname==='/api/recommend'){
        const profile=await request.json();if(!Array.isArray(profile.jobs)||!profile.jobs.length)return json({error:'업무 분야를 선택해 주세요.'},400);if(profile.level===PAPER_LEVEL){profile.practical=PAPER_PRACTICAL;return json(await recommendPapers(profile,env));}return json(await recommend(profile,env));
      }
      if(request.method==='GET'&&url.pathname==='/api/new-books')return json(await newBooks(env));
      if(request.method==='GET'&&url.pathname==='/api/status')return json({services:[{name:'Google Books',connected:true},{name:'네이버 책',connected:Boolean(env.NAVER_CLIENT_ID&&env.NAVER_CLIENT_SECRET)},...(env.YES24_API_KEY?[{name:'YES24',connected:true}]:[])]});
      return env.ASSETS.fetch(request);
    }catch(error){
      return json({error:error.message||'요청 처리 중 오류가 발생했습니다.'},500);
    }
  }
};
