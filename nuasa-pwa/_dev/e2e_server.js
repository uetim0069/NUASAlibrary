/* Local end-to-end rig: serves the real site, runs the real api/project.js, mocks only Supabase and Gemini. */
process.env.GEMINI_API_KEY="x"; process.env.SUPABASE_SERVICE_KEY="y";
const http=require('http'),fs=require('fs'),path=require('path');
const SITE='/home/claude/pjwork/site', T=require('/home/claude/pjwork/test_bp.js');
let usage=[]; global.__usage=usage; global.__prompts=[];
const para=(i)=>["The broadcasting sector contributes to national development through information, education and advertising, and Cooper and Kaplan (1988) argued that costs follow activities — not products. Many stations in Nigeria, however, still rely on traditional allocation bases, which weakens decision-making and profitability (Horngren et al., 2012).",
 "Studies such as Drury (2018) and Eze and Okoye (2021) examined overhead behaviour in 2016-2020 and reported that firms with better control recorded stronger margins. This - in turn - supports the argument advanced in the study.",
 "The study therefore examined the relationship between the variables and found that the results were consistent with the theory reviewed earlier in this chapter."][i%3];
function fake(user){
  const task=user.split('\nTASK\n')[1].split('\n\nPROJECT TEXT WRITTEN SO FAR')[0]; const L=task.split('\n'), out=[]; let skipTb=false, n=0;
  if(/^Write the ABSTRACT/.test(task)) return Array.from({length:6},(_,i)=>para(i)).join(' ');
  if(/^Write the REFERENCES/.test(task)) return Array.from({length:32},(_,i)=>`[[RF]] Author${String.fromCharCode(65+i%26)}${i}, A. B. (20${10+i%14}). Title of work number ${i} on costing. __Journal of Accounting Research, ${i+3}__(2), 10, 25.`).join('\n');
  for(const l of L){
    if(skipTb){ if(/^\[\[\/TB\]\]/.test(l)){skipTb=false;out.push(l)} continue }
    if(/^\[\[TB /.test(l)){ out.push(l,'S/N | Author (Year) | Methodology | Findings'); for(let r=1;r<=16;r++)out.push(`${r} | Author${r} (20${9+r}) | Survey of ${30+r} firms with questionnaires | Overhead allocation affected profitability and pricing decisions in the firms studied.`); skipTb=true; continue }
    if(/^\[\[(CH|CT|H2|H3|TC|TS|LI|BL|EQ)\]\]/.test(l)||/^\s*\{\{[A-Z0-9_]+\}\}\s*$/.test(l)){ out.push(l); if(/^\[\[(H2|H3)\]\]/.test(l)){out.push(para(n++));out.push(para(n++))} }
  }
  return out.join('\n\n');
}
global.fetch=async(url,opt)=>{ url=String(url);
  if(url.includes('/auth/v1/user')) return {ok:true,json:async()=>({id:'u1'})};
  if(url.includes('project_usage')){ if(opt&&opt.method==='POST'){usage.push(JSON.parse(opt.body).section);return{ok:true}} return{ok:true,headers:{get:()=>'0-0/2'}} }
  if(url.includes(':generateContent')){ return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(T.survey)}]}}]})} }
  if(url.includes('streamGenerateContent')){ const b=JSON.parse(opt.body), user=b.contents[0].parts[0].text; global.__prompts.push({system:b.systemInstruction.parts[0].text,user,gen:b.generationConfig});
    const txt=fake(user), enc=new TextEncoder(), chunks=[]; for(let i=0;i<txt.length;i+=11) chunks.push(enc.encode('data: '+JSON.stringify({candidates:[{content:{parts:[{text:txt.slice(i,i+11)}]}}]})+'\n\n'));
    return {ok:true,body:(async function*(){for(const c of chunks){await new Promise(r=>setImmediate(r));yield c}})()} }
  throw new Error('unexpected fetch '+url) };
const handler=require(SITE+'/api/project.js');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');
  if(u.pathname==='/api/project'){ let d=''; req.on('data',c=>d+=c); req.on('end',()=>{ try{req.body=JSON.parse(d||'{}')}catch(e){req.body={}} Promise.resolve(handler(req,res)).catch(e=>{console.error('handler error',e);try{res.statusCode=500;res.end('{}')}catch(_){}}) }); return }
  if(u.pathname==='/__usage'){res.end(JSON.stringify(usage));return}
  if(u.pathname==='/__prompts'){res.setHeader('content-type','application/json');res.end(JSON.stringify(global.__prompts));return}
  let p=u.pathname==='/'?'/index.html':u.pathname, f=path.join(SITE,p); if(!f.startsWith(SITE)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;res.end('nf');return}
  let body=fs.readFileSync(f); if(p==='/index.html'){ body=body.toString('utf8').replace('pjWait=ms=>new Promise(r=>setTimeout(r,ms))','pjWait=ms=>new Promise(r=>setTimeout(r,ms/25))'); }  // test only: skip the pacing delay
  res.setHeader('content-type',(MIME[path.extname(f)]||'application/octet-stream')+'; charset=utf-8'); res.end(body);
}).listen(8770,()=>console.log('rig on 8770'));
