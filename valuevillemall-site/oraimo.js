/* oraimo-style top strips: dismissible app bar + notice bar. Hidden inside the installed app. */
(function(){
 var K='vv-ora-dismissed',d={};
 try{d=JSON.parse(sessionStorage.getItem(K)||'{}')}catch(e){}
 function save(){try{sessionStorage.setItem(K,JSON.stringify(d))}catch(e){}}
 var standalone=false;try{standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone}catch(e){}
 function init(){
  [].slice.call(document.querySelectorAll('[data-ora-bar]')).forEach(function(b){
   var id=b.getAttribute('data-ora-bar');
   if(d[id]||(id==='app'&&standalone)){b.hidden=true;return}
   var x=b.querySelector('.ora-x');
   if(x)x.addEventListener('click',function(){b.hidden=true;d[id]=1;save()});
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
