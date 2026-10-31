/* ============================================================
   i18n.js — 日本語 / English / 简体中文
   ============================================================ */
window.I18N = (function () {
  'use strict';

  var DICT = {
    ja: {
      'app.tagline': 'つなげて消す、もふもふマッチパズル。',
      'app.credit': 'MOFU TSUM POP — original fan-style puzzle (not affiliated with Disney)',

      'btn.play': 'ゲームスタート',
      'btn.levels': 'ステージ',
      'btn.howto': 'あそびかた',
      'btn.settings': 'せってい',
      'btn.start': 'スタート',
      'btn.resume': 'もどる',
      'btn.restart': 'もういちど',
      'btn.quit': 'やめて HOME へ',
      'btn.retry': 'がんばりなおし',
      'btn.next': 'つぎのステージ',
      'btn.home': 'HOME',
      'btn.close': 'とじる',
      'btn.resetdata': 'データをけす',
      'btn.continue': 'つづける',
      'btn.giveup': 'ここでけい算',

      'stat.best': 'ハイスコア',
      'stat.coins': 'コイン',
      'stat.chain': '最大ツム',
      'stat.stage': '到達ステージ',

      'levels.title': 'ステージえらび',
      'levels.note': '★★★ を集めて全ステージクリア！\nコインは「つづける」でつかえます。',
      'levels.locked': '前のステージをクリアすると解放',

      'game.level': 'STAGE',
      'game.target': 'めざせスコア',
      'game.combo': 'COMBO',
      'game.chain': 'ツム',
      'game.fever': 'ムード',
      'game.skill': 'スペシャル',

      'skill.name': 'レインボー消し',
      'skill.ready': 'スペシャル つかえる！',

      'mission.score': 'スコア {n} めざして！',
      'mission.chain': 'いっぺんに {n}ツム 以上つなげよう（{d}/{n}）',
      'mission.combo': '{n}コンボ 以上つくろう（{d}/{n}）',
      'mission.fever': 'ムードを {n}回 起こそう（{d}/{n}）',
      'mission.done': 'ミッション達成！ スコアを伸ばそう',

      'goal.chain': 'いちばん長い連鎖',
      'goal.combo': '最大コンボ',
      'goal.fever': 'ムード発生',

      'pause.title': '一時停止',
      'settings.title': 'せってい',
      'settings.sound': '効果音 (SE)',
      'settings.sound.note': 'ツムが消える音・ボーナス音',
      'settings.bgm': '音楽 (BGM)',
      'settings.bgm.note': 'ゲーム中のミュージック',
      'settings.lang': '言語 / Language',
      'settings.vol': '音量',
      'settings.data': 'セーブデータ',
      'settings.data.note': 'この端末（ブラウザ）に自動保存',
      'confirm.reset': '保存済みのスコア・コイン・ステージをすべて消します。よろしいですか？',
      'reset.done': 'データをけしました',

      'help.title': 'あそびかた',
      'help.1.t': 'つなげて消す',
      'help.1.d': 'おなじ色のツムを 2コ以上 なぞって（またはタップして）消します。ながくなるほど大ポイント！',
      'help.2.t': '時間であそぶ',
      'help.2.d': '制限時間内に めざせスコア を稼ごう。ツムを消すと時間が伸びる。',
      'help.3.t': 'ムード',
      'help.3.d': 'ながくつなげると「ムード」発生。短いあいだ ほとんど同じ色になるので、大きく消せる。',
      'help.4.t': 'スペシャル',
      'help.4.d': 'ツムを消してスペシャルゲージをためると、もっとも多い色をまとめて消せます。',
      'help.5.t': 'コイン',
      'help.5.d': 'スコアでコインを獲得。時間切れのときコインで「つづける」ができます。',

      'msg.shuffle': 'ツムが つながらない！ シャッフル！',
      'msg.fever': 'ムード発生！ ×2',
      'msg.fever.end': 'ムード おわり',
      'msg.skill': 'レインボー消し！',
      'msg.nochain': 'つながらなかった',
      'msg.timeup': 'タイムアップ！',
      'msg.paused': '一時停止',
      'msg.combo': '{n} コンボ！',
      'msg.mission': 'ミッション 達成！',

      'cd.go': 'GO!',
      'tutorial.first': 'なぞっても、タップでもOK！',

      'result.clear': 'ステージクリア！',
      'result.fail': 'ざんねん…',
      'result.score': 'スコア',
      'result.best': 'ハイスコア',
      'result.coins': 'コインGET',
      'result.maxchain': '最大ツム数',
      'result.maxcombo': '最大コンボ',
      'result.newrecord': '新記録！',
      'result.target': 'めざせスコア {n}',
      'result.continue': 'コイン {c} で あと15秒 つづける？',
      'result.continue.free': 'このまま つづける',
      'result.locked': 'つぎのステージは ロック中',
      'result.unlock': '新ステージ解放！',
      'result.starsup': '星が増えた！',
      'result.needtarget': 'スコア {n} が みつかず…',
      'result.needmission': 'ミッションが 未達成',
      'toast.saved': 'セーブしたよ',
      'lang.name': '日本語'
    },

    en: {
      'app.tagline': 'Fluffy match-puzzle: swipe, pop, chain!',
      'app.credit': 'MOFU TSUM POP — original fan-style puzzle (not affiliated with Disney)',

      'btn.play': 'PLAY',
      'btn.levels': 'STAGES',
      'btn.howto': 'HOW TO PLAY',
      'btn.settings': 'SETTINGS',
      'btn.start': 'START',
      'btn.resume': 'Resume',
      'btn.restart': 'Restart',
      'btn.quit': 'Quit to HOME',
      'btn.retry': 'Try again',
      'btn.next': 'Next stage',
      'btn.home': 'HOME',
      'btn.close': 'Close',
      'btn.resetdata': 'Erase save data',
      'btn.continue': 'Continue',
      'btn.giveup': 'Cash out',

      'stat.best': 'Best score',
      'stat.coins': 'Coins',
      'stat.chain': 'Best chain',
      'stat.stage': 'Stage reached',

      'levels.title': 'Select a stage',
      'levels.note': 'Collect ★★★ to clear every stage.\nCoins can be spent to continue.',
      'levels.locked': 'Clear the previous stage to unlock',

      'game.level': 'STAGE',
      'game.target': 'TARGET',
      'game.combo': 'COMBO',
      'game.chain': 'TSUM',
      'game.fever': 'MOOD',
      'game.skill': 'SPECIAL',

      'skill.name': 'Rainbow pop',
      'skill.ready': 'Special ready!',

      'mission.score': 'Reach score {n}!',
      'mission.chain': 'Chain {n}+ in one stroke ({d}/{n})',
      'mission.combo': 'Reach {n} combo ({d}/{n})',
      'mission.fever': 'Trigger Mood {n}×  ({d}/{n})',
      'mission.done': 'Mission done — keep scoring!',

      'goal.chain': 'Longest chain',
      'goal.combo': 'Max combo',
      'goal.fever': 'Mood triggered',

      'pause.title': 'Paused',
      'settings.title': 'Settings',
      'settings.sound': 'Sound effects (SE)',
      'settings.sound.note': 'Pop, chain and bonus sounds',
      'settings.bgm': 'Music (BGM)',
      'settings.bgm.note': 'Music during the game',
      'settings.lang': '言語 / Language',
      'settings.vol': 'Volume',
      'settings.data': 'Save data',
      'settings.data.note': 'Stored automatically in this browser',
      'confirm.reset': 'This deletes all saved scores, coins and stages. Continue?',
      'reset.done': 'Save data erased',

      'help.title': 'How to play',
      'help.1.t': 'Swipe to pop',
      'help.1.d': 'Drag (or tap) across 2+ same-colour Tsums. Longer chains score much more.',
      'help.2.t': 'Beat the clock',
      'help.2.d': 'Reach the target score before time runs out. Popping Tsums adds time.',
      'help.3.t': 'Mood mode',
      'help.3.d': 'Big chains and combos trigger Mood: the board turns mostly one colour for a few seconds.',
      'help.4.t': 'Special',
      'help.4.d': 'Popping Tsums charges the Special gauge. It clears the most common colour at once.',
      'help.5.t': 'Coins',
      'help.5.d': 'Score earns coins. Spend coins to continue when time runs out.',

      'msg.shuffle': 'No moves — shuffling!',
      'msg.fever': 'MOOD ON! ×2',
      'msg.fever.end': 'Mood over',
      'msg.skill': 'Rainbow pop!',
      'msg.nochain': 'No link there',
      'msg.timeup': 'Time up!',
      'msg.paused': 'PAUSED',
      'msg.combo': '{n} COMBO!',
      'msg.mission': 'Mission complete!',

      'cd.go': 'GO!',
      'tutorial.first': 'Drag or tap — both work!',

      'result.clear': 'Stage clear!',
      'result.fail': 'So close…',
      'result.score': 'Score',
      'result.best': 'Best score',
      'result.coins': 'Coins earned',
      'result.maxchain': 'Biggest chain',
      'result.maxcombo': 'Max combo',
      'result.newrecord': 'NEW RECORD!',
      'result.target': 'Target score {n}',
      'result.continue': 'Spend {c} coins for +15 seconds?',
      'result.continue.free': 'Continue with the time you have left',
      'result.locked': 'Next stage is locked',
      'result.unlock': 'New stage unlocked!',
      'result.starsup': 'Stars up!',
      'result.needtarget': 'Target score {n} not reached…',
      'result.needmission': 'Mission not completed',
      'toast.saved': 'Saved',
      'lang.name': 'English'
    },

    zh: {
      'app.tagline': '连线消除的毛绒绒益智游戏。',
      'app.credit': 'MOFU TSUM POP — 原创同人风益智游戏（与 Disney 无关联）',

      'btn.play': '开始游戏',
      'btn.levels': '关卡',
      'btn.howto': '玩法',
      'btn.settings': '设置',
      'btn.start': '开始',
      'btn.resume': '继续',
      'btn.restart': '重玩',
      'btn.quit': '退出到 HOME',
      'btn.retry': '再来一次',
      'btn.next': '下一关',
      'btn.home': 'HOME',
      'btn.close': '关闭',
      'btn.resetdata': '清除存档',
      'btn.continue': '继续',
      'btn.giveup': '结束结算',

      'stat.best': '最高分',
      'stat.coins': '金币',
      'stat.chain': '最大连消',
      'stat.stage': '已到关卡',

      'levels.title': '选择关卡',
      'levels.note': '收集 ★★★ 通关全部关卡！\n金币可用来「继续」。',
      'levels.locked': '通关上一关即可解锁',

      'game.level': '关卡',
      'game.target': '目标分数',
      'game.combo': '连击',
      'game.chain': '连消',
      'game.fever': '狂热',
      'game.skill': '必杀',

      'skill.name': '彩虹消除',
      'skill.ready': '必杀准备就绪！',

      'mission.score': '目标分数 {n}！',
      'mission.chain': '一次连消 {n} 个以上（{d}/{n}）',
      'mission.combo': '达成 {n} 连击（{d}/{n}）',
      'mission.fever': '触发狂热 {n} 次（{d}/{n}）',
      'mission.done': '任务达成！继续刷分',

      'goal.chain': '最长连消',
      'goal.combo': '最大连击',
      'goal.fever': '狂热次数',

      'pause.title': '暂停',
      'settings.title': '设置',
      'settings.sound': '音效 (SE)',
      'settings.sound.note': '消除音与奖励音',
      'settings.bgm': '音乐 (BGM)',
      'settings.bgm.note': '游戏中的背景音乐',
      'settings.lang': '语言 / Language',
      'settings.vol': '音量',
      'settings.data': '存档',
      'settings.data.note': '自动保存在本浏览器',
      'confirm.reset': '将删除所有分数、金币与关卡进度。确定吗？',
      'reset.done': '存档已清除',

      'help.title': '玩法说明',
      'help.1.t': '连线消除',
      'help.1.d': '划过或点按 2 个以上同色ツム即可消除，连得越长分数越高。',
      'help.2.t': '与时间赛跑',
      'help.2.d': '在时间结束前达到目标分数，消除会补充时间。',
      'help.3.t': '狂热模式',
      'help.3.d': '长连消或高连击会触发狂热，短时间内棋盘变成同色，便于大量消除。',
      'help.4.t': '必杀技',
      'help.4.d': '消除ツム可累积必杀槽，发动时一次性消除最多的颜色。',
      'help.5.t': '金币',
      'help.5.d': '分数会换成金币。时间耗尽时可用金币「继续」。',

      'msg.shuffle': '没有可连的ツム，重新排列！',
      'msg.fever': '狂热开始！×2',
      'msg.fever.end': '狂热结束',
      'msg.skill': '彩虹消除！',
      'msg.nochain': '这里连不起来',
      'msg.timeup': '时间到！',
      'msg.paused': '已暂停',
      'msg.combo': '{n} 连击！',
      'msg.mission': '任务达成！',

      'cd.go': 'GO!',
      'tutorial.first': '划过或点按都可以！',

      'result.clear': '过关！',
      'result.fail': '差一点…',
      'result.score': '分数',
      'result.best': '最高分',
      'result.coins': '获得金币',
      'result.maxchain': '最大连消',
      'result.maxcombo': '最大连击',
      'result.newrecord': '新纪录！',
      'result.target': '目标分数 {n}',
      'result.continue': '用 {c} 金币继续 +15 秒？',
      'result.continue.free': '用剩余时间继续',
      'result.locked': '下一关尚未解锁',
      'result.unlock': '解锁新关卡！',
      'result.starsup': '星级提升！',
      'result.needtarget': '未达到目标分数 {n}…',
      'result.needmission': '任务未完成',
      'toast.saved': '已保存',
      'lang.name': '简体中文'
    }
  };

  var LANGS = [
    { code: 'ja', label: '日本語' },
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' }
  ];

  var current = 'ja';
  var listeners = [];

  function detect() {
    var n = (navigator.language || 'ja').toLowerCase();
    if (n.indexOf('zh') === 0) return 'zh';
    if (n.indexOf('en') === 0) return 'en';
    return 'ja';
  }

  function t(key, params) {
    var src = DICT[current] || DICT.ja;
    var s = src[key];
    if (s === undefined) s = DICT.ja[key];
    if (s === undefined) return key;
    if (params) {
      for (var k in params) {
        if (Object.prototype.hasOwnProperty.call(params, k)) {
          s = s.split('{' + k + '}').join(String(params[k]));
        }
      }
    }
    return s;
  }

  function setLang(code, silent) {
    if (!DICT[code]) code = 'ja';
    current = code;
    document.documentElement.lang = code === 'zh' ? 'zh-Hans' : code;
    document.body.setAttribute('data-lang', code);
    if (!silent) {
      for (var i = 0; i < listeners.length; i++) listeners[i](code);
    }
  }

  function apply(root) {
    root = root || document;
    var els = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = t(els[i].getAttribute('data-i18n'));
    }
    var ph = root.querySelectorAll('[data-i18n-ph]');
    for (var j = 0; j < ph.length; j++) {
      ph[j].setAttribute('placeholder', t(ph[j].getAttribute('data-i18n-ph')));
    }
    document.title = 'MOFU TSUM POP｜' + t('btn.play') + ' - ' + t('app.tagline');
  }

  function onChange(fn) { listeners.push(fn); }

  return {
    langs: LANGS,
    detect: detect,
    t: t,
    setLang: setLang,
    getLang: function () { return current; },
    apply: apply,
    onChange: onChange
  };
})();
