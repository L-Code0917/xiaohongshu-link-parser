(function(){
'use strict';

var STORAGE_KEY = 'xhs_live_key';
var PLUGIN_ID = 'xhs-live-parser';
var MONITORING = false;
var OBSERVER = null;
var AUDIO_CTX = null;
var PROCESSED_IDS = new Set();

function getCSS() {
  return '.xhs-live-config{padding:16px;display:flex;flex-direction:column;gap:16px;font-size:14px;color:var(--c-text,#e0e0e0)}.xhs-live-config input{padding:10px 12px;border:1px solid var(--c-border,#333);border-radius:8px;font-size:14px;background:var(--c-surface,#222);color:var(--c-text,#e0e0e0);outline:none}.xhs-live-config button{padding:10px 20px;border:none;border-radius:8px;font-size:14px;cursor:pointer}.xhs-btn-primary{background:var(--c-primary,#ff2442);color:#fff}.xhs-btn-secondary{background:var(--c-surface,#333);color:var(--c-text,#e0e0e0);border:1px solid var(--c-border,#444)}.xhs-live-status{display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:8px;background:var(--c-surface,#222)}.xhs-live-dot{width:10px;height:10px;border-radius:50%}.xhs-dot-on{background:#4ecca3;box-shadow:0 0 6px #4ecca3}.xhs-dot-off{background:#555}.xhs-live-floating-btn{position:fixed!important;bottom:100px;right:16px;z-index:99999;width:48px;height:48px;border-radius:50%;background:#ff2442;color:#fff;border:none;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:0 4px 12px rgba(255,36,66,0.3)}.xhs-live-card{background:var(--c-surface,#1a1a2e);border:1px solid var(--c-border,#333);border-radius:12px;overflow:hidden;margin:8px 0;font-size:13px}.xhs-live-card-head{display:flex;align-items:center;gap:6px;padding:10px 12px;background:var(--c-surface-alt,#222);font-size:12px;color:#ff2442;font-weight:600}.xhs-live-card-mark{background:#ff2442;color:#fff;padding:2px 6px;border-radius:3px;font-size:10px}.xhs-live-card-body{display:flex;gap:12px;padding:12px}.xhs-live-card-cover{width:72px;height:72px;flex-shrink:0;border-radius:8px;overflow:hidden;background:var(--c-surface-alt,#2a2a3e)}.xhs-live-card-cover img{width:100%;height:100%;object-fit:cover}.xhs-live-card-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.xhs-live-card-title{font-weight:600;font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.xhs-live-card-author{font-size:12px;color:var(--c-text-sub,#999)}.xhs-live-card-desc{font-size:12px;color:var(--c-text-sub,#888);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.xhs-live-card-tags{display:flex;flex-wrap:wrap;gap:4px;padding:0 12px 10px}.xhs-live-card-tag{font-size:11px;color:#ff2442;padding:2px 6px;border-radius:4px;background:rgba(255,36,66,0.1)}.xhs-live-card-actions{display:flex;gap:8px;padding:0 12px 12px}.xhs-live-card-btn{flex:1;padding:8px;border:1px solid var(--c-border,#444);border-radius:8px;background:var(--c-surface-alt,#222);cursor:pointer;font-size:12px;color:var(--c-text,#e0e0e0);text-align:center}.xhs-card-overlay{display:none;position:relative;z-index:10}';
}

function startKeepalive() {
  try {
    var ctx = new(window.AudioContext || window.webkitAudioContext)();
    var buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    src.connect(ctx.destination); src.start();
    AUDIO_CTX = ctx;
    setInterval(function(){ if(ctx.state==='suspended') ctx.resume(); }, 30000);
  } catch(e){}
}

function stopKeepalive() {
  try { if(AUDIO_CTX) { AUDIO_CTX.close(); AUDIO_CTX = null; } } catch(e){}
}

function extractNoteId(url) {
  var m = url.match(/xiaohongshu\.com\/(?:explore|discovery\/item)\/([a-f0-9]+)/i);
  if (m) return m[1];
  return null;
}

function findXiaohongshuLinks(node) {
  var text = node.textContent || '';
  var links = text.match(/https?:\/\/[^\s]*(?:xiaohongshu\.com|xhslink\.com)[^\s]*/gi);
  return links || [];
}

function getMessageBubble(node) {
  var el = node.nodeType === 1 ? node : node.parentElement;
  while (el && el !== document.body) {
    if (el.matches && (el.matches('[class*="chat-bubble"]') || el.matches('[class*="message"]') || el.matches('[class*="msg-row"]'))) return el;
    el = el.parentElement;
  }
  return null;
}

function createCardEl(data, linkUrl) {
  var div = document.createElement('div');
  div.className = 'xhs-live-card';
  var images = data.images || data.image_list || data.pics || [];
  var imgSrc = images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0].url || '') : '';
  var tags = data.tags || data.tag_list || [];
  div.innerHTML = [
    '<div class="xhs-live-card-head"><span class="xhs-live-card-mark">RED</span> 小红书</div>',
    '<div class="xhs-live-card-body">',
    imgSrc ? '<div class="xhs-live-card-cover"><img src="'+imgSrc+'" onerror="this.style.display=\'none\'"></div>' : ''
    '<div class="xhs-live-card-info">',
    '<div class="xhs-live-card-title">' + (data.title || '小红书帖子') + '</div>',
    (data.author || data.user_name || '') ? '<div class="xhs-live-card-author">' + (data.author || data.user_name || '') + '</div>' : '',
    '<div class="xhs-live-card-desc">' + (data.desc || data.description || data.content || '') + '</div>',
    '</div></div>',
    tags.length > 0 ? '<div class="xhs-live-card-tags">' + tags.slice(0,5).map(function(t){var n=typeof t==='string'?t:t.name||t.tag_name||'';return '<span class="xhs-live-card-tag">#'+n+'</span>';}).join('') + '</div>' : '',
  ].join('');
  return div;
}

