(function(){'use strict';
var CF_WORKER='https://xhs-proxy.luyi90720.workers.dev';
var DB_NAME='Roche_db';
var POLL_MS=2000;
var SK_CF='xhs_own_cf';
var SK_ON='xhs_listen';
var _db=null,_timer=null,_last={};
var _rs=null,_rc=null;

function od(){return new Promise(function(f,r){if(_db){f(_db);return;}
var q=indexedDB.open(DB_NAME);q.onsuccess=function(){_db=q.result;f(_db);};q.onerror=function(){r(q.error);};});}
function gr(s){return od().then(function(d){return new Promise(function(f,r){
var t=d.transaction(s,'readonly'),q=t.objectStore(s).getAll();
q.onsuccess=function(){f(q.result);};q.onerror=function(){r(q.error);};});});}
function pr(s,o){return od().then(function(d){return new Promise(function(f,r){
var t=d.transaction(s,'readwrite'),q=t.objectStore(s).put(o);
q.onsuccess=function(){f(q.result);};q.onerror=function(){r(q.error);};});});}
function dr(s,i){return od().then(function(d){return new Promise(function(f,r){
var t=d.transaction(s,'readwrite'),q=t.objectStore(s).delete(i);
q.onsuccess=function(){f();};q.onerror=function(){r(q.error);};});});}

function go(u,t){return new Promise(function(f,r){
var x=new XMLHttpRequest();x.open('GET',u,true);x.timeout=t||15000;
x.onload=function(){f(x.responseText);};x.onerror=function(){r(new Error('err'));};
x.ontimeout=function(){r(new Error('to'));};x.send();});}

function gp(c){var a=typeof navigator!=='undefined'&&navigator.userAgent&&(navigator.userAgent.indexOf('Android')>=0||/capacitor|ionic|wv[/]/.test(navigator.userAgent));
var l=[];var b=CF_WORKER;
if(a){l.push({n:'cors',fn:function(u){return 'https://corsproxy.io/?'+encodeURIComponent(u);}});
l.push({n:'cf',fn:function(u){return b+'?url='+encodeURIComponent(u);}});}else{
l.push({n:'cf',fn:function(u){return b+'?url='+encodeURIComponent(u);}});
l.push({n:'cors',fn:function(u){return 'https://corsproxy.io/?'+encodeURIComponent(u);}});}
if(c){l.push({n:'cf2',fn:function(u){return c.replace(/\/$/,'')+'?url='+encodeURIComponent(u);}});}return l;}

function fh(u){return _rs.get(SK_CF).then(function(c){var p=gp(c),i=0;
function n(){if(i>=p.length)return Promise.reject(new Error('all failed'));
var o=p[i];i++;return go(o.fn(u),15000).then(function(h){
if(h.length<100||h.indexOf('__INITIAL_STATE__')<0)return n();return h;}).catch(function(){return n();});}return n();});}

function ps(h){var m=h.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\})\s*<\/script>/);
if(!m)throw new Error('no state');return JSON.parse(m[1].replace(/undefined/g,'null'));}
function en(s){return s&&s.noteData&&s.noteData.data&&s.noteData.data.noteData||null;}
function ec(s){return s&&s.noteData&&s.noteData.data&&s.noteData.data.commentData||null;}
function et(n){var t=[];if(n&&n.tagList)for(var i=0;i<n.tagList.length;i++){var v=n.tagList[i];var m=typeof v==='string'?v:(v.name||v.id||'');if(m)t.push(m);}return t;}

function fc(n,c,u){
var t=n.title||'小红书笔记';var a=n.user&&(n.user.nick_name||n.user.nickname)||'';
var d=n.desc||'';var g=et(n).join('\u3001');var r='';
if(c&&c.comments&&c.comments.length>0){r='\n\u70ed\u95e8\u8bc4\u8bba\uff1a\n';
for(var i=0;i<Math.min(c.comments.length,5);i++){var v=c.comments[i];var un=v.user&&(v.user.nickname||v.user.nick_name)||'\u7528\u6237';var ct=v.content||'';r+=un+'\uff1a'+ct+'\n';}}
var s='\u5206\u4eab\u4e86\u4e00\u4e2a\u5c0f\u7ea2\u4e66\u7b14\u8bb0\uff1a\n#'+t+'\n'+d+'\n\u6807\u7b7e\uff1a'+g+'\n'+r;if(a)s='\u4f5c\u8005\uff1a'+a+'\n'+s;return s;}

function im(o,t){var n=JSON.parse(JSON.stringify(o));n.id='x_'+Date.now()+'_'+Math.random().toString(36).substr(2,6);
n.text=t;n.timestamp=Date.now();return dr('messages',o.id).then(function(){return pr('messages',n);});}

