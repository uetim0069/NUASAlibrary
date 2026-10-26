process.env.GEMINI_API_KEY="x"; process.env.SUPABASE_SERVICE_KEY="y";
const T=require('/home/claude/pjwork/test_bp.js'), P=require('/home/claude/pjwork/site/pj-study.js');
let lastPrompt=null, usageRows=[];
global.fetch=async (url,opt)=>{
  url=String(url);
  if(url.includes('/auth/v1/user')) return {ok:true,json:async()=>({id:'u1'})};
  if(url.includes('project_usage')){ if((opt&&opt.method)==='POST'){usageRows.push(JSON.parse(opt.body).section);return {ok:true};} return {ok:true,headers:{get:()=>'0-0/3'}}; }
  if(url.includes('generateContent')&&!url.includes('stream')){ lastPrompt=JSON.parse(opt.body); return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(T.survey)}]}}]})}; }
  if(url.includes('streamGenerateContent')){
    lastPrompt=JSON.parse(opt.body);
    const user=lastPrompt.contents[0].parts[0].text;
    const echo=user.split('\n').filter(l=>/^\s*\{\{[A-Z0-9_]+\}\}\s*$/.test(l)||/\{\{[A-Z0-9_]+\}\}/.test(l)).join('\n')||'Plain text only.';
    const sse=[]; for(let i=0;i<echo.length;i+=7) sse.push('data: '+JSON.stringify({candidates:[{content:{parts:[{text:echo.slice(i,i+7)}]}}]})+'\n\n');
    const enc=new TextEncoder(); const chunks=sse.map(s=>enc.encode(s));
    return {ok:true,body:(async function*(){for(const c of chunks) yield c;})()};
  }
  throw new Error('unexpected fetch '+url);
};
const handler=require('/home/claude/pjwork/site/api/project.js');
function call(body){ return new Promise(r=>{ let out='',code=200,headers={};
  const res={statusCode:200,setHeader:(k,v)=>headers[k]=v,writeHead:(c)=>{code=c},write:s=>{out+=s},end:s=>{if(s)out+=s;r({code:code||res.statusCode,out})}};
  handler({method:'POST',headers:{authorization:'Bearer t'},body},res); }); }
(async()=>{
  // blueprint
  let r=await call({mode:'blueprint',form:{topic:'Overhead costing and profitability of AIT Port Harcourt',field:'Accounting',method:'survey',org:'AIT Port Harcourt',population:65}});
  const bp=JSON.parse(r.out).bp; console.log('blueprint:',r.code,'| ivs',bp.ivs.length,'| design',bp.design,'| pop',bp.population,'| usage',usageRows);
  const form={topic:'Overhead costing and profitability of AIT Port Harcourt',level:"Undergraduate / Bachelor's",field:'Accounting',population:65,cite:'APA 7th edition'};
  for (const [design,sections] of [['survey',['c3','c4']],['expost',['c3','c4']]]){
    const b=Object.assign({},bp,{design}); if(design==='expost') b.controlName='Firm Size';
    for(const s of sections){
      r=await call({section:s,form,bp:b,prior:'earlier text',cites:[]});
      const left=(r.out.match(/\{\{/g)||[]).length, tbl=(r.out.match(/\[\[TB /g)||[]).length, cap=(r.out.match(/\[\[TC\]\]/g)||[]).length;
      console.log(`${design} ${s}: http ${r.code} | leftover {{ }}: ${left} | tables expanded: ${tbl} | captions: ${cap} | chars ${r.out.length} | error flag: ${r.out.includes('[[ERROR]]')}`);
    }
  }
  console.log('usage rows logged:',usageRows.join(','));
  // limits / validation
  r=await call({section:'c9',form,bp}); console.log('unknown section ->',r.code);
  r=await call({section:'c1',form,bp:{title:'x'}}); console.log('bad blueprint ->',r.code,r.out.slice(0,70));
  // print the survey c3 prompt for inspection
  await call({section:'c3',form,bp:Object.assign({},bp,{design:'survey'}),prior:''});
  console.log('\n---- survey c3 prompt (first 2600 chars of user message) ----\n'+lastPrompt.contents[0].parts[0].text.slice(0,2600));
})();
