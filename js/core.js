// 공통 도구: 소리, 저장, 화면 전환, 라운드 진행
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  A.$ = $;
  A.el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  A.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  A.rand = (n) => Math.floor(Math.random() * n);
  A.img = (w, cls = '') => `<img class="pic ${cls}" src="images/${w.id}.webp" alt="${w.en}" draggable="false">`;

  /* ---------- 저장 (별) ---------- */
  const KEY = A.storageKey('stars');
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { saved = {}; }
  A.getStars = (k) => saved[k] || 0;
  A.saveStars = (k, n) => {
    if (n <= (saved[k] || 0)) return;
    saved = { ...saved, [k]: n };
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* 저장 불가 기기는 무시 */ }
  };
  A.resetStars = () => {
    saved = {};
    try { localStorage.removeItem(KEY); } catch (e) { /* 저장 불가 기기는 무시 */ }
  };
  A.sumStars = (prefix) => Object.keys(saved).filter(k => k.startsWith(prefix)).reduce((s, k) => s + saved[k], 0);

  /* ---------- 소리: 기기 내장 음성(speechSynthesis) ---------- */
  let voice = null;
  const pickVoice = () => {
    if (!('speechSynthesis' in window)) return;
    // 폰 안에 내려받아 둔 음성만 쓴다 (이름만 있는 네트워크 음성은 소리가 안 날 수 있다)
    const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang) && v.localService !== false);
    voice = vs.find(v => /en-US/i.test(v.lang) && /(female|samantha|google us|zira|aria|jenny)/i.test(v.name))
      || vs.find(v => /en-US/i.test(v.lang)) || vs[0] || null;
  };
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  // 소리 재생은 이 함수 한 곳만 거친다 (나중에 mp3 파일로 바꾸기 쉽게)
  // text: 문장 하나, 또는 [{text, node}] 목록. 목록은 한 줄씩 차례로 읽으며, 읽는 동안 그 node에 'reading' 효과를 준다.
  // queue=true 이면 하던 말이 끝난 뒤에 이어서 말한다
  const RATE_WORD = 0.75;       // 단어 하나는 조금만 느리게
  const RATE_SENTENCE = 0.65;   // 문장(대사)은 더 천천히
  const NO_START_MS = 1200;     // 읽기 시작 신호가 이만큼 안 오면 글자 수로 어림해서 효과를 준다
  const MS_PER_CHAR = 95;
  const CANCEL_GAP_MS = 60;     // cancel 뒤 잠깐 쉬고 말한다
  const RETRY_MS = 1800;        // 이 시간 안에 안 읽기 시작하면 기본 음성으로 다시
  const rateOf = (text) => (/\s/.test(text.trim()) ? RATE_SENTENCE : RATE_WORD);
  let lit = null;               // 지금 효과를 받는 { node, id }
  let utterId = 0;
  let speakGen = 0;             // '끊고 새로 말하기'를 할 때마다 올라간다 (이미 지나간 말을 다시 읽지 않게 하는 번호)
  let followers = [];           // 마지막 '끊고 새로 말하기' 뒤에 이어 붙인 말들 (다시 읽을 때 함께 읽는다)
  let startAt = 0;              // cancel 뒤 쉬었다가 말을 시작하는 시각 (이어 붙이는 말은 이보다 뒤에 넣는다)
  const light = (node, id) => {
    lit?.node.classList.remove('reading');
    lit = node ? { node, id } : null;
    node?.classList.add('reading');
  };
  const unlight = (id) => { if (lit && lit.id === id) light(null); };
  // 효과음이 나는 동안 시작하는 말은 효과음이 끝날 때까지 기다린다 (소리가 겹쳐 말이 안 들리지 않게)
  let sfxEnd = 0;      // 효과음이 끝나는 시각 (ms)
  let held = null;     // 기다리는 말 [입력, queue] 목록
  const flushHeld = () => {
    if (sfxEnd > Date.now()) { setTimeout(flushHeld, sfxEnd - Date.now()); return; }
    const list = held;
    held = null;
    list.forEach(([input, queue]) => A.speak(input, queue));
  };
  const sayNow = (input, queue = false) => {
    if (!('speechSynthesis' in window) || !input) return;
    const parts = (Array.isArray(input) ? input : [input]).map(p => (typeof p === 'string' ? { text: p } : p)).filter(p => p.text);
    if (!parts.length) return;
    try {
      let started = false;
      const ids = parts.map(() => ++utterId);
      const sayAll = (useVoice) => {
        parts.forEach((part, k) => {
          const u = new SpeechSynthesisUtterance(part.text);
          u.lang = 'en-US';
          u.rate = rateOf(part.text);
          u.pitch = 1.1;
          if (useVoice && voice) u.voice = voice;
          u.onstart = () => { started = true; if (part.node) light(part.node, ids[k]); };
          if (part.node) u.onend = u.onerror = () => unlight(ids[k]);
          speechSynthesis.speak(u);
        });
      };
      const gen = queue ? speakGen : ++speakGen;
      const current = () => gen === speakGen;   // 그 사이 다른 말로 넘어가지 않았는가
      if (queue) {
        followers.push(sayAll);
        // 앞의 말이 아직 시작 전(cancel 뒤 쉬는 중)이면 그 뒤에 붙인다 (순서가 뒤바뀌지 않게)
        const wait = startAt - Date.now();
        if (wait > 0) setTimeout(() => { if (current()) sayAll(true); }, wait + 1); else sayAll(true);
      } else {
        followers = [];
        const busy = speechSynthesis.speaking || speechSynthesis.pending;
        speechSynthesis.cancel(); light(null);
        // 일부 안드로이드 기기는 cancel 바로 뒤의 speak를 무시한다
        if (busy) {
          startAt = Date.now() + CANCEL_GAP_MS;
          setTimeout(() => { if (current()) sayAll(true); }, CANCEL_GAP_MS);
        } else { startAt = 0; sayAll(true); }
      }
      // 지정한 음성이 소리를 못 내는 기기: 음성을 지정하지 않고 폰 기본 음성으로 한 번 더
      if (voice && !queue) {
        setTimeout(() => {
          if (started || !current()) return;   // 이미 다음 말로 넘어갔으면 옛 말을 다시 읽지 않는다
          speechSynthesis.cancel();
          sayAll(false);
          followers.forEach(again => again(false));   // 뒤에 이어 붙였던 말(문제 소리 등)도 함께 다시
        }, RETRY_MS);
      }
      // 기기에 따라 시작 신호가 안 올 때: 글자 수로 어림해서 차례로 효과를 준다
      if (parts.some(p => p.node)) {
        setTimeout(() => {
          if (started || !current()) return;
          let at = 0;
          parts.forEach((part, k) => {
            const ms = part.text.length * MS_PER_CHAR / rateOf(part.text) * 0.8;
            if (part.node) {
              setTimeout(() => light(part.node, ids[k]), at);
              setTimeout(() => unlight(ids[k]), at + ms);
            }
            at += ms;
          });
        }, NO_START_MS);
      }
    } catch (e) { /* 소리 실패해도 놀이는 계속 */ }
  };
  A.speak = (input, queue = false) => {
    if (!('speechSynthesis' in window) || !input) return;
    if (held || sfxEnd > Date.now()) {
      const wasIdle = !held;
      held = held || [];
      held.push([input, queue]);
      if (wasIdle) setTimeout(flushHeld, Math.max(0, sfxEnd - Date.now()));
      return;
    }
    sayNow(input, queue);
  };
  A.say = (w, queue = false) => A.speak(w.say, queue);
  // 화면을 떠날 때: 지금 말과 기다리는 말을 모두 멈춘다 (다시 읽기도 취소)
  A.stopSpeech = () => {
    speakGen++; followers = []; startAt = 0;
    if (held) held.length = 0;
    light(null);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  };
  // 문장 만들기: 단수는 "This is an apple.", 복수(w.plural)는 "These are jeans." 식으로 쓴다
  // 관사가 비어 있는 단어(w.art === '': 색깔, 셀 수 없는 말)는 관사 없이 "This is red." 로 쓴다
  // name 은 화면에 보일 이름(w.en) 또는 읽을 이름(w.say)
  const withArt = (w, name) => (w.art ? `${w.art} ${name}` : name);
  A.isLine = (w, name) => (w.plural ? `These are ${name}.` : `This is ${withArt(w, name)}.`);
  A.askLine = (w, name) => (w.plural ? `Are these ${name}?` : `Is it ${withArt(w, name)}?`);
  A.itLine = (w, name) => (w.plural ? `They are ${name}.` : `It's ${withArt(w, name)}.`);
  A.whatLine = (w) => (w.plural ? 'What are these?' : 'What is this?');

  /* ---------- 효과음: sounds/ 의 mp3를 미리 불러 두고, 못 쓰면 WebAudio 음(tone)으로 대신한다 ---------- */
  const SFX = {
    ok: { file: 'correct', ms: 620 },        // 띠리링 (정답)
    bad: { file: 'try-again', ms: 530 },     // 다시 해봐요 (오답)
    flip: { file: 'tap', ms: 80 },           // 카드 뒤집기
    pop: { file: 'pop', ms: 120 },           // 풍선 터지기
    sparkle: { file: 'sparkle', ms: 900 },   // 스티커 받기
    win: { file: 'win', ms: 1190 },          // 한 판 끝
  };
  const SFX_VOLUME = 0.65;   // 영어 읽는 소리보다 크지 않게
  const SFX_COPIES = 3;      // 같은 소리를 겹쳐 낼 수 있는 개수
  const sfxPool = {};        // 파일 이름 → { items: [Audio], next, broken }
  const loadSfx = (file) => {
    const pool = { items: [], next: 0, broken: false };
    sfxPool[file] = pool;
    try {
      for (let k = 0; k < SFX_COPIES; k++) {
        const a = new Audio(`sounds/${file}.mp3`);
        a.preload = 'auto';
        a.volume = SFX_VOLUME;
        a.onerror = () => { pool.broken = true; };   // 파일이 없으면 tone 으로
        pool.items.push(a);
      }
    } catch (e) { pool.broken = true; }
  };
  Object.values(SFX).forEach(s => loadSfx(s.file));   // 앱을 열 때 미리 불러 둔다

  let audio = null;
  const tone = (freq, start, len, type = 'sine', vol = 0.18) => {
    if (!audio) return;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.value = freq;
    const t0 = audio.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    o.connect(g).connect(audio.destination);
    o.start(t0); o.stop(t0 + len + 0.05);
  };
  const TONES = {
    ok: () => { tone(784, 0, 0.18); tone(988, 0.1, 0.18); tone(1319, 0.2, 0.3); },   // 띠리링
    bad: () => { tone(330, 0, 0.16, 'triangle', 0.2); tone(262, 0.14, 0.26, 'triangle', 0.2); },   // 뿅
    flip: () => tone(660, 0, 0.08, 'triangle', 0.12),
    pop: () => tone(880, 0, 0.06, 'sine', 0.15),
    sparkle: () => { tone(1047, 0, 0.1); tone(1319, 0.08, 0.1); tone(1568, 0.16, 0.2); },
    win: () => { tone(784, 0, 0.16); tone(988, 0.12, 0.16); tone(1319, 0.24, 0.16); tone(1568, 0.36, 0.4); },
  };
  const playTone = (kind) => {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      TONES[kind]?.();
    } catch (e) { /* 소리 못 내는 기기는 그냥 넘어간다 */ }
  };
  // 파일 재생: 자동재생이 막히거나 파일을 못 읽으면 tone 으로 (false 를 돌려주면 호출한 쪽이 tone 을 낸다)
  const playFile = (file, onFail) => {
    const pool = sfxPool[file];
    if (!pool || pool.broken) return false;
    const a = pool.items[pool.next];
    pool.next = (pool.next + 1) % pool.items.length;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(onFail);
    } catch (e) { return false; }
    return true;
  };
  A.sfx = (kind) => {
    const s = SFX[kind];
    if (!s) return;
    sfxEnd = Math.max(sfxEnd, Date.now() + s.ms);   // 이 시간 동안 말을 기다리게 한다
    if (!playFile(s.file, () => playTone(kind))) playTone(kind);
  };

  /* ---------- 영어 칭찬·격려 ---------- */
  const PRAISE = [['Great job!', '잘했어요!'], ['Awesome!', '멋져요!'], ['Well done!', '참 잘했어요!'], ['Yay!', '야호!'], ['Super!', '최고!']];
  const CHEER = [['Try again!', '다시 해봐요!'], ['You can do it!', '할 수 있어요!'], ['Almost!', '거의 다 왔어요!']];
  const pickOf = (list) => list[A.rand(list.length)];
  // 화면 가운데에 영어 말풍선(작은 한글 뜻 포함)을 잠깐 보여 준다
  const popText = (pair, cls) => {
    document.querySelectorAll('.praise').forEach(n => n.remove());
    const b = A.el('div', `praise ${cls}`, `<b>${pair[0]}</b><small>${pair[1]}</small>`);
    document.body.append(b);
    setTimeout(() => b.remove(), 1100);
  };
  A.cheer = (first, speak = true) => {
    const pair = pickOf(PRAISE);
    A.sfx('ok');
    popText(pair, first ? 'good star' : 'good');
    if (speak) A.speak(pair[0]);
  };
  A.oops = (speak = true) => {
    const pair = pickOf(CHEER);
    A.sfx('bad');
    popText(pair, 'try');
    if (speak) A.speak(pair[0]);
  };
  A.target = null;   // 스피커 버튼이 다시 들려줄 소리
  A.targetText = null;

  /* ---------- 가만히 있으면 스피커가 반짝 ---------- */
  let idleTimer = null;
  const IDLE_MS = 6000;
  A.pokeIdle = () => {
    const sp = $('#speaker');
    if (sp) sp.classList.remove('pulse');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const s = $('#speaker');
      if (s && !s.hidden) s.classList.add('pulse');
    }, IDLE_MS);
  };
  document.addEventListener('pointerdown', () => A.pokeIdle(), true);

  /* ---------- 화면 ---------- */
  A.app = $('#app');

  /* ---------- 긴 영어 단어: 칸을 넘치면 그 칸만 글자를 줄인다 (짧은 단어는 그대로) ----------
     CSS 는 nowrap 으로 두 줄 꺾임을 막고, 여기서는 넘치는 칸만 글자 크기를 맞춘다. */
  const FIT_SELECTOR = '.chip span, .word-en, .btn.sentence, .choice .lbl, .scard .lbl, .btn.answer span, .bubble:not(.sm), .mcard .lbl';
  const FIT_MIN_PX = 10;     // 이보다 더 줄이지 않는다 (너무 작은 글자는 아이가 읽을 수 없다. 그래도 안 들어가면 더 짧은 영어 이름으로 바꾼다)
  const FIT_MARGIN = 0.97;   // 딱 맞으면 반올림 때문에 다시 넘칠 수 있어서 3% 여유를 둔다
  const fitOne = (el) => {
    el.style.fontSize = '';  // 먼저 CSS가 정한 기본 크기로 되돌린다
    const cs = getComputedStyle(el);
    // 칩·보기 글자(span)는 글자 길이만큼만 차지하므로, 글자가 들어갈 폭은 바깥 칸(부모) 안쪽으로 잰다
    const box = el.matches('.chip span, .choice .lbl, .scard .lbl, .btn.answer span') ? el.parentElement : el;
    const boxCs = getComputedStyle(box);
    const inner = box.clientWidth - parseFloat(boxCs.paddingLeft) - parseFloat(boxCs.paddingRight);
    const range = document.createRange();
    range.selectNodeContents(el);
    const textW = range.getBoundingClientRect().width;
    if (!(inner > 0) || textW <= inner) return;
    el.style.fontSize = Math.max(FIT_MIN_PX, parseFloat(cs.fontSize) * inner / textW * FIT_MARGIN) + 'px';
  };
  const fitTree = (root) => {
    if (root.nodeType !== 1) return;
    if (root.matches(FIT_SELECTOR)) fitOne(root);
    root.querySelectorAll(FIT_SELECTOR).forEach(fitOne);
  };
  A.fitAll = () => fitTree(A.app);
  new MutationObserver(recs => recs.forEach(r => r.addedNodes.forEach(fitTree)))
    .observe(A.app, { childList: true, subtree: true });
  window.addEventListener('resize', A.fitAll);
  if (document.fonts) document.fonts.addEventListener('loadingdone', A.fitAll);   // 글꼴이 늦게 와도 다시 맞춘다

  A.show = (node) => {
    A.app.replaceChildren(node);
    A.pokeIdle();
    window.scrollTo(0, 0);
  };
  // 위쪽 바: 뒤로가기, 제목, 스피커
  A.topbar = (title, onBack, withSpeaker) => {
    const bar = A.el('div', 'topbar');
    const back = A.el('button', 'btn round', onBack ? '⬅' : '🏠');
    back.setAttribute('aria-label', '뒤로');
    back.onclick = () => { A.stopSpeech(); (onBack || A.home)(); };
    const t = A.el('div', 'title', title);
    bar.append(back, t);
    if (withSpeaker) {
      const sp = A.el('button', 'btn round speaker', '🔊');
      sp.id = 'speaker';
      sp.setAttribute('aria-label', '소리 듣기');
      sp.onclick = () => {
        if (A.target) A.say(A.target); else if (A.targetText) A.speak(A.targetText);
      };
      bar.append(sp);
    } else {
      bar.append(A.el('div', 'spacer'));
    }
    return bar;
  };

  /* ---------- 칭찬 이펙트 ---------- */
  // 색종이: canvas-confetti (libs/confetti.js, ISC). 파일이 없거나 '동작 줄이기' 설정이면 이모지만 나온다.
  // 색종이 캔버스는 말풍선·이모지(z-index 98~99)보다 아래(97)에 깔리고, 터치는 통과한다(pointer-events: none).
  const CONFETTI_Z = 97;
  const CONFETTI_COLORS = ['#FFD93D', '#FF6B6B', '#6BCB77', '#4D96FF', '#C77DFF'];
  const CONFETTI_Y = 0.4;          // 화면 가운데 약간 위에서 터뜨린다
  const CONFETTI_FIRST = 70;       // 첫 시도 정답: 한 번에 70개 이하
  const CONFETTI_AGAIN = 25;       // 두 번째 이후 정답
  const END_TICKS = 72;            // 입자가 약 1.2초(60fps 기준) 안에 사라진다
  const pour = (opts) => {
    if (typeof confetti !== 'function') return;   // 라이브러리가 없으면 이모지만
    try {
      confetti({ zIndex: CONFETTI_Z, colors: CONFETTI_COLORS, disableForReducedMotion: true, ...opts });
    } catch (e) { /* 색종이가 실패해도 놀이는 계속 */ }
  };
  A.burst = (first) => {
    const b = A.el('div', 'burst', first ? '⭐' : '👍');
    document.body.append(b);
    setTimeout(() => b.remove(), 650);
    pour({ particleCount: first ? CONFETTI_FIRST : CONFETTI_AGAIN, spread: first ? 75 : 60, origin: { x: 0.5, y: CONFETTI_Y } });
  };
  // 한 판을 끝냈을 때: 별 모양을 가운데서 크게, 양쪽 아래에서 작게 (합쳐서 50개)
  // withSticker: 스티커를 받았으면 소리는 sparkle 하나로 바꾸고, 작은 색종이(20개)를 함께 터뜨린다 (합쳐서 70개)
  A.celebrateEnd = (withSticker) => {
    A.sfx(withSticker ? 'sparkle' : 'win');
    pour({ shapes: ['star'], particleCount: 30, scalar: 1.4, spread: 120, ticks: END_TICKS, origin: { x: 0.5, y: 0.45 } });
    pour({ particleCount: 10, angle: 60, spread: 55, ticks: END_TICKS, origin: { x: 0, y: 0.8 } });
    pour({ particleCount: 10, angle: 120, spread: 55, ticks: END_TICKS, origin: { x: 1, y: 0.8 } });
    if (withSticker) pour({ shapes: ['star', 'circle'], particleCount: 20, scalar: 0.9, spread: 70, ticks: END_TICKS, origin: { x: 0.5, y: 0.6 } });
  };
  const PRAISE_GAP_MS = 700;   // 칭찬 말이 끝나고 다음 단어 소리가 이어서 나온다
  A.shake = (node) => {
    node.classList.remove('shake');
    void node.offsetWidth;
    node.classList.add('shake');
  };

  // 소리가 완전히 멈출 때까지 기다렸다가 fn 실행 (소리가 멈춘 채로 두 번 연속 확인되면 통과, 너무 오래 걸리면 포기)
  const SPEECH_POLL_MS = 200, SPEECH_IDLE_POLLS = 2, SPEECH_WAIT_MAX_MS = 9000;
  const whenSpeechDone = (fn) => {
    if (!('speechSynthesis' in window)) { fn(); return; }
    const t0 = Date.now();
    let idle = 0;
    const tick = () => {
      idle = (speechSynthesis.speaking || speechSynthesis.pending) ? 0 : idle + 1;
      if (idle >= SPEECH_IDLE_POLLS || Date.now() - t0 > SPEECH_WAIT_MAX_MS) { fn(); return; }
      setTimeout(tick, SPEECH_POLL_MS);
    };
    tick();
  };

  /* ---------- 문제 돌리기 ----------
     renderQ(word, api): 문제 화면을 stage에 그린다.
     api.ok(): 정답 → 바로 다음 문제.  api.bad(): 오답 → 소리 다시, 벌점 없음. */
  A.rounds = (ctx, renderQ, textFn) => {
    const order = A.shuffle(ctx.words);
    let i = 0, stars = 0;
    let afterPraise = false;
    const next = () => {
      if (!ctx.stage.isConnected) return;   // 놀이 화면을 떠났으면 남은 타이머는 아무것도 하지 않는다
      if (i >= order.length) {
        ctx.progress(order.length, order.length);   // 마지막 문제를 맞힌 뒤 진행바를 끝까지 채운다
        return ctx.finish(stars, order.length);
      }
      const queue = afterPraise;
      afterPraise = false;
      const w = order[i];
      A.target = textFn ? null : w;
      A.targetText = textFn ? textFn(w) : null;
      ctx.progress(i, order.length);
      ctx.stage.replaceChildren();
      let tried = false, locked = false;
      const api = {
        // waitSpeech: 말이 다 끝난 뒤에 다음 문제로 (묻고 답하기처럼 말이 긴 게임용)
        ok(delay = 550, waitSpeech = false) {
          if (locked) return;
          locked = true;
          if (!tried) stars++;
          A.burst(!tried);
          A.cheer(!tried, !waitSpeech);   // 말을 기다리는 놀이(묻고 답하기)는 칭찬 소리로 보기 소리를 끊지 않는다
          afterPraise = true;
          i++;
          setTimeout(() => (waitSpeech ? whenSpeechDone(next) : next()), Math.max(delay, PRAISE_GAP_MS));
        },
        // quiet: 격려 목소리를 빼고 효과음·말풍선만 낸다 (묻고 답하기: 방금 누른 보기 문장을 끊지 않게)
        // readFirst: 효과음 뒤에 먼저 읽을 문장 (그 뒤에 문제 문장을 이어서 읽는다)
        bad(node, quiet = false, readFirst = null) {
          if (locked) return;   // 정답을 맞힌 뒤 잠깐(0.55초)은 "다시 해봐요"를 내지 않는다
          tried = true;
          if (node) A.shake(node);
          A.oops(!quiet);
          if (readFirst) A.speak(readFirst);
          // 다시 들려줄 때는 질문(첫 줄)만 읽는다. 보기까지 다 읽으면 너무 길다 (스피커 버튼·말풍선은 전부 읽는다)
          const again = textFn ? textFn(w) : null;
          if (textFn) A.speak(Array.isArray(again) ? again.slice(0, 1) : again, true); else A.say(w, true);
        },
      };
      renderQ(w, api);
      if (textFn) A.targetText = textFn(w);   // 보기까지 정해진 뒤의 문장으로 다시 읽어 준다
      if (textFn) A.speak(textFn(w), queue); else A.say(w, queue);   // 문제가 나오면 소리가 바로 나온다
    };
    next();
  };

  // 정답 + 오답 후보 만들기 (같은 주제 안에서 뽑는다)
  A.choices = (w, ctx, n) => {
    let others = ctx.pool.filter(x => x.id !== w.id);
    if (others.length < n - 1) others = others.concat(A.allWords().filter(x => x.id !== w.id && !others.includes(x)));
    return A.shuffle([w, ...A.shuffle(others).slice(0, n - 1)]);
  };
  A.allWords = () => A.THEMES.flatMap(t => t.words);
  A.games = {};
})();
