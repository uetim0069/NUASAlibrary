/* Checks that Gemini answers when Groq is down, and that Groq is used first when it works. */
process.env.GROQ_API_KEY="x"; process.env.GEMINI_API_KEY="g"; process.env.SUPABASE_SERVICE_KEY="y";
const T=require('/home/claude/pjwork/test_bp.js');
let groqDown=true, hits=[];
global.fetch=async(url,opt)=>{ url=String(url);
  if(url.includes('/auth/v1/user')) return {ok:true,json:async()=>({id:'u1'})};
  if(url.includes('project_usage')){ if(opt&&opt.method==='POST') return {ok:true}; return {ok:true,headers:{get:()=>'0-0/1'}}; }
  if(url.includes('api.groq.com/openai/v1/models')) return {ok:true,json:async()=>({data:[{id:'llama-3.3-70b-versatile'},{id:'llama-3.1-8b-instant'}]})};
  if(url.includes('chat/completions')){ hits.push('groq'); if(groqDown) return {ok:false,status:429,clone(){return this},text:async()=>'busy'};
    const b=JSON.parse(opt.body); const enc=new TextEncoder();
    if(!b.stream) return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(T.survey)}}]})};
    return {ok:true,body:(async function*(){yield enc.encode('data: '+JSON.stringify({choices:[{delta:{content:'GROQ TEXT'}}]})+'\n\ndata: [DONE]\n\n')})()}; }
  if(url.includes('generativelanguage')){ hits.push('gemini'); const enc=new TextEncoder();
    if(url.includes('streamGenerateContent')) return {ok:true,body:(async function*(){yield enc.encode('data: '+JSON.stringify({candidates:[{content:{parts:[{text:'GEMINI TEXT'}]}}]})+'\n\n')})()};
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(T.survey)}]}}]})}; }
  throw new Error('unexpected fetch '+url) };
const handler=require('/home/claude/pjwork/site/api/project.js');
const call=body=>new Promise(r=>{let out='',code=200;const res={statusCode:200,setHeader(){},writeHead(c){code=c},write:s=>{out+=s},end:s=>{if(s)out+=s;r({code:code||res.statusCode,out})}};handler({method:'POST',headers:{authorization:'Bearer t'},body},res)});
(async()=>{
  const form={topic:'Overhead costing and profitability of AIT Port Harcourt',level:"Undergraduate / Bachelor's",field:'Accounting',population:65,cite:'APA 7th edition'};
  let r=await call({mode:'blueprint',form}); const bp=JSON.parse(r.out).bp;
  console.log('Groq down, blueprint via backup:',r.code,bp?'plan ok':'NO PLAN','| hits',[...new Set(hits)]);
  r=await call({section:'abs',form,bp,prior:'',cites:[]}); console.log('Groq down, streamed section:',r.code,JSON.stringify(r.out.slice(0,20)));
  r=await call({mode:'topics',form:{field:'Accounting'}}); console.log('Groq down, topics:',r.code, r.code===200?'ok':r.out.slice(0,80));
  groqDown=false; hits=[];
  r=await call({section:'abs',form,bp,prior:'',cites:[]}); console.log('Groq up, streamed section:',r.code,JSON.stringify(r.out.slice(0,20)),'| hits',hits);
  delete process.env.GEMINI_API_KEY;
})();
