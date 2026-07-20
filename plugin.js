(function(){'use strict';

var CF_WORKER = 'https://xhs-proxy.luyi90720.workers.dev';
var DB_NAME = 'Roche_db';
var POLL_MS = 5000;
var STORE_KEY_CF = 'xhs_own_cf';
var STORE_KEY_ON = 'xhs_listen';
var _db = null;
var _pollTimer = null;
var _lastMsgIds = {};

function openDB(){
  return new Promise(function(resolve, reject){
    if(_db){ resolve(_db); return; }
    var r = indexedDB.open(DB_NAME);
    r.onsuccess = function(){ _db = r.result; resolve(_db); };
    r.onerror = function(){ reject(r.error); };
  });
}

function getAllRecords(storeName){
  return openDB().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(storeName, 'readonly');
      var s = tx.objectStore(storeName);
      var req = s.getAll();
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  });
}

function putRecord(storeName, record){
  return openDB().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(storeName, 'readwrite');
      var s = tx.objectStore(storeName);
      var req = s.put(record);
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  });
}

function delRecord(storeName, id){
  return openDB().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(storeName, 'readwrite');
      var s = tx.objectStore(storeName);
      var req = s.delete(id);
      req.onsuccess = function(){ resolve(); };
      req.onerror = function(){ reject(req.error); };
    });
  });
}

function isApkWebView(){
  return typeof navigator !== 'undefined' && navigator.userAgent && (
    navigator.userAgent.indexOf('Android') >= 0 ||
    /capacitor|ionic|wv[/]/.test(navigator.userAgent)
  );
}

function smartFetch(url, timeout){
  return new Promise(function(resolve, reject){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = timeout || 15000;
    xhr.onload = function(){ resolve(xhr.responseText); };
    xhr.onerror = function(){ reject(new Error('xhr error')); };
    xhr.ontimeout = function(){ reject(new Error('timeout')); };
    xhr.send();
  });
}

function getProxies(cfUrl){
  var isApk = isApkWebView();
  var list = [];
  var builtin = CF_WORKER;
  if(isApk){
    list.push({name:'corsproxy', fn:function(u){ return 'https://corsproxy.io/?' + encodeURIComponent(u); }});
    list.push({name:'CF', fn:function(u){ return builtin + '?url=' + encodeURIComponent(u); }});
  } else {
    list.push({name:'CF', fn:function(u){ return builtin + '?url=' + encodeURIComponent(u); }});
    list.push({name:'corsproxy', fn:function(u){ return 'https://corsproxy.io/?' + encodeURIComponent(u); }});
  }
  if(cfUrl){
    list.push({name:'CF2', fn:function(u){ return cfUrl.replace(/\/$/,'') + '?url=' + encodeURIComponent(u); }});
  }
  return list;
}

function fetchXhsHtml(xhsUrl){
  return rocheStorage.get(STORE_KEY_CF).then(function(cfUrl){
    var proxies = getProxies(cfUrl);
    var i = 0;
    function tryNext(){
      if(i >= proxies.length) return Promise.reject(new Error('all proxies failed'));
      var p = proxies[i]; i++;
      var url = p.fn(xhsUrl);
      return smartFetch(url, 15000).then(function(html){
        if(html.length < 100) return tryNext();
        if(html.indexOf('__INITIAL_STATE__') < 0) return tryNext();
        return html;
      }).catch(function(){ return tryNext(); });
    }
    return tryNext();
  });
}

function parseXhsState(html){
  var m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\})\s*<\/script>/);
  if(!m) throw new Error('__INITIAL_STATE__ not found');
  return JSON.parse(m[1].replace(/undefined/g, 'null'));
}

function extractNote(state){
  return (state && state.noteData && state.noteData.data && state.noteData.data.noteData) || null;
}

function extractComments(state){
  return (state && state.noteData && state.noteData.data && state.noteData.data.commentData) || null;
}

