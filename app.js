(function () {
  'use strict';
  var C = window.CONTENT, P = C.points, CFG = C.config, N = P.length, FIN = N - 1;
  var HOSP = P.findIndex(function (p) { return p.now; });
  var tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
  var app = document.getElementById('app');
  var KEY = 'basmanny-route1-v1';

  // ---------- состояние (только в памяти телефона) ----------
  var S = load() || { screen: 'cover', i: 0, done: [], started: false };
  var history = [];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function reset() { S = { screen: 'cover', i: 0, done: [], started: false }; save(); }

  // ---------- анонимный счётчик: только «старт» и «финиш» ----------
  function count(ev) {
    if (!CFG.counter) return;
    try { new Image().src = CFG.counter + '?p=/' + ev + '&rnd=' + Math.random().toString(36).slice(2); } catch (e) {}
  }

  // ---------- утилиты ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lines(arr) { return arr.map(esc).join('<br>'); }
  function seededOrder(n, seed) {
    var a = []; for (var k = 0; k < n; k++) a.push(k);
    var x = seed * 9301 + 49297;
    for (var j = n - 1; j > 0; j--) { x = (x * 9301 + 49297) % 233280; var r = Math.floor(x / 233280 * (j + 1)); var t = a[j]; a[j] = a[r]; a[r] = t; }
    return a;
  }
  function fig(img, cls, stamp) {
    if (!img) return '';
    return '<figure class="' + (cls || '') + '"><img src="' + esc(img.src) + '" alt="' + esc(img.cap) + '" onerror="window.imgFail(this)">' +
      (stamp ? '<div class="stamp">' + esc(stamp) + '</div>' : '') + '<figcaption>' + esc(img.cap) + '</figcaption></figure>';
  }
  function pair(a, b, la, lb, stamp) {
    return '<div class="toggle" role="group" aria-label="' + esc(la) + ' или ' + esc(lb) + '"><button aria-pressed="true" data-pair="before">' + esc(la) + '</button><button aria-pressed="false" data-pair="now">' + esc(lb) + '</button></div>' +
      '<div id="pair-before">' + fig(a, '', stamp) + '</div><div id="pair-now" class="hidden">' + fig(b, '', stamp) + '</div>';
  }
  function bar(i) {
    var h = '<div class="bar" style="grid-template-columns:repeat(' + N + ',minmax(0,1fr))" aria-label="Пройдено точек: ' + S.done.length + ' из ' + N + '">';
    for (var k = 0; k < N; k++) h += '<i class="' + (S.done.indexOf(k) > -1 || k < i ? 'on' : '') + '"></i>';
    return h + '</div>';
  }
  function header(i) {
    return '<div class="top"><div class="toprow"><span class="count">Точка ' + (i + 1) + ' из ' + N + '</span>' +
      '<button class="linkbtn" data-go="map">Карта маршрута</button></div>' + bar(i) + '</div>';
  }
  function openLink(url) { if (!url) return; if (tg && tg.openLink) tg.openLink(url); else window.open(url, '_blank', 'noopener'); }
  function openTg(url) { if (tg && tg.openTelegramLink && /^https:\/\/t\.me\//.test(url)) tg.openTelegramLink(url); else openLink(url); }
  function shareGame() {
    var text = 'Прогулка-игра по Новой Басманной: 12 точек, три века истории.';
    openTg('https://t.me/share/url?url=' + encodeURIComponent(CFG.gameLink) + '&text=' + encodeURIComponent(text));
  }
  function mapUrl(q) { return 'https://yandex.ru/maps/?text=' + encodeURIComponent(q); }
  function statusOf(n) { var st = P[n].stamp; return st === 'УТРАЧЕНО' ? 'lost' : st === 'ПОД УГРОЗОЙ' ? 'threat' : st === 'БУДУЩЕЕ ОТКРЫТО' ? 'future' : 'saved'; }

  // если фото ещё не добавлено — прячем рамку; у пары «было — стало» оставляем ту, что есть
  window.imgFail = function (img) {
    var f = img.closest('figure'); if (f) f.classList.add('hidden');
    var box = img.closest('#pair-before,#pair-now'); if (!box) return;
    var other = document.getElementById(box.id === 'pair-before' ? 'pair-now' : 'pair-before');
    var tg2 = app.querySelector('.toggle'); if (tg2) tg2.remove();
    box.classList.add('hidden'); if (other) other.classList.remove('hidden');
  };

  // ---------- навигация ----------
  function go(screen, i, push) {
    if (push !== false) history.push({ screen: S.screen, i: S.i });
    S.screen = screen; if (typeof i === 'number') S.i = i; save(); render(); window.scrollTo(0, 0);
  }
  function back() { var h = history.pop(); if (!h) return; S.screen = h.screen; S.i = h.i; save(); render(); window.scrollTo(0, 0); }

  // ---------- экраны ----------
  var screens = {
    cover: function () {
      var resume = S.started && S.screen === 'cover' && S.i > 0;
      return '<section class="screen">' +
        '<div class="toprow"><img class="logo" src="images/logo.jpg" alt="вМЕСТЕ — спасём Басманный"><span class="note">Прогулка-игра<br>по Басманному</span></div>' +
        fig({ src: 'images/cover.jpg', cap: 'Вид Новой Басманной от Разгуляя, 1888' }) +
        '<h1 class="cover-title">История<br>Басманного района</h1>' +
        '<div style="border-top:3px solid var(--green);padding-top:12px;display:flex;flex-direction:column;gap:6px">' +
        '<span class="kicker">Маршрут</span><h2 style="font-size:22px">' + lines(C.route.lines) + '</h2>' +
        '<span class="meta">' + esc(C.route.meta) + '</span><span class="note"><i>' + esc(C.route.season) + '</i></span></div>' +
        '<div class="actions">' +
        (resume ? '<button class="btn" data-act="resume">Продолжить с точки ' + (S.i + 1) + '</button><button class="btn ghost" data-act="restart">Начать заново</button>'
                : '<button class="btn" data-go="howto">Начать прогулку</button>') +
        '<p class="note" style="text-align:center">Мы ничего о вас не храним — только считаем, сколько раз игру прошли.</p></div></section>';
    },
    howto: function () {
      return '<section class="screen"><h2>Как играть</h2>' +
        '<ol class="steps"><li>Идите от точки к точке — карта и подсказки в приложении.</li>' +
        '<li>На месте ответьте на загадку: присмотритесь к дому.</li>' +
        '<li>Потом угадайте ответ на квиз — и откройте историю дома.</li></ol>' +
        '<span class="kicker">По дороге</span>' +
        '<ul class="steps"><li>Листовки оставляем только у партнёров и на досках объявлений.</li><li>Во дворы и за ограды не заходим.</li><li>Вечером идём по освещённым улицам.</li></ul>' +
        '<p class="note">Мы не храним ни имени, ни ответов, ни маршрута. Где вы остановились, помнит только ваш телефон. Считаем лишь, сколько раз игру начали и закончили.</p>' +
        '<div class="actions"><button class="btn" data-act="start">Понятно, к маршруту</button></div></section>';
    },
    map: function () {
      var h = '<section class="screen"><div class="toprow"><h2>' + lines(C.route.lines) + '</h2></div>' +
        '<p class="meta">' + esc(C.route.meta) + '</p><ol class="route">';
      P.forEach(function (p, k) {
        var done = S.done.indexOf(k) > -1, st = statusOf(k);
        h += '<li><span class="dot ' + (done ? (st === 'saved' ? 'done' : st) : '') + (k === S.i && S.started ? ' here' : '') + '">' + (k + 1) + '</span>' +
          '<div><b>' + esc(p.title) + '</b><span>' + esc(p.addr) + '</span></div></li>';
      });
      h += '</ol><div class="actions"><a class="btn ghost" href="' + mapUrl('Москва, Новая Басманная улица') + '" data-ext>Открыть в Яндекс Картах</a>' +
        '<button class="btn" data-act="tostart">' + (S.done.length || S.i > 0 ? 'Вернуться к точке ' + (S.i + 1) : 'Я на старте') + '</button></div></section>';
      return h;
    },
    approach: function () {
      var p = P[S.i];
      return '<section class="screen">' + header(S.i) +
        '<h2>' + lines(p.lines) + '</h2><p class="meta">' + esc(p.addr) + '</p><p class="note">' + esc(p.hint) + '</p>' +
        fig(p.img.now) +
        '<div class="actions"><button class="btn" data-act="arrived">Я на месте</button>' +
        '<a class="btn ghost" href="' + mapUrl(p.map) + '" data-ext>Как дойти</a>' +
        (S.i < FIN ? '<button class="linkbtn" data-act="skip">Пропустить точку</button>' : '') + '</div></section>';
    },
    riddle: function () {
      var p = P[S.i], r = p.riddle;
      return '<section class="screen">' + header(S.i) + '<span class="kicker">Загадка на месте</span>' +
        '<p style="font-size:18px">' + r.q + '</p>' + optionsHtml(r, 'r') +
        '<div id="hint" class="hidden">' + fig(p.img.detail, 'tall') + '</div>' +
        '<p id="msg" class="after hidden"></p>' +
        '<div class="actions"><button class="btn ghost hidden" id="hintbtn" data-act="hint">Показать подсказку</button>' +
        '<button class="btn hidden" id="next" data-act="toquiz">Дальше: квиз</button></div></section>';
    },
    quiz: function () {
      var p = P[S.i], q = p.quiz, im = p.img.quiz || p.img.detail || p.img.now;
      return '<section class="screen">' + header(S.i) + fig(im) + '<span class="kicker">Квиз-догадка</span>' +
        '<p style="font-size:18px">' + q.q + '</p>' + optionsHtml(q, 'q') +
        '<p id="msg" class="after hidden"></p>' +
        '<div class="actions"><button class="btn hidden" id="next" data-act="tostory">' + (S.i === FIN ? 'К финалу' : 'Узнать историю дома') + '</button></div></section>';
    },
    story: function () {
      var p = P[S.i], hasPair = p.img.before && p.img.now;
      var body = p.story.map(function (t) { return '<p>' + t + '</p>'; }).join('');
      var media = hasPair ? pair(p.img.before, p.img.now, 'Было', 'Стало', p.stamp) : fig(p.img.before || p.img.now, '', p.stamp);
      if (p.img.extra && S.i < FIN) body += fig(p.img.extra);
      var next = S.i === HOSP ? '<button class="btn" data-act="tonow">Что происходит сейчас</button>' : '<button class="btn" data-act="tobridge">Дальше</button>';
      return '<section class="screen">' + header(S.i) + '<h2>' + lines(p.lines) + '</h2>' + media +
        '<div class="story">' + body + '</div><div class="actions">' + next + '</div></section>';
    },
    now: function () {
      var p = P[S.i];
      return '<section class="screen">' + header(S.i) + '<h2>Что происходит<br>сейчас</h2>' + (p.img.nowBefore && p.img.now2 ? pair(p.img.nowBefore, p.img.now2, '1987', 'Сейчас') : fig(p.img.now2)) +
        '<div class="story">' + p.now.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>' +
        '<div class="actions"><button class="btn" data-act="tobridge">Дальше</button></div></section>';
    },
    bridge: function () {
      var p = P[S.i];
      return '<section class="screen">' + header(S.i) + '<div class="bigstamp" aria-label="Печать: ' + esc(p.stamp) + '">' + esc(p.stamp) + '</div>' +
        '<p class="note" style="text-align:center">Печать поставлена на карту маршрута</p>' +
        '<p style="font-size:18px">' + p.bridge + '</p>' +
        '<div class="actions"><button class="btn" data-act="nextpoint">' + (S.i === N - 2 ? 'К финишу' : 'К точке ' + (S.i + 2)) + '</button></div></section>';
    },
    finale: function () {
      var p = P[FIN];
      return '<section class="screen"><span class="count">Финиш</span><div class="bigstamp">' + esc(p.stamp) + '</div>' +
        '<div class="story">' + p.story.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>' +
        fig(p.img.extra) +
        '<div class="actions"><button class="btn" data-act="tocard">Получить открытку</button></div></section>';
    },
    card: function () {
      var seals = '';
      var cnt = { lost: 0, saved: 0, threat: 0, future: 0 };
      for (var k = 0; k < N; k++) { cnt[statusOf(k)]++; seals += '<span class="seal ' + statusOf(k) + '">' + (k + 1) + '</span>'; }
      var p = P[FIN], deeds = p.actions.map(function (a) {
        var link = a.link === 'petition' ? '<button class="linkbtn" data-act="petition">Открыть обращение</button>'
          : a.link === 'share' ? '<button class="linkbtn" data-act="share">Отправить ссылку</button>'
          : a.link === 'channel' ? '<button class="linkbtn" data-act="channel">Открыть канал</button>' : '';
        return '<div class="deed"><b>' + a.title + '</b><p class="note">' + a.text + '</p>' + link + '</div>';
      }).join('');
      return '<section class="screen"><span class="count">Финиш · котокафе «Котиссимо»</span>' +
        '<div class="card"><div><span class="kicker" style="color:var(--paper);opacity:.85">Ваш статус</span><h2>Хранитель<br>Басманного</h2>' +
        '<p style="font-size:14px">прошёл маршрут «' + esc(C.route.title) + '»</p></div>' +
        '<div class="seals" role="img" aria-label="Карта печатей: утрачено ' + cnt.lost + ', сохранено ' + cnt.saved + ', под угрозой ' + cnt.threat + ', будущее открыто">' + seals + '</div>' +
        '<p class="legend">Перечёркнуто — утрачено, залито — сохранено, двойной круг — под угрозой, пунктир — будущее открыто</p>' +
        '<div class="cardfoot">Город — это то, что мы оставляем после себя<span>' + today() + '</span></div></div>' +
        '<div class="row2"><button class="btn dark" data-act="savecard">Сохранить</button><button class="btn ghost" data-act="share">Поделиться</button></div>' +
        '<span class="kicker">Что можно сделать сейчас</span><div class="deeds">' + deeds + '</div>' +
        '<p style="font-family:var(--display);font-weight:700;font-size:20px;line-height:1.2;text-align:center;margin-top:8px">' + p.slogan + '</p>' +
        '<button class="linkbtn" style="align-self:center" data-act="restart">Пройти маршрут заново</button></section>';
    }
  };

  function optionsHtml(o, kind) {
    var order = seededOrder(o.options.length, (S.i + 1) * (kind === 'r' ? 3 : 7));
    return '<div class="opts" role="group">' + order.map(function (k) {
      return '<button class="opt" data-opt="' + k + '" data-kind="' + kind + '">' + o.options[k] + '<span aria-hidden="true"></span></button>';
    }).join('') + '</div>';
  }
  function today() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear(); }

  // ---------- ответы ----------
  var tries = 0;
  function answer(btn) {
    var p = P[S.i], kind = btn.getAttribute('data-kind'), o = kind === 'r' ? p.riddle : p.quiz;
    var k = +btn.getAttribute('data-opt'), all = app.querySelectorAll('.opt'), msg = document.getElementById('msg');
    var check = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12 10 17 19 7"></polyline></svg>';
    if (k === o.answer) {
      all.forEach(function (b) { b.disabled = true; if (+b.getAttribute('data-opt') === k) { b.classList.add('right'); b.querySelector('span').innerHTML = check; } });
      msg.innerHTML = '<b>Верно!</b> ' + (o.after || ''); msg.classList.remove('hidden');
      if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      document.getElementById('next').classList.remove('hidden');
      var hb = document.getElementById('hintbtn'); if (hb) hb.classList.add('hidden');
    } else {
      btn.classList.add('wrong'); btn.disabled = true; tries++;
      if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
      if (kind === 'r') {
        msg.innerHTML = 'Не совсем. Присмотритесь ещё раз — или возьмите подсказку.'; msg.classList.remove('hidden');
        var hb2 = document.getElementById('hintbtn'); if (hb2 && P[S.i].img.detail) hb2.classList.remove('hidden');
      } else {
        // в квизе показываем ответ сразу: это догадка, а не экзамен
        all.forEach(function (b) { b.disabled = true; if (+b.getAttribute('data-opt') === o.answer) { b.classList.add('right'); b.querySelector('span').innerHTML = check; } });
        msg.innerHTML = '<b>Ответ — ' + o.options[o.answer].replace(/<[^>]+>/g, '') + '.</b> ' + (o.after || ''); msg.classList.remove('hidden');
        document.getElementById('next').classList.remove('hidden');
      }
    }
  }

  // ---------- открытка (картинка собирается на телефоне) ----------
  function drawCard() {
    var c = document.createElement('canvas'), W = 1080, H = 1350; c.width = W; c.height = H;
    var x = c.getContext('2d'), green = '#233e2a', paper = '#efe8d6';
    x.fillStyle = paper; x.fillRect(0, 0, W, H);
    x.fillStyle = green; roundRect(x, 60, 60, W - 120, H - 120, 36); x.fill();
    x.fillStyle = paper; x.textBaseline = 'top';
    x.font = '800 30px Montserrat, Arial, sans-serif'; x.fillText('Ваш статус', 130, 140);
    x.font = '700 104px "Old Standard TT", Georgia, serif'; x.fillText('Хранитель', 126, 190); x.fillText('Басманного', 126, 300);
    x.font = '34px "PT Serif", Georgia, serif'; x.fillText('прошёл маршрут', 130, 440); x.fillText('«' + C.route.title + '»', 130, 488);
    var r = 54, gap = (W - 260 - 6 * 2 * r) / 5;
    for (var k = 0; k < N; k++) {
      var col = k % 6, row = Math.floor(k / 6), cx = 130 + r + col * (2 * r + gap), cy = 640 + r + row * (2 * r + 34), st = statusOf(k);
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2);
      if (st === 'saved') { x.fillStyle = paper; x.fill(); } else {
        x.strokeStyle = paper; x.lineWidth = st === 'threat' ? 10 : 4; x.setLineDash(st === 'future' ? [12, 10] : []); x.stroke(); x.setLineDash([]);
      }
      x.fillStyle = st === 'saved' ? green : paper; x.font = '800 36px Montserrat, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(String(k + 1), cx, cy + 2);
      if (st === 'lost') { x.fillRect(cx - 24, cy, 48, 5); }
      x.textAlign = 'left'; x.textBaseline = 'top';
    }
    x.fillStyle = paper; x.fillRect(130, 1010, W - 260, 2);
    x.font = 'italic 40px "Old Standard TT", Georgia, serif'; x.fillText('Город — это то, что мы', 130, 1040); x.fillText('оставляем после себя', 130, 1092);
    x.font = '600 30px Montserrat, Arial, sans-serif'; x.textAlign = 'right'; x.fillText(today(), W - 130, 1160); x.textAlign = 'left';
    x.fillText('вМЕСТЕ · Спасём Басманный', 130, 1160);
    return c;
  }
  function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function saveCard() {
    var ready = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 100px "Old Standard TT"'), document.fonts.load('800 30px Montserrat'), document.fonts.load('34px "PT Serif"')]) : Promise.resolve();
    ready.catch(function () {}).then(function () {
      var c = drawCard();
      c.toBlob(function (blob) {
        var file = blob && window.File ? new File([blob], 'hranitel-basmannogo.png', { type: 'image/png' }) : null;
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'Хранитель Басманного' }).catch(function () { showCard(c); });
        } else showCard(c);
      }, 'image/png');
    });
  }
  function showCard(c) {
    var o = document.createElement('div'); o.className = 'overlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Открытка');
    o.innerHTML = '<img alt="Открытка «Хранитель Басманного»" src="' + c.toDataURL('image/png') + '"><p>Нажмите на открытку и удерживайте, чтобы сохранить её на телефон.</p><button class="btn ghost" style="color:var(--paper);border-color:var(--paper);max-width:320px">Закрыть</button>';
    o.querySelector('button').onclick = function () { o.remove(); };
    document.body.appendChild(o);
  }

  // ---------- действия ----------
  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go],[data-act],[data-opt],[data-pair],a[data-ext]'); if (!t) return;
    if (t.matches('a[data-ext]')) { e.preventDefault(); openLink(t.getAttribute('href')); return; }
    if (t.hasAttribute('data-opt')) { answer(t); return; }
    if (t.hasAttribute('data-pair')) {
      var v = t.getAttribute('data-pair');
      app.querySelectorAll('[data-pair]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
      document.getElementById('pair-before').classList.toggle('hidden', v !== 'before');
      document.getElementById('pair-now').classList.toggle('hidden', v !== 'now');
      return;
    }
    if (t.hasAttribute('data-go')) { go(t.getAttribute('data-go')); return; }
    var a = t.getAttribute('data-act'), p = P[S.i];
    switch (a) {
      case 'start': if (!S.started) { S.started = true; count('start'); } go('map'); break;
      case 'resume': go('approach'); break;
      case 'restart': reset(); history = []; render(); break;
      case 'tostart': go('approach'); break;
      case 'arrived': tries = 0; go(p.riddle ? 'riddle' : 'quiz'); break;
      case 'skip': markDone(); go('approach', S.i + 1); break;
      case 'hint': document.getElementById('hint').classList.remove('hidden'); t.classList.add('hidden'); break;
      case 'toquiz': go('quiz'); break;
      case 'tostory': go(S.i === FIN ? 'finale' : 'story'); break;
      case 'tonow': go('now'); break;
      case 'tobridge': markDone(); go('bridge'); break;
      case 'nextpoint': go('approach', S.i + 1); break;
      case 'tocard': markDone(); if (!S.finished) { S.finished = true; count('finish'); } go('card'); break;
      case 'savecard': saveCard(); break;
      case 'share': shareGame(); break;
      case 'petition': openLink(CFG.petition); break;
      case 'channel': openTg(CFG.channel); break;
    }
  });
  function markDone() { if (S.done.indexOf(S.i) < 0) S.done.push(S.i); save(); }

  function render() {
    var fn = screens[S.screen] || screens.cover;
    app.innerHTML = fn();
    if (tg && tg.BackButton) { if (history.length) tg.BackButton.show(); else tg.BackButton.hide(); }
    var h = app.querySelector('h1,h2'); if (h) { h.setAttribute('tabindex', '-1'); }
  }

  // ---------- старт ----------
  if (tg) {
    try { tg.ready(); tg.expand(); tg.setHeaderColor && tg.setHeaderColor('#efe8d6'); tg.setBackgroundColor && tg.setBackgroundColor('#efe8d6'); tg.BackButton.onClick(back); } catch (e) {}
  }
  // открываем с того места, где остановились; экраны ответов начинаем с подхода к точке
  if (['riddle', 'quiz', 'story', 'now', 'bridge'].indexOf(S.screen) > -1) S.screen = 'approach';
  if (S.started && S.screen !== 'card') S.screen = 'cover';
  render();
  // заранее подгружаем картинки, чтобы на улице всё работало при слабой связи
  window.addEventListener('load', function () {
    P.forEach(function (p) { Object.keys(p.img).forEach(function (k) { var i = new Image(); i.src = p.img[k].src; }); });
  });
})();
