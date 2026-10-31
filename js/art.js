/* ============================================================
   art.js — ツム（キャラクター）の手描き風キャンバス绘制 + パーティクル
   画像ファイル不使用。Canvas2D だけで描く。
   ============================================================ */
window.Art = (function () {
  'use strict';

  // ----- 8種類のツム（色違い・耳違い）-------------------------------------
  var TYPES = [
    { id: 0, name: 'Mocha',   base: '#ff92b8', dark: '#e0658e', ear: 'round', face: 'open',  fur: 'cat' },
    { id: 1, name: 'Usagi',   base: '#bfe9ff', dark: '#79bfe4', ear: 'long',  face: 'open',  fur: 'smooth' },
    { id: 2, name: 'Kuma',    base: '#e8b483', dark: '#c18b56', ear: 'round', face: 'kiss',  fur: 'cat' },
    { id: 3, name: 'Neko',    base: '#ffbe6b', dark: '#e0913c', ear: 'point', face: 'whisk', fur: 'cat' },
    { id: 4, name: 'Kero',    base: '#8fe07a', dark: '#5bb452', ear: 'bulge', face: 'wide',  fur: 'smooth' },
    { id: 5, name: 'Panda',   base: '#f2f2f7', dark: '#8d8ba3', ear: 'round', face: 'panda', fur: 'smooth' },
    { id: 6, name: 'Tori',    base: '#ffdb6b', dark: '#e6ac34', ear: 'tuft',  face: 'beak',  fur: 'smooth' },
    { id: 7, name: 'Sumomo',  base: '#c3a6ff', dark: '#9273e0', ear: 'point', face: 'owl',   fur: 'smooth' }
  ];

  var RES = 128;          // スプライト解像度
  var cache = null;       // 型ごとのオフスクリーンキャンバス

  function hex2rgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function mix(h, target, amt) {
    var a = hex2rgb(h), b = hex2rgb(target);
    var r = Math.round(a[0] + (b[0] - a[0]) * amt);
    var g = Math.round(a[1] + (b[1] - a[1]) * amt);
    var bl = Math.round(a[2] + (b[2] - a[2]) * amt);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  function lighten(h, a) { return mix(h, '#ffffff', a); }
  function darken(h, a) { return mix(h, '#3a2a3f', a); }

  // ----- 耳の形 ---------------------------------------------------------
  function drawEars(g, t, cx, cy, R) {
    var d = t.dark;
    g.fillStyle = t.base;
    g.strokeStyle = darken(d, 0.25);
    g.lineWidth = R * 0.09;

    function blob(x, y, rx, ry, rot) {
      g.save(); g.translate(x, y); if (rot) g.rotate(rot);
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      g.fill(); g.stroke();
      g.restore();
    }
    switch (t.ear) {
      case 'round':
        blob(cx - R * 0.62, cy - R * 0.78, R * 0.34, R * 0.32, 0);
        blob(cx + R * 0.62, cy - R * 0.78, R * 0.34, R * 0.32, 0);
        g.fillStyle = lighten(t.base, 0.55);
        blobInner(cx - R * 0.62, cy - R * 0.78, R * 0.18);
        blobInner(cx + R * 0.62, cy - R * 0.78, R * 0.18);
        break;
      case 'long':
        blob(cx - R * 0.46, cy - R * 1.14, R * 0.24, R * 0.56, -0.14);
        blob(cx + R * 0.46, cy - R * 1.14, R * 0.24, R * 0.56, 0.14);
        g.fillStyle = lighten(t.base, 0.6);
        blobInner(cx - R * 0.46, cy - R * 1.16, R * 0.11, R * 0.34, -0.14);
        blobInner(cx + R * 0.46, cy - R * 1.16, R * 0.11, R * 0.34, 0.14);
        break;
      case 'point':
        earTri(g, cx - R * 0.6, cy - R * 0.72, R, -1);
        earTri(g, cx + R * 0.6, cy - R * 0.72, R, 1);
        break;
      case 'bulge':
        blob(cx - R * 0.5, cy - R * 0.82, R * 0.3, R * 0.28, 0);
        blob(cx + R * 0.5, cy - R * 0.82, R * 0.3, R * 0.28, 0);
        g.fillStyle = '#ffffff';
        blobInner(cx - R * 0.5, cy - R * 0.86, R * 0.14);
        blobInner(cx + R * 0.5, cy - R * 0.86, R * 0.14);
        break;
      case 'tuft':
        g.fillStyle = t.dark;
        for (var i = -1; i <= 1; i += 2) {
          g.save(); g.translate(cx + i * R * 0.16, cy - R * 0.98); g.rotate(i * 0.3);
          g.beginPath(); g.ellipse(0, 0, R * 0.09, R * 0.24, 0, 0, Math.PI * 2); g.fill();
          g.restore();
        }
        break;
    }
    function blobInner(x, y, rx, ry, rot) {
      g.save(); g.translate(x, y); if (rot) g.rotate(rot);
      g.beginPath(); g.ellipse(0, 0, rx, ry || rx, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  function earTri(g, x, y, R, dir) {
    g.beginPath();
    g.moveTo(x - R * 0.3 * dir, y + R * 0.26);
    g.lineTo(x + R * 0.16 * dir, y - R * 0.52);
    g.lineTo(x + R * 0.36 * dir, y + R * 0.24);
    g.closePath(); g.fill(); g.stroke();
  }

  // ----- 顔 -------------------------------------------------------------
  function drawFace(g, t, cx, cy, R) {
    var ex = R * 0.34, ey = -R * 0.02;
    var ink = t.face === 'panda' ? '#3c3547' : '#453a52';

    // パンダの目元
    if (t.face === 'panda') {
      g.fillStyle = '#585266';
      g.save(); g.translate(cx - ex, cy + ey); g.rotate(-0.25);
      g.beginPath(); g.ellipse(0, 0, R * 0.22, R * 0.26, 0, 0, Math.PI * 2); g.fill(); g.restore();
      g.save(); g.translate(cx + ex, cy + ey); g.rotate(0.25);
      g.beginPath(); g.ellipse(0, 0, R * 0.22, R * 0.26, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }

    // 瞳
    g.fillStyle = ink;
    eye(g, cx - ex, cy + ey, R * 0.135);
    eye(g, cx + ex, cy + ey, R * 0.135);

    // ほっぺ
    g.fillStyle = 'rgba(255,150,180,.42)';
    g.beginPath(); g.ellipse(cx - R * 0.52, cy + R * 0.22, R * 0.15, R * 0.1, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx + R * 0.52, cy + R * 0.22, R * 0.15, R * 0.1, 0, 0, Math.PI * 2); g.fill();

    // 口
    g.strokeStyle = ink; g.lineWidth = R * 0.075; g.lineCap = 'round';
    var my = cy + R * 0.3;
    switch (t.face) {
      case 'beak':
        g.fillStyle = '#ff9d3c';
        g.beginPath();
        g.moveTo(cx - R * 0.14, my - R * 0.06);
        g.lineTo(cx + R * 0.14, my - R * 0.06);
        g.lineTo(cx, my + R * 0.16);
        g.closePath(); g.fill();
        break;
      case 'kiss':
        g.beginPath(); g.arc(cx - R * 0.05, my, R * 0.1, 0, Math.PI * 1.2); g.stroke();
        break;
      case 'wide':
        g.beginPath(); g.arc(cx, my - R * 0.06, R * 0.24, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
        break;
      case 'owl':
        g.strokeStyle = ink;
        g.beginPath(); g.moveTo(cx - R * 0.12, my); g.quadraticCurveTo(cx, my + R * 0.14, cx + R * 0.12, my); g.stroke();
        break;
      case 'whisk':
        g.beginPath(); g.moveTo(cx - R * 0.12, my); g.quadraticCurveTo(cx, my + R * 0.16, cx + R * 0.12, my); g.stroke();
        g.lineWidth = R * 0.045; g.strokeStyle = 'rgba(90,70,100,.55)';
        for (var s = -1; s <= 1; s += 2) {
          for (var w = 0; w < 2; w++) {
            g.beginPath();
            g.moveTo(cx + s * R * 0.5, cy + R * (0.14 + w * 0.14));
            g.lineTo(cx + s * R * 0.86, cy + R * (0.06 + w * 0.22));
            g.stroke();
          }
        }
        break;
      default: // open
        g.beginPath(); g.arc(cx, my - R * 0.04, R * 0.16, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
    }
    function eye(g2, x, y, r) {
      g2.beginPath(); g2.ellipse(x, y, r, r * 1.15, 0, 0, Math.PI * 2); g2.fill();
      g2.fillStyle = '#fff';
      g2.beginPath(); g2.arc(x - r * 0.3, y - r * 0.45, r * 0.34, 0, Math.PI * 2); g2.fill();
      g2.fillStyle = ink;
    }
  }

  // ----- 本体スプライト生成 ---------------------------------------------
  function buildSprite(t) {
    var c = document.createElement('canvas');
    c.width = c.height = RES;
    var g = c.getContext('2d');
    var cx = RES * 0.5, cy = RES * 0.58, R = RES * 0.34;

    drawEars(g, t, cx, cy, R);

    // 本体
    var grd = g.createRadialGradient(cx - R * 0.3, cy - R * 0.5, R * 0.2, cx, cy, R * 1.25);
    grd.addColorStop(0, lighten(t.base, 0.5));
    grd.addColorStop(0.62, t.base);
    grd.addColorStop(1, t.dark);
    g.fillStyle = grd;
    g.beginPath(); g.ellipse(cx, cy, R, R * 0.98, 0, 0, Math.PI * 2); g.fill();

    // 輪郭
    g.strokeStyle = darken(t.dark, 0.35); g.lineWidth = R * 0.09;
    g.beginPath(); g.ellipse(cx, cy, R, R * 0.98, 0, 0, Math.PI * 2); g.stroke();

    // つや
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.beginPath(); g.ellipse(cx - R * 0.36, cy - R * 0.52, R * 0.24, R * 0.15, -0.5, 0, Math.PI * 2); g.fill();

    // 毛並み（猫系の口元の薄線）
    if (t.fur === 'cat') {
      g.fillStyle = 'rgba(255,255,255,.30)';
      g.beginPath(); g.ellipse(cx, cy + R * 0.42, R * 0.52, R * 0.34, 0, 0, Math.PI * 2); g.fill();
    }

    drawFace(g, t, cx, cy, R);
    return c;
  }

  function sprites() {
    if (!cache) { cache = []; for (var i = 0; i < TYPES.length; i++) cache[i] = buildSprite(TYPES[i]); }
    return cache;
  }

  /**
   * 盤面へツムを1体描画
   * sx: 縮尺X, sy: 縮尺Y（ squash & stretch 用）
   */
  function draw(g, type, cx, cy, radius, sx, sy, alpha) {
    var sp = sprites();
    var img = sp[type] || sp[0];
    // スプライト内の本体半径は RES*0.34 なので、指定 radius に合わせて拡大
    var size = radius / 0.34;
    g.save();
    if (alpha !== undefined) g.globalAlpha = alpha;
    g.translate(cx, cy);
    g.scale(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy);
    g.drawImage(img, -size / 2, -size / 2, size, size);
    g.restore();
  }

  // ----- パーティクル ---------------------------------------------------
  var parts = [];
  function burst(x, y, color, power) {
    var n = 5 + Math.min(9, Math.floor(power * 1.2));
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 1.4 + Math.random() * 2.6 + power * 0.12;
      parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2,
        r: 2 + Math.random() * 3.4, life: 1, decay: 0.018 + Math.random() * 0.02,
        color: color, kind: Math.random() < 0.4 ? 'star' : 'dot'
      });
    }
  }
  function ring(x, y, color, r0) {
    parts.push({ ring: true, x: x, y: y, r: r0 * 0.4, vr: r0 * 0.09, life: 1, decay: 0.055, color: color });
  }
  function step(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      if (p.ring) { p.r += p.vr * dt * 60; }
      else {
        p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
        p.vy += 0.14 * dt * 60; p.vx *= 0.99;
      }
      p.life -= p.decay * dt * 60;
      if (p.life <= 0) parts.splice(i, 1);
    }
  }
  function star(g, x, y, r, rot) {
    g.beginPath();
    for (var i = 0; i < 10; i++) {
      var rr = i % 2 ? r * 0.45 : r;
      var a = rot + i * Math.PI / 5;
      var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  }
  function render(g) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      g.save();
      g.globalAlpha = Math.max(0, Math.min(1, p.life));
      if (p.ring) {
        g.strokeStyle = p.color; g.lineWidth = 3;
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.stroke();
      } else {
        g.fillStyle = p.color;
        if (p.kind === 'star') { star(g, p.x, p.y, p.r * 1.7, p.life * 4); g.fill(); }
        else { g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); }
      }
      g.restore();
    }
  }
  function clearParts() { parts.length = 0; }
  function partCount() { return parts.length; }

  // ----- タイトルのパレード ---------------------------------------------
  function parade(canvas, tSec) {
    var g = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    g.clearRect(0, 0, W, H);
    var n = 6;
    var rad = Math.min(H * 0.3, W / (n * 2.4));
    var y0 = H * 0.62;
    for (var i = 0; i < n; i++) {
      var x = W * (0.5 + (i - (n - 1) / 2) * (rad * 2.5) / W);
      var bob = Math.sin(tSec * 2.2 + i * 0.7) * rad * 0.22;
      var sq = 1 + Math.sin(tSec * 2.2 + i * 0.7) * 0.06;
      // 影
      g.save();
      g.fillStyle = 'rgba(120,90,140,.13)';
      g.beginPath(); g.ellipse(x, y0 + rad * 0.98, rad * 0.8, rad * 0.2, 0, 0, Math.PI * 2); g.fill();
      g.restore();
      draw(g, (i * 3 + Math.floor(tSec * 0.2)) % TYPES.length, x, y0 - bob, rad, 2 - sq, sq);
    }
  }

  return {
    TYPES: TYPES,
    sprites: sprites,
    draw: draw,
    burst: burst,
    ring: ring,
    step: step,
    render: render,
    clear: clearParts,
    partCount: partCount,
    parade: parade,
    lighten: lighten,
    darken: darken
  };
})();
