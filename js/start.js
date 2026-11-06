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
  const requestFullOnce = () => {
    const root = document.documentElement;
    if (!root.requestFullscreen || document.fullscreenElement) return;
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) return;
    try {
      root.requestFullscreen({ navigationUI: 'hide' })?.catch?.(() => { /* 막혀도 앱은 그대로 쓸 수 있다 */ });
    } catch (e) { /* 지원하지 않는 브라우저(아이폰 사파리 등) */ }
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
    );
    A.show(page);
  };
})();
