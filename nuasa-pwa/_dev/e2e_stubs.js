/* injected before the app: stub supabase-js and tus so the real app boots offline */
(()=>{const mk=()=>{const f=function(){return p};const p=new Proxy(f,{get(t,k){if(k==='then')return res=>res({data:[],error:null,count:0});if(k==='auth')return AUTH;return(...a)=>p},apply(){return p}});return p};
 const AUTH={getSession:async()=>({data:{session:{access_token:'tok',user:{id:'u1',email:'stu@uniuyo.edu.ng'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getUser:async()=>({data:{user:{id:'u1'}}}),signOut:async()=>({}),signInWithPassword:async()=>({data:{},error:null})};
 window.supabase={createClient:()=>mk()};window.tus={Upload:function(){this.start=()=>{}},isSupported:true};})();
