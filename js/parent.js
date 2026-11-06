// 부모님 메뉴: ⚙ 버튼을 1초 꾹 누르면 열린다. 하루 놀이 시간을 재고, 다 되면 잠든 코끼리 잠금 화면이 뜬다.
(function () {
  const { el } = A;
  const { lock: LOCK, playMinutes: PLAY } = A.CONFIG;
  const KEY = A.storageKey('parent');
  const MINUTE = 60000;
  const HOLD_MS = 1000;        // 부모님 버튼을 누르고 있어야 하는 시간
  const HELD_FLAG_MS = 800;    // 꾹 누르기 뒤에 따라오는 click을 무시하는 시간
  const DEFAULT_LIMIT_MIN = PLAY.default;
  const MORE_MINUTES = PLAY.more;
  const WARN_BEFORE_MS = MINUTE;
  const TICK_MS = 1000;
  const MAX_GAP_MS = 5000;     // 기기가 잠들었다 깨어난 틈은 이만큼만 센다
  const SAVE_EVERY_TICKS = 5;
  const TIP_MS = 2000;
  const TOAST_MS = 2500;
  const LOCK_SPEECH = LOCK.speech;
  const UNLOCK_SPEECH = LOCK.unlockSpeech;

  const today = () => new Date().toLocaleDateString('sv');   // 2026-11-03 모양
  const fresh = () => ({ day: today(), usedMs: 0, bonusMs: 0, limitMin: DEFAULT_LIMIT_MIN });

  let state = fresh();
  try { state = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch (e) { state = fresh(); }
  if (state.day !== today()) state = { ...state, day: today(), usedMs: 0, bonusMs: 0 };   // 날짜가 바뀌면 처음부터
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가 기기는 무시 */ }
  };
  const update = (change) => { state = { ...state, ...change }; save(); };

  const limitMs = () => state.limitMin * MINUTE + state.bonusMs;
  const leftMs = () => limitMs() - state.usedMs;
  // 지금부터 minutes분 더 (이미 넘긴 시간은 메워 준다)
  const addTime = (minutes) => update({ bonusMs: state.bonusMs + Math.max(state.usedMs - limitMs(), 0) + minutes * MINUTE });

  /* ---------- 꾹 누르기 ---------- */
  function holdable(node, done) {
    let timer = null;
    node.style.setProperty('--hold-ms', `${HOLD_MS}ms`);
    const start = (e) => {
      e?.preventDefault?.();
      delete node.dataset.held;
      node.classList.add('holding');
      clearTimeout(timer);
      timer = setTimeout(() => {
        node.classList.remove('holding');
        node.dataset.held = '1';   // 바로 뒤따르는 click을 무시하게
        setTimeout(() => delete node.dataset.held, HELD_FLAG_MS);
        done();
      }, HOLD_MS);
    };
    const stop = () => { node.classList.remove('holding'); clearTimeout(timer); };
    node.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => node.addEventListener(ev, stop));
    node.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start(e); });
    node.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') stop(); });
    node.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  const consumeHeld = (node) => { const held = node.dataset.held === '1'; delete node.dataset.held; return held; };

  /* ---------- 알림 ---------- */
  let toastTimer = null;
  function toast(text) {
    document.querySelector('.ptoast')?.remove();
    const t = el('div', 'ptoast', text);
    document.body.append(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), TOAST_MS);
  }

  /* ---------- 잠금 화면 ---------- */
  let lockNode = null;
  const isLocked = () => lockNode != null;

  function showLock() {
    if (lockNode) return;
    closeMenu();
    speechSynthesis.cancel?.();
    const hold = el('button', 'lockhold', '🔒 부모님: 1초 동안 누르기');
    hold.setAttribute('aria-label', '부모님: 1초 동안 누르면 다시 놀 수 있어요');
    holdable(hold, () => {
      addTime(state.limitMin);
      lockNode.remove();
      lockNode = null;
      A.sfx('ok');
      A.speak(UNLOCK_SPEECH);
    });
    lockNode = el('div', 'lockscreen', `
      <div class="zzz" aria-hidden="true">Z z z</div>
      <img class="sleepy" src="${LOCK.image}" alt="${LOCK.imageAlt}" draggable="false">
      <p>${LOCK.title}<small>${LOCK.sub}</small></p>`);
    lockNode.append(hold);
    document.body.append(lockNode);
    A.speak(LOCK_SPEECH);
  }

  /* ---------- 시간 재기 ---------- */
  let last = Date.now();
  let ticks = 0;
  let warned = false;
  const paused = () => document.visibilityState !== 'visible' || isLocked() || menuNode != null;

  function tick() {
    const now = Date.now();
    const elapsed = Math.min(Math.max(now - last, 0), MAX_GAP_MS);   // 타이머가 늦게 와도 덜 재지 않게
    last = now;
    if (paused()) return;
    ticks += 1;
    if (state.day !== today()) state = { ...state, day: today(), usedMs: 0, bonusMs: 0 };
    state = { ...state, usedMs: state.usedMs + elapsed };
    if (ticks % SAVE_EVERY_TICKS === 0) save();
    const left = leftMs();
    if (left > WARN_BEFORE_MS) warned = false;   // 시간을 더 받으면 다시 알릴 수 있게
    else if (left > 0 && !warned) { warned = true; toast('1분 뒤에 쉬어요! One more minute!'); }
    if (left <= 0) { save(); showLock(); }
  }
  setInterval(tick, TICK_MS);
  document.addEventListener('visibilitychange', () => { last = Date.now(); if (document.visibilityState === 'hidden') save(); });
  window.addEventListener('pagehide', save);

  /* ---------- 부모님 메뉴 ---------- */
  let menuNode = null;
  let resetArmed = false;

  function closeMenu() {
    menuNode?.remove();
    menuNode = null;
    resetArmed = false;
  }

  const btn = (label, onclick, cls = '') => {
    const b = el('button', cls, label);
    b.onclick = onclick;
    return b;
  };
  const row = (title, ...controls) => {
    const r = el('div', 'prow');
    const t = el('span', '', title);
    const c = el('span', 'pctrls');
    c.append(...controls);
    r.append(t, c);
    return r;
  };

  function renderMenu() {
    const left = Math.max(0, Math.ceil(leftMs() / MINUTE));
    const panel = el('div', 'ppanel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', '부모님 메뉴');
    panel.append(
      el('h3', '', '부모님 메뉴'),
      el('div', 'pleft', `오늘 남은 놀이 시간: 약 ${left}분 · 스티커 ${A.stickers.total()}/${A.stickers.all()}`),
      row('놀이 시간', btn(`${MORE_MINUTES}분 더 놀기`, () => { addTime(MORE_MINUTES); toast(`${MORE_MINUTES}분 더 놀 수 있어요`); renderMenu(); })),
      row('시간 제한',
        btn(`${DEFAULT_LIMIT_MIN}분`, () => { update({ limitMin: DEFAULT_LIMIT_MIN }); renderMenu(); }, state.limitMin === DEFAULT_LIMIT_MIN ? 'on' : '')),
      row('진행 기록 지우기', btn(resetArmed ? '한 번 더 누르기' : '지우기', () => {
        if (!resetArmed) { resetArmed = true; renderMenu(); return; }
        A.resetStars();
        A.stickers.reset();
        closeMenu();
        A.home();
        toast('별과 스티커를 지웠어요');
      }, resetArmed ? 'danger' : '')),
      btn('닫기', closeMenu, 'pclose'),
    );
    const next = el('div', 'pmodal');
    next.append(panel);
    next.onclick = (e) => { if (e.target === next) closeMenu(); };
    if (menuNode) menuNode.replaceWith(next); else document.body.append(next);
    menuNode = next;
  }

  function openMenu() {
    A.sfx('ok');
    resetArmed = false;
    renderMenu();
  }

  /* ---------- ⚙ 버튼 (첫 화면 왼쪽 위) ---------- */
  function button() {
    const wrap = el('div', 'pwrap');
    const tip = el('span', 'ptip', '1초간 꾹 눌러주세요');
    tip.hidden = true;
    let tipTimer = null;
    const b = el('button', 'pbtn', '⚙️');
    b.setAttribute('aria-label', '부모님 메뉴, 1초 동안 누르고 있기');
    // 아이가 톡 누르면 안내 말풍선만
    b.onclick = () => {
      if (consumeHeld(b)) return;
      tip.hidden = false;
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => { tip.hidden = true; }, TIP_MS);
    };
    holdable(b, openMenu);
    wrap.append(b, tip);
    return wrap;
  }

  A.parent = { button };
  if (leftMs() <= 0) showLock();   // 이미 시간을 다 쓴 날 앱을 다시 열면 바로 잠금
})();
