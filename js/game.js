/* ============================================================
   game.js — 盤面ロジック / 入力 / 物理 / 演出 / スコア
   ツムを2コ以上つなげて消すマッチパズル（縦長ボード 7x8）
   ============================================================ */
window.Game = (function () {
  'use strict';

  var COLS = 7, ROWS = 8;
  var COMBO_WINDOW = 3.0;      // この秒数以内に次の消しをするとコンボ継続
  var FEVER_CAP = 55;          // ムード発生までのゲージ
  var FEVER_TIME = 6.5;
  var SKILL_CAP = 60;
  var TIME_MAX = 99;

  /* ---------------------------------------------------------------- */
  function Game(opts) {
    this.canvas = opts.canvas;
    this.wrap = opts.wrap;
    this.ctx = this.canvas.getContext('2d');
    this.onEvent = opts.onEvent || function () {};
    this.onTick = opts.onTick || function () {};

    this.grid = [];
    this.popping = [];
    this.floats = [];
    this.chain = [];
    this.dragging = false;
    this.pointer = { x: 0, y: 0, active: false };

    this.state = 'idle';       // idle | ready | count | play | paused | over
    this.level = null;
    this.cell = 40; this.dpr = 1;
    this.raf = null; this.lastT = 0;

    this._bind();
  }

  /* ---------------- セットアップ ---------------- */
  Game.prototype._bind = function () {
    var self = this;
    var cv = this.canvas;

    function pos(e) {
      var r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (self.canvas.width / self.dpr) / r.width,
               y: (e.clientY - r.top) * (self.canvas.height / self.dpr) / r.height };
    }
    function down(e) {
      if (self.state === 'ready') { self.beginCountdown(); return; }
      if (self.state !== 'play') return;
      var p = pos(e);
      self.pointer = { x: p.x, y: p.y, active: true };
      var c = self._cellAt(p.x, p.y);
      if (c) {
        self.dragging = true;
        self.chain = [c];
        self.onEvent('pick', { n: 1 });
      }
      e.preventDefault();
    }
    function move(e) {
      if (!self.dragging || self.state !== 'play') return;
      var p = pos(e);
      self.pointer.x = p.x; self.pointer.y = p.y;
      var c = self._cellAt(p.x, p.y);
      if (!c || c === self.chain[self.chain.length - 1]) return;
      // 戻り（取り消し）
      if (self.chain.length >= 2 && c === self.chain[self.chain.length - 2]) {
        self.chain.pop();
        self.onEvent('pick', { n: self.chain.length });
        return;
      }
      var last = self.chain[self.chain.length - 1];
      if (c.type === last.type && Math.abs(c.row - last.row) + Math.abs(c.col - last.col) === 1
          && self.chain.indexOf(c) < 0) {
        self.chain.push(c);
        self.onEvent('pick', { n: self.chain.length });
      }
      e.preventDefault();
    }
    function up() {
      if (!self.dragging) return;
      self.dragging = false;
      self.pointer.active = false;
      if (self.state !== 'play') { self.chain = []; return; }
      var list = self.chain;
      if (list.length >= 2) {
        self._erase(list);
      } else if (list.length === 1) {
        var grp = self._group(list[0]);
        if (grp.length >= 2) self._erase(grp);
        else { self.onEvent('nochain', {}); }
      }
      self.chain = [];
    }

    this._h = { down: down, move: move, up: up };
    cv.addEventListener('pointerdown', down, { passive: false });
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  Game.prototype.destroy = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.canvas.removeEventListener('pointerdown', this._h.down);
    window.removeEventListener('pointermove', this._h.move);
    window.removeEventListener('pointerup', this._h.up);
    window.removeEventListener('pointercancel', this._h.up);
  };

  /* ---------------- レベル開始 ---------------- */
  Game.prototype.setLevel = function (level) {
    this.level = level;
    this.state = 'ready';
    this.score = 0;
    this.combo = 0;
    this.maxChain = 0;
    this.maxCombo = 0;
    this.fevers = 0;
    this.feverGauge = 0;
    this.skillGauge = 0;
    this.feverTime = 0;
    this.timeLeft = level.time;
    this.settledCheck = false;
    this.popping.length = 0;
    this.floats.length = 0;
    this.chain.length = 0;
    this.dragging = false;
    window.Art.clear();
    this._buildBoard();
  };

  Game.prototype._types = function () {
    return Math.max(4, Math.min(8, this.level ? this.level.colors : 6));
  };

  Game.prototype._buildBoard = function () {
    this.grid = [];
    var n = this._types();
    for (var r = 0; r < ROWS; r++) {
      this.grid[r] = [];
      for (var c = 0; c < COLS; c++) {
        var t = Math.floor(Math.random() * n);
        // 既存の2x2まるめを避ける（最初の見栄え改善）
        var tries = 0;
        while (tries < 8 && this._makesSquare(r, c, t)) { t = (t + 1 + Math.floor(Math.random() * (n - 1))) % n; tries++; }
        var cell = this._cell(t, r, c);
        cell.py = -(ROWS - r + 1) * this.cell;   // 上から降ってくる
        cell.vy = 0;
        this.grid[r][c] = cell;
      }
    }
  };

  Game.prototype._makesSquare = function (r, c, t) {
    var G = this.grid;
    function ty(rr, cc) {
      if (rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS) return -1;
      var row = G[rr];
      var g = row ? row[cc] : null;
      return g ? g.type : -1;
    }
    var a = ty(r - 1, c - 1), b = ty(r - 1, c), d = ty(r, c - 1);
    return a === t && b === t && d === t;
  };

  Game.prototype._cell = function (type, row, col) {
    return { type: type, row: row, col: col, py: row * this.cell, vy: 0, wob: 0, born: 0 };
  };

  /* ---------------- サイジング ---------------- */
  Game.prototype.resize = function () {
    var w = this.wrap.clientWidth, h = this.wrap.clientHeight;
    if (!w || !h) return;
    var cell = Math.floor(Math.min(w / COLS, h / ROWS));
    if (cell < 12) return;
    var cssW = cell * COLS, cssH = cell * ROWS;
    var dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.cell = cell; this.dpr = dpr;
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    for (var r = 0; r < this.grid.length; r++) {
      for (var c = 0; c < COLS; c++) {
        var g = this.grid[r][c];
        if (g) { g.py = r * cell; g.vy = 0; }
      }
    }
  };

  /* ---------------- 入力ヘルパ ---------------- */
  Game.prototype._cellAt = function (x, y) {
    var c = Math.floor(x / this.cell), r = Math.floor(y / this.cell);
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return null;
    return this.grid[r][c] || null;
  };

  Game.prototype._group = function (cell) {
    var t = cell.type, seen = [], out = [], stack = [cell];
    while (stack.length) {
      var g = stack.pop();
      if (!g || seen.indexOf(g) >= 0) continue;
      seen.push(g); out.push(g);
      var nb = this._neighbors(g);
      for (var i = 0; i < nb.length; i++) if (nb[i] && nb[i].type === t) stack.push(nb[i]);
    }
    return out;
  };

  Game.prototype._neighbors = function (cell) {
    var d = [[1, 0], [-1, 0], [0, 1], [0, -1]], out = [];
    for (var i = 0; i < d.length; i++) {
      var r = cell.row + d[i][0], c = cell.col + d[i][1];
      out.push((r >= 0 && c >= 0 && r < ROWS && c < COLS) ? (this.grid[r][c] || null) : null);
    }
    return out;
  };

  Game.prototype._hasMove = function () {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var g = this.grid[r][c];
        if (!g) continue;
        if (c + 1 < COLS && this.grid[r][c + 1] && this.grid[r][c + 1].type === g.type) return true;
        if (r + 1 < ROWS && this.grid[r + 1][c] && this.grid[r + 1][c].type === g.type) return true;
      }
    }
    return false;
  };

  Game.prototype._shuffle = function () {
    var cells = [], types = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var g = this.grid[r][c];
      if (g) { cells.push(g); types.push(g.type); }
    }
    var guard = 0;
    do {
      for (var i = types.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = types[i]; types[i] = types[j]; types[j] = tmp;
      }
      for (var k = 0; k < cells.length; k++) cells[k].type = types[k];
      guard++;
    } while (!this._hasMove() && guard < 25);
    for (var m = 0; m < cells.length; m++) {
      cells[m].wob = 1;
      window.Art.ring(this._cx(cells[m]), this._cy(cells[m]), '#ffffff', this.cell * 0.4);
    }
    this.onEvent('shuffle', {});
  };

  Game.prototype._cx = function (g) { return g.col * this.cell + this.cell / 2; };
  Game.prototype._cy = function (g) { return g.py + this.cell / 2; };

  /* ---------------- 消去 ---------------- */
  Game.prototype._erase = function (list) {
    var n = list.length;
    var feverOn = this.feverTime > 0;
    var feverMul = feverOn ? 2 : 1;

    this.combo = (this._now - this.lastErase <= COMBO_WINDOW) ? this.combo + 1 : 1;
    this.lastErase = this._now;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (n > this.maxChain) this.maxChain = n;

    var pts = Math.min(9000, this.pointsFor(n, this.combo, feverMul));
    this.score += pts;

    var add = 0.3 * n + (n >= 5 ? 0.6 : 0) + (n >= 7 ? 1.1 : 0) + (n >= 9 ? 1.9 : 0);
    add = Math.min(6, add);
    this.timeLeft = Math.min(TIME_MAX, this.timeLeft + add);

    // ゲージ
    if (!feverOn) {
      this.feverGauge += Math.min(22, n + (n >= 6 ? 4 : 0) + (this.combo >= 5 ? 2 : 0));
      if (this.feverGauge >= FEVER_CAP) this.startFever();
    }
    this.skillGauge = Math.min(SKILL_CAP, this.skillGauge + Math.min(22, n * 0.85));

    // 中心
    var mx = 0, my = 0;
    for (var i = 0; i < n; i++) { mx += this._cx(list[i]); my += this._cy(list[i]); }
    mx /= n; my /= n;

    var col = window.Art.TYPES[list[0].type].base;
    var inkCol = window.Art.darken(window.Art.TYPES[list[0].type].dark, 0.35);
    for (var k = 0; k < n; k++) {
      var g = list[k];
      if (this.grid[g.row] && this.grid[g.row][g.col] === g) this.grid[g.row][g.col] = null;
      this.popping.push({ type: g.type, x: this._cx(g), y: this._cy(g), t: 0 });
      window.Art.burst(this._cx(g), this._cy(g), col, n);
      g.py = -9999;
    }
    this.floats.push({ x: mx, y: my, txt: '+' + pts, life: 1, size: 1 + Math.min(1.1, n * 0.09), col: inkCol });
    if (this.combo >= 3) {
      this.floats.push({ x: mx, y: my - this.cell * 0.7, txt: this.combo + ' COMBO', life: 1.1, size: 0.9, col: '#6a4b86' });
    }

    window.Art.ring(mx, my, col, this.cell * 0.6);
    this.collapse();
    this.onEvent('erase', { n: n, combo: this.combo, pts: pts, x: mx, y: my });
  };

  Game.prototype.pointsFor = function (n, combo, feverMul) {
    // 連鎖長が20コを超えると増加は穏やかになる（ムード中の巨大連鎖対策）
    var CAP = 20;
    var tri = n <= CAP ? n * (n + 1) / 2
                       : CAP * (CAP + 1) / 2 + (n - CAP) * (CAP + 1) * 0.7;
    var sizeMul = n >= 12 ? 2.2 : n >= 10 ? 1.8 : n >= 8 ? 1.5 : n >= 6 ? 1.2 : 1.0;
    var comboMul = 1 + Math.min(Math.max(0, combo - 1), 24) * 0.05;
    return Math.round(tri * 5 * sizeMul * comboMul * (feverMul || 1));
  };

  /* ---------------- 落下と補充 ---------------- */
  Game.prototype.collapse = function () {
    for (var c = 0; c < COLS; c++) {
      var write = ROWS - 1;
      for (var r = ROWS - 1; r >= 0; r--) {
        var g = this.grid[r][c];
        if (g) {
          if (write !== r) { this.grid[write][c] = g; this.grid[r][c] = null; g.row = write; }
          write--;
        }
      }
      var k = 0;
      for (var rr = write; rr >= 0; rr--) {
        var t = this._pickType(c, rr, k);
        var nc = this._cell(t, rr, c);
        nc.py = -(k + 1) * this.cell;
        nc.vy = 0;
        this.grid[rr][c] = nc;
        k++;
      }
    }
    this.settledCheck = false;
  };

  Game.prototype._pickType = function (c, r, k) {
    var n = this._types();
    // 直下・隣とそろえやすいように一部コピー
    if (Math.random() < 0.34) {
      var src = null;
      if (r + 1 < ROWS && this.grid[r + 1] && this.grid[r + 1][c]) src = this.grid[r + 1][c];
      if (!src && c > 0 && this.grid[r] && this.grid[r][c - 1]) src = this.grid[r][c - 1];
      if (src) return src.type;
    }
    if (this.feverTime > 0 && this.feverType !== undefined && Math.random() < 0.38) return this.feverType;
    return Math.floor(Math.random() * n);
  };

  /* ---------------- ムード（フィーバー） ---------------- */
  Game.prototype.startFever = function () {
    this.feverTime = FEVER_TIME;
    this.feverGauge = 0;
    this.fevers += 1;
    var n = this._types();
    this.feverType = Math.floor(Math.random() * n);
    var second = (this.feverType + 1 + Math.floor(Math.random() * Math.max(1, n - 1))) % n;
    // 盤面の多くを同色にするが、1本で全部なぞれないよう副配色も置く
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var g = this.grid[r][c];
      if (!g) continue;
      var p = Math.random();
      if (p < 0.55) { g.type = this.feverType; g.wob = 1; }
      else if (p < 0.75) { g.type = second; g.wob = 1; }
    }
    for (var i = 0; i < 12; i++) {
      window.Art.ring(Math.random() * COLS * this.cell, Math.random() * ROWS * this.cell,
        window.Art.TYPES[this.feverType].base, this.cell * 0.5);
    }
    this.onEvent('fever', { type: this.feverType });
  };

  /* ---------------- スペシャル ---------------- */
  Game.prototype.canSkill = function () { return this.state === 'play' && this.skillGauge >= SKILL_CAP; };

  Game.prototype.useSkill = function () {
    if (!this.canSkill()) return false;
    this.skillGauge = 0;
    var counts = {}, live = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var g = this.grid[r][c];
      if (!g) continue;
      live.push(g);
      counts[g.type] = (counts[g.type] || 0) + 1;
    }
    var bestType = -1, bestN = 0;
    for (var k in counts) if (Object.prototype.hasOwnProperty.call(counts, k)) {
      if (counts[k] > bestN) { bestN = counts[k]; bestType = Number(k); }
    }
    if (bestType < 0 || bestN < 2) { this.skillGauge = SKILL_CAP * 0.5; return false; }
    var list = [];
    for (var i = 0; i < live.length; i++) if (live[i].type === bestType) list.push(live[i]);
    this._erase(list);
    this.timeLeft = Math.min(TIME_MAX, this.timeLeft + 2);
    this.onEvent('skill', { n: list.length });
    return true;
  };

  /* ---------------- 一時制御 ---------------- */
  Game.prototype.beginCountdown = function () {
    if (this.state !== 'ready') return;
    this.state = 'count';
    this.countT = 3.0;
    this.onEvent('countstart', {});
  };
  Game.prototype.pause = function () {
    if (this.state === 'play' || this.state === 'count') { this._pre = this.state; this.state = 'paused'; }
  };
  Game.prototype.resume = function () {
    if (this.state === 'paused') this.state = this._pre || 'play';
  };
  Game.prototype.addTime = function (sec) {
    this.timeLeft = Math.min(TIME_MAX, this.timeLeft + sec);
    this.state = 'play';
    this.floats.push({ x: COLS * this.cell / 2, y: ROWS * this.cell * 0.4, txt: '+' + sec + 's', life: 1.2, size: 1.1, col: '#7ce0ff' });
  };
  Game.prototype.stop = function () { this.state = 'over'; this.chain = []; this.dragging = false; };

  /* ---------------- メインループ ---------------- */
  Game.prototype.start = function () {
    var self = this;
    this.lastT = 0;
    (function loop(ts) {
      self.raf = requestAnimationFrame(loop);
      var dt = self.lastT ? Math.min(0.05, (ts - self.lastT) / 1000) : 0.016;
      self.lastT = ts;
      self._now = (self._now || 0) + dt;
      self.update(dt);
      self.render();
      self.onTick(self);
    })(0);
  };

  Game.prototype.update = function (dt) {
    var st = this.state;
    if (st === 'over' || st === 'paused') { window.Art.step(dt); return; }
    if (st === 'count') {
      this.countT -= dt;
      if (this.countT <= 0) { this.state = 'play'; this.onEvent('go', {}); }
    }
    if (st === 'play') {
      this.timeLeft -= dt;
      if (this.feverTime > 0) {
        this.feverTime -= dt;
        if (this.feverTime <= 0) { this.feverTime = 0; this.feverGauge = 0; this.onEvent('feverend', {}); }
      }
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.stop();
        this.onEvent('timeup', { score: this.score });
      }
    }
    // 落下
    var G = this.cell * 15;
    var falling = false, poppingBusy = this.popping.length > 0;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var g = this.grid[r] && this.grid[r][c];
      if (!g) continue;
      var target = r * this.cell;
      if (g.py < target - 0.5) {
        g.vy = Math.min(g.vy + G * dt, this.cell * 12);
        g.py += g.vy * dt;
        if (g.py >= target) { g.py = target; g.vy = 0; g.wob = 1; }
        falling = true;
      } else if (g.py > target + 0.5) {
        g.py = target;
      }
      if (g.wob > 0) g.wob = Math.max(0, g.wob - dt * 5.5);
    }
    for (var i = this.popping.length - 1; i >= 0; i--) {
      this.popping[i].t += dt * 5.2;
      if (this.popping[i].t >= 1) this.popping.splice(i, 1);
    }
    for (var f = this.floats.length - 1; f >= 0; f--) {
      this.floats[f].life -= dt * 1.15;
      this.floats[f].y -= dt * this.cell * 0.55;
      if (this.floats[f].life <= 0) this.floats.splice(f, 1);
    }
    window.Art.step(dt);

    if (st === 'play' && !falling && !poppingBusy && !this.settledCheck) {
      this.settledCheck = true;
      if (!this._hasMove()) this._shuffle();
    }
    // コンボ表示 upkeep
    if (this.combo > 0 && this._now - this.lastErase > COMBO_WINDOW) this.combo = 0;
  };

  /* ---------------- 描画 ---------------- */
  Game.prototype.render = function () {
    var g = this.ctx, cell = this.cell, W = COLS * cell, H = ROWS * cell;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    // 市松の淡い下地
    g.save();
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if ((r + c) % 2 === 0) continue;
      g.fillStyle = 'rgba(150,120,190,.05)';
      g.fillRect(c * cell, r * cell, cell, cell);
    }
    g.restore();

    var R = cell * 0.42;

    // 連鎖の軌跡
    if (this.chain.length) {
      var base = window.Art.TYPES[this.chain[0].type].base;
      g.save();
      g.strokeStyle = base; g.globalAlpha = 0.4;
      g.lineWidth = R * 1.05; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      for (var i = 0; i < this.chain.length; i++) {
        var cc = this.chain[i];
        var x = this._cx(cc), y = this._cy(cc);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      if (this.pointer.active) g.lineTo(this.pointer.x, this.pointer.y);
      g.stroke();
      g.restore();
    }

    // 落下中のツムを後ろから
    var order = [];
    for (var rr = 0; rr < ROWS; rr++) for (var cc2 = 0; cc2 < COLS; cc2++) {
      var g2 = this.grid[rr] && this.grid[rr][cc2];
      if (g2) order.push(g2);
    }
    order.sort(function (a, b) { return a.py - b.py; });

    for (var k = 0; k < order.length; k++) {
      var c3 = order[k];
      var x2 = this._cx(c3), y2 = this._cy(c3);
      // 影
      var ground = c3.row * cell + cell * 0.5 + R * 0.85;
      var hgt = Math.max(0, Math.min(1, (ground - y2) / (cell * 2)));
      g.save();
      g.fillStyle = 'rgba(90,60,110,' + (0.14 - hgt * 0.09) + ')';
      g.beginPath(); g.ellipse(x2, ground, R * (0.85 - hgt * 0.3), R * 0.22, 0, 0, Math.PI * 2); g.fill();
      g.restore();

      var inChain = this.chain.indexOf(c3) >= 0;
      var sx = 1 + c3.wob * 0.12, sy = 1 - c3.wob * 0.14;
      if (inChain) { sx *= 1.1; sy *= 1.1; }
      window.Art.draw(g, c3.type, x2, y2 - (inChain ? cell * 0.06 : 0), R, sx, sy);

      if (inChain) {
        g.save();
        g.strokeStyle = '#ffffff'; g.lineWidth = 3.2; g.globalAlpha = 0.9;
        g.beginPath(); g.arc(x2, y2 - cell * 0.06, R + 3 + Math.sin(this._now * 8) * 1.6, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
    }

    // 消えるツム
    for (var p = 0; p < this.popping.length; p++) {
      var po = this.popping[p];
      var t = po.t;
      var scale = 1 + t * 0.55;
      g.save();
      g.globalAlpha = Math.max(0, 1 - t * 1.05);
      window.Art.draw(g, po.type, po.x, po.y, R, scale, scale);
      g.restore();
    }

    window.Art.render(g);

    // 浮上テキスト
    for (var f = 0; f < this.floats.length; f++) {
      var fl = this.floats[f];
      g.save();
      g.globalAlpha = Math.max(0, Math.min(1, fl.life));
      g.font = '800 ' + Math.round(cell * 0.46 * (fl.size || 1)) + 'px "Baloo 2","M PLUS Rounded 1c",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = Math.max(4, cell * 0.1);
      g.lineJoin = 'round';
      g.strokeStyle = 'rgba(255,255,255,.95)';
      g.strokeText(fl.txt, fl.x, fl.y);
      g.fillStyle = fl.col || '#5a3f74';
      g.fillText(fl.txt, fl.x, fl.y);
      g.fillText(fl.txt, fl.x, fl.y);
      g.restore();
    }

    // カウントダウン
    if (this.state === 'count') {
      var n = Math.ceil(this.countT);
      var frac = this.countT - Math.floor(this.countT);
      var label = n <= 0 ? 'GO!' : String(n);
      g.save();
      g.fillStyle = 'rgba(40,24,60,.35)';
      g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      var sc = 1 + (1 - frac) * 0.5;
      g.font = '800 ' + Math.round(cell * 2.0 * sc) + 'px "Baloo 2",sans-serif';
      g.lineWidth = 8; g.strokeStyle = '#fff';
      g.strokeText(label, W / 2, H / 2);
      g.fillStyle = '#ff8fb8';
      g.fillText(label, W / 2, H / 2);
      g.restore();
    } else if (this.state === 'ready') {
      g.save();
      g.fillStyle = 'rgba(40,24,60,.30)';
      g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '800 ' + Math.round(cell * 0.62) + 'px "M PLUS Rounded 1c",sans-serif';
      g.lineWidth = 6; g.strokeStyle = '#fff';
      g.strokeText('TAP!', W / 2, H / 2);
      g.fillStyle = '#fff';
      g.fillText('TAP!', W / 2, H / 2);
      g.restore();
    }
  };

  /* ---------------- HUD ---------------- */
  Game.prototype.hud = function () {
    var lv = this.level || { time: 60, target: 0 };
    return {
      score: this.score || 0,
      time: Math.max(0, this.timeLeft || 0),
      timePct: Math.max(0, Math.min(1, (this.timeLeft || 0) / lv.time)),
      combo: this.combo || 0,
      chain: this.chain.length,
      feverPct: Math.min(1, (this.feverGauge || 0) / FEVER_CAP),
      skillPct: Math.min(1, (this.skillGauge || 0) / SKILL_CAP),
      skillReady: this.skillGauge >= SKILL_CAP && this.state === 'play',
      fever: this.feverTime > 0,
      state: this.state
    };
  };

  Game.prototype.stats = function () {
    return { chain: this.maxChain || 0, combo: this.maxCombo || 0, fevers: this.fevers || 0, score: this.score || 0 };
  };

  Game.COLS = COLS; Game.ROWS = ROWS;
  Game.FEVER_CAP = FEVER_CAP; Game.SKILL_CAP = SKILL_CAP;
  return Game;
})();
