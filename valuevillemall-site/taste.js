/* ValueVille UI layer: mega menu, search overlay, CTA states, footer newsletter.
   Follows the oraimo-ui-taste skill structure. Brand colours and logo are unchanged. */
(function(){
var VV_SOCIAL={/* add real links to show the FOLLOW US row, e.g. instagram:'https://instagram.com/yourhandle' */};
var T=[{"name":"Electronics","subs":["Televisions & Home Theatre","Fans & Air Cooling","Air Conditioners","Refrigerators & Freezers","Small Kitchen Electronics","Laundry & Ironing","Power & Solar","Lighting & TV Accessories"]},{"name":"Cookware & Kitchen Appliances","subs":["Pots & Pans Set","Pressure & Rice Cookers","Blenders & Processors","Microwave, Air Fryer & Ovens","Breakfast Makers","Kettles & Flasks","Knives, Boards & Utensils","Storage, Cleaning & Gas"]},{"name":"Home Appliances","subs":["Air Conditioning & Cooling","Refrigeration","Laundry & Cleaning","Kitchen Appliances","Water & Air Solutions","Power & Safety"]},{"name":"Phones, Tablets & Accessories","subs":["Smartphones - iPhone & Samsung","Smartphones - Other Brands","Tablets & iPads","Power Banks & Chargers","Earbuds & Speakers","Smart Watches","Cables & Storage","Cases, Holders & Photography"]},{"name":"Computing","subs":["Laptops","Desktops & Gaming PCs","Monitors & Projectors","Mice, Keyboards & Desk","Bags, Chargers & Batteries","Storage Devices","Networking & Power","Printers & Office","Accessories & Maintenance"]},{"name":"Furniture","subs":["Living Room - Sofas","Living Room - Tables & Storage","Dining & Bar","Bedroom - Beds & Mattresses","Bedroom - Wardrobes & Dressing","Office Furniture","Plastic & Outdoor","Decor & Storage"]},{"name":"Fashion","subs":["Men's Clothing","Men's Underwear & Accessories","Women's Clothing","Women's Underwear & Accessories","Footwear - Men & Women","Bags & Luggage","Watches, Glasses & Jewelry","Perfume & Fabrics"]},{"name":"Baby Products","subs":["Diapers & Wipes","Bathing & Skincare","Feeding & Nursing","Clothing & Accessories","Gear & Furniture","Toys & Learning","Maternity"]},{"name":"Gaming","subs":["PlayStation","Xbox & Nintendo","Gaming PCs & Chairs","Monitors & Peripherals","VR & Streaming","Board Games & Storage"]},{"name":"Sport & Outdoors","subs":["Fitness - Cardio","Fitness - Strength & Yoga","Football & Team Sports","Boxing & Combat","Camping & Hiking","Swimming & Water","Cycling, Skating & Safety"]},{"name":"Books & Stationery","subs":["Exams & Dictionaries","Self-Help & Novels","Academic & Kids Books","Exercise & Note Books","Pens & Pencils","Math & Calculators","Office Supplies","Boards & School Bags"]},{"name":"Smart Gadget","subs":["Smart Watches & Bands","Smart TV & Speakers","Smart Lighting","Smart Security","Smart Home Control","Cleaning & Health Gadgets","Smart Projectors & VR","Trackers & Car Smart","Smart Living Others"]},{"name":"Automobile","subs":["Tires & Batteries","Oils & Fluids","Wash & Care","Electronics & Security","Tools & Emergency","Exterior & Roof","Audio & Interior"]},{"name":"Health & Beauty","subs":["Body Lotion & Oils","Soaps & Oral Care","Deodorants & Body Spray","Hair Care & Extensions","Makeup","Skincare","Perfumes & Fragrance","Nails","Health Devices & Supplements"]},{"name":"Groceries & Supermarket","subs":["Rice, Beans & Swallow","Pasta & Noodles","Cooking Oils","Tomato, Seasoning & Spices","Proteins - Fresh & Frozen","Milk, Beverages & Breakfast","Snacks & Confectionery","Drinks - Soft, Energy & Alcoholic","Cleaning & Household","Fresh Tubers, Vegetables & Fruits"]},{"name":"More Items","subs":["Home Essentials","Kitchen & Cooler","Safety & Security","Tools & Workshop","Building Materials","Garden & Farm","Pets & Animal Feed","Solar & Power","Kids Outdoor & Party"]}];
var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
var slug=function(n){return n.toLowerCase().replace(/,/g,'').replace(/&/g,'').trim().replace(/\s+/g,'-')},enc=encodeURIComponent;
var esc=function(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var wide=function(){return matchMedia('(min-width:900px)').matches};
function prods(){try{return typeof VV_PRODUCTS!=='undefined'?VV_PRODUCTS:{}}catch(e){return{}}}
function isNew(p){try{return typeof vvNew==='function'&&vvNew(p.raw)}catch(e){return false}}
function url(id){try{return purl(id)}catch(e){return'/'+id}}
function tile(id,cls){var p=prods()[id];if(!p)return'';return'<a class="vt '+(cls||'')+'" href="'+url(id)+'"><span class="vt-i"><img src="'+esc(p.img)+'" alt="" loading="lazy">'+(isNew(p)?'<em>New Arrival</em>':'')+'</span><b>'+esc(p.name)+'</b></a>'}

/* ---------- 1. mega menu ---------- */
function mega(){var nav=$('nav.cats');if(!nav||nav.dataset.mega)return;nav.dataset.mega=1;
 var panel=document.createElement('div');panel.className='mega';panel.hidden=true;nav.appendChild(panel);var cur=null,t;
 function show(a,c){clearTimeout(t);cur=a;$$('a',nav).forEach(function(x){x.classList.toggle('on',x===a)});
  var ids=Object.keys(prods()).filter(function(i){return prods()[i].cat===c.name}).slice(0,4);
  panel.innerHTML='<div class="mega-in"><div class="mega-g"><h4><a href="/'+slug(c.name)+'">'+esc(c.name)+'</a></h4>'+c.subs.map(function(s){return'<a href="/'+slug(c.name)+'?sub='+enc(s)+'">'+esc(s)+'</a>'}).join('')+'<a class="va" href="/'+slug(c.name)+'">View All '+esc(c.name)+' &gt;</a></div>'+
   (ids.length?'<div class="mega-t"><h4>Popular in '+esc(c.name)+'</h4><div class="vts">'+ids.map(function(i){return tile(i)}).join('')+'</div></div>':'')+
   '<aside class="mega-p"><b>Shop on the app</b><span>Faster shopping and order tracking.</span><a class="btn" href="#" onclick="if(window.vvInstall)vvInstall();return false">GET</a></aside></div>';panel.hidden=false}
 function hide(){t=setTimeout(function(){panel.hidden=true;cur=null;$$('a',nav).forEach(function(x){x.classList.remove('on')})},140)}
 $$('.w>a',nav).forEach(function(a){var h=(a.getAttribute('href')||'').replace(/^\//,'').split('?')[0];var c=T.filter(function(x){return slug(x.name)===h})[0];if(!c)return;
  a.addEventListener('mouseenter',function(){if(wide())show(a,c)});a.addEventListener('focus',function(){if(wide())show(a,c)});
  a.addEventListener('click',function(e){if(wide()&&cur!==a){e.preventDefault();show(a,c)}})});
 nav.addEventListener('mouseleave',hide);panel.addEventListener('mouseenter',function(){clearTimeout(t)});
 document.addEventListener('keydown',function(e){if(e.key==='Escape')panel.hidden=true});
 document.addEventListener('click',function(e){if(!e.target.closest('nav.cats'))panel.hidden=true})}

/* ---------- 2. search overlay ---------- */
var RK='vv-recent';function recent(){try{return JSON.parse(localStorage.getItem(RK))||[]}catch(e){return[]}}
function remember(q){q=q.trim();if(!q)return;var r=recent().filter(function(x){return x.toLowerCase()!==q.toLowerCase()});r.unshift(q);try{localStorage.setItem(RK,JSON.stringify(r.slice(0,6)))}catch(e){}}
function search(){var f=$('form.search'),q=$('#q');if(!f||!q||f.dataset.ov)return;f.dataset.ov=1;
 var ov=document.createElement('div');ov.className='sov';ov.hidden=true;f.appendChild(ov);
 var pop=['Fan','Rechargeable fan','Ceiling fan','Power bank','Blender','Laptop'];
 function chips(a,c){return a.map(function(x){return'<a class="chip2" href="/shop?q='+enc(x)+'">'+esc(x)+'</a>'}).join('')}
 function draw(){var v=q.value.trim().toLowerCase(),P=prods(),ids=Object.keys(P),h='';
  if(v){var hits=ids.filter(function(i){return(P[i].name+' '+(P[i].brand||'')+' '+(P[i].cat||'')).toLowerCase().indexOf(v)>-1}).slice(0,6);
   h='<h5>Results</h5>'+(hits.length?'<div class="vts">'+hits.map(function(i){return tile(i)}).join('')+'</div>':'<p class="sn">No match yet. Try another word or browse the shop.</p>')+'<a class="va" href="/shop?q='+enc(v)+'">Search the shop for “'+esc(q.value.trim())+'” &gt;</a>'}
  else{var r=recent();if(r.length)h+='<h5>Recent Searches <button type="button" class="clr">Clear</button></h5><div class="chs">'+chips(r)+'</div>';
   h+='<h5>Most frequently searched</h5><div class="chs">'+chips(pop)+'</div><h5>Recommendations</h5><div class="vts">'+ids.slice(0,4).map(function(i){return tile(i)}).join('')+'</div><a class="va" href="/shop">Browse all products &gt;</a>'}
  ov.innerHTML=h;var c=$('.clr',ov);if(c)c.onclick=function(){try{localStorage.removeItem(RK)}catch(e){}draw()}}
 function open(){draw();ov.hidden=false}function close(){ov.hidden=true}
 q.addEventListener('focus',open);q.addEventListener('input',draw);
 document.addEventListener('click',function(e){if(!e.target.closest('form.search'))close()});
 document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
 f.addEventListener('submit',function(e){e.preventDefault();e.stopImmediatePropagation();var v=q.value.trim();if(!v)return;remember(v);location.href='/shop?q='+enc(v)},true);
 ov.addEventListener('click',function(e){var a=e.target.closest('a.chip2');if(a)remember(decodeURIComponent((a.search.match(/q=([^&]*)/)||[0,''])[1]))})}

/* ---------- 3. CTA states: busy labels, Arrival Reminder ---------- */
function busy(){document.addEventListener('click',function(e){var b=e.target.closest('button.btn');if(!b||b.disabled)return;var o=b.getAttribute('onclick')||'',L=/vvBuyNow/.test(o)?'Buying...':/vvAddId|vvMove/.test(o)?'Adding...':'';if(!L)return;
  var was=b.textContent;b.textContent=L;b.classList.add('busy');setTimeout(function(){b.textContent=was;b.classList.remove('busy')},1100)},true)}
function arrival(){var n=0,iv=setInterval(function(){n++;if(n>30)clearInterval(iv);var el=$('#buy');if(!el)return;var id=el.dataset.pid,p=prods()[id];if(!p||!p.raw||!(p.raw.stock===0||p.raw.stock==='0'))return;
  var row=$('.pd .info .row');if(!row||row.dataset.oos)return;row.dataset.oos=1;clearInterval(iv);
  row.innerHTML='<a class="btn" href="mailto:valuevillemall@gmail.com?subject='+enc('Arrival Reminder: '+p.name)+'">Arrival Reminder</a>';
  row.insertAdjacentHTML('afterend','<p class="oos">This product is out of stock right now. Tap Arrival Reminder and we will tell you when it is back.</p>');
  var q=$('.pd .info .qty');if(q)q.hidden=true},300)}

/* ---------- 4. footer: social, newsletter ---------- */
function footer(){var ft=$('footer.ft');if(!ft||ft.dataset.nl)return;ft.dataset.nl=1;var b=$('.ft-b',ft);if(!b)return;
 var soc=Object.keys(VV_SOCIAL).map(function(k){return'<a href="'+esc(VV_SOCIAL[k])+'" rel="noopener" target="_blank">'+esc(k.charAt(0).toUpperCase()+k.slice(1))+'</a>'}).join('');
 var d=document.createElement('div');d.className='w ft-nl';
 d.innerHTML=(soc?'<div class="ft-s"><b>FOLLOW US</b>'+soc+'</div>':'')+'<form class="nl" novalidate><b>Get the Latest ValueVille MALL Offers</b><div class="nl-r"><span class="nl-p">NG +234</span><input type="tel" inputmode="tel" placeholder="Phone number" aria-label="Phone number" required><button class="btn" type="submit">Subscribe</button></div><small>By subscribing you agree to our <a href="/terms">Terms &amp; Conditions</a>.</small><p class="nl-m" role="status"></p></form>';
 ft.insertBefore(d,b);var f=$('.nl',d);f.onsubmit=function(e){e.preventDefault();var v=$('input',f).value.replace(/\D/g,'').replace(/^0/,'');if(v.length<10){$('.nl-m',f).textContent='Enter a valid phone number.';return}
  $('.nl-m',f).textContent='Opening your email app to confirm. Send it and you are subscribed.';location.href='mailto:valuevillemall@gmail.com?subject='+enc('Subscribe me to ValueVille offers')+'&body='+enc('Please add +234'+v+' to the ValueVille MALL offers list.')}}

function init(){mega();search();busy();arrival();footer()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