function extractTags(note){
  var tags = [];
  if(note && note.tagList && note.tagList.length){
    for(var i=0;i<note.tagList.length;i++){
      var t = note.tagList[i];
      var name = (typeof t === 'string') ? t : (t.name || t.id || '');
      if(name) tags.push(name);
    }
  }
  return tags;
}

function formatCard(note, comments, xhsUrl){
  var title = note.title || '小红书笔记';
  var author = (note.user && (note.user.nick_name || note.user.nickname)) || '';
  var desc = note.desc || '';
  var tags = extractTags(note);
  var tagStr = tags.join('\u3001');
  var cmtText = '';
  if(comments && comments.comments && comments.comments.length > 0){
    cmtText = '\n\u70ed\u95e8\u8bc4\u8bba\uff1a\n';
    var max = Math.min(comments.comments.length, 5);
    for(var i=0;i<max;i++){
      var c = comments.comments[i];
      var un = (c.user && (c.user.nickname || c.user.nick_name)) || '\u7528\u6237';
      var ct = c.content || '';
      cmtText += un + '\uff1a' + ct + '\n';
    }
  }
  var result = '\u5206\u4eab\u4e86\u4e00\u4e2a\u5c0f\u7ea2\u4e66\u7b14\u8bb0\uff1a\n#' + title + '\n' + desc + '\n\u6807\u7b7e\uff1a' + tagStr + '\n' + cmtText;
  if(author) result = '\u4f5c\u8005\uff1a' + author + '\n' + result;
  return result;
}

function injectTextMessage(originalMsg, text){
  var newMsg = JSON.parse(JSON.stringify(originalMsg));
  newMsg.id = 'xhs_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);
  newMsg.text = text;
  newMsg.timestamp = Date.now();
  return delRecord('messages', originalMsg.id).then(function(){
    return putRecord('messages', newMsg);
  });
}

