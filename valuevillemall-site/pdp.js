(function(){
var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
/* Previous (slashed) prices live in prices.js. Products with none show no slash. */
var WAS=window.PDP_WAS||{};
var FAQ=[['How do I pay?','Payment is online through Paystack. An account is needed to order, so sign up or log in at checkout.'],
['Can I pay in instalments?','Yes, for eligible products on orders from ₦ 50,000, over 3 to 24 months. Choose "Pay in instalments" above the Buy button to see your monthly amount before you commit.'],
['How is my order delivered?','We deliver fast in Uyo and across Akwa Ibom, Port Harcourt, Calabar and nationwide. You get a tracking code at checkout to follow your order.'],
['What if there is a problem with my order?','Please read our Terms and Conditions. Replacement or exchange with another product of equal value is offered subject to management approval and within 48 hours.']];
function naira(n){return '₦ '+Number(n).toLocaleString('en-NG')}
function slash(buy,id){
 var q=document.getElementById('amt'),p=(typeof VV_PRODUCTS!=='undefined'&&VV_PRODUCTS[id])||{},now=+p.price,was=+(WAS[id]||(p.raw&&p.raw.old_price)||0),old=$('.pdp-save',buy);
 if(!q||!(was>now&&now>0)||buy.dataset.mode==='inst'){if(old)old.remove();return}
 if(old)return;var off=Math.round((was-now)/was*100),d=document.createElement('div');d.className='pdp-save';
 d.innerHTML='<s>'+naira(was)+'</s><em>-'+off+'% off</em><span>You save '+naira(was-now)+'</span>';q.before(d)}
function build(){
 var pd=$('.pd'),info=pd&&$('.info',pd),buy=info&&$('#buy');
 if(!buy||!$('#amt',buy)||info.dataset.pdp)return false;
 info.dataset.pdp=1;var main=$('main section.blk')||$('main');main.classList.add('pdp');document.body.classList.add('pdp-b');
 // read more
 var p=$('p',info);if(p&&p.textContent.length>150){p.classList.remove('open');var rm=document.createElement('button');rm.className='rm';rm.type='button';rm.textContent='Read more';rm.onclick=function(){var o=p.classList.toggle('open');rm.textContent=o?'Show less':'Read more'};p.after(rm)}
 // highlights chips from first features
 var fl=$$('.pd2 .ft-l li');if(fl.length){var hl=document.createElement('div');hl.className='hl';hl.innerHTML=fl.slice(0,4).map(function(li){return '<span>'+esc(li.textContent.split(/\s[-–:]\s/)[0].trim())+'</span>'}).join('');(rm||p||$('h1',info)).after(hl)}
 // trust cards
 var tr=$('.trust',info),t=document.createElement('div');t.className='tc3';
 t.innerHTML='<div><i>₦</i><b>Safe Payments</b><span>Pay securely online, in full or in instalments from ₦ 50,000</span></div><div><i>⌖</i><b>Secure Logistics</b><span>A tracking code from checkout to your door</span></div><div><i>➜</i><b>Nationwide Delivery</b><span>Uyo, Port Harcourt, Calabar and beyond</span></div>';
 if(tr)tr.after(t);else info.appendChild(t);
 // tabs + sections
 var sec=$('.pd2'),feats=$('.pd2 .ft-l'),spec=$('.pd2 .spec'),parts=[];
 var tabs=document.createElement('nav');tabs.className='pdp-tabs';
 var anchor=sec||pd;
 var fW=null,sW=null,qW=null;
 if(feats){fW=document.createElement('section');fW.className='pdp-sec';fW.id='features';fW.innerHTML='<h2>Key features</h2><div class="fgrid">'+$$('li',feats).map(function(li,i){var tx=li.textContent.trim(),m=tx.split(/\s[-–:]\s/),h=m.shift(),b=m.join(' - ');return '<div><em>'+String(i+1).padStart(2,'0')+'</em><b>'+esc(h)+'</b>'+(b?'<span>'+esc(b)+'</span>':'')+'</div>'}).join('')+'</div>';parts.push(['features','Features'])}
 if(spec){sW=document.createElement('section');sW.className='pdp-sec';sW.id='specs';sW.innerHTML='<h2>Specifications</h2>';sW.appendChild(spec);parts.push(['specs','Specifications'])}
 qW=document.createElement('section');qW.className='pdp-sec';qW.id='faqs';qW.innerHTML='<h2>Frequently asked questions</h2><div class="faq2">'+FAQ.map(function(f,i){return '<details'+(i?'':' open')+'><summary>'+f[0]+'</summary><p>'+f[1]+'</p></details>'}).join('')+'</div>';parts.push(['faqs','FAQs']);
 tabs.innerHTML='<a href="#top-pd" class="on">Overview</a>'+parts.map(function(x){return '<a href="#'+x[0]+'">'+x[1]+'</a>'}).join('');
 pd.id='top-pd';pd.after(tabs);var last=tabs;[fW,sW,qW].forEach(function(n){if(n){last.after(n);last=n}});
 if(sec)sec.remove();
 // related
 try{var cur=(buy.dataset.pid||'');var ids=Object.keys(VV_PRODUCTS).filter(function(i){return i!==cur&&(VV_PRODUCTS[cur]&&VV_PRODUCTS[i].cat===VV_PRODUCTS[cur].cat)});if(ids.length<3)ids=Object.keys(VV_PRODUCTS).filter(function(i){return i!==cur});
  if(ids.length&&typeof pcard==='function'){var rel=document.createElement('section');rel.className='pdp-sec';rel.innerHTML='<h2>You may also like</h2><div class="pgrid">'+ids.slice(0,4).map(pcard).join('')+'</div>';var tg=$('.tags',main);tg?tg.before(rel):last.after(rel)}}catch(e){}
 // scrollspy
 var links=$$('a',tabs);window.addEventListener('scroll',function(){var y=scrollY+170,cur=0;parts.forEach(function(x,i){var e=document.getElementById(x[0]);if(e&&e.offsetTop<=y)cur=i+1});links.forEach(function(a,i){a.classList.toggle('on',i===cur)})},{passive:true});
 // sticky mobile bar
 var id=buy.dataset.pid,bar=document.createElement('div');bar.className='pdp-sticky';
 bar.innerHTML='<b><small>Price</small><span id="sp"></span></b><button class="btn ghost" type="button">Add to Cart</button><button class="btn" type="button">Buy It Now</button>';
 document.body.appendChild(bar);var bs=$$('button',bar);bs[0].onclick=function(){vvAddId(id)};bs[1].onclick=function(){vvBuyNow(id)};
 function sync(){var a=$('#amt');if(a)$('#sp',bar).textContent=a.childNodes[0].textContent}sync();new MutationObserver(sync).observe(buy,{childList:true,subtree:true,characterData:true});
 slash(buy,id);new MutationObserver(function(){slash(buy,id)}).observe(buy,{childList:true});
 return true}
var n=0,iv=setInterval(function(){if(build()||++n>60)clearInterval(iv)},250);
})();
