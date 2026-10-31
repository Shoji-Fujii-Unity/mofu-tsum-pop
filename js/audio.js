/* ============================================================
   audio.js — Web Audio で合成する SE / BGM（外部ファイル不要）
   On/Off + 音量 対応
   ============================================================ */
window.Snd = (function () {
  'use strict';

  var ctx = null, master = null, seBus = null, bgmBus = null;
  var enabled = { se: true, bgm: true };
  var volume = 0.7;
  var bgmTimer = null, nextNote = 0, stepIndex = 0;
  var failed = false;

  function ensure() {
    if (ctx || failed) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { failed = true; return null; }
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      seBus = ctx.createGain();
      seBus.gain.value = enabled.se ? 1 : 0;
      seBus.connect(master);
      bgmBus = ctx.createGain();
      bgmBus.gain.value = 0.0;
      bgmBus.connect(master);
    } catch (e) {
      failed = true;
      ctx = null;
    }
    return ctx;
  }

  function unlock() {
    var c = ensure();
    if (!c) return;
    if (c.state === 'suspended') { try { c.resume(); } catch (e) {} }
    if (enabled.bgm) startBgm();
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  /* ---- tone helper ---- */
  function tone(o) {
    if (!ensure()) return;
    var t0 = now() + (o.at || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'triangle';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + (o.dur || 0.12));
    var peak = (o.g === undefined ? 0.22 : o.g);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (o.atk || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (o.dur || 0.12));
    osc.connect(g); g.connect(o.bgm ? bgmBus : seBus);
    osc.start(t0); osc.stop(t0 + (o.dur || 0.12) + 0.02);
  }

  function noise(o) {
    if (!ensure()) return;
    var dur = o.dur || 0.12;
    var t0 = now() + (o.at || 0);
    var n = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = o.f || 900; bp.Q.value = o.q || 1.2;
    var g = ctx.createGain(); g.gain.value = (o.g === undefined ? 0.16 : o.g);
    src.connect(bp); bp.connect(g); g.connect(seBus);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  function semi(base, s) { return base * Math.pow(2, s / 12); }

  /* ---------------- SE ---------------- */
  var api = {};

  api.unlock = unlock;

  api.isEnabled = function (k) { return !!enabled[k]; };

  api.setSE = function (on) {
    enabled.se = !!on;
    if (seBus) seBus.gain.value = enabled.se ? 1 : 0;
  };
  api.setBGM = function (on) {
    enabled.bgm = !!on;
    if (!bgmBus) return;
    if (enabled.bgm) { bgmBus.gain.value = 0.0; startBgm(); }
    else stopBgm();
  };
  api.setVolume = function (v) {
    volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.value = volume;
  };
  api.getVolume = function () { return volume; };

  api.click = function () { tone({ f: 660, f2: 880, dur: 0.07, g: 0.14, type: 'triangle' }); };
  api.back = function () { tone({ f: 520, f2: 360, dur: 0.09, g: 0.12 }); };

  api.pick = function (len) {
    var s = PENTA[Math.min(len, PENTA.length - 1)];
    tone({ f: semi(392, s), dur: 0.08, g: 0.13, type: 'square' });
  };

  api.pop = function (n, combo) {
    // 連鎖長に応じて上行スケール + パフ音
    for (var i = 0; i < Math.min(n, 8); i++) {
      var s = PENTA[Math.min(i, PENTA.length - 1)];
      tone({ at: i * 0.035, f: semi(523, s + Math.min(combo, 12)), dur: 0.11, g: 0.13, type: 'triangle' });
    }
    noise({ f: 1300 + n * 90, dur: 0.1, g: 0.1 });
  };

  api.combo = function (c) {
    var s = PENTA[Math.min(Math.floor(c / 2), PENTA.length - 1)];
    tone({ f: semi(784, s), dur: 0.12, g: 0.1, type: 'sine' });
  };

  api.fever = function () {
    for (var i = 0; i < 10; i++) {
      tone({ at: i * 0.045, f: semi(523, i * 2), dur: 0.18, g: 0.1, type: 'triangle' });
    }
    tone({ f: 220, f2: 880, dur: 0.5, g: 0.12, type: 'sawtooth' });
  };

  api.skill = function () {
    tone({ f: 1200, f2: 200, dur: 0.35, g: 0.16, type: 'sawtooth' });
    noise({ f: 500, dur: 0.4, g: 0.18, q: 0.7 });
    tone({ at: 0.12, f: 330, f2: 660, dur: 0.4, g: 0.12, type: 'triangle' });
  };

  api.shuffle = function () {
    for (var i = 0; i < 5; i++) tone({ at: i * 0.06, f: semi(330, (i % 2 ? 7 : 0) + i * 2), dur: 0.09, g: 0.1, type: 'square' });
  };

  api.coin = function () {
    tone({ f: 1046, dur: 0.09, g: 0.11, type: 'triangle' });
    tone({ at: 0.07, f: 1568, dur: 0.14, g: 0.1, type: 'triangle' });
  };

  api.timeup = function () {
    tone({ f: 880, dur: 0.16, g: 0.14, type: 'square' });
    tone({ at: 0.18, f: 660, dur: 0.16, g: 0.14, type: 'square' });
    tone({ at: 0.36, f: 520, f2: 300, dur: 0.3, g: 0.14, type: 'square' });
  };

  api.clear = function () {
    var ch = [0, 4, 7, 12, 16, 19];
    for (var i = 0; i < ch.length; i++) {
      tone({ at: i * 0.09, f: semi(523, ch[i]), dur: 0.3, g: 0.13, type: 'triangle' });
    }
    tone({ at: 0.5, f: semi(523, 24), dur: 0.6, g: 0.12, type: 'sine' });
  };

  api.fail = function () {
    var ch = [7, 5, 3, 0];
    for (var i = 0; i < ch.length; i++) {
      tone({ at: i * 0.13, f: semi(392, ch[i]), dur: 0.24, g: 0.12, type: 'triangle' });
    }
  };

  api.star = function (i) {
    tone({ at: i * 0.12, f: semi(784, [0, 4, 7][i] || 7), dur: 0.22, g: 0.12, type: 'sine' });
  };

  /* ---------------- BGM (ループ) ---------------- */
  // 16分音符 2パターンループ: 明るい長音階
  var BASS = [0, 0, 7, 0, 5, 5, 7, 3];             // semis over C
  var ARP = [12, 16, 19, 16, 21, 19, 16, 14, 12, 16, 19, 23, 21, 19, 16, 14];
  var STEP = 0.135;

  function scheduleStep(i, t) {
    var bar = Math.floor(i / 16) % 4;
    var inBar = i % 16;
    // bass on 8th grid
    if (inBar % 2 === 0) {
      var b = BASS[(inBar / 2) % BASS.length];
      var bassRoot = [0, 5, 3, 7][bar];
      tone({ at: t - now(), bgm: true, f: semi(130.8, bassRoot + b - 12), dur: 0.26, g: 0.16, type: 'sine' });
    }
    // arpeggio
    var a = ARP[(i + bar * 2) % ARP.length];
    tone({ at: t - now(), bgm: true, f: semi(261.6, a + [0, 0, 5, 0][bar]), dur: 0.16, g: 0.055, type: 'triangle' });
    // sparkly high note occasionally
    if (inBar % 8 === 4) {
      tone({ at: t - now(), bgm: true, f: semi(523.3, ARP[i % ARP.length]), dur: 0.2, g: 0.03, type: 'sine' });
    }
  }

  function tick() {
    if (!ctx || !enabled.bgm) return;
    var horizon = now() + 0.35;
    while (nextNote < horizon) {
      scheduleStep(stepIndex, nextNote);
      stepIndex = (stepIndex + 1) % 64;
      nextNote += STEP;
    }
  }

  function startBgm() {
    if (!ensure() || !enabled.bgm || bgmTimer) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    bgmBus.gain.cancelScheduledValues(now());
    bgmBus.gain.setValueAtTime(bgmBus.gain.value, now());
    bgmBus.gain.linearRampToValueAtTime(0.5, now() + 0.6);
    nextNote = now() + 0.1;
    tick();
    bgmTimer = setInterval(tick, 90);
  }

  function stopBgm() {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    if (bgmBus) {
      bgmBus.gain.cancelScheduledValues(now());
      bgmBus.gain.setValueAtTime(bgmBus.gain.value, now());
      bgmBus.gain.linearRampToValueAtTime(0.0, now() + 0.35);
    }
  }

  api.startBgm = startBgm;
  api.stopBgm = stopBgm;
  api.ready = function () { return !!ctx && !failed; };

  return api;
})();
