(function(){
function $(s,r){return(r||document).querySelector(s)}
function esc(t){var d=document.createElement('div');d.textContent=t==null?'':t;return d.innerHTML}
function ls(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function lsw(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function naira(n){return '₦ '+Number(n).toLocaleString('en-NG')}
/* ---------- product cards ---------- */
function cards(){
 var WAS=window.PDP_WAS||{};
 [].slice.call(document.querySelectorAll('.pc')).forEach(function(c){
  if(c.dataset.sx)return;c.dataset.sx=1;
  var pr=c.querySelector('.pr'),id=(pr&&pr.dataset.pid)||(c.querySelector('.heart')||{dataset:{}}).dataset.id,p=(typeof VV_PRODUCTS!=='undefined'&&VV_PRODUCTS[id])||null,raw=p&&p.raw;
  if(!c.querySelector('.nb')){var b=document.createElement('span');b.className='nb';b.textContent='New arrival';c.prepend(b)}
  if(id&&(!p||p.price)&&!c.querySelector('.pc-add')){var ab=document.createElement('button');ab.type='button';ab.className='pc-add';ab.setAttribute('aria-label','Add to Cart');ab.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19" r="1.2"/><circle cx="17" cy="19" r="1.2"/></svg>';ab.onclick=function(e){e.preventDefault();e.stopPropagation();ab.classList.add('busy');try{if(window.vvAddId)vvAddId(id,1)}catch(x){}setTimeout(function(){ab.classList.remove('busy')},600)};c.appendChild(ab)}
  var ft=raw&&raw.features&&raw.features.length?raw.features.slice(0,2):null,box=c.querySelector('a>div');
  if(ft&&box&&!c.querySelector('.pc-f')){var u=document.createElement('ul');u.className='pc-f';u.innerHTML=ft.map(function(f){return '<li>'+esc(String(f).split(/\s[-–:]\s/)[0])+'</li>'}).join('');if(pr)pr.before(u);else box.appendChild(u)}
  if(pr&&p&&WAS[id]>p.price){var s=document.createElement('s');s.textContent=naira(WAS[id]);pr.insertBefore(s,pr.firstChild.nextSibling||null)}
 })}
/* ---------- support chat ---------- */
var KB=[
 [/track|where.*order|my order|status/i,'You can follow any order with your tracking code and phone number on the <a href="/track">Track order</a> page. Your code is shown when you check out and in your account.'],
 [/instal|pay.*month|monthly|credit|spread/i,'Instalments are for orders from ₦ 50,000, over 3 to 24 months (electronics up to 12 months, or 18 above ₦ 500,000). Groceries and similar items are full payment only. Pick "Pay in instalments" on the product page or in your cart to see your monthly amount first. More on the <a href="/installment-plan">Instalment Plan</a> page.'],
 [/deliver|ship|dispatch|how long|arrive/i,'We deliver fast in Uyo and across Akwa Ibom, Port Harcourt, Calabar and nationwide. The delivery fee is not included in the product price. You will get a tracking code at checkout.'],
 [/pay|paystack|card|transfer|checkout|account/i,'Payment is online through Paystack. You need an account to order, so sign up or log in at checkout.'],
 [/refund|return|exchange|replace|cancel|damag|fault|wrong/i,'Please read our <a href="/terms">Terms and Conditions</a>. Replacement or exchange with another product of equal value is offered subject to management approval and within 48 hours. If something is wrong with your order, choose "Talk to a person" and tell us what happened.'],
 [/price|cost|discount|offer|promo/i,'Prices are shown on every product page and in your cart. Watch the top of the site for current offers and announcements.'],
 [/email|contact|phone|call|whatsapp|reach/i,'You can email <a href="mailto:valuevillemall@gmail.com">valuevillemall@gmail.com</a>, or choose "Talk to a person" below and our team will reply here within 24 hours.'],
 [/hi\b|hello|hey|good (morning|afternoon|evening)/i,'Hello! How can I help you today?']
];
var CHIPS=['Track my order','Pay in instalments','Delivery','Refunds and exchanges','Talk to a person'];
var S=ls('vvct',{m:[],h:0,n:0,u:null,c:null}),sid=ls('vvcs',null);
if(!sid){sid='';var a=new Uint8Array(16);(window.crypto||{getRandomValues:function(x){for(var i=0;i<x.length;i++)x[i]=Math.random()*256}}).getRandomValues(a);a.forEach(function(x){sid+=x.toString(16).padStart(2,'0')});lsw('vvcs',sid)}
function save(){S.m=S.m.slice(-60);lsw('vvct',S)}
function chat(){
 var L=document.createElement('button');L.type='button';L.className='vc-l';L.setAttribute('aria-label','Chat with customer support');
 L.innerHTML='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18v-3a10 10 0 0 1 20 0v3"/><rect x="3.5" y="16" width="5.5" height="9" rx="2.5"/><rect x="23" y="16" width="5.5" height="9" rx="2.5"/><path d="M26 25c0 2.5-2.5 4-6 4h-2.5"/><circle cx="12.5" cy="17" r="1.1" fill="currentColor"/><circle cx="19.5" cy="17" r="1.1" fill="currentColor"/><path d="M13 21.5c1.8 1.4 4.2 1.4 6 0"/></svg><i></i>';
 var U=document.createElement('button');U.type='button';U.className='vc-up';U.setAttribute('aria-label','Back to top');U.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V5M5 12l7-7 7 7"/></svg>';
 var P=document.createElement('section');P.className='vc-p';P.setAttribute('role','dialog');P.setAttribute('aria-label','Customer support');
 P.innerHTML='<div class="vc-h"><button type="button" class="vc-bk" aria-label="Back" hidden>‹ Back</button><div class="vc-t"><b>ValueVille Support</b><small>Instant answers now. A team member replies within 24 hours.</small></div><button type="button" class="vc-x" aria-label="Minimise chat">—</button></div><div class="vc-m" aria-live="polite"></div><div class="vc-q"></div><div class="vc-f" hidden></div><form class="vc-i"><input name="t" placeholder="Type your question" autocomplete="off" aria-label="Your message"><button>Send</button></form>';
 /* The support chat only appears on pages where customers need help. Add or remove paths here. */
 var CHAT_PAGES=['/contact','/track','/checkout','/installment-plan','/terms','/product','/qasa-rechargeable-fan-16','/ox-rechargeable-standing-fan-18','/rechargeable-table-fan-12','/wall-fan-18','/binatone-ceiling-fan-56'],
 here=location.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
 if(CHAT_PAGES.indexOf(here)>-1)document.body.append(U,L,P);else document.body.append(U);
 var M=$('.vc-m',P),Q=$('.vc-q',P),F=$('.vc-f',P),I=$('.vc-i',P);
 function bub(kind,html,keep){var d=document.createElement('div');d.className='vc-b '+kind;d.innerHTML=html;M.appendChild(d);M.scrollTop=M.scrollHeight;if(!keep){S.m.push([kind,html]);save()}}
 function chips(list){Q.innerHTML=list.map(function(c){return '<button type="button">'+c+'</button>'}).join('');[].forEach.call(Q.children,function(b){b.onclick=function(){ask(b.textContent)}})}
 function reply(t){
  if(/person|human|agent|someone|talk to|staff|support team/i.test(t)){toHuman();return}
  for(var i=0;i<KB.length;i++)if(KB[i][0].test(t)){bub('bot',KB[i][1]);S.n=0;save();chips(['Talk to a person'].concat(CHIPS.slice(0,3)));return}
  S.n=(S.n||0)+1;save();bub('bot','I am not sure about that one. I can connect you with our team, who reply within 24 hours.');chips(['Talk to a person'].concat(CHIPS.slice(0,3)))}
 function ask(t){bub('me',esc(t));if(S.h&&!/^talk to a person$/i.test(t)){send(t);return}setTimeout(function(){reply(t)},350)}
 function toHuman(){
  if(S.h&&S.u){bub('bot','You are already connected with our team. Type your message below and we will reply here within 24 hours.');chips([]);return}
  bub('bot','Happy to connect you. Please leave your name and a phone number or email so we can reach you. A team member will reply within 24 hours.');chips([]);form()}
 function form(){P.classList.add('vc-fm');$('.vc-bk',P).hidden=false;F.hidden=false;I.hidden=true;
  var nm=(typeof fname==='function'&&fname())||S.u||'',ct=S.c||((typeof sess!=='undefined'&&sess&&sess.user&&sess.user.email)||'');
  F.innerHTML='<div class="vc-nt">Thanks for reaching out. Common questions get an instant reply here. For anything else, leave a message and a member of our team will reply within 24 hours, any day of the week.</div><label><span>Problem description <em>*</em></span><textarea name="d" rows="5" maxlength="1500" placeholder="Please enter a message"></textarea></label><label><span>Name</span><input name="n" autocomplete="name" maxlength="60"></label><label><span>Phone number or email</span><input name="c" autocomplete="tel" maxlength="80"></label><button class="btn" type="button">Submit</button>';
  $('[name=n]',F).value=nm;$('[name=c]',F).value=ct;
  $('button',F).onclick=function(){var d=$('[name=d]',F).value.trim(),n=$('[name=n]',F).value.trim(),c=$('[name=c]',F).value.trim();
   if(d.length<2){$('[name=d]',F).focus();return}if(n.length<2){$('[name=n]',F).focus();return}if(c.length<5){$('[name=c]',F).focus();return}
   S.u=n;S.c=c;S.h=1;save();back();bub('me',esc(d));send(d);chips([])}}
 function back(){P.classList.remove('vc-fm');$('.vc-bk',P).hidden=true;F.hidden=true;I.hidden=false}
 function send(t){
  fetchRpc('support_send',{p_session:sid,p_name:S.u||'Customer',p_contact:S.c||'',p_body:t.slice(0,1500)}).then(function(){bub('bot','Message received. Our team will reply here within 24 hours.')}).catch(function(){bub('bot','We could not send that just now. Please email <a href="mailto:valuevillemall@gmail.com?subject=Support%20request&body='+encodeURIComponent(t)+'">valuevillemall@gmail.com</a> and we will reply within 24 hours.')})}
 function fetchRpc(n,b){if(typeof rest!=='function'||typeof SUPA_URL==='undefined'||!SUPA_URL)return Promise.reject();return rest('rpc/'+n,{method:'POST',body:JSON.stringify(b)})}
 function poll(){if(!S.h)return;fetchRpc('support_thread',{p_session:sid}).then(function(r){if(!r)return;var out=r.filter(function(x){return x.direction==='out'}),k=S.o||0;if(out.length>k){out.slice(k).forEach(function(x){bub('agent',esc(x.body),1);S.m.push(['agent',esc(x.body)])});S.o=out.length;save();if(!P.classList.contains('open'))L.classList.add('un')}}).catch(function(){})}
 /* restore */
 if(S.m.length)S.m.forEach(function(x){bub(x[0],x[1],1)});else{bub('bot','Hi, welcome to ValueVille MALL. I can answer common questions right away, or connect you with our team. What do you need help with?');}
 chips(S.h?[]:CHIPS);
 function open(o){P.classList.toggle('open',o);L.style.display=o&&innerWidth<521?'none':'';if(o){L.classList.remove('un');M.scrollTop=M.scrollHeight;poll();setTimeout(function(){var i=$('input',I);if(i&&!I.hidden)i.focus()},50)}}
 L.onclick=function(){open(!P.classList.contains('open'))};$('.vc-x',P).onclick=function(){open(false)};$('.vc-bk',P).onclick=back;
 I.onsubmit=function(e){e.preventDefault();var i=$('input',I),t=i.value.trim();if(!t)return;i.value='';ask(t)};
 U.onclick=function(){scrollTo({top:0,behavior:'smooth'})};
 addEventListener('scroll',function(){U.classList.toggle('on',scrollY>500)},{passive:true});
 if(S.h){poll();setInterval(function(){if(!document.hidden)poll()},30000)}
}
function go(){cards();chat();var mt;try{new MutationObserver(function(){clearTimeout(mt);mt=setTimeout(cards,120)}).observe(document.body,{childList:true,subtree:true})}catch(e){}var n=0,iv=setInterval(function(){cards();if(++n>20)clearInterval(iv)},700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();

/* ===== v10: ticker strip, account drawer, cart page, new arrivals, account pages ===== */
(function(){
function $(s,r){return(r||document).querySelector(s)}
function esc(t){var d=document.createElement('div');d.textContent=t==null?'':t;return d.innerHTML}
var ARR='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';
var ROWS=[['My Order','/account/orders'],['My Instalment Plans','/account/installments'],['Personal Information','/account/profile'],['My Wish','/wishlist'],['My Value Points','/account/points'],['Payment History','/account/payments'],['Coupons Center','/account/coupons'],['Address Management','/account/addresses'],['Product Reviews','/account/reviews'],['Track Order','/track']];
function S(){return typeof sess!=='undefined'?sess:null}
function rowsHtml(){var s=S(),out='<div class="al">'+ROWS.map(function(r){return '<a href="'+(s||r[1]=='/track'||r[1]=='/wishlist'?r[1]:'/login?next='+encodeURIComponent(r[1]))+'"><span>'+r[0]+'</span>'+ARR+'</a>'}).join('')+'</div>';
 if(s){var n=(typeof fname==='function'&&fname())||s.user.email||'';out+='<div class="al-f"><p>Signed in as <b>'+esc(n)+'</b></p><button type="button" class="btn dkb" onclick="vvLogout()">Log out</button></div>'}
 else out+='<div class="al-f"><a class="btn dkb" href="/signup">Register &amp; Get Points</a><p>Existing user? <a href="/login"><b>Sign in</b></a></p></div>';
 return out}
/* 1. ticker strip with close button */
function strip(){var s=$('.strip');if(!s||s.dataset.mq)return;s.dataset.mq=1;
 try{if(sessionStorage.getItem('vvstrip')){s.remove();return}}catch(e){}
 var t=['Cart it, love it'].concat([].map.call(s.querySelectorAll('span'),function(x){return x.textContent}).concat(['Genuine products','Nationwide delivery']));
 var one=t.map(function(x){return '<span>'+esc(x)+'</span>'}).join('');
 s.className='strip mqs';s.innerHTML='<div class="mqs-w"><div class="mqs-t">'+one+one+one+one+'</div></div><button type="button" class="mqs-x" aria-label="Close announcement">×</button>';
 $('.mqs-x',s).onclick=function(){s.remove();try{sessionStorage.setItem('vvstrip','1')}catch(e){}}}
/* 2. account drawer (opens from the person icon) */
function acctDrawer(){var a=$('#acct');if(!a||$('#adr'))return;
 var d=document.createElement('aside');d.id='adr';d.className='drawer adr';d.setAttribute('aria-hidden','true');
 d.innerHTML='<div class="dr-h"><b>My Account</b><button type="button" aria-label="Close">×</button></div><div class="adr-b"></div>';
 document.body.appendChild(d);
 function show(o){if(o)$('.adr-b',d).innerHTML=rowsHtml();d.classList.toggle('open',o);d.setAttribute('aria-hidden',!o)}
 $('button',d).onclick=function(){show(false)};
 a.addEventListener('click',function(e){e.preventDefault();show(!d.classList.contains('open'))});
 document.addEventListener('keydown',function(e){if(e.key=='Escape')show(false)})}
/* 3. cart page in the same layout as the cart drawer */
function cartPage2(){var el=$('#cp');if(!el||typeof cart==='undefined')return;
 if(!window._cpr){window._cpr=1;cart.forEach(function(c){delete c.off});lsSet('vvc',cart);draw()}
 var L=lines();
 if(!L.length){el.innerHTML='<div class="cx"><div class="cx-h"><b>Shopping Cart</b><a href="/shop" aria-label="Close">×</a></div><p class="emp">Your cart is empty.</p><div class="cx-b"><a class="btn dkb" href="/shop">Continue shopping</a></div></div><div class="cx cx-a"><div class="cx-h"><b>My Account</b></div>'+rowsHtml()+'</div>';return}
 var q=plan0(L),I=q.mode=='inst',sel=cart.filter(function(c){return!c.off&&!c.ask}),
 tot=sel.reduce(function(s,c){return s+(P(c.id)?P(c.id).price*c.qty:0)},0),all=cart.length>0&&cart.every(function(c){return!c.off});
 el.innerHTML='<div class="cx"><div class="cx-h"><b>Shopping Cart</b><a href="/shop" aria-label="Close">×</a></div><div class="cx-i">'+document.getElementById('items').innerHTML+'</div>'
 +'<div class="cx-p"><label class="opt"><input type="radio" name="pm" value="full" '+(I?'':'checked')+'><span><b>Pay in full</b> '+naira(q.total)+'</span></label>'
 +'<label class="opt '+(q.okI?'':'dis')+'"><input type="radio" name="pm" value="inst" '+(I?'checked':'')+' '+(q.okI?'':'disabled')+'><span><b>Pay in instalments</b> '+(q.okI?(I?naira(mo(q.total,q.m))+' a month for '+q.m+' months':'Choose 3 to '+q.ms[q.ms.length-1]+' months'):q.why)+'</span></label>'
 +(I?'<label class="cx-m">Number of months <select id="cm">'+q.ms.map(function(m){return '<option '+(m==q.m?'selected':'')+'>'+m+'</option>'}).join('')+'</select></label>':'')+'</div>'
 +'<div class="dsub"><label class="dall"><button type="button" class="dck'+(all?' on':'')+'" onclick="vvSelAll()" aria-label="Select all"></button> ALL</label><div class="dtot"><small>Subtotal</small><b>'+naira(tot)+'</b></div></div>'
 +'<div class="cx-b"><a class="btn ghost" href="/shop">Continue shopping</a><button type="button" class="btn dkb" id="pc">Checkout</button></div><p class="note cx-n">Delivery fee is not included. Payment is online through Paystack. An account is needed to order.</p></div>'
 +'<div class="cx cx-a"><div class="cx-h"><b>My Account</b></div>'+rowsHtml()+'</div>';
 [].forEach.call(el.querySelectorAll('input[name=pm]'),function(r){r.onchange=function(){lsSet('vvp',{mode:r.value,months:q.m});cartPage()}});
 var cm=$('#cm');if(cm)cm.onchange=function(){lsSet('vvp',{mode:'inst',months:+cm.value});cartPage()};
 $('#pc').onclick=function(){lsSet('vvp',{mode:q.mode,months:q.m});vvCheckout()}}
/* 4. every product is a new arrival on the home page */
var ORD=[];
function shuf(a){for(var i=a.length-1;i>0;i--){var k=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[k];a[k]=t}return a}
function allNew(){var n=$('#newp');if(!n||typeof VV_PRODUCTS==='undefined')return;var ids=Object.keys(VV_PRODUCTS);if(!ids.length||typeof pcard!=='function')return;
 var g=n.querySelector('.pgrid');var shown={};document.querySelectorAll('#fans .heart').forEach(function(h){shown[h.dataset.id]=1});ids=ids.filter(function(i){return!shown[i]});if(!ids.length){n.hidden=true;return}n.hidden=false;
 var top=ids.filter(function(i){return vvPin(i)<1e9}).sort(function(a,b){return vvPin(a)-vvPin(b)}),rest=shuf(ids.filter(function(i){return vvPin(i)>=1e9}));
 /* keep the order already on screen; only add products that arrive later */
 var want=top.concat(rest),seen={};ORD=ORD.filter(function(i){return want.indexOf(i)>-1});ORD.forEach(function(i){seen[i]=1});
 var add=want.filter(function(i){return!seen[i]});if(!add.length&&g.children.length==ORD.length)return;
 var t2=ORD.filter(function(i){return vvPin(i)<1e9}).concat(add.filter(function(i){return vvPin(i)<1e9})),r2=ORD.filter(function(i){return vvPin(i)>=1e9}).concat(add.filter(function(i){return vvPin(i)>=1e9}));
 t2.sort(function(a,b){return vvPin(a)-vvPin(b)});ORD=t2.concat(r2);g.innerHTML=ORD.map(pcard).join('')}
/* hero card rotates between Top products (or the fans when none are marked Top) */
var HI=-1;
function hero(){var f=$('a.feat');if(!f||typeof VV_PRODUCTS==='undefined'||typeof P!=='function')return;
 var ids=Object.keys(VV_PRODUCTS),pool=ids.filter(function(i){return vvPin(i)<1e9&&P(i).img});
 if(!pool.length)pool=ids.filter(function(i){return P(i).st&&/fan/i.test(P(i).name)});
 if(pool.length<2&&!f.dataset.h0)return;
 if(!f.dataset.h0){f.dataset.h0=1;f._nepa=f.querySelector('.nepa')}
 HI=(HI+1)%pool.length;var id=pool[HI],p=P(id),fan=/fan/i.test(p.name);
 f.href=purl(id);f.classList.remove('hs');void f.offsetWidth;f.classList.add('hs');
 f.innerHTML='';if(fan&&f._nepa)f.appendChild(f._nepa);
 var im=document.createElement('img');im.src=p.img;im.alt=p.name;im.width=520;im.height=520;f.appendChild(im);
 var st=document.createElement('strong');st.textContent=p.name;f.appendChild(st);
 var sp=document.createElement('span');sp.textContent=naira(p.price)+(p.brand?' · '+p.brand:'');f.appendChild(sp)}
/* customer reviews */
function stars(n){return '★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n)}
function revList(){var el=$('#rvl');if(!el||typeof SUPA_URL==='undefined'||!SUPA_URL||typeof rest!=='function'||el.dataset.l)return;el.dataset.l=1;
 rest('site_reviews?select=name,rating,body,created_at&approved=eq.true&order=created_at.desc&limit=9',{headers:{Authorization:'Bearer '+SUPA_KEY}}).then(function(r){
  el.innerHTML=r&&r.length?r.map(function(x){return '<figure class="rv"><div class="rv-s" aria-label="'+x.rating+' out of 5">'+stars(x.rating)+'</div><blockquote>'+esc(x.body)+'</blockquote><figcaption>'+esc(x.name)+'</figcaption></figure>'}).join(''):'<p class="rv-e">No reviews yet. Be the first to share your experience.</p>'}).catch(function(){el.dataset.l='';el.innerHTML='<p class="rv-e">Be the first to share your experience.</p>'})}
function revForm(el){if(!el)return;var s=S();
 if(!s){el.innerHTML='<p class="rv-e"><a href="/login?next='+encodeURIComponent(location.pathname)+'"><b>Log in</b></a> to write a review.</p>';return}
 var nm=(typeof fname==='function'&&fname())||'';
 el.innerHTML='<form class="cx-f rv-fm"><h3>Write a review</h3><label><span>Your rating</span><select name="r"><option value="5">★★★★★ Excellent</option><option value="4">★★★★☆ Good</option><option value="3">★★★☆☆ Okay</option><option value="2">★★☆☆☆ Poor</option><option value="1">★☆☆☆☆ Bad</option></select></label><label><span>Name shown with your review</span><input name="n" maxlength="60" required></label><label><span>Your review</span><textarea name="b" rows="4" maxlength="800" required placeholder="Tell other shoppers about your order, delivery or the product"></textarea></label><button class="btn dkb">Submit review</button><p class="note rv-m"></p></form>';
 var f=$('form',el);f.n.value=nm;
 f.onsubmit=function(e){e.preventDefault();var b=$('button',f),m=$('.rv-m',f);if(f.b.value.trim().length<5){m.textContent='Please write a little more.';return}b.disabled=true;m.textContent='Sending...';
  rest('site_reviews',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({name:f.n.value.trim(),rating:+f.r.value,body:f.b.value.trim()})})
  .then(function(){f.b.value='';m.textContent='Thank you. Your review will show on the site once our team approves it.'}).catch(function(){m.textContent='Could not send your review right now. Please try again later.'}).then(function(){b.disabled=false})}}
/* 5. account pages: profile, addresses, coupons, reviews */
function acctPage(){var m=$('#vvap');if(!m)return;var k=m.dataset.k,s=S();
 function gate(){m.innerHTML='<div class="cx"><div class="cx-h"><b>'+m.dataset.t+'</b></div><p class="emp">Please log in to see this page.</p><div class="cx-b"><a class="btn dkb" href="/login?next='+encodeURIComponent(location.pathname)+'">Log in</a></div></div>';}
 if(!s){gate();return}
 if(k=='coupons')m.innerHTML='<div class="cx"><div class="cx-h"><b>Coupons Center</b></div><p class="emp">You have no coupons yet. When we run offers, your coupons will appear here.</p><div class="cx-b"><a class="btn dkb" href="/shop">Browse new arrivals</a></div></div>';
 if(k=='reviews'){m.innerHTML='<div class="cx"><div class="cx-h"><b>Product Reviews</b></div><div id="rvf2"></div></div>';revForm($('#rvf2'))}
 if(k=='profile'){var u=s.user||{},md=u.user_metadata||{};
  m.innerHTML='<div class="cx"><div class="cx-h"><b>Personal Information</b></div><form class="cx-f" id="pf"><label>Full name<input name="n" maxlength="80" value="'+esc(md.full_name||'')+'"></label><label>Phone number<input name="p" maxlength="30" value="'+esc(md.phone||'')+'"></label><label>Email<input value="'+esc(u.email||'')+'" disabled></label><button class="btn dkb">Save changes</button><p class="note" id="pm"></p></form></div>';
  $('#pf').onsubmit=function(e){e.preventDefault();var f=e.target,b=$('button',f),msg=$('#pm');b.disabled=true;msg.textContent='Saving...';
   vvf('/auth/v1/user',{method:'PUT',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+s.at},body:JSON.stringify({data:{full_name:f.n.value.trim(),phone:f.p.value.trim()}})})
   .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.msg||j.message||'Could not save');return j})})
   .then(function(j){s.user=j;lsSet('vvs',s);if(typeof acctBtn==='function')acctBtn();msg.textContent='Saved.'}).catch(function(x){msg.textContent=x.message}).then(function(){b.disabled=false})}}
 if(k=='addresses'){var A=[];try{A=JSON.parse(localStorage.getItem('vva')||'[]')}catch(e){}
  function sv(){try{localStorage.setItem('vva',JSON.stringify(A))}catch(e){}}
  function dr(){m.innerHTML='<div class="cx"><div class="cx-h"><b>Address Management</b></div>'+(A.length?A.map(function(a,i){return '<div class="ad"><div><b>'+esc(a.n)+'</b><br>'+esc(a.a)+'<br><small>'+esc(a.c)+' · '+esc(a.p)+'</small></div><button type="button" class="ddl" data-i="'+i+'" aria-label="Remove address">×</button></div>'}).join(''):'<p class="emp">No saved addresses yet.</p>')+'<form class="cx-f" id="af2"><label><span>Name</span><input name="n" required maxlength="60"></label><label>Street address<input name="a" required maxlength="160"></label><label>City and state<input name="c" required maxlength="80"></label><label>Phone number<input name="p" required maxlength="30"></label><button class="btn dkb">Add address</button><p class="note">Addresses are saved on this device only.</p></form></div>';
   [].forEach.call(m.querySelectorAll('.ddl'),function(b){b.onclick=function(){A.splice(+b.dataset.i,1);sv();dr()}});
   $('#af2').onsubmit=function(e){e.preventDefault();var f=e.target;A.push({n:f.n.value.trim(),a:f.a.value.trim(),c:f.c.value.trim(),p:f.p.value.trim()});sv();dr()}}
  dr()}}
function go(){strip();acctDrawer();acctPage();
 if(typeof cartPage==='function'){window.cartPage=cartPage2;cartPage2()}
 if(typeof dbGrids==='function'){var o=dbGrids;window.dbGrids=function(){o.apply(this,arguments);allNew()};}
 allNew();hero();revList();revForm($('#rvf'))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
/* the shared page script finishes loading data a moment later, so refresh the pieces that depend on it */
var n=0,iv=setInterval(function(){allNew();revList();if(++n>12)clearInterval(iv)},800);setInterval(hero,6500);
})();
