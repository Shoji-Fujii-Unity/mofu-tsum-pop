/* ============================================================
   app.js — 画面遷移 / HUD / ダイアログ / 保存 / 多言語 の統合
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var t = function (k, p) { return I18N.t(k, p); };

  var el = {
    app: $('app'),
    scrTitle: $('screen-title'), scrLevels: $('screen-levels'), scrGame: $('screen-game'),
    langTitle: $('lang-title'), titleSound: $('btn-title-sound'), titleStats: $('title-stats'),
    titleCanvas: $('title-canvas'),
    coinLevels: $('coin-levels'), levelsGrid: $('levels-grid'),
    hudLevel: $('hud-level'), hudScore: $('hud-score'), hudTarget: $('hud-target'),
    timebar: $('timebar'), hudTime: $('hud-time'),
    gaugeFever: $('gauge-fever'), hudFeverPct: $('hud-fever-pct'),
    gaugeSkill: $('gauge-skill'), hudSkillPct: $('hud-skill-pct'),
    comboPill: $('combo-pill'), hudCombo: $('hud-combo'),
    hudMission: $('hud-mission'), hudChain: $('hud-chain'), hudCoins: $('hud-coins'),
    btnSkill: $('btn-skill'), btnPause: $('btn-pause'),
    boardWrap: $('board-wrap'), board: $('board'), boardMsg: $('board-msg'), feverFlash: $('fever-flash'),
    dialogRoot: $('dialog-root'), dialogCard: $('dialog-card')
  };

  var game = null;
  var cur = { level: null, continues: 0, clear: false, stars: 0, coins: 0, dialog: null };
  var lastHud = {};
  var paradeRaf = null;

  /* ================= 画面 ================= */
  function show(which) {
    [el.scrTitle, el.scrLevels, el.scrGame].forEach(function (s) { s.classList.remove('show'); });
    which.classList.add('show');
    if (which === el.scrTitle) startParade(); else stopParade();
    if (which === el.scrLevels) renderLevels();
    if (which === el.scrTitle) renderTitleStats();
    if (which === el.scrGame) requestAnimationFrame(function () { if (game) game.resize(); });
  }

  /* ================= 共通小物 ================= */
  function el2(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }

  function toast(msg) {
    var tEl = el2('div', 'toast', msg);
    el.app.appendChild(tEl);
    setTimeout(function () { tEl.remove(); }, 1600);
  }

  var msgTimer = null;
  function boardMsg(msg, ms) {
    el.boardMsg.textContent = msg;
    el.boardMsg.classList.add('show');
    if (msgTimer) clearTimeout(msgTimer);
    msgTimer = setTimeout(function () { el.boardMsg.classList.remove('show'); }, ms || 1100);
  }

  /* ================= ダイアログ ================= */
  function dialog(spec) {
    closeDialog();
    var card = el.dialogCard;
    card.textContent = '';
    if (spec.badge) card.appendChild(el2('div', 'res-badge', spec.badge));
    if (spec.title) card.appendChild(el2('h3', 'dlg-title', spec.title));
    if (spec.sub) card.appendChild(el2('p', 'dlg-sub', spec.sub));
    if (spec.html) {
      var body = el2('div', 'dlg-body');
      body.innerHTML = spec.html;
      card.appendChild(body);
    }
    if (spec.build) spec.build(card);
    var acts = el2('div', 'dlg-actions' + (spec.row ? ' row' : ''));
    (spec.actions || []).forEach(function (a) {
      var b = el2('button', 'btn ' + (a.cls || 'soft'), a.label);
      b.type = 'button';
      if (a.disabled) b.disabled = true;
      b.addEventListener('click', function () { Snd.click(); if (a.fn) a.fn(); });
      acts.appendChild(b);
    });
    card.appendChild(acts);
    el.dialogRoot.hidden = false;
    cur.dialog = spec;
    if (spec.onOpen) spec.onOpen(card);
    return card;
  }
  function closeDialog() {
    el.dialogRoot.hidden = true;
    el.dialogCard.textContent = '';
    cur.dialog = null;
  }
  function dialogOpen() { return !el.dialogRoot.hidden; }

  /* ================= サウンド ================= */
  function applySound() {
    var g = Store.get();
    Snd.setSE(g.se); Snd.setBGM(g.bgm); Snd.setVolume(g.vol);
    var on = g.se || g.bgm;
    el.titleSound.setAttribute('aria-pressed', on ? 'true' : 'false');
    var ic = el.titleSound.querySelector('.ic');
    if (ic) ic.setAttribute('data-ic', on ? 'sound-on' : 'sound-off');
  }
  function unlockAudio() {
    Snd.unlock();
    if (Store.get().bgm) Snd.startBgm();
  }
  document.addEventListener('pointerdown', function once() {
    document.removeEventListener('pointerdown', once);
    unlockAudio();
  });

  /* ================= 言語 ================= */
  function buildLangSwitch(host) {
    host.textContent = '';
    I18N.langs.forEach(function (L) {
      var b = el2('button', I18N.getLang() === L.code ? 'on' : '', L.label);
      b.type = 'button';
      b.addEventListener('click', function () {
        Snd.click();
        Store.set('lang', L.code);
        I18N.setLang(L.code);
      });
      host.appendChild(b);
    });
  }
  function relang() {
    I18N.apply(document);
    buildLangSwitch(el.langTitle);
    renderTitleStats();
    renderLevels();
    if (game) updateMission();
    if (cur.dialog && cur.dialog.reload) { var s = cur.dialog; closeDialog(); dialog(s); }
  }

  /* ================= タイトル ================= */
  function renderTitleStats() {
    var g = Store.get();
    el.titleStats.textContent = '';
    var items = [
      [t('stat.stage'), (Math.min(g.unlocked, Levels.count)) + '/' + Levels.count],
      [t('stat.best'), fmt(g.best)],
      [t('stat.coins'), fmt(g.coins)],
      [t('stat.chain'), fmt(g.bestChain)]
    ];
    items.forEach(function (it) {
      var c = el2('div', 'stat-chip');
      c.appendChild(el2('span', '', it[0]));
      c.appendChild(el2('b', '', it[1]));
      el.titleStats.appendChild(c);
    });
  }
  function fmt(n) { return (n || 0).toLocaleString ? (n || 0).toLocaleString('en-US') : String(n || 0); }

  function startParade() {
    if (paradeRaf) return;
    var t0 = performance.now();
    (function loop(ts) {
      paradeRaf = requestAnimationFrame(loop);
      if (el.scrTitle.classList.contains('show') && el.titleCanvas.width) {
        Art.parade(el.titleCanvas, (ts - t0) / 1000);
      }
    })(t0);
  }
  function stopParade() { if (paradeRaf) { cancelAnimationFrame(paradeRaf); paradeRaf = null; } }

  /* ================= レベル選択 ================= */
  function renderLevels() {
    el.levelsGrid.textContent = '';
    var g = Store.get();
    el.coinLevels.querySelector('b').textContent = fmt(g.coins);
    Levels.LIST.forEach(function (lv) {
      var rec = g.levels[String(lv.id)] || { best: 0, stars: 0 };
      var unlocked = lv.id <= g.unlocked;
      var card = el2('button', 'lv-card' + (unlocked ? '' : ' locked') + (rec.stars ? ' done' : '') + (lv.id === g.unlocked ? ' go next' : ''));
      card.type = 'button';
      if (!unlocked) {
        card.appendChild(el2('div', 'lock', '🔒'));
        card.appendChild(el2('div', 'lv-no', String(lv.id)));
        card.appendChild(el2('div', 'lv-goal', t('levels.locked')));
        card.disabled = true;
      } else {
        if (lv.goal) card.appendChild(el2('span', 'lv-tag', goalShort(lv)));
        card.appendChild(el2('div', 'lv-no', String(lv.id)));
        card.appendChild(el2('div', 'lv-goal', t('game.target') + ' ' + fmt(lv.target)));
        var st = el2('div', 'lv-stars', '');
        for (var i = 0; i < 3; i++) st.appendChild(el2('span', i < rec.stars ? 'on' : '', '★'));
        card.appendChild(st);
        card.appendChild(el2('div', 'lv-best', rec.best ? fmt(rec.best) : '--'));
        card.addEventListener('click', function () { Snd.click(); askStart(lv); });
      }
      el.levelsGrid.appendChild(card);
    });
  }
  function goalShort(lv) {
    if (!lv.goal) return '';
    if (lv.goal.type === 'chain') return 'Chain ' + lv.goal.n;
    if (lv.goal.type === 'combo') return 'Combo ' + lv.goal.n;
    return 'Mood ' + lv.goal.n;
  }

  /* ================= ゲーム開始 ================= */
  function askStart(lv) {
    cur.level = lv; cur.continues = 0;
    ensureGame();
    show(el.scrGame);
    game.setLevel(lv);
    syncGameChrome();
    updateMission();
    dialog({
      title: t('game.level') + ' ' + lv.id,
      sub: missionText(lv, true),
      html: '<div class="goal-line">' + t('result.target', { n: fmt(lv.target) }) + ' / ' + lv.time + 's</div>',
      actions: [{ label: t('btn.start'), cls: 'primary big', fn: function () { closeDialog(); game.beginCountdown(); } }],
      reload: true
    });
    if (Store.get().plays === 0) setTimeout(function () { boardMsg(t('tutorial.first'), 2600); }, 300);
  }

  function ensureGame() {
    if (game) return;
    game = new Game({
      canvas: el.board, wrap: el.boardWrap,
      onEvent: onGameEvent, onTick: onGameTick
    });
    window.game = game;   // デバッグ/自動テスト用ハンドル
    game.resize();
    game.start();         // メインループ起動（1回だけ）
  }

  function syncGameChrome() {
    var lv = cur.level;
    el.hudLevel.textContent = lv.id;
    el.hudTarget.textContent = fmt(lv.target);
    el.hudCoins.textContent = fmt(Store.get().coins);
    el.coinLevels.querySelector('b').textContent = fmt(Store.get().coins);
  }

  function missionText(lv, plain) {
    if (!lv.goal) return t('mission.score', { n: fmt(lv.target) });
    var g = lv.goal, d = game ? game.stats() : { chain: 0, combo: 0, fevers: 0 };
    if (g.type === 'chain') return t('mission.chain', { n: g.n, d: Math.min(d.chain, g.n) });
    if (g.type === 'combo') return t('mission.combo', { n: g.n, d: Math.min(d.combo, g.n) });
    return t('mission.fever', { n: g.n, d: Math.min(d.fevers, g.n) });
  }
  function updateMission() {
    if (!cur.level) return;
    var lv = cur.level, s = game.stats();
    var met = Levels.goalMet(lv, s);
    el.hudMission.textContent = met
      ? t('mission.score', { n: fmt(lv.target) }) + (lv.goal ? ' · ' + t('mission.done') : '')
      : missionText(lv);
  }

  /* ================= ゲームイベント ================= */
  function onGameEvent(kind, d) {
    switch (kind) {
      case 'pick': Snd.pick(d.n); break;
      case 'erase':
        Snd.pop(d.n, d.combo);
        if (d.combo >= 3) Snd.combo(d.combo);
        if (navigator.vibrate) { try { navigator.vibrate(Math.min(45, 6 + d.n * 2)); } catch (e) {} }
        updateMission();
        break;
      case 'nochain': Snd.back(); boardMsg(t('msg.nochain'), 700); break;
      case 'fever':
        Snd.fever(); boardMsg(t('msg.fever'), 1500);
        if (navigator.vibrate) { try { navigator.vibrate([25, 40, 25, 40, 60]); } catch (e) {} }
        el.feverFlash.classList.add('on');
        el.feverFlash.style.background = 'radial-gradient(circle at 50% 50%,' +
          Art.TYPES[d.type].base + '88, transparent 72%)';
          break;
      case 'feverend':
        el.feverFlash.classList.remove('on');
        boardMsg(t('msg.fever.end'), 900);
        break;
      case 'skill': Snd.skill(); boardMsg(t('msg.skill'), 1200);
        if (navigator.vibrate) { try { navigator.vibrate([30, 30, 90]); } catch (e) {} }
        break;
      case 'shuffle': Snd.shuffle(); boardMsg(t('msg.shuffle'), 1200); break;
      case 'go': boardMsg('', 100); break;
      case 'timeup': onTimeUp(); break;
    }
  }

  function onGameTick(g) {
    var h = g.hud();
    if (lastHud.score !== h.score) { el.hudScore.textContent = fmt(h.score); lastHud.score = h.score; }
    var sec = Math.ceil(h.time);
    if (lastHud.time !== sec) {
      el.hudTime.textContent = sec;
      lastHud.time = sec;
      el.timebar.classList.toggle('low', h.time <= 10);
    }
    el.timebar.style.width = (h.timePct * 100).toFixed(1) + '%';
    if (lastHud.chain !== h.chain) { el.hudChain.textContent = h.chain; lastHud.chain = h.chain; }
    if (lastHud.combo !== h.combo) {
      el.hudCombo.textContent = h.combo;
      el.comboPill.classList.toggle('hot', h.combo >= 5);
      lastHud.combo = h.combo;
    }
    var fp = Math.round(h.feverPct * 100), sp = Math.round(h.skillPct * 100);
    if (lastHud.fp !== fp) { el.gaugeFever.style.width = fp + '%'; el.hudFeverPct.textContent = fp + '%'; lastHud.fp = fp; }
    if (lastHud.sp !== sp) {
      el.gaugeSkill.style.width = sp + '%'; el.hudSkillPct.textContent = sp + '%'; lastHud.sp = sp;
    }
    if (lastHud.skillReady !== h.skillReady) {
      el.btnSkill.disabled = !h.skillReady;
      el.btnSkill.classList.toggle('ready', !!h.skillReady);
      lastHud.skillReady = h.skillReady;
    }
    if (lastHud.fever !== h.fever) {
      el.feverFlash.classList.toggle('on', h.fever);
      lastHud.fever = h.fever;
    }
  }

  /* ================= 終了 / 結果 ================= */
  function onTimeUp() {
    Snd.timeup();
    var lv = cur.level, s = game.stats();
    var goalOk = Levels.goalMet(lv, s);
    var scoreOk = s.score >= lv.target;
    var clear = scoreOk && goalOk;
    var stars = clear ? Levels.starsFor(s.score, lv) : 0;

    cur.clear = clear; cur.stars = stars;

    if (clear) Snd.clear(); else Snd.fail();
    el.feverFlash.classList.remove('on');

    var coins = Levels.coinsFor(s.score, stars);
    var rec = Store.recordResult(lv.id, s.score, stars, s);
    Store.addCoins(coins);
    cur.coins = coins;
    el.hudCoins.textContent = fmt(Store.get().coins);

    var canGo = !clear && cur.continues < 3 && s.score > 0;
    var cost = Levels.continueCost(cur.continues);
    var reason = !scoreOk ? t('result.needtarget', { n: fmt(lv.target) })
      : (!goalOk ? t('result.needmission') : '');

    dialog({
      badge: clear ? t('result.clear') : t('result.fail'),
      title: t('game.level') + ' ' + lv.id,
      sub: clear ? '' : reason,
      build: function (card) {
        var st = el2('div', 'res-stars');
        for (var i = 0; i < 3; i++) st.appendChild(el2('span', i < stars ? 'on' : '', '★'));
        card.appendChild(st);
        var rows = el2('div', 'res-rows');
        row(rows, t('result.score'), fmt(s.score) + (rec.newRecord ? '' : ''));
        row(rows, t('result.best'), fmt(Store.get().best));
        row(rows, t('result.maxchain'), String(s.chain));
        row(rows, t('result.maxcombo'), String(s.combo));
        row(rows, t('game.fever'), String(s.fevers));
        row(rows, t('result.coins'), '+' + coins);
        card.appendChild(rows);
        if (rec.newRecord) {
          var nr = el2('div', 'goal-line');
          var b = el2('span', 'newrec', t('result.newrecord'));
          nr.appendChild(b);
          card.appendChild(nr);
        }
        if (rec.newStars && stars > 0) {
          var justUnlocked = (rec.prevStars === 0 && lv.id < Levels.count && Store.get().unlocked > lv.id);
          card.appendChild(el2('div', 'goal-line', justUnlocked ? t('result.unlock') : t('result.starsup')));
        }
      },
      actions: (function () {
        var a = [];
        if (canGo) {
          var ok = Store.get().coins >= cost;
          a.push({
            label: t('btn.continue') + ' (' + fmt(cost) + ' ' + t('stat.coins') + ')', cls: 'mint',
            disabled: !ok,
            fn: function () {
              if (!Store.spendCoins(cost)) { toast('!!'); return; }
              cur.continues++;
              el.hudCoins.textContent = fmt(Store.get().coins);
              closeDialog();
              game.addTime(15);
              boardMsg('+' + 15 + 's', 900);
            }
          });
        }
        a.push({ label: t('btn.retry'), cls: clear ? 'soft' : 'primary', fn: function () { closeDialog(); askStart(lv); } });
        if (clear && lv.id < Levels.count) {
          a.push({ label: t('btn.next'), cls: 'primary', fn: function () { closeDialog(); askStart(Levels.get(lv.id + 1)); } });
        }
        a.push({ label: t('btn.home'), cls: 'ghost', fn: function () { closeDialog(); quitToTitle(); } });
        return a;
      })(),
      reload: true
    });

    for (var i = 0; i < stars; i++) setTimeout(function () { Snd.star(i); }, 260 + i * 140);
    if (clear) boardMsg('CLEAR!', 900);

    function row(host, k, v) {
      var r = el2('div', 'res-row');
      r.appendChild(el2('span', '', k));
      r.appendChild(el2('b', '', v));
      host.appendChild(r);
    }
  }

  function quitToTitle() {
    if (game) { game.stop(); }
    lastHud = {};
    el.feverFlash.classList.remove('on');
    show(el.scrTitle);
  }

  /* ================= ポーズ / 設定 / ヘルプ ================= */
  function openPause() {
    if (!game || game.state === 'over') return;
    game.pause();
    dialog({
      title: t('pause.title'),
      actions: [
        { label: t('btn.resume'), cls: 'primary', fn: function () { closeDialog(); game.resume(); } },
        { label: t('btn.restart'), cls: 'soft', fn: function () { closeDialog(); askStart(cur.level); } },
        { label: t('settings.title'), cls: 'soft', fn: function () { openSettings(true); } },
        { label: t('btn.quit'), cls: 'ghost', fn: function () { closeDialog(); quitToTitle(); } }
      ],
      reload: true
    });
  }

  function openSettings(fromPause) {
    var g = Store.get();
    dialog({
      title: t('settings.title'),
      build: function (card) {
        var body = el2('div', 'dlg-body');
        body.appendChild(switchRow(t('settings.sound'), t('settings.sound.note'), g.se, function (v) {
          Store.set('se', v); applySound();
        }));
        body.appendChild(switchRow(t('settings.bgm'), t('settings.bgm.note'), g.bgm, function (v) {
          Store.set('bgm', v); applySound(); if (v) Snd.startBgm();
        }));
        var volRow = el2('div', 'set-row');
        var lab = el2('div', '');
        lab.appendChild(el2('div', 'lab', t('settings.vol')));
        var range = document.createElement('input');
        range.type = 'range'; range.min = 0; range.max = 100; range.value = Math.round(g.vol * 100);
        range.className = 'range';
        range.addEventListener('input', function () {
          Store.set('vol', Number(range.value) / 100); applySound();
        });
        lab.appendChild(range);
        volRow.appendChild(lab);
        body.appendChild(volRow);

        var langRow = el2('div', 'set-row');
        var lwrap = el2('div', '');
        lwrap.appendChild(el2('div', 'lab', t('settings.lang')));
        var sw = el2('div', 'lang-switch');
        sw.style.marginTop = '6px';
        langRow.appendChild(lwrap);
        body.appendChild(langRow);
        body.appendChild(rowLang());

        body.appendChild(el2('p', 'note', t('settings.data.note')));
        card.appendChild(body);
      },
      actions: [
        { label: t('btn.resetdata'), cls: 'danger', fn: function () {
            dialog({
              title: t('btn.resetdata'), sub: t('confirm.reset'),
              actions: [
                { label: t('btn.resetdata'), cls: 'danger', fn: function () {
                    Store.reset(); applySound(); closeDialog(); renderTitleStats(); renderLevels();
                    toast(t('reset.done'));
                    openSettings(fromPause);
                  } },
                { label: t('btn.close'), cls: 'soft', fn: function () { openSettings(fromPause); } }
              ]
            });
          } },
        { label: t('btn.close'), cls: 'primary', fn: function () {
            closeDialog();
            if (fromPause && game && game.state === 'paused') openPause();
          } }
      ],
      reload: true
    });

    function rowLang() {
      var host = el2('div', 'lang-switch');
      host.style.display = 'inline-flex';
      I18N.langs.forEach(function (L) {
        var b = el2('button', I18N.getLang() === L.code ? 'on' : '', L.label);
        b.type = 'button';
        b.addEventListener('click', function () { Store.set('lang', L.code); I18N.setLang(L.code); });
        host.appendChild(b);
      });
      return host;
    }
    function switchRow(label, note, val, cb) {
      var r = el2('div', 'set-row');
      var lab = el2('div', '');
      lab.appendChild(el2('div', 'lab', label));
      lab.appendChild(el2('div', 'note', note));
      var sw = el2('button', 'switch');
      sw.type = 'button';
      sw.setAttribute('aria-checked', val ? 'true' : 'false');
      sw.addEventListener('click', function () {
        var nv = sw.getAttribute('aria-checked') !== 'true';
        sw.setAttribute('aria-checked', nv ? 'true' : 'false');
        Snd.click(); cb(nv);
      });
      r.appendChild(lab); r.appendChild(sw);
      return r;
    }
  }

  function openHelp() {
    dialog({
      title: t('help.title'),
      build: function (card) {
        var ul = el2('ul', 'dlg-list');
        for (var i = 1; i <= 5; i++) {
          var li = el2('li');
          li.appendChild(el2('span', 'dot', String(i)));
          var tx = el2('div', 'txt');
          tx.appendChild(el2('b', '', t('help.' + i + '.t')));
          tx.appendChild(el2('span', '', t('help.' + i + '.d')));
          li.appendChild(tx);
          ul.appendChild(li);
        }
        card.appendChild(ul);
      },
      actions: [{ label: t('btn.close'), cls: 'primary', fn: closeDialog }],
      reload: true
    });
  }

  /* ================= ボタン類 ================= */
  $('btn-play').addEventListener('click', function () {
    Snd.click();
    var lv = Levels.get(Math.min(Store.get().unlocked, Levels.count));
    askStart(lv);
  });
  $('btn-levels').addEventListener('click', function () { Snd.click(); show(el.scrLevels); });
  $('btn-help').addEventListener('click', function () { Snd.click(); openHelp(); });
  $('btn-settings').addEventListener('click', function () { Snd.click(); openSettings(false); });
  $('btn-levels-back').addEventListener('click', function () { Snd.back(); show(el.scrTitle); });
  el.titleSound.addEventListener('click', function () {
    var g = Store.get();
    var on = !(g.se || g.bgm);
    Store.set('se', on); Store.set('bgm', on);
    applySound();
    if (on) { Snd.unlock(); Snd.startBgm(); Snd.click(); }
  });
  el.btnPause.addEventListener('click', function () { Snd.click(); openPause(); });
  el.btnSkill.addEventListener('click', function () {
    if (game && game.useSkill()) { /* sound in event */ }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (dialogOpen()) { closeDialog(); if (game && game.state === 'paused') game.resume(); }
      else if (el.scrGame.classList.contains('show')) openPause();
    } else if (e.key === ' ' || e.code === 'Space') {
      if (el.scrGame.classList.contains('show') && game && game.state === 'ready') {
        e.preventDefault(); closeDialog(); game.beginCountdown();
      } else if (el.scrGame.classList.contains('show') && !dialogOpen() && game) {
        e.preventDefault(); game.useSkill();
      }
    }
  });

  window.addEventListener('resize', function () {
    if (game && el.scrGame.classList.contains('show')) game.resize();
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { if (game) game.resize(); }, 250);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && game && game.state === 'play') openPause();
  });

  I18N.onChange(relang);

  /* ================= boot ================= */
  (function boot() {
    var g = Store.get();
    I18N.setLang(g.lang || I18N.detect(), true);
    document.body.classList.remove('booting');
    I18N.apply(document);
    applySound();
    buildLangSwitch(el.langTitle);
    renderTitleStats();
    renderLevels();
    show(el.scrTitle);
    // スプライトを先に生成しておいて初回のカクつきを防ぐ
    Art.sprites();
    if (!Store.storageOk()) setTimeout(function () { toast('localStorage OFF'); }, 800);
  })();
})();
