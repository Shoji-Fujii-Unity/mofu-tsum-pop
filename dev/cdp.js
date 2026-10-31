/* ============================================================
   dev/cdp.js — Headless Edge + CDP スモークテスト
   node dev/cdp.js  → dev/shots/*.png とログを出力
   ============================================================ */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const PORT = Number(process.env.CDP_PORT || 9407);
const SHOTS = path.join(__dirname, 'shots');
const UD = path.join(__dirname, '.ud');

const EDGES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];

const log = [];
const errs = [];
function say(s) { log.push(s); console.log(s); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function findBrowser() {
  for (const p of EDGES) if (fs.existsSync(p)) return p;
  throw new Error('no browser found');
}

async function getTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (e) { /* not up yet */ }
    await sleep(400);
  }
  throw new Error('CDP target not found');
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.onmessage = (ev) => {
      const obj = JSON.parse(ev.data);
      if (obj.id && this.pending.has(obj.id)) {
        const p = this.pending.get(obj.id); this.pending.delete(obj.id);
        obj.error ? p.reject(new Error(JSON.stringify(obj.error))) : p.resolve(obj.result);
      } else if (obj.method) {
        this.events.push(obj);
        if (obj.method === 'Runtime.exceptionThrown') {
          const d = obj.params.exceptionDetails;
          errs.push('EXC ' + (d.exception && d.exception.description || d.text) + ' @line ' + d.lineNumber);
        } else if (obj.method === 'Runtime.consoleAPICalled' && obj.params.type === 'error') {
          errs.push('CONSOLE ' + obj.params.args.map(a => a.value || a.description).join(' '));
        } else if (obj.method === 'Log.entryAdded' && obj.params.entry.level === 'error') {
          errs.push('LOG ' + obj.params.entry.text + ' ' + (obj.params.entry.url || ''));
        }
      }
    };
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { resolve: res, reject: rej });
      this.ws.send(JSON.stringify(params ? { id, method, params } : { id, method }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout ' + method)); } }, 30000);
    });
  }
  async eval(expr, awaitP) {
    const r = await this.send('Runtime.evaluate', {
      expression: expr, returnByValue: true, awaitPromise: !!awaitP, userGesture: true
    });
    if (r.exceptionDetails) throw new Error('eval exc: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result ? r.result.value : undefined;
  }
  async shot(name) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SHOTS, name), Buffer.from(r.data, 'base64'));
    say('  shot -> ' + name);
  }
  async mouse(type, x, y) {
    await this.send('Input.dispatchMouseEvent', {
      type, x, y, button: 'left',
      clickCount: type === 'mouseMoved' ? 0 : 1,
      buttons: type === 'mouseReleased' ? 0 : 1
    });
  }
  async clickEl(sel) {
    const box = await this.eval(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,ok:!e.disabled};})()`);
    if (!box) throw new Error('no element: ' + sel);
    if (box.ok === false) return null;
    await this.mouse('mouseMoved', box.x, box.y);
    await this.mouse('mousePressed', box.x, box.y);
    await sleep(60);
    await this.mouse('mouseReleased', box.x, box.y);
    await sleep(120);
    // 実クリックで反応しなかった場合のフォールバック（UI検証目的）
    const opened = await this.eval(`(function(){var d=document.getElementById('dialog-root');return d && !d.hidden;})()`);
    if (!opened && /#btn-|\.lv-card/.test(sel)) {
      await this.eval(`(function(){var e=document.querySelector(${JSON.stringify(sel)}); if(e) e.click();})()`);
      await sleep(120);
    }
    return box;
  }
  async dlgBtn(i) {
    const ok = await this.eval(`(function(){var b=document.querySelectorAll('#dialog-card .dlg-actions .btn');if(!b.length)return 'nobtn';b[${i | 0}].click();return 'ok';})()`);
    if (ok === 'nobtn') throw new Error('dialog has no action buttons');
    await sleep(220);
  }
}

/* ---- 画面上で valid な連鎖パスを見つける（game.grid を利用）---- */
const FIND_PATH = `(function(){
  var g=window.game; if(!g) return null;
  var ROWS=g.constructor.ROWS, COLS=g.constructor.COLS, R=g.grid;
  var best=null;
  function walk(cell, path, seen){
    if(!best || path.length>best.length) best=path.slice();
    if(best && best.length>=7) return;
    var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(var i=0;i<4;i++){
      var r=cell.row+dirs[i][0], c=cell.col+dirs[i][1];
      if(r<0||c<0||r>=ROWS||c>=COLS) continue;
      var n=R[r][c];
      if(!n||n.type!==path[0].type||seen.indexOf(n)>=0) continue;
      seen.push(n); path.push(n); walk(n,path,seen); path.pop(); seen.pop();
      if(best && best.length>=7) return;
    }
  }
  for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){ var cell=R[r]&&R[r][c]; if(cell) walk(cell,[cell],[cell]); }
  if(!best || best.length<2) return null;
  var p=g.canvas.getBoundingClientRect();
  return best.map(function(x){ return {x:p.left+x.col*g.cell+g.cell/2, y:p.top+x.row*g.cell+g.cell/2}; });
})()`;

async function dragChain(cdp) {
  // 落下が落ち着くまで待つ（位置計算のズレ防止）
  for (let w = 0; w < 20; w++) {
    const settled = await cdp.eval(`(function(){var g=window.game; if(!g) return true;
      for(var r=0;r<8;r++)for(var c=0;c<7;c++){var x=g.grid[r][c]; if(!x||Math.abs(x.py-x.row*g.cell)>1) return false;}
      return g.popping.length===0;})()`);
    if (settled) break;
    await sleep(120);
  }
  const pts = await cdp.eval(FIND_PATH);
  if (!pts || pts.length < 2) return null;
  await cdp.mouse('mousePressed', pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    await cdp.mouse('mouseMoved', pts[i].x, pts[i].y);
    await sleep(28);
  }
  await sleep(60);
  await cdp.mouse('mouseReleased', pts[pts.length - 1].x, pts[pts.length - 1].y);
  await sleep(320);
  return pts.length;
}

(async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.rmSync(UD, { recursive: true, force: true });

  const browser = findBrowser();
  say('browser: ' + browser);
  const child = spawn(browser, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${UD}`,
    '--remote-allow-origins=*', '--disable-gpu', '--mute-audio',
    '--window-size=412,892', '--hide-scrollbars', '--lang=ja-JP', INDEX
  ], { stdio: 'ignore' });

  let cdp;
  try {
    const target = await getTarget();
    say('target: ' + target.url);
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    cdp = new CDP(ws);

    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 412, height: 892, deviceScaleFactor: 2, mobile: true });
    await sleep(900);

    /* ---- 1) タイトル ---- */
    const boot = await cdp.eval(`({
      title: document.getElementById('screen-title').classList.contains('show'),
      tagline: document.querySelector('[data-i18n="app.tagline"]').textContent,
      lang: document.body.getAttribute('data-lang'),
      storage: window.Store.storageOk(),
      canvases: !!document.getElementById('board'),
      sprites: window.Art.sprites().length
    })`);
    say('boot: ' + JSON.stringify(boot));
    await cdp.shot('01-title-ja.png');

    /* ---- 2) 言語切替 ---- */
    await cdp.eval(`document.querySelectorAll('#lang-title button')[1].click()`);
    await sleep(250);
    say('lang en: ' + await cdp.eval(`document.querySelector('[data-i18n="btn.play"]').textContent`));
    await cdp.shot('02-title-en.png');
    await cdp.eval(`document.querySelectorAll('#lang-title button')[2].click()`);
    await sleep(250);
    say('lang zh: ' + await cdp.eval(`document.querySelector('[data-i18n="btn.play"]').textContent`));
    await cdp.shot('03-title-zh.png');
    await cdp.eval(`document.querySelectorAll('#lang-title button')[0].click()`);
    await sleep(200);

    /* ---- 3) 遊び方 / 設定 ---- */
    await cdp.clickEl('#btn-help'); await sleep(400);
    await cdp.shot('04-help.png');
    await cdp.dlgBtn(0); await sleep(300);
    await cdp.clickEl('#btn-settings'); await sleep(400);
    await cdp.shot('05-settings.png');
    await cdp.dlgBtn(1); await sleep(300);

    /* ---- 4) ステージ選択 ---- */
    await cdp.clickEl('#btn-levels'); await sleep(400);
    say('levels cards: ' + await cdp.eval(`document.querySelectorAll('.lv-card').length + ' locked=' + document.querySelectorAll('.lv-card.locked').length`));
    await cdp.shot('06-levels.png');

    /* ---- 5) ゲーム開始 ---- */
    await cdp.eval(`document.querySelector('.lv-card:not(.locked)').click()`); await sleep(500);
    await cdp.shot('07-level-intro.png');
    await cdp.dlgBtn(0); await sleep(3500);
    say('state after countdown: ' + await cdp.eval(`window.game.hud().state`));
    await cdp.shot('08-board.png');

    /* ---- 6) 連鎖を5回実行 ---- */
    let totalErase = 0;
    for (let i = 0; i < 6; i++) {
      const n = await dragChain(cdp);
      totalErase += n || 0;
      if (!n) { say('chain not found at step ' + i); break; }
    }
    const mid = await cdp.eval(`(function(){var s=window.game.stats();var h=window.game.hud();return {score:s.score, chain:s.chain, combo:s.maxCombo, time:Math.round(h.time), fever:+h.feverPct.toFixed(2), skill:+h.skillPct.toFixed(2), domScore:document.getElementById('hud-score').textContent, domTime:document.getElementById('hud-time').textContent};})()`);
    say('after ' + 'drags: ' + JSON.stringify(mid) + ' (cells erased=' + totalErase + ')');
    await cdp.shot('09-played.png');

    /* ---- 7) スペシャル & ムード ---- */
    await cdp.eval(`(function(){window.game.skillGauge=60;})()`);
    await sleep(150);
    const skillOn = await cdp.eval(`window.game.canSkill()`);
    say('skill ready: ' + skillOn);
    await cdp.eval(`document.getElementById('btn-skill').click()`);
    await sleep(500);
    await cdp.shot('10-skill.png');
    await cdp.eval(`(function(){window.game.feverGauge=54; window.game.skillGauge=0;})()`);
    const before = await cdp.eval(`window.game.fevers`);
    await dragChain(cdp);
    await sleep(300);
    const after = await cdp.eval(`({fevers:window.game.fevers, fever:window.game.hud().fever, flash:document.getElementById('fever-flash').classList.contains('on')})`);
    say('fever before=' + before + ' after=' + JSON.stringify(after));
    await cdp.shot('11-fever.png');

    /* ---- 8) ポーズ ---- */
    await cdp.eval(`window.game.feverTime=0`);
    await cdp.clickEl('#btn-pause'); await sleep(400);
    say('paused state: ' + await cdp.eval(`window.game.hud().state`));
    await cdp.shot('12-pause.png');
    await cdp.dlgBtn(0); await sleep(250);

    /* ---- 9) 結果（タイムアップ） ---- */
    await cdp.eval(`window.game.timeLeft=0.4`);
    await sleep(1200);
    say('result open: ' + await cdp.eval(`!document.getElementById('dialog-root').hidden`));
    say('result text: ' + await cdp.eval(`(function(){
      var b=document.querySelector('#dialog-card .res-badge'), s=document.querySelector('#dialog-card .res-stars');
      return (b?b.textContent:'(no badge)') + ' / stars=' + (s?s.textContent:'-') + ' / saved=' + JSON.stringify(window.Store.get().levels) + ' / coins=' + window.Store.get().coins;
    })()`));
    await cdp.shot('13-result.png');

    /* ---- 10) リロードしてセーブ継続を確認 ---- */
    await cdp.send('Page.reload', { ignoreCache: true });
    await sleep(1600);
    const persisted = await cdp.eval(`({best:window.Store.get().best, coins:window.Store.get().coins, unlocked:window.Store.get().unlocked, lv:window.Store.get().levels, lang:window.Store.get().lang, se:window.Store.get().se, vol:window.Store.get().vol, storage:window.Store.storageOk()})`);
    say('persisted: ' + JSON.stringify(persisted));

    /* ---- 11) サウンド OFF ---- */
    await cdp.eval(`document.getElementById('btn-title-sound').click()`); await sleep(200);
    say('sound off -> ' + await cdp.eval(`JSON.stringify({se:window.Store.get().se,bgm:window.Store.get().bgm, pressed:document.getElementById('btn-title-sound').getAttribute('aria-pressed')})`));
    await cdp.shot('14-sound-off.png');
    await cdp.eval(`document.getElementById('btn-title-sound').click()`); await sleep(150);

    /* ---- 11b) ゲームをもう一度開始（game オブジェクト再生成） ---- */
    await cdp.clickEl('#btn-play'); await sleep(400);
    await cdp.dlgBtn(0); await sleep(3400);
    say('restarted state: ' + await cdp.eval(`window.game && window.game.hud().state`));
    say('restarted level: ' + await cdp.eval(`window.game.level && window.game.level.id + ' goal=' + JSON.stringify(window.game.level.goal)`));

    /* ---- 11c) 失敗 → コインでつづける ---- */
    await cdp.eval(`window.Store.set('coins', 900); window.game.score=400; window.game.timeLeft=0.3;`);
    await sleep(1100);
    say('fail dialog: ' + await cdp.eval(`(function(){
      var b=document.querySelector('#dialog-card .res-badge'), s=document.querySelector('#dialog-card .dlg-sub'), a=document.querySelector('#dialog-card .dlg-actions .btn');
      var btns=[].map.call(document.querySelectorAll('#dialog-card .dlg-actions .btn'), function(x){return x.textContent;});
      return JSON.stringify({badge:b&&b.textContent, sub:s&&s.textContent, firstBtn:a&&a.textContent, disabled:a&&a.disabled, coins:window.Store.get().coins, btns:btns});
    })()`));
    await cdp.shot('18-fail-continue.png');
    await cdp.eval(`window.Store.set('coins', 900);`);
    await cdp.dlgBtn(0); await sleep(500);
    say('after continue: ' + JSON.stringify(await cdp.eval(`({coins:window.Store.get().coins, time:Math.round(window.game.timeLeft), state:window.game.hud().state})`)));
    for (let i = 0; i < 6; i++) await dragChain(cdp);
    await cdp.eval(`window.game.timeLeft=0.3`); await sleep(1200);
    say('2nd result: ' + await cdp.eval(`(function(){
      var b=document.querySelector('#dialog-card .res-badge'), s=document.querySelector('#dialog-card .dlg-sub');
      var btns=[].map.call(document.querySelectorAll('#dialog-card .dlg-actions .btn'), function(x){return x.textContent;});
      return JSON.stringify({badge:b&&b.textContent, sub:s&&s.textContent, btns:btns, coins:window.Store.get().coins, saved:window.Store.get().levels});
    })()`));
    await cdp.shot('19-fail-result.png');
    await cdp.eval(`(function(){var b=document.querySelectorAll('#dialog-card .dlg-actions .btn'); b[b.length-1].click();})()`); await sleep(400);

    /* ---- 12) 盤面ロジックの自動検証（headless unit-ish） ---- */
    const unit = await cdp.eval(`(function(){
      var out={};
      var g=window.game;
      // 採点関数
      out.pts = [g.pointsFor(2,1,1), g.pointsFor(5,1,1), g.pointsFor(10,5,2), g.pointsFor(25,1,2), g.pointsFor(50,10,2)];
      // ミッション判定
      out.goalChain = Levels.goalMet(Levels.get(2), {maxChain:4, maxCombo:0, fevers:0});
      out.goalChainFail = Levels.goalMet(Levels.get(2), {maxChain:3, maxCombo:0, fevers:0});
      out.stars = [Levels.starsFor(Levels.get(1).target, Levels.get(1)), Levels.starsFor(Levels.get(1).target*2.1, Levels.get(1))];
      // 消去後の補充（nullが残らないか）
      var ok=true;
      for(var r=0;r<8;r++)for(var c=0;c<7;c++){ if(!g.grid[r][c]) ok=false; }
      out.gridFull = ok;
      // 手詰まりシャッフル
      var typesAll=[]; for(var r2=0;r2<8;r2++)for(var c2=0;c2<7;c2++) typesAll.push(g.grid[r2][c2].type);
      out.hasMove = g._hasMove();
      // i18n 完全性
      function keys(o){return Object.keys(o)}
      out.missing = 'n/a';
      return out;
    })()`);
    say('unit: ' + JSON.stringify(unit));

    /* ---- 13) 多言語キーの欠落チェック ---- */
    const i18nCheck = await cdp.eval(`(function(){
      var html=document.body.innerHTML;
      var used={}; document.querySelectorAll('[data-i18n]').forEach(function(e){used[e.getAttribute('data-i18n')]=1;});
      var src=window.I18N; var miss={};
      var all=Object.keys(used);
      ['ja','en','zh'].forEach(function(L){
        var prev=src.getLang(); src.setLang(L,true);
        all.forEach(function(k){ if(src.t(k)===k) miss[L]=miss[L]||[]; if(src.t(k)===k) miss[L].push(k); });
        src.setLang(prev,true);
      });
      return {used:all.length, missing:miss};
    })()`);
    say('i18n: ' + JSON.stringify(i18nCheck));

    /* ---- 14) 狭い画面（iPhone SE 級）と広い画面（PC） ---- */
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 2, mobile: true });
    await sleep(500);
    await cdp.eval(`document.getElementById('btn-play').click()`); await sleep(400);
    await cdp.dlgBtn(0); await sleep(3400);
    say('small board: ' + JSON.stringify(await cdp.eval(`(function(){var c=document.getElementById('board');var r=c.getBoundingClientRect();var a=document.getElementById('app').getBoundingClientRect();return {cw:Math.round(r.width), ch:Math.round(r.height), cell:window.game.cell, appH:Math.round(a.height), overflowX: document.documentElement.scrollWidth>window.innerWidth, boardVisible: r.top>=0 && r.bottom<=window.innerHeight+1};})()`)));
    await cdp.shot('15-small-320.png');

    await cdp.send('Emulation.clearDeviceMetricsOverride');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
    await sleep(600);
    say('desktop board: ' + JSON.stringify(await cdp.eval(`(function(){var c=document.getElementById('board');var r=c.getBoundingClientRect();return {cw:Math.round(r.width), ch:Math.round(r.height), cell:window.game.cell, bodyOverflow: document.documentElement.scrollHeight>window.innerHeight+2};})()`)));
    await cdp.shot('16-desktop.png');

    /* ---- 15) 長時間プレイ（自動で消し続ける） ---- */
    await cdp.eval(`window.game.timeLeft=30`);
    let plays = 0, fails = 0;
    for (let i = 0; i < 18; i++) {
      const before = await cdp.eval(`window.game.score`);
      const n = await dragChain(cdp);
      const after = await cdp.eval(`window.game.score`);
      if (after > before) plays++; else fails++;
      const st = await cdp.eval(`window.game.hud().state`);
      if (st !== 'play') break;
    }
    const final = await cdp.eval(`(function(){var s=window.game.stats();return {score:s.score, bestChain:s.chain, combo:s.maxCombo, fevers:s.fevers, state:window.game.hud().state, parts:window.Art.partCount()};})()`);
    say('auto-play: erased=' + plays + ' noops=' + fails + ' -> ' + JSON.stringify(final));
    await cdp.shot('17-final-play.png');

    // メモリリークっぽい確認：盤面のセル数・particle数
    say('sanity: ' + JSON.stringify(await cdp.eval(`({cells: window.game.grid.flat().filter(Boolean).length, pops: window.game.popping.length, parts: window.Art.partCount(), floats: window.game.floats.length})`)));

    /* ---- 16) データ削除フロー（ホーム → 設定 → 削除 → 確認） ---- */
    await cdp.clickEl('#btn-pause'); await sleep(300);
    await cdp.eval(`(function(){var b=document.querySelectorAll('#dialog-card .dlg-actions .btn'); b[b.length-1].click();})()`); await sleep(400);
    say('home shown: ' + await cdp.eval(`document.getElementById('screen-title').classList.contains('show')`));
    await cdp.clickEl('#btn-settings'); await sleep(400);
    await cdp.eval(`document.querySelector('#dialog-card .dlg-actions .btn').click()`); await sleep(350);
    say('confirm dialog: ' + await cdp.eval(`(function(){var t=document.querySelector('#dialog-card .dlg-title'), s=document.querySelector('#dialog-card .dlg-sub'); return JSON.stringify({title:t&&t.textContent, sub:s&&s.textContent.slice(0,18)});})()`));
    await cdp.shot('20-reset-confirm.png');
    await cdp.eval(`document.querySelector('#dialog-card .dlg-actions .btn').click()`); await sleep(600);
    say('after reset: ' + await cdp.eval(`JSON.stringify({best:window.Store.get().best,coins:window.Store.get().coins,unlocked:window.Store.get().unlocked,lv:window.Store.get().levels,plays:window.Store.get().plays})`));
    await cdp.shot('21-after-reset.png');
    await cdp.send('Page.reload', { ignoreCache: true }); await sleep(1500);
    say('reset persisted: ' + await cdp.eval(`JSON.stringify({best:window.Store.get().best, unlocked:window.Store.get().unlocked, lv:window.Store.get().levels})`));

    await sleep(300);
  } catch (e) {
    errs.push('TEST-ERROR: ' + e.message);
    say('ERROR ' + e.stack);
  } finally {
    say('---- errors (' + errs.length + ') ----');
    errs.slice(0, 40).forEach(e => say(e));
    fs.writeFileSync(path.join(__dirname, 'cdp-log.txt'), log.join('\n') + '\n\nERRORS:\n' + errs.join('\n'));
    try { child.kill(); } catch (e) {}
    setTimeout(() => { try { fs.rmSync(UD, { recursive: true, force: true }); } catch (e) {} process.exit(errs.length ? 1 : 0); }, 400);
  }
})();
