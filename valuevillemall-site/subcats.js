/* ValueVille sub-categories: menu drawer, category pages and the shop filter.
   Tree matches the admin console (ADM_CATS in admin.js). Products carry raw.sub_category. */
(function(){
var T=[{"name":"Electronics","subs":["Televisions & Home Theatre","Fans & Air Cooling","Air Conditioners","Refrigerators & Freezers","Small Kitchen Electronics","Laundry & Ironing","Power & Solar","Lighting & TV Accessories"]},{"name":"Cookware & Kitchen Appliances","subs":["Pots & Pans Set","Pressure & Rice Cookers","Blenders & Processors","Microwave, Air Fryer & Ovens","Breakfast Makers","Kettles & Flasks","Knives, Boards & Utensils","Storage, Cleaning & Gas"]},{"name":"Home Appliances","subs":["Air Conditioning & Cooling","Refrigeration","Laundry & Cleaning","Kitchen Appliances","Water & Air Solutions","Power & Safety"]},{"name":"Phones, Tablets & Accessories","subs":["Smartphones - iPhone & Samsung","Smartphones - Other Brands","Tablets & iPads","Power Banks & Chargers","Earbuds & Speakers","Smart Watches","Cables & Storage","Cases, Holders & Photography"]},{"name":"Computing","subs":["Laptops","Desktops & Gaming PCs","Monitors & Projectors","Mice, Keyboards & Desk","Bags, Chargers & Batteries","Storage Devices","Networking & Power","Printers & Office","Accessories & Maintenance"]},{"name":"Furniture","subs":["Living Room - Sofas","Living Room - Tables & Storage","Dining & Bar","Bedroom - Beds & Mattresses","Bedroom - Wardrobes & Dressing","Office Furniture","Plastic & Outdoor","Decor & Storage"]},{"name":"Fashion","subs":["Men's Clothing","Men's Underwear & Accessories","Women's Clothing","Women's Underwear & Accessories","Footwear - Men & Women","Bags & Luggage","Watches, Glasses & Jewelry","Perfume & Fabrics"]},{"name":"Baby Products","subs":["Diapers & Wipes","Bathing & Skincare","Feeding & Nursing","Clothing & Accessories","Gear & Furniture","Toys & Learning","Maternity"]},{"name":"Gaming","subs":["PlayStation","Xbox & Nintendo","Gaming PCs & Chairs","Monitors & Peripherals","VR & Streaming","Board Games & Storage"]},{"name":"Sport & Outdoors","subs":["Fitness - Cardio","Fitness - Strength & Yoga","Football & Team Sports","Boxing & Combat","Camping & Hiking","Swimming & Water","Cycling, Skating & Safety"]},{"name":"Books & Stationery","subs":["Exams & Dictionaries","Self-Help & Novels","Academic & Kids Books","Exercise & Note Books","Pens & Pencils","Math & Calculators","Office Supplies","Boards & School Bags"]},{"name":"Smart Gadget","subs":["Smart Watches & Bands","Smart TV & Speakers","Smart Lighting","Smart Security","Smart Home Control","Cleaning & Health Gadgets","Smart Projectors & VR","Trackers & Car Smart","Smart Living Others"]},{"name":"Automobile","subs":["Tires & Batteries","Oils & Fluids","Wash & Care","Electronics & Security","Tools & Emergency","Exterior & Roof","Audio & Interior"]},{"name":"Health & Beauty","subs":["Body Lotion & Oils","Soaps & Oral Care","Deodorants & Body Spray","Hair Care & Extensions","Makeup","Skincare","Perfumes & Fragrance","Nails","Health Devices & Supplements"]},{"name":"Groceries & Supermarket","subs":["Rice, Beans & Swallow","Pasta & Noodles","Cooking Oils","Tomato, Seasoning & Spices","Proteins - Fresh & Frozen","Milk, Beverages & Breakfast","Snacks & Confectionery","Drinks - Soft, Energy & Alcoholic","Cleaning & Household","Fresh Tubers, Vegetables & Fruits"]},{"name":"More Items","subs":["Home Essentials","Kitchen & Cooler","Safety & Security","Tools & Workshop","Building Materials","Garden & Farm","Pets & Animal Feed","Solar & Power","Kids Outdoor & Party"]}];
var slug=function(n){return n.toLowerCase().replace(/,/g,'').replace(/&/g,'').trim().replace(/\s+/g,'-')};
var enc=encodeURIComponent,esc=function(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var node=function(n){for(var i=0;i<T.length;i++)if(T[i].name===n)return T[i]};
function subOf(id){try{var p=P(id);if(!p)return'';var r=p.raw;if(r&&r.sub_category)return r.sub_category;
  if(!r&&p.cat==='Electronics'&&/fan/i.test(p.name))return'Fans & Air Cooling'}catch(e){}return''}
function cardId(c){var h=c.querySelector('.heart');return h?h.dataset.id:''}
function watch(el,fn,opt){if(!el||!window.MutationObserver)return;var busy=false;new MutationObserver(function(){if(busy)return;busy=true;try{fn()}finally{setTimeout(function(){busy=false},0)}}).observe(el,opt)}

/* 1. menu drawer: each category opens to its sub-categories */
function menu(){var m=document.getElementById('menu');if(!m||m.dataset.subs)return;m.dataset.subs=1;
  var links=[].slice.call(m.querySelectorAll(':scope>a'));
  links.forEach(function(a){var c=node(a.textContent.trim());if(!c)return;
    var w=document.createElement('div');w.className='mc';a.parentNode.insertBefore(w,a);w.appendChild(a);
    var b=document.createElement('button');b.type='button';b.className='mt';b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','Show '+c.name+' sub-categories');b.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    var l=document.createElement('div');l.className='ms';l.hidden=true;
    l.innerHTML=c.subs.map(function(s){return'<a href="/'+slug(c.name)+'?sub='+enc(s)+'">'+esc(s)+'</a>'}).join('');
    b.onclick=function(){var o=l.hidden;l.hidden=!o;b.setAttribute('aria-expanded',String(o));w.classList.toggle('open',o)};
    w.appendChild(b);w.parentNode.insertBefore(l,w.nextSibling)})}

/* 2. category pages */
function catPage(){var c=document.getElementById('dbc');if(!c)return;var c0=node(c.dataset.cat);if(!c0)return;
  var cur=new URLSearchParams(location.search).get('sub')||'';var nav=null;
  function cards(){return[].slice.call(c.querySelectorAll('.pc'))}
  function apply(){if(c.hidden)return;var cs=cards();if(!cs.length&&!nav)return;
    var cnt={};cs.forEach(function(x){var s=subOf(cardId(x));cnt[s]=(cnt[s]||0)+1;x.hidden=!!cur&&s!==cur});
    if(!nav){nav=document.createElement('nav');nav.className='subs';nav.setAttribute('aria-label','Sub-categories');
      var g=c.querySelector('.pgrid')||c.lastElementChild;g.parentNode.insertBefore(nav,g);
      nav.addEventListener('click',function(e){var a=e.target.closest('a');if(!a)return;e.preventDefault();cur=a.dataset.s||'';
        try{history.replaceState(null,'',cur?'?sub='+enc(cur):location.pathname)}catch(x){}apply()})}
    nav.innerHTML='<a href="?" data-s=""'+(!cur?' class="on" aria-current="true"':'')+'>All <small>'+cs.length+'</small></a>'+
      c0.subs.map(function(s){var n=cnt[s]||0;return'<a href="?sub='+enc(s)+'" data-s="'+esc(s)+'" class="'+(cur===s?'on':'')+(n?'':' z')+'"'+(cur===s?' aria-current="true"':'')+'>'+esc(s)+(n?' <small>'+n+'</small>':'')+'</a>'}).join('');
    var z=c.querySelector('.subz');if(z)z.remove();
    if(cur&&!(cnt[cur]||0)){var p=document.createElement('p');p.className='lead subz';p.textContent='New '+cur+' products are being added. Check back soon, or pick another sub-category.';nav.insertAdjacentElement('afterend',p)}}
  watch(c,apply,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true});apply()}

/* 3. shop filter: sub-category group that follows the chosen categories */
function shopPage(){var sf=document.getElementById('sf');if(!sf)return;var sg=document.getElementById('sg');var picked={},qs=new URLSearchParams(location.search).get('sub');if(qs)picked[qs]=1;var wrap=null;
  function draw(){if(!wrap)return;var cs=[].slice.call(sf.querySelectorAll('input[data-g=c]:checked')).map(function(x){return x.value}),subs=[];
    cs.forEach(function(n){var c=node(n);if(c)c.subs.forEach(function(s){subs.push(s)})});
    Object.keys(picked).forEach(function(s){if(subs.indexOf(s)<0)delete picked[s]});
    wrap.innerHTML=subs.length?'<h3>Sub-category</h3><div class="fl">'+subs.map(function(s){return'<label class="chk"><input type="checkbox" data-g="s" value="'+esc(s)+'"'+(picked[s]?' checked':'')+'> '+esc(s)+'</label>'}).join('')+'</div>':''}
  function filt(){var on=[].slice.call(sf.querySelectorAll('input[data-g=s]:checked')).map(function(x){return x.value});picked={};on.forEach(function(s){picked[s]=1});
    if(!on.length&&!qs)return;var list=on.length?on:Object.keys(picked);if(!list.length)return;
    var cs=[].slice.call(sg.querySelectorAll('.pc')),n=0;cs.forEach(function(x){var ok=list.indexOf(subOf(cardId(x)))>-1;x.hidden=!ok;if(ok)n++});
    var sc=document.getElementById('sc');if(sc)sc.textContent='Showing '+n+' product'+(n==1?'':'s')}
  function boot(){if(wrap||!sf.querySelector('#fq'))return;wrap=document.createElement('div');wrap.id='fsubw';
    var h=[].slice.call(sf.querySelectorAll('h3')).filter(function(x){return x.textContent.trim()==='Brand'})[0];
    if(h)sf.insertBefore(wrap,h);else sf.appendChild(wrap);draw();
    sf.addEventListener('input',function(e){if(e.target.matches&&e.target.matches('input[data-g=c]'))draw();setTimeout(filt,0)});
    var cl=document.getElementById('fclr');if(cl)cl.addEventListener('click',function(){qs='';picked={};setTimeout(function(){draw();filt()},0)});
    watch(sg,function(){filt()},{childList:true});filt()}
  if(sf.querySelector('#fq'))boot();else watch(sf,boot,{childList:true})}

function go(){try{menu();catPage();shopPage()}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();