function pm(){_rs.get(SK_ON).then(function(o){if(!o)return;
gr('conversations').then(function(cs){cs.forEach(function(c){var ci=c.id;
gr('messages').then(function(as){var ms=as.filter(function(m){return m.conversation_id===ci;});
var mt=0;ms.forEach(function(m){if(m.timestamp>mt)mt=m.timestamp;});
if(!_last[ci])_last[ci]=mt;var fs=ms.filter(function(m){return m.timestamp>_last[ci];});
if(fs.length===0)return;var nm=0;fs.forEach(function(m){if(m.timestamp>nm)nm=m.timestamp;});
_last[ci]=nm;fs.forEach(function(msg){var t=msg.text||'';
var m=t.match(/https?:\/\/(?:[a-z0-9\-.]+)?(?:xiaohongshu|xhslink)[a-z0-9\-.]*(?:\/[^\s<>"']*)?/i);
if(!m)return;var u=m[0];if(!/^https?:\/\//i.test(u))u='https://'+u;
fh(u).then(function(h){try{var s=ps(h);var n=en(s);if(!n)return;
var c=ec(s);im(msg,fc(n,c,u));}catch(e){}}).catch(function(){});});});});});});});}

function ui(r){_rs=r;
_rs.get(SK_ON).then(function(isOn){
_rs.get(SK_CF).then(function(cf){
// render
var p=document.createElement('div');
p.style.cssText='padding:16px;color:#e0e0e0;font-size:14px;position:relative';
// exit button: top-right
p.innerHTML='<div style="position:relative;min-height:180px">'+
'<button id="xhs-exit" style="position:absolute;top:0;right:0;padding:8px 18px;background:#222;color:#e0e0e0;border:2px solid #555;border-radius:100px;cursor:pointer;font-size:15px;font-weight:600">\u9000\u51fa</button>'+
'<div style="margin-bottom:16px;font-size:20px;font-weight:700;color:#ff2442">\ud83d\udcd5 XHS \u94fe\u63a5\u5361\u7247</div>'+
'<div style="margin-bottom:12px"><label style="display:flex;align-items:center;gap:10px;cursor:pointer">'+
'<input type="checkbox" id="xhs-tog"'+(isOn?' checked':'')+' style="width:18px;height:18px;flex-shrink:0">'+
'<span>\u542f\u7528\u81ea\u52a8\u76d1\u542c</span></label></div>'+
'<div style="font-size:12px;color:#888;margin-bottom:16px">\u53d1\u5c0f\u7ea2\u4e66\u94fe\u63a5\u81ea\u52a8\u8f6c\u5361\u7247\u3002APK\u5f00\u7bb1\u5373\u7528\u3002</div>'+
'<div style="margin-bottom:12px"><label style="display:block;font-size:12px;color:#999;margin-bottom:4px">\u81ea\u5b9a\u4e49CF Worker\uff08\u53ef\u9009\uff09</label>'+
'<input id="xhs-cf" type="text" value="'+cf+'" placeholder="https://your-worker.workers.dev" style="width:100%;padding:8px 12px;border:1px solid #444;border-radius:8px;background:#222;color:#e0e0e0;font-size:13px;outline:none;box-sizing:border-box"></div>'+
'<button id="xhs-save" style="width:100%;padding:9px;background:#ff2442;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px">\u4fdd\u5b58</button></div>';

// bind events
p.querySelector('#xhs-exit').onclick=function(){if(_rc)_rc.ui.closeApp();};
p.querySelector('#xhs-save').onclick=function(){
var o=p.querySelector('#xhs-tog').checked;var c=p.querySelector('#xhs-cf').value.trim();
_rs.set(SK_ON,o);_rs.set(SK_CF,c);};
p.querySelector('#xhs-tog').onchange=function(){
var o=this.checked;_rs.set(SK_ON,o);
if(o&&!_timer){_timer=setInterval(pm,POLL_MS);setTimeout(pm,1000);}
else if(!o&&_timer){clearInterval(_timer);_timer=null;}};
if(isOn&&!_timer){_timer=setInterval(pm,POLL_MS);setTimeout(pm,1000);}

// find container and add root
var ctr=document.querySelector('.roche-plugin-xhs-card')||document.createElement('div');
if(!ctr.parentNode){ctr.className='roche-plugin-xhs-card';
var app=document.querySelector('[class*="roche-plugin"]')||document.body;
// try to find the plugin host container
var host=document.querySelector('#app > div:last-child > div:last-child')||document.body;
host.appendChild(ctr);}
ctr.innerHTML='';ctr.style.cssText='height:100%;display:flex;flex-direction:column';
ctr.appendChild(p);
});});}

window.RochePlugin.register({id:'xhs-link-card',name:'XHS\u94fe\u63a5\u5361\u7247',version:'1.0.0',
apps:[{id:'xhs-link-card-main',name:'XHS\u94fe\u63a5\u5361\u7247',icon:'extension',
async mount(c,r){_rs=r.storage;_rc=r;ui(_rs);},
async unmount(c){}}]});
})();