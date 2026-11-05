(function(){
function $(s,r){return(r||document).querySelector(s)}
function esc(t){var d=document.createElement('div');d.textContent=t==null?'':t;return d.innerHTML.replace(/"/g,'&quot;')}
function ls(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function lsw(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function live(x){var n=new Date();return x.active!==false&&(!x.start_at||new Date(x.start_at)<=n)&&(!x.end_at||new Date(x.end_at)>=n)}
var SB='',reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
function img(p){return !p?'':(/^(https?:)?\/\//.test(p)||p.charAt(0)=='/'?p:SB+p)}

/* ---------- announcement details pop-up ---------- */
function openAnn(x){
 if($('.vmod'))return;var u=img(x.image_path),m=document.createElement('div');m.className='vmod';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
 m.innerHTML='<div class="vmod-c '+esc(x.kind||'info')+'"><button type="button" class="vmod-x" aria-label="Close">×</button>'+(u?'<img src="'+esc(u)+'" alt="">':'')+'<div class="vmod-b"><h3>'+esc(x.title)+'</h3><p>'+esc(x.body||'')+'</p><button type="button" class="btn vmod-ok">OK, got it</button></div></div>';
 document.body.appendChild(m);
 function close(){m.remove();document.removeEventListener('keydown',key)}
 function key(e){if(e.key=='Escape')close()}
 document.addEventListener('keydown',key);
 m.onclick=function(e){if(e.target===m)close()};$('.vmod-x',m).onclick=close;$('.vmod-ok',m).onclick=close;$('.vmod-ok',m).focus()}

/* ---------- announcement bar (one message at a time, no scrolling gaps) ---------- */
function bar(list){
 var seen=ls('vvbar2',[]),L=list.filter(function(x){return seen.indexOf(x.id)<0});if(!L.length)return;
 var multi=L.length>1,shown=false,k=0,hov=false,b=document.createElement('div');
 b.setAttribute('role','region');b.setAttribute('aria-label','Announcements');
 b.innerHTML='<div class="vbar-in"><div class="vbar-c">'+(multi?'<button type="button" class="vbar-a" data-d="-1" aria-label="Previous announcement">‹</button>':'')+'<button type="button" class="vbar-i" aria-live="polite"></button>'+(multi?'<button type="button" class="vbar-a" data-d="1" aria-label="Next announcement">›</button>':'')+'<button type="button" class="vbar-x" aria-label="Dismiss announcements">×</button></div></div>';
 var it=$('.vbar-i',b);
 function paint(){var x=L[k];b.className='vbar '+(x.kind||'info')+(shown?' in':'');
  it.innerHTML=(x.image_path?'<span class="vbar-img"><img src="'+esc(img(x.image_path))+'" alt=""></span>':'')+'<span class="vbar-tx"><b>'+esc(x.title)+'</b>'+esc(x.body||'')+'</span><span class="vbar-m">Read more</span>'}
 function go(i){k=(i+L.length)%L.length;it.classList.add('sw');setTimeout(function(){paint();it.classList.remove('sw')},180)}
 paint();document.body.prepend(b);
 requestAnimationFrame(function(){requestAnimationFrame(function(){shown=true;b.classList.add('in')})});
 it.onclick=function(){openAnn(L[k])};
 b.querySelectorAll('.vbar-a').forEach(function(a){a.onclick=function(){go(k+(+a.dataset.d))}});
 $('.vbar-x',b).onclick=function(){lsw('vvbar2',seen.concat(L.map(function(x){return x.id}).filter(function(i){return i!=null})));b.classList.remove('in');setTimeout(function(){b.remove()},420)};
 b.addEventListener('pointerenter',function(e){if(e.pointerType=='mouse')hov=true});b.addEventListener('pointerleave',function(){hov=false});
 if(multi&&!reduce)setInterval(function(){if(!hov&&!document.hidden&&!$('.vmod')&&document.activeElement.className.indexOf('vbar')<0)go(k+1)},6500)}

/* ---------- homepage advert slider ---------- */
function skel(){var main=$('main');if(!main||!$('.hero')||!ls('vvadn',0))return null;
 var w=document.createElement('section');w.className='vad';w.innerHTML='<div class="vad-v sk"></div>';main.prepend(w);return w}
function slider(list,w){
 var main=$('main');if(!main||!$('.hero')){if(w)w.remove();return}
 if(!w){w=document.createElement('section');main.prepend(w)}
 var n=list.length;w.className='vad';
 var slides=list.map(function(x,i){var u=img(x.image_path);
  return '<a class="vad-s" href="'+esc(x.link_url||'/shop')+'" draggable="false"'+(i?' tabindex="-1" aria-hidden="true"':'')+'>'+(u?'<img class="bg" src="'+esc(u)+'" alt="" draggable="false"'+(i?'':' fetchpriority="high"')+'>':'<img class="wm" src="/img/logo-mark.svg" alt="">')+
  '<div class="vad-c"><h2>'+esc(x.title)+'</h2>'+(x.body?'<p>'+esc(x.body)+'</p>':'')+'<span class="vad-b">Shop now</span></div></a>'}).join('');
 w.innerHTML='<div class="vad-v" role="region" aria-roledescription="carousel" aria-label="Featured offers"><div class="vad-t">'+slides+'</div>'+
  (n>1?'<button type="button" class="vad-n vad-pv" aria-label="Previous offer">‹</button><button type="button" class="vad-n vad-nx" aria-label="Next offer">›</button><div class="vad-ctl"><div class="vad-d">'+list.map(function(_,i){return '<button type="button" aria-label="Offer '+(i+1)+'"></button>'}).join('')+'</div><button type="button" class="vad-p" aria-label="Pause">❚❚</button></div>':'')+'</div>';
 if(n<2)return;
 var v=$('.vad-v',w),t=$('.vad-t',w),S=t.children,dots=w.querySelectorAll('.vad-d button'),k=0,play=!reduce,hov=false,drg=false,foc=false,timer,sx=0,dx=0,moved=false;
 function show(i){k=(i+n)%n;t.style.transform='translateX(-'+k*100+'%)';
  dots.forEach(function(d,j){d.classList.toggle('on',j===k)});
  for(var j=0;j<n;j++){S[j].tabIndex=j===k?0:-1;S[j].setAttribute('aria-hidden',j===k?'false':'true')}}
 function sched(){clearTimeout(timer);if(play&&!hov&&!drg&&!foc&&!document.hidden)timer=setTimeout(function(){show(k+1);sched()},6000)}
 function go(i){show(i);sched()}
 dots.forEach(function(d,i){d.onclick=function(){go(i)}});
 $('.vad-pv',w).onclick=function(){go(k-1)};$('.vad-nx',w).onclick=function(){go(k+1)};
 var pb=$('.vad-p',w);pb.onclick=function(){play=!play;pb.textContent=play?'❚❚':'▶';pb.setAttribute('aria-label',play?'Pause':'Play');sched()};
 v.addEventListener('pointerenter',function(e){if(e.pointerType=='mouse'){hov=true;sched()}});v.addEventListener('pointerleave',function(e){hov=false;sched()});
 v.addEventListener('focusin',function(){foc=true;sched()});v.addEventListener('focusout',function(){foc=false;sched()});
 document.addEventListener('visibilitychange',sched);
 v.addEventListener('pointerdown',function(e){if(e.pointerType=='mouse'&&e.button!==0)return;sx=e.clientX;dx=0;drg=true;moved=false;clearTimeout(timer)});
 v.addEventListener('pointermove',function(e){if(!drg)return;dx=e.clientX-sx;
  if(!moved&&Math.abs(dx)>8){moved=true;t.classList.add('drag');try{v.setPointerCapture(e.pointerId)}catch(_){}}
  if(moved)t.style.transform='translateX('+(-k*100+dx/v.clientWidth*100)+'%)'});
 function end(){if(!drg)return;drg=false;t.classList.remove('drag');show(moved&&Math.abs(dx)>v.clientWidth*.15?k+(dx<0?1:-1):k);sched()}
 v.addEventListener('pointerup',end);v.addEventListener('pointercancel',end);
 v.addEventListener('click',function(e){if(moved){e.preventDefault();e.stopPropagation();moved=false}},true);
 show(0);sched()}

async function run(){
 var A=[],D=[],sk=skel();
 if(window.VV_TOPSPOT_DEMO){A=VV_TOPSPOT_DEMO.ann;D=VV_TOPSPOT_DEMO.ads}
 else if(typeof SUPA_URL!=='undefined'&&SUPA_URL){var h={headers:{Authorization:'Bearer '+SUPA_KEY}};SB=(typeof SUPA_DIRECT!=='undefined'?SUPA_DIRECT:SUPA_URL)+'/storage/v1/object/public/site-media/';
  var r=await Promise.all([rest('announcements?select=*&order=created_at.desc&limit=5',h).catch(function(){return[]}),rest('adverts?select=*&order=sort.asc,created_at.desc&limit=6',h).catch(function(){return null})]);A=r[0];D=r[1]}
 A=(A||[]).filter(live);
 if(D===null){if(sk)sk.remove()}else{D=(D||[]).filter(live);lsw('vvadn',D.length?1:0);D.length?slider(D,sk):(sk&&sk.remove())}
 bar(A)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
