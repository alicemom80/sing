// 시작 화면: 알파벳이 떠 있는 풀밭에 코끼리 인사 + ▶ 버튼. 누르면 (폰이면) 전체 화면이 되고 주제 고르기로 간다.
(function () {
  const { el, img } = A;
  const { greeting: GREETING, hero: HERO } = A.CONFIG.start;
  const LETTER_COLORS = ['#ff6b81', '#ff9f43', '#2fbfa6', '#4d9fff', '#a66bff', '#ff7ab6'];
  // 글자와 자리(화면의 % 위치), 크기(rem 비율), 기울기. 코끼리와 버튼 둘레에 흩어 놓는다.
  const LETTERS = [
    ['A', 5, 16, 1.0, -12], ['B', 74, 15, 0.9, 10], ['C', 42, 17, 0.8, -6], ['D', 88, 25, 1.1, 14],
    ['E', 4, 31, 0.9, 8], ['F', 24, 26, 0.8, -14], ['G', 64, 24, 0.8, 6], ['H', 10, 45, 1.1, -8],
    ['I', 86, 43, 0.9, 12], ['J', 4, 59, 0.8, 10], ['K', 90, 58, 1.0, -10], ['L', 18, 72, 1.0, -12],
    ['M', 76, 74, 0.9, 8], ['N', 6, 86, 1.1, 14], ['O', 86, 86, 1.0, -8], ['P', 26, 91, 0.8, 6],
    ['Q', 70, 91, 0.9, -12], ['R', 52, 27, 0.7, 10], ['S', 22, 58, 0.7, -10], ['T', 74, 58, 0.7, 12],
  ];

  // 폰·태블릿 브라우저: ▶를 누를 때 딱 한 번 전체 화면을 요청한다.
  // (안드로이드 크롬은 전체 화면에 들어갈 때마다 "종료하려면 드래그" 안내를 띄우므로, 풀려도 다시 켜지 않는다.)
  // 마우스로 쓰는 컴퓨터와 이미 설치한 앱(주소창이 없는 모드)은 건너뛴다.
  // 화면을 세로로 잠근다. 전체 화면(또는 설치한 앱)일 때만 되는 기기가 많고, 안 되면 조용히 넘어간다.
  // 잠글 수 없는 곳(아이폰, 앱 안 브라우저)은 가로로 돌렸을 때 '세로로 돌려 주세요' 화면이 가린다 (css .rotate-note)
  const lockPortrait = () => {
    try { screen.orientation?.lock?.('portrait')?.catch?.(() => { /* 잠글 수 없는 기기 */ }); } catch (e) { /* 지원하지 않는 브라우저 */ }
  };
  const requestFullOnce = () => {
    const root = document.documentElement;
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (!root.requestFullscreen || document.fullscreenElement) { lockPortrait(); return; }
    if (matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) { lockPortrait(); return; }
    try {
      const asked = root.requestFullscreen({ navigationUI: 'hide' });
      if (asked?.then) asked.then(lockPortrait, () => { /* 막혀도 앱은 그대로 쓸 수 있다 */ });
      else lockPortrait();
    } catch (e) { /* 지원하지 않는 브라우저(아이폰 사파리 등) */ }
  };

  // 폰·태블릿을 가로로 돌리면 화면을 가리는 안내 (보이기·숨기기는 css 가 화면 방향을 보고 한다)
  const rotateNote = el('div', 'rotate-note', '<div class="rotate-icon">📱</div><b>세로로 돌려 주세요</b><small>Please rotate your device</small>');
  rotateNote.setAttribute('role', 'alert');
  document.body.append(rotateNote);

  /* ---------- 앱 안 브라우저 안내 (카카오톡 등) ----------
     카카오톡 같은 앱 안 브라우저에서는 영어 읽기(speechSynthesis)가 안 된다.
     시작 화면에 안내 카드를 보여 주고, 바깥 브라우저로 열기·주소 복사를 돕는다. 카드가 떠 있어도 ▶는 그대로 누를 수 있다. */
  const INAPP_UA = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp/i;   // 앱 안 브라우저임을 알려 주는 사용자 글자(UA)
  const KAKAO_UA = /KAKAOTALK/i;
  const VOICE_WAIT_MS = 3000;    // 시작 후 이만큼 기다려도 음성이 하나도 없으면 안내한다
  const OPEN_WAIT_MS = 1500;     // 바깥으로 열라고 한 뒤에도 이 화면이 그대로면 주소 복사로 바꾼다
  const TOAST_MS = 2500;
  const LINE_MIN_PX = 10;        // 카드 글자는 이보다 더 줄이지 않는다
  const FIT_MARGIN = 0.96;       // 딱 맞으면 반올림 때문에 다시 넘칠 수 있어서 여유를 둔다
  const COPIED_TEXT = '주소를 복사했어요. 크롬에 붙여 넣어 주세요.';
  const COPY_FAIL_TEXT = '주소를 직접 복사해 주세요. 주소창을 길게 눌러도 돼요.';
  const INAPP_CARD = (name) => ({
    title: '크롬이나 삼성 인터넷으로 열어 주세요',
    lines: [`이 화면(${name})에서는 영어 소리가 안 나와요.`, '▶를 누르면 브라우저로 열려요.'],
  });
  const NOVOICE_CARD = {
    title: '이 기기에서는 영어 소리가 안 나올 수 있어요',
    lines: ['그림 놀이는 그대로 할 수 있어요.'],
  };
  const inAppName = () => (KAKAO_UA.test(navigator.userAgent) ? '카카오톡' : '지금 화면');
  const isInApp = () => INAPP_UA.test(navigator.userAgent);

  // 화면 위쪽에 잠깐 뜨는 알림 (누를 수 없고 2.5초 뒤 사라진다)
  const toast = (text) => {
    document.querySelectorAll('.inapp-toast').forEach(n => n.remove());
    const t = el('div', 'inapp-toast');
    t.textContent = text;
    document.body.append(t);
    setTimeout(() => t.remove(), TOAST_MS);
  };

  // 클립보드 API를 못 쓰면 임시 글상자에 주소를 넣고 복사 명령을 쓴다
  const copyByTextarea = (text) => {
    const box = el('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(box);
    box.select();
    box.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    box.remove();
    return ok;
  };
  const copyAddress = () => {
    const url = location.href;
    const done = (ok) => toast(ok ? COPIED_TEXT : COPY_FAIL_TEXT);
    if (!navigator.clipboard?.writeText) { done(copyByTextarea(url)); return; }
    navigator.clipboard.writeText(url).then(() => done(true), () => done(copyByTextarea(url)));
  };

  // 카카오톡이면 카카오 전용 주소로, 다른 앱 안 브라우저의 안드로이드면 크롬 주소(intent)로 연다.
  // 그래도 화면이 그대로면(iOS 등) 주소를 복사해 안내한다.
  const openOutside = () => {
    const ua = navigator.userAgent;
    let target = null;
    if (KAKAO_UA.test(ua)) target = `kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}`;
    else if (/android/i.test(ua)) target = `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;end`;
    if (!target) { copyAddress(); return; }
    location.href = target;
    setTimeout(() => { if (!document.hidden) copyAddress(); }, OPEN_WAIT_MS);
  };

  const textLine = (cls, text) => {
    const p = el('div', cls);
    p.textContent = text;
    return p;
  };
  const rowOf = (...buttons) => {
    const row = el('div', 'inapp-row');
    row.append(...buttons);
    return row;
  };
  const actionButton = (label, onClick) => {
    const b = el('button', 'btn inapp-btn');
    b.textContent = label;
    b.onclick = onClick;
    return b;
  };
  // 안내 카드: 글 두세 줄. 버튼 없음: 앱 안 브라우저에서는 ▶가 바깥 브라우저로 연다
  // 닫기 버튼은 없다: 앱 안 브라우저로 열 때마다 다시 보여 준다
  const buildCard = ({ title, lines }, withOpen) => {
    const box = el('div', 'inapp-card');
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', title);
    box.append(textLine('inapp-title', title), ...lines.map(line => textLine('inapp-line', line)));
    return box;
  };

  // 글 한 줄이 칸을 넘치면 그 줄만 글자를 줄인다 (LINE_MIN_PX 아래로는 안 줄인다)
  const fitLine = (node) => {
    node.style.fontSize = '';
    const room = node.clientWidth;
    const need = node.scrollWidth;
    if (need <= room) return;
    const size = parseFloat(getComputedStyle(node).fontSize);
    node.style.fontSize = `${Math.max(LINE_MIN_PX, size * room / need * FIT_MARGIN)}px`;
  };
  const fitCard = (card) => card.querySelectorAll('.inapp-title, .inapp-line').forEach(fitLine);

  // 카드는 로고 아래, 주인공 그림 앞에 끼워 넣는다. 주인공이 조금 작아질 뿐 ▶ 와 겹치지 않는다.
  const showCard = (page, hero, card) => {
    if (!page.isConnected) return;   // 이미 ▶를 눌러 다른 화면으로 넘어갔으면 그냥 둔다
    hero.before(card);
    fitCard(card);
    document.fonts?.ready.then(() => fitCard(card));   // 글꼴이 늦게 와도 다시 맞춘다
  };

  const hasVoices = () => speechSynthesis.getVoices().length > 0;
  // 시작 후 3초 동안 음성이 하나도 없으면 onNoVoice 를 부른다 (음성 목록이 늦게 오는 기기는 voiceschanged 로 취소)
  const watchVoices = (onNoVoice) => {
    const stop = () => {
      clearTimeout(timer);
      speechSynthesis.removeEventListener('voiceschanged', onChange);
    };
    const onChange = () => { if (hasVoices()) stop(); };
    const timer = setTimeout(() => { stop(); if (!hasVoices()) onNoVoice(); }, VOICE_WAIT_MS);
    speechSynthesis.addEventListener('voiceschanged', onChange);
  };

  // 시작 화면에 안내를 넣을지 정한다 (시작 화면이 열릴 때마다 다시 살핀다)
  const addNotice = (page, hero) => {
    if (isInApp()) { showCard(page, hero, buildCard(INAPP_CARD(inAppName()), true)); return; }
    const noVoice = () => showCard(page, hero, buildCard(NOVOICE_CARD, false));
    if (!('speechSynthesis' in window)) { noVoice(); return; }
    watchVoices(noVoice);
  };

  A.start = function () {
    A.target = null; A.targetText = null;
    A.setBg('start');
    const page = el('div', 'page startpage');
    const letters = el('div', 'floatabc');
    letters.setAttribute('aria-hidden', 'true');
    LETTERS.forEach(([ch, x, y, size, tilt], i) => {
      const s = el('span', 'fl', ch);
      s.style.cssText = `left:${x}%;top:${y}%;--s:${size};--r:${tilt}deg;--c:${LETTER_COLORS[i % LETTER_COLORS.length]};animation-delay:${(i % 7) * -0.5}s`;
      letters.append(s);
    });
    const hero = el('div', 'starthero', img(HERO, 'heropic'));
    const go = el('button', 'btn startbtn', '▶');
    go.setAttribute('aria-label', '시작');
    go.onclick = () => {
      if (isInApp()) { openOutside(); return; }   // 앱 안 브라우저(카카오톡 등)에서는 ▶가 바깥 브라우저로 연다
      requestFullOnce();   // 다른 동작보다 먼저: 누른 직후에만 허락된다
      A.sfx('ok');
      A.home();
      A.speak(GREETING);
    };
    page.append(
      A.parent.button(),
      letters,
      el('h1', 'logo', A.logoHtml()),
      hero,
      go,
      el('div', 'credit', '<i class="igicon"></i>instagram <b>@alicemom80</b>'),
    );
    A.show(page);
    addNotice(page, hero);
  };
})();