function startObserver(apiKey, endpoint, roche) {
  if (OBSERVER) OBSERVER.disconnect();
  MONITORING = true;
  var pendingUrls = new Map();
  OBSERVER = new MutationObserver(function(mutations) {
    mutations.forEach(function(mut) {
      if (mut.type !== 'childList' || !mut.addedNodes.length) return;
      for (var i = 0; i < mut.addedNodes.length; i++) {
        var node = mut.addedNodes[i];
        if (node.nodeType !== 1 && node.nodeType !== 3) continue;
        var links = findXiaohongshuLinks(node);
        if (links.length === 0) continue;
        var bubble = getMessageBubble(node);
        if (!bubble || bubble.dataset.xhsProcessed) continue;
        bubble.dataset.xhsProcessed = '1';
        var link = links[0];
        if (pendingUrls.has(link)) continue;
        pendingUrls.set(link, bubble);
        (function(b, l) {
          var noteId = extractNoteId(l);
          if (noteId) {
            fetch('https://api.getoneapi.com/api/xiaohongshu/' + endpoint, {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ note_id: noteId })
            })
            .then(function(r){ return r.json(); })
            .then(function(d){
              if (d.code === 200 && d.data) {
                var card = createCardEl(d.data, l);
                b.parentNode.insertBefore(card, b.nextSibling);
              }
            })
            .catch(function(){});
          }
        })(bubble, link);
      }
    });
  });
  OBSERVER.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  if (OBSERVER) { OBSERVER.disconnect(); OBSERVER = null; }
  MONITORING = false;
}

window.RochePlugin.register({
  id: PLUGIN_ID,
  name: 'XHS Live Parser',
  version: '2.0.0',
  apps: [{
    id: PLUGIN_ID + '-main',
    name: '实时解析',
    icon: 'link',
    async mount(c, r) {
      var apiKey = (await r.storage.get('xhs_key')) || '';
      var ep = (await r.storage.get('xhs_ep')) || 'fetch_note_detail';
      c.innerHTML = '<style>' + getCSS() + '</style>' +
        '<div class="xhs-live-config">' +
        '<div style="font-size:18px;font-weight:600">XHS 实时解析</div>' +
        '<div id="xhs-live-status" class="xhs-live-status"><div class="xhs-live-dot ' + (MONITORING ? 'xhs-dot-on' : 'xhs-dot-off') + '"></div><span>' + (MONITORING ? '监控中 ✓' : '未启动') + '</span></div>' +
        '<label style="font-size:13px;color:#999">API Key</label>' +
        '<input id="xhs-live-key" type="password" value="' + apiKey + '" placeholder="输入 OneAPI Key">' +
        '<label style="font-size:13px;color:#999">API Endpoint</label>' +
        '<input id="xhs-live-ep" value="' + ep + '" placeholder="fetch_note_detail">' +
        '<div style="display:flex;gap:8px">' +
        '<button id="xhs-live-save" class="xhs-btn-primary" style="flex:1">保存并启动</button>' +
        '<button id="xhs-live-stop" class="xhs-btn-secondary" style="flex:1">停止监控</button>' +
        '</div>' +
        '<div style="font-size:12px;color:#666;line-height:1.6">保存后会自动监控聊天界面。发消息后看到"RED"卡片表示解析成功。</div>' +
        '</div>';
      document.getElementById('xhs-live-save').onclick = async function() {
        var k = document.getElementById('xhs-live-key').value.trim();
        var e = document.getElementById('xhs-live-ep').value.trim() || 'fetch_note_detail';
        if (!k) { r.ui.toast('请填写 API Key'); return; }
        await r.storage.set('xhs_key', k);
        await r.storage.set('xhs_ep', e);
        startKeepalive();
        startObserver(k, e, r);
        r.ui.toast('✅ 监控已启动');
        document.getElementById('xhs-live-status').innerHTML = '<div class="xhs-live-dot xhs-dot-on"></div><span>监控中 ✓</span>';
      };
      document.getElementById('xhs-live-stop').onclick = function() {
        stopObserver();
        stopKeepalive();
        r.ui.toast('监控已停止');
        document.getElementById('xhs-live-status').innerHTML = '<div class="xhs-live-dot xhs-dot-off"></div><span>已停止</span>';
      };
      if (apiKey) {
        setTimeout(function(){
          startKeepalive();
          startObserver(apiKey, ep, r);
        }, 1000);
      }
    },
    async unmount(c) { c.replaceChildren(); }
  }]
});
})();

console.log('[XHS Live] Loaded v2.0.0')
// flush

