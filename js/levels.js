/* ============================================================
   levels.js — ステージ定義と評価ロジック
   ============================================================ */
window.Levels = (function () {
  'use strict';

  var STAR_RATIO = [1.0, 1.45, 2.0];   // ★1 / ★2 / ★3 = ターゲット比
  var CONTINUE_BASE = 300;             // コインでのタイム延長コスト（基本）

  var LIST = [
    { id: 1,  target: 900,   time: 60, colors: 5 },
    { id: 2,  target: 1500,  time: 60, colors: 5, goal: { type: 'chain', n: 4 } },
    { id: 3,  target: 2200,  time: 60, colors: 5 },
    { id: 4,  target: 2800,  time: 65, colors: 6, goal: { type: 'combo', n: 5 } },
    { id: 5,  target: 3400,  time: 65, colors: 6 },
    { id: 6,  target: 4000,  time: 65, colors: 6, goal: { type: 'chain', n: 6 } },
    { id: 7,  target: 4800,  time: 70, colors: 7 },
    { id: 8,  target: 5600,  time: 70, colors: 7, goal: { type: 'fever', n: 1 } },
    { id: 9,  target: 6600,  time: 75, colors: 7 },
    { id: 10, target: 7600,  time: 75, colors: 7, goal: { type: 'chain', n: 8 } },
    { id: 11, target: 8800,  time: 80, colors: 8 },
    { id: 12, target: 9800,  time: 80, colors: 8, goal: { type: 'combo', n: 10 } },
    { id: 13, target: 11200, time: 85, colors: 8 },
    { id: 14, target: 12600, time: 85, colors: 8, goal: { type: 'fever', n: 2 } },
    { id: 15, target: 14500, time: 90, colors: 8, goal: { type: 'chain', n: 10 } }
  ];

  function get(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
    return LIST[0];
  }

  function starsFor(score, level) {
    var s = 0;
    for (var i = 0; i < STAR_RATIO.length; i++) {
      if (score >= Math.round(level.target * STAR_RATIO[i])) s = i + 1;
    }
    return s;
  }

  /** ミッション（goal）の成否を stats から判定 */
  function goalMet(level, stats) {
    if (!level.goal) return true;
    var g = level.goal;
    if (g.type === 'chain') return stats.chain >= g.n;
    if (g.type === 'combo') return stats.combo >= g.n;
    if (g.type === 'fever') return stats.fevers >= g.n;
    return true;
  }

  function coinsFor(score, stars) {
    return Math.floor(score / 45) + stars * 20;
  }

  function continueCost(count) {
    return CONTINUE_BASE * (count + 1);
  }

  return {
    LIST: LIST,
    count: LIST.length,
    get: get,
    starsFor: starsFor,
    goalMet: goalMet,
    coinsFor: coinsFor,
    continueCost: continueCost,
    STAR_RATIO: STAR_RATIO
  };
})();
