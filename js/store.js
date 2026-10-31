/* ============================================================
   store.js — ローカル（localStorage）セーブデータ
   - localStorage が使えない環境ではメモリ内保存にフォールバック
   ============================================================ */
window.Store = (function () {
  'use strict';

  var KEY = 'mofutsumpop.save.v1';
  var memoryOnly = false;
  var data = null;

  function defaults() {
    return {
      v: 1,
      lang: null,          // null = 自動検出
      se: true,
      bgm: true,
      vol: 0.8,
      coins: 0,
      unlocked: 1,
      best: 0,
      bestChain: 0,
      bestCombo: 0,
      fevers: 0,
      plays: 0,
      levels: {}           // { "1": {best:0, stars:0} }
    };
  }

  function readRaw() {
    try {
      var s = window.localStorage.getItem(KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) {
      memoryOnly = true;
      return null;
    }
  }

  function writeRaw(obj) {
    if (memoryOnly) return false;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(obj));
      return true;
    } catch (e) {
      memoryOnly = true;
      return false;
    }
  }

  function load() {
    var raw = readRaw();
    var d = defaults();
    if (raw && typeof raw === 'object') {
      for (var k in d) {
        if (Object.prototype.hasOwnProperty.call(d, k) && raw[k] !== undefined && raw[k] !== null) {
          d[k] = raw[k];
        }
      }
      if (!d.levels || typeof d.levels !== 'object') d.levels = {};
    }
    // 型ガード
    d.coins = Math.max(0, Math.round(Number(d.coins) || 0));
    d.unlocked = Math.max(1, Math.round(Number(d.unlocked) || 1));
    d.best = Math.max(0, Math.round(Number(d.best) || 0));
    d.bestChain = Math.max(0, Math.round(Number(d.bestChain) || 0));
    d.bestCombo = Math.max(0, Math.round(Number(d.bestCombo) || 0));
    d.fevers = Math.max(0, Math.round(Number(d.fevers) || 0));
    d.plays = Math.max(0, Math.round(Number(d.plays) || 0));
    d.vol = Math.max(0, Math.min(1, Number(d.vol)));
    if (isNaN(d.vol)) d.vol = 0.8;
    data = d;
    return data;
  }

  function save() {
    if (!data) load();
    return writeRaw(data);
  }

  function get() { if (!data) load(); return data; }

  function set(k, v) { if (!data) load(); data[k] = v; save(); }

  function levelRecord(id) {
    var g = get();
    var key = String(id);
    if (!g.levels[key]) g.levels[key] = { best: 0, stars: 0 };
    return g.levels[key];
  }

  /** 1プレイ分の結果を反映。{newRecord, newStars, improvedStars} を返す */
  function recordResult(id, score, stars, stats) {
    var g = get();
    var rec = levelRecord(id);
    var out = { newRecord: false, newStars: false, prevStars: rec.stars };
    if (score > rec.best) { rec.best = score; out.newRecord = true; }
    if (stars > rec.stars) { rec.stars = stars; out.newStars = true; }
    if (score > g.best) g.best = score;
    if (stats) {
      if (stats.chain > g.bestChain) g.bestChain = stats.chain;
      if (stats.combo > g.bestCombo) g.bestCombo = stats.combo;
      g.fevers += (stats.fevers || 0);
    }
    g.plays += 1;
    if (stars > 0 && id >= g.unlocked) g.unlocked = id + 1;
    save();
    return out;
  }

  function addCoins(n) { var g = get(); g.coins = Math.max(0, Math.round(g.coins + n)); save(); return g.coins; }
  function spendCoins(n) {
    var g = get();
    if (g.coins < n) return false;
    g.coins -= n; save(); return true;
  }
  function isUnlocked(id) { return id <= get().unlocked; }
  function totalStars() {
    var g = get(), s = 0;
    for (var k in g.levels) if (Object.prototype.hasOwnProperty.call(g.levels, k)) s += g.levels[k].stars || 0;
    return s;
  }
  function reset() { data = defaults(); writeRaw(data); return data; }
  function storageOk() { return !memoryOnly; }

  load();
  return {
    KEY: KEY, get: get, set: set, save: save, load: load,
    recordResult: recordResult, addCoins: addCoins, spendCoins: spendCoins,
    levelRecord: levelRecord, isUnlocked: isUnlocked, totalStars: totalStars,
    reset: reset, storageOk: storageOk
  };
})();
