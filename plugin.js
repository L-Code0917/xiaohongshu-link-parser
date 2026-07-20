(function(){'use strict';

var CF_WORKER = 'https://xhs-proxy.luyi90720.workers.dev';
var DB_NAME = 'Roche_db';
var POLL_MS = 2000;
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
    list.push({name:'CF内置', fn:function(u){ return builtin + '?url=' + encodeURIComponent(u); }});
  } else {
    list.push({name:'CF内置', fn:function(u){ return builtin + '?url=' + encodeURIComponent(u); }});
    list.push({name:'corsproxy', fn:function(u){ return 'https://corsproxy.io/?' + encodeURIComponent(u); }});
  }
  if(cfUrl){
    list.push({name:'CF自定义', fn:function(u){ return cfUrl.replace(/\/$/,'') + '?url=' + encodeURIComponent(u); }});
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
  var author = (note.user && (note.user.nick_name || note.user.nickname)) || '未知';
  var desc = note.desc || '';
  var tags = extractTags(note);
  var tagStr = tags.join('，');

  // Format comments
  var cmtText = '';
  if(comments && comments.comments && comments.comments.length > 0){
    cmtText = '\n热门评论：\n';
    var max = Math.min(comments.comments.length, 5);
    for(var i=0;i<max;i++){
      var c = comments.comments[i];
      var un = (c.user && (c.user.nickname || c.user.nick_name)) || '用户';
      var ct = c.content || '';
      cmtText += un + '：' + ct + '\n';
    }
  }

  return '分享了一个小红书笔记：\n#' + title + '\n' + desc + '\n标签：' + tagStr + '\n' + cmtText;
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
    getAllRecords('conversations').then(function(convs){
      convs.forEach(function(conv){
        var convId = conv.id;
        if(!_lastMsgIds[convId]) _lastMsgIds[convId] = 0;

        getAllRecords('messages').then(function(msgs){
          var filtered = msgs.filter(function(m){
            return m.conversation_id === convId && m.timestamp > _lastMsgIds[convId];
          });
          if(filtered.length === 0) return;

          // Update last timestamp
          var maxTs = 0;
          filtered.forEach(function(m){ if(m.timestamp > maxTs) maxTs = m.timestamp; });
          _lastMsgIds[convId] = maxTs;

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
var _panelCreated = false;

function createPanel(container, roche){
  rocheStorage = roche.storage;
  _panelCreated = true;

  // Check initial state
  rocheStorage.get(STORE_KEY_ON).then(function(isOn){
    rocheStorage.get(STORE_KEY_CF).then(function(cfUrl){
      renderPanel(container, isOn || false, cfUrl || '');
    });
  });
}

function renderPanel(container, isOn, cfUrl){
  container.innerHTML = '' +
    '<div style="padding:16px;color:#e0e0e0;font-size:14px">' +
      '<div style="font-size:20px;font-weight:700;color:#ff2442;margin-bottom:16px">📕 XHS 链接卡片</div>' +
      '<div style="margin-bottom:12px">' +
        '<label style="display:flex;align-items:center;gap:10px;cursor:pointer">' +
          '<input type="checkbox" id="xhs-toggle"' + (isOn ? ' checked' : '') + ' style="width:18px;height:18px">' +
          '<span>启用自动监听</span>' +
        '</label>' +
      '</div>' +
      '<div style="font-size:12px;color:#888;margin-bottom:16px">' +
        '开启后，发送小红书链接会自动转换成卡片。' +
        'APK 开箱即用，浏览器端需要 Cloudflare Worker。' +
      '</div>' +
      '<div style="margin-bottom:12px">' +
        '<label style="display:block;font-size:12px;color:#999;margin-bottom:4px">自定义 CF Worker（可选）</label>' +
        '<input id="xhs-cf-input" type="text" value="' + cfUrl + '" placeholder="https://你的worker.workers.dev" style="width:100%;padding:8px 12px;border:1px solid #444;border-radius:8px;background:#222;color:#e0e0e0;font-size:13px;outline:none;box-sizing:border-box">' +
      '</div>' +
      '<button id="xhs-save-btn" style="width:100%;padding:9px;background:#ff2442;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px">保存设置</button>' +
    '</div>';

  container.querySelector('#xhs-save-btn').onclick = function(){
    var isOn2 = container.querySelector('#xhs-toggle').checked;
    var cf2 = container.querySelector('#xhs-cf-input').value.trim();
    rocheStorage.set(STORE_KEY_ON, isOn2);
    rocheStorage.set(STORE_KEY_CF, cf2);
  };

  container.querySelector('#xhs-toggle').onchange = function(){
    var isOn2 = this.checked;
    rocheStorage.set(STORE_KEY_ON, isOn2);
    if(isOn2 && !_pollTimer){
      _pollTimer = setInterval(pollMessages, POLL_MS);
      setTimeout(pollMessages, 1000);
    } else if(!isOn2 && _pollTimer){
      clearInterval(_pollTimer);
      _pollTimer = null;
    }
  };

  // Start polling if enabled
  if(isOn && !_pollTimer){
    _pollTimer = setInterval(pollMessages, POLL_MS);
    setTimeout(pollMessages, 1000);
  }
}

window.RochePlugin.register({
  id: 'xhs-link-card',
  name: 'XHS 链接卡片',
  version: '1.0.0',
  apps: [{
    id: 'xhs-link-card-main',
    name: 'XHS 链接卡片',
    icon: 'link',
    async mount(container, roche){
      if(!_panelCreated) createPanel(container, roche);
    },
    async unmount(container){
      // Keep polling alive
    }
  }]
});

})();

