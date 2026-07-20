/** XHS Live Parser v2.2.0 */
(function(){
'use strict';
var K='xhs_key',E='xhs_ep',R=false,O=null,A=null;
function ka(){try{var c=new(window.AudioContext||window.webkitAudioContext)();var b=c.createBuffer(1,c.sampleRate,c.sampleRate);var s=c.createBufferSource();s.buffer=b;s.loop=true;s.connect(c.destination);s.start();A=c;setInterval(function(){if(c.state==='suspended')c.resume()},3e4)}catch(e){}}
var rx1=new RegExp('xiaohongshu\\.com/(?:explore|discovery/item)/([a-f0-9]+)','i');
var rx2=new RegExp('https?://[^\\s]*(?:xiaohongshu\\.com|xhslink\\.com)[^\\s]*','gi');
function nid(u){var m=u.match(rx1);return m?m[1]:null}
function bob(n){var e=n.nodeType===1?n:n.parentElement;while(e&&e!==document.body){if(e.matches&&(e.matches('[class*="chat-bubble"]')||e.matches('[class*="message"]')))return e;e=e.parentElement}return null}
async function api(ep,k,pid){try{var r=await fetch('https://api.getoneapi.com/api/xiaohongshu/'+ep,{method:'POST',headers:{'Authorization':'Bearer '+k,'Content-Type':'application/json'},body:JSON.stringify({noteId:pid})});return await r.json()}catch(e){return null}}
function hcard(d){var t=d.title||'?';var a=d.author||d.user_name||'';var de=d.desc||d.description||d.content||'';var im=d.images||d.image_list||d.pics||[];var s=im.length?(typeof im[0]=='string'?im[0]:im[0].url||''):'';var tg=d.tags||d.tag_list||[];var h='<div style="border:1px solid #333;border-radius:12px;overflow:hidden;margin:8px 0;background:#1a1a2e;font-size:13px;color:#e0e0e0"><div style="padding:10px 12px;border-bottom:1px solid #333;font-size:12px;color:#ff2442;font-weight:600"><span style="background:#ff2442;color:#fff;padding:2px 6px;border-radius:3px;font-size:10px;margin-right:6px">RED</span>灏忕孩涔?/div><div style="display:flex;gap:12px;padding:12px">';if(s)h+='<div style="width:72px;height:72px;flex-shrink:0;border-radius:8px;overflow:hidden;background:#2a2a3e"><img src="'+s+'" style="width:100%;height:100%;object-fit:cover" onerror="javascript:void(0)"></div>';h+='<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px;margin-bottom:4px">'+t+'</div>';if(a)h+='<div style="font-size:12px;color:#999;margin-bottom:4px">'+a+'</div>';h+='<div style="font-size:12px;color:#888">'+(de||'')+'</div></div></div>';if(tg.length){h+='<div style="display:flex;flex-wrap:wrap;gap:4px;padding:0 12px 10px">';for(var i=0;i<Math.min(tg.length,5);i++){var tn=typeof tg[i]=='string'?tg[i]:tg[i].name||tg[i].tag_name||'';h+='<span style="font-size:11px;color:#ff2442;padding:2px 6px;border-radius:4px;background:rgba(255,36,66,0.1)">#'+tn+'</span>'}h+='</div>'}h+='</div>';var dv=document.createElement('div');dv.innerHTML=h;return dv}
function start(ep,k){if(O)O.disconnect();R=true;O=new MutationObserver(function(m){m.forEach(function(mu){if(mu.type!=='childList'||!mu.addedNodes.length)return;for(var i=0;i<mu.addedNodes.length;i++){var n=mu.addedNodes[i];if(n.nodeType!==1&&n.nodeType!==3)continue;var t=n.textContent||'';var ls=t.match(rx2);if(!ls||!ls.length)continue;var b=bob(n);if(!b||b.dataset.x)continue;b.dataset.x='1';var l=ls[0];var ni=nid(l);if(!ni)continue;api(ep,k,ni).then(function(d){if(d&&d.code===200&&d.data){var c=hcard(d.data);b.parentNode.insertBefore(c,b.nextSibling)}}).catch(function(){})}})}});O.observe(document.body,{childList:true,subtree:true})}
function stop(){if(O){O.disconnect();O=null}R=false}
window.RochePlugin.register({id:'xhs-live-parser',name:'XHS Link Parser',version:'2.2.0',apps:[{id:'xhs-live-parser-main',name:'\u5b9e\u65f6\u89e3\u6790',icon:'link',async mount(c,r){var k=(await r.storage.get(K))||'';var ep=(await r.storage.get(E))||'fetch_video_detail';c.innerHTML='<div style="padding:16px;display:flex;flex-direction:column;gap:12px;font-size:14px;color:var(--c-text,#e0e0e0)"><div style="font-size:18px;font-weight:600">XHS \u5b9e\u65f6\u89e3\u6790</div><div id="xss" style="display:flex;align-items:center;gap:8px;padding:12px;border-radius:8px;background:var(--c-surface,#222)"><div style="width:10px;height:10px;border-radius:50%;background:'+(R?'#4ecca3':'#555')+'"></div><span>'+(R?'\u76d1\u63a7\u4e2d \u2713':'\u672a\u542f\u52a8')+'</span></div><label style="font-size:13px;color:#999">API Key</label><input id="xk" type="password" value="'+k+'" placeholder="\u8f93\u5165 OneAPI Key" style="padding:10px;border:1px solid #333;border-radius:8px;background:var(--c-surface,#222);color:var(--c-text,#e0e0e0);outline:none;width:100%"><label style="font-size:13px;color:#999">Endpoint</label><input id="xe" value="'+ep+'" placeholder="fetch_video_detail" style="padding:10px;border:1px solid #333;border-radius:8px;background:var(--c-surface,#222);color:var(--c-text,#e0e0e0);outline:none;width:100%"><div style="display:flex;gap:8px"><button id="xsv" style="flex:1;padding:10px 20px;background:#ff2442;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">\u4fdd\u5b58\u5e76\u542f\u52a8</button><button id="xsp" style="flex:1;padding:10px 20px;background:var(--c-surface,#333);color:var(--c-text,#e0e0e0);border:1px solid #444;border-radius:8px;font-size:14px;cursor:pointer">\u505c\u6b62\u76d1\u63a7</button></div></div>';document.getElementById('xsv').onclick=async function(){var k2=document.getElementById('xk').value.trim();var e2=document.getElementById('xe').value.trim()||'fetch_video_detail';if(!k2){r.ui.toast('\u8bf7\u586b\u5199 API Key');return}await r.storage.set(K,k2);await r.storage.set(E,e2);ka();start(e2,k2);r.ui.toast('\u76d1\u63a7\u5df2\u542f\u52a8');document.getElementById('xss').innerHTML='<div style="width:10px;height:10px;border-radius:50%;background:#4ecca3"></div><span>\u76d1\u63a7\u4e2d \u2713</span>'};document.getElementById('xsp').onclick=function(){stop();if(A){try{A.close()}catch(e){}A=null}r.ui.toast('\u76d1\u63a7\u5df2\u505c\u6b62');document.getElementById('xss').innerHTML='<div style="width:10px;height:10px;border-radius:50%;background:#555"></div><span>\u5df2\u505c\u6b62</span>'};if(k){setTimeout(function(){ka();start(ep,k)},1000)}},async unmount(c){c.replaceChildren()}}]})})()
/** XHS Live Parser v2.2.0 */
(function(){
"use strict";
var K="xhs_key",E="xhs_ep",R=false,O=null,A=null;
var RX_URL=new RegExp("https?://[^\\s]*(?:xiaohongshu\\.com|xhslink\\.com)[^\\s]*","gi");
var RX_NID=new RegExp("xiaohongshu\\.com/(?:explore|discovery/item)/([a-f0-9]+)","i");
function ka(){try{var c=new(window.AudioContext||window.webkitAudioContext)();var b=c.createBuffer(1,c.sampleRate,c.sampleRate);var s=c.createBufferSource();s.buffer=b;s.loop=true;s.connect(c.destination);s.start();A=c;setInterval(function(){if(c.state==="suspended")c.resume()},3e4)}catch(e){}}
function nid(u){var m=u.match(RX_NID);return m?m[1]:null}
function bob(n){var e=n.nodeType===1?n:n.parentElement;while(e&&e!==document.body){if(e.matches&&(e.matches("[class*=chat-bubble]")||e.matches("[class*=message]")))return e;e=e.parentElement}return null}
function api(ep,k,ni){return fetch("https://api.getoneapi.com/api/xiaohongshu/"+ep,{method:"POST",headers:{"Authorization":"Bearer "+k,"Content-Type":"application/json"},body:JSON.stringify({noteId:ni})}).then(function(r){return r.json()}).catch(function(){return null})}
function showCard(d,b){
  var dv=document.createElement("div");
  dv.style.cssText="border:1px solid #333;border-radius:12px;overflow:hidden;margin:8px 0;background:#1a1a2e;color:#e0e0e0;font-size:13px";
  var h="<div style='padding:10px 12px;border-bottom:1px solid #333;font-size:12px;color:#ff2442;font-weight:600'><span style='background:#ff2442;color:#fff;padding:2px 6px;border-radius:3px;font-size:10px;margin-right:6px'>RED</span>小红书</div>";
  h+="<div style='padding:12px'>";
  h+="<b>"+(d.title||"小红书帖子")+"</b>";
  if(d.author||d.user_name)h+="<br><small style='color:#999'>"+(d.author||d.user_name)+"</small>";
  if(d.desc||d.description||d.content)h+="<br><small style='color:#888'>"+(d.desc||d.description||d.content||"")+"</small>";
  var imgs=d.images||d.image_list||d.pics||[];
  if(imgs.length>0){
    var src=typeof imgs[0]==="string"?imgs[0]:(imgs[0].url||"");
    if(src)h+="<br><img src='"+src+"' style='max-width:100%;border-radius:8px;margin-top:8px' onerror='this.style.display=\"none\"'>";
  }
  h+="</div>";
  dv.innerHTML=h;
  b.parentNode.insertBefore(dv,b.nextSibling);
}
function start(ep,k){
  if(O)O.disconnect();R=true;
  O=new MutationObserver(function(m){
    m.forEach(function(mu){
      if(mu.type!=="childList"||!mu.addedNodes.length)return;
      for(var i=0;i<mu.addedNodes.length;i++){
        var n=mu.addedNodes[i];if(n.nodeType!==1&&n.nodeType!==3)continue;
        var tx=n.textContent||"";
        var ls=tx.match(RX_URL);if(!ls||!ls.length)continue;
        var b=bob(n);if(!b||b.dataset.x)continue;
        b.dataset.x="1";
        var ni=nid(ls[0]);if(!ni)continue;
        api(ep,k,ni).then(function(d){if(d&&d.code===200&&d.data)showCard(d.data,b)});
      }
    })
  });
  O.observe(document.body,{childList:true,subtree:true});
}
function stop(){if(O){O.disconnect();O=null}R=false}
window.RochePlugin.register({id:"xhs-live-parser",name:"XHS Link Parser",version:"2.2.0",apps:[{id:"xhs-live-parser-main",name:"\u5b9e\u65f6\u89e3\u6790",icon:"link",async mount(c,r){var k=(await r.storage.get(K))||"";var ep=(await r.storage.get(E))||"fetch_video_detail";c.innerHTML="<div style='padding:16px;display:flex;flex-direction:column;gap:12px;font-size:14px;color:#e0e0e0'><div style='font-size:18px;font-weight:600'>XHS \u5b9e\u65f6\u89e3\u6790</div><div id='xss' style='display:flex;align-items:center;gap:8px;padding:12px;border-radius:8px;background:#222'><span style='width:10px;height:10px;border-radius:50%;background:"+(R?"#4ecca3":"#555")+";display:inline-block'></span>"+(R?"\u76d1\u63a7\u4e2d":"\u672a\u542f\u52a8")+"</div><label>API Key</label><input id='xk' type='password' value='"+k+"' style='padding:10px;border:1px solid #333;border-radius:8px;background:#222;color:#e0e0e0;width:100%'><label>Endpoint</label><input id='xe' value='"+ep+"' style='padding:10px;border:1px solid #333;border-radius:8px;background:#222;color:#e0e0e0;width:100%'><div style='display:flex;gap:8px'><button id='xsv' style='flex:1;padding:10px;background:#ff2442;color:#fff;border:none;border-radius:8px;cursor:pointer'>\u4fdd\u5b58\u5e76\u542f\u52a8</button><button id='xsp' style='flex:1;padding:10px;background:#333;color:#e0e0e0;border:1px solid #444;border-radius:8px;cursor:pointer'>\u505c\u6b62\u76d1\u63a7</button></div></div>";document.getElementById("xsv").onclick=async function(){var k2=document.getElementById("xk").value.trim();var e2=document.getElementById("xe").value.trim()||"fetch_video_detail";if(!k2){r.ui.toast("\u8bf7\u586b\u5199 API Key");return}await r.storage.set(K,k2);await r.storage.set(E,e2);ka();start(e2,k2);document.getElementById("xss").innerHTML="<span style='width:10px;height:10px;border-radius:50%;background:#4ecca3;display:inline-block'></span>\u76d1\u63a7\u4e2d"};document.getElementById("xsp").onclick=function(){stop();if(A){try{A.close()}catch(e){}A=null}r.ui.toast("\u5df2\u505c\u6b62");document.getElementById("xss").innerHTML="<span style='width:10px;height:10px;border-radius:50%;background:#555;display:inline-block'></span>\u5df2\u505c\u6b62"};if(k){setTimeout(function(){ka();start(ep,k)},1000)}},async unmount(c){c.replaceChildren()}}]})})()
(function(){
"use strict";
var K="xhs_key",E="xhs_ep",R=false,O=null,A=null;
var RU=new RegExp("https?://[^\\s]*(?:xiaohongshu\\.com|xhslink\\.com)[^\\s]*","gi");
var RN=new RegExp("xiaohongshu\\.com/(?:explore|discovery/item)/([a-f0-9]+)","i");
function ka(){try{var c=new(window.AudioContext||window.webkitAudioContext)();var b=c.createBuffer(1,c.sampleRate,c.sampleRate);var s=c.createBufferSource();s.buffer=b;s.loop=true;s.connect(c.destination);s.start();A=c;setInterval(function(){if(c.state==="suspended")c.resume()},3e4)}catch(e){}}
function ni(u){var m=u.match(RN);return m?m[1]:null}
function bb(n){var e=n.nodeType===1?n:n.parentElement;while(e&&e!==document.body){if(e.matches&&(e.matches("[class*=chat-bubble]")||e.matches("[class*=message]")))return e;e=e.parentElement}return null}
function ap(ep,k,ni){return fetch("https://api.getoneapi.com/api/xiaohongshu/"+ep,{method:"POST",headers:{"Authorization":"Bearer "+k,"Content-Type":"application/json"},body:JSON.stringify({noteId:ni})}).then(function(r){return r.json()}).catch(function(){return null})}
function sc(d,b){
  var dv=document.createElement("div");
  var s=dv.style;
  s.border="1px solid #333";s.borderRadius="12px";s.overflow="hidden";
  s.margin="8px 0";s.background="#1a1a2e";s.color="#e0e0e0";s.fontSize="13px";
  var h=document.createElement("div");
  h.style.cssText="padding:10px 12px;border-bottom:1px solid #333;font-weight:600;color:#ff2442;font-size:12px;display:flex;align-items:center;gap:6px";
  var mk=document.createElement("span");
  mk.style.cssText="background:#ff2442;color:#fff;padding:2px 6px;border-radius:3px;font-size:10px";
  mk.textContent="RED";
  h.appendChild(mk);
  h.appendChild(document.createTextNode(" \u5c0f\u7ea2\u4e66"));
  dv.appendChild(h);
  var bd=document.createElement("div");
  bd.style.padding="12px";
  var tl=document.createElement("b");tl.textContent=d.title||"\u5c0f\u7ea2\u4e66\u5e16\u5b50";bd.appendChild(tl);
  if(d.author||d.user_name){var au=document.createElement("div");au.style.cssText="font-size:12px;color:#999;margin-top:4px";au.textContent=d.author||d.user_name||"";bd.appendChild(au)}
  if(d.desc||d.description||d.content){var de=document.createElement("div");de.style.cssText="font-size:12px;color:#888;margin-top:4px";de.textContent=d.desc||d.description||d.content||"";bd.appendChild(de)}
  var imgs=d.images||d.image_list||d.pics||[];
  if(imgs.length>0){
    var src=typeof imgs[0]==="string"?imgs[0]:(imgs[0].url||"");
    if(src){var im=document.createElement("img");im.src=src;im.style.cssText="max-width:100%;border-radius:8px;margin-top:8px";bd.appendChild(im)}
  }
  dv.appendChild(bd);
  b.parentNode.insertBefore(dv,b.nextSibling);
}
function st(ep,k){
  if(O)O.disconnect();R=true;
  O=new MutationObserver(function(m){
    m.forEach(function(mu){
      if(mu.type!=="childList"||!mu.addedNodes.length)return;
      for(var i=0;i<mu.addedNodes.length;i++){
        var n=mu.addedNodes[i];if(n.nodeType!==1&&n.nodeType!==3)continue;
        var tx=n.textContent||"";var ls=tx.match(RU);if(!ls||!ls.length)continue;
        var b=bb(n);if(!b||b.dataset.x)continue;b.dataset.x="1";
        var id=ni(ls[0]);if(!id)continue;
        ap(ep,k,id).then(function(d){if(d&&d.code===200&&d.data)sc(d.data,b)});
      }
    })
  });
  O.observe(document.body,{childList:true,subtree:true});
}
function sp(){if(O){O.disconnect();O=null}R=false}
window.RochePlugin.register({id:"xhs-live-parser",name:"XHS Link Parser",version:"2.2.0",apps:[{id:"xhs-live-parser-main",name:"\u5b9e\u65f6\u89e3\u6790",icon:"link",async mount(c,r){
  var k=await r.storage.get(K)||"";var ep=await r.storage.get(E)||"fetch_video_detail";
  c.innerHTML="<div style='padding:16px;display:flex;flex-direction:column;gap:12px;font-size:14px;color:var(--c-text,#e0e0e0)'><button id='xcb' style='padding:8px 16px;background:var(--c-surface,#333);color:var(--c-text,#e0e0e0);border:1px solid var(--c-border,#444);border-radius:8px;cursor:pointer;font-size:13px;width:fit-content'>&#x2190; \u8fd4\u56de</button><div style='font-size:18px;font-weight:600'>XHS \u5b9e\u65f6\u89e3\u6790</div><div id='xss' style='display:flex;align-items:center;gap:8px;padding:12px;border-radius:8px;background:var(--c-surface,#222)'><span style='width:10px;height:10px;border-radius:50%;background:"+(R?"#4ecca3":"#555")+";flex-shrink:0'></span><span>"+(R?"\u76d1\u63a7\u4e2d":"\u672a\u542f\u52a8")+"</span></div><label style='font-size:13px;color:var(--c-text-sub,#999)'>API Key</label><input id='xk' type='password' value='"+k+"' style='padding:10px;border:1px solid var(--c-border,#333);border-radius:8px;background:var(--c-surface,#222);color:var(--c-text,#e0e0e0);outline:none;width:100%;font-size:14px'><label style='font-size:13px;color:var(--c-text-sub,#999)'>Endpoint</label><input id='xe' value='"+ep+"' style='padding:10px;border:1px solid var(--c-border,#333);border-radius:8px;background:var(--c-surface,#222);color:var(--c-text,#e0e0e0);outline:none;width:100%;font-size:14px'><div style='display:flex;gap:8px'><button id='xsv' style='flex:1;padding:10px;background:var(--c-primary,#ff2442);color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer'>\u4fdd\u5b58\u5e76\u542f\u52a8</button><button id='xsp' style='flex:1;padding:10px;background:var(--c-surface,#333);color:var(--c-text,#e0e0e0);border:1px solid var(--c-border,#444);border-radius:8px;font-size:14px;cursor:pointer'>\u505c\u6b62\u76d1\u63a7</button></div></div>";
  document.getElementById("xcb").onclick=function(){r.ui.closeApp()};
  document.getElementById("xsv").onclick=async function(){var k2=document.getElementById("xk").value.trim();var e2=document.getElementById("xe").value.trim()||"fetch_video_detail";if(!k2){r.ui.toast("\u8bf7\u586b\u5199 API Key");return}await r.storage.set(K,k2);await r.storage.set(E,e2);ka();st(e2,k2);document.getElementById("xss").innerHTML="<span style='width:10px;height:10px;border-radius:50%;background:#4ecca3;flex-shrink:0'></span><span>\u76d1\u63a7\u4e2d</span>";r.ui.toast("\u2713 \u5df2\u542f\u52a8")};
  document.getElementById("xsp").onclick=function(){sp();if(A){try{A.close()}catch(e){}A=null}r.ui.toast("\u5df2\u505c\u6b62");document.getElementById("xss").innerHTML="<span style='width:10px;height:10px;border-radius:50%;background:#555;flex-shrink:0'></span><span>\u5df2\u505c\u6b62</span>"};
  if(k){setTimeout(function(){ka();st(ep,k)},1000)}
},async unmount(c){c.replaceChildren()}}]})})()
(() => {
(function() {
var K="xhs_key";
var E="xhs_ep";
var M=false;
var O=null;
var A=null;
var RU=new RegExp("https?://[^\\s]*(?:xiaohongshu\\.com|xhslink\\.com)[^\\s]*","gi");
var RN=new RegExp("xiaohongshu\\.com/(?:explore|discovery/item)/([a-f0-9]+)","i");
function ka(){try{var c=new(window.AudioContext||window.webkitAudioContext)();var b=c.createBuffer(1,c.sampleRate,c.sampleRate);var s=c.createBufferSource();s.buffer=b;s.loop=true;s.connect(c.destination);s.start();A=c;setInterval(function(){if(c.state==="suspended")c.resume()},3e4)}catch(e){}}
function nu(u){var m=u.match(RN);return m?m[1]:null}
function bb(n){var e=n.nodeType===1?n:n.parentElement;while(e&&e!==document.body){if(e.matches&&(e.matches("[class*=chat-bubble]")||e.matches("[class*=message]")))return e;e=e.parentElement}return null}
function ap(ep,k,ni){return fetch("https://api.getoneapi.com/api/xiaohongshu/"+ep,{method:"POST",headers:{Authorization:"Bearer "+k,"Content-Type":"application/json"},body:JSON.stringify({noteId:ni})}).then(function(r){return r.json()}).catch(function(){return null})}
function sc(d,b){
var dv=document.createElement("div");
dv.style.border="1px solid #333";
dv.style.borderRadius="12px";
dv.style.overflow="hidden";
dv.style.margin="8px 0";
dv.style.background="#1a1a2e";
dv.style.color="#e0e0e0";
dv.style.fontSize="13px";
var h=document.createElement("div");
h.style.cssText="padding:10px 12px;border-bottom:1px solid #333;font-weight:600;color:#ff2442;font-size:12px;display:flex;align-items:center;gap:6px";
var mk=document.createElement("span");
mk.style.cssText="background:#ff2442;color:#fff;padding:2px 6px;border-radius:3px;font-size:10px";
mk.textContent="RED";
h.appendChild(mk);
h.appendChild(document.createTextNode(" 小红书"));
dv.appendChild(h);
var bd=document.createElement("div");
bd.style.padding="12px";
var tl=document.createElement("b");
tl.textContent=d.title||"小红书帖子";
bd.appendChild(tl);
if(d.author||d.user_name){var au=document.createElement("div");au.style.cssText="font-size:12px;color:#999;margin-top:4px";au.textContent=d.author||d.user_name||"";bd.appendChild(au)}
if(d.desc||d.description||d.content){var de=document.createElement("div");de.style.cssText="font-size:12px;color:#888;margin-top:4px";de.textContent=d.desc||d.description||d.content||"";bd.appendChild(de)}
var imgs=d.images||d.image_list||d.pics||[];
if(imgs.length>0){var src=typeof imgs[0]==="string"?imgs[0]:imgs[0].url||"";if(src){var im=document.createElement("img");im.src=src;im.style.cssText="max-width:100%;border-radius:8px;margin-top:8px";bd.appendChild(im)}}
dv.appendChild(bd);
b.parentNode.insertBefore(dv,b.nextSibling);
}
function st(ep,k){
if(O)O.disconnect();
M=true;
O=new MutationObserver(function(m){
m.forEach(function(mu){
if(mu.type!=="childList"||!mu.addedNodes.length)return;
for(var i=0;i<mu.addedNodes.length;i++){
var n=mu.addedNodes[i];if(n.nodeType!==1&&n.nodeType!==3)continue;
var tx=n.textContent||"";var ls=tx.match(RU);if(!ls||!ls.length)continue;
var b=bb(n);if(!b||b.dataset.x)continue;b.dataset.x="1";
var id=nu(ls[0]);if(!id)continue;
ap(ep,k,id).then(function(d){if(d&&d.code===200&&d.data)sc(d.data,b)})
}
})
});
O.observe(document.body,{childList:true,subtree:true})
}
function sp(){
if(O){O.disconnect();O=null}M=false
}
})();
window.RochePlugin.register({
id:"xhs-live-parser",
name:"XHS Link Parser",
version:"2.2.0",
apps:[{
id:"xhs-live-parser-main",
name:"实时解析",
icon:"link",
async mount(c,r){
var k=await r.storage.get(K)||"";
var ep=await r.storage.get(E)||"fetch_video_detail";
c.innerHTML="<button id='xcb' style='padding:8px 16px;background:#333;color:#e0e0e0;border:1px solid #444;border-radius:8px;cursor:pointer;font-size:13px;margin:8px'>&#x2190; 返回</button><div id='xss' style='display:flex;align-items:center;gap:8px;padding:12px;border-radius:8px;background:#222;margin:8px'><span style='width:10px;height:10px;border-radius:50%;background:"+(M?"#4ecca3":"#555")+";flex-shrink:0'></span><span>"+(M?"监控中":"未启动")+"</span></div><input id='xk' type='password' value='"+k+"' placeholder='API Key' style='display:block;width:calc(100% - 16px);margin:8px;padding:10px;border:1px solid #333;border-radius:8px;background:#222;color:#e0e0e0;outline:none;font-size:14px'><input id='xe' value='"+ep+"' placeholder='Endpoint (默认 fetch_video_detail)' style='display:block;width:calc(100% - 16px);margin:8px;padding:10px;border:1px solid #333;border-radius:8px;background:#222;color:#e0e0e0;outline:none;font-size:14px'><div style='display:flex;gap:8px;margin:8px'><button id='xsv' style='flex:1;padding:10px;background:#ff2442;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer'>保存并启动</button><button id='xsp' style='flex:1;padding:10px;background:#333;color:#e0e0e0;border:1px solid #444;border-radius:8px;font-size:14px;cursor:pointer'>停止监控</button></div>";
document.getElementById("xcb").onclick=function(){r.ui.closeApp()};
document.getElementById("xsv").onclick=async function(){var k2=document.getElementById("xk").value.trim();var e2=document.getElementById("xe").value.trim()||"fetch_video_detail";if(!k2){r.ui.toast("请填写API Key");return}await r.storage.set(K,k2);await r.storage.set(E,e2);ka();st(e2,k2);r.ui.toast("已启动")};
document.getElementById("xsp").onclick=function(){sp();if(A){try{A.close()}catch(e){}A=null}r.ui.toast("已停止")};
if(k){setTimeout(function(){ka();st(ep,k)},1000)}
},
async unmount(c){
c.replaceChildren()
}
}]
})
})()
