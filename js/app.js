// 화면 흐름: 홈(주제, 앞 주제부터 순서대로 열림) → 묶음(5개씩) → 놀이 고르기 → 놀이
(function () {
  const { el, img } = A;
  const WIDE_GAMES = ['card', 'qa'];   // 맨 위·맨 아래에 가로로 한 줄
  const LEVEL_ICON = { 1: '🌱', 2: '🌿', 3: '🌳' };
  const MAX_STARS = A.CONFIG.rewards.maxStars;
  const PER_STICKER = A.CONFIG.rewards.starsPerSticker;

  // 주제별 배경 그림 (images/bg/<이름>.webp)
  const THEME_BG = A.CONFIG.backgrounds;
  const setBg = (themeId) => {
    const name = THEME_BG[themeId];
    A.$('#bg').style.backgroundImage = name ? `url(images/bg/${name}.webp)` : 'none';
  };

  A.setBg = setBg;

  const starRow = (n) => '⭐'.repeat(n) + '☆'.repeat(Math.max(0, MAX_STARS - n));

  // 놀이 한 판의 별 (기획서 6장): 처음부터 맞힌 비율로 1~3개
  const starsFor = (right, total) => {
    const ratio = total ? right / total : 0;
    if (ratio >= 0.8) return 3;
    return ratio >= 0.5 ? 2 : 1;
  };

  // 주제를 끝냈다 = 묶음마다 놀이를 한 번 이상 끝냈다 (기획서에 정의가 없어서 이렇게 잡음, 보고서 확인 항목)
  const gameDone = (t, gi, id) => A.getStars(`${t.id}:${gi}:${id}`) > 0;
  const themeDone = (t) => t.groups.every((g, gi) => t.games.some(([id]) => gameDone(t, gi, id)));
  const allDone = () => A.THEMES.every(themeDone);

  A.home = function () {
    A.target = null; A.targetText = null;
    setBg('home');
    const page = el('div', 'page homepage');
    page.append(A.parent.button(), el('h1', 'logo', A.logoHtml()));
    const grid = el('div', 'themes');
    A.THEMES.forEach((t, i) => {
      const b = el('button', 'btn theme', `
        <div class="cover">${t.cover ? img({ id: t.cover, en: t.en }) : `<span class="emoji">${t.icon}</span>`}</div>
        <div class="tname">${t.ko}</div><div class="ten">${t.en}</div>
        <div class="tstars">⭐ ${A.sumStars(t.id + ':')}</div>`);
      b.style.setProperty('--c', t.color);
      b.onclick = () => A.themePage(t);
      grid.append(b);
    });
    page.append(grid);
    const sb = el('button', 'btn bookbtn', `📒 <b>스티커북</b> <span>${A.stickers.total()} / ${A.stickers.all()}</span>`);
    sb.onclick = () => A.stickers.book(A.home);
    page.append(sb, el('div', 'credit small', '<i class="igicon"></i>instagram <b>@alicemom80</b>'));
    A.show(page);
  };

  A.themePage = function (t) {
    setBg(t.id);
    const page = el('div', 'page themepage');
    page.append(A.topbar(`${t.icon} ${t.ko}<small>${t.en}</small>`, A.home, false));
    page.append(el('div', 'sub', '5개씩 묶어서 배워요'));
    const list = el('div', 'groups');
    t.groups.forEach((g, gi) => {
      const b = el('button', 'btn group', `
        <div class="gnum">${gi + 1}</div>
        <div class="gpics">${g.map(w => img(w)).join('')}</div>
        <div class="gstar">⭐ ${A.sumStars(`${t.id}:${gi}:`)}</div>`);
      b.style.setProperty('--c', t.color);
      b.onclick = () => A.menuPage(t, gi);
      list.append(b);
    });
    page.append(list);
    A.show(page);
  };

  A.menuPage = function (t, gi) {
    const g = t.groups[gi];
    setBg(t.id);
    const page = el('div', 'page');
    page.append(A.topbar(`${t.icon} ${t.ko} 친구들 ${gi + 1}<small>${t.en} Friends ${gi + 1}</small>`, () => A.themePage(t), false));
    const words = el('div', 'wordstrip', g.map(w => `<button class="chip">${img(w)}<span lang="en">${w.en}</span></button>`).join(''));
    words.querySelectorAll('.chip').forEach((c, i) => { c.onclick = () => A.say(g[i]); });
    page.append(words);
    const list = el('div', 'games');
    t.games.forEach(([id, stage]) => {   // 주제마다 배정된 놀이만, 단계(stage) 순서대로
      const gm = A.games[id];
      const best = A.getStars(`${t.id}:${gi}:${id}`);
      const b = el('button', `btn game lv${stage}${WIDE_GAMES.includes(id) ? ' wide' : ''}`, `
        <div class="gicon">${gm.icon}</div>
        <b class="gname">${gm.name}</b>
        <div class="glv">${LEVEL_ICON[stage]}${best ? ' ⭐' + best : ''}</div>`);
      b.title = gm.desc;
      b.onclick = () => A.play(t, gi, id);
      list.append(b);
    });
    page.append(list);
    A.show(page);
  };

  // 놀이 한 판이 끝나면: 별 저장 → 스티커 계산 → 끝 화면 (별, 다음 스티커까지, 미션, 받은 스티커)
  const finishGame = (t, gi, id, right, total) => {
    const earned = starsFor(right, total);
    const sumBefore = A.sumStars('');
    A.saveStars(`${t.id}:${gi}:${id}`, earned);
    const sumAfter = A.sumStars('');
    const rewards = A.stickers.award({
      theme: t, gi, sumBefore, sumAfter, themeDone: themeDone(t), allDone: allDone(),
    });
    const next = PER_STICKER - (sumAfter % PER_STICKER);
    const done = el('div', 'done', `
      <div class="trophy">🏆</div>
      <div class="bigstars">${starRow(earned)}</div>
      <div class="dmsg">${right === total ? '모두 한 번에! 최고예요!' : '잘했어요!'}</div>
      <div class="dinfo">⭐ 모은 별 ${sumAfter}개 · 다음 스티커까지 ${next}개</div>
      <div class="dinfo">🎯 오늘의 미션: ${t.mission}</div>`);
    rewards.forEach(r => done.append(A.stickers.rewardNode(r)));
    return { done, rewards };
  };

  A.play = function (t, gi, id) {
    const gm = A.games[id];
    setBg(t.id);
    const page = el('div', 'page playpage');
    const goBack = () => A.menuPage(t, gi);
    page.append(A.topbar(`${gm.icon} ${gm.name}`, goBack, true));
    const bar = el('div', 'progress', '<i></i>');
    const stage = el('div', 'stage');
    page.append(bar, stage);
    A.show(page);
    const ctx = {
      words: t.groups[gi] || [],
      theme: t,
      pool: t.words,
      diff: Math.min(gi, 2),          // 뒤쪽 묶음일수록 어려워진다
      stage,
      progress(i, n) { bar.firstChild.style.width = `${(i / n) * 100}%`; },
      finish(right, total) {
        if (!stage.isConnected) return;   // 놀이 화면을 떠난 뒤에는 끝 화면·소리·별 저장을 하지 않는다
        A.target = null; A.targetText = null;
        const { done, rewards } = finishGame(t, gi, id, right, total);
        const again = el('button', 'btn big primary', '🔁 다시');
        const menu = el('button', 'btn big', '🎮 다른 놀이');
        again.onclick = () => A.play(t, gi, id);
        menu.onclick = goBack;
        const row = el('div', 'nav'); row.append(again, menu);
        stage.replaceChildren(done, row);
        A.celebrateEnd(rewards.length > 0);
        A.speak(rewards.length ? A.stickers.rewardSpeech(rewards[0]) : 'Good job!');
      },
    };
    gm.start(ctx);
  };

  A.start();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