function pollMessages(){
  rocheStorage.get(STORE_KEY_ON).then(function(isOn){
    if(!isOn) return;
    getAllRecords('messages').then(function(allMsgs){
      getAllRecords('conversations').then(function(convs){
        convs.forEach(function(conv){
          var convId = conv.id;
          var convMsgs = allMsgs.filter(function(m){ return m.conversation_id === convId; });
          var maxTs = 0;
          convMsgs.forEach(function(m){ if(m.timestamp > maxTs) maxTs = m.timestamp; });
          if(!_lastMsgIds[convId]) _lastMsgIds[convId] = maxTs;
          var filtered = convMsgs.filter(function(m){
            return m.timestamp > _lastMsgIds[convId];
          });
          if(filtered.length === 0) return;
          var newMax = 0;
          filtered.forEach(function(m){ if(m.timestamp > newMax) newMax = m.timestamp; });
          _lastMsgIds[convId] = newMax;
          filtered.forEach(function(msg){
            var text = msg.text || '';
            var match = text.match(/https?:\/\/(?:[a-z0-9\-.]+)?(?:xiaohongshu|xhslink)[a-z0-9\-.]*(?:\/[^\s<>"']*)?/i);
            if(!match) return;
            var xhsUrl = match[0];
            if(!/^https?:\/\//i.test(xhsUrl)) xhsUrl = 'https://' + xhsUrl;
            fetchXhsHtml(xhsUrl).then(function(html){
              var state = parseXhsState(html);
              var note = extractNote(state);
              if(!note) return;
              var comments = extractComments(state);
              var cardText = formatCard(note, comments, xhsUrl);
              injectTextMessage(msg, cardText);
            }).catch(function(){});
          });
        });
      });
    }).catch(function(){});
  });
}

var rocheStorage = null;
var _roche = null;

function createPanel(container, roche){
  rocheStorage = roche.storage;
  rocheStorage.get(STORE_KEY_ON).then(function(isOn){
    rocheStorage.get(STORE_KEY_CF).then(function(cfUrl){
      var h = '';
      h += '<div style="display:flex;flex-direction:column;justify-content:space-between;min-height:200px;padding:16px;color:#e0e0e0;font-size:14px">';
      h += '<div>';
      h += '<div style="font-size:20px;font-weight:700;color:#ff2442;margin-bottom:16px">\ud83d\udcd5 XHS \u94fe\u63a5\u5361\u7247</div>';
      h += '<div style="margin-bottom:12px">';
      h += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">';
      h += '<input type="checkbox" id="xhs-toggle"' + (isOn ? ' checked' : '') + ' style="width:18px;height:18px">';
      h += '<span>\u542f\u7528\u81ea\u52a8\u76d1\u542c</span>';
      h += '</label></div>';
      h += '<div style="font-size:12px;color:#888;margin-bottom:16px">\u53d1\u5c0f\u7ea2\u4e66\u94fe\u63a5\u81ea\u52a8\u8f6c\u5361\u7247\u3002APK\u5f00\u7bb1\u5373\u7528\u3002</div>';
      h += '<div style="margin-bottom:12px">';
      h += '<label style="display:block;font-size:12px;color:#999;margin-bottom:4px">\u81ea\u5b9a\u4e49CF Worker\uff08\u53ef\u9009\uff09</label>';
      h += '<input id="xhs-cf-input" type="text" value="' + cfUrl + '" placeholder="https://\u4f60\u7684worker.workers.dev" style="width:100%;padding:8px 12px;border:1px solid #444;border-radius:8px;background:#222;color:#e0e0e0;font-size:13px;outline:none;box-sizing:border-box">';
      h += '</div>';
      h += '<button id="xhs-save-btn" style="width:100%;padding:9px;background:#ff2442;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px">\u4fdd\u5b58\u8bbe\u7f6e</button>';
      h += '</div>';
      // Big exit button at bottom - black oval
      h += '<button id="xhs-exit-btn" style="position:fixed;top:12px;right:12px;padding:8px 18px;background:#222;color:#e0e0e0;border:2px solid #555;border-radius:100px;cursor:pointer;font-size:15px;font-weight:600;z-index:9999">\u9000\u51fa</button>';
      h += '</div>';
      var r2=document.createElement('div');r2.style.cssText='height:100%;width:100%';container.innerHTML='';container.appendChild(r2);r2.innerHTML=h;

      r2.querySelector('#xhs-exit-btn').onclick = function(){ if(_roche) _roche.ui.closeApp(); };
      r2.querySelector('#xhs-save-btn').onclick = function(){
        var o = r2.querySelector('#xhs-toggle').checked;
        var c = r2.querySelector('#xhs-cf-input').value.trim();
        rocheStorage.set(STORE_KEY_ON, o);
        rocheStorage.set(STORE_KEY_CF, c);
      };
      r2.querySelector('#xhs-toggle').onchange = function(){
        var o = this.checked;
        rocheStorage.set(STORE_KEY_ON, o);
        if(o && !_pollTimer){ _pollTimer = setInterval(pollMessages, POLL_MS); setTimeout(pollMessages, 1000); }
        else if(!o && _pollTimer){ clearInterval(_pollTimer); _pollTimer = null; }
      };
      if(isOn && !_pollTimer){ _pollTimer = setInterval(pollMessages, POLL_MS); setTimeout(pollMessages, 1000); }
    });
  });
}

window.RochePlugin.register({
  id: 'xhs-link-card',
  name: 'XHS \u94fe\u63a5\u5361\u7247',
  version: '1.0.0',
  apps: [{
    id: 'xhs-link-card-main',
    name: 'XHS \u94fe\u63a5\u5361\u7247',
    icon: 'extension',
    async mount(container, roche){
      rocheStorage = roche.storage; _roche = roche;
      createPanel(container, roche);
    },
    async unmount(container){
      // keep polling
    }
  }]
});

})();